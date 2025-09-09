import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const useSocket = (namespace = '/') => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastActivity, setLastActivity] = useState(null);

  useEffect(() => {
    if (!user) {
      // Disconnect socket if user is not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Initialize socket connection
    const initSocket = () => {
      try {
        const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:10000';
        
        socketRef.current = io(serverUrl + namespace, {
          withCredentials: true,
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true,
          auth: {
            userId: user.id,
            role: user.role
          }
        });

        // Connection event handlers
        socketRef.current.on('connect', () => {
          console.log('Socket connected:', socketRef.current.id);
          setIsConnected(true);
          setConnectionError(null);
          setLastActivity(new Date());
        });

        socketRef.current.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          setIsConnected(false);
          setLastActivity(new Date());
          
          if (reason === 'io server disconnect') {
            // Server initiated disconnect, try to reconnect
            setTimeout(() => {
              if (socketRef.current) {
                socketRef.current.connect();
              }
            }, 1000);
          }
        });

        socketRef.current.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setConnectionError(error.message);
          setIsConnected(false);
          
          // Show error toast for admin users
          if (user.role === 'admin') {
            toast.error('Real-time connection failed. Some features may be limited.');
          }
        });

        socketRef.current.on('error', (error) => {
          console.error('Socket error:', error);
          setConnectionError(error.message || 'Socket error occurred');
        });

        // Heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('ping');
            setLastActivity(new Date());
          }
        }, 30000);

        // Cleanup heartbeat on disconnect
        socketRef.current.on('disconnect', () => {
          clearInterval(heartbeat);
        });

        // Handle pong response
        socketRef.current.on('pong', () => {
          setLastActivity(new Date());
        });

      } catch (error) {
        console.error('Failed to initialize socket:', error);
        setConnectionError(error.message);
      }
    };

    initSocket();

    // Cleanup on unmount or user change
    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [user, namespace]);

  // Socket event subscription hook
  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  // Socket event unsubscription hook
  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  // Emit event to server
  const emit = (event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
      setLastActivity(new Date());
      return true;
    }
    return false;
  };

  // Join a room
  const joinRoom = (roomId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join-room', roomId);
      console.log(`Joined room: ${roomId}`);
    }
  };

  // Leave a room
  const leaveRoom = (roomId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave-room', roomId);
      console.log(`Left room: ${roomId}`);
    }
  };

  // Manual reconnection
  const reconnect = () => {
    if (socketRef.current) {
      if (socketRef.current.connected) {
        socketRef.current.disconnect();
      }
      setTimeout(() => {
        socketRef.current.connect();
      }, 100);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    lastActivity,
    on,
    off,
    emit,
    joinRoom,
    leaveRoom,
    reconnect
  };
};

export default useSocket;