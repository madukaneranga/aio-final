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


// Get availability for a store on a specific date
router.get("/availability/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Date parameter is required" });
    }

    // Parse the date and create date range for the entire day
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Find all bookings for this store on the specified date
    // Only include confirmed bookings (not cancelled or pending cancellation)
    const bookings = await Booking.find({
      storeId: storeId,
      "bookingDetails.date": {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $nin: ["cancelled"] } // Exclude cancelled bookings
    })
    .select("bookingDetails serviceId status")
    .populate("serviceId", "title duration");

    res.json({
      success: true,
      date: date,
      storeId: storeId,
      bookings: bookings,
      totalBookings: bookings.length
    });

  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ 
      error: "Failed to fetch availability",
      details: error.message 
    });
  }
});

// Alternative: Get availability for multiple dates at once
router.get("/availability/:storeId/range", async (req, res) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: "Both startDate and endDate parameters are required" 
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      storeId: storeId,
      "bookingDetails.date": {
        $gte: start,
        $lte: end
      },
      status: { $nin: ["cancelled"] }
    })
    .select("bookingDetails serviceId status")
    .populate("serviceId", "title duration")
    .sort({ "bookingDetails.date": 1, "bookingDetails.startTime": 1 });

    // Group bookings by date
    const bookingsByDate = bookings.reduce((acc, booking) => {
      const dateKey = booking.bookingDetails.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(booking);
      return acc;
    }, {});

    res.json({
      success: true,
      storeId: storeId,
      dateRange: { startDate, endDate },
      bookingsByDate: bookingsByDate,
      totalBookings: bookings.length
    });

  } catch (error) {
    console.error("Error fetching availability range:", error);
    res.status(500).json({ 
      error: "Failed to fetch availability range",
      details: error.message 
    });
  }
});

// Get specific time slot availability
router.get("/availability/:storeId/timeslot", async (req, res) => {
  try {
    const { storeId } = req.params;
    const { date, startTime, endTime } = req.query;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ 
        error: "Date, startTime, and endTime parameters are required" 
      });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check for overlapping bookings
    const overlappingBookings = await Booking.find({
      storeId: storeId,
      "bookingDetails.date": {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $nin: ["cancelled"] },
      $or: [
        {
          // Booking starts before our slot ends and ends after our slot starts
          "bookingDetails.startTime": { $lt: endTime },
          "bookingDetails.endTime": { $gt: startTime }
        }
      ]
    })
    .select("bookingDetails serviceId")
    .populate("serviceId", "title");

    const isAvailable = overlappingBookings.length === 0;

    res.json({
      success: true,
      available: isAvailable,
      date: date,
      timeSlot: { startTime, endTime },
      conflictingBookings: overlappingBookings,
      storeId: storeId
    });

  } catch (error) {
    console.error("Error checking timeslot availability:", error);
    res.status(500).json({ 
      error: "Failed to check timeslot availability",
      details: error.message 
    });
  }
});

export default router;
