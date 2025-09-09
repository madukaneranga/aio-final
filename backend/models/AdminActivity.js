import mongoose from "mongoose";

const adminActivitySchema = new mongoose.Schema({
  // Admin who performed the action
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  // Action details
  action: {
    type: String,
    required: true,
    enum: [
      // User Management
      "USER_CREATED", "USER_UPDATED", "USER_DELETED", "USER_BANNED", "USER_UNBANNED",
      "USER_ROLE_CHANGED", "USER_PASSWORD_RESET", "USER_VERIFICATION_STATUS_CHANGED",
      
      // Store Management  
      "STORE_APPROVED", "STORE_REJECTED", "STORE_SUSPENDED", "STORE_REACTIVATED",
      "STORE_DELETED", "STORE_UPDATED", "STORE_SUBSCRIPTION_CHANGED",
      
      // Order Management
      "ORDER_STATUS_CHANGED", "ORDER_CANCELLED", "ORDER_REFUNDED", "ORDER_UPDATED",
      
      // Product Management
      "PRODUCT_APPROVED", "PRODUCT_REJECTED", "PRODUCT_DELETED", "PRODUCT_FEATURED",
      "PRODUCT_UNFEATURED", "CATEGORY_CREATED", "CATEGORY_UPDATED", "CATEGORY_DELETED",
      
      // Financial Management
      "WITHDRAWAL_APPROVED", "WITHDRAWAL_REJECTED", "WITHDRAWAL_PROCESSED",
      "COMMISSION_RATE_CHANGED", "PAYMENT_SETTINGS_UPDATED",
      
      // Subscription Management
      "SUBSCRIPTION_CREATED", "SUBSCRIPTION_CANCELLED", "SUBSCRIPTION_EXTENDED",
      "PACKAGE_CREATED", "PACKAGE_UPDATED", "PACKAGE_DELETED",
      
      // Flash Deal Management
      "FLASH_DEAL_CREATED", "FLASH_DEAL_UPDATED", "FLASH_DEAL_DELETED",
      "FLASH_DEAL_ACTIVATED", "FLASH_DEAL_DEACTIVATED", "FLASH_DEAL_PUBLISHED",
      
      // System Management
      "SYSTEM_SETTINGS_UPDATED", "NOTIFICATION_SENT", "BULK_EMAIL_SENT",
      "MAINTENANCE_MODE_ENABLED", "MAINTENANCE_MODE_DISABLED",
      
      // Security Actions
      "LOGIN", "LOGOUT", "FAILED_LOGIN", "PASSWORD_CHANGED", "ADMIN_CREATED",
      "ADMIN_PERMISSIONS_CHANGED", "SECURITY_SETTINGS_UPDATED",
      
      // Reports and Analytics
      "REPORT_GENERATED", "DATA_EXPORTED", "ANALYTICS_VIEWED",
      
      // Content Management
      "POST_MODERATED", "COMMENT_DELETED", "REVIEW_DELETED", "CONTENT_FLAGGED"
    ]
  },
  
  // Target resource information
  targetType: {
    type: String,
    enum: [
      "User", "Store", "Product", "Order", "Subscription", "Package", 
      "FlashDeal", "Category", "Post", "Review", "WalletTransaction", 
      "Notification", "System", "Admin"
    ]
  },
  
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  
  // Detailed description of the action
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Changes made (for update actions)
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Previous state (for rollback purposes)
  previousState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Request metadata
  metadata: {
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    endpoint: {
      type: String,
      required: true
    },
    method: {
      type: String,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      required: true
    },
    requestId: {
      type: String,
      index: true
    },
    sessionId: String,
    
    // Performance metrics
    executionTime: Number, // in milliseconds
    
    // Additional context
    browserInfo: String,
    deviceType: String,
    location: String
  },
  
  // Severity level for monitoring
  severity: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    default: "MEDIUM"
  },
  
  // Success status
  status: {
    type: String,
    enum: ["SUCCESS", "FAILED", "PARTIAL"],
    default: "SUCCESS"
  },
  
  // Error details if action failed
  errorDetails: {
    message: String,
    code: String,
    stack: String
  },
  
  // Tags for categorization and filtering
  tags: [{
    type: String,
    trim: true
  }],
  
  // Flag for sensitive actions requiring audit
  requiresAudit: {
    type: Boolean,
    default: false
  },
  
  // Auto-deletion settings (for GDPR compliance)
  retentionPeriod: {
    type: Number,
    default: 2555200000 // 30 days in milliseconds
  },
  
  // Soft delete flag
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
adminActivitySchema.index({ adminId: 1, createdAt: -1 });
adminActivitySchema.index({ action: 1, createdAt: -1 });
adminActivitySchema.index({ targetType: 1, targetId: 1 });
adminActivitySchema.index({ severity: 1, status: 1 });
adminActivitySchema.index({ "metadata.ipAddress": 1 });
adminActivitySchema.index({ "metadata.requestId": 1 });
adminActivitySchema.index({ createdAt: -1 }); // For recent activities
adminActivitySchema.index({ tags: 1 });

// TTL index for automatic deletion based on retention period
adminActivitySchema.index({ 
  createdAt: 1 
}, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { 
    retentionPeriod: { $exists: true, $ne: null } 
  }
});

// Virtual for age calculation
adminActivitySchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for formatted timestamp
adminActivitySchema.virtual('formattedTimestamp').get(function() {
  return this.createdAt.toISOString();
});

// Static method to log admin activity
adminActivitySchema.statics.logActivity = async function(activityData) {
  try {
    // Set severity based on action type
    const criticalActions = [
      "USER_DELETED", "STORE_DELETED", "ADMIN_CREATED", "SYSTEM_SETTINGS_UPDATED",
      "MAINTENANCE_MODE_ENABLED", "SECURITY_SETTINGS_UPDATED"
    ];
    
    const highSeverityActions = [
      "USER_BANNED", "STORE_SUSPENDED", "WITHDRAWAL_PROCESSED", 
      "ADMIN_PERMISSIONS_CHANGED", "BULK_EMAIL_SENT"
    ];
    
    if (!activityData.severity) {
      if (criticalActions.includes(activityData.action)) {
        activityData.severity = "CRITICAL";
      } else if (highSeverityActions.includes(activityData.action)) {
        activityData.severity = "HIGH";
      }
    }
    
    // Set audit requirement for sensitive actions
    const auditRequiredActions = [
      ...criticalActions, 
      ...highSeverityActions,
      "USER_ROLE_CHANGED", "COMMISSION_RATE_CHANGED", "PAYMENT_SETTINGS_UPDATED"
    ];
    
    if (auditRequiredActions.includes(activityData.action)) {
      activityData.requiresAudit = true;
    }
    
    // Add automatic tags based on action
    if (!activityData.tags) {
      activityData.tags = [];
    }
    
    if (activityData.action.startsWith("USER_")) {
      activityData.tags.push("user-management");
    } else if (activityData.action.startsWith("STORE_")) {
      activityData.tags.push("store-management");
    } else if (activityData.action.includes("FINANCIAL") || activityData.action.includes("WITHDRAWAL")) {
      activityData.tags.push("financial");
    } else if (activityData.action.includes("SYSTEM")) {
      activityData.tags.push("system");
    } else if (activityData.action.includes("SECURITY")) {
      activityData.tags.push("security");
    }
    
    const activity = new this(activityData);
    await activity.save();
    
    return activity;
  } catch (error) {
    console.error("Failed to log admin activity:", error);
    throw error;
  }
};

// Static method to get activity summary
adminActivitySchema.statics.getActivitySummary = async function(filters = {}) {
  const pipeline = [
    { $match: { isDeleted: false, ...filters } },
    {
      $group: {
        _id: {
          action: "$action",
          severity: "$severity"
        },
        count: { $sum: 1 },
        lastActivity: { $max: "$createdAt" }
      }
    },
    {
      $group: {
        _id: "$_id.severity",
        actions: {
          $push: {
            action: "$_id.action",
            count: "$count",
            lastActivity: "$lastActivity"
          }
        },
        totalCount: { $sum: "$count" }
      }
    },
    { $sort: { _id: 1 } }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get recent activities
adminActivitySchema.statics.getRecentActivities = function(limit = 50, adminId = null) {
  const query = { isDeleted: false };
  if (adminId) {
    query.adminId = adminId;
  }
  
  return this.find(query)
    .populate('adminId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method for security monitoring
adminActivitySchema.statics.getSecurityAlerts = function(hours = 24) {
  const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
  
  return this.find({
    createdAt: { $gte: since },
    $or: [
      { severity: "CRITICAL" },
      { severity: "HIGH", status: "FAILED" },
      { action: "FAILED_LOGIN" },
      { "metadata.ipAddress": { $exists: true } }
    ],
    isDeleted: false
  }).populate('adminId', 'name email').sort({ createdAt: -1 });
};

// Pre-save middleware to set expiration
adminActivitySchema.pre('save', function(next) {
  if (this.isNew && this.retentionPeriod) {
    // Set TTL expiration date
    this.expiresAt = new Date(Date.now() + this.retentionPeriod);
  }
  next();
});

// Method to anonymize activity (for GDPR)
adminActivitySchema.methods.anonymize = function() {
  this.metadata.ipAddress = "anonymized";
  this.metadata.userAgent = "anonymized";
  this.metadata.browserInfo = "anonymized";
  this.metadata.location = "anonymized";
  this.description = this.description.replace(/\b[\w\.-]+@[\w\.-]+\.\w+\b/g, "[email]");
  return this.save();
};

// Method to check if activity is expired
adminActivitySchema.methods.isExpired = function() {
  if (!this.retentionPeriod) return false;
  return Date.now() - this.createdAt.getTime() > this.retentionPeriod;
};

const AdminActivity = mongoose.model("AdminActivity", adminActivitySchema);

export default AdminActivity;