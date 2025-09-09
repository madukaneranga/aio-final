import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Store, 
  ShoppingBag,
  DollarSign, 
  CreditCard,
  Zap,
  Settings,
  BarChart3,
  Shield,
  Bell,
  LogOut,
  Menu,
  X,
  Search,
  Sun,
  Moon,
  RefreshCcw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// Import dashboard components
import DashboardOverview from '../components/AdminDashboard/DashboardOverview';
import UserManagement from '../components/AdminDashboard/UserManagement';
import StoreManagement from '../components/AdminDashboard/StoreManagement';
import OrderManagement from '../components/AdminDashboard/OrderManagement';
import FinancialDashboard from '../components/AdminDashboard/FinancialDashboard';
import FinancialManagement from '../components/AdminDashboard/FinancialManagement';
import SubscriptionManagement from '../components/AdminDashboard/SubscriptionManagement';
import FlashDealManagement from '../components/AdminDashboard/FlashDealManagement';
import SystemSettings from '../components/AdminDashboard/SystemSettings';
import Analytics from '../components/AdminDashboard/Analytics';
import SecurityAudit from '../components/AdminDashboard/SecurityAudit';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Navigation items
  const navigationItems = [
    {
      id: 'overview',
      label: 'Dashboard Overview',
      icon: LayoutDashboard,
      path: '/admin',
      component: DashboardOverview
    },
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      path: '/admin/users',
      component: UserManagement
    },
    {
      id: 'stores',
      label: 'Store Management',
      icon: Store,
      path: '/admin/stores',
      component: StoreManagement
    },
    {
      id: 'orders',
      label: 'Order Management',
      icon: ShoppingBag,
      path: '/admin/orders',
      component: OrderManagement
    },
    {
      id: 'financial',
      label: 'Financial Management',
      icon: DollarSign,
      path: '/admin/financial',
      component: FinancialManagement
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      icon: CreditCard,
      path: '/admin/subscriptions',
      component: SubscriptionManagement
    },
    {
      id: 'flash-deals',
      label: 'Flash Deals',
      icon: Zap,
      path: '/admin/flash-deals',
      component: FlashDealManagement
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      icon: BarChart3,
      path: '/admin/analytics',
      component: Analytics
    },
    {
      id: 'security',
      label: 'Security & Audit',
      icon: Shield,
      path: '/admin/security',
      component: SecurityAudit
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      path: '/admin/settings',
      component: SystemSettings
    }
  ];

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Load notifications
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/admin/notifications', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Trigger refresh of current component
    window.location.reload();
  };

  const getCurrentNavItem = () => {
    return navigationItems.find(item => 
      location.pathname === item.path || 
      (item.path !== '/admin' && location.pathname.startsWith(item.path))
    ) || navigationItems[0];
  };

  const currentNavItem = getCurrentNavItem();

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentNavItem.label}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {user.role}
                </p>
              </div>
              <img
                src={user.profileImage || `/api/placeholder/32/32`}
                alt="Admin"
                className="w-8 h-8 rounded-full"
              />
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
          fixed lg:relative lg:flex flex-col w-64 bg-white dark:bg-gray-800 h-screen shadow-lg transition-transform duration-300 ease-in-out z-30 border-r border-gray-200 dark:border-gray-700
        `}>
          <div className="flex-1 overflow-y-auto py-6">
            <nav className="px-3 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || 
                  (item.path !== '/admin' && location.pathname.startsWith(item.path));
                
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`
                      w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200
                      ${isActive 
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-r-2 border-indigo-600' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>System Status: Online</p>
              <p>Version: 2.1.0</p>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="p-6">
            <Routes>
              <Route path="/" element={<DashboardOverview />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/stores" element={<StoreManagement />} />
              <Route path="/orders" element={<OrderManagement />} />
              <Route path="/financial" element={<FinancialManagement />} />
              <Route path="/subscriptions" element={<SubscriptionManagement />} />
              <Route path="/flash-deals" element={<FlashDealManagement />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/security" element={<SecurityAudit />} />
              <Route path="/settings" element={<SystemSettings />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;