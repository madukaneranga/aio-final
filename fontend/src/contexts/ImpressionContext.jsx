import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const ImpressionContext = createContext();

export const useImpressionContext = () => {
  const context = useContext(ImpressionContext);
  if (!context) {
    throw new Error('useImpressionContext must be used within an ImpressionProvider');
  }
  return context;
};

// Generate a unique session ID
const generateSessionId = () => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Get or create session ID from localStorage
const getSessionId = () => {
  let sessionId = localStorage.getItem('impressionSessionId');
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('impressionSessionId', sessionId);
  }
  return sessionId;
};

// Get viewport size
const getViewportSize = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
};

// Determine source context based on current URL
const getSourceContext = () => {
  const path = window.location.pathname;
  const search = window.location.search;
  
  if (path === '/') return 'home';
  if (path.includes('/products')) {
    if (search.includes('category=')) return 'category';
    if (search.includes('search=')) return 'search';
    return 'products';
  }
  if (path.includes('/services')) {
    if (search.includes('category=')) return 'category';
    if (search.includes('search=')) return 'search';
    return 'services';
  }
  if (path.includes('/stores')) return 'stores';
  if (path.includes('/store/')) return 'store_page';
  if (path.includes('/wishlist')) return 'wishlist';
  
  return 'home';
};

const BATCH_SIZE = 10;
const BATCH_TIMEOUT = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;

export const ImpressionProvider = ({ children }) => {
  const { user } = useAuth();
  const [sessionId] = useState(() => getSessionId());
  const impressionQueue = useRef([]);
  const batchTimeout = useRef(null);
  const trackedItems = useRef(new Set());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [stats, setStats] = useState({
    totalImpressions: 0,
    successfulBatches: 0,
    failedBatches: 0
  });

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process any queued impressions when back online
      if (impressionQueue.current.length > 0) {
        processBatch();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Clear tracked items when session changes or user logs in/out
  useEffect(() => {
    trackedItems.current.clear();
  }, [sessionId, user?._id]);

  // Send impressions to API
  const sendImpressions = async (impressions, retryCount = 0) => {
    if (impressions.length === 0) return { success: true };
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/impressions/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          impressions
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalImpressions: prev.totalImpressions + result.successful,
        successfulBatches: prev.successfulBatches + 1
      }));

      return { success: true, result };
    } catch (error) {
      console.warn('Failed to send impressions:', error);
      
      // Retry logic
      if (retryCount < MAX_RETRY_ATTEMPTS && isOnline) {
        console.log(`Retrying impression batch (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return sendImpressions(impressions, retryCount + 1);
      }
      
      // Update failed stats
      setStats(prev => ({
        ...prev,
        failedBatches: prev.failedBatches + 1
      }));

      return { success: false, error };
    }
  };

  // Process the impression queue
  const processBatch = async () => {
    if (impressionQueue.current.length === 0 || !isOnline) return;
    
    const batch = impressionQueue.current.splice(0, BATCH_SIZE);
    const result = await sendImpressions(batch);
    
    if (!result.success) {
      // Re-queue failed impressions for retry
      impressionQueue.current.unshift(...batch);
    }
    
    // Clear timeout
    if (batchTimeout.current) {
      clearTimeout(batchTimeout.current);
      batchTimeout.current = null;
    }
    
    // Schedule next batch if there are more items
    if (impressionQueue.current.length > 0 && isOnline) {
      batchTimeout.current = setTimeout(processBatch, BATCH_TIMEOUT);
    }
  };

  // Add impression to queue
  const queueImpression = (impression) => {
    impressionQueue.current.push(impression);
    
    // Process batch if we've reached the batch size and we're online
    if (impressionQueue.current.length >= BATCH_SIZE && isOnline) {
      processBatch();
    } else if (isOnline) {
      // Schedule batch processing if not already scheduled
      if (!batchTimeout.current) {
        batchTimeout.current = setTimeout(processBatch, BATCH_TIMEOUT);
      }
    }
  };

  // Send any remaining impressions when page is about to unload
  const handleBeforeUnload = () => {
    if (impressionQueue.current.length > 0) {
      // Use sendBeacon for reliability during page unload
      if (navigator.sendBeacon) {
        const data = JSON.stringify({ impressions: impressionQueue.current });
        const headers = new Headers({ 'Content-Type': 'application/json' });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(`${import.meta.env.VITE_API_URL}/api/impressions/batch`, blob);
      } else {
        // Fallback to synchronous request
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${import.meta.env.VITE_API_URL}/api/impressions/batch`, false);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send(JSON.stringify({ impressions: impressionQueue.current }));
        } catch (error) {
          console.warn('Failed to send final impression batch:', error);
        }
      }
      impressionQueue.current = [];
    }
  };

  // Set up page unload handlers
  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      
      // Clean up timeout
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }
    };
  }, []);

  const trackProductImpression = (product, source = null) => {
    if (!product || !product._id) return;
    
    const key = `product-${product._id}`;
    if (trackedItems.current.has(key)) return; // Already tracked in this session
    
    trackedItems.current.add(key);
    
    const impression = {
      sessionId,
      itemType: 'product',
      itemId: product._id,
      userId: user?._id || null,
      source: source || getSourceContext(),
      viewportSize: getViewportSize()
    };
    
    queueImpression(impression);
  };

  const trackServiceImpression = (service, source = null) => {
    if (!service || !service._id) return;
    
    const key = `service-${service._id}`;
    if (trackedItems.current.has(key)) return; // Already tracked in this session
    
    trackedItems.current.add(key);
    
    const impression = {
      sessionId,
      itemType: 'service',
      itemId: service._id,
      userId: user?._id || null,
      source: source || getSourceContext(),
      viewportSize: getViewportSize()
    };
    
    queueImpression(impression);
  };

  const trackStoreImpression = (store, source = null) => {
    if (!store || !store._id) return;
    
    const key = `store-${store._id}`;
    if (trackedItems.current.has(key)) return; // Already tracked in this session
    
    trackedItems.current.add(key);
    
    const impression = {
      sessionId,
      itemType: 'store',
      itemId: store._id,
      userId: user?._id || null,
      source: source || getSourceContext(),
      viewportSize: getViewportSize()
    };
    
    queueImpression(impression);
  };

  // Generic impression observer creator
  const createImpressionObserver = (callback, options = {}) => {
    const defaultOptions = {
      threshold: 0.5, // 50% visible
      rootMargin: '0px'
    };
    
    const observerOptions = { ...defaultOptions, ...options };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Add a small delay to ensure the item was actually viewed
          setTimeout(() => {
            if (entry.target.offsetParent !== null) { // Still visible
              callback(entry.target);
            }
          }, 1000); // 1 second delay
          
          // Stop observing this element
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);
    
    return observer;
  };

  // Flush any remaining impressions manually
  const flushImpressions = () => {
    if (impressionQueue.current.length > 0) {
      processBatch();
    }
  };

  // Get current session stats
  const getSessionStats = () => {
    return {
      ...stats,
      queuedImpressions: impressionQueue.current.length,
      trackedItems: trackedItems.current.size,
      sessionId,
      isOnline
    };
  };

  const value = {
    trackProductImpression,
    trackServiceImpression,
    trackStoreImpression,
    createImpressionObserver,
    flushImpressions,
    getSessionStats,
    sessionId,
    isOnline
  };

  return (
    <ImpressionContext.Provider value={value}>
      {children}
    </ImpressionContext.Provider>
  );
};