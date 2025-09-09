import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Users,
  ShoppingBag,
  DollarSign,
  Store,
  Eye,
  Filter,
  RefreshCcw,
  FileText,
  PieChart,
  Activity,
  Target,
  Award,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ComposedChart,
  Legend
} from 'recharts';

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [compareMode, setCompareMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, selectedMetric]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/analytics?period=${selectedPeriod}&metric=${selectedMetric}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalyticsData(data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      setIsExporting(true);
      const response = await fetch(`/api/admin/analytics/export?format=${format}&period=${selectedPeriod}&metric=${selectedMetric}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `analytics_report_${selectedPeriod}d_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Analytics report exported successfully');
    } catch (error) {
      console.error('Error exporting analytics:', error);
      toast.error('Failed to export analytics report');
    } finally {
      setIsExporting(false);
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

  const calculateGrowth = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const MetricCard = ({ title, value, icon: Icon, color, growth, prefix = '', suffix = '', trend = null }) => {
    const isPositive = parseFloat(growth) >= 0;
    
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
        
        {growth !== undefined && (
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
              vs previous period
            </span>
          </div>
        )}
        
        {trend && (
          <div className="mt-2">
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <Activity className="w-3 h-3 mr-1" />
              {trend}
            </div>
          </div>
        )}
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg border border-gray-600">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.name.includes('Revenue') || entry.name.includes('Amount') 
                ? formatCurrency(entry.value) 
                : formatNumber(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading && !analyticsData) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No analytics data available</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Unable to load analytics data. Please try again.
        </p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  const { data: chartData, total, count, trends } = analyticsData;

  // Mock previous period data for growth calculation
  const previousPeriodData = {
    total: total * 0.85,
    count: count * 0.92,
    users: 1250,
    stores: 89,
    orders: 445,
    revenue: 52340
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analytics & Reports
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Comprehensive analytics and business intelligence reports
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>

          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="revenue">Revenue</option>
            <option value="orders">Orders</option>
            <option value="users">Users</option>
            <option value="stores">Stores</option>
          </select>

          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <div className="relative">
            <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            
            <div className="absolute right-0 top-12 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="py-1">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Export as PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title={`Total ${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}`}
          value={selectedMetric === 'revenue' ? total : count}
          icon={selectedMetric === 'revenue' ? DollarSign : 
                selectedMetric === 'users' ? Users :
                selectedMetric === 'stores' ? Store : ShoppingBag}
          color="bg-blue-500"
          growth={calculateGrowth(
            selectedMetric === 'revenue' ? total : count,
            selectedMetric === 'revenue' ? previousPeriodData.total : previousPeriodData.count
          )}
          prefix={selectedMetric === 'revenue' ? '$' : ''}
          trend={trends?.[selectedMetric] || 'Steady growth'}
        />
        
        <MetricCard
          title="Active Users"
          value={1350}
          icon={Users}
          color="bg-green-500"
          growth={calculateGrowth(1350, previousPeriodData.users)}
          trend="Strong engagement"
        />
        
        <MetricCard
          title="Active Stores"
          value={95}
          icon={Store}
          color="bg-purple-500"
          growth={calculateGrowth(95, previousPeriodData.stores)}
          trend="Growing marketplace"
        />
        
        <MetricCard
          title="Conversion Rate"
          value={3.2}
          icon={Target}
          color="bg-orange-500"
          growth={5.2}
          suffix="%"
          trend="Above average"
        />
      </div>

      {/* Main Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trend
          </h3>
          
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={compareMode}
                onChange={(e) => setCompareMode(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Compare with previous period
              </span>
            </label>
          </div>
        </div>
        
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                dataKey="label" 
                className="text-gray-600 dark:text-gray-400" 
              />
              <YAxis 
                className="text-gray-600 dark:text-gray-400"
                tickFormatter={(value) => 
                  selectedMetric === 'revenue' ? formatCurrency(value) : formatNumber(value)
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <Area
                type="monotone"
                dataKey="value"
                stroke={COLORS[0]}
                fill={COLORS[0]}
                fillOpacity={0.1}
                strokeWidth={3}
                name={selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
              />
              
              {compareMode && (
                <Line
                  type="monotone"
                  dataKey="previousValue"
                  stroke={COLORS[1]}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Previous Period"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Revenue Breakdown
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={[
                    { name: 'Product Sales', value: 65, color: COLORS[0] },
                    { name: 'Subscriptions', value: 20, color: COLORS[1] },
                    { name: 'Commissions', value: 10, color: COLORS[2] },
                    { name: 'Other', value: 5, color: COLORS[3] }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Product Sales', value: 65 },
                    { name: 'Subscriptions', value: 20 },
                    { name: 'Commissions', value: 10 },
                    { name: 'Other', value: 5 }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgb(55 65 81)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performing Categories */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Categories
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Electronics', sales: 45000, orders: 320 },
                  { name: 'Fashion', sales: 38000, orders: 280 },
                  { name: 'Home & Garden', sales: 25000, orders: 180 },
                  { name: 'Sports', sales: 18000, orders: 125 },
                  { name: 'Books', sales: 12000, orders: 95 }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="name" 
                  className="text-gray-600 dark:text-gray-400"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis 
                  className="text-gray-600 dark:text-gray-400"
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="sales" fill={COLORS[0]} name="Sales Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Sources */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Traffic Sources
          </h3>
          <div className="space-y-4">
            {[
              { source: 'Direct', percentage: 45, visitors: 12500 },
              { source: 'Search Engines', percentage: 32, visitors: 8900 },
              { source: 'Social Media', percentage: 15, visitors: 4200 },
              { source: 'Referrals', percentage: 8, visitors: 2200 }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index] }}
                  ></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.source}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {item.percentage}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatNumber(item.visitors)} visitors
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {[
              { type: 'order', message: 'New order #12345', time: '2 minutes ago', icon: ShoppingBag },
              { type: 'user', message: 'User John registered', time: '5 minutes ago', icon: Users },
              { type: 'store', message: 'Store "Tech Hub" approved', time: '15 minutes ago', icon: Store },
              { type: 'revenue', message: 'Revenue milestone reached', time: '1 hour ago', icon: Award }
            ].map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-700`}>
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.message}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {activity.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Stats
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg. Order Value</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {formatCurrency(125.50)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Customer Lifetime Value</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {formatCurrency(850.25)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Return Customer Rate</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">32%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Cart Abandonment Rate</span>
              <span className="text-sm font-bold text-red-600">28%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Page Load Time</span>
              <span className="text-sm font-bold text-green-600">1.2s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;