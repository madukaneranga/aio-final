// models/FlashDeal.js
import mongoose from 'mongoose';

const flashDealSchema = new mongoose.Schema({
  // Basic Information
  saleName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  saleSubtitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  discountText: {
    type: String,
    required: true,
    trim: true,
    default: "UP TO 70% OFF"
  },
  buttonText: {
    type: String,
    required: true,
    trim: true,
    default: "SHOP NOW"
  },
  timerLabel: {
    type: String,
    required: true,
    trim: true,
    default: "Sale Starts In:"
  },

  // Timer Configuration
  saleStartTime: {
    type: Date,
    required: true
  },
  saleEndTime: {
    type: Date,
    required: true
  },

  // Design Configuration
  backgroundColor: {
    type: String,
    default: "linear-gradient(135deg, #ff1744, #e91e63, #f50057)"
  },
  backgroundImage: {
    type: String,
    default: null
  },
  textColor: {
    type: String,
    default: "#ffffff"
  },
  accentColor: {
    type: String,
    default: "#ffff00"
  },

  // Hero Image
  heroImage: {
    type: String,
    required: true
  },
  showHeroImage: {
    type: Boolean,
    default: true
  },

  // Status and Visibility
  isActive: {
    type: Boolean,
    default: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },

  // SEO and Tracking
  slug: {
    type: String,
    unique: true,
    required: true
  },
  clickCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },

  // Store/Admin Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null
  },

  // Products (if needed later)
  featuredProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],

  // Categories to include in deal
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],

  // Metadata
  priority: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for performance
flashDealSchema.index({ isActive: 1, isPublished: 1 });
flashDealSchema.index({ saleStartTime: 1, saleEndTime: 1 });
flashDealSchema.index({ priority: -1 });
flashDealSchema.index({ store: 1 });

// Virtual for checking if sale is currently active
flashDealSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && 
         this.isPublished && 
         now >= this.saleStartTime && 
         now <= this.saleEndTime;
});

// Virtual for sale status
flashDealSchema.virtual('saleStatus').get(function() {
  const now = new Date();
  
  if (!this.isActive || !this.isPublished) {
    return 'inactive';
  }
  
  if (now < this.saleStartTime) {
    return 'upcoming';
  } else if (now >= this.saleStartTime && now <= this.saleEndTime) {
    return 'active';
  } else {
    return 'ended';
  }
});

// Virtual for time remaining
flashDealSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const targetTime = now < this.saleStartTime ? this.saleStartTime : this.saleEndTime;
  const diff = targetTime - now;
  
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
});

// Pre-save middleware to generate slug
flashDealSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('saleName')) {
    const baseSlug = this.saleName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

// Static method to get current active deal
flashDealSchema.statics.getCurrentDeal = function() {
  const now = new Date();
  return this.findOne({
    isActive: true,
    isPublished: true,
    saleStartTime: { $lte: now },
    saleEndTime: { $gte: now }
  }).sort({ priority: -1 }).populate('featuredProducts categories');
};

// Static method to get upcoming deal
flashDealSchema.statics.getUpcomingDeal = function() {
  const now = new Date();
  return this.findOne({
    isActive: true,
    isPublished: true,
    saleStartTime: { $gt: now }
  }).sort({ saleStartTime: 1 }).populate('featuredProducts categories');
};

// Instance method to increment view count
flashDealSchema.methods.incrementViews = function() {
  this.viewCount += 1;
  return this.save();
};

// Instance method to increment click count
flashDealSchema.methods.incrementClicks = function() {
  this.clickCount += 1;
  return this.save();
};

const FlashDeal = mongoose.model('FlashDeal', flashDealSchema);

export default FlashDeal;