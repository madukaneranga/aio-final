import express from "express";
import Order from "../models/Order.js";
import { authenticate, authorize } from "../middleware/auth.js";
import Notification from "../models/Notification.js";
import { emitNotification } from "../utils/socketUtils.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Store from "../models/Store.js";
import BankDetails from "../models/BankDetails.js";

const router = express.Router();

function getOrderNotificationContent(status) {
  switch (status) {
    case "pending":
      return {
        title: "⏳ Order Pending",
        body: "Your order has been received and is awaiting processing. We’ll update you soon!",
      };
    case "processing":
      return {
        title: "⚙️ Order Processing",
        body: "Good news! Your order is now being prepared and packed carefully.",
      };
    case "shipped":
      return {
        title: "🚚 Order Shipped",
        body: "Your order is on the way! Track your shipment for the latest updates.",
      };
    case "delivered":
      return {
        title: "🎉 Order Delivered",
        body: "Your order has been delivered. Please confirm receipt within 14 days or it will be auto-confirmed.",
      };
    case "completed":
      return {
        title: "✅ Order Completed",
        body: "Your order has been completed. Thank you for your purchase!",
      };
    case "cancelled":
      return {
        title: "❌ Order Cancelled",
        body: "Your order has been cancelled. Please contact support if you have any questions.",
      };
    default:
      return {
        title: "🔔 Order Status Updated",
        body: `The status of your order has been updated to "${status}".`,
      };
  }
}

// Get all orders for a customer
router.get("/customer", authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user._id })
      .populate("storeId", "name ownerId")
      .populate("items.productId", "title images")
      .sort({ createdAt: -1 });

    // For bank transfer orders, populate bank details
    const ordersWithBankDetails = await Promise.all(
      orders.map(async (order) => {
        const orderObj = order.toObject();
        
        // If this is a bank transfer payment, get store owner's bank details
        if (order.paymentDetails?.paymentMethod === "bank_transfer" && 
            order.paymentDetails?.paymentStatus === "pending_bank_transfer" &&
            order.storeId?.ownerId) {
          
          const bankDetails = await BankDetails.findOne({ 
            userId: order.storeId.ownerId, 
            isActive: true 
          });
          
          if (bankDetails) {
            orderObj.bankDetails = {
              bankName: bankDetails.bankName,
              accountHolderName: bankDetails.accountHolderName,
              accountNumber: bankDetails.accountNumber,
              branchName: bankDetails.branchName,
              isVerified: bankDetails.isVerified,
              isLocked: bankDetails.isLocked
            };
          }
        }
        
        return orderObj;
      })
    );

    res.json(ordersWithBankDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders for a store
router.get(
  "/store",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const orders = await Order.find({ storeId: req.user.storeId })
        .populate("customerId", "name email")
        .populate("items.productId", "title images")
        .sort({ createdAt: -1 });

      // Store owners don't need to see any bank details - they already know their own bank info
      const filteredOrders = orders.map(order => {
        const orderObj = order.toObject();
        delete orderObj.bankTransferInstructions;
        delete orderObj.bankDetails;
        delete orderObj.instructions;
        delete orderObj.transferInstructions;
        return orderObj;
      });

      res.json(filteredOrders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get order by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "name email")
      .populate("storeId", "name ownerId")
      .populate("items.productId", "title images");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user owns this order or owns the store
    const isCustomer = order.customerId._id.toString() === req.user._id.toString();
    const isStoreOwner = order.storeId._id.toString() === req.user.storeId?.toString();
    
    if (!isCustomer && !isStoreOwner) {
      return res.status(403).json({ error: "Access denied" });
    }

    let responseOrder = order.toObject();
    
    // Store owners don't need to see any bank details - they already know their own bank info
    if (isStoreOwner && !isCustomer) {
      delete responseOrder.bankTransferInstructions;
      delete responseOrder.bankDetails;
      delete responseOrder.instructions;
      delete responseOrder.transferInstructions;
    } else if (isCustomer) {
      // For customers with bank transfer orders, populate bank details
      if (order.paymentDetails?.paymentMethod === "bank_transfer" && 
          order.paymentDetails?.paymentStatus === "pending_bank_transfer" &&
          order.storeId?.ownerId) {
        
        const bankDetails = await BankDetails.findOne({ 
          userId: order.storeId.ownerId, 
          isActive: true 
        });
        
        if (bankDetails) {
          responseOrder.bankDetails = {
            bankName: bankDetails.bankName,
            accountHolderName: bankDetails.accountHolderName,
            accountNumber: bankDetails.accountNumber,
            branchName: bankDetails.branchName,
            isVerified: bankDetails.isVerified,
            isLocked: bankDetails.isLocked
          };
        }
      }
    }

    res.json(responseOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
router.put(
  "/:id/status",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const { status, trackingNumber, notes } = req.body;
      console.log("Received status update:", { status, trackingNumber, notes });

      const order = await Order.findById(req.params.id);
      if (!order) {
        console.log("Order not found:", req.params.id);
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.storeId.toString() !== req.user.storeId.toString()) {
        console.log("Access denied for user:", req.user._id);
        return res.status(403).json({ error: "Access denied" });
      }

      const updates = { status };
      if (trackingNumber) updates.trackingNumber = trackingNumber;
      if (notes) updates.notes = notes;

      // If status is being set to delivered, set delivery tracking dates
      if (status === "delivered") {
        const deliveredAt = new Date();
        const confirmationDeadline = new Date();
        confirmationDeadline.setDate(confirmationDeadline.getDate() + 14); // 14 days from now
        
        updates.deliveredAt = deliveredAt;
        updates.customerConfirmationDeadline = confirmationDeadline;
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      );
      console.log("Order updated:", updatedOrder);

      // Get friendly title & body
      const { title, body } = getOrderNotificationContent(status);
      console.log("Notification content:", { title, body });

      // Send notification to customer
      const notification = await Notification.create({
        userId: order.customerId,
        title,
        userType: "customer",
        body,
        type: "order_update",
        link: "/orders",
      });
      console.log("Notification created:", notification);

      try {
        emitNotification(order.customerId.toString(), notification);
      } catch (emitError) {
        console.error("Failed to emit notification:", emitError);
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error in updating order status:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Allow customers to cancel orders within 5 minutes
// Customer marks COD order as delivered
router.put("/:id/mark-delivered", authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user owns this order
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if this is a COD order that can be marked as delivered
    if (order.paymentDetails?.paymentMethod !== "cod") {
      return res.status(400).json({ 
        error: "Only Cash on Delivery orders can be marked as delivered by customers" 
      });
    }

    if (order.paymentDetails?.paymentStatus !== "cod_pending") {
      return res.status(400).json({ 
        error: "This order is not eligible for delivery confirmation" 
      });
    }

    if (!order.canCustomerUpdateStatus) {
      return res.status(400).json({ 
        error: "Customer delivery confirmation is not enabled for this order" 
      });
    }

    // Update order status
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: "delivered",
        "paymentDetails.paymentStatus": "paid",
        "paymentDetails.paidAt": new Date(),
        notes: "Marked as delivered by customer",
        canCustomerUpdateStatus: false,
      },
      { new: true }
    );

    // Complete the wallet transaction
    await WalletTransaction.updateMany(
      { 
        transactionId: order.combinedId || order._id.toString(),
        status: "pending" 
      },
      { 
        status: "completed",
        description: "COD payment completed - marked as delivered by customer"
      }
    );

    // Update store total sales
    await Store.findByIdAndUpdate(order.storeId, {
      $inc: { totalSales: order.storeAmount },
    });

    // Notify store owner
    const storeNotification = await Notification.create({
      userId: (await Store.findById(order.storeId)).ownerId,
      title: "🎉 COD Order Delivered",
      userType: "store_owner",
      body: `Order #${order._id.toString().slice(-8)} has been marked as delivered by the customer.`,
      type: "order_update",
      link: "/orders",
    });

    // Emit notification to store owner
    try {
      const store = await Store.findById(order.storeId);
      emitNotification(store.ownerId.toString(), storeNotification);
    } catch (emitError) {
      console.error("Failed to emit notification:", emitError);
    }

    res.json({
      success: true,
      message: "Order marked as delivered successfully",
      order: updatedOrder,
    });

  } catch (error) {
    console.error("Error marking order as delivered:", error);
    res.status(500).json({ error: "Failed to mark order as delivered" });
  }
});

// Customer marks bank transfer payment as sent
router.put("/:id/mark-payment-sent", authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("storeId", "name ownerId");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user owns this order
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if this is a bank transfer order
    if (order.paymentDetails?.paymentMethod !== "bank_transfer") {
      return res.status(400).json({ 
        error: "Only bank transfer orders can be marked as payment sent" 
      });
    }

    // Check if payment is still pending
    if (order.paymentDetails?.paymentStatus !== "pending_bank_transfer") {
      return res.status(400).json({ 
        error: "Payment has already been processed or is not pending" 
      });
    }

    // Update payment status
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        "paymentDetails.paymentStatus": "customer_paid_pending_confirmation",
        "paymentDetails.updatedAt": new Date(),
        "paymentDetails.updatedBy": "customer",
      },
      { new: true }
    );

    // Notify store owner
    const storeNotification = await Notification.create({
      userId: order.storeId.ownerId,
      title: "💰 Customer Payment Claimed",
      userType: "store_owner",
      body: `Customer claims payment sent for order #${order._id.toString().slice(-8)}. Please verify and confirm.`,
      type: "payment_update",
      link: "/orders",
    });

    // Emit notification to store owner
    try {
      emitNotification(order.storeId.ownerId.toString(), storeNotification);
    } catch (emitError) {
      console.error("Failed to emit notification:", emitError);
    }

    res.json({
      success: true,
      message: "Payment marked as sent. Awaiting store confirmation.",
      order: updatedOrder,
    });

  } catch (error) {
    console.error("Error marking payment as sent:", error);
    res.status(500).json({ error: "Failed to mark payment as sent" });
  }
});

// Store owner updates payment status for bank transfer and COD orders
router.put("/:id/update-payment-status", 
  authenticate, 
  authorize("store_owner"), 
  async (req, res) => {
    try {
      const { paymentStatus, notes } = req.body;
      
      console.log("Payment status update request:", {
        orderId: req.params.id,
        paymentStatus,
        userId: req.user._id,
        userStoreId: req.user.storeId,
        userRole: req.user.role
      });
      
      if (!paymentStatus) {
        return res.status(400).json({ error: "Payment status is required" });
      }

      if (!req.user.storeId) {
        return res.status(403).json({ error: "Store not found for user" });
      }

      const order = await Order.findById(req.params.id).populate("storeId");
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      console.log("Order found:", {
        orderId: order._id,
        orderStoreId: order.storeId._id,
        userStoreId: req.user.storeId,
        paymentMethod: order.paymentDetails?.paymentMethod,
        paymentStatus: order.paymentDetails?.paymentStatus
      });

      // Check if user owns this store
      if (order.storeId._id.toString() !== req.user.storeId.toString()) {
        return res.status(403).json({ 
          error: "Access denied - store mismatch",
          orderStore: order.storeId._id.toString(),
          userStore: req.user.storeId.toString()
        });
      }

      const currentPaymentMethod = order.paymentDetails?.paymentMethod;
      const currentPaymentStatus = order.paymentDetails?.paymentStatus;

      // Validate payment method
      if (!["bank_transfer", "cod"].includes(currentPaymentMethod)) {
        return res.status(400).json({ 
          error: "Payment status can only be updated for bank transfer and COD orders",
          currentMethod: currentPaymentMethod
        });
      }

      // Check if payment is already processed
      if (currentPaymentStatus === "paid") {
        return res.status(400).json({ 
          error: "Payment is already marked as paid" 
        });
      }

      // Validate payment status update
      if (!["paid", "failed"].includes(paymentStatus)) {
        return res.status(400).json({ 
          error: "Payment status must be 'paid' or 'failed'",
          received: paymentStatus
        });
      }

      // Validate status transitions for bank transfers
      if (currentPaymentMethod === "bank_transfer") {
        const validStatuses = ["pending_bank_transfer", "customer_paid_pending_confirmation"];
        if (!validStatuses.includes(currentPaymentStatus)) {
          return res.status(400).json({ 
            error: "Invalid payment status for bank transfer update",
            currentStatus: currentPaymentStatus
          });
        }
      }

      console.log("Validation passed, updating payment status...");

      // Update order payment status
      const updateData = {
        "paymentDetails.paymentStatus": paymentStatus,
        "paymentDetails.updatedAt": new Date(),
        "paymentDetails.updatedBy": "store_owner",
      };

      if (notes) {
        updateData.notes = notes;
      }

      if (paymentStatus === "paid") {
        updateData["paymentDetails.paidAt"] = new Date();
        // If it's a COD order, also update the order status
        if (currentPaymentMethod === "cod") {
          updateData.status = "processing"; // Move from pending to processing
        }
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      ).populate("customerId", "name email");

      // If payment confirmed, complete wallet transaction
      if (paymentStatus === "paid") {
        await WalletTransaction.updateMany(
          { 
            transactionId: order.combinedId || order._id.toString(),
            status: "pending" 
          },
          { 
            status: "completed",
            description: `${currentPaymentMethod.toUpperCase()} payment confirmed by store owner`
          }
        );

        // Update store total sales
        await Store.findByIdAndUpdate(order.storeId, {
          $inc: { totalSales: order.storeAmount },
        });
      }

      // Notify customer with contextual messaging
      let notificationTitle, notificationBody;
      
      if (paymentStatus === "paid") {
        notificationTitle = "💰 Payment Confirmed";
        if (currentPaymentStatus === "customer_paid_pending_confirmation") {
          notificationBody = `Your claimed ${currentPaymentMethod === "bank_transfer" ? "bank transfer" : "COD"} payment for order #${order._id.toString().slice(-8)} has been confirmed by the seller.`;
        } else {
          notificationBody = `Your ${currentPaymentMethod === "bank_transfer" ? "bank transfer" : "COD"} payment for order #${order._id.toString().slice(-8)} has been confirmed by the seller.`;
        }
      } else {
        notificationTitle = "❌ Payment Issue";
        if (currentPaymentStatus === "customer_paid_pending_confirmation") {
          notificationBody = `Your claimed payment for order #${order._id.toString().slice(-8)} was rejected. Please verify your ${currentPaymentMethod === "bank_transfer" ? "bank transfer" : "COD"} payment.`;
        } else {
          notificationBody = `There was an issue with your ${currentPaymentMethod === "bank_transfer" ? "bank transfer" : "COD"} payment for order #${order._id.toString().slice(-8)}.`;
        }
      }

      const notification = await Notification.create({
        userId: order.customerId,
        title: notificationTitle,
        userType: "customer",
        body: notificationBody,
        type: "payment_update",
        link: "/orders",
      });

      // Emit notification to customer
      try {
        emitNotification(order.customerId.toString(), notification);
      } catch (emitError) {
        console.error("Failed to emit notification:", emitError);
      }

      console.log(`Order payment status successfully updated to ${paymentStatus} for order ${req.params.id}`);
      
      res.json({
        success: true,
        message: `Payment status updated to ${paymentStatus}`,
        order: updatedOrder,
      });

    } catch (error) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ error: "Failed to update payment status" });
    }
  }
);

// Customer confirms order delivery
router.put("/:id/confirm-delivery", authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("storeId", "name ownerId");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user owns this order
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if order is in delivered status
    if (order.status !== "delivered") {
      return res.status(400).json({ 
        error: "Order must be delivered before it can be confirmed" 
      });
    }

    // Check if confirmation deadline has passed
    if (order.customerConfirmationDeadline && new Date() > order.customerConfirmationDeadline) {
      return res.status(400).json({ 
        error: "Confirmation deadline has passed. Order has been auto-confirmed." 
      });
    }

    // Check if already confirmed
    if (order.status === "completed") {
      return res.status(400).json({ 
        error: "Order has already been confirmed" 
      });
    }

    // Update order to completed status
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: "completed",
        confirmedAt: new Date(),
      },
      { new: true }
    );

    // Complete the wallet transaction if exists
    await WalletTransaction.updateMany(
      { 
        transactionId: order.combinedId || order._id.toString(),
        status: "pending" 
      },
      { 
        status: "completed",
        description: "Order completed - confirmed by customer"
      }
    );

    // Update store total sales if not already updated
    await Store.findByIdAndUpdate(order.storeId, {
      $inc: { totalSales: order.storeAmount },
    });

    // Notify store owner
    const storeNotification = await Notification.create({
      userId: order.storeId.ownerId,
      title: "✅ Order Confirmed",
      userType: "store_owner",
      body: `Customer confirmed delivery for order #${order._id.toString().slice(-8)}. Thank you for your service!`,
      type: "order_update",
      link: "/orders",
    });

    // Emit notification to store owner
    try {
      emitNotification(order.storeId.ownerId.toString(), storeNotification);
    } catch (emitError) {
      console.error("Failed to emit notification:", emitError);
    }

    // Notify customer of successful confirmation
    const customerNotification = await Notification.create({
      userId: order.customerId,
      title: "🎉 Order Confirmed",
      userType: "customer", 
      body: `Thank you for confirming delivery of order #${order._id.toString().slice(-8)}. Your order is now complete!`,
      type: "order_update",
      link: "/orders",
    });

    // Emit notification to customer
    try {
      emitNotification(order.customerId.toString(), customerNotification);
    } catch (emitError) {
      console.error("Failed to emit notification:", emitError);
    }

    res.json({
      success: true,
      message: "Order confirmed successfully",
      order: updatedOrder,
    });

  } catch (error) {
    console.error("Error confirming order delivery:", error);
    res.status(500).json({ error: "Failed to confirm order delivery" });
  }
});

export default router;
