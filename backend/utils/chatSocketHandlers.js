// socket/chatSocketHandlers.js

import Chat from "../models/Chat.js";
import ChatAnalytics from "../models/ChatAnalytics.js";
import { moderateContent, logModerationEvent } from "../middleware/contentModeration.js";

/**
 * Initialize chat socket handlers
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Individual socket connection
 */
export const initializeChatHandlers = (io, socket) => {
  const { userId, user } = socket;

  // Handle joining a chat room
  socket.on("join-chat", async (data) => {
    try {
      const { chatId } = data;
      
      if (!chatId) {
        socket.emit("error", { message: "Chat ID is required" });
        return;
      }

      // Verify user has access to this chat
      const chat = await Chat.findById(chatId);
      if (!chat) {
        socket.emit("error", { message: "Chat not found" });
        return;
      }

      const isParticipant = chat.participants.some(
        p => p.userId.toString() === userId && p.isActive
      );

      if (!isParticipant) {
        socket.emit("error", { message: "Access denied to this chat" });
        return;
      }

      // Join the chat room
      socket.join(chat.roomId);
      
      //console.log(`👥 User ${user.name} joined chat: ${chatId}`);

      // Notify other participants
      socket.to(chat.roomId).emit("user-joined-chat", {
        chatId,
        userId,
        userName: user.name,
        userRole: user.role,
        timestamp: new Date(),
      });

      // Send confirmation to user
      socket.emit("chat-joined", {
        chatId,
        roomId: chat.roomId,
        message: "Successfully joined chat",
      });

    } catch (error) {
      console.error("Join chat error:", error);
      socket.emit("error", { message: "Failed to join chat" });
    }
  });

  // Handle leaving a chat room
  socket.on("leave-chat", async (data) => {
    try {
      const { chatId } = data;
      
      if (!chatId) {
        socket.emit("error", { message: "Chat ID is required" });
        return;
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        socket.emit("error", { message: "Chat not found" });
        return;
      }

      // Leave the chat room
      socket.leave(chat.roomId);
      
      //console.log(`🚪 User ${user.name} left chat: ${chatId}`);

      // Notify other participants
      socket.to(chat.roomId).emit("user-left-chat", {
        chatId,
        userId,
        userName: user.name,
        timestamp: new Date(),
      });

      // Send confirmation to user
      socket.emit("chat-left", {
        chatId,
        message: "Successfully left chat",
      });

    } catch (error) {
      console.error("Leave chat error:", error);
      socket.emit("error", { message: "Failed to leave chat" });
    }
  });

  // Handle real-time message sending
  socket.on("send-message", async (data) => {
    try {
      const { chatId, content, messageType = "text", file, receipt } = data;
      
      if (!chatId) {
        socket.emit("error", { message: "Chat ID is required" });
        return;
      }

      if (!content && !file && !receipt) {
        socket.emit("error", { message: "Message content is required" });
        return;
      }

      // Find and verify chat access
      const chat = await Chat.findById(chatId)
        .populate([
          { path: "customerId", select: "name profileImage" },
          { path: "storeOwnerId", select: "name profileImage" },
          { path: "storeId", select: "name profileImage" },
        ]);

      if (!chat) {
        socket.emit("error", { message: "Chat not found" });
        return;
      }

      const isParticipant = chat.participants.some(
        p => p.userId.toString() === userId && p.isActive
      );

      if (!isParticipant) {
        socket.emit("error", { message: "Access denied to this chat" });
        return;
      }

      if (chat.status !== "active") {
        socket.emit("error", { message: "Cannot send message to inactive chat" });
        return;
      }

      // Content moderation for text messages
      let moderationResult = { isBlocked: false, violations: [] };
      if (content && content.trim()) {
        moderationResult = moderateContent(content.trim());
        
        if (moderationResult.isBlocked) {
          // Log the moderation event
          await logModerationEvent({
            userId,
            chatId,
            content,
            violations: moderationResult.violations,
            action: "blocked",
          });

          socket.emit("message-blocked", {
            chatId,
            reason: moderationResult.reason,
            violations: moderationResult.violations.map(v => ({
              type: v.type,
              count: v.matches.length,
            })),
            userMessage: "Your message contains prohibited content. Please remove any contact information, external links, or payment details and try again.",
          });
          return;
        }
      }

      // Create message object
      const messageData = {
        senderId: userId,
        content: content?.trim(),
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

      // Add message to chat
      await chat.addMessage({ ...messageData, senderRole: user.role });

      // Get the saved message with ID
      const savedMessage = chat.messages[chat.messages.length - 1];

      // Prepare socket message
      const socketMessage = {
        _id: savedMessage._id,
        ...messageData,
        sender: {
          _id: userId,
          name: user.name,
          profileImage: user.profileImage,
          role: user.role,
        },
        chat: {
          _id: chatId,
          storeId: chat.storeId._id,
        },
        readBy: savedMessage.readBy,
      };

      // Emit to all participants in the chat room
      io.to(chat.roomId).emit("new-message", socketMessage);

      // Update analytics asynchronously
      updateChatAnalytics(chat, messageData, user.role).catch(error => 
        console.error("Analytics update error:", error)
      );

      //console.log(`💬 Message sent in chat ${chatId} by ${user.name}`);

    } catch (error) {
      console.error("Send message error:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Handle typing indicators
  socket.on("typing-start", async (data) => {
    try {
      const { chatId } = data;
      
      if (!chatId) return;

      const chat = await Chat.findById(chatId);
      if (!chat) return;

      // Verify user is participant
      const isParticipant = chat.participants.some(
        p => p.userId.toString() === userId && p.isActive
      );

      if (!isParticipant) return;

      // Emit to other participants
      socket.to(chat.roomId).emit("user-typing", {
        chatId,
        userId,
        userName: user.name,
        isTyping: true,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error("Typing start error:", error);
    }
  });

  socket.on("typing-stop", async (data) => {
    try {
      const { chatId } = data;
      
      if (!chatId) return;

      const chat = await Chat.findById(chatId);
      if (!chat) return;

      // Verify user is participant
      const isParticipant = chat.participants.some(
        p => p.userId.toString() === userId && p.isActive
      );

      if (!isParticipant) return;

      // Emit to other participants
      socket.to(chat.roomId).emit("user-typing", {
        chatId,
        userId,
        userName: user.name,
        isTyping: false,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error("Typing stop error:", error);
    }
  });

  // Handle message read status
  socket.on("mark-messages-read", async (data) => {
    try {
      const { chatId } = data;
      
      if (!chatId) {
        socket.emit("error", { message: "Chat ID is required" });
        return;
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        socket.emit("error", { message: "Chat not found" });
        return;
      }

      // Verify user is participant
      const isParticipant = chat.participants.some(
        p => p.userId.toString() === userId && p.isActive
      );

      if (!isParticipant) {
        socket.emit("error", { message: "Access denied to this chat" });
        return;
      }

      // Mark messages as read
      await chat.markAsRead(userId, user.role);

      // Emit read status to other participants
      socket.to(chat.roomId).emit("messages-read", {
        chatId,
        userId,
        readBy: user.name,
        timestamp: new Date(),
      });

      // Confirm to sender
      socket.emit("messages-marked-read", {
        chatId,
        message: "Messages marked as read",
      });

    } catch (error) {
      console.error("Mark messages read error:", error);
      socket.emit("error", { message: "Failed to mark messages as read" });
    }
  });

  // Handle online status updates
  socket.on("update-online-status", async (data) => {
    try {
      const { isOnline = true } = data;
      
      // Broadcast online status to all user's chat rooms
      const userChats = await Chat.find({
        $or: [
          { customerId: userId },
          { storeOwnerId: userId }
        ],
        status: "active",
      });

      for (const chat of userChats) {
        socket.to(chat.roomId).emit("user-online-status", {
          userId,
          userName: user.name,
          isOnline,
          timestamp: new Date(),
        });
      }

    } catch (error) {
      console.error("Online status update error:", error);
    }
  });

  // Handle chat rating (customers only)
  socket.on("rate-chat", async (data) => {
    try {
      const { chatId, rating, feedback } = data;
      
      if (user.role !== "customer") {
        socket.emit("error", { message: "Only customers can rate chats" });
        return;
      }

      if (!chatId || !rating || rating < 1 || rating > 5) {
        socket.emit("error", { message: "Valid chat ID and rating (1-5) are required" });
        return;
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        socket.emit("error", { message: "Chat not found" });
        return;
      }

      if (chat.customerId.toString() !== userId) {
        socket.emit("error", { message: "Access denied" });
        return;
      }

      if (chat.analytics.customerSatisfaction) {
        socket.emit("error", { message: "Chat already rated" });
        return;
      }

      // Update chat rating
      chat.analytics.customerSatisfaction = rating;
      await chat.save();

      // Update analytics
      updateRatingAnalytics(chat, rating).catch(error => 
        console.error("Rating analytics error:", error)
      );

      // Emit rating to store owner
      socket.to(chat.roomId).emit("chat-rated", {
        chatId,
        rating,
        feedback,
        ratedBy: user.name,
        timestamp: new Date(),
      });

      // Confirm to customer
      socket.emit("chat-rating-submitted", {
        chatId,
        rating,
        message: "Thank you for your feedback!",
      });

    } catch (error) {
      console.error("Rate chat error:", error);
      socket.emit("error", { message: "Failed to submit rating" });
    }
  });

  // Handle getting online users in chat
  socket.on("get-chat-online-users", async (data) => {
    try {
      const { chatId } = data;
      
      if (!chatId) {
        socket.emit("error", { message: "Chat ID is required" });
        return;
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        socket.emit("error", { message: "Chat not found" });
        return;
      }

      // Get all sockets in this chat room
      const roomSockets = await io.in(chat.roomId).fetchSockets();
      const onlineUsers = roomSockets.map(s => ({
        userId: s.userId,
        userName: s.user.name,
        userRole: s.user.role,
        profileImage: s.user.profileImage,
      }));

      socket.emit("chat-online-users", {
        chatId,
        onlineUsers,
        count: onlineUsers.length,
      });

    } catch (error) {
      console.error("Get online users error:", error);
      socket.emit("error", { message: "Failed to get online users" });
    }
  });
};

/**
 * Update chat analytics when a message is sent
 * @param {Object} chat - Chat document
 * @param {Object} messageData - Message data
 * @param {string} senderRole - Role of message sender
 */
const updateChatAnalytics = async (chat, messageData, senderRole) => {
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
      direction: senderRole === "store_owner" ? "sent" : "received",
      messageType: messageData.messageType,
      isBlocked: false,
    });

    // Update product inquiry if tagged product exists
    if (chat.taggedProduct.productId) {
      await dailyAnalytics.updateProductInquiry(
        chat.taggedProduct.productId,
        chat.taggedProduct.productName
      );
    }

    // Update weekly and monthly analytics
    const weeklyAnalytics = await ChatAnalytics.getOrCreate(
      storeId,
      storeOwnerId,
      "weekly",
      new Date()
    );
    
    await weeklyAnalytics.updateMessageMetrics({
      direction: senderRole === "store_owner" ? "sent" : "received",
      messageType: messageData.messageType,
      isBlocked: false,
    });

    const monthlyAnalytics = await ChatAnalytics.getOrCreate(
      storeId,
      storeOwnerId,
      "monthly",
      new Date()
    );
    
    await monthlyAnalytics.updateMessageMetrics({
      direction: senderRole === "store_owner" ? "sent" : "received",
      messageType: messageData.messageType,
      isBlocked: false,
    });

  } catch (error) {
    console.error("Analytics update failed:", error);
    throw error;
  }
};

/**
 * Update rating analytics when a chat is rated
 * @param {Object} chat - Chat document
 * @param {number} rating - Rating value (1-5)
 */
const updateRatingAnalytics = async (chat, rating) => {
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
    
    await dailyAnalytics.addCustomerRating(rating);

    // Update weekly analytics
    const weeklyAnalytics = await ChatAnalytics.getOrCreate(
      storeId,
      storeOwnerId,
      "weekly",
      new Date()
    );
    
    await weeklyAnalytics.addCustomerRating(rating);

    // Update monthly analytics
    const monthlyAnalytics = await ChatAnalytics.getOrCreate(
      storeId,
      storeOwnerId,
      "monthly",
      new Date()
    );
    
    await monthlyAnalytics.addCustomerRating(rating);

  } catch (error) {
    console.error("Rating analytics update failed:", error);
    throw error;
  }
};

/**
 * Handle user disconnection from chat
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Individual socket connection
 */
export const handleChatDisconnect = async (io, socket) => {
  try {
    const { userId, user } = socket;
    
    if (!userId || !user) return;

    // Find all chats where user is a participant
    const userChats = await Chat.find({
      $or: [
        { customerId: userId },
        { storeOwnerId: userId }
      ],
      status: "active",
    });

    // Notify other participants in each chat that user went offline
    for (const chat of userChats) {
      socket.to(chat.roomId).emit("user-offline", {
        userId,
        userName: user.name,
        timestamp: new Date(),
      });
    }

    //console.log(`💔 User ${user.name} disconnected from chat system`);

  } catch (error) {
    console.error("Chat disconnect handler error:", error);
  }
};

/**
 * Cleanup old typing indicators
 * @param {Object} io - Socket.IO server instance
 */
export const cleanupTypingIndicators = (io) => {
  const typingUsers = new Map();
  const TYPING_TIMEOUT = 5000; // 5 seconds

  return {
    addTypingUser: (chatId, userId, userName) => {
      const key = `${chatId}_${userId}`;
      
      // Clear existing timeout
      if (typingUsers.has(key)) {
        clearTimeout(typingUsers.get(key).timeout);
      }
      
      // Set new timeout
      const timeout = setTimeout(() => {
        // Auto-stop typing after timeout
        io.to(`chat_${chatId}`).emit("user-typing", {
          chatId,
          userId,
          userName,
          isTyping: false,
          timestamp: new Date(),
        });
        
        typingUsers.delete(key);
      }, TYPING_TIMEOUT);
      
      typingUsers.set(key, { timeout, userName });
    },
    
    removeTypingUser: (chatId, userId) => {
      const key = `${chatId}_${userId}`;
      if (typingUsers.has(key)) {
        clearTimeout(typingUsers.get(key).timeout);
        typingUsers.delete(key);
      }
    },
    
    cleanup: () => {
      for (const [key, data] of typingUsers) {
        clearTimeout(data.timeout);
      }
      typingUsers.clear();
    }
  };
};

/**
 * Initialize chat system utilities
 * @param {Object} io - Socket.IO server instance
 */
export const initializeChatSystem = (io) => {
  const typingManager = cleanupTypingIndicators(io);
  
  // Enhanced typing handlers with auto-cleanup
  const enhancedTypingStart = (socket, data) => {
    const { chatId } = data;
    const { userId, user } = socket;
    
    if (!chatId || !userId) return;
    
    typingManager.addTypingUser(chatId, userId, user.name);
    
    socket.to(`chat_${chatId}`).emit("user-typing", {
      chatId,
      userId,
      userName: user.name,
      isTyping: true,
      timestamp: new Date(),
    });
  };
  
  const enhancedTypingStop = (socket, data) => {
    const { chatId } = data;
    const { userId, user } = socket;
    
    if (!chatId || !userId) return;
    
    typingManager.removeTypingUser(chatId, userId);
    
    socket.to(`chat_${chatId}`).emit("user-typing", {
      chatId,
      userId,
      userName: user.name,
      isTyping: false,
      timestamp: new Date(),
    });
  };
  
  // Return enhanced handlers
  return {
    typingManager,
    enhancedTypingStart,
    enhancedTypingStop,
  };
};

/**
 * Broadcast system messages to chat
 * @param {Object} io - Socket.IO server instance
 * @param {string} chatId - Chat ID
 * @param {string} message - System message
 * @param {string} type - Message type
 */
export const broadcastSystemMessage = async (io, chatId, message, type = "info") => {
  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return;

    const systemMessage = {
      _id: new Date().getTime().toString(), // Temporary ID
      senderId: "system",
      content: message,
      messageType: "system",
      createdAt: new Date(),
      sender: {
        _id: "system",
        name: "System",
        role: "system",
      },
      systemType: type, // info, warning, error, success
    };

    // Emit to all participants in the chat room
    io.to(chat.roomId).emit("system-message", systemMessage);

    //console.log(`📢 System message sent to chat ${chatId}: ${message}`);

  } catch (error) {
    console.error("Broadcast system message error:", error);
  }
};

/**
 * Handle bulk message operations
 * @param {Object} io - Socket.IO server instance
 * @param {string} chatId - Chat ID
 * @param {Array} messageIds - Array of message IDs
 * @param {string} operation - Operation type ('delete', 'archive')
 * @param {string} userId - User performing the operation
 */
export const handleBulkMessageOperation = async (io, chatId, messageIds, operation, userId) => {
  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    // Verify user is participant
    const isParticipant = chat.participants.some(
      p => p.userId.toString() === userId && p.isActive
    );

    if (!isParticipant) {
      throw new Error("Access denied");
    }

    let updatedCount = 0;

    for (const messageId of messageIds) {
      const message = chat.messages.id(messageId);
      if (message && message.senderId.toString() === userId) {
        if (operation === "delete") {
          message.isDeleted = true;
          message.deletedAt = new Date();
          message.content = "[Message deleted]";
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      await chat.save();

      // Emit bulk operation result
      io.to(chat.roomId).emit("bulk-messages-updated", {
        chatId,
        operation,
        messageIds,
        updatedCount,
        performedBy: userId,
        timestamp: new Date(),
      });
    }

    return { success: true, updatedCount };

  } catch (error) {
    console.error("Bulk message operation error:", error);
    throw error;
  }
};

/**
 * Export all chat socket utilities
 */
export default {
  initializeChatHandlers,
  handleChatDisconnect,
  cleanupTypingIndicators,
  initializeChatSystem,
  broadcastSystemMessage,
  handleBulkMessageOperation,
};