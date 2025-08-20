import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const useChat = (user) => {
  // State declarations
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Map());

  // Refs
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(new Map());
  const isConnectedRef = useRef(false);
  const userIdRef = useRef(null);
  const messageIdsRef = useRef(new Set()); // Track message IDs to prevent duplicates

  const API_URL = import.meta.env.VITE_API_URL;

  // Socket connection effect
  useEffect(() => {
    if (!user?.id) {
      return () => {};
    }

    // Prevent duplicate connections
    if (isConnectedRef.current || userIdRef.current === user.id) {
      return () => {};
    }

    // console.log('🔌 Connecting socket for user:', user.id);
    userIdRef.current = user.id;

    // CRITICAL: Disconnect any existing socket first
    if (socketRef.current) {
      // console.log('🧹 Disconnecting existing socket before creating new one');
      socketRef.current.removeAllListeners(); // Remove all listeners
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Create new socket connection
    const socket = io(API_URL, {
      withCredentials: true,
      transports: ["websocket"],
      forceNew: true, // Force completely new connection
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // console.log("✅ Connected to chat system - Socket ID:", socket.id);
      setIsConnected(true);
      isConnectedRef.current = true;
    });

    socket.on("disconnect", (reason) => {
      // console.log("❌ Disconnected from chat system - Reason:", reason);
      setIsConnected(false);
      isConnectedRef.current = false;
    });

    // CRITICAL: Use socket instance directly to prevent stale closures
    socket.on("new-message", (message) => {
      // console.log('📨 New message received:', message);
      
      // DUPLICATE PREVENTION: Check if we already have this message
      if (messageIdsRef.current.has(message._id)) {
        // console.log('⚠️ Duplicate message detected, skipping:', message._id);
        return;
      }
      
      // Add to tracking set
      messageIdsRef.current.add(message._id);
      
      // Update conversations list
      setConversations(prev => prev.map(conv => {
        if (conv._id === message.chat._id) {
          return {
            ...conv,
            lastMessage: {
              content: message.content || "📎 File attachment",
              senderId: message.sender._id,
              messageType: message.messageType,
              timestamp: message.createdAt,
            },
            unreadCount: message.sender._id !== user.id 
              ? conv.unreadCount + 1 
              : conv.unreadCount,
          };
        }
        return conv;
      }));

      // Update active chat messages
      setActiveChat(current => {
        if (current && message.chat._id === current._id) {
          setMessages(prev => {
            // EXTRA SAFETY: Check if message already exists in current messages
            const messageExists = prev.some(msg => msg._id === message._id);
            if (messageExists) {
              // console.log('⚠️ Message already exists in chat, skipping:', message._id);
              return prev;
            }
            return [...prev, message];
          });
        }
        return current;
      });

      // Update global unread count
      if (message.sender._id !== user.id) {
        setUnreadCount(prev => prev + 1);
      }
    });

    socket.on("user-typing", (data) => {
      if (data.userId === user.id) return;

      // console.log('👤 Typing event:', { userId: data.userId, isTyping: data.isTyping, chatId: data.chatId });

      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const timeoutKey = `${data.chatId}_${data.userId}`;
        
        // ALWAYS clear existing timeout first to prevent conflicts
        if (typingTimeoutRef.current.has(timeoutKey)) {
          clearTimeout(typingTimeoutRef.current.get(timeoutKey));
          typingTimeoutRef.current.delete(timeoutKey);
        }
        
        if (data.isTyping) {
          // Add typing user
          newMap.set(data.userId, {
            userName: data.userName || 'Someone',
            chatId: data.chatId,
          });
          
          // console.log('⏰ Setting timeout for:', timeoutKey);
          
          // Create new timeout with functional state update
          const timeout = setTimeout(() => {
            // console.log('⏰ Timeout triggered for:', timeoutKey);
            setTypingUsers(current => {
              const updated = new Map(current);
              updated.delete(data.userId);
              return updated;
            });
            // Clean up timeout reference
            typingTimeoutRef.current.delete(timeoutKey);
          }, 3000); // Reduced from 5000ms to 3000ms for better UX
          
          typingTimeoutRef.current.set(timeoutKey, timeout);
        } else {
          // User stopped typing - remove immediately
          // console.log('🛑 User stopped typing:', data.userId);
          newMap.delete(data.userId);
        }
        
        return newMap;
      });
    });

    // Other event listeners...
    socket.on("messages-read", (data) => {
      if (data.userId === user.id) return;
      // Handle read receipts...
    });

    socket.on("error", (error) => {
      // console.error('Socket error:', error);
      setError({
        type: 'socket',
        message: error.message || 'Connection error',
      });
    });

    // Cleanup function
    return () => {
      // console.log('🧹 Cleaning up socket connection for user:', user.id);
      
      if (socket) {
        socket.removeAllListeners(); // Remove all listeners first
        if (socket.connected) {
          socket.disconnect();
        }
      }
      
      // Clear refs
      isConnectedRef.current = false;
      userIdRef.current = null;
      messageIdsRef.current.clear(); // Clear message tracking
      
      // CRITICAL: Clear ALL typing timeouts and state
      if (typingTimeoutRef.current) {
        typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
        typingTimeoutRef.current.clear();
      }
      
      // Clear typing users state
      setTypingUsers(new Map());
    };
  }, [user?.id, API_URL]);

  // Data fetching effect
  useEffect(() => {
    if (!user?.id || !isConnected) {
      return () => {};
    }

    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        
        const [conversationsRes, unreadRes] = await Promise.all([
          fetch(`${API_URL}/api/chat/conversations`, { 
            credentials: 'include' 
          }),
          fetch(`${API_URL}/api/chat/unread-count`, { 
            credentials: 'include' 
          })
        ]);

        if (conversationsRes.ok) {
          const convData = await conversationsRes.json();
          setConversations(convData.conversations || []);
        }

        if (unreadRes.ok) {
          const unreadData = await unreadRes.json();
          setUnreadCount(unreadData.unreadCount || 0);
        }
      } catch (error) {
        // console.error('Failed to fetch initial data:', error);
        setError({ 
          type: 'api', 
          message: error.message 
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();

    return () => {};
  }, [user?.id, isConnected, API_URL]);

  // Optional: Add periodic cleanup (every 10 seconds)
  useEffect(() => {
    if (!isConnected) return;
    
    const cleanupInterval = setInterval(() => {
      // Remove any stale typing indicators (basic cleanup)
      setTypingUsers(current => {
        // For more advanced cleanup, you could track timestamps
        // and remove indicators older than a certain threshold
        return new Map(current);
      });
    }, 10000);
    
    return () => clearInterval(cleanupInterval);
  }, [isConnected]);

  // Send message function - PREVENT DOUBLE SENDING
  const sendMessage = useCallback(async (chatId, content, messageType = "text", file = null, receipt = null) => {
    if (!content?.trim() && !file && !receipt) return false;
    if (!socketRef.current?.connected) return false;
    
    try {
      // console.log('📤 Sending message:', { chatId, content });
      
      // ONLY send via socket OR API, not both to prevent duplicates
      socketRef.current.emit("send-message", {
        chatId,
        content: content?.trim(),
        messageType,
        file,
        receipt,
      });

      // DON'T also send via API - that creates duplicates
      // Remove this part or make it conditional for offline fallback only
      
      return true;
    } catch (error) {
      // console.error('Failed to send message:', error);
      setError({
        type: 'send',
        message: error.message,
      });
      return false;
    }
  }, []);

  const loadMessages = useCallback(async (chatId) => {
    try {
      setIsLoading(true);
      
      // Clear typing indicators for previous chat
      setTypingUsers(prev => {
        const newMap = new Map();
        // Only keep typing indicators for the chat we're switching to
        prev.forEach((user, userId) => {
          if (user.chatId === chatId) {
            newMap.set(userId, user);
          }
        });
        return newMap;
      });
      
      const response = await fetch(`${API_URL}/api/chat/${chatId}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load messages');
      }

      setActiveChat(data.chat);
      setMessages(data.chat.messages || []);
      
      // Track loaded message IDs to prevent duplicates
      messageIdsRef.current.clear();
      data.chat.messages?.forEach(msg => {
        if (msg._id) {
          messageIdsRef.current.add(msg._id);
        }
      });

      return data.chat;
    } catch (error) {
      setError({
        type: 'api',
        message: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  const markAsRead = useCallback(async (chatId) => {
    try {
      await fetch(`${API_URL}/api/chat/${chatId}/read`, {
        method: 'PUT',
        credentials: 'include',
      });

      if (socketRef.current?.connected) {
        socketRef.current.emit("mark-messages-read", { chatId });
      }

      setConversations(prev => prev.map(conv => {
        if (conv._id === chatId) {
          const oldUnread = conv.unreadCount || 0;
          setUnreadCount(current => Math.max(0, current - oldUnread));
          return { ...conv, unreadCount: 0 };
        }
        return conv;
      }));

    } catch (error) {
      // console.error('Failed to mark as read:', error);
    }
  }, [API_URL]);

  const joinChatRoom = useCallback((chatId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("join-chat", { chatId });
    }
  }, []);

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

  const getTypingUsers = useCallback((chatId) => {
    if (!chatId) return [];
    return Array.from(typingUsers.values()).filter(user => user.chatId === chatId);
  }, [typingUsers]);

  // Optional: Add a typing cleanup function you can call manually
  const clearAllTypingIndicators = useCallback(() => {
    // Clear all timeouts
    typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    typingTimeoutRef.current.clear();
    
    // Clear typing users state
    setTypingUsers(new Map());
  }, []);

  return {
    conversations,
    activeChat,
    messages,
    unreadCount,
    isConnected,
    isLoading,
    error,
    typingUsers,
    sendMessage,
    loadMessages,
    markAsRead,
    joinChatRoom,
    startTyping,
    stopTyping,
    getTypingUsers,
    clearAllTypingIndicators, // Added this utility function
    socket: socketRef.current,
  };
};

export default useChat;