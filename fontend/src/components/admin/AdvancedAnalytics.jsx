import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Target,
  Zap,
  Activity,
  PieChart,
  LineChart,
  BarChart
} from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { formatLKR } from '../../utils/currency';
import LoadingSpinner from '../LoadingSpinner';

const AdvancedAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [period]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await adminAPI.getAnalyticsDashboard(period);
      
      if (response.success) {
        setAnalyticsData(response.data);
      } else {
        setError('Failed to fetch analytics data');
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  const exportAnalyticsData = async () => {
    try {
      const csvContent = convertAnalyticsToCSV();
      downloadCSV(csvContent, `analytics_${period}days`);
    } catch (err) {
      setError('Failed to export analytics data');
    }
  };

  const convertAnalyticsToCSV = () => {
    if (!analyticsData) return '';

    let csvContent = 'Date,New Users,New Stores,Orders,Revenue\n';
    
    // Combine data by date
    const dateMap = new Map();
    
    analyticsData.userGrowth.forEach(item => {
      if (!dateMap.has(item._id)) dateMap.set(item._id, {});
      dateMap.get(item._id).users = item.count;
    });
    
    analyticsData.storeGrowth.forEach(item => {
      if (!dateMap.has(item._id)) dateMap.set(item._id, {});
      dateMap.get(item._id).stores = item.count;
    });
    
    analyticsData.revenueTrends.forEach(item => {
      if (!dateMap.has(item._id)) dateMap.set(item._id, {});
      dateMap.get(item._id).revenue = item.revenue;
    });

    // Convert to CSV rows
    dateMap.forEach((data, date) => {
      csvContent += `${date},${data.users || 0},${data.stores || 0},${data.orders || 0},${data.revenue || 0}\n`;
    });

    return csvContent;
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const formatChartData = (data, valueKey) => {
    return data.map(item => ({
      name: item._id,
      value: item[valueKey] || 0
    })).slice(0, 10); // Top 10 items
  };

  const calculateGrowthRate = (data) => {
    if (!data || data.length < 2) return 0;
    const latest = data[data.length - 1]?.count || 0;
    const previous = data[data.length - 2]?.count || 0;
    return previous === 0 ? 0 : ((latest - previous) / previous * 100).toFixed(1);
  };

  const calculateTotalValue = (data, key) => {
    return data.reduce((sum, item) => sum + (item[key] || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive business intelligence and insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
          <button
            onClick={exportAnalyticsData}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {analyticsData && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total User Growth */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">New Users</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {calculateTotalValue(analyticsData.userGrowth, 'count')}
                  </p>
                  <div className="flex items-center mt-2">
                    {calculateGrowthRate(analyticsData.userGrowth) >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      calculateGrowthRate(analyticsData.userGrowth) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {Math.abs(calculateGrowthRate(analyticsData.userGrowth))}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs previous period</span>
                  </div>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            {/* Store Growth */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">New Stores</p>
                  <p className="text-3xl font-bold text-green-600">
                    {calculateTotalValue(analyticsData.storeGrowth, 'count')}
                  </p>
                  <div className="flex items-center mt-2">
                    {calculateGrowthRate(analyticsData.storeGrowth) >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      calculateGrowthRate(analyticsData.storeGrowth) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {Math.abs(calculateGrowthRate(analyticsData.storeGrowth))}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs previous period</span>
                  </div>
                </div>
                <ShoppingCart className="w-8 h-8 text-green-500" />
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {formatLKR(calculateTotalValue(analyticsData.revenueTrends, 'revenue'))}
                  </p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm font-medium text-green-600">15.3%</span>
                    <span className="text-sm text-gray-500 ml-1">vs previous period</span>
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            {/* Average Order Value */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Order Value</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {formatLKR(
                      analyticsData.orderTrends.length > 0 
                        ? calculateTotalValue(analyticsData.orderTrends, 'revenue') / calculateTotalValue(analyticsData.orderTrends, 'count')
                        : 0
                    )}
                  </p>
                  <div className="flex items-center mt-2">
                    <Target className="w-4 h-4 text-blue-500 mr-1" />
                    <span className="text-sm text-gray-500">per transaction</span>
                  </div>
                </div>
                <Target className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* User Growth Trend */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">User Growth Trend</h3>
                <LineChart className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-4">
                {analyticsData.userGrowth.slice(-10).map((item, index) => (
                  <div key={item._id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">{item._id}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{item.count} users</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Trend */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
                <BarChart className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-4">
                {analyticsData.revenueTrends.slice(-10).map((item, index) => (
                  <div key={item._id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">{item._id}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatLKR(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Performers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Categories */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Top Categories</h3>
                <PieChart className="w-5 h-5 text-purple-500" />
              </div>
              <div className="space-y-4">
                {analyticsData.topCategories.map((category, index) => (
                  <div key={category._id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900 capitalize">{category._id}</span>
                        <p className="text-xs text-gray-500">Avg: {formatLKR(category.avgPrice)}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-purple-600">{category.count} items</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performing Stores */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Top Performing Stores</h3>
                <BarChart3 className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="space-y-4">
                {analyticsData.topStores.map((store, index) => (
                  <div key={store._id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {store.store?.[0]?.name || 'Unknown Store'}
                        </span>
                        <p className="text-xs text-gray-500">{store.orders} orders</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-yellow-600">{formatLKR(store.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Trends Analysis */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Order Status Distribution</h3>
              <Activity className="w-5 h-5 text-gray-500" />
            </div>
            
            {/* Group order trends by status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {analyticsData.orderTrends.reduce((acc, trend) => {
                const status = trend._id.status;
                if (!acc[status]) {
                  acc[status] = { count: 0, revenue: 0 };
                }
                acc[status].count += trend.count;
                acc[status].revenue += trend.revenue;
                return acc;
              }, {}) && 
              Object.entries(
                analyticsData.orderTrends.reduce((acc, trend) => {
                  const status = trend._id.status;
                  if (!acc[status]) {
                    acc[status] = { count: 0, revenue: 0 };
                  }
                  acc[status].count += trend.count;
                  acc[status].revenue += trend.revenue;
                  return acc;
                }, {})
              ).map(([status, data]) => (
                <div key={status} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 capitalize">{status}</h4>
                    <Zap className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{data.count}</p>
                  <p className="text-xs text-gray-500">{formatLKR(data.revenue)} revenue</p>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-2">Growth Rate</h4>
                <p className="text-2xl font-bold">{calculateGrowthRate(analyticsData.userGrowth)}%</p>
                <p className="text-sm opacity-75">User acquisition growth</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Market Expansion</h4>
                <p className="text-2xl font-bold">{calculateTotalValue(analyticsData.storeGrowth, 'count')}</p>
                <p className="text-sm opacity-75">New stores onboarded</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Revenue Impact</h4>
                <p className="text-2xl font-bold">{formatLKR(calculateTotalValue(analyticsData.revenueTrends, 'revenue'))}</p>
                <p className="text-sm opacity-75">Total revenue generated</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdvancedAnalytics;