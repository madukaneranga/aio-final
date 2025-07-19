import React, { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Megaphone,
  ShieldAlert,
  Gift,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const typeIcons = {
  order: <CheckCircle className="w-5 h-5" />,
  promotion: <Gift className="w-5 h-5" />,
  warning: <ShieldAlert className="w-5 h-5" />,
  announcement: <Megaphone className="w-5 h-5" />,
};

export default function NotificationPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([
    {
      _id: "1",
      title: "Order Confirmed",
      body: "Your order #12345 has been confirmed.",
      isRead: false,
      type: "order",
      createdAt: new Date().toISOString(),
      link: "/orders/12345",
    },
    {
      _id: "2",
      title: "Limited Time Offer!",
      body: "Get 20% off on your next purchase.",
      isRead: false,
      type: "promotion",
      createdAt: new Date().toISOString(),
    },
    {
      _id: "3",
      title: "Account Warning",
      body: "Your account is nearing its storage limit.",
      isRead: true,
      type: "warning",
      createdAt: new Date().toISOString(),
    },
    {
      _id: "4",
      title: "System Maintenance",
      body: "Scheduled maintenance on Friday 9 PM.",
      isRead: true,
      type: "announcement",
      createdAt: new Date().toISOString(),
    },
  ]);

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
  };

  const softDelete = (id) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
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

        {notifications.length === 0 && (
          <p className="text-center mt-10 text-gray-500">
            No notifications to show.
          </p>
        )}

        <ul className="space-y-4">
          {notifications.map((n) => (
            <li
              key={n._id}
              onClick={() => onNotificationClick(n)}
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
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
