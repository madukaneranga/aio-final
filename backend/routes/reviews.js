import express from "express";
import Review from "../models/Review.js";
import Order from "../models/Order.js";
import Booking from "../models/Booking.js";
import Store from "../models/Store.js";
import Notification from "../models/Notification.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { emitNotification } from "../utils/socketUtils.js";
import {
  updateStoreRating,
  updateProductRating,
  updateServiceRating,
} from "../helpers/updateratings.js";

const router = express.Router();

// Get reviews for a store
router.get("/store/:storeId", async (req, res) => {
  try {
    const reviews = await Review.find({
      storeId: req.params.storeId,
      isVisible: true,
    })
      .populate("customerId", "name")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reviews for a product
router.get("/product/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;

    // Find orders containing productId inside items array
    const orders = await Order.find({ "items.productId": productId }, { _id: 1 });
    const orderIds = orders.map(order => order._id);

    // Find reviews linked to those orders
    const reviews = await Review.find({ orderId: { $in: orderIds } })
      .populate("customerId", "name")
      .populate("storeId", "name")
      .populate("orderId", "createdAt");

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get("/reviews/:serviceId", async (req, res) => {
  try {
    const serviceId = req.params.serviceId;

    // Find all bookings with this service
    const bookings = await Booking.find({ serviceId }, { _id: 1 });
    const bookingIds = bookings.map(b => b._id);

    // Find reviews linked to those bookings (and service)
    const reviews = await Review.find({ 
        bookingId: { $in: bookingIds },
        serviceId // optionally also check serviceId matches
      })
      .populate("customerId", "name")
      .populate("storeId", "name")
      .populate("bookingId", "date");

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get reviews for store owner
router.get(
  "/manage",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const reviews = await Review.find({ storeId: req.user.storeId })
        .populate("customerId", "name email")
        .populate("orderId", "totalAmount")
        .populate("bookingId", "totalAmount")
        .sort({ createdAt: -1 });

      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post("/", authenticate, authorize("customer"), async (req, res) => {
  try {
    const { storeId, orderId, bookingId, rating, comment } = req.body;

    let hasCompletedTransaction = false;
    let isReviewed = false;
    let order = null;
    let booking = null;

    // ====== If review is for an order ======
    if (orderId) {
      order = await Order.findOne({
        _id: orderId,
        customerId: req.user._id,
        status: "delivered",
      }).populate("items.productId");

      hasCompletedTransaction = !!order;
      isReviewed = !!order?.reviewed;
    }

    // ====== If review is for a booking ======
    if (bookingId) {
      booking = await Booking.findOne({
        _id: bookingId,
        customerId: req.user._id,
        status: "completed",
      });

      hasCompletedTransaction = !!booking;
      isReviewed = !!booking?.reviewed;
    }

    if (!hasCompletedTransaction) {
      return res.status(400).json({
        error: "You can only review after completing an order or booking",
      });
    }

    if (isReviewed) {
      return res.status(400).json({
        error: "You have already reviewed this transaction",
      });
    }

    // ====== Create ONE review ======
    const review = new Review({
      customerId: req.user._id,
      storeId,
      orderId: orderId || undefined,
      bookingId: bookingId || undefined,
      rating,
      comment,
    });
    await review.save();

    // ====== Update store rating ======
    await updateStoreRating(storeId);

    // ====== If order: update each product's rating field only ======
    if (order && order.items?.length) {
      for (const item of order.items) {
        await updateProductRating(item.productId);
      }
      order.reviewed = true;
      await order.save();
    }

    // ====== If booking: update service rating field only ======
    if (booking && booking.serviceId) {
      await updateServiceRating(booking.serviceId);
      booking.reviewed = true;
      await booking.save();
    }

    // ====== Notify store owner ======
    const store = await Store.findById(storeId);
    if (store) {
      const notification = await Notification.create({
        userId: store.ownerId,
        title: "New Review Received",
        userType: "store_owner",
        body: "Your store has received a new customer review. Please respond to maintain excellent customer engagement.",
        type: "review_update",
        link: `/store/${store._id}`,
      });

      emitNotification(store.ownerId.toString(), notification);
    }

    // ====== Return populated review ======
    const populatedReview = await Review.findById(review._id)
      .populate("customerId", "name")
      .populate("orderId", "totalAmount")
      .populate("bookingId", "totalAmount");

    res.status(201).json(populatedReview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update review visibility (store owner)
router.put(
  "/:id/visibility",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const { isVisible } = req.body;

      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      if (review.storeId.toString() !== req.user.storeId.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }

      review.isVisible = isVisible;
      await review.save();

      // Update store rating
      await updateStoreRating(review.storeId);

      res.json(review);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Respond to review (store owner)
router.put(
  "/:id/respond",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const { message } = req.body;

      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      if (review.storeId.toString() !== req.user.storeId.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }

      review.response = {
        message,
        respondedAt: new Date(),
      };
      await review.save();

      // Notify store owner about the order creation
      const store = await Store.findById(storeId);

      try {
        const notification = await Notification.create({
          userId: review.customerId,
          userType: "customer",
          title: "Response to Your Review",
          body: "The store owner has responded to your review. Please check their reply.",
          type: "review_update",
          link: `/store/${store._id}`,
        });

        emitNotification(review.customerId.toString(), notification);
      } catch (err) {
        console.error("Failed to create or emit notification", err);
      }

      res.json(review);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);


export default router;
