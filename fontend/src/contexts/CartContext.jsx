import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [bookingItems, setBookingItems] = useState([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedBookings = localStorage.getItem('bookings');
    
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
    
    if (savedBookings) {
      setBookingItems(JSON.parse(savedBookings));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('bookings', JSON.stringify(bookingItems));
  }, [bookingItems]);

  const addToCart = (product, quantity = 1) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === product._id);
      
      if (existingItem) {
        return prev.map(item =>
          item.id === product._id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      
      return [...prev, {
        id: product._id,
        title: product.title,
        price: product.price,
        image: product.images?.[0],
        quantity,
        storeId: typeof product.storeId === 'object' ? product.storeId._id : product.storeId || product.storeId
      }];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCartItems(prev =>
      prev.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const addToBooking = (service, bookingDetails) => {
    setBookingItems(prev => [...prev, {
      id: service._id,
      title: service.title,
      price: service.price,
      image: service.images?.[0],
      storeId: typeof service.storeId === 'object' ? service.storeId._id : service.storeId || service.storeId,
      ...bookingDetails
    }]);
  };

  const removeFromBooking = (serviceId) => {
    setBookingItems(prev => prev.filter(item => item.id !== serviceId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const clearBookings = () => {
    setBookingItems([]);
  };

  const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const bookingTotal = bookingItems.reduce((total, item) => total + item.price, 0);

  const value = {
    cartItems,
    bookingItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    addToBooking,
    removeFromBooking,
    clearCart,
    clearBookings,
    cartTotal,
    bookingTotal
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};