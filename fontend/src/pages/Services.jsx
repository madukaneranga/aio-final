import React, { useState, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import ServiceListing from "../components/ServiceListing";

const Services = () => {
  // Service data state
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);

  // Search filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedChildCategory, setSelectedChildCategory] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [showFilters, setShowFilters] = useState(false);

  const selectedCategoryObj = categories.find(
    (cat) => cat._id === selectedCategoryId
  );
  const subcategories = selectedCategoryObj?.subcategories || [];
  const childCategories =
    subcategories.find((sub) => sub.name === selectedSubcategory)
      ?.childCategories || [];

  useEffect(() => {
    fetchServices(); // No filters on initial load
  }, []);

  const fetchServices = async (filters = {}) => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/services/listing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(filters),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setServices(data);
      } else {
        setError("Failed to fetch services");
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault?.();

    const filters = {
      search: searchQuery,
      categoryId: selectedCategoryId,
      category: selectedCategory,
      subcategory: selectedSubcategory,
      childCategory: selectedChildCategory,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
    };

    fetchServices(filters);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategoryId("");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedChildCategory("");
    setPriceRange({ min: "", max: "" });
    fetchServices({});
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
      selectedCategoryId ||
      selectedSubcategory ||
      selectedChildCategory ||
      priceRange.min ||
      priceRange.max
  );

  // TODO: Replace this with your CategoryTreeMenu logic
  const CategoryTreeMenuLogic = () => {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categories
        </label>
        <select
          value={selectedCategoryId}
          onChange={(e) => {
            const categoryId = e.target.value;
            const category = categories.find(cat => cat._id === categoryId);
            setSelectedCategoryId(categoryId);
            setSelectedCategory(category?.name || "");
            setSelectedSubcategory("");
            setSelectedChildCategory("");
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>
        
        {subcategories.length > 0 && (
          <select
            value={selectedSubcategory}
            onChange={(e) => {
              setSelectedSubcategory(e.target.value);
              setSelectedChildCategory("");
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2"
          >
            <option value="">All Subcategories</option>
            {subcategories.map((sub) => (
              <option key={sub.name} value={sub.name}>
                {sub.name}
              </option>
            ))}
          </select>
        )}
        
        {childCategories.length > 0 && (
          <select
            value={selectedChildCategory}
            onChange={(e) => setSelectedChildCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2"
          >
            <option value="">All Child Categories</option>
            {childCategories.map((child) => (
              <option key={child.name} value={child.name}>
                {child.name}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Services</h1>

          {/* Search Filters */}
          <div className="space-y-4">
            {/* Breadcrumb */}
            {(selectedCategoryId ||
              selectedSubcategory ||
              selectedChildCategory) && (
              <nav
                aria-label="breadcrumb"
                className="text-sm text-gray-600 mt-2 select-none"
              >
                <ol className="list-reset flex space-x-2">
                  {selectedCategory && (
                    <li>
                      {categories.find(
                        (c) => c.name.toString() === selectedCategory
                      )?.name || "Category"}
                    </li>
                  )}
                  {selectedSubcategory && (
                    <>
                      <li>→</li>
                      <li>{selectedSubcategory}</li>
                    </>
                  )}
                  {selectedChildCategory && (
                    <>
                      <li>→</li>
                      <li>{selectedChildCategory}</li>
                    </>
                  )}
                </ol>
              </nav>
            )}

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
                  placeholder="Search services..."
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
                    {
                      [
                        searchQuery,
                        selectedCategoryId,
                        selectedSubcategory,
                        selectedChildCategory,
                        priceRange.min,
                        priceRange.max,
                      ].filter(Boolean).length
                    }
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
                  <CategoryTreeMenuLogic />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={priceRange.min}
                        min="0"
                        onBlur={() => {
                          if (+priceRange.min < 0)
                            setPriceRange((pr) => ({ ...pr, min: "0" }));
                          if (+priceRange.max < 0)
                            setPriceRange((pr) => ({ ...pr, max: "0" }));
                          if (+priceRange.min > +priceRange.max) {
                            // Maybe show warning or auto-correct
                          }
                        }}
                        onChange={(e) =>
                          setPriceRange({ ...priceRange, min: e.target.value })
                        }
                        placeholder="Min"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                      />
                      <input
                        type="number"
                        value={priceRange.max}
                        onChange={(e) =>
                          setPriceRange({ ...priceRange, max: e.target.value })
                        }
                        placeholder="Max"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
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

      {/* Services Content */}
      <ServiceListing
        services={services}
        loading={loading}
        error={error}
      />
    </div>
  );
};

export default Services;