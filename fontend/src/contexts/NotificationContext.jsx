// contexts/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};

export const NotificationProvider = ({ userId, children }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    async function fetchNotifications() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setNotifications(data.notifications);
        } else {
          setNotifications([]);
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, [userId]);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map(n => (n._id === id ? { ...n, isRead: true } : n)));
      }
    } catch (e) {
      console.error('Error marking as read', e);
    }
  };

  const softDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/delete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map(n => (n._id === id ? { ...n, isDeleted: true } : n)));
      }
    } catch (e) {
      console.error('Error deleting notification', e);
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (e) {
      console.error('Error marking all read', e);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead && !n.isDeleted).length;
  const visibleNotifications = notifications.filter(n => !n.isDeleted);

  return (
    <NotificationContext.Provider value={{
      notifications: visibleNotifications,
      unreadCount,
      loading,
      markAsRead,
      softDelete,
      markAllRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
