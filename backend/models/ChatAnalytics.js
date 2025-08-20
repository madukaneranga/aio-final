import mongoose from "mongoose";

const chatAnalyticsSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  storeOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  period: {
    type: String,
    enum: ["daily", "weekly", "monthly", "yearly"],
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  metrics: {
    // Chat Volume
    totalChats: {
      type: Number,
      default: 0,
    },
    newChats: {
      type: Number,
      default: 0,
    },
    activeChats: {
      type: Number,
      default: 0,
    },
    
    // Message Volume
    totalMessages: {
      type: Number,
      default: 0,
    },
    messagesSent: {
      type: Number,
      default: 0,
    },
    messagesReceived: {
      type: Number,
      default: 0,
    },
    
    // Response Times
    averageResponseTime: {
      type: Number,
      default: 0, // in minutes
    },
    fastestResponseTime: {
      type: Number,
      default: 0,
    },
    slowestResponseTime: {
      type: Number,
      default: 0,
    },
    
    // Customer Satisfaction
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    ratingDistribution: {
      oneStar: { type: Number, default: 0 },
      twoStar: { type: Number, default: 0 },
      threeStar: { type: Number, default: 0 },
      fourStar: { type: Number, default: 0 },
      fiveStar: { type: Number, default: 0 },
    },
    
    // Engagement
    averageMessagesPerChat: {
      type: Number,
      default: 0,
    },
    averageChatDuration: {
      type: Number,
      default: 0, // in minutes
    },
    
    // Content Analysis
    filesSent: {
      type: Number,
      default: 0,
    },
    filesReceived: {
      type: Number,
      default: 0,
    },
    receiptsSent: {
      type: Number,
      default: 0,
    },
    
    // Product Inquiries
    productInquiries: {
      type: Number,
      default: 0,
    },
    topInquiredProducts: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      productName: String,
      inquiryCount: {
        type: Number,
        default: 0,
      },
    }],
    
    // Moderation
    blockedMessages: {
      type: Number,
      default: 0,
    },
    moderationFlags: {
      phoneNumbers: { type: Number, default: 0 },
      emailAddresses: { type: Number, default: 0 },
      socialMedia: { type: Number, default: 0 },
      externalLinks: { type: Number, default: 0 },
      personalInfo: { type: Number, default: 0 },
      paymentInfo: { type: Number, default: 0 },
    },
    
    // Peak Hours
    peakHours: [{
      hour: {
        type: Number,
        min: 0,
        max: 23,
      },
      messageCount: {
        type: Number,
        default: 0,
      },
    }],
    
    // Customer Retention
    returningCustomers: {
      type: Number,
      default: 0,
    },
    newCustomers: {
      type: Number,
      default: 0,
    },
    
    // Conversion Tracking
    chatsLeadingToOrders: {
      type: Number,
      default: 0,
    },
    conversionRate: {
      type: Number,
      default: 0, // percentage
    },
    revenueFromChats: {
      type: Number,
      default: 0,
    },
  },
  
  // Hourly breakdown for daily analytics
  hourlyBreakdown: [{
    hour: {
      type: Number,
      min: 0,
      max: 23,
    },
    chats: { type: Number, default: 0 },
    messages: { type: Number, default: 0 },
    newCustomers: { type: Number, default: 0 },
  }],
  
  // Most active customers
  topCustomers: [{
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customerName: String,
    messageCount: {
      type: Number,
      default: 0,
    },
    chatCount: {
      type: Number,
      default: 0,
    },
    lastActivity: Date,
  }],
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient querying
chatAnalyticsSchema.index({ storeId: 1, period: 1, date: -1 });
chatAnalyticsSchema.index({ storeOwnerId: 1, period: 1, date: -1 });
chatAnalyticsSchema.index({ period: 1, date: -1 });

// Static method to get or create analytics document
chatAnalyticsSchema.statics.getOrCreate = async function(storeId, storeOwnerId, period, date) {
  // Normalize date based on period
  let normalizedDate;
  const dateObj = new Date(date);
  
  switch (period) {
    case "daily":
      normalizedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      break;
    case "weekly":
      // Start of week (Monday)
      const dayOfWeek = dateObj.getDay();
      const diff = dateObj.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      normalizedDate = new Date(dateObj.setDate(diff));
      normalizedDate.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      normalizedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
      break;
    case "yearly":
      normalizedDate = new Date(dateObj.getFullYear(), 0, 1);
      break;
    default:
      normalizedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  }
  
  let analytics = await this.findOne({
    storeId,
    storeOwnerId,
    period,
    date: normalizedDate,
  });
  
  if (!analytics) {
    analytics = new this({
      storeId,
      storeOwnerId,
      period,
      date: normalizedDate,
      // Initialize hourly breakdown for daily analytics
      hourlyBreakdown: period === "daily" ? 
        Array.from({ length: 24 }, (_, i) => ({ hour: i, chats: 0, messages: 0, newCustomers: 0 })) :
        [],
    });
    await analytics.save();
  }
  
  return analytics;
};

// Method to update chat metrics
chatAnalyticsSchema.methods.updateChatMetrics = function(chatData) {
  this.metrics.totalChats += 1;
  
  if (chatData.isNew) {
    this.metrics.newChats += 1;
  }
  
  if (chatData.isActive) {
    this.metrics.activeChats += 1;
  }
  
  // Update hourly breakdown for daily analytics
  if (this.period === "daily") {
    const hour = new Date().getHours();
    const hourlyData = this.hourlyBreakdown.find(h => h.hour === hour);
    if (hourlyData) {
      hourlyData.chats += 1;
      if (chatData.isNew) {
        hourlyData.newCustomers += 1;
      }
    }
  }
  
  this.updatedAt = new Date();
  return this.save();
};

// Method to update message metrics
chatAnalyticsSchema.methods.updateMessageMetrics = function(messageData) {
  this.metrics.totalMessages += 1;
  
  if (messageData.direction === "sent") {
    this.metrics.messagesSent += 1;
  } else {
    this.metrics.messagesReceived += 1;
  }
  
  if (messageData.messageType === "image") {
    if (messageData.direction === "sent") {
      this.metrics.filesSent += 1;
    } else {
      this.metrics.filesReceived += 1;
    }
  }
  
  if (messageData.messageType === "receipt") {
    this.metrics.receiptsSent += 1;
  }
  
  if (messageData.isBlocked) {
    this.metrics.blockedMessages += 1;
    
    // Update moderation flags based on blocked reason
    if (messageData.blockedReason) {
      const reason = messageData.blockedReason.toLowerCase();
      if (reason.includes("phone")) {
        this.metrics.moderationFlags.phoneNumbers += 1;
      } else if (reason.includes("email")) {
        this.metrics.moderationFlags.emailAddresses += 1;
      } else if (reason.includes("social")) {
        this.metrics.moderationFlags.socialMedia += 1;
      } else if (reason.includes("link")) {
        this.metrics.moderationFlags.externalLinks += 1;
      } else if (reason.includes("personal")) {
        this.metrics.moderationFlags.personalInfo += 1;
      } else if (reason.includes("payment")) {
        this.metrics.moderationFlags.paymentInfo += 1;
      }
    }
  }
  
  // Update peak hours
  const hour = new Date().getHours();
  let peakHourData = this.metrics.peakHours.find(p => p.hour === hour);
  if (!peakHourData) {
    peakHourData = { hour, messageCount: 0 };
    this.metrics.peakHours.push(peakHourData);
  }
  peakHourData.messageCount += 1;
  
  // Update hourly breakdown for daily analytics
  if (this.period === "daily") {
    const hourlyData = this.hourlyBreakdown.find(h => h.hour === hour);
    if (hourlyData) {
      hourlyData.messages += 1;
    }
  }
  
  this.updatedAt = new Date();
  return this.save();
};

// Method to update response time metrics
chatAnalyticsSchema.methods.updateResponseTime = function(responseTimeMinutes) {
  const currentAvg = this.metrics.averageResponseTime;
  const messageCount = this.metrics.messagesReceived;
  
  // Calculate new average
  this.metrics.averageResponseTime = 
    (currentAvg * (messageCount - 1) + responseTimeMinutes) / messageCount;
  
  // Update fastest/slowest times
  if (this.metrics.fastestResponseTime === 0 || responseTimeMinutes < this.metrics.fastestResponseTime) {
    this.metrics.fastestResponseTime = responseTimeMinutes;
  }
  
  if (responseTimeMinutes > this.metrics.slowestResponseTime) {
    this.metrics.slowestResponseTime = responseTimeMinutes;
  }
  
  this.updatedAt = new Date();
  return this.save();
};

// Method to update product inquiry metrics
chatAnalyticsSchema.methods.updateProductInquiry = function(productId, productName) {
  this.metrics.productInquiries += 1;
  
  let productData = this.metrics.topInquiredProducts.find(
    p => p.productId && p.productId.toString() === productId.toString()
  );
  
  if (!productData) {
    productData = {
      productId,
      productName,
      inquiryCount: 0,
    };
    this.metrics.topInquiredProducts.push(productData);
  }
  
  productData.inquiryCount += 1;
  
  // Sort and keep only top 10
  this.metrics.topInquiredProducts.sort((a, b) => b.inquiryCount - a.inquiryCount);
  this.metrics.topInquiredProducts = this.metrics.topInquiredProducts.slice(0, 10);
  
  this.updatedAt = new Date();
  return this.save();
};

// Method to add customer rating
chatAnalyticsSchema.methods.addCustomerRating = function(rating) {
  this.metrics.totalRatings += 1;
  
  // Update average rating
  const currentTotal = this.metrics.averageRating * (this.metrics.totalRatings - 1);
  this.metrics.averageRating = (currentTotal + rating) / this.metrics.totalRatings;
  
  // Update rating distribution
  switch (rating) {
    case 1:
      this.metrics.ratingDistribution.oneStar += 1;
      break;
    case 2:
      this.metrics.ratingDistribution.twoStar += 1;
      break;
    case 3:
      this.metrics.ratingDistribution.threeStar += 1;
      break;
    case 4:
      this.metrics.ratingDistribution.fourStar += 1;
      break;
    case 5:
      this.metrics.ratingDistribution.fiveStar += 1;
      break;
  }
  
  this.updatedAt = new Date();
  return this.save();
};

// Method to calculate derived metrics
chatAnalyticsSchema.methods.calculateDerivedMetrics = function() {
  // Average messages per chat
  if (this.metrics.totalChats > 0) {
    this.metrics.averageMessagesPerChat = this.metrics.totalMessages / this.metrics.totalChats;
  }
  
  // Conversion rate
  if (this.metrics.totalChats > 0) {
    this.metrics.conversionRate = (this.metrics.chatsLeadingToOrders / this.metrics.totalChats) * 100;
  }
  
  this.updatedAt = new Date();
  return this.save();
};

export default mongoose.model("ChatAnalytics", chatAnalyticsSchema);