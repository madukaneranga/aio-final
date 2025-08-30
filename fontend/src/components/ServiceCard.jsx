import React, { useState, useRef, useEffect } from "react";
import { Calendar, Clock, Star, Heart, Tag, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { formatLKR } from "../utils/currency";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useWishlist } from "../contexts/WishlistContext";
import useImpression from "../hooks/useImpression";

const ServiceCard = ({ service }) => {
  const cardRef = useRef(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const { addToBooking } = useCart();
  const { user } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist, isLoading: wishlistLoading } = useWishlist();
  const { trackServiceImpression, createImpressionObserver } = useImpression();
  
  const isWishlisted = isInWishlist(service._id);

  useEffect(() => {
    const observer = createImpressionObserver((target) => {
      // Track service impression using our new comprehensive system
      trackServiceImpression(service);
      
      // Google Analytics 4 - Service View Event
      if (typeof gtag !== 'undefined') {
        gtag('event', 'view_item', {
          currency: 'LKR',
          value: service.price,
          items: [{
            item_id: service._id,
            item_name: service.title,
            category: service.category,
            price: service.price
          }]
        });
      }

      // Microsoft Clarity - Service View Event
      if (typeof clarity !== 'undefined') {
        clarity('event', 'service_view', {
          service_id: service._id,
          service_name: service.title,
          category: service.category,
          price: service.price,
          duration: service.duration
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
  }, [service._id, trackServiceImpression, createImpressionObserver, service]);

  const isNew = () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return new Date(service.createdAt) > sevenDaysAgo;
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
        await removeFromWishlist(service._id);
      } else {
        await addToWishlist(service);
      }
    } catch (error) {
      console.error('Wishlist error:', error);
    }
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const handleViewService = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(false);
    // Navigate to service detail page
    window.location.href = `/service/${service._id}`;
  };

  return (
    <>
      <Link to={`/service/${service._id}`} className="block">
        <div className="relative w-full" ref={cardRef}>
          {/* Service Card */}

          <div className="group relative bg-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-200 hover:border-black transform hover:-translate-y-1 sm:hover:-translate-y-2 w-full h-full flex flex-col">
            {/* Badges */}
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20 flex flex-col gap-1 sm:gap-2">
              {isNew() && (
                <span className="bg-black text-white text-xs font-bold px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-sm tracking-wider">
                  NEW
                </span>
              )}
              {/* Price Type Badge */}
              <span className="bg-black text-white text-xs font-bold px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-sm tracking-wider uppercase">
                {service.priceType}
              </span>
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
                        : "bg-white/95 text-black hover:bg-black hover:text-white border border-black"
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
                    className="p-2 sm:p-3 rounded-full bg-white/95 backdrop-blur-md text-black hover:bg-black hover:text-white transition-all duration-300 shadow-xl border border-black"
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
                  service.images?.[0] ||
                  "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop"
                }
                alt={service.title}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
                  service.images?.[1]
                    ? "group-hover:opacity-0"
                    : "group-hover:opacity-60"
                }`}
              />
              {service.images?.[1] && (
                <img
                  src={service.images[1]}
                  alt={`${service.title} hover`}
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
                  {service.category}
                </span>
              </div>

              {/* Title - Fixed Height */}
              <h3 className="font-bold text-black mb-2 line-clamp-2 group-hover:text-gray-800 transition-all duration-300 leading-tight text-xs h-8 overflow-hidden font-body">
                {service.title}
              </h3>

              {/* Price Section */}
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-sm sm:text-base font-black text-black">
                  {formatLKR(service.price)}
                </span>
                {service.priceType === "hourly" && (
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    /HOUR
                  </span>
                )}
              </div>

              {/* Service Details Grid */}
              {(service.rating > 0 || service.totalBookings > 0) && (
                <div className={`grid gap-2 mb-1 ${
                  service.rating > 0 && service.totalBookings > 0 ? 'grid-cols-2' : 'grid-cols-1'
                }`}>
                  {/* Rating */}
                  {service.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-2.5 h-2.5 ${
                              i < Math.floor(service.rating)
                                ? "fill-black text-black"
                                : "fill-gray-300 text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-black font-medium">
                        {service.rating}
                      </span>
                    </div>
                  )}
                  
                  {/* Bookings */}
                  {service.totalBookings > 0 && (
                    <div className={`${service.rating > 0 ? 'text-right' : 'text-left'}`}>
                      <span className="text-xs text-black font-medium">
                        {service.totalBookings} booked
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Duration */}
              <div className="flex justify-center mb-1">
                <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-black w-full justify-center">
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    {service.duration} minutes
                  </span>
                  <span className="sm:hidden">{service.duration}m</span>
                </div>
              </div>

              {/* Quick View Button - Always at bottom */}
              <div className="mt-auto pt-1">
                {user && (
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
                    service.images?.[0] ||
                    "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop"
                  }
                  alt={service.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-widest">
                    {service.category}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4 font-display">
                  {service.title}
                </h2>
                <p className="text-gray-600 mb-4 sm:mb-5 leading-relaxed text-sm sm:text-base font-body">
                  {service.description}
                </p>

                {/* Price & Duration */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-black">
                      {formatLKR(service.price)}
                    </span>
                    {service.priceType === "hourly" && (
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                        /HOUR
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-gray-100 px-3 py-2 rounded-full">
                    <Clock className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black">
                      {service.duration} min
                    </span>
                  </div>
                </div>

                {/* Service Info Grid */}
                <div className={`grid gap-4 mb-6 p-3 bg-gray-100 rounded-lg grid-cols-${
                  [service.rating > 0, true, service.totalBookings > 0].filter(Boolean).length
                }`}>
                  {service.rating > 0 && (
                    <div className="text-center">
                      <span className="block text-lg font-bold text-black">{service.rating}</span>
                      <span className="text-xs text-gray-700 uppercase tracking-wide">Rating</span>
                    </div>
                  )}
                  <div className="text-center">
                    <span className="block text-lg font-bold text-black">{service.duration || 0}</span>
                    <span className="text-xs text-gray-700 uppercase tracking-wide">Minutes</span>
                  </div>
                  {service.totalBookings > 0 && (
                    <div className="text-center">
                      <span className="block text-lg font-bold text-black">{service.totalBookings}</span>
                      <span className="text-xs text-gray-700 uppercase tracking-wide">Booked</span>
                    </div>
                  )}
                </div>

                {/* Rating Stars */}
                {service.rating > 0 && (
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(service.rating)
                              ? "fill-black text-black"
                              : "fill-gray-300 text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-base font-medium text-black">
                      ({service.rating}/5)
                    </span>
                  </div>
                )}

                {/* View Service Button */}
                <button
                  onClick={handleViewService}
                  className="w-full bg-black text-white py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold transition-all duration-300 hover:bg-gray-800 hover:shadow-2xl transform hover:scale-[1.02] flex items-center justify-center gap-2 sm:gap-3 tracking-wide text-sm sm:text-base"
                >
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  VIEW SERVICE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServiceCard;
