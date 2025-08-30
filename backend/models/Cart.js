import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ["product", "service"],
    required: true,
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "itemType === 'product' ? 'Product' : 'Service'",
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
  bookingDetails: {
    date: String,
    time: String,
    notes: String,
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
  
  // Skip validation when clearing cart
  if (!this.skipValidation) {
    // Validate cart state before saving
    try {
      this.validateCartState();
    } catch (error) {
      return next(error);
    }
  }
  
  this.totalItems = activeItems.reduce((sum, item) => sum + item.quantity, 0);
  this.totalValue = activeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.updatedAt = new Date();
  next();
});

cartSchema.methods.addItem = function (itemData) {
  const activeItems = this.getActiveItems();
  const newItemType = itemData.itemType;
  
  // Check if cart has items of different type
  const existingTypes = [...new Set(activeItems.map(item => item.itemType))];
  const hasConflictingTypes = existingTypes.length > 0 && !existingTypes.includes(newItemType);
  
  // Store items that will be cleared for analytics
  let clearedItems = [];
  
  if (hasConflictingTypes) {
    // Clear all existing items of different type (soft delete for analytics)
    activeItems.forEach(item => {
      if (item.itemType !== newItemType) {
        item.isActive = false;
        item.removedAt = new Date();
        clearedItems.push({
          itemType: item.itemType,
          title: item.title || 'Unknown Item',
          quantity: item.quantity
        });
      }
    });
  }
  
  // For services: only allow one service at a time
  if (newItemType === 'service') {
    // Remove any existing active services
    activeItems.forEach(item => {
      if (item.itemType === 'service' && item.isActive) {
        item.isActive = false;
        item.removedAt = new Date();
        clearedItems.push({
          itemType: item.itemType,
          title: item.title || 'Unknown Service',
          quantity: 1
        });
      }
    });
    
    // Add the new service (always as new item, no quantity merging)
    this.items.push({
      ...itemData,
      quantity: 1, // Services always have quantity 1
      addedAt: new Date(),
      isActive: true,
    });
  } else {
    // For products: check if same product exists and merge quantities
    const existingItemIndex = this.items.findIndex(
      item => 
        item.itemId.toString() === itemData.itemId.toString() &&
        item.itemType === 'product' &&
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
  }
  
  this.lastActivity = new Date();
  
  // Return save promise with metadata about cleared items
  return this.save().then(() => ({
    cart: this,
    clearedItems,
    wasTypeSwitch: clearedItems.length > 0
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
  
  // Skip validation when clearing cart since we're intentionally making it empty
  this.skipValidation = true;
  return this.save().then((result) => {
    this.skipValidation = false;
    return result;
  }).catch((error) => {
    this.skipValidation = false;
    throw error;
  });
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

// Validation methods for cart state
cartSchema.methods.validateCartState = function () {
  const activeItems = this.getActiveItems();
  const itemTypes = [...new Set(activeItems.map(item => item.itemType))];
  
  // Check for mixed types (should never happen with new logic)
  if (itemTypes.length > 1) {
    throw new Error('Cart cannot contain both products and services');
  }
  
  // Check for multiple services (should never happen with new logic)
  const services = activeItems.filter(item => item.itemType === 'service');
  if (services.length > 1) {
    throw new Error('Cart cannot contain multiple services');
  }
  
  // Validate individual items
  activeItems.forEach(item => {
    if (!item.itemId) {
      throw new Error('Cart item missing itemId reference');
    }
    if (!item.storeId) {
      throw new Error('Cart item missing storeId reference');
    }
    if (item.itemType === 'service' && item.quantity !== 1) {
      throw new Error('Service items must have quantity of 1');
    }
    if (item.quantity <= 0) {
      throw new Error('Cart item quantity must be greater than 0');
    }
  });
  
  return true;
};

cartSchema.methods.validateItemAddition = function (itemType) {
  const currentType = this.getCartType();
  
  if (!currentType) return { valid: true }; // Empty cart can accept any type
  
  if (itemType === 'service' && currentType === 'service') {
    return { 
      valid: true, 
      willReplace: true, 
      message: 'Adding this service will replace your current service booking' 
    };
  }
  
  if (itemType === 'service' && currentType === 'product') {
    const productCount = this.getActiveItems().filter(item => item.itemType === 'product').length;
    return { 
      valid: true, 
      willReplace: true, 
      message: `Adding this service will remove ${productCount} product${productCount > 1 ? 's' : ''} from your cart` 
    };
  }
  
  if (itemType === 'product' && currentType === 'service') {
    return { 
      valid: true, 
      willReplace: true, 
      message: 'Adding products will remove your service booking' 
    };
  }
  
  if (itemType === 'product' && currentType === 'product') {
    return { valid: true, willReplace: false };
  }
  
  return { valid: false, message: 'Invalid cart operation' };
};

cartSchema.methods.getCartType = function () {
  const activeItems = this.getActiveItems();
  if (activeItems.length === 0) return null;
  
  const itemTypes = [...new Set(activeItems.map(item => item.itemType))];
  return itemTypes[0]; // Should only be one type
};

cartSchema.methods.canAddItem = function (itemType) {
  const currentType = this.getCartType();
  
  if (!currentType) return true; // Empty cart can accept any type
  
  if (itemType === 'service') {
    // Services replace everything
    return true;
  }
  
  if (itemType === 'product' && currentType === 'product') {
    // Can add products to product cart
    return true;
  }
  
  if (itemType === 'product' && currentType === 'service') {
    // Products replace services (with confirmation)
    return true;
  }
  
  return false;
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