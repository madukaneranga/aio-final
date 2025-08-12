import React, { useState, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import StoreListing from "../components/StoreListing";
import FiltersSidebar from "../components/FilterSidebar";

const Stores = () => {
  // Store data state
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search filters state (simplified for stores - no categories, no price filter)
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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

  const handleSearch = (e) => {
    e?.preventDefault?.();

    const filters = {
      search: searchQuery,
    };

    fetchStores(filters);
  };

  const clearFilters = () => {
    setSearchQuery("");
    fetchStores({});
  };

  const hasActiveFilters = Boolean(searchQuery);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">All Stores</h1>

          {/* Search Filters */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="Search stores..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <button
                type="button"
                onClick={handleSearch}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Search
              </button>

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  hasActiveFilters
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
                {hasActiveFilters && (
                  <span className="bg-white text-black text-xs px-1.5 py-0.5 rounded-full">
                    1
                  </span>
                )}
              </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Filters</h3>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Clear all</span>
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Store Search
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter store name, location, or owner..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSearch}
                  className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stores Content */}
      <StoreListing
        stores={stores}
        loading={loading}
        error={error}
      />
    </div>
  );
};

export default Stores;