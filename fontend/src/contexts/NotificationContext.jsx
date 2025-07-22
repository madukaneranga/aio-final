import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { io } from "socket.io-client";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);

  const socketRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);

        const unread = data.notifications.filter(
          (n) => !n.isRead && !n.isDeleted
        ).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    if (!user || !token) return;

    // Fetch on first load
    fetchNotifications();

    // Initialize socket
    socketRef.current = io(import.meta.env.VITE_API_URL, {
      auth: {
        token: token,
      },
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to socket.io server");
    });

    socketRef.current.on("disconnect", () => {
      console.log("Disconnected from socket.io server");
    });

    // Handle new notifications
    socketRef.current.on("new-notification", (notification) => {
      console.log("New notification via socket:", notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Trigger toast
      setToast(notification);
      setTimeout(() => setToast(null), 5000); // Auto-hide after 5 seconds
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user, token]);

  const markAsRead = async (id) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications/${id}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => prev - 1);
      }
    } catch (e) {
      console.error("Mark read failed", e);
    }
  };

  const markAllRead = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications/mark-all-read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (e) {
      console.error("Mark all read failed", e);
    }
  };

  const softDelete = async (id) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications/${id}/delete`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isDeleted: true } : n))
        );
      }
    } catch (e) {
      console.error("Soft delete failed", e);
    }
  };

  return (
    <>
      {toast && (
        <div
          className="fixed bottom-6 right-4 z-50 bg-white border border-purple-300 rounded-xl shadow-lg p-4 w-80 max-w-full animate-slide-in"
          onClick={() => {
            if (toast.link) window.location.href = toast.link;
            setToast(null);
          }}
        >
          <div className="flex items-start gap-3">
            <div className="text-purple-600">{typeIcons[toast.type]}</div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{toast.title}</p>
              <p className="text-xs text-gray-600 line-clamp-2">{toast.body}</p>
            </div>
          </div>
        </div>
      )}

      <NotificationContext.Provider
        value={{
          notifications,
          unreadCount,
          fetchNotifications,
          markAsRead,
          markAllRead,
          softDelete,
          setNotifications,
          setUnreadCount,
        }}
      >
        {children}
      </NotificationContext.Provider>
    </>
  );
};

export const useNotifications = () => useContext(NotificationContext);
