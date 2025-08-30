import express from "express";
import Impression from "../models/Impression.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import Store from "../models/Store.js";

const router = express.Router();

// Helper function to get client IP
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         'unknown';
};

// Helper function to determine device type from user agent
const getDeviceType = (userAgent) => {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};

// POST /api/impressions/product - Track product impression
router.post("/product", async (req, res) => {
  try {
    const {
      sessionId,
      productId,
      userId = null,
      source = 'home',
      viewportSize = {}
    } = req.body;

    if (!sessionId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Session ID and Product ID are required"
      });
    }

    // Get product details
    const product = await Product.findById(productId).populate('storeId', 'name');
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Prepare impression data
    const impressionData = {
      userId: userId || null,
      sessionId,
      itemType: 'product',
      itemId: productId,
      metadata: {
        itemName: product.title,
        storeId: product.storeId._id,
        storeName: product.storeId.name,
        categoryName: product.category,
        price: product.price,
        source
      },
      userAgent: req.headers['user-agent'],
      ipAddress: getClientIP(req),
      viewportSize,
      deviceType: getDeviceType(req.headers['user-agent'])
    };

    // Create impression with deduplication
    const result = await Impression.createImpression(impressionData);

    res.json({
      success: true,
      created: result.created,
      reason: result.reason,
      impression: result.impression
    });

  } catch (error) {
    console.error("Error tracking product impression:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track product impression",
      error: error.message
    });
  }
});

// POST /api/impressions/service - Track service impression
router.post("/service", async (req, res) => {
  try {
    const {
      sessionId,
      serviceId,
      userId = null,
      source = 'home',
      viewportSize = {}
    } = req.body;

    if (!sessionId || !serviceId) {
      return res.status(400).json({
        success: false,
        message: "Session ID and Service ID are required"
      });
    }

    // Get service details
    const service = await Service.findById(serviceId).populate('storeId', 'name');
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }

    // Prepare impression data
    const impressionData = {
      userId: userId || null,
      sessionId,
      itemType: 'service',
      itemId: serviceId,
      metadata: {
        itemName: service.title,
        storeId: service.storeId._id,
        storeName: service.storeId.name,
        categoryName: service.category,
        price: service.price,
        source
      },
      userAgent: req.headers['user-agent'],
      ipAddress: getClientIP(req),
      viewportSize,
      deviceType: getDeviceType(req.headers['user-agent'])
    };

    // Create impression with deduplication
    const result = await Impression.createImpression(impressionData);

    res.json({
      success: true,
      created: result.created,
      reason: result.reason,
      impression: result.impression
    });

  } catch (error) {
    console.error("Error tracking service impression:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track service impression",
      error: error.message
    });
  }
});

// POST /api/impressions/store - Track store impression
router.post("/store", async (req, res) => {
  try {
    const {
      sessionId,
      storeId,
      userId = null,
      source = 'home',
      viewportSize = {}
    } = req.body;

    if (!sessionId || !storeId) {
      return res.status(400).json({
        success: false,
        message: "Session ID and Store ID are required"
      });
    }

    // Get store details
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }

    // Prepare impression data
    const impressionData = {
      userId: userId || null,
      sessionId,
      itemType: 'store',
      itemId: storeId,
      metadata: {
        itemName: store.name,
        categoryName: store.category,
        source
      },
      userAgent: req.headers['user-agent'],
      ipAddress: getClientIP(req),
      viewportSize,
      deviceType: getDeviceType(req.headers['user-agent'])
    };

    // Create impression with deduplication
    const result = await Impression.createImpression(impressionData);

    res.json({
      success: true,
      created: result.created,
      reason: result.reason,
      impression: result.impression
    });

  } catch (error) {
    console.error("Error tracking store impression:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track store impression",
      error: error.message
    });
  }
});

// POST /api/impressions/batch - Track multiple impressions at once
router.post("/batch", async (req, res) => {
  try {
    const { impressions = [] } = req.body;

    if (!Array.isArray(impressions) || impressions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Impressions array is required"
      });
    }

    if (impressions.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Maximum 50 impressions per batch"
      });
    }

    const results = [];

    for (const impression of impressions) {
      const { sessionId, itemType, itemId, userId = null, source = 'home', viewportSize = {} } = impression;

      if (!sessionId || !itemType || !itemId) {
        results.push({
          success: false,
          itemType,
          itemId,
          message: "Missing required fields"
        });
        continue;
      }

      try {
        let item = null;
        let itemName = '';
        let storeId = null;
        let storeName = '';
        let categoryName = '';
        let price = null;

        // Get item details based on type
        if (itemType === 'product') {
          item = await Product.findById(itemId).populate('storeId', 'name');
          if (item) {
            itemName = item.title;
            storeId = item.storeId._id;
            storeName = item.storeId.name;
            categoryName = item.category;
            price = item.price;
          }
        } else if (itemType === 'service') {
          item = await Service.findById(itemId).populate('storeId', 'name');
          if (item) {
            itemName = item.title;
            storeId = item.storeId._id;
            storeName = item.storeId.name;
            categoryName = item.category;
            price = item.price;
          }
        } else if (itemType === 'store') {
          item = await Store.findById(itemId);
          if (item) {
            itemName = item.name;
            categoryName = item.category;
          }
        }

        if (!item) {
          results.push({
            success: false,
            itemType,
            itemId,
            message: `${itemType} not found`
          });
          continue;
        }

        // Prepare impression data
        const impressionData = {
          userId: userId || null,
          sessionId,
          itemType,
          itemId,
          metadata: {
            itemName,
            storeId,
            storeName,
            categoryName,
            price,
            source
          },
          userAgent: req.headers['user-agent'],
          ipAddress: getClientIP(req),
          viewportSize,
          deviceType: getDeviceType(req.headers['user-agent'])
        };

        // Create impression with deduplication
        const result = await Impression.createImpression(impressionData);

        results.push({
          success: true,
          itemType,
          itemId,
          created: result.created,
          reason: result.reason
        });

      } catch (error) {
        console.error(`Error processing impression for ${itemType}:${itemId}:`, error);
        results.push({
          success: false,
          itemType,
          itemId,
          message: error.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    res.json({
      success: true,
      processed: results.length,
      successful,
      failed,
      results
    });

  } catch (error) {
    console.error("Error processing batch impressions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process batch impressions",
      error: error.message
    });
  }
});

// GET /api/impressions/analytics/summary - Get impression analytics summary
router.get("/analytics/summary", async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(days));

    const summary = await Impression.aggregate([
      {
        $match: {
          timestamp: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: "$itemType",
          impressions: { $sum: 1 },
          uniqueSessions: { $addToSet: "$sessionId" },
          uniqueUsers: { 
            $addToSet: {
              $cond: [{ $ne: ["$userId", null] }, "$userId", null]
            }
          }
        }
      },
      {
        $addFields: {
          uniqueSessionCount: { $size: "$uniqueSessions" },
          uniqueUserCount: { 
            $size: {
              $filter: {
                input: "$uniqueUsers",
                cond: { $ne: ["$$this", null] }
              }
            }
          }
        }
      },
      {
        $project: {
          itemType: "$_id",
          impressions: 1,
          uniqueSessionCount: 1,
          uniqueUserCount: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      success: true,
      summary,
      period: `${days} days`
    });

  } catch (error) {
    console.error("Error getting impression analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get impression analytics",
      error: error.message
    });
  }
});

export default router;