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
import { formatLKR } from "../utils/currency";

const ProductCard = ({ product }) => {
  const cardRef = useRef(null);
  const { addToOrder } = useCart();
  const { user } = useAuth();

  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Send impression
            fetch(`${import.meta.env.VITE_API_URL}/api/products/impression`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId: product._id }),
            }).catch((err) => console.error("Impression error:", err));

            observer.unobserve(entry.target); // stop observing after first impression
          }
        });
      },
      { threshold: 0.5 } // 50% of the card visible = impression
    );

    if (cardRef.current) observer.observe(cardRef.current);

    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, [product._id]);

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

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  return (
    <>
      <Link to={`/product/${product._id}`} className="block">
        <div className="relative w-full" ref={cardRef}>
          {/* Product Card */}
          <div className="group relative bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-black transform hover:-translate-y-1 sm:hover:-translate-y-2 w-full max-w-xs mx-auto">
            {/* Badges */}
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20 flex flex-col gap-1 sm:gap-2">
              {isNew() && (
                <span className="bg-black text-white text-xs font-bold px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-sm tracking-wider">
                  NEW
                </span>
              )}
              {isOnSale() && (
                <span className="bg-gray-900 text-white text-xs font-bold px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-sm tracking-wider">
                  SALE
                </span>
              )}
              {isLowStock() && (
                <span className="bg-gray-600 text-white text-xs font-bold px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1 tracking-wider">
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
                    className={`p-2 sm:p-3 rounded-full backdrop-blur-md transition-all duration-300 shadow-xl ${
                      isWishlisted
                        ? "bg-black text-white"
                        : "bg-white/95 text-gray-700 hover:bg-black hover:text-white border border-gray-200"
                    }`}
                  >
                    <Heart
                      className={`w-3 h-3 sm:w-4 sm:h-4 ${
                        isWishlisted ? "fill-current" : ""
                      }`}
                    />
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
            <div className="relative h-44 sm:h-52 lg:h-56 overflow-hidden">
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
            <div className="p-3 sm:p-4">
              {/* Category */}
              <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  {product.category}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-black transition-all duration-300 leading-tight text-sm sm:text-base">
                {product.title.length > 35
                  ? `${product.title.slice(0, 35)}...`
                  : product.title}
              </h3>

              {/* Price Section */}
              <div className="flex items-baseline gap-2 mb-2 sm:mb-3">
                <span className="text-base sm:text-lg font-black text-black">
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

              {/* Rating & Stock */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.rating)
                            ? "fill-gray-900 text-gray-900"
                            : "fill-gray-300 text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 ml-1 sm:ml-2 font-medium">
                    ({product.rating || 0})
                  </span>
                </div>

                <span
                  className={`text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${
                    product.stock > 5
                      ? "text-black bg-gray-100"
                      : product.stock > 0
                      ? "text-white bg-gray-600"
                      : "text-white bg-black"
                  }`}
                >
                  <span className="hidden sm:inline">
                    {product.stock > 0
                      ? `${product.stock} LEFT`
                      : "OUT OF STOCK"}
                  </span>
                  <span className="sm:hidden">
                    {product.stock > 0 ? `${product.stock}` : "OUT"}
                  </span>
                </span>
              </div>

              {/* Quick View Button */}
              {product.stock > 0 && (
                <button
                  onClick={handleQuickView}
                  className="w-full bg-black text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all duration-300 hover:bg-gray-900 hover:shadow-2xl transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-gray-300 tracking-wide text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">QUICK VIEW</span>
                  <span className="sm:hidden">VIEW</span>
                </button>
              )}
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

                <h2 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">
                  {product.title}
                </h2>
                <p className="text-gray-600 mb-4 sm:mb-5 leading-relaxed text-sm sm:text-base">
                  {product.description}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <span className="text-2xl sm:text-3xl font-black text-black">
                    {formatLKR(product.price)}
                  </span>
                  {isOnSale() && (
                    <span className="text-base sm:text-lg text-gray-400 line-through font-medium">
                      {formatLKR(product.oldPrice)}
                    </span>
                  )}
                </div>

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

                {/* Rating */}
                <div className="flex items-center gap-2 mb-6 sm:mb-8">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.rating)
                            ? "fill-gray-900 text-gray-900"
                            : "fill-gray-300 text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-base font-medium text-gray-600">
                    {product.rating || 0}
                  </span>
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
