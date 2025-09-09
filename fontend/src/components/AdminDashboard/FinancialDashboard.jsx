import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Calendar,
  Eye,
  MoreHorizontal,
  Wallet,
  PiggyBank,
  Target,
  Award
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
  PieChart,
  Pie,
  Cell
} from 'recharts';

const FinancialDashboard = () => {
  const [financialData, setFinancialData] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [withdrawalFilter, setWithdrawalFilter] = useState('all');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  useEffect(() => {
    fetchFinancialData();
    fetchWithdrawals();
  }, [selectedPeriod, withdrawalFilter]);

  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/dashboard/financial?period=${selectedPeriod}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch financial data');
      }

      const data = await response.json();
      setFinancialData(data.data);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const params = new URLSearchParams({
        status: withdrawalFilter,
        limit: 50
      });

      const response = await fetch(`/api/admin/withdrawals?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const handleWithdrawalAction = async (withdrawalId, action, data = {}) => {
    try {
      const response = await fetch(`/api/admin/withdrawals/${withdrawalId}/${action}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} withdrawal`);
      }

      toast.success(`Withdrawal ${action}ed successfully`);
      fetchWithdrawals();
      fetchFinancialData();
    } catch (error) {
      console.error(`Error ${action}ing withdrawal:`, error);
      toast.error(`Failed to ${action} withdrawal`);
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

  const getWithdrawalStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const MetricCard = ({ title, value, icon: Icon, color, change, prefix = '', suffix = '' }) => {
    const isPositive = change >= 0;
    
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
        
        {change !== undefined && (
          <div className="flex items-center mt-4">
            <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 mr-1" />
              )}
              <span className="text-sm font-medium">
                {Math.abs(change)}%
              </span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              vs last period
            </span>
          </div>
        )}
      </div>
    );
  };

  const WithdrawalModal = ({ withdrawal, onClose }) => {
    if (!withdrawal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Withdrawal Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <CheckCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Amount
                </label>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(withdrawal.amount)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getWithdrawalStatusColor(withdrawal.status)}`}>
                  {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                </span>
              </div>
            </div>

            {/* User Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Store Owner
              </label>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {withdrawal.userId?.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {withdrawal.userId?.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            {withdrawal.bankDetails && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bank Details
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Bank Name:</span>
                      <div className="font-medium">{withdrawal.bankDetails.bankName}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Account Number:</span>
                      <div className="font-medium">****{withdrawal.bankDetails.accountNumber?.slice(-4)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Account Holder:</span>
                      <div className="font-medium">{withdrawal.bankDetails.accountHolderName}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Branch:</span>
                      <div className="font-medium">{withdrawal.bankDetails.branch}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Requested At
                </label>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(withdrawal.createdAt).toLocaleString()}
                </div>
              </div>
              {withdrawal.processedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Processed At
                  </label>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(withdrawal.processedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {withdrawal.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  {withdrawal.notes}
                </div>
              </div>
            )}

            {/* Actions */}
            {withdrawal.status === 'pending' && (
              <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    handleWithdrawalAction(withdrawal._id, 'approve');
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Enter rejection reason:');
                    if (reason) {
                      handleWithdrawalAction(withdrawal._id, 'reject', { reason });
                      onClose();
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading && !financialData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!financialData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No financial data available</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Unable to load financial dashboard data. Please try again.
        </p>
        <button
          onClick={fetchFinancialData}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  const { overview, charts } = financialData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Financial Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Monitor revenue, withdrawals, and financial performance
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

          <button
            onClick={fetchFinancialData}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={overview.totalRevenue}
          icon={DollarSign}
          color="bg-green-500"
          change={15.2}
          prefix="$"
        />
        <MetricCard
          title="Period Revenue"
          value={overview.periodRevenue}
          icon={TrendingUp}
          color="bg-blue-500"
          change={8.7}
          prefix="$"
        />
        <MetricCard
          title="Pending Withdrawals"
          value={overview.pendingWithdrawals.amount}
          icon={Clock}
          color="bg-yellow-500"
          change={-12.3}
          prefix="$"
        />
        <MetricCard
          title="Commission Earned"
          value={overview.commissionEarned}
          icon={Award}
          color="bg-purple-500"
          change={22.1}
          prefix="$"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Daily Revenue Trend
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="date" 
                  className="text-gray-600 dark:text-gray-400" 
                />
                <YAxis 
                  className="text-gray-600 dark:text-gray-400"
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(55 65 81)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Stores Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Stores by Revenue
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.topStores} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  type="number"
                  className="text-gray-600 dark:text-gray-400"
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <YAxis 
                  type="category"
                  dataKey="storeName" 
                  className="text-gray-600 dark:text-gray-400"
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(55 65 81)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Withdrawal Status Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Withdrawal Status Distribution
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={charts.withdrawalsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({_id, count, total}) => `${_id}: ${count} (${formatCurrency(total)})`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {charts.withdrawalsByStatus.map((entry, index) => (
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
                formatter={(value, name, props) => [
                  `${value} withdrawals (${formatCurrency(props.payload.total)})`,
                  props.payload._id
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Withdrawals Management */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Withdrawal Requests
            </h3>
            
            <div className="flex space-x-3">
              <select
                value={withdrawalFilter}
                onChange={(e) => setWithdrawalFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Store Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Requested
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <Wallet className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      No withdrawal requests
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      No withdrawal requests match your current filter.
                    </p>
                  </td>
                </tr>
              ) : (
                withdrawals.map((withdrawal) => (
                  <tr key={withdrawal._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {withdrawal.userId?.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {withdrawal.userId?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(withdrawal.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWithdrawalStatusColor(withdrawal.status)}`}>
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(withdrawal.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setShowWithdrawalModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {withdrawal.status === 'pending' && (
                          <div className="relative group">
                            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            
                            <div className="absolute right-0 top-6 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => handleWithdrawalAction(withdrawal._id, 'approve')}
                                  className="block w-full text-left px-4 py-2 text-sm text-green-700 dark:text-green-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <CheckCircle className="w-4 h-4 inline mr-2" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Enter rejection reason:');
                                    if (reason) {
                                      handleWithdrawalAction(withdrawal._id, 'reject', { reason });
                                    }
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <AlertCircle className="w-4 h-4 inline mr-2" />
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <WithdrawalModal
          withdrawal={selectedWithdrawal}
          onClose={() => {
            setShowWithdrawalModal(false);
            setSelectedWithdrawal(null);
          }}
        />
      )}
    </div>
  );
};

export default FinancialDashboard;