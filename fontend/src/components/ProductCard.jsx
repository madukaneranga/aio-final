import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { formatLKR } from '../utils/currency';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.role !== 'customer') {
      alert('Only customers can add items to cart');
      return;
    }
    // Ensure we pass the product with proper storeId
    const productWithStoreId = {
      ...product,
      storeId: product.storeId?._id || product.storeId
    };
    addToCart(productWithStoreId);
  };

  return (
    <Link to={`/product/${product._id}`} className="block">
      <div className="product-card bg-white rounded-lg shadow-md overflow-hidden">
        {/* === Start Image Hover Logic Modification === */}
        <div className="relative w-full h-48 overflow-hidden group">
          {/* First Image */}
          <img
            src={
              product.images?.[0]
                ? product.images[0].startsWith('http')
                  ? product.images[0]
                  : `${import.meta.env.VITE_API_URL}${product.images[0]}`
                : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop'
            }
            alt={product.title}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
              product.images?.[1]
                ? 'group-hover:opacity-0' // fade out if second image exists
                : 'group-hover:opacity-50' // blink same image
            }`}
          />

          {/* Second Image (if available) */}
          {product.images?.[1] && (
            <img
              src={
                product.images[1].startsWith('http')
                  ? product.images[1]
                  : `${import.meta.env.VITE_API_URL}${product.images[1]}`
              }
              alt={`${product.title} hover`}
              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            />
          )}

          {/* Add to Cart Button */}
          {user?.role === 'customer' && (
            <button
              onClick={handleAddToCart}
              className="absolute top-2 right-2 bg-black text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* === End Image Hover Logic Modification === */}
        
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
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </span>
            <span className="text-sm text-gray-500 capitalize">
              {product.category}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;