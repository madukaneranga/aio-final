import React, { createContext, useContext, useState, useEffect } from 'react';
import { wishlistAPI } from '../utils/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children, showToast }) => {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncPending, setSyncPending] = useState(false);

  // Initialize wishlist data
  useEffect(() => {
    const initializeWishlist = async () => {
      if (!user) {
        // Load from localStorage for guests
        const savedWishlist = localStorage.getItem('wishlist');
        if (savedWishlist) {
          setWishlistItems(JSON.parse(savedWishlist));
        }
        return;
      }

      // Load from API for authenticated users
      try {
        setIsLoading(true);
        const response = await wishlistAPI.getWishlist();
        if (response.success) {
          setWishlistItems(response.wishlist.items || []);
        }
      } catch (error) {
        console.error('Failed to load wishlist:', error);
        // Fallback to localStorage on error
        const savedWishlist = localStorage.getItem('wishlist');
        if (savedWishlist) {
          setWishlistItems(JSON.parse(savedWishlist));
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeWishlist();
  }, [user]);

  // Save to localStorage for offline/guest users
  useEffect(() => {
    if (!user || isOffline) {
      localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
    }
  }, [wishlistItems, user, isOffline]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (syncPending && user) {
        syncWishlistWithServer();
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPending, user]);

  const syncWishlistWithServer = async () => {
    if (!user || isOffline) return;
    
    try {
      // This would sync localStorage data with server
      // Implementation depends on your sync strategy
      setSyncPending(false);
    } catch (error) {
      console.error('Failed to sync wishlist:', error);
    }
  };

  // Add item to wishlist
  const addToWishlist = async (item, priority = 'medium', notes = '') => {
    try {
      const itemData = {
        itemType: item.type || 'product', // Use the type field directly
        itemId: item._id,
        priority,
        notes,
      };

      if (user && !isOffline) {
        setIsLoading(true);
        const response = await wishlistAPI.addToWishlist(itemData);
        
        if (response.success) {
          setWishlistItems(response.wishlist.items || []);
          if (showToast) showToast(`${item.title} added to wishlist!`);
          return true;
        }
      } else {
        // Offline/guest fallback
        const existingItem = wishlistItems.find(
          wItem => wItem.itemId === item._id
        );

        if (existingItem) {
          if (showToast) showToast('Item already in wishlist!');
          return false;
        }

        const wishlistItem = {
          _id: Date.now().toString(), // Temporary ID for offline
          itemType: item.type || (item.timeSlots ? 'service' : 'product'),
          itemId: item._id,
          title: item.title,
          description: item.description || '',
          price: item.price,
          image: item.images?.[0] || null,
          storeId: typeof item.storeId === 'object' ? item.storeId._id : item.storeId,
          storeName: typeof item.storeId === 'object' ? item.storeId.name : '',
          priority,
          notes,
          isAvailable: true,
          addedAt: new Date().toISOString(),
        };

        setWishlistItems(prev => [...prev, wishlistItem]);
        setSyncPending(true);
        if (showToast) showToast(`${item.title} added to wishlist!`);
        return true;
      }
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      if (error.message?.includes('already in wishlist')) {
        if (showToast) showToast('Item already in wishlist!');
      } else {
        if (showToast) showToast('Failed to add item to wishlist. Please try again.');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Remove item from wishlist
  const removeFromWishlist = async (itemId) => {
    try {
      const item = wishlistItems.find(wItem => 
        wItem._id === itemId || wItem.itemId === itemId
      );
      
      if (user && !isOffline && !item?._id?.toString().startsWith('temp_')) {
        setIsLoading(true);
        const response = await wishlistAPI.removeFromWishlist(item._id);
        
        if (response.success) {
          setWishlistItems(response.wishlist.items || []);
          if (showToast) showToast('Item removed from wishlist!');
        }
      } else {
        // Offline/guest fallback
        setWishlistItems(prev => prev.filter(wItem => 
          wItem._id !== itemId && wItem.itemId !== itemId
        ));
        setSyncPending(true);
        if (showToast) showToast('Item removed from wishlist!');
      }
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      if (showToast) showToast('Failed to remove item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update item priority
  const updateItemPriority = async (itemId, priority) => {
    try {
      const item = wishlistItems.find(wItem => wItem._id === itemId);
      
      if (user && !isOffline && !item?._id?.toString().startsWith('temp_')) {
        setIsLoading(true);
        const response = await wishlistAPI.updateItemPriority(itemId, priority);
        
        if (response.success) {
          // Update local state
          setWishlistItems(prev => 
            prev.map(wItem => 
              wItem._id === itemId 
                ? { ...wItem, priority }
                : wItem
            )
          );
          if (showToast) showToast('Priority updated!');
        }
      } else {
        // Offline/guest fallback
        setWishlistItems(prev => 
          prev.map(wItem => 
            wItem._id === itemId 
              ? { ...wItem, priority }
              : wItem
          )
        );
        setSyncPending(true);
        if (showToast) showToast('Priority updated!');
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
      if (showToast) showToast('Failed to update priority. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update item notes
  const updateItemNotes = async (itemId, notes) => {
    try {
      const item = wishlistItems.find(wItem => wItem._id === itemId);
      
      if (user && !isOffline && !item?._id?.toString().startsWith('temp_')) {
        setIsLoading(true);
        const response = await wishlistAPI.updateItemNotes(itemId, notes);
        
        if (response.success) {
          // Update local state
          setWishlistItems(prev => 
            prev.map(wItem => 
              wItem._id === itemId 
                ? { ...wItem, notes }
                : wItem
            )
          );
          if (showToast) showToast('Notes updated!');
        }
      } else {
        // Offline/guest fallback
        setWishlistItems(prev => 
          prev.map(wItem => 
            wItem._id === itemId 
              ? { ...wItem, notes }
              : wItem
          )
        );
        setSyncPending(true);
        if (showToast) showToast('Notes updated!');
      }
    } catch (error) {
      console.error('Failed to update notes:', error);
      if (showToast) showToast('Failed to update notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Move item from wishlist to cart
  const moveToCart = async (itemId, quantity = 1, bookingDetails = null) => {
    try {
      const item = wishlistItems.find(wItem => wItem._id === itemId);
      
      if (user && !isOffline && !item?._id?.toString().startsWith('temp_')) {
        setIsLoading(true);
        const response = await wishlistAPI.moveToCart(itemId, quantity, bookingDetails);
        
        if (response.success) {
          // Remove from local wishlist
          setWishlistItems(prev => prev.filter(wItem => wItem._id !== itemId));
          if (showToast) showToast('Item moved to cart!');
          return true;
        }
      } else {
        // For offline/guest users, we'll need to integrate with CartContext
        // This would require passing cart functions or using a different approach
        if (showToast) showToast('Please login to move items to cart.');
        return false;
      }
    } catch (error) {
      console.error('Failed to move to cart:', error);
      if (showToast) showToast('Failed to move item to cart. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if item is in wishlist
  const isInWishlist = (itemId) => {
    return wishlistItems.some(item => 
      item.itemId === itemId || item._id === itemId
    );
  };

  // Get items by filter
  const getItemsByFilter = (filter = {}) => {
    let filteredItems = [...wishlistItems];

    if (filter.itemType) {
      filteredItems = filteredItems.filter(item => item.itemType === filter.itemType);
    }

    if (filter.priority) {
      filteredItems = filteredItems.filter(item => item.priority === filter.priority);
    }

    if (filter.storeId) {
      filteredItems = filteredItems.filter(item => 
        item.storeId === filter.storeId
      );
    }

    return filteredItems;
  };

  // Get wishlist statistics
  const getStats = () => {
    return {
      totalItems: wishlistItems.length,
      productCount: wishlistItems.filter(item => item.itemType === 'product').length,
      serviceCount: wishlistItems.filter(item => item.itemType === 'service').length,
      highPriorityCount: wishlistItems.filter(item => item.priority === 'high').length,
      totalValue: wishlistItems.reduce((sum, item) => sum + (item.price || 0), 0),
    };
  };

  const value = {
    wishlistItems,
    isLoading,
    isOffline,
    syncPending,
    addToWishlist,
    removeFromWishlist,
    updateItemPriority,
    updateItemNotes,
    moveToCart,
    isInWishlist,
    getItemsByFilter,
    getStats,
    syncWishlistWithServer,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};