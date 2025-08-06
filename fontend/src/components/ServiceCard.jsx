import React, { useState } from "react";
import { Calendar, Clock, Star, Heart, Tag, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { formatLKR } from "../utils/currency";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";

const ServiceCard = ({ service }) => {
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addToBooking } = useCart();
  const { user } = useAuth();

  const isNew = () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return new Date(service.createdAt) > sevenDaysAgo;
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

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.role !== "customer") {
      alert("Only customers can add items to cart");
      return;
    }
    // Ensure we pass the product with proper storeId
    const serviceWithStoreId = {
      ...service,
      storeId: service.storeId?._id || service.storeId,
    };
    console.log("Added to cart:", {
      service: service._id,
    });

    setIsQuickViewOpen(false);
    addToBooking(serviceWithStoreId);
  };

  return (
    <>
      <Link to={`/service/${service._id}`} className="block">
        <div className="relative w-full">
          {/* Service Card */}

          <div className="group relative bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-black transform hover:-translate-y-1 sm:hover:-translate-y-2 w-full max-w-xs mx-auto">
            {/* Badges */}
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20 flex flex-col gap-1 sm:gap-2">
              {isNew() && (
                <span className="bg-black text-white text-xs font-bold px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-sm tracking-wider">
                  NEW
                </span>
              )}
              {/* Price Type Badge */}
              <span className="bg-gray-900 text-white text-xs font-bold px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-sm tracking-wider uppercase">
                {service.priceType}
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
            <div className="relative h-44 sm:h-52 lg:h-56 overflow-hidden">
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
            <div className="p-3 sm:p-4">
              {/* Category */}
              <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  {service.category}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-black transition-all duration-300 leading-tight text-sm sm:text-base">
                {service.title}
              </h3>

              {/* Description - Hidden on mobile */}
              <p className="hidden sm:block text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                {service.description}
              </p>

              {/* Price Section */}
              <div className="flex items-baseline gap-2 mb-2 sm:mb-3">
                <span className="text-base sm:text-lg font-black text-black">
                  {formatLKR(service.price)}
                </span>
                {service.priceType === "hourly" && (
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    /HOUR
                  </span>
                )}
              </div>

              {/* Rating & Duration */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(service.rating)
                            ? "fill-gray-900 text-gray-900"
                            : "fill-gray-300 text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 ml-1 sm:ml-2 font-medium">
                    ({service.rating || 0})
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gray-100 text-black">
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    {service.duration} MIN
                  </span>
                  <span className="sm:hidden">{service.duration}m</span>
                </div>
              </div>

              {/* Quick View Button */}
              {user && (
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

                <h2 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">
                  {service.title}
                </h2>
                <p className="text-gray-600 mb-4 sm:mb-5 leading-relaxed text-sm sm:text-base">
                  {service.description}
                </p>

                {/* Price & Duration */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
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
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-bold text-gray-900">
                      {service.duration} MIN
                    </span>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-6 sm:mb-8">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(service.rating)
                            ? "fill-gray-900 text-gray-900"
                            : "fill-gray-300 text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-base font-medium text-gray-600">
                    {service.rating || 0}
                  </span>
                </div>

                {/* Book Service Button */}
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-black text-white py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold transition-all duration-300 hover:bg-gray-900 hover:shadow-2xl transform hover:scale-[1.02] flex items-center justify-center gap-2 sm:gap-3 tracking-wide text-sm sm:text-base"
                >
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  BOOK SERVICE
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
