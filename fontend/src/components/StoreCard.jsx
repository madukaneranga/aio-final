import React, { useState, useEffect, useRef } from "react";
import {
  Star,
  Store,
  Heart,
  Eye,
  User,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import useImpression from "../hooks/useImpression";

const StoreCard = ({ store }) => {
  const cardRef = useRef(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const { user } = useAuth();
  const { trackStoreImpression, createImpressionObserver } = useImpression();

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stores/${store._id}/item-count`);
        const data = await response.json();
        // Fix: Extract the count property from the response object
        setProductCount(data.count);
      } catch (err) {
        console.error("Error fetching product count", err);
        setProductCount(0); // Set fallback value on error
      }
    };

    fetchCount();
  }, [store._id]);

  // Impression tracking
  useEffect(() => {
    const observer = createImpressionObserver((target) => {
      // Track store impression using our new system
      trackStoreImpression(store);
    }, { 
      threshold: 0.5, // 50% of the card visible = impression
      rootMargin: '0px'
    });

    if (cardRef.current) observer.observe(cardRef.current);

    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, [store._id, trackStoreImpression, createImpressionObserver]);

  const isNew = () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return new Date(store.createdAt) > sevenDaysAgo;
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  return (
    <>
      <Link to={`/store/${store._id}`} className="block">
        <div className="relative w-full">
          {/* Store Card */}
          <div ref={cardRef} className="group relative bg-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-black transform hover:-translate-y-1 sm:hover:-translate-y-2 w-full">
            {/* Badges */}
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20 flex flex-col gap-1 sm:gap-2">
              {isNew() && (
                <span className="bg-black text-white text-xs font-bold px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-sm tracking-wider">
                  NEW
                </span>
              )}
              {/* Store Type Badge */}
              <span className="bg-gray-900 text-white text-xs font-bold px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-sm tracking-wider uppercase flex items-center gap-1">
                <Store className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">{store.type}</span>
                <span className="sm:hidden">
                  {store.type.charAt(0).toUpperCase()}
                </span>
              </span>
            </div>

            {/* Status Badge */}
            <div className="absolute top-2 sm:top-3 right-12 sm:right-16 z-20">
              <span
                className={`text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-sm ${
                  store.isActive
                    ? "bg-green-600 text-white"
                    : "bg-gray-600 text-white"
                }`}
              >
                <span className="hidden sm:inline">
                  {store.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
                <span className="sm:hidden">●</span>
              </span>
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
            <div className="relative h-32 sm:h-36 lg:h-40 overflow-hidden">
              <img
                src={
                  store.heroImages?.[0] ||
                  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop"
                }
                alt={store.name}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
                  store.heroImages?.[1]
                    ? "group-hover:opacity-0"
                    : "group-hover:opacity-60"
                }`}
              />
              {store.heroImages?.[1] && (
                <img
                  src={store.heroImages[1]}
                  alt={`${store.name} hero`}
                  className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                />
              )}

              {/* Elegant Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Content Section */}
            <div className="p-2 sm:p-3">
              {/* Store Name */}
              <h3 className="font-bold text-gray-900 mb-1.5 line-clamp-2 group-hover:text-black transition-all duration-300 leading-tight text-xs sm:text-sm">
                {store.name.length > 30
                  ? `${store.name.slice(0, 30)}...`
                  : store.name}
              </h3>

              {/* Rating & Sales */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.floor(store.rating)
                            ? "fill-gray-900 text-gray-900"
                            : "fill-gray-300 text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-600 ml-1 font-medium">
                    ({store.rating})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gray-100 text-black">
                  <TrendingUp className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    {store.totalSales} SALES
                  </span>
                  <span className="sm:hidden">{store.totalSales}</span>
                </div>
              </div>

              {/* Owner & Location */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  <span className="font-medium">
                    {store.ownerId?.name || "Store Owner"}
                  </span>
                </div>
                {store.location && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span className="hidden sm:inline">{store.location}</span>
                    <span className="sm:hidden">📍</span>
                  </div>
                )}
              </div>

              {/* Quick View Button */}
              {user && store.isActive && (
                <button
                  onClick={handleQuickView}
                  className="w-full bg-black text-white py-1.5 sm:py-2 rounded-lg font-bold transition-all duration-300 hover:bg-gray-900 hover:shadow-2xl transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-gray-300 tracking-wide text-xs"
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
                    store.heroImages?.[0] ||
                    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop"
                  }
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-widest">
                    {store.type}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ml-auto ${
                      store.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {store.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">
                  {store.name}
                </h2>
                <p className="text-gray-600 mb-4 sm:mb-5 leading-relaxed text-sm sm:text-base">
                  {store.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 sm:mb-6">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-lg sm:text-xl font-bold text-black">
                      {productCount || 0}
                    </div>
                    <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                      Products
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-lg sm:text-xl font-bold text-black">
                      {store.totalSales}
                    </div>
                    <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                      Sales
                    </div>
                  </div>
                </div>

                {/* Rating & Owner */}
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(store.rating)
                              ? "fill-gray-900 text-gray-900"
                              : "fill-gray-300 text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-base font-medium text-gray-600">
                      ({store.rating})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{store.ownerId?.name}</span>
                  </div>
                </div>

                {/* Visit Store Button */}
                {store.isActive && (
                  <Link to={`/store/${store._id}`}>
                    <button className="w-full bg-black text-white py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold transition-all duration-300 hover:bg-gray-900 hover:shadow-2xl transform hover:scale-[1.02] flex items-center justify-center gap-2 sm:gap-3 tracking-wide text-sm sm:text-base">
                      <Store className="w-4 h-4 sm:w-5 sm:h-5" />
                      VISIT STORE
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StoreCard;
