import express from "express";
import Booking from "../models/Booking.js";
import { authenticate, authorize } from "../middleware/auth.js";
import Notification from "../models/Notification.js";
import { emitNotification } from "../utils/socketUtils.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Store from "../models/Store.js";


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

      // Filter out sensitive bank transfer information for store owners
      const filteredBookings = bookings.map(booking => {
        const bookingObj = booking.toObject();
        // Don't expose bank transfer information to store owners
        if (bookingObj.paymentDetails?.paymentMethod === "bank_transfer") {
          delete bookingObj.bankTransferInstructions;
          delete bookingObj.bankDetails;
          delete bookingObj.instructions;
          delete bookingObj.transferInstructions;
        }
        return bookingObj;
      });

      res.json(filteredBookings);
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
    const isCustomer = booking.customerId._id.toString() === req.user._id.toString();
    const isStoreOwner = booking.storeId._id.toString() === req.user.storeId?.toString();
    
    if (!isCustomer && !isStoreOwner) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Filter out sensitive bank transfer information for store owners
    let responseBooking = booking.toObject();
    if (isStoreOwner && !isCustomer && responseBooking.paymentDetails?.paymentMethod === "bank_transfer") {
      delete responseBooking.bankTransferInstructions;
      delete responseBooking.bankDetails;
      delete responseBooking.instructions;
      delete responseBooking.transferInstructions;
    }

    res.json(responseBooking);
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

// Customer marks COD booking as delivered/completed
router.put("/:id/mark-delivered", authenticate, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if user owns this booking
    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if this is a COD booking that can be marked as delivered
    if (booking.paymentDetails?.paymentMethod !== "cod") {
      return res.status(400).json({ 
        error: "Only Cash on Delivery bookings can be marked as completed by customers" 
      });
    }

    if (booking.paymentDetails?.paymentStatus !== "cod_pending") {
      return res.status(400).json({ 
        error: "This booking is not eligible for completion confirmation" 
      });
    }

    if (!booking.canCustomerUpdateStatus) {
      return res.status(400).json({ 
        error: "Customer completion confirmation is not enabled for this booking" 
      });
    }

    // Update booking status
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        status: "completed",
        "paymentDetails.paymentStatus": "paid",
        "paymentDetails.paidAt": new Date(),
        canCustomerUpdateStatus: false,
      },
      { new: true }
    );

    // Complete the wallet transaction
    await WalletTransaction.updateMany(
      { 
        transactionId: booking.combinedId || booking._id.toString(),
        status: "pending" 
      },
      { 
        status: "completed",
        description: "COD payment completed - marked as completed by customer"
      }
    );

    // Update store total sales
    await Store.findByIdAndUpdate(booking.storeId, {
      $inc: { totalSales: booking.storeAmount },
    });

    // Notify store owner
    const storeNotification = await Notification.create({
      userId: (await Store.findById(booking.storeId)).ownerId,
      title: "🎉 COD Booking Completed",
      userType: "store_owner",
      body: `Booking #${booking._id.toString().slice(-8)} has been marked as completed by the customer.`,
      type: "booking_update",
      link: "/bookings",
    });

    // Emit notification to store owner
    try {
      const store = await Store.findById(booking.storeId);
      emitNotification(store.ownerId.toString(), storeNotification);
    } catch (emitError) {
      console.error("Failed to emit notification:", emitError);
    }

    res.json({
      success: true,
      message: "Booking marked as completed successfully",
      booking: updatedBooking,
    });

  } catch (error) {
    console.error("Error marking booking as completed:", error);
    res.status(500).json({ error: "Failed to mark booking as completed" });
  }
});

// Store owner updates payment status for bank transfer and COD bookings
router.put("/:id/update-payment-status", 
  authenticate, 
  authorize("store_owner"), 
  async (req, res) => {
    try {
      const { paymentStatus, notes } = req.body;
      
      console.log("Booking payment status update request:", {
        bookingId: req.params.id,
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

      const booking = await Booking.findById(req.params.id).populate("storeId");
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      console.log("Booking found:", {
        bookingId: booking._id,
        bookingStoreId: booking.storeId._id,
        userStoreId: req.user.storeId,
        paymentMethod: booking.paymentDetails?.paymentMethod,
        paymentStatus: booking.paymentDetails?.paymentStatus
      });

      // Check if user owns this store
      if (booking.storeId._id.toString() !== req.user.storeId.toString()) {
        return res.status(403).json({ 
          error: "Access denied - store mismatch",
          bookingStore: booking.storeId._id.toString(),
          userStore: req.user.storeId.toString()
        });
      }

      const currentPaymentMethod = booking.paymentDetails?.paymentMethod;
      const currentPaymentStatus = booking.paymentDetails?.paymentStatus;

      // Validate payment method
      if (!["bank_transfer", "cod"].includes(currentPaymentMethod)) {
        return res.status(400).json({ 
          error: "Payment status can only be updated for bank transfer and COD bookings",
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

      console.log("Validation passed, updating booking payment status...");

      // Update booking payment status
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
        // If it's a COD booking, also update the booking status
        if (currentPaymentMethod === "cod") {
          updateData.status = "confirmed"; // Move from pending to confirmed
        }
      }

      const updatedBooking = await Booking.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      ).populate("customerId", "name email");

      // If payment confirmed, complete wallet transaction
      if (paymentStatus === "paid") {
        await WalletTransaction.updateMany(
          { 
            transactionId: booking.combinedId || booking._id.toString(),
            status: "pending" 
          },
          { 
            status: "completed",
            description: `${currentPaymentMethod.toUpperCase()} payment confirmed by store owner`
          }
        );

        // Update store total sales
        await Store.findByIdAndUpdate(booking.storeId, {
          $inc: { totalSales: booking.storeAmount },
        });
      }

      // Notify customer
      const notification = await Notification.create({
        userId: booking.customerId,
        title: paymentStatus === "paid" ? "💰 Payment Confirmed" : "❌ Payment Issue",
        userType: "customer",
        body: paymentStatus === "paid" 
          ? `Your ${currentPaymentMethod === "bank_transfer" ? "bank transfer" : "COD"} payment for booking #${booking._id.toString().slice(-8)} has been confirmed.`
          : `There was an issue with your ${currentPaymentMethod === "bank_transfer" ? "bank transfer" : "COD"} payment for booking #${booking._id.toString().slice(-8)}.`,
        type: "booking_update",
        link: "/bookings",
      });

      // Emit notification to customer
      try {
        emitNotification(booking.customerId.toString(), notification);
      } catch (emitError) {
        console.error("Failed to emit notification:", emitError);
      }

      console.log(`Booking payment status successfully updated to ${paymentStatus} for booking ${req.params.id}`);
      
      res.json({
        success: true,
        message: `Payment status updated to ${paymentStatus}`,
        booking: updatedBooking,
      });

    } catch (error) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ error: "Failed to update payment status" });
    }
  }
);

export default router;
