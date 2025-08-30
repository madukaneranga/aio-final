import Order from "../models/Order.js";
import Store from "../models/Store.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Notification from "../models/Notification.js";
import { emitNotification } from "./socketUtils.js";

// Auto-confirm orders that have passed their 14-day confirmation deadline
export async function processAutoConfirmation() {
  try {
    console.log("🔄 Processing auto-confirmation for orders...");

    // Find orders that are delivered and past their confirmation deadline
    const ordersToAutoConfirm = await Order.find({
      status: "delivered",
      customerConfirmationDeadline: { $lt: new Date() },
      autoConfirmedAt: { $exists: false }, // Haven't been auto-confirmed yet
    }).populate("customerId", "name email")
      .populate("storeId", "name ownerId");

    console.log(`📋 Found ${ordersToAutoConfirm.length} orders to auto-confirm`);

    if (ordersToAutoConfirm.length === 0) {
      return { processed: 0, message: "No orders to auto-confirm" };
    }

    let successCount = 0;
    let errorCount = 0;

    for (const order of ordersToAutoConfirm) {
      try {
        // Update order to completed status with auto-confirmation
        await Order.findByIdAndUpdate(order._id, {
          status: "completed",
          autoConfirmedAt: new Date(),
        });

        // Complete the wallet transaction if exists
        await WalletTransaction.updateMany(
          { 
            transactionId: order.combinedId || order._id.toString(),
            status: "pending" 
          },
          { 
            status: "completed",
            description: "Order completed - auto-confirmed after 14 days"
          }
        );

        // Update store total sales if not already updated
        await Store.findByIdAndUpdate(order.storeId, {
          $inc: { totalSales: order.storeAmount },
        });

        // Notify customer about auto-confirmation
        const customerNotification = await Notification.create({
          userId: order.customerId._id,
          title: "⏰ Order Auto-Confirmed",
          userType: "customer",
          body: `Order #${order._id.toString().slice(-8)} has been automatically confirmed after 14 days. Thank you for your purchase!`,
          type: "order_update",
          link: "/orders",
        });

        // Notify store owner about auto-confirmation
        const storeNotification = await Notification.create({
          userId: order.storeId.ownerId,
          title: "⏰ Order Auto-Confirmed",
          userType: "store_owner",
          body: `Order #${order._id.toString().slice(-8)} has been automatically confirmed after 14 days.`,
          type: "order_update",
          link: "/orders",
        });

        // Emit notifications
        try {
          emitNotification(order.customerId._id.toString(), customerNotification);
          emitNotification(order.storeId.ownerId.toString(), storeNotification);
        } catch (emitError) {
          console.error("Failed to emit notification:", emitError);
        }

        successCount++;
        console.log(`✅ Auto-confirmed order ${order._id.toString().slice(-8)}`);

      } catch (orderError) {
        console.error(`❌ Error auto-confirming order ${order._id.toString().slice(-8)}:`, orderError);
        errorCount++;
      }
    }

    console.log(`🎉 Auto-confirmation complete: ${successCount} successful, ${errorCount} errors`);
    
    return { 
      processed: successCount, 
      errors: errorCount,
      message: `Auto-confirmed ${successCount} orders` 
    };

  } catch (error) {
    console.error("❌ Error in auto-confirmation process:", error);
    throw error;
  }
}

// Send reminder notifications to customers about upcoming confirmation deadline
export async function sendConfirmationReminders() {
  try {
    console.log("🔔 Sending confirmation reminders...");

    // Find orders delivered 11 days ago (3 days before deadline)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 11);

    // Find orders delivered exactly 11 days ago (reminder on day 11)
    const reminderStartDate = new Date(threeDaysAgo);
    reminderStartDate.setHours(0, 0, 0, 0);
    
    const reminderEndDate = new Date(threeDaysAgo);
    reminderEndDate.setHours(23, 59, 59, 999);

    const ordersForReminder = await Order.find({
      status: "delivered",
      deliveredAt: {
        $gte: reminderStartDate,
        $lte: reminderEndDate
      },
      confirmedAt: { $exists: false }, // Not manually confirmed yet
      autoConfirmedAt: { $exists: false }, // Not auto-confirmed yet
    }).populate("customerId", "name email");

    console.log(`📋 Found ${ordersForReminder.length} orders for reminder`);

    if (ordersForReminder.length === 0) {
      return { sent: 0, message: "No reminders to send" };
    }

    let successCount = 0;

    for (const order of ordersForReminder) {
      try {
        // Calculate days remaining
        const daysRemaining = Math.ceil(
          (order.customerConfirmationDeadline - new Date()) / (1000 * 60 * 60 * 24)
        );

        const reminderNotification = await Notification.create({
          userId: order.customerId._id,
          title: "⏳ Confirm Your Delivery",
          userType: "customer",
          body: `Please confirm delivery of order #${order._id.toString().slice(-8)}. Auto-confirmation in ${daysRemaining} days.`,
          type: "order_reminder",
          link: "/orders",
        });

        // Emit notification
        try {
          emitNotification(order.customerId._id.toString(), reminderNotification);
        } catch (emitError) {
          console.error("Failed to emit reminder notification:", emitError);
        }

        successCount++;
        console.log(`📨 Sent reminder for order ${order._id.toString().slice(-8)}`);

      } catch (orderError) {
        console.error(`❌ Error sending reminder for order ${order._id.toString().slice(-8)}:`, orderError);
      }
    }

    console.log(`📬 Reminders sent: ${successCount} successful`);
    
    return { 
      sent: successCount,
      message: `Sent ${successCount} confirmation reminders` 
    };

  } catch (error) {
    console.error("❌ Error sending confirmation reminders:", error);
    throw error;
  }
}

// Run both auto-confirmation and reminder processes
export async function runOrderMaintenanceTasks() {
  console.log("🚀 Starting order maintenance tasks...");
  
  try {
    const autoConfirmResult = await processAutoConfirmation();
    const reminderResult = await sendConfirmationReminders();
    
    console.log("✅ Order maintenance tasks completed successfully");
    
    return {
      autoConfirmation: autoConfirmResult,
      reminders: reminderResult,
      success: true
    };
  } catch (error) {
    console.error("❌ Error in order maintenance tasks:", error);
    return {
      success: false,
      error: error.message
    };
  }
}