import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Download,
  Edit3,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ShoppingBag,
  Store as StoreIcon,
  Eye,
  MoreHorizontal,
  RefreshCcw
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [roleStats, setRoleStats] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // UI States
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const limit = 20;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, roleFilter, statusFilter, sortBy, sortOrder, dateFrom, dateTo]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit,
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.data);
      setCurrentPage(data.pagination.currentPage);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);
      setRoleStats(data.pagination.roleStats || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
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

  const handleUserAction = async (userId, action, data = {}) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }

      toast.success(`User ${action}ed successfully`);
      fetchUsers();
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast.error(`Failed to ${action} user`);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first');
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/bulk/${action}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userIds: selectedUsers }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} users`);
      }

      toast.success(`${selectedUsers.length} users ${action}ed successfully`);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      console.error(`Error ${action}ing users:`, error);
      toast.error(`Failed to ${action} users`);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/admin/export?type=users', {
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
      a.download = `users_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Users exported successfully');
    } catch (error) {
      console.error('Error exporting users:', error);
      toast.error('Failed to export users');
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

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'store_owner':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'customer':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const UserModal = ({ user, onClose }) => {
    if (!user) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                User Details
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
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <Users className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {user.name}
                </h4>
                <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.stats?.orderCount || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Orders</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(user.stats?.totalSpent || 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Spent</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatDate(user.createdAt)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Joined</div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900 dark:text-white">Contact Information</h5>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{user.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            {user.address && (
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900 dark:text-white">Address</h5>
                <div className="text-gray-600 dark:text-gray-400">
                  {[user.address.street, user.address.city, user.address.state, user.address.zipCode]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            )}

            {/* Store Info */}
            {user.storeId && (
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900 dark:text-white">Store Information</h5>
                <div className="flex items-center space-x-3">
                  <StoreIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {user.storeId.name} ({user.storeId.isActive ? 'Active' : 'Inactive'})
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleUserAction(user._id, 'suspend')}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                Suspend User
              </button>
              <button
                onClick={() => handleUserAction(user._id, 'activate')}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Activate User
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
            User Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage and monitor user accounts across the platform
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowUserModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
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
        {roleStats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                  {stat._id.replace('_', ' ')}s
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stat.count}
                </p>
              </div>
              <div className={`p-3 rounded-full ${getRoleBadgeColor(stat._id).replace('text-', 'bg-').replace('bg-', 'bg-opacity-20 text-')}`}>
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
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
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="customer">Customers</option>
            <option value="store_owner">Store Owners</option>
            <option value="admin">Admins</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />

          {/* Date To */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />

          {/* Refresh */}
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="mt-4 flex items-center space-x-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected:
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

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(users.map(user => user._id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('name')}
                >
                  User
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('role')}
                >
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Stats
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('createdAt')}
                >
                  Joined
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse inline-block"></div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Try adjusting your search or filter criteria
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user._id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user._id));
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          {user.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt="Profile"
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <Users className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <ShoppingBag className="w-3 h-3 mr-1" />
                          {user.stats?.orderCount || 0} orders
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {formatCurrency(user.stats?.totalSpent || 0)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
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
                                onClick={() => handleUserAction(user._id, 'edit')}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <Edit3 className="w-4 h-4 inline mr-2" />
                                Edit User
                              </button>
                              <button
                                onClick={() => handleUserAction(user._id, 'resetPassword')}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                Reset Password
                              </button>
                              <button
                                onClick={() => handleUserAction(user._id, 'suspend')}
                                className="block w-full text-left px-4 py-2 text-sm text-yellow-700 dark:text-yellow-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <Ban className="w-4 h-4 inline mr-2" />
                                Suspend
                              </button>
                              <button
                                onClick={() => handleUserAction(user._id, 'delete')}
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

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;