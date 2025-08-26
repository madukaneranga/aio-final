import React, { useState, useEffect, useMemo } from 'react';
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
  Settings,
  Clock,
  Building2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  X,
  Check,
  RefreshCw,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Shield,
  Activity,
  Target,
  Zap,
  Database,
  Bell,
  Lock,
  Unlock,
  MessageCircle,
  Heart,
  ThumbsUp,
  Bookmark,
  CreditCard,
  Wallet,
  ShoppingBag,
  Tags,
  Layers,
  Server,
  HardDrive,
  Wifi,
  Monitor,
  PieChart,
  LineChart
} from 'lucide-react';
import { formatLKR } from '../utils/currency';
import { adminAPI } from '../utils/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import AnalyticsChart from '../components/admin/AnalyticsChart';
import StatsCard from '../components/admin/StatsCard';
import SystemMonitoring from '../components/admin/SystemMonitoring';
import AdvancedDataTable from '../components/admin/AdvancedDataTable';
import AdvancedAnalytics from '../components/admin/AdvancedAnalytics';
import ErrorBoundary from '../components/admin/ErrorBoundary';

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
    completed: 'bg-gray-100 text-gray-800 border-gray-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-red-100 text-red-800 border-red-200',
    verified: 'bg-blue-100 text-blue-800 border-blue-200',
    unverified: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getStatusIcon = (status) => {
  const icons = {
    pending: <Clock className="w-4 h-4" />,
    approved: <CheckCircle className="w-4 h-4" />,
    rejected: <XCircle className="w-4 h-4" />,
    processing: <AlertTriangle className="w-4 h-4" />,
    completed: <Check className="w-4 h-4" />,
    active: <CheckCircle className="w-4 h-4" />,
    inactive: <XCircle className="w-4 h-4" />,
    verified: <Shield className="w-4 h-4" />,
    unverified: <AlertTriangle className="w-4 h-4" />
  };
  return icons[status] || <Clock className="w-4 h-4" />;
};

const Admin = () => {
  const { user } = useAuth();
  
  // Main state management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  
  // Data state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStores: 0,
    totalProducts: 0,
    totalServices: 0,
    totalOrders: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeUsers: 0,
    pendingStores: 0,
    pendingWithdrawals: 0
  });
  
  const [data, setData] = useState({
    users: [],
    stores: [],
    products: [],
    services: [],
    orders: [],
    bookings: [],
    withdrawals: [],
    categories: [],
    analytics: {}
  });
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Modal state
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view');
  const [processing, setProcessing] = useState(false);
  
  // Audit logs
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    if (user?.email === 'admin@aio.com') {
      fetchAdminData();
    }
  }, [user, activeTab]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.email === 'admin@aio.com' && activeTab === 'dashboard') {
        fetchStats();
      }
    }, 30000); // Refresh stats every 30 seconds

    return () => clearInterval(interval);
  }, [user, activeTab]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all data based on active tab
      let promises = [];
      
      switch (activeTab) {
        case 'dashboard':
          promises = [
            fetchStats(),
            fetchRecentActivity()
          ];
          break;
        case 'users':
          promises = [fetchUsers()];
          break;
        case 'stores':
          promises = [fetchStores()];
          break;
        case 'products':
          promises = [fetchProducts()];
          break;
        case 'services':
          promises = [fetchServices()];
          break;
        case 'orders':
          promises = [fetchOrders()];
          break;
        case 'bookings':
          promises = [fetchBookings()];
          break;
        case 'withdrawals':
          promises = [fetchWithdrawals()];
          break;
        case 'categories':
          promises = [fetchCategories()];
          break;
        case 'analytics':
          promises = [fetchAnalytics()];
          break;
        case 'audit':
          promises = [fetchAuditLogs()];
          break;
        default:
          promises = [fetchStats()];
      }
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError('Failed to fetch admin data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch all basic stats
      const [usersRes, storesRes, productsRes, servicesRes, ordersRes, bookingsRes, withdrawalsRes] = await Promise.all([
        adminAPI.getAllUsers({ limit: 100 }),
        adminAPI.getAllStores({ limit: 100 }),
        adminAPI.getAllProducts({ limit: 100 }),
        adminAPI.getAllServices({ limit: 100 }),
        adminAPI.getAllOrders({ limit: 100 }),
        adminAPI.getAllBookings({ limit: 100 }),
        adminAPI.getAllWithdrawals({ status: '', page: 1, limit: 1 })
      ]);

      const usersData = usersRes.success ? usersRes.data.items || [] : [];
      const storesData = storesRes.success ? storesRes.data.items || [] : [];
      const productsData = productsRes.success ? productsRes.data.items || [] : [];
      const servicesData = servicesRes.success ? servicesRes.data.items || [] : [];
      const ordersData = ordersRes.success ? ordersRes.data.items || [] : [];
      const bookingsData = bookingsRes.success ? bookingsRes.data.items || [] : [];
      const withdrawalsData = withdrawalsRes.success ? withdrawalsRes.data : { withdrawals: [], pagination: { total: 0 } };

      // Calculate revenue from orders and bookings
      const totalRevenue = [...(ordersData || []), ...(bookingsData || [])]
        .filter(item => item.status === 'completed')
        .reduce((sum, item) => sum + (item.totalAmount || 0), 0);

      setStats({
        totalUsers: usersData.length || 0,
        totalStores: storesData.length || 0,
        totalProducts: productsData.length || 0,
        totalServices: servicesData.length || 0,
        totalOrders: ordersData.length || 0,
        totalBookings: bookingsData.length || 0,
        totalRevenue,
        activeUsers: usersData.filter(u => u.isActive).length || 0,
        pendingStores: storesData.filter(s => !s.isVerified).length || 0,
        pendingWithdrawals: withdrawalsData.withdrawals.filter(w => w.status === 'pending').length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getAllUsers({ limit: 1000 });
      if (response.success) {
        const users = response.data.items || [];
        setData(prev => ({ ...prev, users }));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await adminAPI.getAllStores({ limit: 1000 });
      if (response.success) {
        const stores = response.data.items || [];
        setData(prev => ({ ...prev, stores }));
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await adminAPI.getAllProducts({ limit: 1000 });
      if (response.success) {
        const products = response.data.items || [];
        setData(prev => ({ ...prev, products }));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await adminAPI.getAllServices({ limit: 1000 });
      if (response.success) {
        const services = response.data.items || [];
        setData(prev => ({ ...prev, services }));
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await adminAPI.getAllOrders({ limit: 1000 });
      if (response.success) {
        const orders = response.data.items || [];
        setData(prev => ({ ...prev, orders }));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await adminAPI.getAllBookings({ limit: 1000 });
      if (response.success) {
        const bookings = response.data.items || [];
        setData(prev => ({ ...prev, bookings }));
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const response = await adminAPI.getAllWithdrawals({
        status: filterStatus === 'all' ? '' : filterStatus,
        search: searchTerm,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: itemsPerPage
      });
      if (response.success) {
        setData(prev => ({ ...prev, withdrawals: response.data.withdrawals }));
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await adminAPI.getAllCategories({ limit: 1000 });
      if (response.success) {
        const categories = response.data.items || [];
        setData(prev => ({ ...prev, categories }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await adminAPI.getAnalyticsDashboard(30);
      if (response.success) {
        const analytics = response.data;
        setData(prev => ({ ...prev, analytics }));
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchAuditLogs = async () => {
    // For now, using local audit logs
    // In production, this would fetch from backend
  };

  const fetchRecentActivity = async () => {
    // Fetch recent activity across all modules
    // This would typically come from a dedicated endpoint
  };

  // CRUD Operations
  const handleCRUDOperation = async (operation, type, itemId = null, itemData = null) => {
    try {
      setProcessing(true);
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
        case 'toggle-status':
          url += `/${itemId}/toggle-status`;
          method = 'PATCH';
          break;
        case 'verify':
          url += `/${itemId}/verify`;
          method = 'PATCH';
          break;
      }

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
        body
      });

      if (response.ok) {
        logAuditAction(operation, type, itemId, itemData);
        await fetchAdminData();
        setShowModal(false);
        setSelectedItem(null);
        setSuccess(`${operation} operation completed successfully`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const error = await response.json();
        setError(`Error: ${error.message || 'Operation failed'}`);
        setTimeout(() => setError(''), 5000);
      }
    } catch (error) {
      console.error('CRUD operation error:', error);
      setError('Network error occurred');
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdrawalProcess = async (id, action, adminNotes = '') => {
    try {
      setProcessing(true);
      const response = await adminAPI.processWithdrawal(id, {
        action,
        adminNotes
      });

      if (response.success) {
        await fetchWithdrawals();
        setShowModal(false);
        setSelectedItem(null);
        setSuccess(`Withdrawal ${action} successfully`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Failed to process withdrawal:', error);
      setError('Failed to process withdrawal. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkOperation = async (operation, items) => {
    try {
      setProcessing(true);
      // Implement bulk operations based on the operation type
      const promises = items.map(itemId => 
        handleCRUDOperation(operation, activeTab.slice(0, -1), itemId)
      );
      
      await Promise.all(promises);
      setSelectedItems([]);
      setShowBulkActions(false);
      setSuccess(`Bulk ${operation} completed successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Bulk operation error:', error);
      setError('Bulk operation failed');
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(false);
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
      
      setSuccess('QR Code downloaded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      setError('Failed to download QR code');
      setTimeout(() => setError(''), 5000);
    }
  };

  const exportData = (dataType) => {
    try {
      const dataToExport = data[dataType] || [];
      if (dataToExport.length === 0) {
        setError('No data to export');
        setTimeout(() => setError(''), 3000);
        return;
      }

      let csvContent = '';
      let headers = [];
      
      switch (dataType) {
        case 'users':
          headers = ['Name', 'Email', 'Role', 'Status', 'Created Date'];
          csvContent = [
            headers,
            ...dataToExport.map(item => [
              item.name || '',
              item.email || '',
              item.role || '',
              item.isActive ? 'Active' : 'Inactive',
              formatDate(item.createdAt)
            ])
          ].map(row => row.join(',')).join('\n');
          break;
          
        case 'stores':
          headers = ['Store Name', 'Type', 'Owner', 'Status', 'Verified', 'Created Date'];
          csvContent = [
            headers,
            ...dataToExport.map(item => [
              item.name || '',
              item.type || '',
              item.ownerId?.name || '',
              item.isActive ? 'Active' : 'Inactive',
              item.isVerified ? 'Verified' : 'Unverified',
              formatDate(item.createdAt)
            ])
          ].map(row => row.join(',')).join('\n');
          break;
          
        case 'withdrawals':
          headers = ['Store Name', 'Email', 'Amount', 'Status', 'Requested Date', 'Bank', 'Account'];
          csvContent = [
            headers,
            ...dataToExport.map(item => [
              item.userId?.name || 'Unknown',
              item.userId?.email || 'No email',
              item.amount || 0,
              item.status || 'Unknown',
              formatDate(item.createdAt),
              item.withdrawalDetails?.bankAccountId?.bankName || 'Unknown Bank',
              item.withdrawalDetails?.bankAccountId?.accountNumber || 'Unknown Account'
            ])
          ].map(row => row.join(',')).join('\n');
          break;
          
        default:
          headers = ['ID', 'Name', 'Status', 'Created Date'];
          csvContent = [
            headers,
            ...dataToExport.map(item => [
              item._id || '',
              item.name || item.title || '',
              item.isActive ? 'Active' : 'Inactive',
              formatDate(item.createdAt)
            ])
          ].map(row => row.join(',')).join('\n');
      }

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType}_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      setSuccess(`${dataType} data exported successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export data. Please try again.');
      setTimeout(() => setError(''), 5000);
    }
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    const items = data[activeTab] || [];
    return items.filter(item => {
      const matchesSearch = !searchTerm || 
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter = filterStatus === 'all' || 
        (item.status === filterStatus) ||
        (item.isActive === (filterStatus === 'active')) ||
        (item.isVerified === (filterStatus === 'verified'));
      
      return matchesSearch && matchesFilter;
    }).sort((a, b) => {
      const aValue = a[sortBy] || '';
      const bValue = b[sortBy] || '';
      const order = sortOrder === 'asc' ? 1 : -1;
      return aValue > bValue ? order : -order;
    });
  }, [data, activeTab, searchTerm, filterStatus, sortBy, sortOrder]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const openModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    setShowModal(true);
  };

  // Collection configurations for each tab
  const getCollectionConfig = (tabId) => {
    const configs = {
      'users': {
        collection: 'all-users',
        title: 'User Management',
        columns: [
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'email', label: 'Email', type: 'text' },
          { key: 'role', label: 'Role', type: 'text' },
          { key: 'isActive', label: 'Status', type: 'boolean' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: ['name', 'email'],
        filterField: 'isActive',
        canCreate: true,
        canEdit: true,
        canDelete: false // Users should be deactivated, not deleted
      },
      'stores': {
        collection: 'all-stores',
        title: 'Store Management',
        columns: [
          { key: 'name', label: 'Store Name', type: 'text' },
          { key: 'type', label: 'Type', type: 'text' },
          { key: 'ownerId.name', label: 'Owner', type: 'object' },
          { key: 'isVerified', label: 'Verified', type: 'boolean' },
          { key: 'isActive', label: 'Status', type: 'boolean' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: ['name', 'email'],
        filterField: 'isActive',
        canCreate: true,
        canEdit: true,
        canDelete: false
      },
      'products': {
        collection: 'all-products',
        title: 'Product Management',
        columns: [
          { key: 'title', label: 'Product Name', type: 'text' },
          { key: 'category', label: 'Category', type: 'text' },
          { key: 'price', label: 'Price', type: 'currency' },
          { key: 'storeId.name', label: 'Store', type: 'object' },
          { key: 'isActive', label: 'Status', type: 'boolean' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: ['title', 'description'],
        filterField: 'isActive',
        canCreate: true,
        canEdit: true,
        canDelete: true
      },
      'services': {
        collection: 'all-services',
        title: 'Service Management',
        columns: [
          { key: 'title', label: 'Service Name', type: 'text' },
          { key: 'category', label: 'Category', type: 'text' },
          { key: 'price', label: 'Price', type: 'currency' },
          { key: 'storeId.name', label: 'Store', type: 'object' },
          { key: 'isActive', label: 'Status', type: 'boolean' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: ['title', 'description'],
        filterField: 'isActive',
        canCreate: true,
        canEdit: true,
        canDelete: true
      },
      'orders': {
        collection: 'all-orders',
        title: 'Order Management',
        columns: [
          { key: 'customerId.name', label: 'Customer', type: 'object' },
          { key: 'storeId.name', label: 'Store', type: 'object' },
          { key: 'totalAmount', label: 'Amount', type: 'currency' },
          { key: 'status', label: 'Status', type: 'status' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: [],
        filterField: 'status',
        canCreate: false,
        canEdit: true,
        canDelete: false
      },
      'bookings': {
        collection: 'all-bookings',
        title: 'Booking Management',
        columns: [
          { key: 'customerId.name', label: 'Customer', type: 'object' },
          { key: 'storeId.name', label: 'Store', type: 'object' },
          { key: 'totalAmount', label: 'Amount', type: 'currency' },
          { key: 'status', label: 'Status', type: 'status' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: [],
        filterField: 'status',
        canCreate: false,
        canEdit: true,
        canDelete: false
      },
      'chats': {
        collection: 'all-chats',
        title: 'Chat Management',
        columns: [
          { key: 'participants', label: 'Participants', type: 'array' },
          { key: 'lastMessage', label: 'Last Message', type: 'text' },
          { key: 'status', label: 'Status', type: 'status' },
          { key: 'updatedAt', label: 'Last Active', type: 'date' }
        ],
        searchFields: [],
        filterField: 'status',
        canCreate: false,
        canEdit: false,
        canDelete: true
      },
      'posts': {
        collection: 'all-posts',
        title: 'Social Posts Management',
        columns: [
          { key: 'userId.name', label: 'Author', type: 'object' },
          { key: 'content', label: 'Content', type: 'text' },
          { key: 'storeId.name', label: 'Store', type: 'object' },
          { key: 'isActive', label: 'Status', type: 'boolean' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: ['content'],
        filterField: 'isActive',
        canCreate: false,
        canEdit: true,
        canDelete: true
      },
      'reviews': {
        collection: 'all-reviews',
        title: 'Review Management',
        columns: [
          { key: 'customerId.name', label: 'Reviewer', type: 'object' },
          { key: 'storeId.name', label: 'Store', type: 'object' },
          { key: 'rating', label: 'Rating', type: 'text' },
          { key: 'comment', label: 'Comment', type: 'text' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: ['comment'],
        filterField: 'isActive',
        canCreate: false,
        canEdit: true,
        canDelete: true
      },
      'categories': {
        collection: 'all-categories',
        title: 'Category Management',
        columns: [
          { key: 'name', label: 'Category Name', type: 'text' },
          { key: 'type', label: 'Type', type: 'text' },
          { key: 'description', label: 'Description', type: 'text' },
          { key: 'isActive', label: 'Status', type: 'boolean' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: ['name', 'description'],
        filterField: 'isActive',
        canCreate: true,
        canEdit: true,
        canDelete: true
      },
      'notifications': {
        collection: 'all-notifications',
        title: 'Notification Management',
        columns: [
          { key: 'userId.name', label: 'User', type: 'object' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'type', label: 'Type', type: 'text' },
          { key: 'isRead', label: 'Read', type: 'boolean' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: ['title', 'body'],
        filterField: 'isRead',
        canCreate: true,
        canEdit: true,
        canDelete: true
      },
      'flash-deals': {
        collection: 'all-flash-deals',
        title: 'Flash Deals Management',
        columns: [
          { key: 'saleName', label: 'Deal Name', type: 'text' },
          { key: 'discountText', label: 'Discount', type: 'text' },
          { key: 'startDate', label: 'Start Date', type: 'date' },
          { key: 'endDate', label: 'End Date', type: 'date' },
          { key: 'isActive', label: 'Status', type: 'boolean' }
        ],
        searchFields: ['saleName', 'saleSubtitle'],
        filterField: 'isActive',
        canCreate: true,
        canEdit: true,
        canDelete: true
      },
      'wallets': {
        collection: 'all-wallets',
        title: 'Wallet Management',
        columns: [
          { key: 'userId.name', label: 'User', type: 'object' },
          { key: 'balance', label: 'Balance', type: 'currency' },
          { key: 'totalEarnings', label: 'Total Earnings', type: 'currency' },
          { key: 'totalWithdrawals', label: 'Total Withdrawals', type: 'currency' },
          { key: 'updatedAt', label: 'Last Updated', type: 'date' }
        ],
        searchFields: [],
        filterField: '',
        canCreate: false,
        canEdit: true,
        canDelete: false
      },
      'commissions': {
        collection: 'all-commissions',
        title: 'Commission Management',
        columns: [
          { key: 'storeId.name', label: 'Store', type: 'object' },
          { key: 'totalAmount', label: 'Order Amount', type: 'currency' },
          { key: 'commissionAmount', label: 'Commission', type: 'currency' },
          { key: 'storeAmount', label: 'Store Amount', type: 'currency' },
          { key: 'status', label: 'Status', type: 'status' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: [],
        filterField: 'status',
        canCreate: false,
        canEdit: true,
        canDelete: false
      },
      'packages': {
        collection: 'all-packages',
        title: 'Package Management',
        columns: [
          { key: 'name', label: 'Package Name', type: 'text' },
          { key: 'description', label: 'Description', type: 'text' },
          { key: 'price', label: 'Price', type: 'currency' },
          { key: 'features', label: 'Features', type: 'array' },
          { key: 'isActive', label: 'Status', type: 'boolean' }
        ],
        searchFields: ['name', 'description'],
        filterField: 'isActive',
        canCreate: true,
        canEdit: true,
        canDelete: true
      },
      'addons': {
        collection: 'all-addons',
        title: 'Addon Management',
        columns: [
          { key: 'name', label: 'Addon Name', type: 'text' },
          { key: 'description', label: 'Description', type: 'text' },
          { key: 'price', label: 'Price', type: 'currency' },
          { key: 'isActive', label: 'Status', type: 'boolean' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: ['name', 'description'],
        filterField: 'isActive',
        canCreate: true,
        canEdit: true,
        canDelete: true
      },
      'email-subscriptions': {
        collection: 'all-email-subscriptions',
        title: 'Email Subscription Management',
        columns: [
          { key: 'email', label: 'Email', type: 'text' },
          { key: 'preferences', label: 'Preferences', type: 'object' },
          { key: 'isActive', label: 'Status', type: 'boolean' },
          { key: 'createdAt', label: 'Subscribed', type: 'date' }
        ],
        searchFields: ['email'],
        filterField: 'isActive',
        canCreate: true,
        canEdit: true,
        canDelete: true
      },
      'contact-reveals': {
        collection: 'all-contact-reveals',
        title: 'Contact Reveal Management',
        columns: [
          { key: 'customerId.name', label: 'Customer', type: 'object' },
          { key: 'storeId.name', label: 'Store', type: 'object' },
          { key: 'creditsUsed', label: 'Credits Used', type: 'text' },
          { key: 'createdAt', label: 'Revealed', type: 'date' }
        ],
        searchFields: [],
        filterField: '',
        canCreate: false,
        canEdit: false,
        canDelete: false
      },
      'subscriptions': {
        collection: 'all-subscriptions',
        title: 'Subscription Management',
        columns: [
          { key: 'userId.name', label: 'User', type: 'object' },
          { key: 'storeId.name', label: 'Store', type: 'object' },
          { key: 'planType', label: 'Plan', type: 'text' },
          { key: 'status', label: 'Status', type: 'status' },
          { key: 'createdAt', label: 'Started', type: 'date' }
        ],
        searchFields: [],
        filterField: 'status',
        canCreate: false,
        canEdit: true,
        canDelete: false
      },
      'search-history': {
        collection: 'all-search-history',
        title: 'Search History Management',
        columns: [
          { key: 'userId.name', label: 'User', type: 'object' },
          { key: 'query', label: 'Search Query', type: 'text' },
          { key: 'results', label: 'Results Count', type: 'text' },
          { key: 'createdAt', label: 'Searched', type: 'date' }
        ],
        searchFields: ['query'],
        filterField: '',
        canCreate: false,
        canEdit: false,
        canDelete: true
      },
      'time-slots': {
        collection: 'all-time-slots',
        title: 'Time Slot Management',
        columns: [
          { key: 'storeId.name', label: 'Store', type: 'object' },
          { key: 'serviceId.title', label: 'Service', type: 'object' },
          { key: 'startTime', label: 'Start Time', type: 'text' },
          { key: 'endTime', label: 'End Time', type: 'text' },
          { key: 'isActive', label: 'Status', type: 'boolean' }
        ],
        searchFields: [],
        filterField: 'isActive',
        canCreate: true,
        canEdit: true,
        canDelete: true
      },
      'variants': {
        collection: 'all-variants',
        title: 'Product Variant Management',
        columns: [
          { key: 'name', label: 'Variant Name', type: 'text' },
          { key: 'productId.title', label: 'Product', type: 'object' },
          { key: 'price', label: 'Price', type: 'currency' },
          { key: 'stock', label: 'Stock', type: 'text' },
          { key: 'isActive', label: 'Status', type: 'boolean' }
        ],
        searchFields: ['name'],
        filterField: 'isActive',
        canCreate: true,
        canEdit: true,
        canDelete: true
      },
      'platform-settings': {
        collection: 'all-platform-settings',
        title: 'Platform Settings Management',
        columns: [
          { key: 'key', label: 'Setting Key', type: 'text' },
          { key: 'value', label: 'Value', type: 'text' },
          { key: 'description', label: 'Description', type: 'text' },
          { key: 'updatedAt', label: 'Last Updated', type: 'date' }
        ],
        searchFields: ['key'],
        filterField: '',
        canCreate: true,
        canEdit: true,
        canDelete: true
      },
      'pending-transactions': {
        collection: 'all-pending-transactions',
        title: 'Pending Transaction Management',
        columns: [
          { key: 'userId.name', label: 'User', type: 'object' },
          { key: 'amount', label: 'Amount', type: 'currency' },
          { key: 'type', label: 'Type', type: 'text' },
          { key: 'status', label: 'Status', type: 'status' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: [],
        filterField: 'status',
        canCreate: false,
        canEdit: true,
        canDelete: true
      },
      'post-comments': {
        collection: 'all-post-comments',
        title: 'Post Comment Management',
        columns: [
          { key: 'userId.name', label: 'Author', type: 'object' },
          { key: 'postId', label: 'Post', type: 'text' },
          { key: 'content', label: 'Comment', type: 'text' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: ['content'],
        filterField: '',
        canCreate: false,
        canEdit: true,
        canDelete: true
      },
      'post-likes': {
        collection: 'all-post-likes',
        title: 'Post Like Management',
        columns: [
          { key: 'userId.name', label: 'User', type: 'object' },
          { key: 'postId', label: 'Post', type: 'text' },
          { key: 'createdAt', label: 'Liked', type: 'date' }
        ],
        searchFields: [],
        filterField: '',
        canCreate: false,
        canEdit: false,
        canDelete: true
      },
      'comment-likes': {
        collection: 'all-comment-likes',
        title: 'Comment Like Management',
        columns: [
          { key: 'userId.name', label: 'User', type: 'object' },
          { key: 'commentId', label: 'Comment', type: 'text' },
          { key: 'createdAt', label: 'Liked', type: 'date' }
        ],
        searchFields: [],
        filterField: '',
        canCreate: false,
        canEdit: false,
        canDelete: true
      },
      'comment-reactions': {
        collection: 'all-comment-reactions',
        title: 'Comment Reaction Management',
        columns: [
          { key: 'userId.name', label: 'User', type: 'object' },
          { key: 'commentId', label: 'Comment', type: 'text' },
          { key: 'reactionType', label: 'Reaction', type: 'text' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: [],
        filterField: '',
        canCreate: false,
        canEdit: false,
        canDelete: true
      },
      'chat-analytics': {
        collection: 'all-chat-analytics',
        title: 'Chat Analytics Management',
        columns: [
          { key: 'chatId', label: 'Chat ID', type: 'text' },
          { key: 'storeId.name', label: 'Store', type: 'object' },
          { key: 'messageCount', label: 'Messages', type: 'text' },
          { key: 'updatedAt', label: 'Last Updated', type: 'date' }
        ],
        searchFields: [],
        filterField: '',
        canCreate: false,
        canEdit: false,
        canDelete: false
      },
      'marketing': {
        collection: 'all-marketing',
        title: 'Marketing Campaign Management',
        columns: [
          { key: 'heroImages', label: 'Hero Images', type: 'array' },
          { key: 'advertisements', label: 'Advertisements', type: 'array' },
          { key: 'isActive', label: 'Status', type: 'boolean' },
          { key: 'createdAt', label: 'Created', type: 'date' }
        ],
        searchFields: [],
        filterField: 'isActive',
        canCreate: true,
        canEdit: true,
        canDelete: true
      },
      'audit': {
        collection: 'activity-logs',
        title: 'Admin Activity Logs',
        columns: [
          { key: 'adminId', label: 'Admin', type: 'text' },
          { key: 'action', label: 'Action', type: 'text' },
          { key: 'target', label: 'Target', type: 'text' },
          { key: 'timestamp', label: 'Time', type: 'date' },
          { key: 'ip', label: 'IP Address', type: 'text' }
        ],
        searchFields: ['action', 'target'],
        filterField: '',
        canCreate: false,
        canEdit: false,
        canDelete: false
      }
    };

    return configs[tabId] || null;
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

  if (loading && activeTab === 'dashboard') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3, description: 'Overview and quick stats' },
    { id: 'system', name: 'System Monitor', icon: Monitor, description: 'Real-time system health' },
    { id: 'analytics', name: 'Advanced Analytics', icon: LineChart, description: 'Business intelligence' },
    
    // Core Business Data
    { id: 'users', name: 'Users', icon: Users, description: 'User management' },
    { id: 'stores', name: 'Stores', icon: Store, description: 'Store management' },
    { id: 'products', name: 'Products', icon: Package, description: 'Product catalog' },
    { id: 'services', name: 'Services', icon: Calendar, description: 'Service offerings' },
    { id: 'orders', name: 'Orders', icon: FileText, description: 'Order management' },
    { id: 'bookings', name: 'Bookings', icon: Calendar, description: 'Booking management' },
    
    // Financial & Transactions
    { id: 'withdrawals', name: 'Withdrawals', icon: DollarSign, description: 'Withdrawal requests' },
    { id: 'wallets', name: 'Wallets', icon: Wallet, description: 'User wallets' },
    { id: 'commissions', name: 'Commissions', icon: CreditCard, description: 'Commission tracking' },
    { id: 'pending-transactions', name: 'Pending Transactions', icon: Clock, description: 'Pending payments' },
    
    // Communication & Social
    { id: 'chats', name: 'Chats', icon: MessageCircle, description: 'Chat messages' },
    { id: 'posts', name: 'Social Posts', icon: FileText, description: 'Social media posts' },
    { id: 'post-comments', name: 'Post Comments', icon: MessageCircle, description: 'Post comments' },
    { id: 'post-likes', name: 'Post Likes', icon: Heart, description: 'Post reactions' },
    { id: 'reviews', name: 'Reviews', icon: Star, description: 'Product/service reviews' },
    { id: 'notifications', name: 'Notifications', icon: Bell, description: 'System notifications' },
    
    // Platform Configuration
    { id: 'categories', name: 'Categories', icon: Tags, description: 'Product/service categories' },
    { id: 'packages', name: 'Packages', icon: Package, description: 'Subscription packages' },
    { id: 'addons', name: 'Addons', icon: Plus, description: 'Additional features' },
    { id: 'variants', name: 'Variants', icon: Layers, description: 'Product variants' },
    { id: 'time-slots', name: 'Time Slots', icon: Clock, description: 'Service time slots' },
    { id: 'flash-deals', name: 'Flash Deals', icon: Zap, description: 'Promotional deals' },
    { id: 'platform-settings', name: 'Platform Settings', icon: Settings, description: 'System settings' },
    
    // Marketing & Engagement
    { id: 'email-subscriptions', name: 'Email Subscriptions', icon: Mail, description: 'Newsletter subscriptions' },
    { id: 'contact-reveals', name: 'Contact Reveals', icon: Eye, description: 'Contact information reveals' },
    { id: 'subscriptions', name: 'Subscriptions', icon: CreditCard, description: 'User subscriptions' },
    { id: 'search-history', name: 'Search History', icon: Search, description: 'User search patterns' },
    
    // Advanced Features
    { id: 'comment-likes', name: 'Comment Likes', icon: ThumbsUp, description: 'Comment reactions' },
    { id: 'comment-reactions', name: 'Comment Reactions', icon: Heart, description: 'Comment interactions' },
    { id: 'chat-analytics', name: 'Chat Analytics', icon: BarChart3, description: 'Chat performance metrics' },
    { id: 'marketing', name: 'Marketing', icon: Target, description: 'Marketing campaigns and ads' },
    
    // System Administration
    { id: 'audit', name: 'Activity Logs', icon: Shield, description: 'Admin activity audit' }
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Comprehensive e-commerce platform management</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => fetchAdminData()}
                disabled={loading}
                className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-auto p-1 text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800">{success}</span>
              <button
                onClick={() => setSuccess('')}
                className="ml-auto p-1 text-green-600 hover:text-green-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Navigation Tabs with Categorization */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 mb-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setCurrentPage(1);
                      setSelectedItems([]);
                    }}
                    className={`group flex flex-col items-center space-y-2 p-3 rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-black text-white shadow-md'
                        : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${
                      activeTab === tab.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                    }`} />
                    <div className="text-center">
                      <span className="text-xs font-medium block">{tab.name}</span>
                      {tab.description && (
                        <span className={`text-[10px] block mt-1 ${
                          activeTab === tab.id ? 'text-gray-200' : 'text-gray-400'
                        }`}>
                          {tab.description}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                    <p className="text-xs text-green-600">+{stats.activeUsers} active</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Stores</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalStores}</p>
                    <p className="text-xs text-yellow-600">+{stats.pendingStores} pending</p>
                  </div>
                  <Store className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">{formatLKR(stats.totalRevenue)}</p>
                    <p className="text-xs text-gray-500">Orders + Bookings</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pending Withdrawals</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.pendingWithdrawals}</p>
                    <p className="text-xs text-red-600">Requires attention</p>
                  </div>
                  <Clock className="w-8 h-8 text-red-500" />
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Products & Services</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Products</span>
                    <span className="font-semibold">{stats.totalProducts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Services</span>
                    <span className="font-semibold">{stats.totalServices}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Orders & Bookings</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Orders</span>
                    <span className="font-semibold">{stats.totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bookings</span>
                    <span className="font-semibold">{stats.totalBookings}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('withdrawals')}
                    className="w-full text-left px-3 py-2 text-sm bg-yellow-50 text-yellow-800 rounded-lg hover:bg-yellow-100"
                  >
                    Review Withdrawals ({stats.pendingWithdrawals})
                  </button>
                  <button
                    onClick={() => setActiveTab('stores')}
                    className="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-800 rounded-lg hover:bg-blue-100"
                  >
                    Verify Stores ({stats.pendingStores})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Monitoring */}
        {activeTab === 'system' && (
          <SystemMonitoring />
        )}

        {/* Advanced Analytics */}
        {activeTab === 'analytics' && (
          <AdvancedAnalytics />
        )}

        {/* Collection Management with AdvancedDataTable */}
        {getCollectionConfig(activeTab) && (
          <AdvancedDataTable
            collection={getCollectionConfig(activeTab).collection}
            title={getCollectionConfig(activeTab).title}
            columns={getCollectionConfig(activeTab).columns}
            searchFields={getCollectionConfig(activeTab).searchFields}
            filterField={getCollectionConfig(activeTab).filterField}
            canCreate={getCollectionConfig(activeTab).canCreate}
            canEdit={getCollectionConfig(activeTab).canEdit}
            canDelete={getCollectionConfig(activeTab).canDelete}
            onItemSelect={(item) => openModal('view', item)}
            onItemEdit={getCollectionConfig(activeTab).canEdit ? (item) => openModal('edit', item) : null}
            onItemCreate={getCollectionConfig(activeTab).canCreate ? () => openModal('create') : null}
          />
        )}

        {/* Legacy Data Management Sections (for specific cases) */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    {(activeTab === 'stores' || activeTab === 'users') && (
                      <option value="verified">Verified</option>
                    )}
                    {activeTab === 'withdrawals' && (
                      <>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="approved">Approved</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </>
                    )}
                  </select>
                </div>
                <button
                  onClick={() => exportData(activeTab)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                {activeTab !== 'audit' && activeTab !== 'analytics' && (
                  <button
                    onClick={() => openModal('create')}
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-4">
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
                    <button
                      onClick={() => handleBulkOperation('toggle-status', selectedItems)}
                      disabled={processing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                      Toggle Status
                    </button>
                    <button
                      onClick={() => handleBulkOperation('delete', selectedItems)}
                      disabled={processing}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                      Delete Selected
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Data Display */}
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                {/* Data Table/Cards based on activeTab */}
                {activeTab === 'withdrawals' ? (
                  // Withdrawal-specific UI from AdminWithdrawals component
                  <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Withdrawal Requests</h3>
                    </div>
                    {paginatedData.length === 0 ? (
                      <div className="text-center py-16">
                        <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">No withdrawal requests found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-4 text-left">
                                <input
                                  type="checkbox"
                                  checked={selectedItems.length === paginatedData.length}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedItems(paginatedData.map(item => item._id));
                                    } else {
                                      setSelectedItems([]);
                                    }
                                  }}
                                  className="rounded border-gray-300 text-black focus:ring-black"
                                />
                              </th>
                              <th className="px-6 py-4 text-left font-semibold text-black">Store</th>
                              <th className="px-6 py-4 text-left font-semibold text-black">Amount</th>
                              <th className="px-6 py-4 text-left font-semibold text-black">Status</th>
                              <th className="px-6 py-4 text-left font-semibold text-black">Bank Details</th>
                              <th className="px-6 py-4 text-left font-semibold text-black">Requested</th>
                              <th className="px-6 py-4 text-left font-semibold text-black">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {paginatedData.map((withdrawal) => (
                              <tr key={withdrawal._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                  <input
                                    type="checkbox"
                                    checked={selectedItems.includes(withdrawal._id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedItems([...selectedItems, withdrawal._id]);
                                      } else {
                                        setSelectedItems(selectedItems.filter(id => id !== withdrawal._id));
                                      }
                                    }}
                                    className="rounded border-gray-300 text-black focus:ring-black"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-semibold">
                                      {withdrawal.userId?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                      <p className="font-medium text-black">{withdrawal.userId?.name || 'Unknown'}</p>
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
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-600">
                                    {formatDate(withdrawal.createdAt)}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => openModal('view', withdrawal)}
                                      className="p-2 text-gray-600 hover:text-black rounded-lg hover:bg-gray-100"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    {withdrawal.status === 'pending' && (
                                      <>
                                        <button
                                          onClick={() => handleWithdrawalProcess(withdrawal._id, 'approved')}
                                          className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleWithdrawalProcess(withdrawal._id, 'rejected')}
                                          className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  // Generic data table for other tabs
                  <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold capitalize">{activeTab} Management</h3>
                    </div>
                    {paginatedData.length === 0 ? (
                      <div className="text-center py-16">
                        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">No {activeTab} found</p>
                        <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left">
                                <input
                                  type="checkbox"
                                  checked={selectedItems.length === paginatedData.length}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedItems(paginatedData.map(item => item._id));
                                    } else {
                                      setSelectedItems([]);
                                    }
                                  }}
                                  className="rounded border-gray-300 text-black focus:ring-black"
                                />
                              </th>
                              
                              {/* Dynamic headers based on activeTab */}
                              {activeTab === 'users' && (
                                <>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </>
                              )}
                              
                              {activeTab === 'stores' && (
                                <>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </>
                              )}
                              
                              {(activeTab === 'products' || activeTab === 'services') && (
                                <>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </>
                              )}
                              
                              {(activeTab === 'orders' || activeTab === 'bookings') && (
                                <>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedData.map((item) => (
                              <tr key={item._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={selectedItems.includes(item._id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedItems([...selectedItems, item._id]);
                                      } else {
                                        setSelectedItems(selectedItems.filter(id => id !== item._id));
                                      }
                                    }}
                                    className="rounded border-gray-300 text-black focus:ring-black"
                                  />
                                </td>
                                
                                {/* Dynamic table rows based on activeTab */}
                                {activeTab === 'users' && (
                                  <>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <img
                                          src={item.profileImage?.[0] || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'}
                                          alt={item.name}
                                          className="w-10 h-10 rounded-full object-cover mr-3"
                                        />
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                          <div className="text-sm text-gray-500">{item.email}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                      {item.role}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                      }`}>
                                        {item.isActive ? 'Active' : 'Inactive'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {formatDate(item.createdAt)}
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
                                          onClick={() => handleCRUDOperation('toggle-status', 'users', item._id)}
                                          className={`${item.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                                        >
                                          {item.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
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
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                          <div className="text-sm text-gray-500">{item.email}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="text-sm text-gray-500 capitalize">{item.type}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {item.ownerId?.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex flex-col space-y-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                          {item.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          item.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {item.isVerified ? 'Verified' : 'Unverified'}
                                        </span>
                                      </div>
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
                                          onClick={() => generateQRCode(item._id, item.name)}
                                          className="text-blue-600 hover:text-blue-900"
                                        >
                                          <QrCode className="w-4 h-4" />
                                        </button>
                                        {!item.isVerified && (
                                          <button
                                            onClick={() => handleCRUDOperation('verify', 'stores', item._id)}
                                            className="text-green-600 hover:text-green-900"
                                          >
                                            <Shield className="w-4 h-4" />
                                          </button>
                                        )}
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

                                {(activeTab === 'products' || activeTab === 'services') && (
                                  <>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <img
                                          src={item.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop'}
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
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                                          onClick={() => handleCRUDOperation('toggle-status', activeTab, item._id)}
                                          className={`${item.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                                        >
                                          {item.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}

                                {(activeTab === 'orders' || activeTab === 'bookings') && (
                                  <>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">{item.userId?.name || 'Unknown'}</div>
                                        <div className="text-sm text-gray-500">{item.userId?.email || 'No email'}</div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {item.storeId?.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                      {formatLKR(item.totalAmount || item.amount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                        {getStatusIcon(item.status)}
                                        <span className="ml-1 capitalize">{item.status}</span>
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {formatDate(item.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => openModal('view', item)}
                                          className="text-indigo-600 hover:text-indigo-900"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        {item.status === 'pending' && (
                                          <button
                                            onClick={() => handleCRUDOperation('update', activeTab, item._id, { status: 'confirmed' })}
                                            className="text-green-600 hover:text-green-900"
                                          >
                                            <CheckCircle className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200 sm:px-6 rounded-lg shadow-sm">
                    <div className="flex justify-between flex-1 sm:hidden">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing{' '}
                          <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                          {' '} to{' '}
                          <span className="font-medium">
                            {Math.min(currentPage * itemsPerPage, filteredData.length)}
                          </span>
                          {' '} of{' '}
                          <span className="font-medium">{filteredData.length}</span>
                          {' '} results
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                          >
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                          </button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const page = i + 1;
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                  page === currentPage
                                    ? 'z-10 bg-black text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'
                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                          >
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Analytics Section */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {/* Key Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Revenue"
                value={stats.totalRevenue}
                icon={DollarSign}
                color="green"
                trend={12.5}
                subtitle="This month"
              />
              <StatsCard
                title="Active Users"
                value={stats.activeUsers}
                icon={Users}
                color="blue"
                trend={8.2}
                subtitle={`${stats.totalUsers} total`}
              />
              <StatsCard
                title="Order Conversion"
                value="24.8%"
                icon={TrendingUp}
                color="purple"
                trend={3.1}
                subtitle="Last 30 days"
              />
              <StatsCard
                title="Avg. Order Value"
                value={stats.totalRevenue / Math.max(stats.totalOrders, 1)}
                icon={Target}
                color="yellow"
                trend={-1.4}
                subtitle="Per transaction"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AnalyticsChart
                title="Revenue by Month"
                type="line"
                trend={15.3}
                data={[
                  { label: 'Jan', value: stats.totalRevenue * 0.15 },
                  { label: 'Feb', value: stats.totalRevenue * 0.12 },
                  { label: 'Mar', value: stats.totalRevenue * 0.18 },
                  { label: 'Apr', value: stats.totalRevenue * 0.16 },
                  { label: 'May', value: stats.totalRevenue * 0.20 },
                  { label: 'Jun', value: stats.totalRevenue * 0.19 }
                ]}
              />
              
              <AnalyticsChart
                title="Orders by Status"
                type="bar"
                data={[
                  { label: 'Completed', value: Math.floor(stats.totalOrders * 0.7) },
                  { label: 'Processing', value: Math.floor(stats.totalOrders * 0.15) },
                  { label: 'Pending', value: Math.floor(stats.totalOrders * 0.10) },
                  { label: 'Cancelled', value: Math.floor(stats.totalOrders * 0.05) }
                ]}
              />
            </div>

            {/* Additional Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <AnalyticsChart
                title="Store Performance"
                type="bar"
                data={[
                  { label: 'Electronics', value: 45 },
                  { label: 'Fashion', value: 32 },
                  { label: 'Home & Garden', value: 28 },
                  { label: 'Sports', value: 21 },
                  { label: 'Books', value: 15 }
                ]}
              />
              
              <AnalyticsChart
                title="User Activity"
                type="grid"
                data={[
                  { label: 'Daily Active', value: Math.floor(stats.activeUsers * 0.3) },
                  { label: 'Weekly Active', value: Math.floor(stats.activeUsers * 0.7) },
                  { label: 'New Signups', value: Math.floor(stats.totalUsers * 0.05) },
                  { label: 'Returning Users', value: Math.floor(stats.activeUsers * 0.8) }
                ]}
              />
              
              <AnalyticsChart
                title="Platform Health"
                type="grid"
                data={[
                  { label: 'System Uptime', value: '99.9%' },
                  { label: 'Avg Response', value: '1.2s' },
                  { label: 'Error Rate', value: '0.1%' },
                  { label: 'Active Stores', value: stats.totalStores }
                ]}
              />
            </div>

            {/* Geographic Analytics */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Geographic Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-4">Top Cities by Orders</h4>
                  <div className="space-y-3">
                    {[
                      { city: 'Colombo', orders: Math.floor(stats.totalOrders * 0.35), percentage: 35 },
                      { city: 'Kandy', orders: Math.floor(stats.totalOrders * 0.20), percentage: 20 },
                      { city: 'Galle', orders: Math.floor(stats.totalOrders * 0.15), percentage: 15 },
                      { city: 'Jaffna', orders: Math.floor(stats.totalOrders * 0.12), percentage: 12 },
                      { city: 'Negombo', orders: Math.floor(stats.totalOrders * 0.18), percentage: 18 }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-black rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">{item.city}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-black h-2 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">{item.orders}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-4">Revenue by Region</h4>
                  <div className="space-y-4">
                    {[
                      { region: 'Western Province', revenue: stats.totalRevenue * 0.45 },
                      { region: 'Central Province', revenue: stats.totalRevenue * 0.22 },
                      { region: 'Southern Province', revenue: stats.totalRevenue * 0.18 },
                      { region: 'Northern Province', revenue: stats.totalRevenue * 0.15 }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">{item.region}</span>
                        <span className="text-sm font-bold text-gray-900">{formatLKR(item.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Categories Management */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Categories Management</h3>
                  <button
                    onClick={() => openModal('create')}
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Category</span>
                  </button>
                </div>
              </div>

              {paginatedData.length === 0 ? (
                <div className="text-center py-16">
                  <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 text-lg">No categories found</p>
                  <p className="text-gray-400 text-sm mt-2">Create your first category to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedItems.length === paginatedData.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems(paginatedData.map(item => item._id));
                              } else {
                                setSelectedItems([]);
                              }
                            }}
                            className="rounded border-gray-300 text-black focus:ring-black"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Count</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedData.map((category) => (
                        <tr key={category._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(category._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems([...selectedItems, category._id]);
                                } else {
                                  setSelectedItems(selectedItems.filter(id => id !== category._id));
                                }
                              }}
                              className="rounded border-gray-300 text-black focus:ring-black"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3 ${
                                category.type === 'product' ? 'bg-blue-500' : 'bg-green-500'
                              }`}>
                                {category.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{category.name}</div>
                                <div className="text-sm text-gray-500">{category.description || 'No description'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              category.type === 'product' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {category.type?.charAt(0).toUpperCase() + category.type?.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {category.itemsCount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              category.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {category.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(category.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openModal('view', category)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openModal('edit', category)}
                                className="text-green-600 hover:text-green-900"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCRUDOperation('toggle-status', 'categories', category._id)}
                                className={`${category.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                              >
                                {category.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Logs */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow-sm border">
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
                        {formatDate(log.timestamp)}
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
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                        No audit logs available
                      </td>
                    </tr>
                  )}
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
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">ID</label>
                      <p className="text-sm text-gray-900 font-mono">{selectedItem._id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Name</label>
                      <p className="text-sm text-gray-900">{selectedItem.name || selectedItem.title || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Status</label>
                      <p className="text-sm text-gray-900 capitalize">{selectedItem.status || (selectedItem.isActive ? 'Active' : 'Inactive')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Created</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedItem.createdAt)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Raw Data</h4>
                  <pre className="bg-white p-4 rounded border text-xs overflow-auto max-h-64">
                    {JSON.stringify(selectedItem, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            {(modalType === 'create' || modalType === 'edit') && (
              <div>
                <p className="text-gray-600 mb-4">
                  {modalType === 'create' ? 'Create new' : 'Edit'} {activeTab.slice(0, -1)} form would be implemented here with specific fields for each type.
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
    </ErrorBoundary>
  );
};

export default Admin;