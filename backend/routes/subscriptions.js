import express from 'express';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Create subscription for store owner
router.post('/create', authenticate, authorize('store_owner'), async (req, res) => {
  try {
    const { storeId } = req.body;
    
    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({
      userId: req.user._id,
      storeId,
      status: 'active'
    });

    if (existingSubscription) {
      return res.status(400).json({ error: 'Active subscription already exists' });
    }

    // Create subscription
    const subscription = new Subscription({
      userId: req.user._id,
      storeId,
      amount: 1000,
      currency: 'LKR',
      status: 'active'
    });

    await subscription.save();

    // Update user subscription status
    await User.findByIdAndUpdate(req.user._id, {
      subscriptionStatus: 'active',
      subscriptionId: subscription._id
    });

    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's subscription
router.get('/my-subscription', authenticate, authorize('store_owner'), async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'active'
    }).populate('storeId', 'name');

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Renew subscription
router.post('/renew', authenticate, authorize('store_owner'), async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Extend subscription by 30 days
    subscription.endDate = new Date(subscription.endDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    subscription.paymentHistory.push({
      amount: 1000,
      currency: 'LKR',
      paidAt: new Date(),
      status: 'paid',
      paymentMethod: 'local_payment'
    });

    await subscription.save();

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all subscriptions
router.get('/admin/all', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.email !== 'admin@aio.com') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const subscriptions = await Subscription.find()
      .populate('userId', 'name email')
      .populate('storeId', 'name type')
      .sort({ createdAt: -1 });

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;