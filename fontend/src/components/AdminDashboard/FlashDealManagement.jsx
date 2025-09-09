import React, { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  Search,
  Filter,
  Download,
  Edit3,
  Trash2,
  Eye,
  Play,
  Pause,
  Clock,
  Calendar,
  Image,
  Tag,
  Target,
  TrendingUp,
  RefreshCcw,
  MoreHorizontal,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Upload
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const FlashDealManagement = () => {
  const [flashDeals, setFlashDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // UI States
  const [showDealModal, setShowDealModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const limit = 20;

  useEffect(() => {
    fetchFlashDeals();
  }, [currentPage, searchTerm, statusFilter, sortBy, sortOrder]);

  const fetchFlashDeals = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit,
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/api/admin/flash-deals?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch flash deals');
      }

      const data = await response.json();
      setFlashDeals(data.data);
      setCurrentPage(data.pagination.currentPage);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);
    } catch (error) {
      console.error('Error fetching flash deals:', error);
      toast.error('Failed to load flash deals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDealAction = async (dealId, action, data = {}) => {
    try {
      const response = await fetch(`/api/admin/flash-deals/${dealId}/${action}`, {
        method: action === 'delete' ? 'DELETE' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} flash deal`);
      }

      toast.success(`Flash deal ${action}ed successfully`);
      fetchFlashDeals();
    } catch (error) {
      console.error(`Error ${action}ing flash deal:`, error);
      toast.error(`Failed to ${action} flash deal`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeColor = (deal) => {
    const now = new Date();
    const startTime = new Date(deal.saleStartTime);
    const endTime = new Date(deal.saleEndTime);

    if (!deal.isActive || !deal.isPublished) {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }

    if (now < startTime) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    } else if (now >= startTime && now <= endTime) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    } else {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
  };

  const getStatusText = (deal) => {
    const now = new Date();
    const startTime = new Date(deal.saleStartTime);
    const endTime = new Date(deal.saleEndTime);

    if (!deal.isActive || !deal.isPublished) {
      return 'Inactive';
    }

    if (now < startTime) {
      return 'Upcoming';
    } else if (now >= startTime && now <= endTime) {
      return 'Active';
    } else {
      return 'Ended';
    }
  };

  const FlashDealModal = ({ deal, onClose }) => {
    const [formData, setFormData] = useState({
      saleName: deal?.saleName || '',
      saleSubtitle: deal?.saleSubtitle || '',
      discountText: deal?.discountText || 'UP TO 70% OFF',
      buttonText: deal?.buttonText || 'SHOP NOW',
      timerLabel: deal?.timerLabel || 'Sale Starts In:',
      saleStartTime: deal?.saleStartTime ? new Date(deal.saleStartTime).toISOString().slice(0, 16) : '',
      saleEndTime: deal?.saleEndTime ? new Date(deal.saleEndTime).toISOString().slice(0, 16) : '',
      backgroundColor: deal?.backgroundColor || 'linear-gradient(135deg, #ff1744, #e91e63, #f50057)',
      textColor: deal?.textColor || '#ffffff',
      accentColor: deal?.accentColor || '#ffff00',
      heroImage: deal?.heroImage || '',
      showHeroImage: deal?.showHeroImage !== false,
      isActive: deal?.isActive !== false,
      isPublished: deal?.isPublished || false,
      priority: deal?.priority || 0,
      tags: deal?.tags?.join(', ') || ''
    });

    const handleSave = async () => {
      try {
        const data = {
          ...formData,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        };

        if (deal) {
          await handleDealAction(deal._id, 'update', data);
        } else {
          const response = await fetch('/api/admin/flash-deals', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
          });
          
          if (!response.ok) {
            throw new Error('Failed to create flash deal');
          }
          
          toast.success('Flash deal created successfully');
          fetchFlashDeals();
        }
        onClose();
      } catch (error) {
        console.error('Error saving flash deal:', error);
        toast.error('Failed to save flash deal');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {deal ? 'Edit Flash Deal' : 'Create Flash Deal'}
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
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Basic Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sale Name *
                  </label>
                  <input
                    type="text"
                    value={formData.saleName}
                    onChange={(e) => setFormData({ ...formData, saleName: e.target.value })}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Black Friday Sale"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sale Subtitle *
                  </label>
                  <input
                    type="text"
                    value={formData.saleSubtitle}
                    onChange={(e) => setFormData({ ...formData, saleSubtitle: e.target.value })}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Biggest Sale of the Year"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Discount Text
                  </label>
                  <input
                    type="text"
                    value={formData.discountText}
                    onChange={(e) => setFormData({ ...formData, discountText: e.target.value })}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Timer Label
                  </label>
                  <input
                    type="text"
                    value={formData.timerLabel}
                    onChange={(e) => setFormData({ ...formData, timerLabel: e.target.value })}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Timing */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Timing Configuration</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sale Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.saleStartTime}
                    onChange={(e) => setFormData({ ...formData, saleStartTime: e.target.value })}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sale End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.saleEndTime}
                    onChange={(e) => setFormData({ ...formData, saleEndTime: e.target.value })}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Design Configuration */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Design Configuration</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Background Color/Gradient
                  </label>
                  <input
                    type="text"
                    value={formData.backgroundColor}
                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Text Color
                  </label>
                  <input
                    type="color"
                    value={formData.textColor}
                    onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                    className="mt-1 block w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Accent Color
                  </label>
                  <input
                    type="color"
                    value={formData.accentColor}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    className="mt-1 block w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Hero Image</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Hero Image URL *
                  </label>
                  <input
                    type="url"
                    value={formData.heroImage}
                    onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="https://example.com/hero-image.jpg"
                  />
                </div>
                
                <div className="flex items-center">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.showHeroImage}
                      onChange={(e) => setFormData({ ...formData, showHeroImage: e.target.checked })}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Show Hero Image
                    </span>
                  </label>
                </div>
              </div>

              {formData.heroImage && formData.showHeroImage && (
                <div className="mt-4">
                  <img
                    src={formData.heroImage}
                    alt="Hero Preview"
                    className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Settings</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div className="flex items-center">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Active Deal
                    </span>
                  </label>
                </div>
                
                <div className="flex items-center">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Published
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="sale, discount, special"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {deal ? 'Update Flash Deal' : 'Create Flash Deal'}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Flash Deal Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Create and manage promotional flash deals and sales campaigns
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowDealModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Flash Deal
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Deals
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {totalCount}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Deals
              </p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {flashDeals.filter(deal => {
                  const now = new Date();
                  const startTime = new Date(deal.saleStartTime);
                  const endTime = new Date(deal.saleEndTime);
                  return deal.isActive && deal.isPublished && now >= startTime && now <= endTime;
                }).length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <Play className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Upcoming Deals
              </p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {flashDeals.filter(deal => {
                  const now = new Date();
                  const startTime = new Date(deal.saleStartTime);
                  return deal.isActive && deal.isPublished && now < startTime;
                }).length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Views
              </p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {flashDeals.reduce((total, deal) => total + (deal.viewCount || 0), 0)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-500">
              <Eye className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search flash deals..."
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
            <option value="upcoming">Upcoming</option>
            <option value="ended">Ended</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="createdAt">Sort by Date</option>
            <option value="saleName">Sort by Name</option>
            <option value="saleStartTime">Sort by Start Time</option>
            <option value="priority">Sort by Priority</option>
            <option value="viewCount">Sort by Views</option>
          </select>

          <button
            onClick={fetchFlashDeals}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Flash Deals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="space-y-4">
                <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
              </div>
            </div>
          ))
        ) : flashDeals.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Zap className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No flash deals found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating your first flash deal.
            </p>
            <button
              onClick={() => setShowDealModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Flash Deal
            </button>
          </div>
        ) : (
          flashDeals.map((deal) => (
            <div key={deal._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow duration-200">
              {/* Deal Image */}
              <div className="relative h-40 bg-gradient-to-r from-purple-500 to-pink-500">
                {deal.heroImage && deal.showHeroImage ? (
                  <img
                    src={deal.heroImage}
                    alt={deal.saleName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-white"
                    style={{ background: deal.backgroundColor }}
                  >
                    <Zap className="w-12 h-12" />
                  </div>
                )}
                
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(deal)}`}>
                    {getStatusText(deal)}
                  </span>
                </div>
              </div>

              {/* Deal Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {deal.saleName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {deal.saleSubtitle}
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
                            setSelectedDeal(deal);
                            setShowDealModal(true);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <Edit3 className="w-4 h-4 inline mr-2" />
                          Edit Deal
                        </button>
                        <button
                          onClick={() => handleDealAction(deal._id, deal.isActive ? 'deactivate' : 'activate')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          {deal.isActive ? (
                            <>
                              <Pause className="w-4 h-4 inline mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 inline mr-2" />
                              Activate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDealAction(deal._id, 'delete')}
                          className="block w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <Trash2 className="w-4 h-4 inline mr-2" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deal Meta */}
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDateTime(deal.saleStartTime)} - {formatDateTime(deal.saleEndTime)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-2" />
                      <span>{deal.viewCount || 0} views</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Target className="w-4 h-4 mr-2" />
                      <span>{deal.clickCount || 0} clicks</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {deal.tags && deal.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {deal.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    {deal.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                        +{deal.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
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

      {/* Flash Deal Modal */}
      {showDealModal && (
        <FlashDealModal
          deal={selectedDeal}
          onClose={() => {
            setShowDealModal(false);
            setSelectedDeal(null);
          }}
        />
      )}
    </div>
  );
};

export default FlashDealManagement;