import express from 'express';
import Commission from '../models/Commission.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Admin: Get all commissions
router.get('/admin/all', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.email !== 'admin@aio.com') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const commissions = await Commission.find()
      .populate('storeId', 'name type')
      .populate('orderId', 'totalAmount')
      .populate('bookingId', 'totalAmount')
      .sort({ createdAt: -1 });

    res.json(commissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get commission stats
router.get('/admin/stats', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.email !== 'admin@aio.com') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = await Commission.aggregate([
      {
        $group: {
          _id: null,
          totalCommissions: { $sum: '$commissionAmount' },
          totalTransactions: { $sum: 1 },
          avgCommission: { $avg: '$commissionAmount' }
        }
      }
    ]);

    const monthlyStats = await Commission.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          monthlyCommissions: { $sum: '$commissionAmount' },
          monthlyTransactions: { $sum: 1 }
        }
      }
    ]);

    res.json({
      overall: stats[0] || { totalCommissions: 0, totalTransactions: 0, avgCommission: 0 },
      monthly: monthlyStats[0] || { monthlyCommissions: 0, monthlyTransactions: 0 }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;