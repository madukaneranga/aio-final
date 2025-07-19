import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from "socket.io-client";

const NotificationContext = createContext();
export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ userId, children }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Setup socket connection
  useEffect(() => {
    if (!userId) return;

    const s = io(import.meta.env.VITE_API_URL);
    setSocket(s);
    s.emit("join", userId);

    s.on("new-notification", (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    return () => {
      s.disconnect();
    };
  }, [userId]);

  // Fetch initial notifications
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    async function fetchNotifications() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setNotifications(res.ok ? data.notifications : []);
      } catch (err) {
        console.error("Fetch error", err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, [userId]);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => (n._id === id ? { ...n, isRead: true } : n)));
      }
    } catch (e) {
      console.error("Mark read failed", e);
    }
  };

  const softDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/delete`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => (n._id === id ? { ...n, isDeleted: true } : n)));
      }
    } catch (e) {
      console.error("Soft delete failed", e);
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/mark-all-read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (e) {
      console.error("Mark all read failed", e);
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
