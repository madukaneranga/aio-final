import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Package,
  Users,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit3,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCcw,
  Eye,
  MoreHorizontal,
  Crown,
  Star,
  TrendingUp,
  TrendingDown,
  Award
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const SubscriptionManagement = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [pendingSubscriptions, setPendingSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('subscriptions');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');

  // UI States
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [statusFilter, packageFilter, searchTerm]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [subscriptionsRes, packagesRes, pendingRes] = await Promise.all([
        fetch('/api/admin/subscriptions', { credentials: 'include' }),
        fetch('/api/admin/packages', { credentials: 'include' }),
        fetch('/api/admin/pending-subscriptions', { credentials: 'include' })
      ]);

      if (subscriptionsRes.ok) {
        const data = await subscriptionsRes.json();
        setSubscriptions(data.data || []);
      }

      if (packagesRes.ok) {
        const data = await packagesRes.json();
        setPackages(data.data || []);
      }

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingSubscriptions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscriptionAction = async (subscriptionId, action, data = {}) => {
    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/${action}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} subscription`);
      }

      toast.success(`Subscription ${action}ed successfully`);
      fetchData();
    } catch (error) {
      console.error(`Error ${action}ing subscription:`, error);
      toast.error(`Failed to ${action} subscription`);
    }
  };

  const handlePackageAction = async (packageId, action, data = {}) => {
    try {
      const response = await fetch(`/api/admin/packages/${packageId}/${action}`, {
        method: action === 'delete' ? 'DELETE' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} package`);
      }

      toast.success(`Package ${action}ed successfully`);
      fetchData();
    } catch (error) {
      console.error(`Error ${action}ing package:`, error);
      toast.error(`Failed to ${action} package`);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPackageBadgeColor = (packageName) => {
    switch (packageName?.toLowerCase()) {
      case 'premium':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'pro':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'basic':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const SubscriptionModal = ({ subscription, onClose }) => {
    if (!subscription) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Subscription Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Package
                </label>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {subscription.package}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(subscription.status)}`}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Amount and Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Amount
                </label>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(subscription.amount)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Date
                </label>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(subscription.startDate)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Date
                </label>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(subscription.endDate)}
                </div>
              </div>
            </div>

            {/* User and Store Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  User
                </label>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {subscription.userId?.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {subscription.userId?.email}
                    </div>
                  </div>
                </div>
              </div>
              
              {subscription.storeId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Store
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {subscription.storeId.name}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Info */}
            {subscription.paymentMethod && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Payment Method
                </label>
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  {subscription.paymentMethod} - {subscription.transactionId}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {subscription.status === 'active' && (
                <button
                  onClick={() => {
                    handleSubscriptionAction(subscription._id, 'cancel');
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Cancel Subscription
                </button>
              )}
              <button
                onClick={() => {
                  const days = prompt('Extend by how many days?');
                  if (days && !isNaN(days)) {
                    handleSubscriptionAction(subscription._id, 'extend', { days: parseInt(days) });
                    onClose();
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Extend Subscription
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PackageModal = ({ package: pkg, onClose }) => {
    const [formData, setFormData] = useState({
      name: pkg?.name || '',
      description: pkg?.description || '',
      price: pkg?.price || 0,
      duration: pkg?.duration || 30,
      features: pkg?.features?.join('\n') || '',
      isActive: pkg?.isActive !== false
    });

    const handleSave = async () => {
      try {
        const data = {
          ...formData,
          features: formData.features.split('\n').filter(f => f.trim())
        };

        if (pkg) {
          await handlePackageAction(pkg._id, 'update', data);
        } else {
          await fetch('/api/admin/packages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
          });
          toast.success('Package created successfully');
          fetchData();
        }
        onClose();
      } catch (error) {
        console.error('Error saving package:', error);
        toast.error('Failed to save package');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {pkg ? 'Edit Package' : 'Create Package'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Package Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Price ($)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Duration (days)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active Package
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Features (one per line)
              </label>
              <textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                rows={5}
                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {pkg ? 'Update Package' : 'Create Package'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = searchTerm === '' || 
      sub.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.package?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesPackage = packageFilter === 'all' || sub.package === packageFilter;
    
    return matchesSearch && matchesStatus && matchesPackage;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Subscription Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage subscription plans, packages, and billing
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowPackageModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Package
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Subscriptions
              </p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {subscriptions.filter(sub => sub.status === 'active').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Payments
              </p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {pendingSubscriptions.length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-yellow-500">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Monthly Revenue
              </p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {formatCurrency(
                  subscriptions
                    .filter(sub => sub.status === 'active')
                    .reduce((total, sub) => total + sub.amount, 0)
                )}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Available Packages
              </p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {packages.length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-500">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'subscriptions'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Active Subscriptions ({subscriptions.length})
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'packages'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Packages ({packages.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Pending ({pendingSubscriptions.length})
            </button>
          </nav>
        </div>

        {/* Filters */}
        {activeTab === 'subscriptions' && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search subscriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={packageFilter}
                onChange={(e) => setPackageFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Packages</option>
                {packages.map(pkg => (
                  <option key={pkg._id} value={pkg.name}>{pkg.name}</option>
                ))}
              </select>

              <button
                onClick={fetchData}
                disabled={isLoading}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="overflow-x-auto">
          {activeTab === 'subscriptions' && (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User & Store
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-6 py-4 whitespace-nowrap">
                          <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No subscriptions found</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Try adjusting your search or filter criteria
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((subscription) => (
                    <tr key={subscription._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {subscription.userId?.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {subscription.storeId?.name || 'No store'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPackageBadgeColor(subscription.package)}`}>
                          {subscription.package}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(subscription.status)}`}>
                          {subscription.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatCurrency(subscription.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div>
                          <div>{formatDate(subscription.startDate)}</div>
                          <div>to {formatDate(subscription.endDate)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setShowSubscriptionModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'packages' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                  <div key={pkg._id} className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {pkg.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {pkg.description}
                        </p>
                      </div>
                      <div className="relative group">
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        <div className="absolute right-0 top-6 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                setSelectedPackage(pkg);
                                setShowPackageModal(true);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                              <Edit3 className="w-4 h-4 inline mr-2" />
                              Edit Package
                            </button>
                            <button
                              onClick={() => handlePackageAction(pkg._id, 'delete')}
                              className="block w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                              <Trash2 className="w-4 h-4 inline mr-2" />
                              Delete Package
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(pkg.price)}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                          /{pkg.duration} days
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {pkg.features?.map((feature, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pkg.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {pkg.isActive ? 'Active' : 'Inactive'}
                      </span>
                      
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {subscriptions.filter(sub => sub.package === pkg.name).length} subscribers
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="p-6">
              <div className="space-y-4">
                {pendingSubscriptions.map((pending) => (
                  <div key={pending._id} className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {pending.userId?.name} - {pending.package}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Amount: {formatCurrency(pending.amount)} | Order ID: {pending.orderId}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Created: {formatDate(pending.createdAt)}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 text-xs rounded-full">
                          Pending Payment
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {pendingSubscriptions.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      No pending subscriptions
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      All subscription payments are up to date.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showSubscriptionModal && (
        <SubscriptionModal
          subscription={selectedSubscription}
          onClose={() => {
            setShowSubscriptionModal(false);
            setSelectedSubscription(null);
          }}
        />
      )}

      {showPackageModal && (
        <PackageModal
          package={selectedPackage}
          onClose={() => {
            setShowPackageModal(false);
            setSelectedPackage(null);
          }}
        />
      )}
    </div>
  );
};

export default SubscriptionManagement;