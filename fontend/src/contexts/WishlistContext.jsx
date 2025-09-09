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

export const WishlistProvider = ({ children, showToast = null }) => {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize wishlist data
  useEffect(() => {
    const initializeWishlist = async () => {
      if (!user) {
        setWishlistItems([]);
        return;
      }

      // Load from API for authenticated users
      try {
        setIsLoading(true);
        const response = await wishlistAPI._getWishlist();
        if (response.success) {
          setWishlistItems(response.data.wishlist.items || []);
        }
      } catch (error) {
        console.error('Failed to load wishlist:', error);
        setWishlistItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeWishlist();
  }, [user]);

  // Add item to wishlist
  const addToWishlist = async (item, priority = 'medium', notes = '') => {
    try {
      const itemData = {
        itemId: item._id,
        priority,
        notes,
      };

      if (user) {
        // Check if item already exists
        const existingItem = Array.isArray(wishlistItems) ? wishlistItems.find(
          wItem => wItem.itemId === item._id
        ) : null;

        if (existingItem) {
          if (showToast) showToast('Item already in wishlist!');
          return false;
        }

        // Create wishlist item for optimistic update
        const wishlistItem = {
          _id: Date.now().toString(),
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

        // Optimistically update UI
        setWishlistItems(prev => [...(Array.isArray(prev) ? prev : []), wishlistItem]);
        if (showToast) showToast(`${item.title} added to wishlist!`);

        // Make API call in background
        try {
          setIsLoading(true);
          const response = await wishlistAPI._addToWishlist(itemData);
          
          if (response.success) {
            // Debug: Log the server response structure
            console.log('Add wishlist server response:', response);
            console.log('Items from server:', response.data?.wishlist?.items);
            
            // Try multiple possible response structures
            let serverItems = null;
            if (response.data?.wishlist?.items) {
              serverItems = response.data.wishlist.items;
            } else if (response.data?.items) {
              serverItems = response.data.items;
            } else if (Array.isArray(response.data)) {
              serverItems = response.data;
            }
            
            if (Array.isArray(serverItems)) {
              setWishlistItems(serverItems);
              console.log('Updated wishlist with server items:', serverItems.length);
            } else {
              console.warn('Server response does not contain valid items array, keeping optimistic update');
              console.log('Full response structure:', response);
              // Keep the optimistic update - the item should already be visible
            }
          } else {
            // Rollback optimistic update on API failure
            setWishlistItems(prev => (Array.isArray(prev) ? prev : []).filter(wItem => 
              wItem._id !== wishlistItem._id
            ));
            if (showToast) showToast('Failed to add to wishlist. Please try again.');
            return false;
          }
        } catch (error) {
          console.error('Failed to sync with server:', error);
          // Rollback optimistic update on network error
          setWishlistItems(prev => (Array.isArray(prev) ? prev : []).filter(wItem => 
            wItem._id !== wishlistItem._id
          ));
          if (showToast) showToast('Network error. Please check your connection.');
          return false;
        }
        
        return true;
      } else {
        // Guest user - just store in memory for current session
        const existingItem = Array.isArray(wishlistItems) ? wishlistItems.find(
          wItem => wItem.itemId === item._id
        ) : null;

        if (existingItem) {
          if (showToast) showToast('Item already in wishlist!');
          return false;
        }

        const wishlistItem = {
          _id: Date.now().toString(),
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

        setWishlistItems(prev => [...(Array.isArray(prev) ? prev : []), wishlistItem]);
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

  // Remove item by product ID (for ProductCard usage)
  const removeFromWishlistByProductId = async (productId) => {
    try {
      if (!Array.isArray(wishlistItems)) return false;
      
      // Find the wishlist item that matches this product
      const wishlistItem = wishlistItems.find(wItem => 
        wItem.itemId === productId || wItem.itemId?._id === productId
      );
      
      if (wishlistItem) {
        return await removeFromWishlist(wishlistItem._id);
      }
      
      return false;
    } catch (error) {
      console.error('Error removing from wishlist by product ID:', error);
      return false;
    }
  };

  // Remove item from wishlist
  const removeFromWishlist = async (itemId) => {
    try {
      const item = Array.isArray(wishlistItems) ? wishlistItems.find(wItem => 
        wItem._id === itemId || wItem.itemId === itemId
      ) : null;
      
      if (user && item) {
        // Store original state for rollback
        const originalItems = Array.isArray(wishlistItems) ? [...wishlistItems] : [];
        
        // Optimistically update UI first
        setWishlistItems(prev => (Array.isArray(prev) ? prev : []).filter(wItem => 
          wItem._id !== itemId && wItem.itemId !== itemId
        ));
        if (showToast) showToast('Item removed from wishlist!');

        // Make API call in background - use the wishlist item._id for server items, product itemId for temp items
        const isTemporaryItem = item._id?.toString().match(/^\d+$/);
        
        if (!isTemporaryItem && item._id) {
          try {
            setIsLoading(true);
            const response = await wishlistAPI._removeFromWishlist(item._id);
            
            if (response.success) {
              // Debug: Log the server response structure  
              console.log('Remove wishlist server response:', response);
              console.log('Items from server:', response.data?.wishlist?.items);
              
              // Try multiple possible response structures
              let serverItems = null;
              if (response.data?.wishlist?.items) {
                serverItems = response.data.wishlist.items;
              } else if (response.data?.items) {
                serverItems = response.data.items;
              } else if (Array.isArray(response.data)) {
                serverItems = response.data;
              }
              
              if (Array.isArray(serverItems)) {
                setWishlistItems(serverItems);
                console.log('Updated wishlist after removal, items remaining:', serverItems.length);
              } else {
                console.warn('Server response does not contain valid items array, keeping optimistic removal');
                console.log('Full response structure:', response);
                // Keep the optimistic removal - item should already be removed from state
              }
            } else {
              // Rollback optimistic update on API failure
              setWishlistItems(originalItems);
              if (showToast) showToast('Failed to remove from wishlist. Please try again.');
            }
          } catch (error) {
            console.error('Failed to sync removal with server:', error);
            // Rollback optimistic update on network error
            setWishlistItems(originalItems);
            if (showToast) showToast('Network error. Please check your connection.');
          }
        }
      } else {
        // Guest user - remove from memory
        setWishlistItems(prev => (Array.isArray(prev) ? prev : []).filter(wItem => 
          wItem._id !== itemId && wItem.itemId !== itemId
        ));
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
      const item = Array.isArray(wishlistItems) ? wishlistItems.find(wItem => wItem._id === itemId) : null;
      if (!item) return false;

      // Store original priority for rollback
      const originalPriority = item.priority;
      
      // Optimistically update UI first
      setWishlistItems(prev => 
        (Array.isArray(prev) ? prev : []).map(wItem => 
          wItem._id === itemId 
            ? { ...wItem, priority }
            : wItem
        )
      );
      
      if (user && !item._id?.toString().match(/^\d+$/)) {
        setIsLoading(true);
        const apiItemId = item.itemId || item._id;
        const response = await wishlistAPI._updateItemPriority(apiItemId, priority);
        
        if (response.success) {
          if (showToast) showToast('Priority updated!');
          return true;
        } else {
          // Rollback on API failure
          setWishlistItems(prev => 
            (Array.isArray(prev) ? prev : []).map(wItem => 
              wItem._id === itemId 
                ? { ...wItem, priority: originalPriority }
                : wItem
            )
          );
          if (showToast) showToast('Failed to update priority. Please try again.');
          return false;
        }
      } else {
        // Guest user - keep optimistic update
        if (showToast) showToast('Priority updated!');
        return true;
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
      if (showToast) showToast('Network error. Please check your connection.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update item notes
  const updateItemNotes = async (itemId, notes) => {
    try {
      const item = Array.isArray(wishlistItems) ? wishlistItems.find(wItem => wItem._id === itemId) : null;
      if (!item) return false;

      // Store original notes for rollback
      const originalNotes = item.notes;
      
      // Optimistically update UI first
      setWishlistItems(prev => 
        (Array.isArray(prev) ? prev : []).map(wItem => 
          wItem._id === itemId 
            ? { ...wItem, notes }
            : wItem
        )
      );
      
      if (user && !item._id?.toString().match(/^\d+$/)) {
        setIsLoading(true);
        const apiItemId = item.itemId || item._id;
        const response = await wishlistAPI._updateItemNotes(apiItemId, notes);
        
        if (response.success) {
          if (showToast) showToast('Notes updated!');
          return true;
        } else {
          // Rollback on API failure
          setWishlistItems(prev => 
            (Array.isArray(prev) ? prev : []).map(wItem => 
              wItem._id === itemId 
                ? { ...wItem, notes: originalNotes }
                : wItem
            )
          );
          if (showToast) showToast('Failed to update notes. Please try again.');
          return false;
        }
      } else {
        // Guest user - keep optimistic update
        if (showToast) showToast('Notes updated!');
        return true;
      }
    } catch (error) {
      console.error('Failed to update notes:', error);
      if (showToast) showToast('Network error. Please check your connection.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Move item from wishlist to cart
  const moveToCart = async (itemId, quantity = 1) => {
    try {
      const item = Array.isArray(wishlistItems) ? wishlistItems.find(wItem => wItem._id === itemId) : null;
      if (!item) return false;
      
      if (!user) {
        if (showToast) showToast('Please login to move items to cart.');
        return false;
      }

      if (item._id?.toString().match(/^\d+$/)) {
        if (showToast) showToast('Please wait for the item to sync with the server first.');
        return false;
      }
      
      // Store original state for rollback
      const originalItems = Array.isArray(wishlistItems) ? [...wishlistItems] : [];
      
      // Optimistically remove from wishlist
      setWishlistItems(prev => (Array.isArray(prev) ? prev : []).filter(wItem => wItem._id !== itemId));
      if (showToast) showToast('Moving item to cart...');
      
      setIsLoading(true);
      const apiItemId = item.itemId || item._id;
      const response = await wishlistAPI._moveToCart(apiItemId, quantity);
      
      if (response.success) {
        if (showToast) showToast('Item moved to cart!');
        return true;
      } else {
        // Rollback on API failure
        setWishlistItems(originalItems);
        if (showToast) showToast('Failed to move item to cart. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Failed to move to cart:', error);
      // Rollback on network error
      if (Array.isArray(wishlistItems)) {
        const originalItems = [...wishlistItems];
        const item = originalItems.find(wItem => wItem._id === itemId);
        if (item) {
          setWishlistItems(prev => [...(Array.isArray(prev) ? prev : []), item]);
        }
      }
      if (showToast) showToast('Network error. Please check your connection.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if item is in wishlist
  const isInWishlist = (itemId) => {
    if (!Array.isArray(wishlistItems)) {
      return false;
    }
    return wishlistItems.some(item => 
      item.itemId === itemId || item._id === itemId
    );
  };

  // Get items by filter
  const getItemsByFilter = (filter = {}) => {
    if (!Array.isArray(wishlistItems)) {
      return [];
    }
    let filteredItems = [...wishlistItems];

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
    if (!Array.isArray(wishlistItems)) {
      return {
        totalItems: 0,
        productCount: 0,
        highPriorityCount: 0,
        totalValue: 0,
      };
    }
    return {
      totalItems: wishlistItems.length,
      productCount: wishlistItems.length,
      highPriorityCount: wishlistItems.filter(item => item.priority === 'high').length,
      totalValue: wishlistItems.reduce((sum, item) => sum + (item.price || 0), 0),
    };
  };

  const value = {
    wishlistItems,
    isLoading,
    addToWishlist,
    removeFromWishlist,
    removeFromWishlistByProductId,
    updateItemPriority,
    updateItemNotes,
    moveToCart,
    isInWishlist,
    getItemsByFilter,
    getStats,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};