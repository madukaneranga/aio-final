import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";

// Constants
const MESSAGE_PAGE_SIZE = 50;
//const DEBUG_MODE = import.meta.env.DEV;
const DEBUG_MODE = false;
const debugLog = (...args) => {
  if (DEBUG_MODE) console.log("[Chat Hook]", ...args);
};

const useChat = (user) => {
  // Core state
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // Refs
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(new Map());
  const isConnectedRef = useRef(false);
  const userIdRef = useRef(null);
  const messageIdsRef = useRef(new Set());
  const reconnectAttemptsRef = useRef(0);
  const joinedRoomsRef = useRef(new Set()); // Track joined rooms
  const markAsReadInProgress = useRef(new Set());

  const API_URL = import.meta.env.VITE_API_URL;

  // CRITICAL: Auto-join all user's chat rooms
  const joinAllChatRooms = useCallback(async () => {
    if (!socketRef.current?.connected || !user?.id) {
      debugLog("❌ Cannot join rooms: socket disconnected or no user");
      return;
    }

    try {
      debugLog("🏠 Joining all chat rooms for user:", user.id);

      // Join each conversation room
      conversations.forEach((conv) => {
        if (!joinedRoomsRef.current.has(conv._id)) {
          debugLog(`🚪 Joining room for conversation: ${conv._id}`);
          socketRef.current.emit("join-chat", { chatId: conv._id });
          joinedRoomsRef.current.add(conv._id);
        }
      });
    } catch (error) {
      debugLog("❌ Error joining chat rooms:", error);
    }
  }, [conversations, user?.id]);

  // Enhanced socket connection
  const connectSocket = useCallback(() => {
    if (!user?.id) {
      debugLog("❌ No user ID provided");
      return;
    }

    if (isConnectedRef.current && socketRef.current?.connected) {
      debugLog("✅ Already connected");
      return;
    }

    debugLog("🔄 Connecting socket for user:", user.id);
    setConnectionStatus("connecting");

    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Clear joined rooms tracking
    joinedRoomsRef.current.clear();

    const socket = io(API_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      forceNew: true,
      timeout: 15000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      debugLog("✅ Socket connected:", socket.id);
      setIsConnected(true);
      setConnectionStatus("connected");
      isConnectedRef.current = true;
      reconnectAttemptsRef.current = 0;

      // CRITICAL: Join all chat rooms immediately after connection
      setTimeout(() => {
        joinAllChatRooms();
      }, 100); // Small delay to ensure socket is fully ready
    });

    socket.on("disconnect", (reason) => {
      debugLog("❌ Socket disconnected:", reason);
      setIsConnected(false);
      setConnectionStatus("disconnected");
      isConnectedRef.current = false;
      joinedRoomsRef.current.clear(); // Clear joined rooms on disconnect
    });

    // ENHANCED: New message handler with detailed logging
    socket.on("new-message", (message) => {
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

      // Update global unread count
      if (isFromOtherUser) {
        setUnreadCount((prev) => {
          const newCount = prev + 1;
          debugLog(`🌍 Global unread count: ${prev} → ${newCount}`);
          return newCount;
        });
      }

      // Update active chat messages
      setActiveChat((current) => {
        if (current && message.chat._id === current._id) {
          debugLog("💬 Adding message to active chat");
          setMessages((prev) => {
            const messageExists = prev.some((msg) => msg._id === message._id);
            if (messageExists) return prev;
            return [...prev, message];
          });
        }
        return current;
      });
    });

    // Chat room join confirmation
    socket.on("chat-joined", (data) => {
      debugLog("✅ Successfully joined chat room:", data.chatId);
      joinedRoomsRef.current.add(data.chatId);
    });

    // Enhanced error handling
    socket.on("error", (error) => {
      debugLog("🚨 Socket error:", error);
      setError({
        type: "socket",
        message: error.message || "Connection error",
        timestamp: Date.now(),
      });
    });

    // Typing indicators
    socket.on("user-typing", (data) => {
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
    });

    return socket;
  }, [user?.id, API_URL, joinAllChatRooms]);

  // Socket connection effect
  useEffect(() => {
    if (!user?.id) return;

    connectSocket();

    return () => {
      debugLog("🧹 Cleaning up socket connection");
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      isConnectedRef.current = false;
      joinedRoomsRef.current.clear();

      if (typingTimeoutRef.current) {
        typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
        typingTimeoutRef.current.clear();
      }

      setTypingUsers(new Map());
      setConnectionStatus("disconnected");
    };
  }, [user?.id, connectSocket]);

  // Auto-join rooms when conversations list updates
  useEffect(() => {
    if (conversations.length > 0 && isConnected) {
      debugLog("📋 Conversations updated, joining rooms...");
      joinAllChatRooms();
    }
  }, [conversations, isConnected, joinAllChatRooms]);

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
      if (!socketRef.current?.connected) {
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

        socketRef.current.emit("send-message", messageData);
        return true;
      } catch (error) {
        debugLog("❌ Send message error:", error);
        return false;
      }
    },
    []
  );

  // Load messages with proper room joining
  const loadMessages = useCallback(
    async (chatId) => {
      try {
        setIsLoading(true);

        debugLog("📖 Loading messages for chat:", chatId);

        const response = await fetch(`${API_URL}/api/chat/${chatId}`, {
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load messages");
        }

        setActiveChat(data.chat);
        setMessages(data.chat.messages || []);

        // CRITICAL: Join this specific chat room
        if (
          socketRef.current?.connected &&
          !joinedRoomsRef.current.has(chatId)
        ) {
          debugLog("🚪 Joining specific chat room:", chatId);
          socketRef.current.emit("join-chat", { chatId });
          joinedRoomsRef.current.add(chatId);
        }

        // Track loaded message IDs
        messageIdsRef.current.clear();
        data.chat.messages?.forEach((msg) => {
          if (msg._id) messageIdsRef.current.add(msg._id);
        });

        return data.chat;
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
    [API_URL]
  );

  // Mark as read
  const markAsRead = useCallback(
    async (chatId) => {
      try {
        debugLog(`📖 Marking chat ${chatId} as read`);

        // Make the API call first
        await fetch(`${API_URL}/api/chat/${chatId}/read`, {
          method: "PUT",
          credentials: "include",
        });

        // Emit socket event
        if (socketRef.current?.connected) {
          socketRef.current.emit("mark-messages-read", { chatId });
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
      }
    },
    [API_URL]
  );

  // Typing functions
  const startTyping = useCallback((chatId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing-start", { chatId });
    }
  }, []);

  const stopTyping = useCallback((chatId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing-stop", { chatId });
    }
  }, []);

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
    debugLog("Socket connected:", isConnectedRef.current);
    debugLog("Socket ID:", socketRef.current?.id);
    debugLog("Joined rooms:", Array.from(joinedRoomsRef.current));
    debugLog("Conversations:", conversations.length);
    debugLog("Total unread:", unreadCount);
    debugLog("Active chat:", activeChat?._id);
    debugLog("Connection status:", connectionStatus);

    if (socketRef.current?.connected) {
      // Test connection
      socketRef.current.emit("ping", { timestamp: Date.now() });
      debugLog("🏓 Sent ping test");
    }
  }, [
    user?.id,
    conversations.length,
    unreadCount,
    activeChat?._id,
    connectionStatus,
  ]);

  const forceReconnect = useCallback(() => {
    debugLog("🔄 Force reconnecting...");
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setTimeout(connectSocket, 1000);
  }, [connectSocket]);

  return {
    // Core state
    conversations,
    activeChat,
    messages,
    unreadCount,
    isConnected,
    isLoading,
    error,
    typingUsers,
    connectionStatus,

    // Functions
    sendMessage,
    loadMessages,
    markAsRead,
    startTyping,
    stopTyping,
    getTypingUsers,

    // Debug tools
    debugChatState,
    forceReconnect,

    // Connection info
    connectionHealth: {
      isConnected,
      status: connectionStatus,
      joinedRooms: Array.from(joinedRoomsRef.current),
    },

    socket: socketRef.current,
  };
};

export default useChat;
