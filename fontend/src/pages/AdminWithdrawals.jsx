import React, { useState, useEffect, useMemo } from "react";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search, 
  Download, 
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  AlertCircle,
  DollarSign,
  Building2,
  Calendar,
  FileText,
  X,
  Check
} from "lucide-react";
import { adminAPI } from "../utils/api";


// Utility functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR'
  }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    processing: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getStatusIcon = (status) => {
  const icons = {
    pending: <Clock className="w-4 h-4" />,
    approved: <CheckCircle className="w-4 h-4" />,
    rejected: <XCircle className="w-4 h-4" />,
    processing: <AlertCircle className="w-4 h-4" />,
    completed: <Check className="w-4 h-4" />
  };
  return icons[status] || <Clock className="w-4 h-4" />;
};

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchWithdrawals();
  }, [filters]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getAllWithdrawals(filters);
      if (response.success) {
        setWithdrawals(response.data.withdrawals);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch withdrawals:", error);
      setError("Failed to fetch withdrawals. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id, action) => {
    try {
      setProcessing(true);
      setError(null);
      
      // Validate status transition
      const withdrawal = withdrawals.find(w => w._id === id);
      if (!withdrawal || !isValidTransition(withdrawal.status, action)) {
        setError("Invalid status transition");
        return;
      }
      
      const response = await adminAPI.processWithdrawal(id, {
        action,
        adminNotes,
      });

      if (response.success) {
        setShowModal(false);
        setSelectedWithdrawal(null);
        setAdminNotes("");
        await fetchWithdrawals();
      }
    } catch (error) {
      console.error("Failed to process withdrawal:", error);
      setError("Failed to process withdrawal. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // Validate status transitions based on workflow order
  const isValidTransition = (currentStatus, newStatus) => {
    const allowedTransitions = {
      "pending": ["processing", "approved", "rejected"],
      "processing": ["approved", "rejected"],
      "approved": ["completed"],
      "rejected": [], // Final state
      "completed": [] // Final state
    };
    
    return allowedTransitions[currentStatus]?.includes(newStatus) || false;
  };

  // Get available actions for a status
  const getAvailableActions = (status) => {
    const actions = {
      "pending": [
        { action: "processing", label: "Process", color: "blue" },
        { action: "approved", label: "Approve", color: "green" },
        { action: "rejected", label: "Reject", color: "red" }
      ],
      "processing": [
        { action: "approved", label: "Approve", color: "green" },
        { action: "rejected", label: "Reject", color: "red" }
      ],
      "approved": [
        { action: "completed", label: "Complete", color: "gray" }
      ],
      "rejected": [],
      "completed": []
    };
    
    return actions[status] || [];
  };

  const handleBulkAction = async (action) => {
    try {
      setProcessing(true);
      setError(null);
      
      // Filter items that can transition to the new status
      const validItems = selectedItems.filter(id => {
        const withdrawal = withdrawals.find(w => w._id === id);
        return withdrawal && isValidTransition(withdrawal.status, action);
      });
      
      if (validItems.length === 0) {
        setError("No valid items for this transition");
        return;
      }
      
      const response = await adminAPI.bulkProcess(validItems, action);
      if (response.success) {
        setSelectedItems([]);
        setShowBulkActions(false);
        await fetchWithdrawals();
      }
    } catch (error) {
      console.error("Failed to process bulk action:", error);
      setError("Failed to process bulk action. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(withdrawals.map(w => w._id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(item => item !== id));
    }
  };

  const openModal = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setAdminNotes(withdrawal.withdrawalDetails?.adminNotes || "");
    setShowModal(true);
  };

  const handleSort = (column) => {
    const newOrder = filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters({
      ...filters,
      sortBy: column,
      sortOrder: newOrder,
      page: 1
    });
  };

  const exportData = () => {
    try {
      const csvContent = [
        ['Store Name', 'Email', 'Amount', 'Status', 'Requested Date', 'Bank', 'Account'],
        ...withdrawals.map(w => [
          w.userId?.name || 'Unknown',
          w.userId?.email || 'No email',
          w.amount || 0,
          w.status || 'Unknown',
          formatDate(w.createdAt),
          w.withdrawalDetails?.bankAccountId?.bankName || 'Unknown Bank',
          w.withdrawalDetails?.bankAccountId?.accountNumber || 'Unknown Account'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'withdrawals_export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export data. Please try again.');
    }
  };

  // Calculate stats with memoization
  const stats = useMemo(() => {
    return {
      pending: withdrawals.filter(w => w.status === 'pending').length,
      approved: withdrawals.filter(w => w.status === 'approved').length,
      rejected: withdrawals.filter(w => w.status === 'rejected').length,
      processing: withdrawals.filter(w => w.status === 'processing').length,
      completed: withdrawals.filter(w => w.status === 'completed').length,
      totalAmount: withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0)
    };
  }, [withdrawals]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto p-1 text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-black mb-2">
                Withdrawal Management
              </h1>
              <p className="text-gray-600">
                Manage and process store withdrawal requests
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search stores..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent w-full sm:w-64"
                />
              </div>
              
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
              
              <button
                onClick={exportData}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Processing</p>
                  <p className="text-2xl font-bold text-blue-800">{stats.processing}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Approved</p>
                  <p className="text-2xl font-bold text-green-800">{stats.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.completed}</p>
                </div>
                <Check className="h-8 w-8 text-gray-600" />
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Rejected</p>
                  <p className="text-2xl font-bold text-red-800">{stats.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <div className="bg-black text-white rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300 font-medium">Total Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-gray-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-gray-700">
                  {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                </p>
                <button
                  onClick={() => setSelectedItems([])}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex gap-2">
                {/* Only show bulk actions for valid transitions */}
                {selectedItems.some(id => {
                  const withdrawal = withdrawals.find(w => w._id === id);
                  return withdrawal && isValidTransition(withdrawal.status, 'processing');
                }) && (
                  <button
                    onClick={() => handleBulkAction('processing')}
                    disabled={processing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                  >
                    Process Selected
                  </button>
                )}
                
                {selectedItems.some(id => {
                  const withdrawal = withdrawals.find(w => w._id === id);
                  return withdrawal && isValidTransition(withdrawal.status, 'approved');
                }) && (
                  <button
                    onClick={() => handleBulkAction('approved')}
                    disabled={processing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                  >
                    Approve Selected
                  </button>
                )}
                
                <button
                  onClick={() => handleBulkAction('rejected')}
                  disabled={processing}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                >
                  Reject Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawals Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-black">Withdrawal Requests</h2>
          </div>
          
          {withdrawals.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No withdrawal requests found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === withdrawals.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-black focus:ring-black"
                      />
                    </th>
                    <th 
                      className="px-6 py-4 text-left font-semibold text-black cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('storeName')}
                    >
                      <div className="flex items-center gap-2">
                        Store
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left font-semibold text-black cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center gap-2">
                        Amount
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-black">Status</th>
                    <th className="px-6 py-4 text-left font-semibold text-black">Bank Details</th>
                    <th 
                      className="px-6 py-4 text-left font-semibold text-black cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-2">
                        Requested
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {withdrawals.map((withdrawal) => (
                    <tr
                      key={withdrawal._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(withdrawal._id)}
                          onChange={(e) => handleSelectItem(withdrawal._id, e.target.checked)}
                          className="rounded border-gray-300 text-black focus:ring-black"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-semibold">
                            {withdrawal.userId?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-black">{withdrawal.userId?.name || 'Unknown Store'}</p>
                            <p className="text-sm text-gray-600">{withdrawal.userId?.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-semibold text-black">
                          {formatCurrency(withdrawal.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(withdrawal.status)}`}>
                          {getStatusIcon(withdrawal.status)}
                          {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-black text-sm">
                            {withdrawal.withdrawalDetails?.bankAccountId?.bankName || 'Bank not specified'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {withdrawal.withdrawalDetails?.bankAccountId?.accountNumber || 'Account not specified'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {withdrawal.withdrawalDetails?.bankAccountId?.accountHolder || 'Holder not specified'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {formatDate(withdrawal.withdrawalDetails?.requestedAt || withdrawal.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openModal(withdrawal)}
                            className="p-2 text-gray-600 hover:text-black transition-colors rounded-lg hover:bg-gray-100"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {getAvailableActions(withdrawal.status).map((actionItem) => {
                            const colorClasses = {
                              blue: "text-blue-700 bg-blue-100 hover:bg-blue-200",
                              green: "text-green-700 bg-green-100 hover:bg-green-200",
                              red: "text-red-700 bg-red-100 hover:bg-red-200",
                              gray: "text-gray-700 bg-gray-100 hover:bg-gray-200"
                            };
                            
                            return (
                              <button
                                key={actionItem.action}
                                onClick={() => handleProcess(withdrawal._id, actionItem.action)}
                                disabled={processing}
                                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${colorClasses[actionItem.color]}`}
                              >
                                {actionItem.label}
                              </button>
                            );
                          })}
                          
                          {getAvailableActions(withdrawal.status).length === 0 && (
                            <span className="px-3 py-1 text-sm font-medium text-gray-500 bg-gray-50 rounded-lg">
                              Final Status
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {((pagination.current - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.current * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilters({...filters, page: filters.page - 1})}
                  disabled={filters.page <= 1}
                  className="p-2 text-gray-600 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setFilters({...filters, page})}
                        className={`px-3 py-1 text-sm rounded-lg ${
                          page === filters.page
                            ? 'bg-black text-white'
                            : 'text-gray-600 hover:text-black hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setFilters({...filters, page: filters.page + 1})}
                  disabled={filters.page >= pagination.pages}
                  className="p-2 text-gray-600 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-black">
                    Withdrawal Request Details
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Store Information</p>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-semibold text-lg">
                          {selectedWithdrawal.userId?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-black">{selectedWithdrawal.userId?.name || 'Unknown Store'}</p>
                          <p className="text-sm text-gray-600">{selectedWithdrawal.userId?.email || 'No email'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Withdrawal Amount</p>
                      <p className="text-3xl font-bold text-black">{formatCurrency(selectedWithdrawal.amount)}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Current Status</p>
                      <span className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border ${getStatusColor(selectedWithdrawal.status)}`}>
                        {getStatusIcon(selectedWithdrawal.status)}
                        {selectedWithdrawal.status.charAt(0).toUpperCase() + selectedWithdrawal.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Bank Details</p>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-black">
                            {selectedWithdrawal.withdrawalDetails?.bankAccountId?.bankName || 'Bank not specified'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Account: {selectedWithdrawal.withdrawalDetails?.bankAccountId?.accountNumber || 'Not specified'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Holder: {selectedWithdrawal.withdrawalDetails?.bankAccountId?.accountHolder || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Request Timeline</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Requested:</span>
                          <span className="font-medium text-black">
                            {formatDate(selectedWithdrawal.withdrawalDetails?.requestedAt || selectedWithdrawal.createdAt)}
                          </span>
                        </div>
                        {selectedWithdrawal.withdrawalDetails?.processedAt && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Processed:</span>
                            <span className="font-medium text-black">
                              {formatDate(selectedWithdrawal.withdrawalDetails.processedAt)}
                            </span>
                          </div>
                        )}
                        {selectedWithdrawal.withdrawalDetails?.completedAt && (
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Completed:</span>
                            <span className="font-medium text-black">
                              {formatDate(selectedWithdrawal.withdrawalDetails.completedAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedWithdrawal.withdrawalDetails?.adminNotes && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Previous Admin Notes</p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{selectedWithdrawal.withdrawalDetails.adminNotes}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Admin Notes {selectedWithdrawal.status === 'pending' ? '(Optional)' : '(Update)'}
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                    placeholder="Add notes for the store owner or internal reference..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={processing}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
                >
                  Cancel
                </button>
                
                {getAvailableActions(selectedWithdrawal.status).map((actionItem) => {
                  const colorClasses = {
                    blue: "text-white bg-blue-600 hover:bg-blue-700",
                    green: "text-white bg-green-600 hover:bg-green-700",
                    red: "text-white bg-red-600 hover:bg-red-700",
                    gray: "text-white bg-black hover:bg-gray-800"
                  };
                  
                  return (
                    <button
                      key={actionItem.action}
                      onClick={() => handleProcess(selectedWithdrawal._id, actionItem.action)}
                      disabled={processing}
                      className={`px-6 py-2 rounded-lg disabled:opacity-50 font-medium ${colorClasses[actionItem.color]}`}
                    >
                      {processing ? "Processing..." : actionItem.label}
                    </button>
                  );
                })}

                {getAvailableActions(selectedWithdrawal.status).length === 0 && adminNotes !== (selectedWithdrawal.withdrawalDetails?.adminNotes || '') && (
                  <button
                    onClick={() => handleProcess(selectedWithdrawal._id, selectedWithdrawal.status)}
                    disabled={processing}
                    className="px-6 py-2 text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
                  >
                    {processing ? "Updating..." : "Update Notes"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWithdrawals;