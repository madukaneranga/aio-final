import { useState, useCallback, useRef, useEffect } from 'react';

const MESSAGE_PAGE_SIZE = 20;
const SCROLL_THRESHOLD = 100; // Distance from top to trigger load more

const useMessagePagination = (chatId, API_URL) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [totalMessages, setTotalMessages] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [oldestMessageId, setOldestMessageId] = useState(null);
  
  // Refs for tracking
  const messageIdsRef = useRef(new Set());
  const loadedPagesRef = useRef(new Set());
  const lastChatIdRef = useRef(null);

  // Reset state when chatId changes
  useEffect(() => {
    if (chatId !== lastChatIdRef.current) {
      setMessages([]);
      setCurrentPage(1);
      setHasMore(true);
      setOldestMessageId(null);
      setTotalMessages(0);
      messageIdsRef.current.clear();
      loadedPagesRef.current.clear();
      lastChatIdRef.current = chatId;
      setError(null);
    }
  }, [chatId]);

  // Load initial messages (most recent)
  const loadInitialMessages = useCallback(async () => {
    if (!chatId || isLoading) return null;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/api/chat/${chatId}?page=1&limit=${MESSAGE_PAGE_SIZE}`, 
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      const chatData = data.chat;
      const newMessages = chatData.messages || [];

      // Track message IDs to prevent duplicates
      messageIdsRef.current.clear();
      newMessages.forEach(msg => {
        if (msg._id) messageIdsRef.current.add(msg._id);
      });

      setMessages(newMessages);
      setTotalMessages(data.pagination?.total || newMessages.length);
      setHasMore(newMessages.length === MESSAGE_PAGE_SIZE);
      
      if (newMessages.length > 0) {
        setOldestMessageId(newMessages[0]._id);
      }

      loadedPagesRef.current.add(1);
      return chatData;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [chatId, API_URL, isLoading]);

  // Load more messages (older ones)
  const loadMoreMessages = useCallback(async () => {
    if (!chatId || !hasMore || isLoadingMore || !oldestMessageId) return;

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;

      // Skip if page already loaded
      if (loadedPagesRef.current.has(nextPage)) {
        setIsLoadingMore(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/api/chat/${chatId}?page=${nextPage}&limit=${MESSAGE_PAGE_SIZE}&before=${oldestMessageId}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to load more messages');
      }

      const data = await response.json();
      const newMessages = data.chat?.messages || [];
      
      // Filter out duplicates
      const uniqueMessages = newMessages.filter(msg => 
        msg._id && !messageIdsRef.current.has(msg._id)
      );

      if (uniqueMessages.length > 0) {
        // Add new message IDs to tracking
        uniqueMessages.forEach(msg => {
          messageIdsRef.current.add(msg._id);
        });

        // Prepend older messages to the beginning
        setMessages(prevMessages => [...uniqueMessages, ...prevMessages]);
        setOldestMessageId(uniqueMessages[0]._id);
        setCurrentPage(nextPage);
        loadedPagesRef.current.add(nextPage);
      }

      // Check if there are more messages
      setHasMore(uniqueMessages.length === MESSAGE_PAGE_SIZE);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, API_URL, hasMore, isLoadingMore, oldestMessageId, currentPage]);

  // Add a new message to the current messages (for real-time updates)
  const addMessage = useCallback((message) => {
    if (!message?._id || messageIdsRef.current.has(message._id)) {
      return; // Skip duplicates
    }

    messageIdsRef.current.add(message._id);
    setMessages(prevMessages => [...prevMessages, message]);
    setTotalMessages(prev => prev + 1);
  }, []);

  // Remove a message (for deletions)
  const removeMessage = useCallback((messageId) => {
    messageIdsRef.current.delete(messageId);
    setMessages(prevMessages => 
      prevMessages.filter(msg => msg._id !== messageId)
    );
    setTotalMessages(prev => Math.max(0, prev - 1));
  }, []);

  // Update a message (for edits)
  const updateMessage = useCallback((messageId, updates) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg._id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Get scroll handler for infinite scroll
  const getScrollHandler = useCallback((scrollContainerRef) => {
    return () => {
      if (!scrollContainerRef.current || isLoadingMore || !hasMore) return;

      const { scrollTop } = scrollContainerRef.current;
      
      // Load more when near the top
      if (scrollTop <= SCROLL_THRESHOLD) {
        loadMoreMessages();
      }
    };
  }, [loadMoreMessages, isLoadingMore, hasMore]);

  // Clear all messages (for cleanup)
  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentPage(1);
    setHasMore(true);
    setOldestMessageId(null);
    setTotalMessages(0);
    messageIdsRef.current.clear();
    loadedPagesRef.current.clear();
    setError(null);
  }, []);

  return {
    // State
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    totalMessages,
    currentPage,

    // Actions
    loadInitialMessages,
    loadMoreMessages,
    addMessage,
    removeMessage,
    updateMessage,
    clearMessages,

    // Utilities
    getScrollHandler,
    
    // Meta info
    messageCount: messages.length,
    loadedPages: Array.from(loadedPagesRef.current),
  };
};

export default useMessagePagination;