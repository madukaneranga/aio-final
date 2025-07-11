import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatLKR } from '../utils/currency';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Edit, Trash2, Eye, Package, Star, ArrowLeft } from 'lucide-react';

const ManageProducts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (user?.role === 'store_owner' && user?.storeId) {
      fetchProducts();
    } else {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products?storeId=${user.storeId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        console.error('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    setDeleting(productId);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setProducts(products.filter(p => p._id !== productId));
        alert('Product deleted successfully!');
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct({
      ...product,
      price: product.price.toString(),
      stock: product.stock.toString()
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      formData.append('title', editingProduct.title);
      formData.append('description', editingProduct.description);
      formData.append('price', editingProduct.price);
      formData.append('category', editingProduct.category);
      formData.append('stock', editingProduct.stock);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products/${editingProduct._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        fetchProducts();
        setShowEditModal(false);
        setEditingProduct(null);
        alert('Product updated successfully!');
      } else {
        alert('Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product');
    }
  };

  if (!user || user.role !== 'store_owner') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You need to be a store owner to access this page</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Products</h1>
              <p className="text-gray-600 mt-2">Add, edit, and manage your products</p>
            </div>
            <Link
              to="/create-product"
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Product</span>
            </Link>
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Yet</h3>
            <p className="text-gray-600 mb-6">Start by creating your first product</p>
            <Link
              to="/create-product"
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Product</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product._id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="relative">
                  <img
                    src={product.images?.[0] ? 
                      (product.images[0].startsWith('http') ? product.images[0] : `${import.meta.env.VITE_API_URL}${product.images[0]}`) : 
                      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop'
                    }
                    alt={product.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded text-sm ${
                    product.isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.title}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold">{formatLKR(product.price)}</span>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-600">4.5</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">
                      {product.category}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Link
                      to={`/product/${product._id}`}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </Link>
                    <button
                      onClick={() => handleEdit(product)}
                      className="flex-1 bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      disabled={deleting === product._id}
                      className="flex-1 bg-red-500 text-white py-2 px-3 rounded text-sm hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{deleting === product._id ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Edit Product</h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Title
                    </label>
                    <input
                      type="text"
                      value={editingProduct.title}
                      onChange={(e) => setEditingProduct({...editingProduct, title: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price (LKR)
                      </label>
                      <input
                        type="number"
                        value={editingProduct.price}
                        onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        value={editingProduct.stock}
                        onChange={(e) => setEditingProduct({...editingProduct, stock: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        required
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    >
                      <option value="">Select a category</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Home & Garden">Home & Garden</option>
                      <option value="Sports & Outdoors">Sports & Outdoors</option>
                      <option value="Books">Books</option>
                      <option value="Beauty & Health">Beauty & Health</option>
                      <option value="Toys & Games">Toys & Games</option>
                      <option value="Food & Beverages">Food & Beverages</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                    >
                      Update Product
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageProducts;