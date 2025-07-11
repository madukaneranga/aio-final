import express from 'express';
import PlatformSettings from '../models/PlatformSettings.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  if (req.user.email !== 'admin@aio.com') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get current platform settings
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne().populate('lastUpdatedBy', 'name email');
    
    // Create default settings if none exist
    if (!settings) {
      settings = new PlatformSettings({
        paymentSettings: {
          supportedMethods: [
            {
              id: 'bank_transfer',
              name: 'Bank Transfer',
              description: 'Direct bank transfer to merchant account',
              enabled: true,
              processingFee: 0.02
            },
            {
              id: 'mobile_payment',
              name: 'Mobile Payment',
              description: 'Pay using mobile wallet (Dialog eZ Cash, Mobitel mCash)',
              enabled: true,
              processingFee: 0.03
            },
            {
              id: 'cash_on_delivery',
              name: 'Cash on Delivery',
              description: 'Pay when you receive your order',
              enabled: true,
              processingFee: 0.01
            },
            {
              id: 'card_payment',
              name: 'Debit/Credit Card',
              description: 'Local bank cards accepted',
              enabled: true,
              processingFee: 0.035
            }
          ]
        }
      });
      await settings.save();
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update platform settings
router.put('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    updates.lastUpdatedBy = req.user._id;
    updates.version = (updates.version || 1) + 1;

    let settings = await PlatformSettings.findOne();
    
    if (!settings) {
      settings = new PlatformSettings(updates);
    } else {
      Object.assign(settings, updates);
    }

    await settings.save();
    
    const populatedSettings = await PlatformSettings.findById(settings._id)
      .populate('lastUpdatedBy', 'name email');

    res.json(populatedSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific setting category
router.get('/:category', authenticate, requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const settings = await PlatformSettings.findOne();
    
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    const validCategories = ['commissionRates', 'subscriptionSettings', 'paymentSettings', 'platformConfig', 'features'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    res.json(settings[category]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update specific setting category
router.put('/:category', authenticate, requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const updates = req.body;

    const validCategories = ['commissionRates', 'subscriptionSettings', 'paymentSettings', 'platformConfig', 'features'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    let settings = await PlatformSettings.findOne();
    
    if (!settings) {
      settings = new PlatformSettings();
    }

    settings[category] = { ...settings[category], ...updates };
    settings.lastUpdatedBy = req.user._id;
    settings.version = (settings.version || 1) + 1;

    await settings.save();

    res.json(settings[category]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset settings to default
router.post('/reset', authenticate, requireAdmin, async (req, res) => {
  try {
    await PlatformSettings.deleteMany({});
    
    const defaultSettings = new PlatformSettings({
      lastUpdatedBy: req.user._id,
      paymentSettings: {
        supportedMethods: [
          {
            id: 'bank_transfer',
            name: 'Bank Transfer',
            description: 'Direct bank transfer to merchant account',
            enabled: true,
            processingFee: 0.02
          },
          {
            id: 'mobile_payment',
            name: 'Mobile Payment',
            description: 'Pay using mobile wallet (Dialog eZ Cash, Mobitel mCash)',
            enabled: true,
            processingFee: 0.03
          },
          {
            id: 'cash_on_delivery',
            name: 'Cash on Delivery',
            description: 'Pay when you receive your order',
            enabled: true,
            processingFee: 0.01
          },
          {
            id: 'card_payment',
            name: 'Debit/Credit Card',
            description: 'Local bank cards accepted',
            enabled: true,
            processingFee: 0.035
          }
        ]
      }
    });

    await defaultSettings.save();
    
    const populatedSettings = await PlatformSettings.findById(defaultSettings._id)
      .populate('lastUpdatedBy', 'name email');

    res.json(populatedSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get settings history/audit log
router.get('/history/audit', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = await PlatformSettings.find()
      .populate('lastUpdatedBy', 'name email')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;