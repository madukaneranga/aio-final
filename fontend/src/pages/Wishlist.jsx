import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  ShoppingCart,
  Trash2,
  Filter,
  Search,
  Star,
  Calendar,
  Package,
  ExternalLink,
  Share2,
  Grid3X3,
  List,
  Eye,
  ArrowUpDown,
  Tag,
  Store,
} from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { formatLKR } from '../utils/currency';

const Wishlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    wishlistItems,
    isLoading,
    removeFromWishlist,
    updateItemPriority,
    updateItemNotes,
    moveToCart,
    getItemsByFilter,
    getStats,
  } = useWishlist();
  const { addToOrder, addToBooking } = useCart();

  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingNotes, setEditingNotes] = useState(null);
  const [notesValue, setNotesValue] = useState('');

  // Redirect non-customers
  useEffect(() => {
    if (user && user.role !== 'customer') {
      navigate('/');
    }
  }, [user, navigate]);

  // Get filtered and sorted items
  const getFilteredItems = () => {
    let items = [...wishlistItems];

    // Apply filters
    if (filterType !== 'all') {
      items = items.filter(item => item.itemType === filterType);
    }

    if (filterPriority !== 'all') {
      items = items.filter(item => item.priority === filterPriority);
    }

    // Apply search
    if (searchQuery) {
      items = items.filter(item =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.storeName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    items.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.addedAt) - new Date(a.addedAt);
        case 'oldest':
          return new Date(a.addedAt) - new Date(b.addedAt);
        case 'price-high':
          return b.price - a.price;
        case 'price-low':
          return a.price - b.price;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'name':
          return a.title?.localeCompare(b.title) || 0;
        default:
          return 0;
      }
    });

    return items;
  };

  const filteredItems = getFilteredItems();
  const stats = getStats();

  const handleAddToCart = async (item) => {
    try {
      if (item.itemType === 'product') {
        await addToOrder(
          {
            _id: item.itemId,
            title: item.title,
            price: item.price,
            images: [item.image],
            storeId: item.storeId,
          },
          1
        );
      } else {
        await addToBooking(
          {
            _id: item.itemId,
            title: item.title,
            price: item.price,
            images: [item.image],
            storeId: item.storeId,
          },
          { date: '', time: '', notes: '' }
        );
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const handleNotesEdit = (item) => {
    setEditingNotes(item._id);
    setNotesValue(item.notes || '');
  };

  const handleSaveNotes = async () => {
    if (editingNotes) {
      await updateItemNotes(editingNotes, notesValue);
      setEditingNotes(null);
      setNotesValue('');
    }
  };

  const handleCancelNotes = () => {
    setEditingNotes(null);
    setNotesValue('');
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign in to view your wishlist</h2>
          <p className="text-gray-600 mb-8">Keep track of items you love by creating an account</p>
          <Link
            to="/login"
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Heart className="w-8 h-8 text-red-500 fill-current" />
                My Wishlist
              </h1>
              <p className="text-gray-600 mt-2">
                {stats.totalItems} item{stats.totalItems !== 1 ? 's' : ''} saved
                {stats.totalValue > 0 && (
                  <span className="ml-2 text-gray-500">
                    • Total value: {formatLKR(stats.totalValue)}
                  </span>
                )}
              </p>
            </div>

            {/* Stats Cards */}
            <div className="flex flex-wrap gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Products</p>
                    <p className="font-bold text-gray-900">{stats.productCount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Services</p>
                    <p className="font-bold text-gray-900">{stats.serviceCount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-red-500 fill-current" />
                  <div>
                    <p className="text-sm text-gray-600">High Priority</p>
                    <p className="font-bold text-gray-900">{stats.highPriorityCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your wishlist is empty</h2>
            <p className="text-gray-600 mb-8">Start adding items you love to keep track of them</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/products"
                className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Browse Products
              </Link>
              <Link
                to="/services"
                className="bg-white border-2 border-black text-black px-6 py-3 rounded-lg hover:bg-black hover:text-white transition-colors"
              >
                Browse Services
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search wishlist items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  {/* Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>

                  {/* View Mode */}
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 ${
                        viewMode === 'grid'
                          ? 'bg-black text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      } transition-colors`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 ${
                        viewMode === 'list'
                          ? 'bg-black text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      } transition-colors`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item Type
                      </label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="all">All Items</option>
                        <option value="product">Products</option>
                        <option value="service">Services</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="priority">Priority</option>
                        <option value="name">Name</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Count */}
            <div className="mb-6">
              <p className="text-gray-600">
                Showing {filteredItems.length} of {wishlistItems.length} items
              </p>
            </div>

            {/* Items Display */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredItems.map((item) => (
                  <div key={item._id} className="bg-white rounded-lg shadow-sm border hover:shadow-lg transition-shadow">
                    <div className="relative">
                      {/* Item Image */}
                      <Link to={`/${item.itemType}/${item.itemId}`}>
                        <img
                          src={
                            item.image ||
                            (item.itemType === 'product'
                              ? 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop'
                              : 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop')
                          }
                          alt={item.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                      </Link>

                      {/* Priority Badge */}
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromWishlist(item._id)}
                        className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-full shadow-sm hover:shadow-md transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center gap-1 mb-2">
                        <Tag className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {item.itemType}
                        </span>
                      </div>

                      <Link to={`/${item.itemType}/${item.itemId}`}>
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-gray-700 transition-colors">
                          {item.title}
                        </h3>
                      </Link>

                      <p className="text-lg font-bold text-gray-900 mb-2">
                        {formatLKR(item.price)}
                      </p>

                      {item.storeName && (
                        <div className="flex items-center gap-1 mb-2">
                          <Store className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{item.storeName}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <select
                          value={item.priority}
                          onChange={(e) => updateItemPriority(item._id, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => item.itemType === 'service' ? window.location.href = `/service/${item.itemId}` : handleAddToCart(item)}
                          className="flex-1 bg-black text-white py-2 px-3 rounded text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
                        >
                          {item.itemType === 'service' ? (
                            <>
                              <Eye className="w-3 h-3" />
                              View Service
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-3 h-3" />
                              Add to Cart
                            </>
                          )}
                        </button>
                        <Link
                          to={`/${item.itemType}/${item.itemId}`}
                          className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <div key={item._id} className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-start gap-4">
                      <Link to={`/${item.itemType}/${item.itemId}`}>
                        <img
                          src={
                            item.image ||
                            (item.itemType === 'product'
                              ? 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop'
                              : 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop')
                          }
                          alt={item.title}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      </Link>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                                {item.priority}
                              </span>
                              <span className="text-xs text-gray-500 uppercase tracking-wide">
                                {item.itemType}
                              </span>
                            </div>

                            <Link to={`/${item.itemType}/${item.itemId}`}>
                              <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-gray-700 transition-colors">
                                {item.title}
                              </h3>
                            </Link>


                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="font-semibold text-gray-900 text-lg">
                                {formatLKR(item.price)}
                              </span>
                              {item.storeName && (
                                <span className="flex items-center gap-1">
                                  <Store className="w-3 h-3" />
                                  {item.storeName}
                                </span>
                              )}
                              <span>Added {new Date(item.addedAt).toLocaleDateString()}</span>
                            </div>

                            {editingNotes === item._id ? (
                              <div className="mt-3">
                                <textarea
                                  value={notesValue}
                                  onChange={(e) => setNotesValue(e.target.value)}
                                  placeholder="Add notes about this item..."
                                  className="w-full p-2 border border-gray-300 rounded text-sm"
                                  rows="2"
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={handleSaveNotes}
                                    className="bg-black text-white px-3 py-1 rounded text-xs hover:bg-gray-800 transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelNotes}
                                    className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3">
                                {item.notes ? (
                                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                    {item.notes}
                                  </p>
                                ) : (
                                  <button
                                    onClick={() => handleNotesEdit(item)}
                                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                  >
                                    + Add notes
                                  </button>
                                )}
                                {item.notes && (
                                  <button
                                    onClick={() => handleNotesEdit(item)}
                                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-2"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <select
                              value={item.priority}
                              onChange={(e) => updateItemPriority(item._id, e.target.value)}
                              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>

                            <div className="flex gap-2">
                              <button
                                onClick={() => item.itemType === 'service' ? window.location.href = `/service/${item.itemId}` : handleAddToCart(item)}
                                className="bg-black text-white py-2 px-4 rounded text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-1"
                              >
                                {item.itemType === 'service' ? (
                                  <>
                                    <Eye className="w-3 h-3" />
                                    View Service
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart className="w-3 h-3" />
                                    Add to Cart
                                  </>
                                )}
                              </button>
                              <Link
                                to={`/${item.itemType}/${item.itemId}`}
                                className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => removeFromWishlist(item._id)}
                                className="p-2 border border-red-200 text-red-500 rounded hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredItems.length === 0 && searchQuery && (
              <div className="text-center py-16">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-600">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Wishlist;