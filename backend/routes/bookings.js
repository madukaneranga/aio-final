import express from "express";
import Booking from "../models/Booking.js";
import { authenticate, authorize } from "../middleware/auth.js";
import Notification from "../models/Notification.js";
import { emitNotification } from "../utils/socketUtils.js";


const router = express.Router();

function getNotificationContent(status) {
  switch (status) {
    case "pending":
      return {
        title: "⏳ Booking Pending",
        body: "Your booking is now pending. We’ll notify you once it gets confirmed!",
      };
    case "confirmed":
      return {
        title: "✅ Booking Confirmed!",
        body: "Awesome! Your booking has been confirmed. You can view all the details in your bookings section.",
      };
    case "completed":
      return {
        title: "🎉 Booking Completed",
        body: "Your service is now complete. We hope everything went well. Thank you for booking with us!",
      };
    case "cancelled":
      return {
        title: "❌ Booking Cancelled",
        body: "Unfortunately, your booking has been cancelled. Please check your bookings page for more info.",
      };
    default:
      return {
        title: "🔔 Booking Status Updated",
        body: `The status of your booking has been updated to "${status}".`,
      };
  }
}

// Get all bookings for a customer
router.get("/customer", authenticate, async (req, res) => {
  try {
    const bookings = await Booking.find({ customerId: req.user._id })
      .populate("storeId", "name")
      .populate("serviceId", "title images")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all bookings for a store
router.get(
  "/store",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const bookings = await Booking.find({ storeId: req.user.storeId })
        .populate("customerId", "name email")
        .populate("serviceId", "title images")
        .sort({ createdAt: -1 });

      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get booking by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("customerId", "name email")
      .populate("storeId", "name")
      .populate("serviceId", "title images");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if user owns this booking or owns the store
    if (
      booking.customerId._id.toString() !== req.user._id.toString() &&
      booking.storeId._id.toString() !== req.user.storeId?.toString()
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Update booking status
router.put('/:id/status', authenticate, authorize('store_owner'), async (req, res) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.storeId.toString() !== req.user.storeId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    // Get friendly title & body
    const { title, body } = getNotificationContent(status);

    // Send notification to customer
    const notification = await Notification.create({
      userId: booking.customerId,
      title,
      userType:"customer",
      body,
      type: 'booking_update',
      link: '/bookings',
    });

    emitNotification(booking.customerId.toString(), notification);
    
    res.json(updatedBooking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


export default router;
