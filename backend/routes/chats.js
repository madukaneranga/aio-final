import express from "express";
import mongoose from "mongoose";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  moderateMessageContent,
  createChatRateLimit,
  sanitizeContent,
  logModerationEvent,
} from "../middleware/contentModeration.js";
import Chat from "../models/Chat.js";
import ChatAnalytics from "../models/ChatAnalytics.js";
import User from "../models/User.js";
import Store from "../models/Store.js";
import Product from "../models/Product.js";
import { emitToRoom, isUserOnline } from "../index.js";

const router = express.Router();

// Rate limiting middleware for chat routes
const chatRateLimit = createChatRateLimit(30, 60000); // 30 messages per minute

/**
 * GET /api/chat/admin/moderation
 * Get moderation logs for admin review (admin only)
 */
router.get(
  "/admin/moderation",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, status = "all" } = req.query;

      // This would require a ModerationLog model (not implemented in this basic version)
      // For now, return blocked messages from chats
      let matchStage = {};
      if (status !== "all") {
        matchStage["messages.isBlocked"] = status === "blocked";
      }

      const pipeline = [
        { $match: matchStage },
        { $unwind: "$messages" },
        { $match: { "messages.isBlocked": true } },
        {
          $lookup: {
            from: "users",
            localField: "messages.senderId",
            foreignField: "_id",
            as: "sender",
          },
        },
        {
          $lookup: {
            from: "stores",
            localField: "storeId",
            foreignField: "_id",
            as: "store",
          },
        },
        {
          $project: {
            _id: "$messages._id",
            chatId: "$_id",
            content: "$messages.content",
            blockedReason: "$messages.blockedReason",
            senderId: "$messages.senderId",
            sender: { $arrayElemAt: ["$sender.name", 0] },
            store: { $arrayElemAt: ["$store.name", 0] },
            createdAt: "$messages.createdAt",
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) },
      ];

      const moderationLogs = await Chat.aggregate(pipeline);

      res.json({
        success: true,
        logs: moderationLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Get moderation logs error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch moderation logs",
      });
    }
  }
);

/**
 * POST /api/chat/admin/broadcast
 * Broadcast system message to all active chats (admin only)
 */
router.post(
  "/admin/broadcast",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const { message, targetType = "all", targetIds = [] } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Message is required",
        });
      }

      let query = { status: "active" };

      // Filter by target type
      if (targetType === "store" && targetIds.length > 0) {
        query.storeId = { $in: targetIds };
      } else if (targetType === "customer" && targetIds.length > 0) {
        query.customerId = { $in: targetIds };
      }

      const chats = await Chat.find(query);
      let broadcastCount = 0;

      for (const chat of chats) {
        // Add system message to chat
        chat.messages.push({
          senderId: "system",
          content: message.trim(),
          messageType: "system",
          createdAt: new Date(),
        });

        await chat.save();

        // Emit to chat room via Socket.IO
        emitToRoom(chat.roomId, "system-message", {
          _id: new Date().getTime().toString(),
          senderId: "system",
          content: message.trim(),
          messageType: "system",
          createdAt: new Date(),
          sender: {
            _id: "system",
            name: "System",
            role: "system",
          },
          systemType: "info",
        });

        broadcastCount++;
      }

      res.json({
        success: true,
        message: "System message broadcasted successfully",
        chatsUpdated: broadcastCount,
      });
    } catch (error) {
      console.error("Broadcast message error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to broadcast message",
      });
    }
  }
);

/**
 * GET /api/chat/health
 * Health check endpoint for chat system
 */
router.get("/health", async (req, res) => {
  try {
    // Check database connection
    const chatCount = await Chat.countDocuments();

    // Check recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentChats = await Chat.countDocuments({
      "analytics.lastActivity": { $gte: yesterday },
    });

    res.json({
      success: true,
      status: "healthy",
      timestamp: new Date(),
      stats: {
        totalChats: chatCount,
        recentActiveChats: recentChats,
        databaseConnected: true,
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      success: false,
      status: "unhealthy",
      error: error.message,
      timestamp: new Date(),
    });
  }
});

// Helper function to convert data to CSV
const convertToCSV = (data) => {
  const messages = data.messages;
  const headers = [
    "Timestamp",
    "Sender ID",
    "Message Type",
    "Content",
    "File URL",
  ];

  const csvRows = [headers.join(",")];

  messages.forEach((msg) => {
    const row = [
      msg.createdAt,
      msg.senderId,
      msg.messageType,
      `"${msg.content?.replace(/"/g, '""') || ""}"`,
      msg.file?.url || "",
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
};

// Get customer's chats
router.get("/customer/chats", authenticate, async (req, res) => {
  const conversations = await Chat.find({
    customerId: req.user._id,
    status: "active",
  })
    .populate(["storeOwnerId", "storeId", "taggedProduct.productId"])
    .sort({ "analytics.lastActivity": -1 });

  res.json({ success: true, conversations });
});

// Get store's chats
router.get(
  "/store/:storeId/chats",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    const conversations = await Chat.find({
      storeId: req.params.storeId,
      status: "active",
    })
      .populate(["customerId", "taggedProduct.productId"])
      .sort({ "analytics.lastActivity": -1 });

    res.json({ success: true, conversations });
  }
);

/**
 * GET /api/chat/conversations
 * Get all conversations for the authenticated user
 */
router.get("/conversations", authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "active" } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Build query based on user role
    let query = { status };
    if (userRole === "customer") {
      query.customerId = userId;
    } else if (userRole === "store_owner") {
      query.storeOwnerId = userId;
    } else {
      return res.status(403).json({
        success: false,
        error: "Invalid user role for chat access",
      });
    }

    const conversations = await Chat.find(query)
      .populate([
        { path: "customerId", select: "name email profileImage role" },
        { path: "storeOwnerId", select: "name email profileImage role" },
        { path: "storeId", select: "name profileImage themeColor" },
        { path: "taggedProduct.productId", select: "title images price" },
      ])
      .sort({ "analytics.lastActivity": -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Add unread count and online status for each conversation
    const enrichedConversations = conversations.map((chat) => {
      const unreadCount =
        userRole === "customer"
          ? chat.unreadCount.customer
          : chat.unreadCount.store_owner;

      const otherParticipant =
        userRole === "customer" ? chat.storeOwnerId : chat.customerId;

      return {
        ...chat,
        unreadCount,
        otherParticipant: {
          ...otherParticipant,
          isOnline: isUserOnline(otherParticipant._id),
        },
      };
    });

    res.json({
      success: true,
      conversations: enrichedConversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Chat.countDocuments(query),
      },
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch conversations",
    });
  }
});

/**
 * POST /api/chat/start
 * Start a new chat or get existing chat
 */
router.post("/start", authenticate, async (req, res) => {
  try {
    const { storeId, productId } = req.body;
    const customerId = req.user._id;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        error: "Store ID is required",
      });
    }

    // Verify store exists
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: "Store not found",
      });
    }

    // Verify product exists if provided
    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      if (product.storeId.toString() !== storeId) {
        return res.status(400).json({
          success: false,
          error: "Product does not belong to this store",
        });
      }
    }

    // Prevent customers from chatting with their own store
    if (
      req.user.role === "store_owner" &&
      store.ownerId.toString() === customerId.toString()
    ) {
      return res.status(400).json({
        success: false,
        error: "Cannot start chat with your own store",
      });
    }

    // Find or create chat
    const chat = await Chat.findOrCreateChat(customerId, storeId, productId);

    res.json({
      success: true,
      chat,
      message: "Chat started successfully",
    });
  } catch (error) {
    console.error("Start chat error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start chat",
    });
  }
});

/**
 * GET /api/chat/search
 * Search through chat messages
 */
router.get("/search", authenticate, async (req, res) => {
  try {
    const {
      query,
      chatId,
      dateFrom,
      dateTo,
      messageType,
      page = 1,
      limit = 20,
    } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: "Search query must be at least 2 characters long",
      });
    }

    // Build search criteria
    let chatFilter = {};
    if (userRole === "customer") {
      chatFilter.customerId = userId;
    } else if (userRole === "store_owner") {
      chatFilter.storeOwnerId = userId;
    }

    if (chatId) {
      chatFilter._id = chatId;
    }

    // Date range filter
    let messageFilter = {
      isDeleted: false,
    };

    if (dateFrom || dateTo) {
      messageFilter.createdAt = {};
      if (dateFrom) messageFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) messageFilter.createdAt.$lte = new Date(dateTo);
    }

    if (messageType) {
      messageFilter.messageType = messageType;
    }

    // Search in chats
    const chats = await Chat.find(chatFilter)
      .populate([
        { path: "customerId", select: "name profileImage" },
        { path: "storeOwnerId", select: "name profileImage" },
        { path: "storeId", select: "name profileImage" },
      ])
      .lean();

    // Search messages within chats
    const results = [];
    for (const chat of chats) {
      const matchingMessages = chat.messages.filter((msg) => {
        if (msg.isDeleted) return false;
        if (messageType && msg.messageType !== messageType) return false;
        if (dateFrom && msg.createdAt < new Date(dateFrom)) return false;
        if (dateTo && msg.createdAt > new Date(dateTo)) return false;
        return (
          msg.content && msg.content.toLowerCase().includes(query.toLowerCase())
        );
      });

      for (const message of matchingMessages) {
        results.push({
          chatId: chat._id,
          messageId: message._id,
          content: message.content,
          messageType: message.messageType,
          senderId: message.senderId,
          createdAt: message.createdAt,
          chat: {
            _id: chat._id,
            customer: chat.customerId,
            storeOwner: chat.storeOwnerId,
            store: chat.storeId,
            taggedProduct: chat.taggedProduct,
          },
        });
      }
    }

    // Sort by date and paginate
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const startIndex = (page - 1) * limit;
    const paginatedResults = results.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      results: paginatedResults,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: results.length,
        hasMore: results.length > startIndex + limit,
      },
      query,
    });
  } catch (error) {
    console.error("Search chat error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search chats",
    });
  }
});

/**
 * GET /api/chat/unread-count
 * Get total unread messages count for user
 */
router.get("/unread-count", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let query = { status: "active" };
    if (userRole === "customer") {
      query.customerId = userId;
    } else if (userRole === "store_owner") {
      query.storeOwnerId = userId;
    }

    const chats = await Chat.find(query, {
      unreadCount: 1,
    });

    const totalUnread = chats.reduce((total, chat) => {
      return (
        total +
        (userRole === "customer"
          ? chat.unreadCount.customer
          : chat.unreadCount.store_owner)
      );
    }, 0);

    res.json({
      success: true,
      unreadCount: totalUnread,
      chatCount: chats.length,
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch unread count",
    });
  }
});

/**
 * GET /api/chat/:chatId
 * Get chat details and messages
 */
router.get("/:chatId", authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Validate chatId
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid chat ID",
      });
    }

    // Find chat and verify user has access
    const chat = await Chat.findById(chatId).populate([
      { path: "customerId", select: "name email profileImage role" },
      { path: "storeOwnerId", select: "name email profileImage role" },
      { path: "storeId", select: "name profileImage themeColor contactInfo" },
      { path: "taggedProduct.productId", select: "title images price" },
    ]);

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.userId.toString() === userId.toString() && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: "Access denied to this chat",
      });
    }

    // Get messages with pagination (newest first)
    const messages = chat.messages
      .filter((msg) => !msg.isDeleted)
      .slice(-(page * limit))
      .slice(-limit)
      .map((msg) => ({
        ...msg.toObject(),
        isSent: msg.senderId.toString() === userId.toString(),
      }));

    // Mark messages as read
    await chat.markAsRead(userId, req.user.role);

    // Get other participant info
    const otherParticipant =
      req.user.role === "customer" ? chat.storeOwnerId : chat.customerId;

    res.json({
      success: true,
      chat: {
        ...chat.toObject(),
        messages,
        otherParticipant: {
          ...otherParticipant.toObject(),
          isOnline: isUserOnline(otherParticipant._id),
        },
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: chat.messages.filter((msg) => !msg.isDeleted).length,
        hasMore: chat.messages.length > page * limit,
      },
    });
  } catch (error) {
    console.error("Get chat error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch chat",
    });
  }
});

/**
 * POST /api/chat/:chatId/message
 * Send a message in a chat
 */
router.post(
  "/:chatId/message",
  authenticate,
  chatRateLimit,
  moderateMessageContent,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      let { content, messageType = "text", file, receipt } = req.body;
      const userId = req.user._id;
      const userRole = req.user.role;

      // Validate chatId
      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid chat ID",
        });
      }

      // Sanitize content
      content = sanitizeContent(content);

      // Validate message content
      if (!content && !file && !receipt) {
        return res.status(400).json({
          success: false,
          error: "Message content, file, or receipt is required",
        });
      }

      // Find chat and verify access
      const chat = await Chat.findById(chatId).populate([
        { path: "customerId", select: "name email profileImage" },
        { path: "storeOwnerId", select: "name email profileImage" },
        { path: "storeId", select: "name profileImage" },
      ]);

      if (!chat) {
        return res.status(404).json({
          success: false,
          error: "Chat not found",
        });
      }

      // Check if user is a participant
      const isParticipant = chat.participants.some(
        (p) => p.userId.toString() === userId.toString() && p.isActive
      );

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          error: "Access denied to this chat",
        });
      }

      // Check if chat is active
      if (chat.status !== "active") {
        return res.status(400).json({
          success: false,
          error: "Cannot send message to inactive chat",
        });
      }

      // Create message object
      const messageData = {
        senderId: userId,
        content,
        messageType,
        createdAt: new Date(),
      };

      // Add file data if provided
      if (file) {
        messageData.file = {
          url: file.url,
          filename: file.filename,
          size: file.size,
          mimeType: file.mimeType,
        };
        messageData.messageType = "image";
      }

      // Add receipt data if provided
      if (receipt) {
        messageData.receipt = receipt;
        messageData.messageType = "receipt";
      }

      // Add moderation data if message was flagged
      if (req.moderationResult && req.moderationResult.violations.length > 0) {
        await logModerationEvent({
          userId,
          chatId,
          content,
          violations: req.moderationResult.violations,
          action: "flagged",
        });
      }

      // Add message to chat
      await chat.addMessage({ ...messageData, senderRole: userRole });

      // Emit message to chat room
      const socketMessage = {
        ...messageData,
        _id: chat.messages[chat.messages.length - 1]._id,
        sender: {
          _id: userId,
          name: req.user.name,
          profileImage: req.user.profileImage,
          role: userRole,
        },
        chat: {
          _id: chatId,
          storeId: chat.storeId._id,
        },
      };

      emitToRoom(chat.roomId, "new-message", socketMessage);

      // Update analytics
      try {
        const storeId = chat.storeId._id;
        const storeOwnerId = chat.storeOwnerId._id;

        // Update daily analytics
        const dailyAnalytics = await ChatAnalytics.getOrCreate(
          storeId,
          storeOwnerId,
          "daily",
          new Date()
        );

        await dailyAnalytics.updateMessageMetrics({
          direction: userRole === "store_owner" ? "sent" : "received",
          messageType,
          isBlocked: false,
        });

        // Update product inquiry if tagged product exists
        if (chat.taggedProduct.productId) {
          await dailyAnalytics.updateProductInquiry(
            chat.taggedProduct.productId,
            chat.taggedProduct.productName
          );
        }
      } catch (analyticsError) {
        console.error("Analytics update error:", analyticsError);
        // Don't fail the message send if analytics fail
      }

      res.json({
        success: true,
        message: socketMessage,
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send message",
      });
    }
  }
);

/**
 * PUT /api/chat/:chatId/read
 * Mark chat messages as read
 */
router.put("/:chatId/read", authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid chat ID",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.userId.toString() === userId.toString() && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: "Access denied to this chat",
      });
    }

    await chat.markAsRead(userId, userRole);

    // Emit read status to other participants
    emitToRoom(chat.roomId, "messages-read", {
      chatId,
      userId,
      readBy: req.user.name,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to mark messages as read",
    });
  }
});

/**
 * PUT /api/chat/:chatId/archive
 * Archive a chat conversation
 */
router.put("/:chatId/archive", authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid chat ID",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.userId.toString() === userId.toString() && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: "Access denied to this chat",
      });
    }

    // Update chat status
    chat.status = "archived";
    chat.analytics.lastActivity = new Date();
    await chat.save();

    // Emit archive status to other participants
    emitToRoom(chat.roomId, "chat-archived", {
      chatId,
      archivedBy: userId,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: "Chat archived successfully",
    });
  } catch (error) {
    console.error("Archive chat error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to archive chat",
    });
  }
});

/**
 * DELETE /api/chat/:chatId/message/:messageId
 * Delete a message (soft delete)
 */
router.delete("/:chatId/message/:messageId", authenticate, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user._id;

    if (
      !mongoose.Types.ObjectId.isValid(chatId) ||
      !mongoose.Types.ObjectId.isValid(messageId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid chat or message ID",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    // Find the message
    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: "Message not found",
      });
    }

    // Check if user owns the message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: "Can only delete your own messages",
      });
    }

    // Check if message is already deleted
    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        error: "Message already deleted",
      });
    }

    // Soft delete the message
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = "[Message deleted]";

    await chat.save();

    // Emit delete status to chat room
    emitToRoom(chat.roomId, "message-deleted", {
      chatId,
      messageId,
      deletedBy: userId,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete message",
    });
  }
});

/**
 * GET /api/chat/store/:storeId/analytics
 * Get chat analytics for a store
 */
router.get(
  "/store/:storeId/analytics",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const { period = "daily", startDate, endDate } = req.query;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid store ID",
        });
      }

      // Verify user owns the store
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          error: "Store not found",
        });
      }

      if (store.ownerId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: "Access denied to this store's analytics",
        });
      }

      // Build date range query
      let dateQuery = {};
      if (startDate && endDate) {
        dateQuery = {
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        };
      } else {
        // Default to last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        dateQuery = {
          date: { $gte: thirtyDaysAgo },
        };
      }

      // Get analytics data
      const analytics = await ChatAnalytics.find({
        storeId,
        period,
        ...dateQuery,
      }).sort({ date: -1 });

      // Calculate summary metrics
      const summary = analytics.reduce(
        (acc, curr) => {
          acc.totalChats += curr.metrics.totalChats;
          acc.totalMessages += curr.metrics.totalMessages;
          acc.averageResponseTime += curr.metrics.averageResponseTime;
          acc.averageRating += curr.metrics.averageRating;
          acc.blockedMessages += curr.metrics.blockedMessages;
          acc.conversionRate += curr.metrics.conversionRate;
          acc.revenueFromChats += curr.metrics.revenueFromChats;
          return acc;
        },
        {
          totalChats: 0,
          totalMessages: 0,
          averageResponseTime: 0,
          averageRating: 0,
          blockedMessages: 0,
          conversionRate: 0,
          revenueFromChats: 0,
        }
      );

      // Calculate averages
      if (analytics.length > 0) {
        summary.averageResponseTime /= analytics.length;
        summary.averageRating /= analytics.length;
        summary.conversionRate /= analytics.length;
      }

      res.json({
        success: true,
        analytics,
        summary,
        period,
        dateRange: {
          start:
            startDate ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: endDate || new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Get analytics error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch analytics",
      });
    }
  }
);

/**
 * POST /api/chat/:chatId/rating
 * Rate a chat conversation (customer only)
 */
router.post(
  "/:chatId/rating",
  authenticate,
  authorize("customer"),
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const { rating, feedback } = req.body;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid chat ID",
        });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: "Rating must be between 1 and 5",
        });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          error: "Chat not found",
        });
      }

      // Check if user is the customer in this chat
      if (chat.customerId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: "Only customers can rate chats",
        });
      }

      // Check if already rated
      if (chat.analytics.customerSatisfaction) {
        return res.status(400).json({
          success: false,
          error: "Chat already rated",
        });
      }

      // Update chat rating
      chat.analytics.customerSatisfaction = rating;
      await chat.save();

      // Update analytics
      try {
        const dailyAnalytics = await ChatAnalytics.getOrCreate(
          chat.storeId,
          chat.storeOwnerId,
          "daily",
          new Date()
        );
        await dailyAnalytics.addCustomerRating(rating);
      } catch (analyticsError) {
        console.error("Analytics update error:", analyticsError);
      }

      // Emit rating to store owner
      emitToRoom(chat.roomId, "chat-rated", {
        chatId,
        rating,
        feedback,
        ratedBy: req.user.name,
        timestamp: new Date(),
      });

      res.json({
        success: true,
        message: "Chat rated successfully",
        rating,
      });
    } catch (error) {
      console.error("Rate chat error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to rate chat",
      });
    }
  }
);

/**
 * POST /api/chat/:chatId/typing
 * Handle typing indicators
 */
router.post("/:chatId/typing", authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { isTyping } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid chat ID",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.userId.toString() === userId.toString() && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: "Access denied to this chat",
      });
    }

    // Emit typing status
    emitToRoom(chat.roomId, "user-typing", {
      chatId,
      userId,
      userName: req.user.name,
      isTyping: Boolean(isTyping),
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: "Typing status updated",
    });
  } catch (error) {
    console.error("Typing indicator error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update typing status",
    });
  }
});

/**
 * PUT /api/chat/:chatId/block
 * Block/unblock a chat (store owners only)
 */
router.put(
  "/:chatId/block",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const { isBlocked, reason } = req.body;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid chat ID",
        });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          error: "Chat not found",
        });
      }

      // Check if user is the store owner
      if (chat.storeOwnerId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: "Only store owners can block chats",
        });
      }

      // Update chat status
      chat.status = isBlocked ? "blocked" : "active";

      // Add system message
      if (isBlocked) {
        chat.messages.push({
          senderId: "system",
          content: `Chat has been blocked by store owner. Reason: ${
            reason || "No reason provided"
          }`,
          messageType: "system",
          createdAt: new Date(),
        });
      } else {
        chat.messages.push({
          senderId: "system",
          content: "Chat has been unblocked by store owner.",
          messageType: "system",
          createdAt: new Date(),
        });
      }

      await chat.save();

      // Emit status change to participants
      emitToRoom(chat.roomId, "chat-status-changed", {
        chatId,
        status: chat.status,
        reason,
        changedBy: userId,
        timestamp: new Date(),
      });

      res.json({
        success: true,
        message: `Chat ${isBlocked ? "blocked" : "unblocked"} successfully`,
        status: chat.status,
      });
    } catch (error) {
      console.error("Block chat error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update chat status",
      });
    }
  }
);

/**
 * GET /api/chat/:chatId/export
 * Export chat history (GDPR compliance)
 */
router.get("/:chatId/export", authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { format = "json" } = req.query;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid chat ID",
      });
    }

    const chat = await Chat.findById(chatId).populate([
      { path: "customerId", select: "name email" },
      { path: "storeOwnerId", select: "name email" },
      { path: "storeId", select: "name" },
      { path: "taggedProduct.productId", select: "title" },
    ]);

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.userId.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: "Access denied to this chat",
      });
    }

    // Prepare export data
    const exportData = {
      chatId: chat._id,
      participants: chat.participants,
      store: chat.storeId,
      taggedProduct: chat.taggedProduct,
      messages: chat.messages
        .filter((msg) => !msg.isDeleted)
        .map((msg) => ({
          id: msg._id,
          senderId: msg.senderId,
          content: msg.content,
          messageType: msg.messageType,
          file: msg.file,
          receipt: msg.receipt,
          createdAt: msg.createdAt,
          readBy: msg.readBy,
        })),
      analytics: chat.analytics,
      exportedAt: new Date(),
      exportedBy: userId,
    };

    if (format === "csv") {
      // Convert to CSV format
      const csv = convertToCSV(exportData);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="chat-${chatId}-export.csv"`
      );
      res.send(csv);
    } else {
      // Return JSON format
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="chat-${chatId}-export.json"`
      );
      res.json({
        success: true,
        data: exportData,
      });
    }
  } catch (error) {
    console.error("Export chat error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export chat",
    });
  }
});

/**
 * DELETE /api/chat/:chatId/gdpr-delete
 * Request GDPR deletion of chat data
 */
router.delete("/:chatId/gdpr-delete", authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid chat ID",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.userId.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: "Access denied to this chat",
      });
    }

    // Check if deletion request already exists
    const existingRequest = chat.gdprSettings.userRequestedDeletion.find(
      (req) =>
        req.userId.toString() === userId.toString() && req.status === "pending"
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: "Deletion request already pending",
      });
    }

    // Add deletion request
    chat.gdprSettings.userRequestedDeletion.push({
      userId,
      requestedAt: new Date(),
      status: "pending",
    });

    await chat.save();

    res.json({
      success: true,
      message: "GDPR deletion request submitted successfully",
      requestId:
        chat.gdprSettings.userRequestedDeletion[
          chat.gdprSettings.userRequestedDeletion.length - 1
        ]._id,
    });
  } catch (error) {
    console.error("GDPR delete request error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit deletion request",
    });
  }
});

/**
 * POST /api/chat/:chatId/receipt
 * Send a receipt/order confirmation in chat
 */
router.post(
  "/:chatId/receipt",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const { orderId, amount, status, receiptUrl, message } = req.body;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid chat ID",
        });
      }

      if (!orderId || !amount || !status) {
        return res.status(400).json({
          success: false,
          error: "Order ID, amount, and status are required",
        });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          error: "Chat not found",
        });
      }

      // Check if user is the store owner
      if (chat.storeOwnerId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: "Only store owners can send receipts",
        });
      }

      // Create receipt message
      const receiptMessage = {
        senderId: userId,
        content: message || "Order receipt attached",
        messageType: "receipt",
        receipt: {
          orderId,
          amount,
          status,
          receiptUrl,
        },
        createdAt: new Date(),
      };

      // Add message to chat
      await chat.addMessage({ ...receiptMessage, senderRole: "store_owner" });

      // Emit via Socket.IO
      const socketMessage = {
        ...receiptMessage,
        _id: chat.messages[chat.messages.length - 1]._id,
        sender: {
          _id: userId,
          name: req.user.name,
          profileImage: req.user.profileImage,
          role: "store_owner",
        },
        chat: {
          _id: chatId,
          storeId: chat.storeId,
        },
      };

      emitToRoom(chat.roomId, "new-message", socketMessage);

      // Update analytics
      try {
        const dailyAnalytics = await ChatAnalytics.getOrCreate(
          chat.storeId,
          chat.storeOwnerId,
          "daily",
          new Date()
        );

        await dailyAnalytics.updateMessageMetrics({
          direction: "sent",
          messageType: "receipt",
          isBlocked: false,
        });
      } catch (analyticsError) {
        console.error("Analytics update error:", analyticsError);
      }

      res.json({
        success: true,
        message: socketMessage,
      });
    } catch (error) {
      console.error("Send receipt error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send receipt",
      });
    }
  }
);

/**
 * GET /api/chat/:chatId/participants
 * Get chat participants with their online status
 */
router.get("/:chatId/participants", authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid chat ID",
      });
    }

    const chat = await Chat.findById(chatId)
      .populate("participants.userId", "name email profileImage role")
      .lean();

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.userId._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: "Access denied to this chat",
      });
    }

    // Add online status to participants
    const participantsWithStatus = chat.participants.map((participant) => ({
      ...participant,
      isOnline: isUserOnline(participant.userId._id),
    }));

    res.json({
      success: true,
      participants: participantsWithStatus,
      totalParticipants: participantsWithStatus.length,
      activeParticipants: participantsWithStatus.filter((p) => p.isActive)
        .length,
    });
  } catch (error) {
    console.error("Get participants error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch participants",
    });
  }
});

/**
 * PUT /api/chat/:chatId/settings
 * Update chat settings
 */
router.put("/:chatId/settings", authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { settings } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid chat ID",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.userId.toString() === userId.toString() && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: "Access denied to this chat",
      });
    }

    // Update allowed settings
    const allowedSettings = ["isNotificationsEnabled", "allowFileUpload"];
    const updateFields = {};

    for (const [key, value] of Object.entries(settings)) {
      if (allowedSettings.includes(key)) {
        updateFields[`chatSettings.${key}`] = Boolean(value);
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid settings provided",
      });
    }

    await Chat.updateOne({ _id: chatId }, { $set: updateFields });

    res.json({
      success: true,
      message: "Chat settings updated successfully",
      updatedSettings: updateFields,
    });
  } catch (error) {
    console.error("Update chat settings error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update chat settings",
    });
  }
});

export default router;
