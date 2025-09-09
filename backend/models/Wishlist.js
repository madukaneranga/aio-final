import mongoose from "mongoose";

const wishlistItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Product",
  },
  price: {
    type: Number,
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  notes: {
    type: String,
    maxlength: 500,
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  lastChecked: {
    type: Date,
    default: Date.now,
  },
});

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  items: [wishlistItemSchema],
  totalItems: {
    type: Number,
    default: 0,
  },
  categories: [{
    name: String,
    itemIds: [mongoose.Schema.Types.ObjectId],
  }],
  isPublic: {
    type: Boolean,
    default: false,
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true,
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

wishlistSchema.pre("save", function (next) {
  this.totalItems = this.items.length;
  this.updatedAt = new Date();
  next();
});

wishlistSchema.methods.addItem = function (itemData) {
  const existingItem = this.items.find(
    item => 
      item.itemId.toString() === itemData.itemId.toString() 
  );

  if (!existingItem) {
    this.items.push({
      ...itemData,
      addedAt: new Date(),
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

wishlistSchema.methods.removeItem = function (itemId) {
  // Try to find by wishlist item _id first, then by product itemId
  let itemIndex = this.items.findIndex(
    item => item._id.toString() === itemId.toString()
  );

  // If not found by _id, try to find by product itemId
  if (itemIndex === -1) {
    itemIndex = this.items.findIndex(
      item => item.itemId.toString() === itemId.toString()
    );
  }

  if (itemIndex !== -1) {
    this.items.splice(itemIndex, 1);
    return this.save();
  }
  
  return Promise.resolve(this);
};

wishlistSchema.methods.updateItemPriority = function (itemId, priority) {
  let item = this.items.find(
    item => item._id.toString() === itemId.toString()
  );

  // If not found by _id, try to find by product itemId
  if (!item) {
    item = this.items.find(
      item => item.itemId.toString() === itemId.toString()
    );
  }

  if (item) {
    item.priority = priority;
    return this.save();
  }
  
  return Promise.resolve(this);
};

wishlistSchema.methods.addItemNotes = function (itemId, notes) {
  let item = this.items.find(
    item => item._id.toString() === itemId.toString()
  );

  // If not found by _id, try to find by product itemId
  if (!item) {
    item = this.items.find(
      item => item.itemId.toString() === itemId.toString()
    );
  }

  if (item) {
    item.notes = notes;
    return this.save();
  }
  
  return Promise.resolve(this);
};

wishlistSchema.methods.moveToCart = function (itemId, cartInstance, quantity = 1) {
  let item = this.items.find(
    item => item._id.toString() === itemId.toString()
  );

  // If not found by _id, try to find by product itemId
  if (!item) {
    item = this.items.find(
      item => item.itemId.toString() === itemId.toString()
    );
  }

  if (item) {
    const cartItemData = {
      itemId: item.itemId,
      price: item.price,
      quantity: quantity,
      storeId: item.storeId,
    };

    return Promise.all([
      cartInstance.addItem(cartItemData),
      this.removeItem(itemId)
    ]);
  }
  
  return Promise.resolve([null, null]);
};

wishlistSchema.methods.getItemsByStore = function (storeId) {
  return this.items.filter(item => 
    item.storeId.toString() === storeId.toString()
  );
};


wishlistSchema.methods.getItemsByPriority = function (priority) {
  return this.items.filter(item => item.priority === priority);
};

wishlistSchema.methods.generateShareToken = function () {
  if (!this.shareToken) {
    this.shareToken = new mongoose.Types.ObjectId().toString();
    this.isPublic = true;
  }
  return this.save();
};

wishlistSchema.methods.removeShareToken = function () {
  this.shareToken = undefined;
  this.isPublic = false;
  return this.save();
};

export default mongoose.model("Wishlist", wishlistSchema);