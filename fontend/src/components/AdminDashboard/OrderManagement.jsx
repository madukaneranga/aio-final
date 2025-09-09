import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Download,
  Eye,
  Edit3,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  Store,
  Calendar,
  MoreHorizontal,
  RefreshCcw,
  AlertTriangle,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // UI States
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const limit = 20;

  useEffect(() => {
    fetchOrders();
  }, [currentPage, searchTerm, statusFilter, paymentFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit,
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(paymentFilter !== 'all' && { paymentStatus: paymentFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      });

      const response = await fetch(`/api/admin/orders?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.data);
      setCurrentPage(data.pagination.currentPage);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderAction = async (orderId, action, data = {}) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/${action}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} order`);
      }

      toast.success(`Order ${action}ed successfully`);
      fetchOrders();
    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      toast.error(`Failed to ${action} order`);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders first');
      return;
    }

    try {
      const response = await fetch(`/api/admin/orders/bulk/${action}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ orderIds: selectedOrders }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} orders`);
      }

      toast.success(`${selectedOrders.length} orders ${action}ed successfully`);
      setSelectedOrders([]);
      fetchOrders();
    } catch (error) {
      console.error(`Error ${action}ing orders:`, error);
      toast.error(`Failed to ${action} orders`);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/admin/export?type=orders', {
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
      a.download = `orders_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Orders exported successfully');
    } catch (error) {
      console.error('Error exporting orders:', error);
      toast.error('Failed to export orders');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'delivered':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'pending_bank_transfer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'cod_pending':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const OrderModal = ({ order, onClose }) => {
    if (!order) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Order Details - #{order._id?.slice(-8)}
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
            {/* Order Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Order Status
                </label>
                <span className={`mt-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.status)}`}>
                  {order.status?.toUpperCase()}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Payment Status
                </label>
                <span className={`mt-1 px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(order.paymentDetails?.paymentStatus)}`}>
                  {order.paymentDetails?.paymentStatus?.replace('_', ' ')?.toUpperCase()}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Amount
                </label>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(order.totalAmount)}
                </div>
              </div>
            </div>

            {/* Customer & Store Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Customer Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{order.customerId?.name}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{order.customerId?.email}</span>
                  </div>
                  {order.customerId?.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{order.customerId.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Store Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <Store className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{order.storeId?.name}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                    <span>Store Amount: {formatCurrency(order.storeAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Order Items
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="space-y-3">
                  {order.items?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Package className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            Product ID: {item.productId}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Quantity: {item.quantity}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(item.price)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          each
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Shipping Address
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {order.shippingAddress.street}<br />
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
                      {order.shippingAddress.country}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details */}
            {order.paymentDetails && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Payment Details
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                      <div className="font-medium">{order.paymentDetails.paymentMethod}</div>
                    </div>
                    {order.paymentDetails.transactionId && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Transaction ID:</span>
                        <div className="font-medium">{order.paymentDetails.transactionId}</div>
                      </div>
                    )}
                    {order.paymentDetails.paidAt && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Paid At:</span>
                        <div className="font-medium">{formatDateTime(order.paymentDetails.paidAt)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Order Timeline */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Order Timeline
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div className="text-sm">
                      <span className="font-medium">Order Created:</span> {formatDateTime(order.createdAt)}
                    </div>
                  </div>
                  {order.deliveredAt && (
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <div className="text-sm">
                        <span className="font-medium">Delivered:</span> {formatDateTime(order.deliveredAt)}
                      </div>
                    </div>
                  )}
                  {order.statusHistory?.map((history, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div className="text-sm">
                        <span className="font-medium">{history.status}:</span> {formatDateTime(history.timestamp)}
                        {history.notes && <span className="text-gray-600 dark:text-gray-400"> - {history.notes}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Actions */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  const newStatus = prompt('Enter new status:', order.status);
                  if (newStatus) {
                    handleOrderAction(order._id, 'update-status', { status: newStatus });
                    onClose();
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Update Status
              </button>
              
              <button
                onClick={() => {
                  const trackingNumber = prompt('Enter tracking number:');
                  if (trackingNumber) {
                    handleOrderAction(order._id, 'add-tracking', { trackingNumber });
                    onClose();
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Add Tracking
              </button>

              {order.status !== 'cancelled' && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel this order?')) {
                      handleOrderAction(order._id, 'cancel');
                      onClose();
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Cancel Order
                </button>
              )}
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
            Order Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Monitor and manage customer orders across the platform
          </p>
        </div>

        <div className="flex space-x-3">
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
                Total Orders
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {totalCount}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Orders
              </p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {orders.filter(order => order.status === 'pending').length}
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
                Completed Orders
              </p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {orders.filter(order => order.status === 'completed').length}
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
                Total Revenue
              </p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {formatCurrency(orders.reduce((sum, order) => sum + order.totalAmount, 0))}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-500">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search orders..."
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
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Payment Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cod_pending">COD Pending</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />

          {/* Refresh */}
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <div className="mt-4 flex items-center space-x-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected:
            </span>
            <button
              onClick={() => handleBulkAction('mark-shipped')}
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
            >
              Mark Shipped
            </button>
            <button
              onClick={() => handleBulkAction('mark-delivered')}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
            >
              Mark Delivered
            </button>
            <button
              onClick={() => handleBulkAction('cancel')}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
            >
              Cancel Orders
            </button>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === orders.length && orders.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrders(orders.map(order => order._id));
                      } else {
                        setSelectedOrders([]);
                      }
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
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
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No orders found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Try adjusting your search or filter criteria
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrders([...selectedOrders, order._id]);
                          } else {
                            setSelectedOrders(selectedOrders.filter(id => id !== order._id));
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        #{order._id?.slice(-8)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {order.items?.length} items
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.customerId?.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {order.customerId?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.storeId?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                        {order.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentDetails?.paymentStatus)}`}>
                        {order.paymentDetails?.paymentStatus?.replace('_', ' ')?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderModal(true);
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
                                onClick={() => {
                                  const newStatus = prompt('Enter new status:', order.status);
                                  if (newStatus) {
                                    handleOrderAction(order._id, 'update-status', { status: newStatus });
                                  }
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <Edit3 className="w-4 h-4 inline mr-2" />
                                Update Status
                              </button>
                              <button
                                onClick={() => {
                                  const trackingNumber = prompt('Enter tracking number:');
                                  if (trackingNumber) {
                                    handleOrderAction(order._id, 'add-tracking', { trackingNumber });
                                  }
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <Truck className="w-4 h-4 inline mr-2" />
                                Add Tracking
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

      {/* Order Modal */}
      {showOrderModal && (
        <OrderModal
          order={selectedOrder}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default OrderManagement;