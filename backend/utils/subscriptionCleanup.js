import cron from 'node-cron';
import Subscription from '../models/Subscription.js';

/**
 * Cleanup expired subscription upgrades
 * Runs every 15 minutes to check for timed-out upgrades
 */
export function startSubscriptionCleanupJob() {
  console.log('🧹 Starting subscription cleanup job...');
  
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('🕒 Running subscription cleanup job...');
      
      const expiredUpgrades = await Subscription.findExpiredUpgrades(30); // 30 minutes timeout
      let cleanedUp = 0;
      
      if (expiredUpgrades.length === 0) {
        console.log('✅ No expired upgrades found');
        return;
      }
      
      console.log(`🔍 Found ${expiredUpgrades.length} expired upgrades to clean up`);
      
      for (const subscription of expiredUpgrades) {
        try {
          console.log(`🔙 Rolling back expired upgrade: ${subscription._id} (attempt: ${subscription.upgradeAttemptId})`);
          
          subscription.rollbackUpgrade();
          await subscription.save();
          
          cleanedUp++;
          
          // TODO: Send email notification to user about timeout
          // await sendUpgradeTimeoutEmail(subscription.userId);
          
          console.log(`✅ Rolled back expired upgrade for user: ${subscription.userId}`);
        } catch (error) {
          console.error(`❌ Failed to rollback upgrade for: ${subscription._id}`, error.message);
        }
      }
      
      console.log(`🧹 Cleanup completed. Rolled back ${cleanedUp}/${expiredUpgrades.length} expired upgrades`);
      
    } catch (error) {
      console.error('💥 Subscription cleanup job error:', error);
    }
  });
  
  console.log('✅ Subscription cleanup job started (runs every 15 minutes)');
}

/**
 * Manual cleanup function for immediate execution
 */
export async function cleanupExpiredUpgrades(timeoutMinutes = 30) {
  console.log('🧹 Manual subscription cleanup started...');
  
  try {
    const expiredUpgrades = await Subscription.findExpiredUpgrades(timeoutMinutes);
    let cleanedUp = 0;
    
    if (expiredUpgrades.length === 0) {
      console.log('✅ No expired upgrades found');
      return { success: true, cleanedUp: 0, total: 0 };
    }
    
    console.log(`🔍 Found ${expiredUpgrades.length} expired upgrades`);
    
    for (const subscription of expiredUpgrades) {
      try {
        subscription.rollbackUpgrade();
        await subscription.save();
        cleanedUp++;
      } catch (error) {
        console.error(`❌ Failed to rollback: ${subscription._id}`, error.message);
      }
    }
    
    console.log(`🧹 Manual cleanup completed. Rolled back ${cleanedUp}/${expiredUpgrades.length} expired upgrades`);
    
    return {
      success: true,
      cleanedUp,
      total: expiredUpgrades.length,
      failed: expiredUpgrades.length - cleanedUp
    };
    
  } catch (error) {
    console.error('💥 Manual cleanup error:', error);
    return { success: false, error: error.message };
  }
}