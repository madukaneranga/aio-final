import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const ChatContext = createContext();

export const useGlobalChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useGlobalChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const userRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL;

  // Initialize socket connection
  const initializeSocket = useCallback((user) => {
    if (!user?.id) {
      console.log('❌ Cannot initialize socket: no user ID');
      return;
    }

    if (userRef.current?.id === user.id && socketRef.current?.connected) {
      console.log('✅ Socket already initialized for user:', user.id);
      return;
    }

    console.log('🔄 Initializing global chat socket for user:', user.id);
    userRef.current = user;
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔗 Global chat socket connected for user:', user.id);
      setIsConnected(true);
      // Fetch initial unread count
      setTimeout(() => {
        fetchUnreadCount();
      }, 200); // Small delay to prevent race conditions
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for global unread count updates
    socket.on('unread-count-updated', (data) => {
      console.log('🔔 Backend unread count event received:', data.unreadCount);
      setGlobalUnreadCount(prevCount => {
        console.log('🔄 Updating count:', prevCount, '→', data.unreadCount);
        return data.unreadCount || 0;
      });
    });

    // Listen for new messages - immediate increment, backend will send authoritative count
    socket.on('new-message', (message) => {
      if (message.sender._id !== user.id) {
        console.log('📥 New message received from:', message.sender.name);
        // Immediate increment for better UX
        setGlobalUnreadCount(prev => {
          const newCount = prev + 1;
          console.log('🔔 Temporary increment:', prev, '→', newCount, '(waiting for backend)');
          return newCount;
        });
      }
    });

    // Listen for messages being marked as read
    socket.on('messages-marked-read', (data) => {
      console.log('📖 Messages marked as read, updating global count');
      // Slight delay to ensure backend processing is complete
      setTimeout(() => {
        fetchUnreadCount();
      }, 50);
    });
  }, [API_URL]);

  const fetchUnreadCount = async () => {
    if (!userRef.current?.id) {
      console.log('❌ Cannot fetch unread count: no user');
      return;
    }

    try {
      console.log('🔄 Fetching unread count for user:', userRef.current.id);
      const response = await fetch(`${API_URL}/api/chat/unread-count`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fetched unread count:', data.unreadCount);
        setGlobalUnreadCount(data.unreadCount || 0);
      } else {
        console.error('❌ Failed to fetch unread count - HTTP', response.status);
      }
    } catch (error) {
      console.error('❌ Failed to fetch unread count:', error);
    }
  };

  // Function to manually update unread count (for immediate feedback)
  const updateUnreadCount = (newCount) => {
    setGlobalUnreadCount(newCount);
  };

  // Function to decrement unread count when marking as read
  const decrementUnreadCount = (chatId, count = 1) => {
    setGlobalUnreadCount(prev => Math.max(0, prev - count));
    
    // Emit socket event to notify other components
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat-read-notification', { chatId, count });
    }
  };

  const value = {
    globalUnreadCount,
    isConnected,
    initializeSocket,
    updateUnreadCount,
    decrementUnreadCount,
    fetchUnreadCount,
    socket: socketRef.current, // Expose socket for other components to use
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};