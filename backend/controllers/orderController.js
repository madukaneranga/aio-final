import Order from "../models/Order.js";
import Notification from "../models/Notification.js";
import WalletTransaction from "../models/Transaction.js";
import Wallet from "../models/Wallet.js";
import Store from "../models/Store.js";
import BankDetails from "../models/BankDetails.js";
import { emitNotification } from "../utils/socketUtils.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import logger  from "../utils/logger.js";

// Helper function for order notification content
const getOrderNotificationContent = (status) => {
  switch (status) {
    case "pending":
      return {
        title: "⏳ Order Pending",
        body: "Your order has been received and is awaiting processing. We'll update you soon!",
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
};

const orderController = {
  // Get all orders for a customer
  getCustomerOrders: async (req, res) => {
    logger.route(req.method, req.originalUrl);

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

      res.json(successResponse(ordersWithBankDetails));
    } catch (error) {
      logger.error("Failed to get customer orders", error);
      res.status(500).json(errorResponse("Failed to retrieve orders"));
    }
  },

  // Get all orders for a store
  getStoreOrders: async (req, res) => {
    logger.route(req.method, req.originalUrl);

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

      res.json(successResponse(filteredOrders));
    } catch (error) {
      logger.error("Failed to get store orders", error);
      res.status(500).json(errorResponse("Failed to retrieve store orders"));
    }
  },

  // Get order by ID
  getOrderById: async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const order = await Order.findById(req.params.id)
        .populate("customerId", "name email")
        .populate("storeId", "name ownerId")
        .populate("items.productId", "title images");

      if (!order) {
        return res.status(404).json(errorResponse("Order not found", 404));
      }

      // Check if user owns this order or owns the store
      const isCustomer = order.customerId._id.toString() === req.user._id.toString();
      const isStoreOwner = order.storeId._id.toString() === req.user.storeId?.toString();
      
      if (!isCustomer && !isStoreOwner) {
        return res.status(403).json(errorResponse("Access denied", 403));
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

      res.json(successResponse(responseOrder));
    } catch (error) {
      logger.error("Failed to get order by ID", error);
      res.status(500).json(errorResponse("Failed to retrieve order"));
    }
  },

  // Update order status
  updateOrderStatus: async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const { status, trackingNumber, notes } = req.body;
      logger.info("Received status update", { status, trackingNumber, notes });

      const order = await Order.findById(req.params.id);
      if (!order) {
        logger.info("Order not found", { orderId: req.params.id });
        return res.status(404).json(errorResponse("Order not found", 404));
      }

      if (order.storeId.toString() !== req.user.storeId.toString()) {
        logger.info("Access denied for user", { userId: req.user._id });
        return res.status(403).json(errorResponse("Access denied", 403));
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
      logger.info("Order updated", { updatedOrder });

      // Get friendly title & body
      const { title, body } = getOrderNotificationContent(status);
      logger.info("Notification content", { title, body });

      // Send notification to customer
      const notification = await Notification.create({
        userId: order.customerId,
        title,
        userType: "customer",
        body,
        type: "order_update",
        link: "/orders",
      });
      logger.info("Notification created", { notification });

      try {
        emitNotification(order.customerId.toString(), notification);
      } catch (emitError) {
        logger.error("Failed to emit notification", emitError);
      }

      res.json(successResponse(updatedOrder, "Order status updated successfully"));
    } catch (error) {
      logger.error("Error in updating order status", error);
      res.status(500).json(errorResponse("Failed to update order status"));
    }
  },

  // Customer marks COD order as delivered
  markOrderDelivered: async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json(errorResponse("Order not found", 404));
      }

      // Check if user owns this order
      if (order.customerId.toString() !== req.user._id.toString()) {
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      // Check if this is a COD order that can be marked as delivered
      if (order.paymentDetails?.paymentMethod !== "cod") {
        return res.status(400).json(errorResponse(
          "Only Cash on Delivery orders can be marked as delivered by customers", 400
        ));
      }

      if (order.paymentDetails?.paymentStatus !== "cod_pending") {
        return res.status(400).json(errorResponse(
          "This order is not eligible for delivery confirmation", 400
        ));
      }

      if (!order.canCustomerUpdateStatus) {
        return res.status(400).json(errorResponse(
          "Customer delivery confirmation is not enabled for this order", 400
        ));
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

      // Update store owner's wallet totalEarnings and available balance
      const store = await Store.findById(order.storeId);
      if (store && store.ownerId) {
        await Wallet.findOneAndUpdate(
          { userId: store.ownerId },
          { 
            $inc: { 
              'balance.totalEarnings': order.storeAmount,
              'balance.availableBalance': order.storeAmount
            },
            $set: {
              'metadata.lastTransactionDate': new Date(),
              'metadata.lastBalanceUpdate': new Date()
            }
          },
          { upsert: true }
        );
      }

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
        logger.error("Failed to emit notification", emitError);
      }

      res.json(successResponse({
        message: "Order marked as delivered successfully",
        order: updatedOrder,
      }));

    } catch (error) {
      logger.error("Error marking order as delivered", error);
      res.status(500).json(errorResponse("Failed to mark order as delivered"));
    }
  },

  // Customer marks bank transfer payment as sent
  markPaymentSent: async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const order = await Order.findById(req.params.id).populate("storeId", "name ownerId");
      if (!order) {
        return res.status(404).json(errorResponse("Order not found", 404));
      }

      // Check if user owns this order
      if (order.customerId.toString() !== req.user._id.toString()) {
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      // Check if this is a bank transfer order
      if (order.paymentDetails?.paymentMethod !== "bank_transfer") {
        return res.status(400).json(errorResponse(
          "Only bank transfer orders can be marked as payment sent", 400
        ));
      }

      // Check if payment is still pending
      if (order.paymentDetails?.paymentStatus !== "pending_bank_transfer") {
        return res.status(400).json(errorResponse(
          "Payment has already been processed or is not pending", 400
        ));
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
        logger.error("Failed to emit notification", emitError);
      }

      res.json(successResponse({
        message: "Payment marked as sent. Awaiting store confirmation.",
        order: updatedOrder,
      }));

    } catch (error) {
      logger.error("Error marking payment as sent", error);
      res.status(500).json(errorResponse("Failed to mark payment as sent"));
    }
  },

  // Store owner updates payment status for bank transfer and COD orders
  updatePaymentStatus: async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const { paymentStatus, notes } = req.body;
      
      logger.info("Payment status update request", {
        orderId: req.params.id,
        paymentStatus,
        userId: req.user._id,
        userStoreId: req.user.storeId,
        userRole: req.user.role
      });
      
      if (!paymentStatus) {
        return res.status(400).json(errorResponse("Payment status is required", 400));
      }

      if (!req.user.storeId) {
        return res.status(403).json(errorResponse("Store not found for user", 403));
      }

      const order = await Order.findById(req.params.id).populate("storeId");
      if (!order) {
        return res.status(404).json(errorResponse("Order not found", 404));
      }

      logger.info("Order found", {
        orderId: order._id,
        orderStoreId: order.storeId._id,
        userStoreId: req.user.storeId,
        paymentMethod: order.paymentDetails?.paymentMethod,
        paymentStatus: order.paymentDetails?.paymentStatus
      });

      // Check if user owns this store
      if (order.storeId._id.toString() !== req.user.storeId.toString()) {
        return res.status(403).json(errorResponse("Access denied - store mismatch", 403, {
          orderStore: order.storeId._id.toString(),
          userStore: req.user.storeId.toString()
        }));
      }

      const currentPaymentMethod = order.paymentDetails?.paymentMethod;
      const currentPaymentStatus = order.paymentDetails?.paymentStatus;

      // Validate payment method
      if (!["bank_transfer", "cod"].includes(currentPaymentMethod)) {
        return res.status(400).json(errorResponse(
          "Payment status can only be updated for bank transfer and COD orders", 400, {
            currentMethod: currentPaymentMethod
          }
        ));
      }

      // Check if payment is already processed
      if (currentPaymentStatus === "paid") {
        return res.status(400).json(errorResponse("Payment is already marked as paid", 400));
      }

      // Validate payment status update
      if (!["paid", "failed"].includes(paymentStatus)) {
        return res.status(400).json(errorResponse(
          "Payment status must be 'paid' or 'failed'", 400, {
            received: paymentStatus
          }
        ));
      }

      // Validate status transitions for bank transfers
      if (currentPaymentMethod === "bank_transfer") {
        const validStatuses = ["pending_bank_transfer", "customer_paid_pending_confirmation"];
        if (!validStatuses.includes(currentPaymentStatus)) {
          return res.status(400).json(errorResponse(
            "Invalid payment status for bank transfer update", 400, {
              currentStatus: currentPaymentStatus
            }
          ));
        }
      }

      logger.info("Validation passed, updating payment status...");

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
        logger.error("Failed to emit notification", emitError);
      }

      logger.info(`Order payment status successfully updated to ${paymentStatus} for order ${req.params.id}`);
      
      res.json(successResponse({
        message: `Payment status updated to ${paymentStatus}`,
        order: updatedOrder,
      }));

    } catch (error) {
      logger.error("Error updating payment status", error);
      res.status(500).json(errorResponse("Failed to update payment status"));
    }
  },

  // Customer confirms order delivery
  confirmDelivery: async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const order = await Order.findById(req.params.id).populate("storeId", "name ownerId");
      if (!order) {
        return res.status(404).json(errorResponse("Order not found", 404));
      }

      // Check if user owns this order
      if (order.customerId.toString() !== req.user._id.toString()) {
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      // Check if order is in delivered status
      if (order.status !== "delivered") {
        return res.status(400).json(errorResponse(
          "Order must be delivered before it can be confirmed", 400
        ));
      }

      // Check if confirmation deadline has passed
      if (order.customerConfirmationDeadline && new Date() > order.customerConfirmationDeadline) {
        return res.status(400).json(errorResponse(
          "Confirmation deadline has passed. Order has been auto-confirmed.", 400
        ));
      }

      // Check if already confirmed
      if (order.status === "completed") {
        return res.status(400).json(errorResponse("Order has already been confirmed", 400));
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

      // Update store owner's wallet totalEarnings and balance
      const store = await Store.findById(order.storeId);
      if (store && store.ownerId) {
        const walletUpdate = { 
          $inc: { 
            'balance.totalEarnings': order.storeAmount
          },
          $set: {
            'metadata.lastTransactionDate': new Date(),
            'metadata.lastBalanceUpdate': new Date()
          }
        };

        // For PayHere payments, move from pending to available balance
        if (order.paymentDetails?.paymentMethod === 'payhere') {
          walletUpdate.$inc['balance.pendingBalance'] = -order.storeAmount;
          walletUpdate.$inc['balance.availableBalance'] = order.storeAmount;
        } else {
          // For COD and bank transfers, add directly to available balance
          walletUpdate.$inc['balance.availableBalance'] = order.storeAmount;
        }

        await Wallet.findOneAndUpdate(
          { userId: store.ownerId },
          walletUpdate,
          { upsert: true }
        );
      }

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
        logger.error("Failed to emit notification", emitError);
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
        logger.error("Failed to emit notification", emitError);
      }

      res.json(successResponse({
        message: "Order confirmed successfully",
        order: updatedOrder,
      }));

    } catch (error) {
      logger.error("Error confirming order delivery", error);
      res.status(500).json(errorResponse("Failed to confirm order delivery"));
    }
  },
};

export default orderController;