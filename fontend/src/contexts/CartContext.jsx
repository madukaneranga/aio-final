import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../utils/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Helper function to compare variants properly
const compareVariants = (variants1, variants2) => {
  // Normalize variants - treat null, undefined, and empty objects as equivalent
  const normalize = (variants) => {
    if (!variants || Object.keys(variants).length === 0) {
      return {};
    }
    
    // Create a sorted object to avoid order dependency
    const sorted = {};
    Object.keys(variants)
      .filter(key => variants[key] !== null && variants[key] !== undefined && variants[key] !== '')
      .sort()
      .forEach(key => {
        sorted[key] = variants[key];
      });
    
    return sorted;
  };
  
  const norm1 = normalize(variants1);
  const norm2 = normalize(variants2);
  
  // Compare normalized objects
  return JSON.stringify(norm1) === JSON.stringify(norm2);
};

export const CartProvider = ({ children, showToast }) => {
  const { user } = useAuth();
  const [orderItems, setOrderItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncPending, setSyncPending] = useState(false);

  // Initialize cart data
  useEffect(() => {
    const initializeCart = async () => {
      if (!user) {
        // Load from localStorage for guests
        const savedCart = localStorage.getItem('order');
        if (savedCart) {
          setOrderItems(JSON.parse(savedCart));
        }
        return;
      }

      // Load from API for authenticated users
      try {
        setIsLoading(true);
        const response = await cartAPI._getCart();
        if (response.success) {
          const { items } = response.data.cart;
          
          const orderItems = items;
          
          setOrderItems(orderItems.map(item => ({
            id: item.itemId._id || item.itemId,
            title: item.title,
            price: item.price,
            image: item.image,
            quantity: item.quantity,
            storeId: item.storeId._id || item.storeId,
            _cartItemId: item._id, // Store cart item ID for updates
          })));
        }
      } catch (error) {
        console.error('Failed to load cart:', error);
        // Fallback to localStorage on error
        const savedCart = localStorage.getItem('order');
        if (savedCart) {
          setOrderItems(JSON.parse(savedCart));
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeCart();
  }, [user]);

  // Save to localStorage for offline/guest users
  useEffect(() => {
    if (!user || isOffline) {
      localStorage.setItem('order', JSON.stringify(orderItems));
    }
  }, [orderItems, user, isOffline]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (syncPending && user) {
        // Trigger sync when back online
        syncCartWithServer();
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

  const syncCartWithServer = async () => {
    if (!user || isOffline) return;
    
    try {
      // This would sync localStorage data with server
      // Implementation depends on your sync strategy
      setSyncPending(false);
    } catch (error) {
      console.error('Failed to sync cart:', error);
    }
  };

  // Add to Order
  const addToOrder = async (product, quantity = 1, variants = null) => {
    try {
      const itemData = {
        itemId: product._id,
        quantity,
        variants,
      };

      if (user && !isOffline) {
        setIsLoading(true);
        const response = await cartAPI._addToCart(itemData);
        
        if (response.success) {
          const { items } = response.data.cart;
          const { warnings } = response.data;
          
          const orderItems = items;
          setOrderItems(orderItems.map(item => ({
            id: item.itemId._id || item.itemId,
            title: item.title,
            price: item.price,
            image: item.image,
            quantity: item.quantity,
            storeId: item.storeId._id || item.storeId,
            _cartItemId: item._id,
          })));
          
          // Show appropriate messages
          if (warnings && warnings.length > 0) {
            if (showToast) showToast(warnings.join('. '));
          } else {
            if (showToast) showToast('Product added to cart!');
          }
        }
      } else {
        // Offline/guest fallback
        setOrderItems(prev => {
          const existingItem = prev.find(item => 
            item.id === product._id && 
            compareVariants(item.variants, variants)
          );

          if (existingItem) {
            return prev.map(item =>
              item.id === product._id && compareVariants(item.variants, variants)
                ? { ...item, quantity: item.quantity + quantity }
                : item
            );
          }

          return [
            ...prev,
            {
              id: product._id,
              title: product.title,
              price: product.price,
              image: product.images?.[0],
              quantity,
              variants,
              storeId:
                typeof product.storeId === 'object'
                  ? product.storeId._id
                  : product.storeId,
            },
          ];
        });
        
        setSyncPending(true);
        if (showToast) showToast('Product added to cart!');
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      if (showToast) showToast('Failed to add product to cart. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromOrder = async (productId, variants = null) => {
    try {
      const item = orderItems.find(item => item.id === productId);
      
      if (user && !isOffline && item?._cartItemId) {
        setIsLoading(true);
        const response = await cartAPI._removeFromCart(item._cartItemId);
        
        if (response.success) {
          const { items } = response.data.cart;
          const orderItems = items;
          
          setOrderItems(orderItems.map(item => ({
            id: item.itemId._id || item.itemId,
            title: item.title,
            price: item.price,
            image: item.image,
            quantity: item.quantity,
            storeId: item.storeId._id || item.storeId,
            _cartItemId: item._id,
          })));
        }
      } else {
        // Offline/guest fallback - filter by both productId and variants
        setOrderItems(prev => prev.filter(item => 
          !(item.id === productId && compareVariants(item.variants, variants))
        ));
        setSyncPending(true);
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
      if (showToast) showToast('Failed to remove item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity, variants = null) => {
    if (quantity <= 0) {
      await removeFromOrder(productId, variants);
      return;
    }

    try {
      const item = orderItems.find(item => item.id === productId);
      
      if (user && !isOffline && item?._cartItemId) {
        setIsLoading(true);
        const response = await cartAPI._updateQuantity(item._cartItemId, quantity);
        
        if (response.success) {
          const { items } = response.data.cart;
          const orderItems = items;
          
          setOrderItems(orderItems.map(item => ({
            id: item.itemId._id || item.itemId,
            title: item.title,
            price: item.price,
            image: item.image,
            quantity: item.quantity,
            storeId: item.storeId._id || item.storeId,
            _cartItemId: item._id,
          })));
        } else {
          // Handle validation errors from backend
          if (showToast) showToast(response.message || 'Failed to update quantity');
        }
      } else {
        // Offline/guest fallback
        setOrderItems(prev =>
          prev.map(item => 
            item.id === productId && compareVariants(item.variants, variants)
              ? { ...item, quantity } 
              : item
          )
        );
        setSyncPending(true);
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update quantity. Please try again.';
      if (showToast) showToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearOrder = async () => {
    try {
      if (user && !isOffline) {
        setIsLoading(true);
        await cartAPI._clearCart();
      }
      setOrderItems([]);
      setSyncPending(true);
    } catch (error) {
      console.error('Failed to clear orders:', error);
      setOrderItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const orderTotal = orderItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const value = {
    orderItems,
    addToOrder,
    removeFromOrder,
    updateQuantity,
    clearOrder,
    orderTotal,
    isLoading,
    isOffline,
    syncPending,
    syncCartWithServer,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};