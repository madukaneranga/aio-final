import express from 'express';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Booking from '../models/Booking.js';
import Store from '../models/Store.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get reviews for a store
router.get('/store/:storeId', async (req, res) => {
  try {
    const reviews = await Review.find({ 
      storeId: req.params.storeId, 
      isVisible: true 
    })
      .populate('customerId', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reviews for store owner
router.get('/manage', authenticate, authorize('store_owner'), async (req, res) => {
  try {
    const reviews = await Review.find({ storeId: req.user.storeId })
      .populate('customerId', 'name email')
      .populate('orderId', 'totalAmount')
      .populate('bookingId', 'totalAmount')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create review (customer only)
router.post('/', authenticate, authorize('customer'), async (req, res) => {
  try {
    const { storeId, orderId, bookingId, rating, comment } = req.body;

    // Verify customer has completed order/booking
    let hasCompletedTransaction = false;
    
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        customerId: req.user._id,
        status: 'delivered'
      });
      hasCompletedTransaction = !!order;
    }
    
    if (bookingId) {
      const booking = await Booking.findOne({
        _id: bookingId,
        customerId: req.user._id,
        status: 'completed'
      });
      hasCompletedTransaction = !!booking;
    }

    if (!hasCompletedTransaction) {
      return res.status(400).json({ 
        error: 'You can only review after completing an order or booking' 
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      customerId: req.user._id,
      storeId,
      $or: [
        { orderId: orderId || null },
        { bookingId: bookingId || null }
      ]
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this transaction' });
    }

    const review = new Review({
      customerId: req.user._id,
      storeId,
      orderId: orderId || undefined,
      bookingId: bookingId || undefined,
      rating,
      comment
    });

    await review.save();

    // Update store rating
    await updateStoreRating(storeId);

    const populatedReview = await Review.findById(review._id)
      .populate('customerId', 'name')
      .populate('orderId', 'totalAmount')
      .populate('bookingId', 'totalAmount');

    res.status(201).json(populatedReview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update review visibility (store owner)
router.put('/:id/visibility', authenticate, authorize('store_owner'), async (req, res) => {
  try {
    const { isVisible } = req.body;
    
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.storeId.toString() !== req.user.storeId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    review.isVisible = isVisible;
    await review.save();

    // Update store rating
    await updateStoreRating(review.storeId);

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Respond to review (store owner)
router.put('/:id/respond', authenticate, authorize('store_owner'), async (req, res) => {
  try {
    const { message } = req.body;
    
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.storeId.toString() !== req.user.storeId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    review.response = {
      message,
      respondedAt: new Date()
    };
    await review.save();

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to update store rating
async function updateStoreRating(storeId) {
  const reviews = await Review.find({ storeId, isVisible: true });
  
  if (reviews.length === 0) {
    await Store.findByIdAndUpdate(storeId, { rating: 0 });
    return;
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;
  
  await Store.findByIdAndUpdate(storeId, { 
    rating: Math.round(averageRating * 10) / 10 
  });
}

export default router;