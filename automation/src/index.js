require('dotenv').config();

const express = require('express');
const logger = require('./utils/logger');
const db = require('./utils/db');
const scheduler = require('./scheduler');
const worker = require('./worker');

class AutomationService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.mode = process.env.MODE || 'scheduler'; // 'scheduler' or 'worker' or 'api'
    
    this.setupExpress();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupExpress() {
    // Middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          mode: this.mode,
          database: {
            connected: db.isConnected()
          }
        };

        if (this.mode === 'scheduler' || this.mode === 'api') {
          health.scheduler = scheduler.getStatus();
          health.schedulerStats = await scheduler.healthCheck();
        }

        if (this.mode === 'worker' || this.mode === 'api') {
          health.worker = worker.getStatus();
          health.queueStats = await worker.getQueueStats();
        }

        res.json(health);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    });

    // Scheduler control endpoints (only available in scheduler or api mode)
    if (this.mode === 'scheduler' || this.mode === 'api') {
      // Get scheduler status
      this.app.get('/scheduler/status', (req, res) => {
        res.json(scheduler.getStatus());
      });

      // Run job manually
      this.app.post('/scheduler/jobs/:jobName/run', async (req, res) => {
        try {
          const { jobName } = req.params;
          const result = await scheduler.runJobManually(jobName);
          res.json(result);
        } catch (error) {
          logger.error(`Manual job execution failed: ${error.message}`);
          res.status(500).json({ error: error.message });
        }
      });

      // Get job schedules
      this.app.get('/scheduler/schedules', (req, res) => {
        res.json(scheduler.getSchedules());
      });

      // Update job schedule
      this.app.put('/scheduler/jobs/:jobName/schedule', async (req, res) => {
        try {
          const { jobName } = req.params;
          const { cronExpression } = req.body;
          
          if (!cronExpression) {
            return res.status(400).json({ error: 'cronExpression is required' });
          }

          const result = scheduler.updateSchedule(jobName, cronExpression);
          res.json(result);
        } catch (error) {
          logger.error(`Schedule update failed: ${error.message}`);
          res.status(500).json({ error: error.message });
        }
      });

      // Enable/disable job
      this.app.put('/scheduler/jobs/:jobName/toggle', (req, res) => {
        try {
          const { jobName } = req.params;
          const { enabled } = req.body;
          
          const result = scheduler.toggleJob(jobName, enabled);
          res.json(result);
        } catch (error) {
          logger.error(`Job toggle failed: ${error.message}`);
          res.status(500).json({ error: error.message });
        }
      });
    }

    // Worker control endpoints (only available in worker or api mode)
    if (this.mode === 'worker' || this.mode === 'api') {
      // Get worker status
      this.app.get('/worker/status', (req, res) => {
        res.json(worker.getStatus());
      });

      // Get queue statistics
      this.app.get('/worker/queues/stats', async (req, res) => {
        try {
          const stats = await worker.getQueueStats();
          res.json(stats);
        } catch (error) {
          logger.error(`Queue stats failed: ${error.message}`);
          res.status(500).json({ error: error.message });
        }
      });

      // Add job to queue
      this.app.post('/worker/queues/:queueName/jobs', async (req, res) => {
        try {
          const { queueName } = req.params;
          const { jobData, options = {} } = req.body;
          
          const jobId = await worker.addJob(queueName, jobData, options);
          res.json({ success: true, jobId });
        } catch (error) {
          logger.error(`Add job failed: ${error.message}`);
          res.status(500).json({ error: error.message });
        }
      });

      // Schedule recurring job
      this.app.post('/worker/queues/:queueName/recurring', async (req, res) => {
        try {
          const { queueName } = req.params;
          const { jobData, cronExpression, options = {} } = req.body;
          
          if (!cronExpression) {
            return res.status(400).json({ error: 'cronExpression is required' });
          }

          const jobId = await worker.scheduleRecurringJob(queueName, jobData, cronExpression, options);
          res.json({ success: true, jobId });
        } catch (error) {
          logger.error(`Schedule recurring job failed: ${error.message}`);
          res.status(500).json({ error: error.message });
        }
      });
    }

    // Manual job execution endpoints (available in all modes)
    this.app.post('/jobs/:jobType/execute', async (req, res) => {
      try {
        const { jobType } = req.params;
        const jobData = req.body;

        let result;

        if (this.mode === 'worker' || this.mode === 'api') {
          // Execute via worker queue
          const jobId = await worker.addJob(jobType, jobData);
          result = { success: true, jobId, message: 'Job queued for execution' };
        } else {
          // Execute directly via scheduler
          result = await scheduler.runJobManually(jobType);
        }

        res.json(result);
      } catch (error) {
        logger.error(`Job execution failed: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error:', err);
      
      res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 
          'Something went wrong' : 
          err.message
      });
    });
  }

  async start() {
    try {
      // Connect to database
      await db.connect();
      logger.info('Connected to database');

      // Start appropriate services based on mode
      switch (this.mode) {
        case 'scheduler':
          await scheduler.start();
          logger.info('Scheduler service started');
          break;

        case 'worker':
          await worker.start();
          logger.info('Worker service started');
          break;

        case 'api':
          await scheduler.start();
          await worker.start();
          logger.info('API service with both scheduler and worker started');
          break;

        default:
          throw new Error(`Unknown mode: ${this.mode}`);
      }

      // Start Express server
      this.server = this.app.listen(this.port, () => {
        logger.info(`Automation service running on port ${this.port} in ${this.mode} mode`);
      });

    } catch (error) {
      logger.error('Failed to start automation service:', error);
      throw error;
    }
  }

  async stop() {
    try {
      logger.info('Stopping automation service...');

      // Stop HTTP server
      if (this.server) {
        this.server.close();
        logger.info('HTTP server stopped');
      }

      // Stop services based on mode
      if (this.mode === 'scheduler' || this.mode === 'api') {
        scheduler.stop();
        logger.info('Scheduler stopped');
      }

      if (this.mode === 'worker' || this.mode === 'api') {
        await worker.stop();
        logger.info('Worker stopped');
      }

      // Disconnect database
      await db.disconnect();
      logger.info('Database disconnected');

      logger.info('Automation service stopped successfully');

    } catch (error) {
      logger.error('Error stopping automation service:', error);
      throw error;
    }
  }
}

// Create service instance
const automationService = new AutomationService();

// Handle graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    await automationService.stop();
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start service
if (require.main === module) {
  automationService.start().catch((error) => {
    logger.error('Failed to start automation service:', error);
    process.exit(1);
  });
}

module.exports = automationService;