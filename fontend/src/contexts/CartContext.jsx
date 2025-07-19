import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children, showToast }) => {
  const [orderItems, setOrderItems] = useState([]);
  const [bookingItems, setBookingItems] = useState([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('order');
    const savedBookings = localStorage.getItem('bookings');

    if (savedCart) {
      setOrderItems(JSON.parse(savedCart));
    }

    if (savedBookings) {
      setBookingItems(JSON.parse(savedBookings));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('order', JSON.stringify(orderItems));
  }, [orderItems]);

  useEffect(() => {
    localStorage.setItem('bookings', JSON.stringify(bookingItems));
  }, [bookingItems]);

  // Add to Order with confirmation if bookings exist
  const addToOrder = (product, quantity = 1) => {
    if (bookingItems.length > 0) {
      const confirmClear = window.confirm(
        'You have existing bookings in your cart. Adding an order will clear your bookings. Continue?'
      );
      if (!confirmClear) return;

      setBookingItems([]);
      if (showToast) showToast('Bookings cleared to add order items.');
    }

    setOrderItems(prev => {
      const existingItem = prev.find(item => item.id === product._id);

      if (existingItem) {
        return prev.map(item =>
          item.id === product._id
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
          storeId:
            typeof product.storeId === 'object'
              ? product.storeId._id
              : product.storeId || product.storeId,
        },
      ];
    });
  };

  // Add to Booking with confirmation if orders exist
  const addToBooking = (service, bookingDetails) => {
    if (orderItems.length > 0) {
      const confirmClear = window.confirm(
        'You have existing orders in your cart. Adding a booking will clear your orders. Continue?'
      );
      if (!confirmClear) return;

      setOrderItems([]);
      if (showToast) showToast('Orders cleared to add booking items.');
    }

    setBookingItems(prev => [
      ...prev,
      {
        id: service._id,
        title: service.title,
        price: service.price,
        image: service.images?.[0],
        storeId:
          typeof service.storeId === 'object'
            ? service.storeId._id
            : service.storeId || service.storeId,
        ...bookingDetails,
      },
    ]);
  };

  const removeFromOrder = productId => {
    setOrderItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromOrder(productId);
      return;
    }

    setOrderItems(prev =>
      prev.map(item => (item.id === productId ? { ...item, quantity } : item))
    );
  };

  const removeFromBooking = serviceId => {
    setBookingItems(prev => prev.filter(item => item.id !== serviceId));
  };

  const clearOrder = () => setOrderItems([]);

  const clearBookings = () => setBookingItems([]);

  const orderTotal = orderItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const bookingTotal = bookingItems.reduce((total, item) => total + item.price, 0);

  const value = {
    orderItems,
    bookingItems,
    addToOrder,
    removeFromOrder,
    updateQuantity,
    addToBooking,
    removeFromBooking,
    clearOrder,
    clearBookings,
    orderTotal,
    bookingTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
