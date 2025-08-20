import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: function() {
      return !this.file; // Content required if no file
    },
    trim: true,
    maxlength: 2000,
  },
  messageType: {
    type: String,
    enum: ["text", "image", "receipt", "system"],
    default: "text",
  },
  file: {
    url: String,
    filename: String,
    size: Number,
    mimeType: String,
  },
  receipt: {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    amount: Number,
    status: String,
    receiptUrl: String,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  blockedReason: String,
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  }],
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

const chatSchema = new mongoose.Schema({
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["customer", "store_owner"],
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  storeOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  taggedProduct: {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    productName: String,
    productImage: String,
    productPrice: Number,
    taggedAt: {
      type: Date,
      default: Date.now,
    },
  },
  messages: [messageSchema],
  lastMessage: {
    content: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    messageType: {
      type: String,
      enum: ["text", "image", "receipt", "system"],
      default: "text",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  status: {
    type: String,
    enum: ["active", "archived", "blocked"],
    default: "active",
  },
  unreadCount: {
    customer: {
      type: Number,
      default: 0,
    },
    store_owner: {
      type: Number,
      default: 0,
    },
  },
  chatSettings: {
    isNotificationsEnabled: {
      type: Boolean,
      default: true,
    },
    allowFileUpload: {
      type: Boolean,
      default: true,
    },
    isModerated: {
      type: Boolean,
      default: true,
    },
  },
  analytics: {
    totalMessages: {
      type: Number,
      default: 0,
    },
    averageResponseTime: {
      type: Number,
      default: 0, // in minutes
    },
    customerSatisfaction: {
      type: Number,
      min: 1,
      max: 5,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  gdprSettings: {
    dataRetentionDays: {
      type: Number,
      default: 365, // 1 year default
    },
    canBeDeleted: {
      type: Boolean,
      default: true,
    },
    userRequestedDeletion: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      requestedAt: Date,
      processedAt: Date,
      status: {
        type: String,
        enum: ["pending", "processed", "denied"],
        default: "pending",
      },
    }],
  },
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

// Indexes for performance
chatSchema.index({ storeId: 1, customerId: 1 });
chatSchema.index({ customerId: 1 });
chatSchema.index({ storeOwnerId: 1 });
chatSchema.index({ "participants.userId": 1 });
chatSchema.index({ "taggedProduct.productId": 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ "analytics.lastActivity": -1 });
chatSchema.index({ createdAt: -1 });

// Message indexes
chatSchema.index({ "messages.senderId": 1 });
chatSchema.index({ "messages.createdAt": -1 });
chatSchema.index({ "messages.messageType": 1 });
chatSchema.index({ "messages.isBlocked": 1 });

// Virtual for getting active participants
chatSchema.virtual("activeParticipants").get(function() {
  return this.participants.filter(p => p.isActive);
});

// Virtual for chat room ID (for Socket.IO)
chatSchema.virtual("roomId").get(function() {
  return `chat_${this._id}`;
});

// Pre-save middleware to update analytics
chatSchema.pre("save", function(next) {
  if (this.isModified("messages")) {
    this.analytics.totalMessages = this.messages.length;
    this.analytics.lastActivity = new Date();
    this.updatedAt = new Date();
    
    // Update last message
    if (this.messages.length > 0) {
      const lastMsg = this.messages[this.messages.length - 1];
      this.lastMessage = {
        content: lastMsg.content || (lastMsg.file ? "📎 File attachment" : "System message"),
        senderId: lastMsg.senderId,
        messageType: lastMsg.messageType,
        timestamp: lastMsg.createdAt,
      };
    }
  }
  next();
});

// Method to add message
chatSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  
  // Update unread counts
  const senderRole = messageData.senderRole;
  if (senderRole === "customer") {
    this.unreadCount.store_owner += 1;
  } else if (senderRole === "store_owner") {
    this.unreadCount.customer += 1;
  }
  
  return this.save();
};

// Method to mark messages as read
chatSchema.methods.markAsRead = function(userId, userRole) {
  // Reset unread count for this user role
  if (userRole === "customer") {
    this.unreadCount.customer = 0;
  } else if (userRole === "store_owner") {
    this.unreadCount.store_owner = 0;
  }
  
  // Mark unread messages as read
  this.messages.forEach(message => {
    const alreadyRead = message.readBy.some(read => 
      read.userId.toString() === userId.toString()
    );
    
    if (!alreadyRead && message.senderId.toString() !== userId.toString()) {
      message.readBy.push({
        userId: userId,
        readAt: new Date(),
      });
    }
  });
  
  return this.save();
};

// Method to get unread messages for a user
chatSchema.methods.getUnreadMessages = function(userId) {
  return this.messages.filter(message => {
    // Skip own messages
    if (message.senderId.toString() === userId.toString()) {
      return false;
    }
    
    // Check if user has read this message
    const hasRead = message.readBy.some(read => 
      read.userId.toString() === userId.toString()
    );
    
    return !hasRead && !message.isDeleted;
  });
};

// Static method to find or create chat
chatSchema.statics.findOrCreateChat = async function(customerId, storeId, productId = null) {
  // Find existing chat
  let chat = await this.findOne({
    customerId: customerId,
    storeId: storeId,
    status: { $ne: "archived" },
  }).populate([
    { path: "customerId", select: "name email profileImage role" },
    { path: "storeOwnerId", select: "name email profileImage role" },
    { path: "storeId", select: "name profileImage ownerId" },
    { path: "taggedProduct.productId", select: "title images price" },
  ]);
  
  if (chat) {
    // Update tagged product if new product provided
    if (productId && (!chat.taggedProduct.productId || 
        chat.taggedProduct.productId.toString() !== productId.toString())) {
      const Product = mongoose.model("Product");
      const product = await Product.findById(productId);
      if (product) {
        chat.taggedProduct = {
          productId: product._id,
          productName: product.title,
          productImage: product.images[0],
          productPrice: product.price,
          taggedAt: new Date(),
        };
        await chat.save();
      }
    }
    return chat;
  }
  
  // Get store owner
  const Store = mongoose.model("Store");
  const store = await Store.findById(storeId);
  if (!store) {
    throw new Error("Store not found");
  }
  
  // Create new chat
  const newChatData = {
    participants: [
      {
        userId: customerId,
        role: "customer",
      },
      {
        userId: store.ownerId,
        role: "store_owner",
      },
    ],
    storeId: storeId,
    customerId: customerId,
    storeOwnerId: store.ownerId,
  };
  
  // Add tagged product if provided
  if (productId) {
    const Product = mongoose.model("Product");
    const product = await Product.findById(productId);
    if (product) {
      newChatData.taggedProduct = {
        productId: product._id,
        productName: product.title,
        productImage: product.images[0],
        productPrice: product.price,
      };
    }
  }
  
  chat = new this(newChatData);
  await chat.save();
  
  // Populate and return
  return await this.findById(chat._id).populate([
    { path: "customerId", select: "name email profileImage role" },
    { path: "storeOwnerId", select: "name email profileImage role" },
    { path: "storeId", select: "name profileImage ownerId" },
    { path: "taggedProduct.productId", select: "title images price" },
  ]);
};

// Ensure virtuals are included when converting to JSON
chatSchema.set("toJSON", { virtuals: true });
chatSchema.set("toObject", { virtuals: true });

export default mongoose.model("Chat", chatSchema);