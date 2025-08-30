import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "./LoadingSpinner";
import ProductCard from "./ProductCard";
import ServiceCard from "./ServiceCard";

const RecommendationGrid = ({ 
  purchaseData, 
  type = "order", 
  className = "" 
}) => {
  const { addToOrder, addToBookings } = useCart();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("related");
  
  // Add refs for request management
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const debounceTimeoutRef = useRef(null);

  const fetchRecommendations = useCallback(async () => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentRequestId = ++requestIdRef.current;
    
    try {
      
      setLoading(true);
      setError(null); // Clear error immediately when starting new request

      // Determine what to fetch based on the tab and purchase data
      let endpoint = "";
      let params = new URLSearchParams();

      if (selectedTab === "related") {
        // Get items related to what they just purchased
        if (type === "order" && purchaseData.items?.length > 0) {
          // Get related products based on categories of purchased items
          const categories = [...new Set(purchaseData.items.map(item => item.productId?.category).filter(Boolean))];
          endpoint = "/api/products/recommendations";
          params.append("categories", categories.join(","));
          params.append("exclude", purchaseData.items.map(item => item.productId?._id).filter(Boolean).join(","));
        } else if (type === "booking" && purchaseData.serviceId) {
          // Get related services based on category
          endpoint = "/api/services/recommendations";
          params.append("category", purchaseData.serviceId.category);
          params.append("exclude", purchaseData.serviceId._id);
        }
      } else if (selectedTab === "store") {
        // Get more items from the same store
        const storeId = purchaseData.storeId?._id;
        if (storeId) {
          endpoint = type === "order" ? "/api/products" : "/api/services";
          params.append("storeId", storeId);
          params.append("limit", "8");
          if (type === "order" && purchaseData.items?.length > 0) {
            params.append("exclude", purchaseData.items.map(item => item.productId?._id).filter(Boolean).join(","));
          } else if (type === "booking" && purchaseData.serviceId) {
            params.append("exclude", purchaseData.serviceId._id);
          }
        }
      } else if (selectedTab === "popular") {
        // Get popular items
        endpoint = type === "order" ? "/api/products" : "/api/services";
        params.append("sort", "popular");
        params.append("limit", "8");
      }

      if (endpoint) {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}${endpoint}?${params.toString()}`,
          {
            credentials: "include",
            signal: abortControllerRef.current.signal, // Add abort signal
          }
        );

        // Check if this is still the current request
        if (currentRequestId !== requestIdRef.current) {
          return; // Ignore outdated responses
        }

        if (response.ok) {
          const data = await response.json();
          
          // Double-check request is still current after async operation
          if (currentRequestId === requestIdRef.current) {
            // Handle different response formats
            if (Array.isArray(data)) {
              setRecommendations(data.slice(0, 8));
            } else if (data.products) {
              setRecommendations(data.products.slice(0, 8));
            } else if (data.services) {
              setRecommendations(data.services.slice(0, 8));
            } else if (data.data) {
              setRecommendations(data.data.slice(0, 8));
            } else {
              setRecommendations([]);
            }
            setError(null); // Clear any existing error on success
          }
        } else {
          if (currentRequestId === requestIdRef.current) {
            throw new Error(`Failed to fetch recommendations (${response.status})`);
          }
        }
      } else {
        // No endpoint to call - show empty state
        if (currentRequestId === requestIdRef.current) {
          setRecommendations([]);
          setError(null);
        }
      }
    } catch (err) {
      // Only set error if this is still the current request and not aborted
      if (err.name !== 'AbortError' && currentRequestId === requestIdRef.current) {
        console.error("Error fetching recommendations:", err);
        setError("Unable to load recommendations");
        setRecommendations([]);
      }
    } finally {
      // Only set loading false if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [selectedTab, purchaseData, type]);
  
  // Debounced fetch function
  const debouncedFetchRecommendations = useCallback(() => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set a new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      fetchRecommendations();
    }, 150); // 150ms debounce
  }, [fetchRecommendations]);

  useEffect(() => {
    if (purchaseData) {
      debouncedFetchRecommendations();
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [purchaseData, selectedTab, debouncedFetchRecommendations]);

  // Cleanup effect for abort controller
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  


  const getTabIcon = (tab) => {
    switch (tab) {
      case "related": return <Sparkles className="w-4 h-4" />;
      case "store": return <Users className="w-4 h-4" />;
      case "popular": return <TrendingUp className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTabLabel = (tab) => {
    switch (tab) {
      case "related": return "Related Items";
      case "store": return "More from Store";
      case "popular": return "Popular Items";
      default: return tab;
    }
  };

  if (!purchaseData) return null;

  const isProduct = type === "order";
  const tabs = ["related", "store", "popular"];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          You Might Also Like ✨
        </h3>
        <p className="text-gray-600">
          Discover more amazing {isProduct ? "products" : "services"} just for you
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedTab === tab
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {getTabIcon(tab)}
              <span>{getTabLabel(tab)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-gray-600">{error}</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No recommendations available at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendations.map((item) => (
            isProduct ? (
              <ProductCard
                key={item._id}
                product={item}
              />
            ) : (
              <ServiceCard
                key={item._id}
                service={item}
              />
            )
          ))}
        </div>
      )}

      {/* View More Link */}
      {recommendations.length > 0 && (
        <div className="text-center">
          <Link
            to={isProduct ? "/products" : "/services"}
            className="inline-flex items-center space-x-2 text-black hover:text-gray-700 font-medium transition-colors"
          >
            <span>Explore More {isProduct ? "Products" : "Services"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};


export default RecommendationGrid;