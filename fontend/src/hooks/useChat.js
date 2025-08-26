import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useGlobalChat } from "../contexts/ChatContext";

// Constants
const MESSAGE_PAGE_SIZE = 50;
//const DEBUG_MODE = import.meta.env.DEV;
const DEBUG_MODE = true;
const debugLog = (...args) => {
  if (DEBUG_MODE) console.log("[Chat Hook]", ...args);
};

const useChat = (user) => {
  // Get global socket from ChatContext
  const { socket: globalSocket, isConnected: globalIsConnected, globalUnreadCount, updateUnreadCount } = useGlobalChat();
  
  // Core state
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Map());

  // Refs
  const typingTimeoutRef = useRef(new Map());
  const messageIdsRef = useRef(new Set());
  const joinedRoomsRef = useRef(new Set()); // Track joined rooms
  const markAsReadInProgress = useRef(new Set());

  const API_URL = import.meta.env.VITE_API_URL;

  // CRITICAL: Auto-join all user's chat rooms
  const joinAllChatRooms = useCallback(async () => {
    if (!globalSocket?.connected || !user?.id) {
      debugLog("❌ Cannot join rooms: socket disconnected or no user");
      return;
    }

    try {
      debugLog("🏠 Joining all chat rooms for user:", user.id);

      // Join each conversation room
      conversations.forEach((conv) => {
        if (!joinedRoomsRef.current.has(conv._id)) {
          debugLog(`🚪 Joining room for conversation: ${conv._id}`);
          globalSocket.emit("join-chat", { chatId: conv._id });
          joinedRoomsRef.current.add(conv._id);
        }
      });
    } catch (error) {
      debugLog("❌ Error joining chat rooms:", error);
    }
  }, [conversations, user?.id, globalSocket]);

  // Setup socket event listeners when global socket is available
  useEffect(() => {
    if (!globalSocket || !user?.id) return;

    debugLog("🔗 Setting up socket event listeners for useChat");

    // ENHANCED: New message handler with detailed logging and pagination support
    const handleNewMessage = (message) => {
      debugLog("📥 NEW MESSAGE RECEIVED:", {
        messageId: message._id,
        chatId: message.chat._id,
        senderId: message.sender._id,
        senderName: message.sender.name,
        currentUserId: user.id,
        content: message.content?.slice(0, 50),
        timestamp: new Date().toISOString(),
      });

      // Check for duplicates
      if (messageIdsRef.current.has(message._id)) {
        debugLog("🔄 Duplicate message ignored:", message._id);
        return;
      }

      messageIdsRef.current.add(message._id);

      const isFromOtherUser = message.sender._id !== user.id;
      debugLog("📊 Message analysis:", {
        isFromOtherUser,
        willUpdateUnread: isFromOtherUser,
      });

      // Update conversations list
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv._id === message.chat._id) {
            const oldUnread = conv.unreadCount || 0;
            const newUnread = isFromOtherUser ? oldUnread + 1 : oldUnread;

            debugLog(
              `📈 Conversation ${conv._id} unread: ${oldUnread} → ${newUnread}`
            );

            return {
              ...conv,
              lastMessage: {
                content: message.content || "📎 File attachment",
                senderId: message.sender._id,
                messageType: message.messageType,
                timestamp: message.createdAt,
              },
              unreadCount: newUnread,
            };
          }
          return conv;
        });

        return updated;
      });

      // Update active chat messages
      setActiveChat((current) => {
        if (current && message.chat._id === current._id) {
          debugLog("💬 Adding message to active chat");
          setMessages((prev) => {
            const messageExists = prev.some((msg) => msg._id === message._id);
            if (messageExists) return prev;
            // Append new message to the end (most recent)
            return [...prev, message];
          });
        }
        return current;
      });
    };

    // Chat room join confirmation
    const handleChatJoined = (data) => {
      debugLog("✅ Successfully joined chat room:", data.chatId);
      joinedRoomsRef.current.add(data.chatId);
    };

    // Typing indicators
    const handleUserTyping = (data) => {
      if (data.userId === user.id) return;

      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        const timeoutKey = `${data.chatId}_${data.userId}`;

        if (typingTimeoutRef.current.has(timeoutKey)) {
          clearTimeout(typingTimeoutRef.current.get(timeoutKey));
          typingTimeoutRef.current.delete(timeoutKey);
        }

        if (data.isTyping) {
          newMap.set(data.userId, {
            userName: data.userName || "Someone",
            chatId: data.chatId,
          });

          const timeout = setTimeout(() => {
            setTypingUsers((current) => {
              const updated = new Map(current);
              updated.delete(data.userId);
              return updated;
            });
            typingTimeoutRef.current.delete(timeoutKey);
          }, 3000);

          typingTimeoutRef.current.set(timeoutKey, timeout);
        } else {
          newMap.delete(data.userId);
        }

        return newMap;
      });
    };

    // Add event listeners
    globalSocket.on("new-message", handleNewMessage);
    globalSocket.on("chat-joined", handleChatJoined);
    globalSocket.on("user-typing", handleUserTyping);

    // Join rooms when socket is connected
    if (globalSocket.connected) {
      joinAllChatRooms();
    }

    return () => {
      // Cleanup listeners
      globalSocket.off("new-message", handleNewMessage);
      globalSocket.off("chat-joined", handleChatJoined);
      globalSocket.off("user-typing", handleUserTyping);
    };
  }, [globalSocket, user?.id, joinAllChatRooms]);

  // Auto-join rooms when conversations list updates
  useEffect(() => {
    if (conversations.length > 0 && globalIsConnected) {
      debugLog("📋 Conversations updated, joining rooms...");
      joinAllChatRooms();
    }
  }, [conversations, globalIsConnected, joinAllChatRooms]);

  // Data fetching effect
  useEffect(() => {
    if (!user?.id) return;

    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        debugLog("📊 Fetching initial chat data...");

        const [conversationsRes, unreadRes] = await Promise.all([
          fetch(`${API_URL}/api/chat/conversations?limit=50`, {
            credentials: "include",
          }),
          fetch(`${API_URL}/api/chat/unread-count`, {
            credentials: "include",
          }),
        ]);

        if (conversationsRes.ok) {
          const convData = await conversationsRes.json();
          debugLog(
            "📋 Loaded conversations:",
            convData.conversations?.length || 0
          );
          setConversations(convData.conversations || []);
        }

        if (unreadRes.ok) {
          const unreadData = await unreadRes.json();
          debugLog("🔔 Initial unread count:", unreadData.unreadCount);
          setUnreadCount(unreadData.unreadCount || 0);
        }
      } catch (error) {
        debugLog("❌ Failed to fetch initial data:", error);
        setError({
          type: "api",
          message: error.message,
          timestamp: Date.now(),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [user?.id, API_URL]);

  // Send message function
  const sendMessage = useCallback(
    async (
      chatId,
      content,
      messageType = "text",
      file = null,
      receipt = null
    ) => {
      if (!content?.trim() && !file && !receipt) return false;
      if (!globalSocket?.connected) {
        debugLog("❌ Cannot send message: socket not connected");
        return false;
      }

      try {
        debugLog("📤 Sending message:", {
          chatId,
          content: content?.slice(0, 50),
          messageType,
        });

        const messageData = {
          chatId,
          content: content?.trim(),
          messageType,
          file,
          receipt,
          tempId: `temp_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
        };

        globalSocket.emit("send-message", messageData);
        return true;
      } catch (error) {
        debugLog("❌ Send message error:", error);
        return false;
      }
    },
    [globalSocket]
  );

  // Load messages with proper room joining (updated for pagination)
  const loadMessages = useCallback(
    async (chatId, page = 1, limit = MESSAGE_PAGE_SIZE) => {
      try {
        setIsLoading(true);

        debugLog("📖 Loading messages for chat:", chatId, "page:", page);

        const url = `${API_URL}/api/chat/${chatId}?page=${page}&limit=${limit}`;
        const response = await fetch(url, {
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load messages");
        }

        setActiveChat(data.chat);
        
        // For first page, replace messages. For subsequent pages, prepend them
        if (page === 1) {
          setMessages(data.chat.messages || []);
          messageIdsRef.current.clear();
        } else {
          setMessages(prev => {
            const newMessages = data.chat.messages || [];
            const existingIds = new Set(prev.map(m => m._id));
            const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m._id));
            return [...uniqueNewMessages, ...prev];
          });
        }

        // CRITICAL: Join this specific chat room
        if (
          globalSocket?.connected &&
          !joinedRoomsRef.current.has(chatId)
        ) {
          debugLog("🚪 Joining specific chat room:", chatId);
          globalSocket.emit("join-chat", { chatId });
          joinedRoomsRef.current.add(chatId);
        }

        // Track loaded message IDs
        data.chat.messages?.forEach((msg) => {
          if (msg._id) messageIdsRef.current.add(msg._id);
        });

        return {
          chat: data.chat,
          pagination: data.pagination,
        };
      } catch (error) {
        debugLog("❌ Load messages error:", error);
        setError({
          type: "api",
          message: error.message,
          timestamp: Date.now(),
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [API_URL, globalSocket]
  );

  // Mark as read
  const markAsRead = useCallback(
    async (chatId) => {
      try {
        debugLog(`📖 Marking chat ${chatId} as read`);

        // Prevent duplicate API calls
        if (markAsReadInProgress.current.has(chatId)) {
          debugLog(`🔄 Mark as read already in progress for chat: ${chatId}`);
          return;
        }

        markAsReadInProgress.current.add(chatId);

        // Make the API call first
        const response = await fetch(`${API_URL}/api/chat/${chatId}/read`, {
          method: "PUT",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error('Failed to mark messages as read');
        }

        // Emit socket event
        if (globalSocket?.connected) {
          globalSocket.emit("mark-messages-read", { chatId });
          // Also emit for global state update
          globalSocket.emit("messages-marked-read", { chatId, userId: user.id });
        }

        // Update conversations and unread count atomically
        setConversations((prev) => {
          // Find the target conversation and get its unread count
          const targetConversation = prev.find((c) => c._id === chatId);
          const chatUnreadCount = targetConversation?.unreadCount || 0;

          debugLog(`Found conversation with unread count: ${chatUnreadCount}`);

          // Update global unread count immediately
          if (chatUnreadCount > 0) {
            setUnreadCount((current) => {
              const newCount = Math.max(0, current - chatUnreadCount);
              debugLog(
                `🌍 Global unread count updated: ${current} → ${newCount}`
              );
              return newCount;
            });
          }

          // Return updated conversations with reset unread count
          return prev.map((conv) =>
            conv._id === chatId ? { ...conv, unreadCount: 0 } : conv
          );
        });
      } catch (error) {
        debugLog("❌ Failed to mark as read:", error);
        setError({
          type: "api",
          message: error.message || "Failed to mark messages as read",
          timestamp: Date.now(),
        });
      } finally {
        // Always remove from in-progress set
        markAsReadInProgress.current.delete(chatId);
      }
    },
    [API_URL, globalSocket, user?.id]
  );

  // Typing functions
  const startTyping = useCallback((chatId) => {
    if (globalSocket?.connected) {
      globalSocket.emit("typing-start", { chatId });
    }
  }, [globalSocket]);

  const stopTyping = useCallback((chatId) => {
    if (globalSocket?.connected) {
      globalSocket.emit("typing-stop", { chatId });
    }
  }, [globalSocket]);

  const getTypingUsers = useCallback(
    (chatId) => {
      if (!chatId) return [];
      return Array.from(typingUsers.values()).filter(
        (user) => user.chatId === chatId
      );
    },
    [typingUsers]
  );

  // Debug functions
  const debugChatState = useCallback(() => {
    debugLog("=== CHAT STATE DEBUG ===");
    debugLog("User ID:", user?.id);
    debugLog("Socket connected:", globalSocket?.connected);
    debugLog("Socket ID:", globalSocket?.id);
    debugLog("Joined rooms:", Array.from(joinedRoomsRef.current));
    debugLog("Conversations:", conversations.length);
    debugLog("Total unread:", unreadCount);
    debugLog("Global unread:", globalUnreadCount);
    debugLog("Active chat:", activeChat?._id);

    if (globalSocket?.connected) {
      // Test connection
      globalSocket.emit("ping", { timestamp: Date.now() });
      debugLog("🏓 Sent ping test");
    }
  }, [
    user?.id,
    conversations.length,
    unreadCount,
    globalUnreadCount,
    activeChat?._id,
    globalSocket,
  ]);

  const forceReconnect = useCallback(() => {
    debugLog("🔄 Note: Using global socket, cannot force reconnect from useChat");
  }, []);

  // Add pagination support functions
  const loadOlderMessages = useCallback(
    async (chatId, beforeMessageId) => {
      try {
        debugLog("📖 Loading older messages for chat:", chatId, "before:", beforeMessageId);

        const url = `${API_URL}/api/chat/${chatId}?before=${beforeMessageId}&limit=${MESSAGE_PAGE_SIZE}`;
        const response = await fetch(url, {
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load older messages");
        }

        const olderMessages = data.chat.messages || [];
        
        if (olderMessages.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m._id));
            const uniqueOlderMessages = olderMessages.filter(m => !existingIds.has(m._id));
            return [...uniqueOlderMessages, ...prev];
          });

          // Track loaded message IDs
          olderMessages.forEach((msg) => {
            if (msg._id) messageIdsRef.current.add(msg._id);
          });
        }

        return {
          messages: olderMessages,
          hasMore: data.pagination?.hasMore || false,
        };
      } catch (error) {
        debugLog("❌ Load older messages error:", error);
        throw error;
      }
    },
    [API_URL]
  );

  return {
    // Core state
    conversations,
    activeChat,
    messages,
    unreadCount,
    isConnected: globalIsConnected,
    isLoading,
    error,
    typingUsers,

    // Functions
    sendMessage,
    loadMessages,
    loadOlderMessages, // New pagination function
    markAsRead,
    startTyping,
    stopTyping,
    getTypingUsers,

    // Debug tools
    debugChatState,
    forceReconnect,

    // Connection info
    connectionHealth: {
      isConnected: globalIsConnected,
      joinedRooms: Array.from(joinedRoomsRef.current),
    },

    socket: globalSocket,
  };
};

export default useChat;
