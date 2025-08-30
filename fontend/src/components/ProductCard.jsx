import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  Star,
  Eye,
  Heart,
  Clock,
  Tag,
  AlertCircle,
} from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useWishlist } from "../contexts/WishlistContext";
import { formatLKR } from "../utils/currency";
import useImpression from "../hooks/useImpression";

const ProductCard = ({ product }) => {
  const cardRef = useRef(null);
  const { addToOrder } = useCart();
  const { user } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist, isLoading: wishlistLoading } = useWishlist();
  const { trackProductImpression, createImpressionObserver } = useImpression();

  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  
  const isWishlisted = isInWishlist(product._id);

  useEffect(() => {
    const observer = createImpressionObserver((target) => {
      // Track product impression using our new system
      trackProductImpression(product);
      
      // Google Analytics 4 - Product View Event
      if (typeof gtag !== 'undefined') {
        gtag('event', 'view_item', {
          currency: 'LKR',
          value: product.price,
          items: [{
            item_id: product._id,
            item_name: product.title,
            category: product.category,
            price: product.price
          }]
        });
      }

      // Microsoft Clarity - Product View Event
      if (typeof clarity !== 'undefined') {
        clarity('event', 'product_view', {
          product_id: product._id,
          product_name: product.title,
          category: product.category,
          price: product.price
        });
      }
    }, { 
      threshold: 0.5, // 50% of the card visible = impression
      rootMargin: '0px'
    });

    if (cardRef.current) observer.observe(cardRef.current);

    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, [product._id, trackProductImpression, createImpressionObserver, product]);

  //const formatLKR = (price) => `LKR ${price.toLocaleString()}`;

  const isNew = () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return new Date(product.createdAt) > sevenDaysAgo;
  };

  const isOnSale = () => product.oldPrice && product.oldPrice > product.price;

  const isLowStock = () => product.stock <= 5 && product.stock > 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.role !== "customer") {
      alert("Only customers can add items to cart");
      return;
    }
    // Ensure we pass the product with proper storeId
    const productWithStoreId = {
      ...product,
      storeId: product.storeId?._id || product.storeId,
    };
    console.log("Added to cart:", {
      product: product._id,
      quantity: selectedQuantity,
    });

    setIsQuickViewOpen(false);
    addToOrder(productWithStoreId, selectedQuantity);
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (user?.role !== "customer") {
      alert("Only customers can add items to wishlist");
      return;
    }
    
    try {
      if (isWishlisted) {
        await removeFromWishlist(product._id);
      } else {
        await addToWishlist(product);
      }
    } catch (error) {
      console.error('Wishlist error:', error);
    }
  };

  return (
    <>
      <Link to={`/product/${product._id}`} className="block">
        <div className="relative w-full" ref={cardRef}>
          {/* Product Card */}
          <div className="group relative bg-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-200 hover:border-black transform hover:-translate-y-1 sm:hover:-translate-y-2 w-full h-full flex flex-col">
            {/* Badges */}
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20 flex flex-col gap-1 sm:gap-2">
              {isNew() && (
                <span className="bg-black text-white text-xs font-bold px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-sm tracking-wider">
                  NEW
                </span>
              )}
              {isOnSale() && (
                <span className="bg-black text-white text-xs font-bold px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-sm tracking-wider">
                  SALE
                </span>
              )}
              {isLowStock() && (
                <span className="bg-black text-white text-xs font-bold px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1 tracking-wider">
                  <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">LOW STOCK</span>
                  <span className="sm:hidden">LOW</span>
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-20 flex flex-row sm:flex-col gap-1 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-500 transform translate-x-0 sm:translate-x-4 sm:group-hover:translate-x-0">
              {user?.role === "customer" && (
                <>
                  <button
                    onClick={handleWishlist}
                    disabled={wishlistLoading}
                    className={`p-2 sm:p-3 rounded-full backdrop-blur-md transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                      isWishlisted
                        ? "bg-black text-white"
                        : "bg-white/95 text-gray-700 hover:bg-black hover:text-white border border-gray-200"
                    }`}
                  >
                    {wishlistLoading ? (
                      <div className="w-3 h-3 sm:w-4 sm:h-4 animate-spin border border-current border-t-transparent rounded-full" />
                    ) : (
                      <Heart
                        className={`w-3 h-3 sm:w-4 sm:h-4 ${
                          isWishlisted ? "fill-current" : ""
                        }`}
                      />
                    )}
                  </button>
                  <button
                    onClick={handleQuickView}
                    className="p-2 sm:p-3 rounded-full bg-white/95 backdrop-blur-md text-gray-700 hover:bg-black hover:text-white transition-all duration-300 shadow-xl border border-gray-200"
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Image Section */}
            <div className="relative h-32 sm:h-36 lg:h-40 overflow-hidden">
              <img
                src={
                  product.images?.[0] ||
                  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop"
                }
                alt={product.title}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
                  product.images?.[1]
                    ? "group-hover:opacity-0"
                    : "group-hover:opacity-60"
                }`}
              />
              {product.images?.[1] && (
                <img
                  src={product.images[1]}
                  alt={`${product.title} hover`}
                  className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                />
              )}

              {/* Elegant Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Content Section */}
            <div className="p-2 flex-1 flex flex-col">
              {/* Category - Fixed Height */}
              <div className="flex items-center gap-1 mb-1 h-4">
                <Tag className="w-2.5 h-2.5 text-gray-600" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide truncate">
                  {product.category}
                </span>
              </div>

              {/* Title - Fixed Height */}
              <h3 className="font-bold text-black mb-2 line-clamp-2 group-hover:text-gray-800 transition-all duration-300 leading-tight text-xs h-8 overflow-hidden font-body">
                {product.title}
              </h3>

              {/* Price Section */}
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-sm sm:text-base font-black text-black">
                  {formatLKR(product.price)}
                </span>
                {isOnSale() && (
                  <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                    {formatLKR(product.oldPrice)}
                  </span>
                )}
                {isOnSale() && (
                  <span className="text-xs font-bold text-white bg-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                    {Math.round(
                      ((product.oldPrice - product.price) / product.oldPrice) *
                        100
                    )}
                    %
                  </span>
                )}
              </div>

              {/* Product Details Grid */}
              {(product.rating > 0 || product.totalOrders > 0) && (
                <div className={`grid gap-2 mb-1 ${
                  product.rating > 0 && product.totalOrders > 0 ? 'grid-cols-2' : 'grid-cols-1'
                }`}>
                  {/* Rating */}
                  {product.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-2.5 h-2.5 ${
                              i < Math.floor(product.rating)
                                ? "fill-black text-black"
                                : "fill-gray-300 text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-black font-medium">
                        {product.rating}
                      </span>
                    </div>
                  )}
                  
                  {/* Orders */}
                  {product.totalOrders > 0 && (
                    <div className={`${product.rating > 0 ? 'text-right' : 'text-left'}`}>
                      <span className="text-xs text-black font-medium">
                        {product.totalOrders} sold
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Stock Status */}
              <div className="flex justify-center mb-1">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full w-full text-center ${
                    product.stock > 5
                      ? "text-black bg-gray-100"
                      : product.stock > 0
                      ? "text-white bg-gray-600"
                      : "text-white bg-black"
                  }`}
                >
                  {product.stock > 0
                    ? `${product.stock} in stock`
                    : "Out of stock"}
                </span>
              </div>

              {/* Quick View Button */}
              <div className="mt-auto pt-1">
                {product.stock > 0 && (
                  <button
                    onClick={handleQuickView}
                    className="w-full bg-black text-white py-1.5 rounded-lg font-bold transition-all duration-300 hover:bg-gray-800 hover:shadow-xl transform hover:scale-[1.02] text-xs"
                  >
                  <span className="hidden sm:inline">QUICK VIEW</span>
                  <span className="sm:hidden">VIEW</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
      {/* Quick View Modal */}
      {isQuickViewOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-md max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="relative">
              {/* Close Button */}
              <button
                onClick={() => setIsQuickViewOpen(false)}
                className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10 p-2 bg-white/95 backdrop-blur-md rounded-full hover:bg-black hover:text-white transition-all duration-300 border border-gray-200"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Image */}
              <div className="h-48 sm:h-64 overflow-hidden rounded-t-xl sm:rounded-t-2xl">
                <img
                  src={
                    product.images?.[0] ||
                    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop"
                  }
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-widest">
                    {product.category}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4 font-display">
                  {product.title}
                </h2>
                <p className="text-gray-600 mb-4 sm:mb-5 leading-relaxed text-sm sm:text-base font-body">
                  {product.description}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-2 sm:gap-3 mb-4">
                  <span className="text-2xl sm:text-3xl font-black text-black">
                    {formatLKR(product.price)}
                  </span>
                  {isOnSale() && (
                    <span className="text-base sm:text-lg text-gray-400 line-through font-medium">
                      {formatLKR(product.oldPrice)}
                    </span>
                  )}
                </div>

                {/* Product Info Grid */}
                <div className={`grid gap-4 mb-6 p-3 bg-gray-100 rounded-lg grid-cols-${
                  [product.rating > 0, true, product.totalOrders > 0].filter(Boolean).length
                }`}>
                  {product.rating > 0 && (
                    <div className="text-center">
                      <span className="block text-lg font-bold text-black">{product.rating}</span>
                      <span className="text-xs text-gray-700 uppercase tracking-wide">Rating</span>
                    </div>
                  )}
                  <div className="text-center">
                    <span className="block text-lg font-bold text-black">{product.stock || 0}</span>
                    <span className="text-xs text-gray-700 uppercase tracking-wide">Stock</span>
                  </div>
                  {product.totalOrders > 0 && (
                    <div className="text-center">
                      <span className="block text-lg font-bold text-black">{product.totalOrders}</span>
                      <span className="text-xs text-gray-700 uppercase tracking-wide">Sold</span>
                    </div>
                  )}
                </div>

                {/* Rating Stars */}
                {product.rating > 0 && (
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(product.rating)
                              ? "fill-black text-black"
                              : "fill-gray-300 text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-base font-medium text-black">
                      ({product.rating}/5)
                    </span>
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-6 sm:mb-8">
                  <span className="text-sm font-bold text-gray-900">
                    QUANTITY:
                  </span>
                  <div className="flex items-center border-2 border-gray-900 rounded-lg w-fit">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedQuantity(Math.max(1, selectedQuantity - 1))
                      }
                      className="px-3 sm:px-4 py-2 text-gray-900 hover:bg-gray-100 transition-colors font-bold"
                    >
                      −
                    </button>
                    <span className="px-4 sm:px-6 py-2 border-x-2 border-gray-900 bg-gray-50 font-bold min-w-[60px] text-center">
                      {selectedQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedQuantity(
                          Math.min(product.stock, selectedQuantity + 1)
                        )
                      }
                      className="px-3 sm:px-4 py-2 text-gray-900 hover:bg-gray-100 transition-colors font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-black text-white py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold transition-all duration-300 hover:bg-gray-900 hover:shadow-2xl transform hover:scale-[1.02] flex items-center justify-center gap-2 sm:gap-3 tracking-wide text-sm sm:text-base"
                >
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                  ADD TO CART
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductCard;
