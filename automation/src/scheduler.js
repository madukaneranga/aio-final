const cron = require('node-cron');
const logger = require('./utils/logger');
const db = require('./utils/db');

// Import job classes
const UnpaidOrderReminderJob = require('./jobs/unpaidOrderReminder');
const CancelExpiredOrdersJob = require('./jobs/cancelExpiredOrders');
const SubscriptionCheckJob = require('./jobs/subscriptionCheck');
const StockSyncJob = require('./jobs/stockSync');

class Scheduler {
  constructor() {
    this.jobs = new Map();
    this.tasks = new Map();
    this.isRunning = false;
    
    this.initializeJobs();
  }

  initializeJobs() {
    // Initialize job instances
    this.jobs.set('unpaidOrderReminder', new UnpaidOrderReminderJob());
    this.jobs.set('cancelExpiredOrders', new CancelExpiredOrdersJob());
    this.jobs.set('subscriptionCheck', new SubscriptionCheckJob());
    this.jobs.set('stockSync', new StockSyncJob());

    logger.info('Scheduler initialized with jobs:', Array.from(this.jobs.keys()));
  }

  async start() {
    try {
      if (this.isRunning) {
        logger.warn('Scheduler is already running');
        return;
      }

      // Ensure database connection
      await db.connect();
      
      this.scheduleJobs();
      this.isRunning = true;
      
      logger.info('Scheduler started successfully');
    } catch (error) {
      logger.error('Error starting scheduler:', error);
      throw error;
    }
  }

  scheduleJobs() {
    // Unpaid Order Reminders - Every 2 hours
    const unpaidReminderTask = cron.schedule('0 */2 * * *', async () => {
      await this.runJob('unpaidOrderReminder');
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    // Cancel Expired Orders - Every 4 hours
    const cancelExpiredTask = cron.schedule('0 */4 * * *', async () => {
      await this.runJob('cancelExpiredOrders');
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    // Subscription Check - Daily at 9 AM
    const subscriptionTask = cron.schedule('0 9 * * *', async () => {
      await this.runJob('subscriptionCheck');
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    // Stock Sync - Every 6 hours
    const stockSyncTask = cron.schedule('0 */6 * * *', async () => {
      await this.runJob('stockSync');
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    // Store tasks
    this.tasks.set('unpaidOrderReminder', unpaidReminderTask);
    this.tasks.set('cancelExpiredOrders', cancelExpiredTask);
    this.tasks.set('subscriptionCheck', subscriptionTask);
    this.tasks.set('stockSync', stockSyncTask);

    // Start all tasks
    this.tasks.forEach((task, name) => {
      task.start();
      logger.info(`Scheduled job: ${name}`);
    });

    // Health check job - Every 30 minutes
    const healthCheckTask = cron.schedule('*/30 * * * *', async () => {
      await this.healthCheck();
    }, {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    this.tasks.set('healthCheck', healthCheckTask);

    logger.info('All scheduled jobs are now active');
  }

  async runJob(jobName) {
    try {
      if (!this.jobs.has(jobName)) {
        throw new Error(`Job '${jobName}' not found`);
      }

      logger.info(`Starting scheduled job: ${jobName}`);
      const startTime = Date.now();

      const job = this.jobs.get(jobName);
      const result = await job.execute();

      const duration = Date.now() - startTime;
      
      if (result.success) {
        logger.info(`Job '${jobName}' completed successfully in ${duration}ms`);
      } else {
        logger.error(`Job '${jobName}' failed:`, result.error);
      }

      return result;

    } catch (error) {
      logger.error(`Error running job '${jobName}':`, error);
      return { success: false, error: error.message };
    }
  }

  async runJobManually(jobName) {
    try {
      if (!this.jobs.has(jobName)) {
        throw new Error(`Job '${jobName}' not found`);
      }

      logger.info(`Manual execution of job: ${jobName}`);
      return await this.runJob(jobName);

    } catch (error) {
      logger.error(`Error manually running job '${jobName}':`, error);
      return { success: false, error: error.message };
    }
  }

  async healthCheck() {
    try {
      const stats = {
        timestamp: new Date(),
        scheduler: {
          isRunning: this.isRunning,
          activeTasks: this.tasks.size,
          registeredJobs: this.jobs.size
        },
        database: {
          connected: db.isConnected()
        },
        jobs: {}
      };

      // Check each job's health/statistics if available
      for (const [jobName, job] of this.jobs) {
        try {
          if (typeof job.getStats === 'function') {
            stats.jobs[jobName] = await job.getStats();
          } else if (typeof job.getPendingRemindersCount === 'function') {
            stats.jobs[jobName] = { pendingCount: await job.getPendingRemindersCount() };
          } else if (typeof job.getStockStats === 'function') {
            stats.jobs[jobName] = await job.getStockStats();
          } else if (typeof job.getSubscriptionStats === 'function') {
            stats.jobs[jobName] = await job.getSubscriptionStats();
          }
        } catch (error) {
          stats.jobs[jobName] = { error: error.message };
        }
      }

      logger.info('Health check completed', { stats });
      return stats;

    } catch (error) {
      logger.error('Health check failed:', error);
      return { error: error.message, timestamp: new Date() };
    }
  }

  stop() {
    try {
      if (!this.isRunning) {
        logger.warn('Scheduler is not running');
        return;
      }

      // Stop all cron tasks
      this.tasks.forEach((task, name) => {
        task.stop();
        logger.info(`Stopped job: ${name}`);
      });

      this.isRunning = false;
      logger.info('Scheduler stopped successfully');

    } catch (error) {
      logger.error('Error stopping scheduler:', error);
      throw error;
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeTasks: Array.from(this.tasks.keys()),
      registeredJobs: Array.from(this.jobs.keys()),
      uptime: process.uptime()
    };
  }

  // Update job schedule
  updateSchedule(jobName, cronExpression) {
    try {
      if (!this.tasks.has(jobName)) {
        throw new Error(`Task '${jobName}' not found`);
      }

      const oldTask = this.tasks.get(jobName);
      oldTask.stop();

      const newTask = cron.schedule(cronExpression, async () => {
        await this.runJob(jobName);
      }, {
        scheduled: false,
        timezone: process.env.TIMEZONE || 'UTC'
      });

      this.tasks.set(jobName, newTask);
      newTask.start();

      logger.info(`Updated schedule for job '${jobName}' to: ${cronExpression}`);
      return { success: true, jobName, newSchedule: cronExpression };

    } catch (error) {
      logger.error(`Error updating schedule for job '${jobName}':`, error);
      return { success: false, error: error.message };
    }
  }

  // Enable/disable specific job
  toggleJob(jobName, enabled) {
    try {
      if (!this.tasks.has(jobName)) {
        throw new Error(`Task '${jobName}' not found`);
      }

      const task = this.tasks.get(jobName);
      
      if (enabled) {
        task.start();
        logger.info(`Enabled job: ${jobName}`);
      } else {
        task.stop();
        logger.info(`Disabled job: ${jobName}`);
      }

      return { success: true, jobName, enabled };

    } catch (error) {
      logger.error(`Error toggling job '${jobName}':`, error);
      return { success: false, error: error.message };
    }
  }

  // Get job schedules
  getSchedules() {
    const schedules = {};
    
    // Default schedules
    schedules.unpaidOrderReminder = '0 */2 * * *';  // Every 2 hours
    schedules.cancelExpiredOrders = '0 */4 * * *';   // Every 4 hours  
    schedules.subscriptionCheck = '0 9 * * *';       // Daily at 9 AM
    schedules.stockSync = '0 */6 * * *';              // Every 6 hours
    schedules.healthCheck = '*/30 * * * *';           // Every 30 minutes

    return schedules;
  }
}

module.exports = new Scheduler();