import React, { useState, useEffect } from 'react';
import {
  Store,
  Search,
  Filter,
  Download,
  Edit3,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  Plus,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ShoppingBag,
  Star,
  Eye,
  MoreHorizontal,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Package,
  Crown,
  Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const StoreManagement = () => {
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // UI States
  const [selectedStores, setSelectedStores] = useState([]);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const limit = 20;

  useEffect(() => {
    fetchStores();
  }, [currentPage, searchTerm, statusFilter, subscriptionFilter, sortBy, sortOrder]);

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit,
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(subscriptionFilter !== 'all' && { subscriptionStatus: subscriptionFilter })
      });

      const response = await fetch(`/api/admin/stores?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stores');
      }

      const data = await response.json();
      setStores(data.data);
      setCurrentPage(data.pagination.currentPage);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleStoreAction = async (storeId, action, data = {}) => {
    try {
      const response = await fetch(`/api/admin/stores/${storeId}/${action}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} store`);
      }

      toast.success(`Store ${action}ed successfully`);
      fetchStores();
    } catch (error) {
      console.error(`Error ${action}ing store:`, error);
      toast.error(`Failed to ${action} store`);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedStores.length === 0) {
      toast.error('Please select stores first');
      return;
    }

    try {
      const response = await fetch(`/api/admin/stores/bulk/${action}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ storeIds: selectedStores }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} stores`);
      }

      toast.success(`${selectedStores.length} stores ${action}ed successfully`);
      setSelectedStores([]);
      fetchStores();
    } catch (error) {
      console.error(`Error ${action}ing stores:`, error);
      toast.error(`Failed to ${action} stores`);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/admin/export?type=stores', {
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
      a.download = `stores_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Stores exported successfully');
    } catch (error) {
      console.error('Error exporting stores:', error);
      toast.error('Failed to export stores');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadgeColor = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  };

  const getSubscriptionBadgeColor = (subscription) => {
    if (!subscription) {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
    
    switch (subscription.status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const StoreModal = ({ store, onClose }) => {
    if (!store) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Store Details
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
            {/* Store Header */}
            <div className="flex items-start space-x-6">
              <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt="Store Logo"
                    className="w-24 h-24 rounded-xl object-cover"
                  />
                ) : (
                  <Store className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {store.name}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {store.description}
                </p>
                <div className="flex items-center space-x-4 mt-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(store.isActive)}`}>
                    {store.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {store.subscription && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionBadgeColor(store.subscription)}`}>
                      {store.subscription.package} - {store.subscription.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">
                  {store.metrics?.productCount || 0}
                </div>
                <div className="text-sm text-blue-600">Products</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                <ShoppingBag className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">
                  {store.metrics?.orderCount || 0}
                </div>
                <div className="text-sm text-green-600">Orders</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                <Star className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">
                  {store.metrics?.averageRating || 0}/5
                </div>
                <div className="text-sm text-yellow-600">Rating</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(store.metrics?.monthlyRevenue || 0)}
                </div>
                <div className="text-sm text-purple-600">Monthly Revenue</div>
              </div>
            </div>

            {/* Store Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Owner Info */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900 dark:text-white">Store Owner</h5>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {store.ownerId?.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {store.ownerId?.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Store Info */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900 dark:text-white">Store Information</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Created: {formatDate(store.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Total Sales: {formatCurrency(store.totalSales || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            {store.subscription && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h5 className="font-medium text-gray-900 dark:text-white mb-3">Subscription Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Package:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {store.subscription.package}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {store.subscription.status}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatDate(store.subscription.endDate)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleStoreAction(store._id, store.isActive ? 'suspend' : 'activate')}
                className={`flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                  store.isActive
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500'
                    : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                }`}
              >
                {store.isActive ? 'Suspend Store' : 'Activate Store'}
              </button>
              <button
                onClick={() => handleStoreAction(store._id, 'edit')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Edit Store
              </button>
              <button
                onClick={() => handleStoreAction(store._id, 'delete')}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete Store
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Store Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage and monitor store performance across the platform
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowStoreModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Store
          </button>
          
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Download className={`w-4 h-4 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Stores
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {totalCount}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <Store className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Stores
              </p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stores.filter(store => store.isActive).length}
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
                Premium Stores
              </p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {stores.filter(store => store.subscription?.status === 'active').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-500">
              <Crown className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Review
              </p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {stores.filter(store => !store.isActive).length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-yellow-500">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Subscription Filter */}
          <select
            value={subscriptionFilter}
            onChange={(e) => setSubscriptionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Subscriptions</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="pending">Pending</option>
            <option value="none">No Subscription</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchStores}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedStores.length > 0 && (
          <div className="mt-4 flex items-center space-x-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedStores.length} store{selectedStores.length !== 1 ? 's' : ''} selected:
            </span>
            <button
              onClick={() => handleBulkAction('activate')}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('suspend')}
              className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
            >
              Suspend
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Stores Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedStores.length === stores.length && stores.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStores(stores.map(store => store._id));
                      } else {
                        setSelectedStores([]);
                      }
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('name')}
                >
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Metrics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Subscription
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('createdAt')}
                >
                  Created
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
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : stores.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <Store className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No stores found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Try adjusting your search or filter criteria
                    </p>
                  </td>
                </tr>
              ) : (
                stores.map((store) => (
                  <tr key={store._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedStores.includes(store._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStores([...selectedStores, store._id]);
                          } else {
                            setSelectedStores(selectedStores.filter(id => id !== store._id));
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          {store.logo ? (
                            <img
                              src={store.logo}
                              alt="Store Logo"
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <Store className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {store.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                            {store.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {store.ownerId?.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {store.ownerId?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(store.isActive)}`}>
                        {store.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <Package className="w-3 h-3 mr-1" />
                          {store.metrics?.productCount || 0} products
                        </div>
                        <div className="flex items-center">
                          <ShoppingBag className="w-3 h-3 mr-1" />
                          {store.metrics?.orderCount || 0} orders
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {formatCurrency(store.metrics?.monthlyRevenue || 0)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {store.subscription ? (
                        <div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSubscriptionBadgeColor(store.subscription)}`}>
                            {store.subscription.package}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {store.subscription.status}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">No subscription</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(store.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedStore(store);
                            setShowStoreModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <div className="relative group">
                          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          
                          <div className="absolute right-0 top-6 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => handleStoreAction(store._id, 'edit')}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <Edit3 className="w-4 h-4 inline mr-2" />
                                Edit Store
                              </button>
                              <button
                                onClick={() => handleStoreAction(store._id, store.isActive ? 'suspend' : 'activate')}
                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${
                                  store.isActive 
                                    ? 'text-yellow-700 dark:text-yellow-300' 
                                    : 'text-green-700 dark:text-green-300'
                                }`}
                              >
                                {store.isActive ? (
                                  <>
                                    <Ban className="w-4 h-4 inline mr-2" />
                                    Suspend
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 inline mr-2" />
                                    Activate
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleStoreAction(store._id, 'delete')}
                                className="block w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <Trash2 className="w-4 h-4 inline mr-2" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * limit, totalCount)}</span> of{' '}
                    <span className="font-medium">{totalCount}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 text-indigo-600 dark:text-indigo-300'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Store Modal */}
      {showStoreModal && (
        <StoreModal
          store={selectedStore}
          onClose={() => {
            setShowStoreModal(false);
            setSelectedStore(null);
          }}
        />
      )}
    </div>
  );
};

export default StoreManagement;