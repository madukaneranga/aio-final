import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  variants: {
    color: String,
    size: String,
    other: mongoose.Schema.Types.Mixed,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  removedAt: {
    type: Date,
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  items: [cartItemSchema],
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  totalItems: {
    type: Number,
    default: 0,
  },
  totalValue: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

cartSchema.pre("save", function (next) {
  const activeItems = this.items.filter(item => item.isActive);
  
  this.totalItems = activeItems.reduce((sum, item) => sum + item.quantity, 0);
  this.totalValue = activeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.updatedAt = new Date();
  next();
});

cartSchema.methods.addItem = function (itemData) {
  const activeItems = this.getActiveItems();
  
  // Check if same product exists and merge quantities
  const existingItemIndex = this.items.findIndex(
    item => 
      item.itemId.toString() === itemData.itemId.toString() &&
      item.isActive &&
      this.compareVariants(item.variants, itemData.variants)
  );

  if (existingItemIndex !== -1) {
    // Update existing product quantity
    this.items[existingItemIndex].quantity += itemData.quantity || 1;
    this.items[existingItemIndex].addedAt = new Date();
  } else {
    // Add new product
    this.items.push({
      ...itemData,
      addedAt: new Date(),
      isActive: true,
    });
  }
  
  this.lastActivity = new Date();
  
  return this.save().then(() => ({
    cart: this,
    clearedItems: [],
    wasTypeSwitch: false
  }));
};

cartSchema.methods.removeItem = function (itemId, keepForAnalytics = true) {
  const itemIndex = this.items.findIndex(
    item => item._id.toString() === itemId.toString()
  );

  if (itemIndex !== -1) {
    if (keepForAnalytics) {
      this.items[itemIndex].isActive = false;
      this.items[itemIndex].removedAt = new Date();
    } else {
      this.items.splice(itemIndex, 1);
    }
    this.lastActivity = new Date();
  }
  
  return this.save();
};

cartSchema.methods.updateItemQuantity = function (itemId, quantity) {
  const item = this.items.find(
    item => item._id.toString() === itemId.toString() && item.isActive
  );

  if (item) {
    if (quantity <= 0) {
      return this.removeItem(itemId);
    }
    item.quantity = quantity;
    this.lastActivity = new Date();
  }
  
  return this.save();
};

cartSchema.methods.clearCart = function (keepForAnalytics = true) {
  if (keepForAnalytics) {
    this.items.forEach(item => {
      if (item.isActive) {
        item.isActive = false;
        item.removedAt = new Date();
      }
    });
  } else {
    this.items = [];
  }
  this.lastActivity = new Date();
  
  return this.save();
};

cartSchema.methods.getActiveItems = function () {
  return this.items.filter(item => item.isActive);
};

cartSchema.methods.getRemovedItems = function (days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.items.filter(item => 
    !item.isActive && 
    item.removedAt && 
    item.removedAt >= cutoffDate
  );
};

// Helper method to compare variants properly
cartSchema.methods.compareVariants = function (variants1, variants2) {
  // Normalize variants - treat null, undefined, and empty objects as equivalent
  const normalize = (variants) => {
    if (!variants || Object.keys(variants).length === 0) {
      return {};
    }
    
    // Create a sorted object to avoid order dependency
    const sorted = {};
    Object.keys(variants)
      .filter(key => variants[key] !== null && variants[key] !== undefined && variants[key] !== '')
      .sort()
      .forEach(key => {
        sorted[key] = variants[key];
      });
    
    return sorted;
  };
  
  const norm1 = normalize(variants1);
  const norm2 = normalize(variants2);
  
  // Compare normalized objects
  return JSON.stringify(norm1) === JSON.stringify(norm2);
};

export default mongoose.model("Cart", cartSchema);