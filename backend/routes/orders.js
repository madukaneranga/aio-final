import express from "express";
import Order from "../models/Order.js";
import { authenticate, authorize } from "../middleware/auth.js";
import Notification from "../models/Notification.js";

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
        body: "Your order has been delivered. We hope you enjoy your purchase!",
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
      .populate("storeId", "name")
      .populate("items.productId", "title images")
      .sort({ createdAt: -1 });

    res.json(orders);
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

      res.json(orders);
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
      .populate("storeId", "name")
      .populate("items.productId", "title images");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user owns this order or owns the store
    if (
      order.customerId._id.toString() !== req.user._id.toString() &&
      order.storeId._id.toString() !== req.user.storeId?.toString()
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(order);
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

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.storeId.toString() !== req.user.storeId.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updates = { status };
      if (trackingNumber) updates.trackingNumber = trackingNumber;
      if (notes) updates.notes = notes;

      const updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      );

      // Get friendly title & body
    const { title, body } = getNotificationContent(status);

      // Send notification to customer
      await Notification.create({
        userId: booking.userId,
        title,
        body,
        type: "order_update",
        link: "/orders",
      });

      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Allow customers to cancel orders within 5 minutes
/*
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user owns this order
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if order can be cancelled (within 5 minutes and status is pending)
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }

    const orderTime = new Date(order.createdAt);
    const now = new Date();
    const timeDiff = (now - orderTime) / (1000 * 60); // difference in minutes

    if (timeDiff > 5) {
      return res.status(400).json({ error: 'Cancellation window has expired' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'cancelled',
        notes: 'Cancelled by customer'
      },
      { new: true }
    );

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/
export default router;
