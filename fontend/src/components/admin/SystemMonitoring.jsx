import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  Users,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  MemoryStick,
  HardDrive,
  Wifi,
  RefreshCw
} from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { formatLKR } from '../../utils/currency';

const SystemMonitoring = () => {
  const [systemStats, setSystemStats] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSystemData();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSystemData();
      }, 30000); // Update every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchSystemData = async () => {
    try {
      const [statsResponse, healthResponse] = await Promise.all([
        adminAPI.getSystemStats(),
        adminAPI.getSystemHealth()
      ]);

      if (statsResponse.success) {
        setSystemStats(statsResponse.data);
      }
      
      if (healthResponse.success) {
        setSystemHealth(healthResponse.data);
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (uptime) => {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getHealthStatus = (status) => {
    const statusConfig = {
      healthy: { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
      warning: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertTriangle },
      critical: { color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle }
    };
    
    return statusConfig[status] || statusConfig.warning;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600 mt-2">Real-time system health and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium ${
              autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={fetchSystemData}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">System Health</h2>
            <div className="flex items-center space-x-2">
              {React.createElement(getHealthStatus(systemHealth.overallStatus).icon, {
                className: `w-5 h-5 ${getHealthStatus(systemHealth.overallStatus).color}`
              })}
              <span className={`font-medium ${getHealthStatus(systemHealth.overallStatus).color}`}>
                {systemHealth.overallStatus.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Database Health */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Database className="w-8 h-8 text-blue-600" />
                <span className="text-xs font-medium text-green-600">HEALTHY</span>
              </div>
              <h3 className="font-semibold text-gray-900">Database</h3>
              <p className="text-sm text-gray-600">Response: {systemHealth.database.responseTime}ms</p>
            </div>

            {/* Memory Usage */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <MemoryStick className="w-8 h-8 text-purple-600" />
                <span className="text-xs font-medium text-blue-600">
                  {Math.round((systemHealth.memory.heapUsed / systemHealth.memory.heapTotal) * 100)}%
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">Memory</h3>
              <p className="text-sm text-gray-600">
                {formatBytes(systemHealth.memory.heapUsed)} / {formatBytes(systemHealth.memory.heapTotal)}
              </p>
            </div>

            {/* System Uptime */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Clock className="w-8 h-8 text-green-600" />
                <span className="text-xs font-medium text-green-600">STABLE</span>
              </div>
              <h3 className="font-semibold text-gray-900">Uptime</h3>
              <p className="text-sm text-gray-600">{formatUptime(systemHealth.uptime)}</p>
            </div>

            {/* Node.js Version */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Server className="w-8 h-8 text-gray-600" />
                <span className="text-xs font-medium text-gray-600">v{systemHealth.version.replace('v', '')}</span>
              </div>
              <h3 className="font-semibold text-gray-900">Runtime</h3>
              <p className="text-sm text-gray-600">{systemHealth.platform}</p>
            </div>
          </div>

          {/* Critical Issues */}
          {systemHealth.criticalIssues && systemHealth.criticalIssues.length > 0 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="font-semibold text-red-800">Critical Issues</h3>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {systemHealth.criticalIssues.map((issue, index) => (
                  <li key={index} className="text-red-700 text-sm">{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* System Statistics */}
      {systemStats && (
        <>
          {/* Total Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{systemStats.totals.users.toLocaleString()}</p>
                  <p className="text-xs text-green-600">+{systemStats.active.users} active</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Stores</p>
                  <p className="text-3xl font-bold text-gray-900">{systemStats.totals.stores.toLocaleString()}</p>
                  <p className="text-xs text-green-600">+{systemStats.active.stores} active</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">{formatLKR(systemStats.totals.revenue)}</p>
                  <p className="text-xs text-gray-500">All time</p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{systemStats.totals.orders.toLocaleString()}</p>
                  <p className="text-xs text-blue-600">+{systemStats.totals.bookings} bookings</p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Recent Activity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Last 24 Hours</h3>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">New Users</span>
                  <span className="font-semibold">{systemStats.recent24h.users}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">New Stores</span>
                  <span className="font-semibold">{systemStats.recent24h.stores}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Orders</span>
                  <span className="font-semibold">{systemStats.recent24h.orders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bookings</span>
                  <span className="font-semibold">{systemStats.recent24h.bookings}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Content</h3>
                <Zap className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Products</span>
                  <span className="font-semibold">{systemStats.totals.products.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Services</span>
                  <span className="font-semibold">{systemStats.totals.services.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Posts</span>
                  <span className="font-semibold">{systemStats.totals.posts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reviews</span>
                  <span className="font-semibold">{systemStats.totals.reviews.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Communication</h3>
                <Wifi className="w-5 h-5 text-purple-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Chats</span>
                  <span className="font-semibold">{systemStats.totals.chats.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Notifications</span>
                  <span className="font-semibold">{systemStats.totals.notifications.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Users</span>
                  <span className="font-semibold text-green-600">{systemStats.active.users.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Stores</span>
                  <span className="font-semibold text-green-600">{systemStats.active.stores.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">System Status</h3>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Database Status</span>
                  <span className="font-semibold text-green-600">Healthy</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">API Response</span>
                  <span className="font-semibold text-blue-600">
                    {systemHealth?.database.responseTime || 0}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Memory Usage</span>
                  <span className="font-semibold text-yellow-600">
                    {systemHealth ? Math.round((systemHealth.memory.heapUsed / systemHealth.memory.heapTotal) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Uptime</span>
                  <span className="font-semibold text-green-600">
                    {systemHealth ? formatUptime(systemHealth.uptime) : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemMonitoring;