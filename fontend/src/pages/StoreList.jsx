import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import StoreCard from "../components/StoreCard";
import SearchFilters from "../components/SearchFilters";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { Store } from "lucide-react";

const StoreList = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStores({}); // No filters on initial load
  }, []);

  const fetchStores = async (filters = {}) => {
    try {
      setLoading(true);
      setError("");

      const validFilters =
        typeof filters === "object" && filters !== null ? filters : {};

      console.log("Valid Filters:", validFilters);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/stores/listing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validFilters),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStores(data);
      } else {
        setError("Failed to fetch stores");
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (filters) => {
    fetchStores(filters);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">All Stores</h1>

          <SearchFilters
            onSearch={handleSearch}
            placeholder="Search stores..."
            showPriceFilter={false}
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
            {stores.length} store{stores.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {stores.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No stores found"
            description="Try adjusting your search criteria or check back later for new stores."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <StoreCard key={store._id} store={store} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreList;
