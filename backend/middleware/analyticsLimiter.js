import { getUserPackage } from "../utils/getUserPackage.js";
import { analyticsCache } from "../utils/analyticsProcessor.js";

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map();
const accessLogStore = new Map();

// Rate limiting configurations by analytics level
const RATE_LIMITS = {
  1: {
    requests: 10,      // requests per window
    windowMs: 60000,   // 1 minute
    exports: 2,        // exports per day
    exportWindowMs: 24 * 60 * 60 * 1000 // 24 hours
  },
  2: {
    requests: 50,      // requests per window
    windowMs: 60000,   // 1 minute
    exports: 10,       // exports per day
    exportWindowMs: 24 * 60 * 60 * 1000 // 24 hours
  },
  3: {
    requests: 200,     // requests per window
    windowMs: 60000,   // 1 minute
    exports: 50,       // exports per day
    exportWindowMs: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  
  // Clean rate limit store
  for (const [key, data] of rateLimitStore) {
    if (now - data.windowStart > Math.max(...Object.values(RATE_LIMITS).map(r => r.windowMs))) {
      rateLimitStore.delete(key);
    }
  }
  
  // Clean access log store (keep logs for 7 days)
  for (const [key, logs] of accessLogStore) {
    const validLogs = logs.filter(log => now - log.timestamp < 7 * 24 * 60 * 60 * 1000);
    if (validLogs.length === 0) {
      accessLogStore.delete(key);
    } else {
      accessLogStore.set(key, validLogs);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

/**
 * Enhanced Analytics Rate Limiter Middleware
 * Provides different rate limits based on user's analytics package level
 */
export const analyticsRateLimiter = (options = {}) => {
  const { 
    type = 'general',  // 'general', 'export', 'event-tracking'
    skipSuccessfulHits = false,
    message = "Rate limit exceeded"
  } = options;

  return async (req, res, next) => {
    try {
      const userId = req.user?._id?.toString();
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const key = `${type}_${userId || ip}`;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required for analytics access",
          code: 'AUTH_REQUIRED'
        });
      }

      // Get user's analytics package
      let packageDetails;
      try {
        packageDetails = await getUserPackage(req.user._id);
      } catch (error) {
        console.warn('Failed to get package details, using basic limits');
        packageDetails = { analyticsLevel: 1, name: 'basic' };
      }

      const analyticsLevel = packageDetails.analyticsLevel || 1;
      const limits = RATE_LIMITS[analyticsLevel] || RATE_LIMITS[1];
      
      // Configure limits based on request type
      let requestLimit, windowMs;
      switch (type) {
        case 'export':
          requestLimit = limits.exports;
          windowMs = limits.exportWindowMs;
          break;
        case 'event-tracking':
          requestLimit = limits.requests * 5; // More lenient for event tracking
          windowMs = limits.windowMs;
          break;
        default:
          requestLimit = limits.requests;
          windowMs = limits.windowMs;
      }

      const now = Date.now();
      const windowStart = now - windowMs;

      // Get or create rate limit data
      let rateLimitData = rateLimitStore.get(key) || {
        requests: [],
        windowStart: now,
        packageLevel: analyticsLevel
      };

      // Clean old requests outside the window
      rateLimitData.requests = rateLimitData.requests.filter(
        timestamp => timestamp > windowStart
      );

      // Check if limit exceeded
      if (rateLimitData.requests.length >= requestLimit) {
        const resetTime = Math.ceil((rateLimitData.requests[0] + windowMs) / 1000);
        
        // Log rate limit violation
        logAccessAttempt(userId, ip, req.path, 'RATE_LIMITED', {
          packageLevel: analyticsLevel,
          currentRequests: rateLimitData.requests.length,
          limit: requestLimit,
          windowMs
        });

        return res.status(429).json({
          success: false,
          error: message,
          code: 'RATE_LIMIT_EXCEEDED',
          rateLimit: {
            limit: requestLimit,
            remaining: 0,
            resetTime,
            windowMs,
            packageLevel: analyticsLevel,
            packageName: packageDetails.name,
            upgradeMessage: analyticsLevel < 3 ? 
              "Upgrade your package for higher rate limits" : undefined
          }
        });
      }

      // Add current request
      rateLimitData.requests.push(now);
      rateLimitData.packageLevel = analyticsLevel;
      rateLimitStore.set(key, rateLimitData);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': requestLimit,
        'X-RateLimit-Remaining': Math.max(0, requestLimit - rateLimitData.requests.length),
        'X-RateLimit-Reset': Math.ceil((now + windowMs) / 1000),
        'X-RateLimit-Package-Level': analyticsLevel,
        'X-RateLimit-Package-Name': packageDetails.name
      });

      // Log successful access
      if (!skipSuccessfulHits) {
        logAccessAttempt(userId, ip, req.path, 'SUCCESS', {
          packageLevel: analyticsLevel,
          remaining: requestLimit - rateLimitData.requests.length
        });
      }

      next();
    } catch (error) {
      console.error('Analytics rate limiter error:', error);
      // Don't block on middleware errors, but log them
      next();
    }
  };
};

/**
 * Enhanced Access Control Middleware for Analytics
 * Ensures proper authorization based on user roles and store ownership
 */
export const analyticsAccessControl = (options = {}) => {
  const { 
    requireLevel = 1,
    allowAdmins = true,
    requireStoreOwnership = true 
  } = options;

  return async (req, res, next) => {
    try {
      const { storeId } = req.params;
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: 'AUTH_REQUIRED'
        });
      }

      // Get user's analytics package
      let packageDetails;
      try {
        packageDetails = await getUserPackage(user._id);
      } catch (error) {
        console.warn('Package lookup failed:', error);
        return res.status(500).json({
          success: false,
          error: "Unable to verify analytics access level",
          code: 'PACKAGE_LOOKUP_FAILED'
        });
      }

      // Check analytics level requirement
      if (packageDetails.analyticsLevel < requireLevel) {
        logAccessAttempt(user._id.toString(), req.ip, req.path, 'INSUFFICIENT_LEVEL', {
          requiredLevel: requireLevel,
          currentLevel: packageDetails.analyticsLevel,
          packageName: packageDetails.name
        });

        return res.status(403).json({
          success: false,
          error: `Analytics level ${requireLevel} required. Current level: ${packageDetails.analyticsLevel}`,
          code: 'INSUFFICIENT_ANALYTICS_LEVEL',
          upgrade: {
            required: true,
            currentLevel: packageDetails.analyticsLevel,
            currentPackage: packageDetails.name,
            requiredLevel: requireLevel,
            availablePackages: getAvailableUpgrades(packageDetails.analyticsLevel)
          }
        });
      }

      // Admin access control
      if (user.role === 'admin' && allowAdmins) {
        return next(); // Admins can access any store's analytics
      }

      // Store ownership validation
      if (requireStoreOwnership && storeId) {
        const userStoreId = user.storeId?.toString();
        const requestedStoreId = storeId.toString();

        if (user.role !== 'store_owner' || userStoreId !== requestedStoreId) {
          logAccessAttempt(user._id.toString(), req.ip, req.path, 'ACCESS_DENIED', {
            reason: 'store_ownership',
            userRole: user.role,
            userStoreId,
            requestedStoreId
          });

          return res.status(403).json({
            success: false,
            error: "Access denied. You can only view analytics for your own store.",
            code: 'STORE_ACCESS_DENIED'
          });
        }
      }

      // Success - add package info to request for downstream use
      req.analyticsPackage = packageDetails;
      next();

    } catch (error) {
      console.error('Analytics access control error:', error);
      res.status(500).json({
        success: false,
        error: "Access control check failed",
        code: 'ACCESS_CONTROL_ERROR'
      });
    }
  };
};

/**
 * Middleware to check for suspicious access patterns
 */
export const analyticsSecurityMonitor = () => {
  return (req, res, next) => {
    const userId = req.user?._id?.toString();
    const ip = req.ip || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    const now = Date.now();

    // Check for suspicious patterns
    const suspiciousPatterns = detectSuspiciousPatterns(userId, ip, req.path, userAgent);
    
    if (suspiciousPatterns.length > 0) {
      console.warn('🚨 Suspicious analytics access detected:', {
        userId,
        ip,
        userAgent,
        path: req.path,
        patterns: suspiciousPatterns,
        timestamp: new Date().toISOString()
      });

      logAccessAttempt(userId, ip, req.path, 'SUSPICIOUS', {
        patterns: suspiciousPatterns,
        userAgent
      });

      // For high-risk patterns, block the request
      if (suspiciousPatterns.some(p => p.severity === 'high')) {
        return res.status(429).json({
          success: false,
          error: "Request blocked due to suspicious activity",
          code: 'SECURITY_BLOCK'
        });
      }
    }

    next();
  };
};

// Helper functions
const logAccessAttempt = (userId, ip, path, status, metadata = {}) => {
  const key = userId || ip;
  const logs = accessLogStore.get(key) || [];
  
  logs.push({
    timestamp: Date.now(),
    userId,
    ip,
    path,
    status,
    metadata,
    userAgent: metadata.userAgent || 'unknown'
  });

  // Keep only recent logs (last 1000 entries)
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000);
  }

  accessLogStore.set(key, logs);
};

const detectSuspiciousPatterns = (userId, ip, path, userAgent) => {
  const patterns = [];
  const now = Date.now();
  const recentWindow = 5 * 60 * 1000; // 5 minutes

  const key = userId || ip;
  const logs = accessLogStore.get(key) || [];
  const recentLogs = logs.filter(log => now - log.timestamp < recentWindow);

  // Pattern 1: Too many requests in short time
  if (recentLogs.length > 100) {
    patterns.push({
      type: 'high_frequency',
      severity: 'high',
      description: 'Unusually high request frequency',
      count: recentLogs.length
    });
  }

  // Pattern 2: Rapid store switching (potential data scraping)
  const uniqueStores = new Set(
    recentLogs
      .map(log => log.path.match(/\/analytics\/([^\/]+)/)?.[1])
      .filter(Boolean)
  );
  
  if (uniqueStores.size > 20) {
    patterns.push({
      type: 'store_enumeration',
      severity: 'high',
      description: 'Accessing multiple stores rapidly',
      storeCount: uniqueStores.size
    });
  }

  // Pattern 3: Bot-like user agent
  if (userAgent.toLowerCase().includes('bot') || 
      userAgent.toLowerCase().includes('crawler') ||
      userAgent.toLowerCase().includes('spider')) {
    patterns.push({
      type: 'bot_access',
      severity: 'medium',
      description: 'Bot-like user agent detected',
      userAgent
    });
  }

  // Pattern 4: Too many failed access attempts
  const failedAttempts = recentLogs.filter(log => 
    ['RATE_LIMITED', 'ACCESS_DENIED', 'INSUFFICIENT_LEVEL'].includes(log.status)
  );
  
  if (failedAttempts.length > 10) {
    patterns.push({
      type: 'repeated_failures',
      severity: 'medium',
      description: 'Multiple failed access attempts',
      failureCount: failedAttempts.length
    });
  }

  return patterns;
};

const getAvailableUpgrades = (currentLevel) => {
  const packages = [
    { level: 1, name: 'Basic', features: ['Basic analytics', 'Limited exports'] },
    { level: 2, name: 'Standard', features: ['Advanced analytics', 'Unlimited exports', 'Trend analysis'] },
    { level: 3, name: 'Premium', features: ['Everything in Standard', 'AI insights', 'Global benchmarks', 'Custom reports'] }
  ];

  return packages.filter(pkg => pkg.level > currentLevel);
};

// Export analytics access logs for admin review
export const getAnalyticsAccessLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, timeframe = 24 } = req.query;
    const now = Date.now();
    const timeframeMs = timeframe * 60 * 60 * 1000; // hours to milliseconds

    let allLogs = [];

    if (userId) {
      const userLogs = accessLogStore.get(userId) || [];
      allLogs = userLogs.filter(log => now - log.timestamp < timeframeMs);
    } else {
      // Get all logs within timeframe
      for (const [key, logs] of accessLogStore) {
        const recentLogs = logs.filter(log => now - log.timestamp < timeframeMs);
        allLogs.push(...recentLogs);
      }
    }

    // Sort by timestamp (most recent first)
    allLogs.sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      data: {
        logs: allLogs.slice(0, 1000), // Limit to 1000 most recent
        summary: {
          total: allLogs.length,
          byStatus: allLogs.reduce((acc, log) => {
            acc[log.status] = (acc[log.status] || 0) + 1;
            return acc;
          }, {}),
          timeframe: `${timeframe} hours`
        }
      }
    });
  } catch (error) {
    console.error('Analytics access logs error:', error);
    res.status(500).json({ error: 'Failed to fetch access logs' });
  }
};

export default {
  analyticsRateLimiter,
  analyticsAccessControl,
  analyticsSecurityMonitor,
  getAnalyticsAccessLogs
};