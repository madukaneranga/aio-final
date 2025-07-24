import { Router } from 'express';
const router = Router();
import WalletTransaction from '../models/WalletTransaction.js';
import BankDetails from '../models/BankDetails.js';
import Store from '../models/Store.js';

// Custom validation for admin actions
const validateAdminAction = (data) => {
  const errors = [];
  
  if (!data.action || !['approve', 'reject'].includes(data.action)) {
    errors.push('Action must be either approve or reject');
  }
  
  if (data.adminNotes && (typeof data.adminNotes !== 'string' || data.adminNotes.length > 500)) {
    errors.push('Admin notes must be a string with maximum 500 characters');
  }
  
  return errors;
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin required.'
    });
  }
  next();
};

// Get all pending withdrawal requests
router.get('/withdrawals/pending', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const withdrawals = await find({
      type: 'withdrawal',
      status: 'pending'
    })
    .populate('storeId', 'name email')
    .populate('withdrawalDetails.bankAccountId')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await WalletTransaction.countDocuments({
      type: 'withdrawal',
      status: 'pending'
    });

    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get pending withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending withdrawals'
    });
  }
});

// Get all withdrawal requests (for admin dashboard)
router.get('/withdrawals', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, storeId } = req.query;

    const query = { type: 'withdrawal' };
    if (status) query.status = status;
    if (storeId) query.storeId = storeId;

    const withdrawals = await find(query)
      .populate('storeId', 'name email')
      .populate('withdrawalDetails.bankAccountId')
      .populate('withdrawalDetails.processedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await WalletTransaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get all withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawals'
    });
  }
});

// Process withdrawal request (approve/reject)
router.put('/withdrawals/:id/process', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const validationErrors = validateAdminAction(req.body);
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors[0]
      });
    }

    const { action, adminNotes } = req.body;

    const withdrawal = await findOne({
      _id: id,
      type: 'withdrawal',
      status: 'pending'
    }).populate('userId');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found or already processed'
      });
    }

    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      'withdrawalDetails.processedAt': new Date(),
      'withdrawalDetails.processedBy': req.user.id,
      'withdrawalDetails.adminNotes': adminNotes
    };

    await findByIdAndUpdate(id, updateData);

    // Emit real-time notification to store owner
    req.io.emit(`wallet-update-${withdrawal.userId._id}`, {
      type: 'withdrawal_processed',
      action,
      transaction: withdrawal,
      adminNotes
    });

    // Create audit log
    console.log(`Admin ${req.user.id} ${action}ed withdrawal ${id} for store ${withdrawal.userId._id}`);

    res.json({
      success: true,
      message: `Withdrawal request ${action}ed successfully`
    });

  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal request'
    });
  }
});

// Get wallet analytics for admin dashboard
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const analytics = await aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            type: '$type',
            status: '$status'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const summary = {
      totalSales: 0,
      totalWithdrawals: 0,
      pendingWithdrawals: 0,
      rejectedWithdrawals: 0,
      approvedWithdrawals: 0
    };

    analytics.forEach(item => {
      if (item._id.type === 'sale') {
        summary.totalSales += item.totalAmount;
      } else if (item._id.type === 'withdrawal') {
        summary.totalWithdrawals += item.totalAmount;
        
        if (item._id.status === 'pending') {
          summary.pendingWithdrawals += item.totalAmount;
        } else if (item._id.status === 'rejected') {
          summary.rejectedWithdrawals += item.totalAmount;
        } else if (item._id.status === 'approved') {
          summary.approvedWithdrawals += item.totalAmount;
        }
      }
    });

    res.json({
      success: true,
      data: {
        summary,
        analytics
      }
    });

  } catch (error) {
    console.error('Get wallet analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet analytics'
    });
  }
});

export default router;