import { runOrderMaintenanceTasks } from './orderAutoConfirmation.js';

// Simple interval-based scheduler
class SimpleScheduler {
  constructor() {
    this.tasks = [];
    this.intervals = new Map();
  }

  // Add a scheduled task
  schedule(taskName, taskFunction, intervalMs) {
    console.log(`📅 Scheduling task "${taskName}" to run every ${intervalMs}ms`);
    
    const task = {
      name: taskName,
      function: taskFunction,
      interval: intervalMs,
      lastRun: null,
      nextRun: new Date(Date.now() + intervalMs)
    };

    this.tasks.push(task);

    // Set up the interval
    const intervalId = setInterval(async () => {
      try {
        console.log(`🔄 Running scheduled task: ${taskName}`);
        task.lastRun = new Date();
        task.nextRun = new Date(Date.now() + intervalMs);
        
        await taskFunction();
        
        console.log(`✅ Completed scheduled task: ${taskName}`);
      } catch (error) {
        console.error(`❌ Error in scheduled task "${taskName}":`, error);
      }
    }, intervalMs);

    this.intervals.set(taskName, intervalId);
    
    return task;
  }

  // Remove a scheduled task
  unschedule(taskName) {
    const intervalId = this.intervals.get(taskName);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(taskName);
      this.tasks = this.tasks.filter(task => task.name !== taskName);
      console.log(`🗑️ Unscheduled task: ${taskName}`);
      return true;
    }
    return false;
  }

  // Get status of all scheduled tasks
  getStatus() {
    return this.tasks.map(task => ({
      name: task.name,
      interval: task.interval,
      lastRun: task.lastRun,
      nextRun: task.nextRun,
      isActive: this.intervals.has(task.name)
    }));
  }

  // Stop all scheduled tasks
  stopAll() {
    for (const [taskName, intervalId] of this.intervals) {
      clearInterval(intervalId);
      console.log(`🛑 Stopped task: ${taskName}`);
    }
    this.intervals.clear();
    this.tasks = [];
  }
}

// Create global scheduler instance
const scheduler = new SimpleScheduler();

// Start order maintenance scheduler
export function startOrderScheduler() {
  console.log("🚀 Starting order maintenance scheduler...");
  
  // Run order maintenance every hour (3600000 ms)
  scheduler.schedule(
    'orderMaintenance', 
    runOrderMaintenanceTasks, 
    3600000 // 1 hour
  );
  
  console.log("⏰ Order maintenance scheduler started - will run every hour");
}

// Stop order scheduler
export function stopOrderScheduler() {
  scheduler.unschedule('orderMaintenance');
  console.log("⏹️ Order maintenance scheduler stopped");
}

// Get scheduler status
export function getSchedulerStatus() {
  return scheduler.getStatus();
}

export default scheduler;