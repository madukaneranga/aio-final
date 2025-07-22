import React from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";
import { typeIcons } from "../utils/notificationHelpers";
import { XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const palette = {
  white: "#FFFFFF",
  purple3: "#7B2CBF",
  purple4: "#9D4EDD",
  purple5: "#C77DFF",
  purple6: "#E0AAFF",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray500: "#6b7280",
  gray700: "#374151",
};

const typeColors = {
  order: palette.purple3,
  promotion: palette.purple5,
  warning: palette.purple4,
  announcement: palette.purple6,
};

export default function Notifications() {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    isLoaded,
    markAsRead,
    softDelete,
    markAllRead,
    setPage,
    total = 0,
  } = useNotifications();

  const onLoadMore = () => {
    if (setPage) setPage((p) => p + 1);
  };

  const onNotificationClick = (n) => {
    if (!n.isRead) markAsRead(n._id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
          <button
            onClick={markAllRead}
            disabled={notifications.every((n) => n.isRead)}
            className={`px-4 py-2 rounded-lg font-medium transition duration-300 ${
              notifications.every((n) => n.isRead)
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 text-white shadow"
            }`}
          >
            Mark all as read
          </button>
        </header>

        {!loading && isLoaded && notifications.length === 0 && (
          <p className="text-center mt-10 text-gray-500">
            No notifications to show.
          </p>
        )}

        {loading && (
          <p className="text-center mt-10 text-gray-500">
            Loading notifications...
          </p>
        )}

        <ul className="space-y-4">
          <AnimatePresence>
            {notifications
              .filter((n) => !n.isDeleted)
              .map((n) => (
                <motion.li
                  key={n._id}
                  onClick={() => onNotificationClick(n)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, padding: 0, margin: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`cursor-pointer bg-white rounded-2xl p-5 flex items-start gap-4 shadow transition duration-300 hover:shadow-lg border ${
                    n.isRead ? "border-gray-200" : "border-purple-300"
                  }`}
                  aria-label={`Notification: ${n.title}`}
                >
                  <div
                    className="flex-shrink-0 mt-1"
                    style={{ color: typeColors[n.type] }}
                  >
                    {typeIcons[n.type]}
                  </div>
                  <div className="flex-1">
                    <h2
                      className={`font-semibold text-lg truncate mb-1 ${
                        n.isRead ? "text-gray-700" : "text-purple-700"
                      }`}
                    >
                      {n.title}
                    </h2>
                    <p className="text-sm text-gray-600 line-clamp-2">{n.body}</p>
                    <time
                      className="block text-xs text-gray-500 mt-2"
                      dateTime={n.createdAt}
                    >
                      {new Date(n.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      softDelete(n._id);
                    }}
                    title="Delete notification"
                    className="text-gray-400 hover:text-red-500 transition"
                    aria-label="Delete notification"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </motion.li>
              ))}
          </AnimatePresence>
        </ul>

        {notifications.length < total && (
          <div className="flex justify-center mt-10">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className={`px-6 py-3 rounded-xl font-semibold transition duration-300 shadow-md ${
                loading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
            >
              {loading ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
