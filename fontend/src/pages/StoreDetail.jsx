import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ProductCard from "../components/ProductCard";
import ServiceCard from "../components/ServiceCard";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Star, ArrowLeft } from "lucide-react";
import StoreHero from "../components/StoreHero";
import StoreInfo from "../components/StoreInfo";
import ChatPopup from '../components/Chat/ChatPopup';
import { set } from "mongoose";

const StoreDetail = () => {
  const viewUpdateAttempted = useRef(new Set());
  const { user } = useAuth();
  const { id } = useParams();
  const [storeData, setStoreData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followData, setFollowData] = useState({
    isFollowing: false,
    isOwnStore: false,
  });

  // Data fetching effect
  useEffect(() => {
    const loadAllData = async () => {
      if (!id) return;

      setLoading(true);
      try {
        await Promise.all([
          fetchStoreData(),
          fetchReviews(),
          fetchFollowData(),
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [id]);

  const handleExploreClick = () => {
    itemsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    console.log("Explore button clicked");
  };
  const handleContactClick = () => {
    contactRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  const itemsRef = useRef(null);
  const contactRef = useRef(null);

  // View tracking effect - separate and idempotent
  useEffect(() => {
    if (!id || viewUpdateAttempted.current.has(id)) return;

    const updateViews = async () => {
      try {
        viewUpdateAttempted.current.add(id);
        await fetch(`${import.meta.env.VITE_API_URL}/api/stores/${id}/views`, {
          method: "PATCH",
        });
      } catch (error) {
        console.error("Error updating views:", error);
        viewUpdateAttempted.current.delete(id);
      }
    };

    const timeoutId = setTimeout(updateViews, 100);
    return () => clearTimeout(timeoutId);
  }, [id]);

  const handleFollowChange = (newFollowStatus, newFollowersCount) => {
    setStoreData((prev) => ({
      ...prev,
      isFollowing: newFollowStatus,
      stats: {
        ...prev.stats,
        followersCount: newFollowersCount,
      },
    }));
    setFollowData((prev) => ({
      ...prev,
      isFollowing: newFollowStatus,
    }));
  };

  const fetchFollowData = async () => {
    try {
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        console.log("No token found - user not logged in");
        setFollowData({ isFollowing: false, isOwnStore: false });
        return;
      }

      const url = `${
        import.meta.env.VITE_API_URL
      }/api/stores/${id}/follow-check`;

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch follow data: ${response.status}`);
      }

      const data = await response.json();
      setFollowData(data); // { isFollowing: true/false, isOwnStore: true/false }
    } catch (error) {
      console.error("Error fetching follow data:", error);
      setError("Failed to load follow data");
      // Set defaults on error
      setFollowData({ isFollowing: false, isOwnStore: false });
    }
  };
  const fetchStoreData = async () => {
    try {
      setError("");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/stores/${id}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch store: ${response.status}`);
      }

      const data = await response.json();
      setStoreData(data);
    } catch (error) {
      console.error("Error fetching store data:", error);
      setError("Failed to load store data");
    }
  };

  const fetchReviews = async () => {
    try {
      setError("");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/reviews/store/${id}`
      );
      if (response.ok) {
        const data = await response.json();
        setReviews(data || []);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setReviews([]);
    }
  };

  const maskCustomerName = (name) => {
    if (!name || name.length <= 2) return name;
    return (
      name.charAt(0) +
      "*".repeat(name.length - 2) +
      name.charAt(name.length - 1)
    );
  };

  const getThemeStyles = (themeColor) => {
    if (!themeColor) return { backgroundColor: "#000000", color: "#ffffff" };

    // Handle hex colors
    if (themeColor.startsWith("#")) {
      const isLight = isLightColor(themeColor);
      return {
        backgroundColor: themeColor,
        color: isLight ? "#000000" : "#ffffff",
      };
    }

    // Default to black
    return { backgroundColor: "#000000", color: "#ffffff" };
  };

  const isLightColor = (color) => {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error || "Store not found"}
          </h2>
          <Link to="/" className="text-black hover:text-gray-700">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { store, listings = [] } = storeData;

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Store not found
          </h2>
          <Link to="/" className="text-black hover:text-gray-700">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const defaultImages = [
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1560472354-b43ff0c44a43?w=1200&h=400&fit=crop",
  ];

  const heroImages =
    store.heroImages && store.heroImages.length > 0
      ? store.heroImages
      : defaultImages;
  const themeStyles = getThemeStyles(store.themeColor);
  const isLightTheme = isLightColor(store.themeColor || "#000000");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/"
            className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <StoreHero
        store={store}
        user={user}
        reviews={reviews}
        onExploreClick={handleExploreClick}
        onContactClick={handleContactClick}
      />

      {/* Store Info */}
      <div ref={contactRef}>
        <StoreInfo
          followData={followData}
          setFollowData={setFollowData}
          store={store}
          user={user}
          reviews={reviews}
          onFollowChange={handleFollowChange}
        />
      </div>

      {/* Listings */}
      <div className="py-16 bg-white" ref={itemsRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              {store.type === "product" ? "Our Products" : "Our Services"}
            </h2>
            <p className="text-gray-600">
              {listings.length}{" "}
              {store.type === "product" ? "products" : "services"} available
            </p>
          </div>

          {listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">
                No {store.type === "product" ? "products" : "services"}{" "}
                available yet
              </p>
              <p className="mt-2 text-gray-400">
                Check back later for new listings
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((item) =>
                store.type === "product" ? (
                  <ProductCard key={item._id} product={item} />
                ) : (
                  <ServiceCard key={item._id} service={item} />
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Customer Reviews
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(store.rating || 0)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-semibold">
                  {store.rating || 0}
                </span>
                <span className="text-gray-600">
                  ({reviews.length} reviews)
                </span>
              </div>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Reviews Yet
              </h3>
              <p className="text-gray-600">
                Be the first to review this store!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Review Summary */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Review Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 mb-2">
                        {store.rating || 0}
                      </div>
                      <div className="flex justify-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.floor(store.rating || 0)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-600">
                        {reviews.length} total reviews
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviews.filter(
                        (r) => r.rating === rating
                      ).length;
                      const percentage =
                        reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div
                          key={rating}
                          className="flex items-center space-x-2"
                        >
                          <span className="text-sm w-8">{rating}★</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-8">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Individual Reviews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <div
                    key={review._id}
                    className="bg-white rounded-lg shadow-sm p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {maskCustomerName(
                            review.customerId?.name || "Anonymous"
                          )}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {review.orderId && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Product Order
                          </span>
                        )}
                        {review.bookingId && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Service Booking
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4">{review.comment}</p>

                    {review.response && (
                      <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-black">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Store Response
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(
                              review.response.respondedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700">
                          {review.response.message}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {user && user.role === 'customer' && (
        <ChatPopup
          storeId={store._id}
          position="bottom-left"
          user={user}
        />
      )}
    </div>
  );
};

export default StoreDetail;
