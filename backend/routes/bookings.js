import express from 'express';
import Booking from '../models/Booking.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all bookings for a customer
router.get('/customer', authenticate, async (req, res) => {
  try {
    const bookings = await Booking.find({ customerId: req.user._id })
      .populate('storeId', 'name')
      .populate('serviceId', 'title images')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all bookings for a store
router.get('/store', authenticate, authorize('store_owner'), async (req, res) => {
  try {
    const bookings = await Booking.find({ storeId: req.user.storeId })
      .populate('customerId', 'name email')
      .populate('serviceId', 'title images')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get booking by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customerId', 'name email')
      .populate('storeId', 'name')
      .populate('serviceId', 'title images');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user owns this booking or owns the store
    if (booking.customerId._id.toString() !== req.user._id.toString() && 
        booking.storeId._id.toString() !== req.user.storeId?.toString()) {
      return res.status(403).json({ error: 'Access denied' });
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

    res.json(updatedBooking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;