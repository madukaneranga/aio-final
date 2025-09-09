import React, { useState, useEffect } from 'react';
import {
  Users,
  Store,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Eye,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Chart components
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const DashboardOverview = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  useEffect(() => {
    fetchDashboardData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/dashboard/overview', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const calculateGrowthRate = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Mock growth data - in real app, this would come from API
  const getGrowthRate = (type) => {
    const rates = {
      users: 12.5,
      stores: 8.3,
      orders: 15.7,
      revenue: 22.1
    };
    return rates[type] || 0;
  };

  const StatCard = ({ title, value, icon: Icon, color, growth, prefix = '', suffix = '' }) => {
    const isPositive = growth >= 0;
    
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              {prefix}{formatNumber(value)}{suffix}
            </p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <div className="flex items-center mt-4">
          <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? (
              <ArrowUpRight className="w-4 h-4 mr-1" />
            ) : (
              <ArrowDownRight className="w-4 h-4 mr-1" />
            )}
            <span className="text-sm font-medium">
              {Math.abs(growth)}%
            </span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            vs last month
          </span>
        </div>
      </div>
    );
  };

  const AlertCard = ({ title, count, items, color, icon: Icon }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${color} mr-3`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {count} items need attention
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-900 dark:text-white">
              {item.title || item.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {item.stock ? `${item.stock} left` : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading && !dashboardData) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No data available</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Unable to load dashboard data. Please try again.
        </p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  const { overview, todayMetrics, weeklyMetrics, monthlyMetrics, financial, subscriptions, alerts, recentActivity, flashDeals, systemHealth } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Real-time insights and key performance indicators
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4 mr-1" />
            Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
          </div>
          
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={overview.totalUsers}
          icon={Users}
          color="bg-blue-500"
          growth={getGrowthRate('users')}
        />
        <StatCard
          title="Active Stores"
          value={overview.totalStores}
          icon={Store}
          color="bg-green-500"
          growth={getGrowthRate('stores')}
        />
        <StatCard
          title="Total Orders"
          value={overview.totalOrders}
          icon={ShoppingBag}
          color="bg-yellow-500"
          growth={getGrowthRate('orders')}
        />
        <StatCard
          title="Total Revenue"
          value={overview.totalRevenue}
          icon={DollarSign}
          color="bg-red-500"
          growth={getGrowthRate('revenue')}
          prefix="$"
        />
      </div>

      {/* Today's Metrics */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Today's Performance
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{todayMetrics.newUsers}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">New Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{todayMetrics.newStores}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">New Stores</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{todayMetrics.newOrders}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">New Orders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{formatCurrency(todayMetrics.todayRevenue)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Today's Revenue</div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Overview */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Financial Overview
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Pending Withdrawals</span>
              <span className="font-medium text-yellow-600">
                {formatCurrency(financial.pendingWithdrawals)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Completed Withdrawals</span>
              <span className="font-medium text-green-600">
                {formatCurrency(financial.completedWithdrawals)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Platform Revenue</span>
              <span className="font-medium text-blue-600">
                {formatCurrency(financial.platformRevenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Stats */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Subscription Status
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Active Subscriptions</span>
              <span className="font-medium text-green-600">{subscriptions.active}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Pending Subscriptions</span>
              <span className="font-medium text-yellow-600">{subscriptions.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Monthly Revenue</span>
              <span className="font-medium text-blue-600">
                {formatCurrency(subscriptions.monthlyRevenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Flash Deals */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Flash Deals
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Active Deals</span>
              <span className="font-medium text-green-600">{flashDeals.active}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Upcoming Deals</span>
              <span className="font-medium text-blue-600">{flashDeals.upcoming}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Products</span>
              <span className="font-medium text-gray-900 dark:text-white">{overview.totalProducts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Alerts */}
        {alerts.lowStockProducts && (
          <AlertCard
            title="Low Stock Alert"
            count={alerts.lowStockProducts}
            items={alerts.lowStockItems || []}
            color="bg-red-500"
            icon={AlertTriangle}
          />
        )}

        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Orders
          </h3>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentActivity.recentOrders?.map((order, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Order #{order._id?.slice(-8)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {order.customerId?.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(order.totalAmount)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {order.status}
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No recent orders
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Health
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Server Status</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">{systemHealth.serverStatus}</div>
          </div>
          <div className="text-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Database</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">{systemHealth.databaseStatus}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 dark:text-white">Uptime</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 dark:text-white">Last Updated</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {new Date(systemHealth.lastUpdated).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;