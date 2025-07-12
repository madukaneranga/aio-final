import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Store, 
  Package, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  BarChart3,
  Download,
  QrCode,
  ExternalLink,
  Edit,
  Plus,
  Search,
  Filter,
  FileText,
  Settings
} from 'lucide-react';
import { formatLKR } from '../utils/currency';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

const Admin = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStores: 0,
    totalProducts: 0,
    totalServices: 0,
    totalOrders: 0,
    totalBookings: 0,
    totalRevenue: 0
  });
  
  const [data, setData] = useState({
    users: [],
    stores: [],
    products: [],
    services: [],
    orders: [],
    bookings: [],
    subscriptions: [],
    commissions: [],
    categories: []
  });
  
  const [commissionStats, setCommissionStats] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view');
  const [auditLogs, setAuditLogs] = useState([]);

  // Categories for products and services
  const productCategories = [
    'Electronics', 'Clothing', 'Home & Garden', 'Sports & Outdoors',
    'Books', 'Beauty & Health', 'Toys & Games', 'Food & Beverages'
  ];
  
  const serviceCategories = [
    'Tutoring', 'Home Services', 'Beauty & Wellness', 'Consulting',
    'Fitness', 'Technology', 'Creative Services', 'Professional Services'
  ];

  useEffect(() => {
    if (user?.email === 'admin@aio.com') {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
  try {
    // Fetch all data in parallel
    const [usersRes, storesRes, productsRes, servicesRes] = await Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/api/users`),
      fetch(`${import.meta.env.VITE_API_URL}/api/stores`),
      fetch(`${import.meta.env.VITE_API_URL}/api/products`),
      fetch(`${import.meta.env.VITE_API_URL}/api/services`)
    ]);

    // Parse JSON if responses ok, otherwise empty arrays
    const usersData = usersRes.ok ? await usersRes.json() : [];
    const storesData = storesRes.ok ? await storesRes.json() : [];
    const productsData = productsRes.ok ? await productsRes.json() : [];
    const servicesData = servicesRes.ok ? await servicesRes.json() : [];

    // Fetch subscriptions
    const subscriptionsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/subscriptions/admin/all`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const subscriptionsData = subscriptionsRes.ok ? await subscriptionsRes.json() : [];

    // Fetch commissions
    const commissionsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/commissions/admin/all`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const commissionsData = commissionsRes.ok ? await commissionsRes.json() : [];

    // Fetch commission stats
    const commissionStatsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/commissions/admin/stats`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const commissionStatsData = commissionStatsRes.ok ? await commissionStatsRes.json() : {};

    // Set all fetched data at once
    setData({
      users: usersData,
      stores: storesData,
      products: productsData,
      services: servicesData,
      subscriptions: subscriptionsData,
      commissions: commissionsData
    });

    setCommissionStats(commissionStatsData);

    // Now calculate stats based on the fetched data (not from `data` state)
    setStats({
      totalUsers: usersData.length,
      totalStores: storesData.length,
      totalProducts: productsData.length,
      totalServices: servicesData.length,
      totalOrders: 0,
      totalBookings: 0,
      totalRevenue: commissionStatsData.overall?.totalCommissions || 0
    });

  } catch (error) {
    console.error('Error fetching admin data:', error);
  } finally {
    setLoading(false);
  }
};


  const generateQRCode = async (storeId, storeName) => {
    const storeUrl = `${window.location.origin}/store/${storeId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(storeUrl)}`;
    
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${storeName.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Failed to download QR code');
    }
  };

  const handleCRUDOperation = async (operation, type, itemId = null, itemData = null) => {
    try {
      let url = `${import.meta.env.VITE_API_URL}/api/${type}`;
      let method = 'GET';
      let body = null;

      switch (operation) {
        case 'create':
          method = 'POST';
          body = JSON.stringify(itemData);
          break;
        case 'update':
          url += `/${itemId}`;
          method = 'PUT';
          body = JSON.stringify(itemData);
          break;
        case 'delete':
          url += `/${itemId}`;
          method = 'DELETE';
          break;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body
      });

      if (response.ok) {
        // Log the action
        logAuditAction(operation, type, itemId, itemData);
        // Refresh data
        fetchAdminData();
        setShowModal(false);
        setSelectedItem(null);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Operation failed'}`);
      }
    } catch (error) {
      console.error('CRUD operation error:', error);
      alert('Network error occurred');
    }
  };

  const logAuditAction = (action, type, itemId, data) => {
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: user.email,
      action,
      type,
      itemId,
      data: data ? JSON.stringify(data) : null
    };
    
    setAuditLogs(prev => [logEntry, ...prev.slice(0, 99)]); // Keep last 100 logs
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    setShowModal(true);
  };

  const filteredData = (dataType) => {
    const items = data[dataType] || [];
    return items.filter(item => {
      const matchesSearch = !searchTerm || 
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter = filterStatus === 'all' || 
        (item.status === filterStatus) ||
        (item.isActive === (filterStatus === 'active'));
      
      return matchesSearch && matchesFilter;
    });
  };

  if (!user || user.email !== 'admin@aio.com') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'stores', name: 'Stores', icon: Store },
    { id: 'products', name: 'Products', icon: Package },
    { id: 'services', name: 'Services', icon: Calendar },
    { id: 'categories', name: 'Categories', icon: Settings },
    { id: 'subscriptions', name: 'Subscriptions', icon: DollarSign },
    { id: 'commissions', name: 'Commissions', icon: TrendingUp },
    { id: 'audit', name: 'Audit Logs', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Comprehensive platform management</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Search and Filter Bar */}
        {activeTab !== 'dashboard' && activeTab !== 'audit' && (
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <button
                onClick={() => openModal('create')}
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add New</span>
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Stores</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalStores}</p>
                  </div>
                  <Store className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">{formatLKR(commissionStats.overall?.totalCommissions || 0)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Subscriptions</p>
                    <p className="text-3xl font-bold text-gray-900">{data.subscriptions.filter(s => s.status === 'active').length}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Store QR Codes</h4>
                  <p className="text-sm text-blue-700 mb-3">Download QR codes for business cards</p>
                  <button
                    onClick={() => setActiveTab('stores')}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Manage QR Codes
                  </button>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Platform Analytics</h4>
                  <p className="text-sm text-green-700 mb-3">View detailed platform statistics</p>
                  <button
                    onClick={() => setActiveTab('commissions')}
                    className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    View Analytics
                  </button>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">System Logs</h4>
                  <p className="text-sm text-purple-700 mb-3">Monitor system activities</p>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 transition-colors"
                  >
                    View Logs
                  </button>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">Platform Settings</h4>
                  <p className="text-sm text-orange-700 mb-3">Configure commission rates, subscriptions, and platform policies</p>
                  <Link
                    to="/platform-settings"
                    className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700 transition-colors"
                  >
                    Manage Settings
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Tables */}
        {activeTab !== 'dashboard' && activeTab !== 'audit' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold capitalize">{activeTab} Management</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {/* Dynamic headers based on active tab */}
                    {activeTab === 'users' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Register Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </>
                    )}
                    {activeTab === 'stores' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </>
                    )}
                    {activeTab === 'products' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </>
                    )}
                    {activeTab === 'services' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </>
                    )}
                    {activeTab === 'subscriptions' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </>
                    )}
                    {activeTab === 'commissions' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData(activeTab).map((item) => (
                    <tr key={item._id}>
                      {/* Dynamic table rows based on active tab */}
                      {activeTab === 'users' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                src={item.profileImage?.[0] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop'}
                                alt={item.name}
                                className="w-10 h-10 rounded object-cover mr-3"
                              />
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="capitalize text-sm text-gray-500">{item.email}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.role}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.createdAt}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openModal('view', item)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              
                            </div>
                          </td>
                        </>
                      )}
                      {activeTab === 'stores' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                src={item.heroImages?.[0] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop'}
                                alt={item.name}
                                className="w-10 h-10 rounded object-cover mr-3"
                              />
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="capitalize text-sm text-gray-500">{item.type}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.ownerId?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatLKR(item.totalSales || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openModal('view', item)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openModal('edit', item)}
                                className="text-green-600 hover:text-green-900"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => generateQRCode(item._id, item.name)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <a
                                href={`/store/${item._id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 hover:text-purple-900"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                        </>
                      )}
                      {activeTab === 'products' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                src={item.images?.[0] ? 
                                  (item.images[0].startsWith('http') ? item.images[0] : `${import.meta.env.VITE_API_URL}${item.images[0]}`) : 
                                  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop'
                                }
                                alt={item.title}
                                className="w-10 h-10 rounded object-cover mr-3"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                                <div className="text-sm text-gray-500">{item.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.storeId?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatLKR(item.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.stock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className={`mr-3 ${item.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}>
                              {item.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                          </td>
                        </>
                      )}
                      {activeTab === 'services' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                src={item.images?.[0] ? 
                                  (item.images[0].startsWith('http') ? item.images[0] : `${import.meta.env.VITE_API_URL}${item.images[0]}`) : 
                                  'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop'
                                }
                                alt={item.title}
                                className="w-10 h-10 rounded object-cover mr-3"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                                <div className="text-sm text-gray-500">{item.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.storeId?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatLKR(item.price)} {item.priceType === 'hourly' ? '/hour' : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.duration} min
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className={`mr-3 ${item.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}>
                              {item.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                          </td>
                        </>
                      )}
                      {activeTab === 'subscriptions' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.userId?.name}</div>
                              <div className="text-sm text-gray-500">{item.userId?.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.storeId?.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatLKR(item.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.endDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-indigo-600 hover:text-indigo-900">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}
                      {activeTab === 'commissions' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.storeId?.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                            {item.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatLKR(item.totalAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                            {formatLKR(item.commissionAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatLKR(item.storeAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Logs */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">System Audit Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.user}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.action === 'create' ? 'bg-green-100 text-green-800' :
                          log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                          log.action === 'delete' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {log.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {log.itemId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal for CRUD operations */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} ${activeTab.slice(0, -1)}`}
          size="lg"
        >
          <div className="space-y-4">
            {modalType === 'view' && selectedItem && (
              <div className="space-y-3">
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(selectedItem, null, 2)}
                </pre>
              </div>
            )}
            
            {(modalType === 'create' || modalType === 'edit') && (
              <div>
                <p className="text-gray-600 mb-4">
                  {modalType === 'create' ? 'Create new' : 'Edit'} {activeTab.slice(0, -1)} form would go here.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Handle save operation
                      setShowModal(false);
                    }}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Admin;