import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import SearchFilters from '../components/SearchFilters';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Package } from 'lucide-react';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();

  const categories = [
    'Electronics',
    'Clothing',
    'Home & Garden',
    'Sports & Outdoors',
    'Books',
    'Beauty & Health',
    'Toys & Games',
    'Food & Beverages'
  ];

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    fetchProducts(searchParams.toString());
  }, [location.search]);

  const fetchProducts = async (queryString = '') => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products?${queryString}`);
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        setError('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (filters) => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    fetchProducts(params.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Products</h1>
          
          <SearchFilters
            onSearch={handleSearch}
            categories={categories}
            placeholder="Search products..."
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="mb-6">
          <p className="text-gray-600">
            {products.length} product{products.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description="Try adjusting your search criteria or check back later for new products."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;