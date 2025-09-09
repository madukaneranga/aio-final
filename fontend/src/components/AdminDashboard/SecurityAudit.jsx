import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  Eye,
  Lock,
  Unlock,
  User,
  Clock,
  MapPin,
  Monitor,
  Smartphone,
  Globe,
  Search,
  Filter,
  Download,
  RefreshCcw,
  Activity,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Ban,
  UserX,
  Key,
  Settings,
  FileText,
  Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const SecurityAudit = () => {
  const [activities, setActivities] = useState([]);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activities');
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const tabs = [
    { id: 'activities', label: 'Admin Activities', icon: Activity },
    { id: 'security', label: 'Security Alerts', icon: AlertTriangle },
    { id: 'logins', label: 'Login Attempts', icon: Lock },
    { id: 'overview', label: 'Security Overview', icon: Shield }
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedTimeRange, searchTerm, severityFilter, currentPage]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const endpoints = {
        activities: '/api/admin/activities',
        security: '/api/admin/security/alerts',
        logins: '/api/admin/security/login-attempts',
        overview: '/api/admin/security/overview'
      };

      const params = new URLSearchParams({
        timeRange: selectedTimeRange,
        page: currentPage,
        limit: 20,
        ...(searchTerm && { search: searchTerm }),
        ...(severityFilter !== 'all' && { severity: severityFilter })
      });

      const response = await fetch(`${endpoints[activeTab]}?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${activeTab} data`);
      }

      const data = await response.json();
      
      switch (activeTab) {
        case 'activities':
          setActivities(data.data || []);
          break;
        case 'security':
          setSecurityAlerts(data.data || []);
          break;
        case 'logins':
          setLoginAttempts(data.data || []);
          break;
      }
      
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab} data:`, error);
      toast.error(`Failed to load ${activeTab} data`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/admin/security/export?type=${activeTab}&timeRange=${selectedTimeRange}`, {
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
      a.download = `security_${activeTab}_${selectedTimeRange}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Security report exported successfully');
    } catch (error) {
      console.error('Error exporting security data:', error);
      toast.error('Failed to export security report');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'blocked':
        return <Ban className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getActionIcon = (action) => {
    if (action?.includes('LOGIN')) return <Lock className="w-4 h-4" />;
    if (action?.includes('USER')) return <User className="w-4 h-4" />;
    if (action?.includes('STORE')) return <Monitor className="w-4 h-4" />;
    if (action?.includes('SYSTEM')) return <Settings className="w-4 h-4" />;
    if (action?.includes('SECURITY')) return <Shield className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const renderActivities = () => (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No activities found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            No admin activities match your current filter criteria.
          </p>
        </div>
      ) : (
        activities.map((activity) => (
          <div key={activity._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {getActionIcon(activity.action)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.adminId?.name || 'Unknown Admin'}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                      {activity.severity}
                    </span>
                    {getStatusIcon(activity.status)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activity.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(activity.createdAt)}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {activity.metadata?.ipAddress}
                    </div>
                    <div className="flex items-center">
                      {activity.metadata?.deviceType === 'mobile' ? 
                        <Smartphone className="w-3 h-3 mr-1" /> : 
                        <Monitor className="w-3 h-3 mr-1" />
                      }
                      {activity.metadata?.deviceType || 'desktop'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {activity.changes && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Changes Made:
                </h5>
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                  {JSON.stringify(activity.changes, null, 2)}
                </pre>
              </div>
            )}

            {activity.errorDetails && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <h5 className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">
                  Error Details:
                </h5>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {activity.errorDetails.message}
                </p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderSecurityAlerts = () => (
    <div className="space-y-4">
      {securityAlerts.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-green-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            All Clear!
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            No security alerts for the selected time period.
          </p>
        </div>
      ) : (
        securityAlerts.map((alert) => (
          <div key={alert._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-red-500">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {alert.title || 'Security Alert'}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {alert.description}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(alert.createdAt)}
                    </div>
                    {alert.ipAddress && (
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {alert.ipAddress}
                      </div>
                    )}
                    {alert.userAgent && (
                      <div className="flex items-center">
                        <Globe className="w-3 h-3 mr-1" />
                        {alert.userAgent.substring(0, 30)}...
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {alert.recommendations && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h5 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Recommendations:
                </h5>
                <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                  {alert.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderLoginAttempts = () => (
    <div className="space-y-4">
      {loginAttempts.length === 0 ? (
        <div className="text-center py-12">
          <Lock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No login attempts
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            No login attempts found for the selected time period.
          </p>
        </div>
      ) : (
        loginAttempts.map((attempt) => (
          <div key={attempt._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {getStatusIcon(attempt.success ? 'success' : 'failed')}
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {attempt.email || attempt.username}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      attempt.success 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {attempt.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(attempt.timestamp)}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {attempt.ipAddress}
                    </div>
                    <div className="flex items-center">
                      <Globe className="w-3 h-3 mr-1" />
                      {attempt.location || 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
              
              {!attempt.success && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  {attempt.failureReason}
                </div>
              )}
            </div>

            {attempt.userAgent && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">User Agent:</span> {attempt.userAgent}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderSecurityOverview = () => (
    <div className="space-y-6">
      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Activities
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                1,245
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
          <div className="flex items-center mt-2 text-sm text-green-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            +12% from last week
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Security Alerts
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                23
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div className="flex items-center mt-2 text-sm text-red-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            +5 new alerts
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Failed Logins
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                8
              </p>
            </div>
            <XCircle className="w-8 h-8 text-yellow-500" />
          </div>
          <div className="flex items-center mt-2 text-sm text-green-600">
            <TrendingDown className="w-4 h-4 mr-1" />
            -15% from yesterday
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Sessions
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                156
              </p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
          <div className="flex items-center mt-2 text-sm text-blue-600">
            <Activity className="w-4 h-4 mr-1" />
            Real-time
          </div>
        </div>
      </div>

      {/* Recent Critical Events */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Critical Events
        </h3>
        <div className="space-y-3">
          {[
            {
              event: 'Multiple failed login attempts detected',
              severity: 'HIGH',
              time: '2 minutes ago',
              ip: '192.168.1.100'
            },
            {
              event: 'Admin user created new account',
              severity: 'MEDIUM',
              time: '15 minutes ago',
              ip: '10.0.0.50'
            },
            {
              event: 'System settings modified',
              severity: 'HIGH',
              time: '1 hour ago',
              ip: '172.16.0.25'
            }
          ].map((event, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  event.severity === 'HIGH' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {event.event}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {event.time} • {event.ip}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                {event.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'activities':
        return renderActivities();
      case 'security':
        return renderSecurityAlerts();
      case 'logins':
        return renderLoginAttempts();
      case 'overview':
        return renderSecurityOverview();
      default:
        return renderActivities();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Security & Audit
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Monitor system security, admin activities, and audit trails
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filters */}
      {activeTab !== 'overview' && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              Showing {isLoading ? '...' : activities.length || securityAlerts.length || loginAttempts.length} results
            </div>

            <div className="flex justify-end">
              <button className="inline-flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                <Filter className="w-4 h-4 mr-1" />
                More Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="min-h-96">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          renderContent()
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && activeTab !== 'overview' && (
        <div className="flex justify-center">
          <nav className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 border rounded-lg text-sm font-medium ${
                    currentPage === page
                      ? 'bg-indigo-50 dark:bg-indigo-900 border-indigo-500 text-indigo-600 dark:text-indigo-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default SecurityAudit;