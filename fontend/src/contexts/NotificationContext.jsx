import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { io } from "socket.io-client";
import { typeIcons } from "../utils/notificationHelpers";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth(); // Remove token dependency
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);

  const socketRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications`,
        {
          credentials: "include", // Already correct
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
    if (!user) return; // Remove token dependency

    // Fetch on first load
    fetchNotifications();

    // Initialize socket with cookie-based auth
    socketRef.current = io(import.meta.env.VITE_API_URL, {
      withCredentials: true, // Use cookies instead of auth token
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
  }, [user]); // Remove token dependency

  const markAsRead = async (id) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications/${id}/read`,
        {
          method: "PATCH",
          credentials: "include", // Already correct
        }
      );
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1)); // Prevent negative count
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
          credentials: "include", // Already correct
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
          credentials: "include", // Already correct
        }
      );
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isDeleted: true } : n))
        );
        
        // Decrease unread count if the deleted notification was unread
        const deletedNotification = notifications.find(n => n._id === id);
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (e) {
      console.error("Soft delete failed", e);
    }
  };

  // Helper function to dismiss toast
  const dismissToast = () => {
    setToast(null);
  };

  // Handle toast click with better navigation
  const handleToastClick = () => {
    if (toast?.link) {
      // Use proper navigation instead of window.location.href
      if (toast.link.startsWith('http')) {
        window.open(toast.link, '_blank');
      } else {
        // For internal routes, you might want to use your router's navigate function
        window.location.href = toast.link;
      }
    }
    dismissToast();
  };

  return (
    <>
      {toast && (
        <div
          className="fixed bottom-6 right-4 z-50 bg-white border border-purple-300 rounded-xl shadow-lg p-4 w-80 max-w-full animate-slide-in cursor-pointer"
          onClick={handleToastClick}
        >
          <div className="flex items-start gap-3">
            {/* Icon rendered correctly */}
            <div className="text-purple-600">
              {(() => {
                const ToastIcon = typeIcons[toast.type];
                return ToastIcon ? <ToastIcon className="w-5 h-5" /> : null;
              })()}
            </div>

            <div className="flex-1">
              <p className="font-semibold text-sm">{toast.title}</p>
              <p className="text-xs text-gray-600 line-clamp-2">{toast.body}</p>
            </div>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissToast();
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
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
          dismissToast,
        }}
      >
        {children}
      </NotificationContext.Provider>
    </>
  );
};

export const useNotifications = () => useContext(NotificationContext);