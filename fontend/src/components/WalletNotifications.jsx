import React, { useEffect, useState } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const WalletNotifications = ({ socket }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleWalletUpdate = (data) => {
      const notification = {
        id: Date.now(),
        type: data.type,
        message: getNotificationMessage(data),
        timestamp: new Date(),
        read: false
      };

      setNotifications(prev => [notification, ...prev.slice(0, 9)]);
      
      // Auto-open notifications panel for important updates
      if (data.type === 'withdrawal_processed') {
        setIsOpen(true);
      }
    };

    socket.on('wallet-update', handleWalletUpdate);

    return () => {
      socket.off('wallet-update', handleWalletUpdate);
    };
  }, [socket]);

  const getNotificationMessage = (data) => {
    switch (data.type) {
      case 'withdrawal_requested':
        return `Withdrawal request of ${formatCurrency(data.transaction.amount)} has been submitted`;
      case 'withdrawal_processed':
        return `Withdrawal request ${data.action}ed${data.adminNotes ? ` - ${data.adminNotes}` : ''}`;
      case 'sale_completed':
        return `New sale of ${formatCurrency(data.amount)} added to your wallet`;
      case 'refund_processed':
        return `Refund of ${formatCurrency(data.amount)} has been processed`;
      default:
        return 'Wallet updated';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'withdrawal_processed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'withdrawal_requested':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'sale_completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-black transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-black">Notifications</h3>
              <div className="flex items-center space-x-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-sm text-gray-600 hover:text-black"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-black"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-black font-medium">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletNotifications;