// route/flashDealRoutes.js
import express from 'express';
import FlashDeal from '../models/FlashDeal.js';
import { flashDealValidationRules, flashDealUpdateValidationRules } from '../utils/validation.js';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';

const router = express.Router();

// Validation result handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// GET /api/flash-deals/current - Get current or upcoming flash deal for banner
router.get('/current', async (req, res) => {
  try {
    // First try to get current active deal
    let flashDeal = await FlashDeal.getCurrentDeal();
    
    // If no current deal, get the next upcoming deal
    if (!flashDeal) {
      flashDeal = await FlashDeal.getUpcomingDeal();
    }
    
    if (!flashDeal) {
      return res.status(404).json({
        success: false,
        message: 'No flash deals available'
      });
    }

    // Increment view count
    await flashDeal.incrementViews();
    
    // Return deal with computed properties
    res.json({
      success: true,
      data: {
        ...flashDeal.toObject(),
        isCurrentlyActive: flashDeal.isCurrentlyActive,
        saleStatus: flashDeal.saleStatus,
        timeRemaining: flashDeal.timeRemaining
      }
    });
  } catch (error) {
    console.error('Error fetching current flash deal:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching flash deal',
      error: error.message
    });
  }
});

// GET /api/flash-deals - Get all flash deals (admin)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'all',
      store = null 
    } = req.query;
    
    const query = {};
    
    // Filter by status
    if (status === 'active') {
      const now = new Date();
      query.isActive = true;
      query.isPublished = true;
      query.saleStartTime = { $lte: now };
      query.saleEndTime = { $gte: now };
    } else if (status === 'upcoming') {
      const now = new Date();
      query.isActive = true;
      query.isPublished = true;
      query.saleStartTime = { $gt: now };
    } else if (status === 'ended') {
      const now = new Date();
      query.saleEndTime = { $lt: now };
    } else if (status === 'draft') {
      query.isPublished = false;
    }
    
    // Filter by store
    if (store) {
      query.store = store;
    }
    
    const flashDeals = await FlashDeal.find(query)
      .populate('createdBy', 'name email')
      .populate('store', 'name')
      .populate('featuredProducts', 'name price images')
      .populate('categories', 'name')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await FlashDeal.countDocuments(query);
    
    res.json({
      success: true,
      data: flashDeals.map(deal => ({
        ...deal.toObject(),
        isCurrentlyActive: deal.isCurrentlyActive,
        saleStatus: deal.saleStatus,
        timeRemaining: deal.timeRemaining
      })),
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching flash deals:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching flash deals',
      error: error.message
    });
  }
});

// GET /api/flash-deals/:id - Get single flash deal by ID or slug
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if id is a valid ObjectId or treat as slug
    const query = mongoose.Types.ObjectId.isValid(id) 
      ? { _id: id }
      : { slug: id };
    
    const flashDeal = await FlashDeal.findOne(query)
      .populate('createdBy', 'name email')
      .populate('store', 'name')
      .populate('featuredProducts', 'name price images description')
      .populate('categories', 'name');
    
    if (!flashDeal) {
      return res.status(404).json({
        success: false,
        message: 'Flash deal not found'
      });
    }
    
    // Increment view count
    await flashDeal.incrementViews();
    
    res.json({
      success: true,
      data: {
        ...flashDeal.toObject(),
        isCurrentlyActive: flashDeal.isCurrentlyActive,
        saleStatus: flashDeal.saleStatus,
        timeRemaining: flashDeal.timeRemaining
      }
    });
  } catch (error) {
    console.error('Error fetching flash deal:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching flash deal',
      error: error.message
    });
  }
});

// POST /api/flash-deals - Create new flash deal (admin/store owner)
router.post('/', flashDealValidationRules(), handleValidationErrors, async (req, res) => {
  try {
    const flashDealData = {
      ...req.body,
      createdBy: req.user?.id || req.body.createdBy // Adjust based on your auth setup
    };
    
    // If user is store owner, set store (adjust based on your auth)
    if (req.user?.role === 'store_owner' && req.user?.store) {
      flashDealData.store = req.user.store;
    }
    
    const flashDeal = new FlashDeal(flashDealData);
    await flashDeal.save();
    
    res.status(201).json({
      success: true,
      message: 'Flash deal created successfully',
      data: flashDeal
    });
  } catch (error) {
    console.error('Error creating flash deal:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating flash deal',
      error: error.message
    });
  }
});

// PUT /api/flash-deals/:id - Update flash deal
router.put('/:id', flashDealUpdateValidationRules(), handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    
    const flashDeal = await FlashDeal.findById(id);
    
    if (!flashDeal) {
      return res.status(404).json({
        success: false,
        message: 'Flash deal not found'
      });
    }
    
    // Check permissions (adjust based on your auth)
    if (req.user?.role !== 'admin' && 
        flashDeal.createdBy.toString() !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this flash deal'
      });
    }
    
    Object.assign(flashDeal, req.body);
    await flashDeal.save();
    
    res.json({
      success: true,
      message: 'Flash deal updated successfully',
      data: flashDeal
    });
  } catch (error) {
    console.error('Error updating flash deal:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating flash deal',
      error: error.message
    });
  }
});

// DELETE /api/flash-deals/:id - Delete flash deal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const flashDeal = await FlashDeal.findById(id);
    
    if (!flashDeal) {
      return res.status(404).json({
        success: false,
        message: 'Flash deal not found'
      });
    }
    
    // Check permissions (adjust based on your auth)
    if (req.user?.role !== 'admin' && 
        flashDeal.createdBy.toString() !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this flash deal'
      });
    }
    
    await FlashDeal.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Flash deal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting flash deal:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting flash deal',
      error: error.message
    });
  }
});

// POST /api/flash-deals/:id/click - Track click on flash deal banner
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;
    
    const flashDeal = await FlashDeal.findById(id);
    
    if (!flashDeal) {
      return res.status(404).json({
        success: false,
        message: 'Flash deal not found'
      });
    }
    
    await flashDeal.incrementClicks();
    
    res.json({
      success: true,
      message: 'Click tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking click',
      error: error.message
    });
  }
});

// GET /api/flash-deals/:id/analytics - Get flash deal analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    
    const flashDeal = await FlashDeal.findById(id);
    
    if (!flashDeal) {
      return res.status(404).json({
        success: false,
        message: 'Flash deal not found'
      });
    }
    
    const analytics = {
      views: flashDeal.viewCount,
      clicks: flashDeal.clickCount,
      clickThroughRate: flashDeal.viewCount > 0 ? 
        ((flashDeal.clickCount / flashDeal.viewCount) * 100).toFixed(2) : 0,
      status: flashDeal.saleStatus,
      isActive: flashDeal.isCurrentlyActive,
      timeRemaining: flashDeal.timeRemaining
    };
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
});

export default router;