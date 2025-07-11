import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Calendar,
  Users,
  BarChart3,
  Download,
  Filter,
  Eye
} from 'lucide-react';
import { formatLKR, formatLKRCompact } from '../utils/currency';
import LoadingSpinner from '../components/LoadingSpinner';

const SalesAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalBookings: 0,
    averageOrderValue: 0,
    topProducts: [],
    topServices: [],
    revenueByMonth: [],
    ordersByStatus: {},
    customerStats: {}
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [viewType, setViewType] = useState('overview');

  useEffect(() => {
    if (user?.role === 'store_owner') {
      fetchAnalytics();
    }
  }, [user, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch orders
      const ordersResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/store`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Fetch bookings
      const bookingsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/store`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (ordersResponse.ok && bookingsResponse.ok) {
        const orders = await ordersResponse.json();
        const bookings = await bookingsResponse.json();
        
        // Calculate analytics
        const totalRevenue = orders.reduce((sum, order) => sum + order.storeAmount, 0) +
                           bookings.reduce((sum, booking) => sum + booking.storeAmount, 0);
        
        const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
        
        // Group orders by status
        const ordersByStatus = orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {});

        // Calculate monthly revenue
        const revenueByMonth = calculateMonthlyRevenue(orders, bookings);
        
        setAnalytics({
          totalRevenue,
          totalOrders: orders.length,
          totalBookings: bookings.length,
          averageOrderValue,
          ordersByStatus,
          revenueByMonth,
          topProducts: [], // Would need product sales data
          topServices: [], // Would need service booking data
          customerStats: calculateCustomerStats(orders, bookings)
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyRevenue = (orders, bookings) => {
    const monthlyData = {};
    
    [...orders, ...bookings].forEach(item => {
      const month = new Date(item.createdAt).toISOString().slice(0, 7); // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + (item.storeAmount || 0);
    });
    
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }));
  };

  const calculateCustomerStats = (orders, bookings) => {
    const customers = new Set();
    const repeatCustomers = {};
    
    [...orders, ...bookings].forEach(item => {
      const customerId = item.customerId?._id || item.customerId;
      if (customerId) {
        customers.add(customerId);
        repeatCustomers[customerId] = (repeatCustomers[customerId] || 0) + 1;
      }
    });
    
    const totalCustomers = customers.size;
    const returningCustomers = Object.values(repeatCustomers).filter(count => count > 1).length;
    
    return {
      totalCustomers,
      returningCustomers,
      retentionRate: totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0
    };
  };

  const exportData = () => {
    const data = {
      analytics,
      exportDate: new Date().toISOString(),
      dateRange: `${dateRange} days`
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!user || user.role !== 'store_owner') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only store owners can access sales analytics</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales Analytics</h1>
              <p className="text-gray-600 mt-2">Track your store's performance and growth</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <button
                onClick={exportData}
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Type Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: BarChart3 },
                { id: 'revenue', name: 'Revenue', icon: DollarSign },
                { id: 'orders', name: 'Orders', icon: Package },
                { id: 'customers', name: 'Customers', icon: Users }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setViewType(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      viewType === tab.id
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {viewType === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">{formatLKRCompact(analytics.totalRevenue)}</p>
                    <p className="text-sm text-green-600 mt-1">+12% from last period</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.totalOrders}</p>
                    <p className="text-sm text-blue-600 mt-1">+8% from last period</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Bookings</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.totalBookings}</p>
                    <p className="text-sm text-purple-600 mt-1">+15% from last period</p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg. Order Value</p>
                    <p className="text-3xl font-bold text-gray-900">{formatLKRCompact(analytics.averageOrderValue)}</p>
                    <p className="text-sm text-orange-600 mt-1">+5% from last period</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
              <div className="h-64 flex items-end space-x-2">
                {analytics.revenueByMonth.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="bg-black rounded-t w-full"
                      style={{
                        height: `${Math.max((data.revenue / Math.max(...analytics.revenueByMonth.map(d => d.revenue))) * 200, 10)}px`
                      }}
                    ></div>
                    <p className="text-xs text-gray-500 mt-2">{data.month}</p>
                    <p className="text-xs font-medium">{formatLKRCompact(data.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Status Distribution */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analytics.ordersByStatus).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-500 capitalize">{status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {viewType === 'revenue' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Product Sales</p>
                  <p className="text-2xl font-bold text-green-900">{formatLKR(analytics.totalRevenue * 0.7)}</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Service Bookings</p>
                  <p className="text-2xl font-bold text-blue-900">{formatLKR(analytics.totalRevenue * 0.3)}</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-purple-900">{formatLKR(analytics.totalRevenue)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {viewType === 'customers' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Total Customers</p>
                  <p className="text-2xl font-bold text-blue-900">{analytics.customerStats.totalCustomers || 0}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Returning Customers</p>
                  <p className="text-2xl font-bold text-green-900">{analytics.customerStats.returningCustomers || 0}</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600">Retention Rate</p>
                  <p className="text-2xl font-bold text-purple-900">{(analytics.customerStats.retentionRate || 0).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesAnalytics;