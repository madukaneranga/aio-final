const Bull = require('bull');
const redis = require('redis');
const logger = require('./utils/logger');
const db = require('./utils/db');

// Import job classes
const UnpaidOrderReminderJob = require('./jobs/unpaidOrderReminder');
const CancelExpiredOrdersJob = require('./jobs/cancelExpiredOrders');
const SubscriptionCheckJob = require('./jobs/subscriptionCheck');
const StockSyncJob = require('./jobs/stockSync');

class Worker {
  constructor() {
    this.queues = new Map();
    this.jobs = new Map();
    this.redisClient = null;
    this.isRunning = false;

    this.initializeJobs();
  }

  initializeJobs() {
    // Initialize job instances
    this.jobs.set('unpaidOrderReminder', new UnpaidOrderReminderJob());
    this.jobs.set('cancelExpiredOrders', new CancelExpiredOrdersJob());
    this.jobs.set('subscriptionCheck', new SubscriptionCheckJob());
    this.jobs.set('stockSync', new StockSyncJob());

    logger.info('Worker initialized with jobs:', Array.from(this.jobs.keys()));
  }

  async start() {
    try {
      if (this.isRunning) {
        logger.warn('Worker is already running');
        return;
      }

      // Initialize Redis connection
      await this.initializeRedis();

      // Initialize database connection
      await db.connect();

      // Setup queues
      await this.setupQueues();

      // Start processing
      await this.startProcessing();

      this.isRunning = true;
      logger.info('Worker started successfully');

    } catch (error) {
      logger.error('Error starting worker:', error);
      throw error;
    }
  }

  async initializeRedis() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      };

      this.redisClient = redis.createClient(redisConfig);
      
      this.redisClient.on('error', (err) => {
        logger.error('Redis connection error:', err);
      });

      this.redisClient.on('connect', () => {
        logger.info('Connected to Redis');
      });

      await this.redisClient.connect();
      
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      throw error;
    }
  }

  async setupQueues() {
    try {
      const redisConfig = {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          db: process.env.REDIS_DB || 0
        }
      };

      // Create queues for each job type
      const queueConfigs = [
        { name: 'unpaidOrderReminder', concurrency: 5 },
        { name: 'cancelExpiredOrders', concurrency: 3 },
        { name: 'subscriptionCheck', concurrency: 2 },
        { name: 'stockSync', concurrency: 3 },
        { name: 'notifications', concurrency: 10 },
        { name: 'reports', concurrency: 2 }
      ];

      for (const config of queueConfigs) {
        const queue = new Bull(config.name, redisConfig);

        // Configure queue events
        queue.on('error', (error) => {
          logger.error(`Queue ${config.name} error:`, error);
        });

        queue.on('waiting', (jobId) => {
          logger.debug(`Job ${jobId} waiting in queue ${config.name}`);
        });

        queue.on('active', (job) => {
          logger.info(`Job ${job.id} active in queue ${config.name}`);
        });

        queue.on('completed', (job, result) => {
          logger.info(`Job ${job.id} completed in queue ${config.name}`, { result });
        });

        queue.on('failed', (job, err) => {
          logger.error(`Job ${job.id} failed in queue ${config.name}:`, err);
        });

        queue.on('stalled', (job) => {
          logger.warn(`Job ${job.id} stalled in queue ${config.name}`);
        });

        this.queues.set(config.name, { queue, concurrency: config.concurrency });
      }

      logger.info('Queues setup completed');

    } catch (error) {
      logger.error('Error setting up queues:', error);
      throw error;
    }
  }

  async startProcessing() {
    try {
      // Process unpaid order reminders
      const unpaidQueue = this.queues.get('unpaidOrderReminder');
      unpaidQueue.queue.process(unpaidQueue.concurrency, async (job) => {
        return await this.processJob('unpaidOrderReminder', job.data);
      });

      // Process expired order cancellations
      const cancelQueue = this.queues.get('cancelExpiredOrders');
      cancelQueue.queue.process(cancelQueue.concurrency, async (job) => {
        return await this.processJob('cancelExpiredOrders', job.data);
      });

      // Process subscription checks
      const subscriptionQueue = this.queues.get('subscriptionCheck');
      subscriptionQueue.queue.process(subscriptionQueue.concurrency, async (job) => {
        return await this.processJob('subscriptionCheck', job.data);
      });

      // Process stock sync
      const stockQueue = this.queues.get('stockSync');
      stockQueue.queue.process(stockQueue.concurrency, async (job) => {
        return await this.processJob('stockSync', job.data);
      });

      // Process notifications
      const notificationQueue = this.queues.get('notifications');
      notificationQueue.queue.process(notificationQueue.concurrency, async (job) => {
        return await this.processNotification(job.data);
      });

      // Process reports
      const reportQueue = this.queues.get('reports');
      reportQueue.queue.process(reportQueue.concurrency, async (job) => {
        return await this.processReport(job.data);
      });

      logger.info('Queue processing started');

    } catch (error) {
      logger.error('Error starting queue processing:', error);
      throw error;
    }
  }

  async processJob(jobType, jobData) {
    try {
      if (!this.jobs.has(jobType)) {
        throw new Error(`Unknown job type: ${jobType}`);
      }

      const job = this.jobs.get(jobType);
      const startTime = Date.now();

      logger.info(`Processing ${jobType} job`, { jobData });

      let result;
      
      // Handle specific job methods if data specifies
      if (jobData.method && typeof job[jobData.method] === 'function') {
        result = await job[jobData.method](...(jobData.args || []));
      } else {
        result = await job.execute();
      }

      const duration = Date.now() - startTime;
      logger.info(`${jobType} job completed in ${duration}ms`, { result });

      return result;

    } catch (error) {
      logger.error(`Error processing ${jobType} job:`, error);
      throw error;
    }
  }

  async processNotification(notificationData) {
    try {
      const notifier = require('./utils/notifier');
      const { type, recipients, content, options = {} } = notificationData;

      logger.info(`Processing ${type} notification`, { recipients: recipients.length });

      const results = [];

      switch (type) {
        case 'email':
          for (const recipient of recipients) {
            const result = await notifier.sendEmail(
              recipient.email,
              content.subject,
              content.body,
              options.isHTML || false
            );
            results.push({ recipient: recipient.email, result });
          }
          break;

        case 'sms':
          for (const recipient of recipients) {
            if (recipient.phone) {
              const result = await notifier.sendSMS(recipient.phone, content.message);
              results.push({ recipient: recipient.phone, result });
            }
          }
          break;

        case 'push':
          const tokens = recipients
            .filter(r => r.fcmTokens && r.fcmTokens.length > 0)
            .flatMap(r => r.fcmTokens);
          
          if (tokens.length > 0) {
            const result = await notifier.sendPushNotification(
              tokens,
              content.notification,
              content.data || {}
            );
            results.push({ tokens: tokens.length, result });
          }
          break;

        default:
          throw new Error(`Unknown notification type: ${type}`);
      }

      return { success: true, results };

    } catch (error) {
      logger.error('Error processing notification:', error);
      throw error;
    }
  }

  async processReport(reportData) {
    try {
      const { type, params, userId } = reportData;
      
      logger.info(`Processing ${type} report`, { params, userId });

      let result;

      switch (type) {
        case 'stock_report':
          result = await this.generateStockReport(params);
          break;
        
        case 'order_report':
          result = await this.generateOrderReport(params);
          break;
        
        case 'subscription_report':
          result = await this.generateSubscriptionReport(params);
          break;
        
        default:
          throw new Error(`Unknown report type: ${type}`);
      }

      return { success: true, reportType: type, result };

    } catch (error) {
      logger.error('Error processing report:', error);
      throw error;
    }
  }

  async generateStockReport(params) {
    const stockJob = this.jobs.get('stockSync');
    return await stockJob.getStockStats();
  }

  async generateOrderReport(params) {
    const reminderJob = this.jobs.get('unpaidOrderReminder');
    const cancelJob = this.jobs.get('cancelExpiredOrders');

    return {
      pendingReminders: await reminderJob.getPendingRemindersCount(),
      expiringSoon: await cancelJob.getExpiringOrdersCount()
    };
  }

  async generateSubscriptionReport(params) {
    const subscriptionJob = this.jobs.get('subscriptionCheck');
    return await subscriptionJob.getSubscriptionStats();
  }

  // Add jobs to queues
  async addJob(queueName, jobData, options = {}) {
    try {
      if (!this.queues.has(queueName)) {
        throw new Error(`Queue '${queueName}' not found`);
      }

      const queue = this.queues.get(queueName).queue;
      
      const defaultOptions = {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 50
      };

      const job = await queue.add(jobData, { ...defaultOptions, ...options });
      
      logger.info(`Job ${job.id} added to queue ${queueName}`);
      return job.id;

    } catch (error) {
      logger.error(`Error adding job to queue ${queueName}:`, error);
      throw error;
    }
  }

  // Schedule recurring jobs
  async scheduleRecurringJob(queueName, jobData, cronExpression, options = {}) {
    try {
      if (!this.queues.has(queueName)) {
        throw new Error(`Queue '${queueName}' not found`);
      }

      const queue = this.queues.get(queueName).queue;
      
      const job = await queue.add(jobData, {
        repeat: { cron: cronExpression },
        ...options
      });

      logger.info(`Recurring job scheduled in queue ${queueName} with cron: ${cronExpression}`);
      return job.id;

    } catch (error) {
      logger.error(`Error scheduling recurring job in queue ${queueName}:`, error);
      throw error;
    }
  }

  // Get queue statistics
  async getQueueStats() {
    try {
      const stats = {};

      for (const [queueName, queueInfo] of this.queues) {
        const queue = queueInfo.queue;
        
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed()
        ]);

        stats[queueName] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          concurrency: queueInfo.concurrency
        };
      }

      return stats;

    } catch (error) {
      logger.error('Error getting queue stats:', error);
      return null;
    }
  }

  async stop() {
    try {
      if (!this.isRunning) {
        logger.warn('Worker is not running');
        return;
      }

      // Close all queues
      for (const [queueName, queueInfo] of this.queues) {
        await queueInfo.queue.close();
        logger.info(`Queue ${queueName} closed`);
      }

      // Disconnect Redis
      if (this.redisClient) {
        await this.redisClient.disconnect();
        logger.info('Redis disconnected');
      }

      // Disconnect database
      await db.disconnect();

      this.isRunning = false;
      logger.info('Worker stopped successfully');

    } catch (error) {
      logger.error('Error stopping worker:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      queues: Array.from(this.queues.keys()),
      jobs: Array.from(this.jobs.keys()),
      uptime: process.uptime()
    };
  }
}

// Create worker instance
const worker = new Worker();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await worker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await worker.stop();
  process.exit(0);
});

// Start worker if this file is run directly
if (require.main === module) {
  worker.start().catch((error) => {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  });
}

module.exports = worker;