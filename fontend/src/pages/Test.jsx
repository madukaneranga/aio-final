// ============ PRODUCTS.JSX (WITH ELEGANT PAGINATION) ============
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Search, Filter, X, ChevronDown, Sparkles } from "lucide-react";
import ServiceListing from "../components/ServiceListing";
import ServicesFiltersSidebar from "../components/ServicesFiltersSidebar";

// Custom debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Custom intersection observer hook for infinite scroll
const useIntersectionObserver = (callback, options = {}) => {
  const targetRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: "100px",
      ...options,
    });

    const currentTarget = targetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [callback, options]);

  return targetRef;
};

const Services = () => {
  // URL parameter hooks
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Service data state
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalServices, setTotalServices] = useState(0);
  const [hasMoreServices, setHasMoreServices] = useState(true);
  const PRODUCTS_PER_PAGE = 20;

  // Unified filters state
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    subcategory: "",
    childCategory: "",
    priceRange: { min: "", max: "" },
    stock: "",
    rating: "",
    shipping: "",
    condition: "",
    warrantyMonths: "",
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);

  // Debounced filters for API calls
  const debouncedFilters = useDebounce(filters, 300);

  // Derived state for backwards compatibility
  const selectedCategoryObj = categories.find(
    (cat) => cat.name === filters.category
  );
  const subcategories = selectedCategoryObj?.subcategories || [];
  const childCategories =
    subcategories.find((sub) => sub.name === filters.subcategory)
      ?.childCategories || [];

  // Read URL parameters and set initial state
  useEffect(() => {
    const searchFromUrl = searchParams.get("search");

    console.log("=== URL PARAMS DEBUG ===");
    console.log("Current URL:", location.pathname + location.search);
    console.log("Search from URL:", searchFromUrl);
    console.log("All URL params:", Object.fromEntries(searchParams.entries()));

    // Set state from URL parameters
    if (searchFromUrl) {
      setFilters((prev) => ({
        ...prev,
        search: searchFromUrl,
      }));
    }
  }, [searchParams, location]);

  // Fetch services function with pagination
  const fetchServices = async (
    searchFilters = {},
    page = 1,
    append = false
  ) => {
    try {
      if (!append) {
        setLoading(true);
        setServices([]);
      } else {
        setLoadingMore(true);
      }
      setError("");

      console.log(
        "Fetching services with filters:",
        searchFilters,
        "Page:",
        page
      );

      // Convert filters to API format
      const apiFilters = {
        search: searchFilters.search || "",
        category: searchFilters.category || "",
        subcategory: searchFilters.subcategory || "",
        childCategory: searchFilters.childCategory || "",
        minPrice: searchFilters.priceRange?.min || "",
        maxPrice: searchFilters.priceRange?.max || "",
        stock: searchFilters.stock || "",
        rating: searchFilters.rating || "",
        shipping: searchFilters.shipping || "",
        condition: searchFilters.condition || "",
        warrantyMonths: searchFilters.warrantyMonths || "",
        page: page,
        limit: PRODUCTS_PER_PAGE,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/services/listing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiFilters),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(
          "Services fetched:",
          data.services.length,
          "items",
          "Total:",
          data.total
        );

        if (append) {
          setServices((prev) => [...prev, ...data.services]);
        } else {
          setServices(data.services);
        }

        setTotalServices(data.total);
        setHasMoreServices(
          data.services.length === PRODUCTS_PER_PAGE && data.hasMore
        );
        setCurrentPage(page);
      } else {
        setError("Failed to fetch services");
        console.error("API Error:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more services
  const loadMoreServices = useCallback(() => {
    if (!loadingMore && hasMoreServices && !loading) {
      const nextPage = currentPage + 1;
      fetchServices(debouncedFilters, nextPage, true);
    }
  }, [loadingMore, hasMoreServices, loading, currentPage, debouncedFilters]);

  // Intersection observer for infinite scroll
  const loadMoreRef = useIntersectionObserver(
    useCallback(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadMoreServices();
        }
      },
      [loadMoreServices]
    )
  );

  // Auto-fetch services when debounced filters change (reset to page 1)
  useEffect(() => {
    setCurrentPage(1);
    fetchServices(debouncedFilters, 1, false);
  }, [debouncedFilters]);

  // Load categories
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

  // Filter update functions
  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };

      // Auto-clear dependent filters
      if (key === "category") {
        newFilters.subcategory = "";
        newFilters.childCategory = "";
      } else if (key === "subcategory") {
        newFilters.childCategory = "";
      }

      return newFilters;
    });
  }, []);

  const updateFilters = useCallback((updates) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      search: "",
      category: "",
      subcategory: "",
      childCategory: "",
      priceRange: { min: "", max: "" },
      stock: "",
      rating: "",
      shipping: "",
      condition: "",
      warrantyMonths: "",
    });
  }, []);

  // Manual search handler (for search form)
  const handleSearch = (e) => {
    e?.preventDefault?.();

    // Force immediate search without debounce
    fetchServices(filters, 1, false);
  };

  // Check for active filters
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.category ||
      filters.subcategory ||
      filters.childCategory ||
      filters.priceRange.min ||
      filters.priceRange.max ||
      filters.stock ||
      filters.rating ||
      filters.shipping ||
      filters.condition ||
      filters.warrantyMonths
  );

  const activeFiltersCount = [
    filters.search,
    filters.category,
    filters.subcategory,
    filters.childCategory,
    filters.priceRange.min,
    filters.priceRange.max,
    filters.stock,
    filters.rating,
    filters.shipping,
    filters.condition,
    filters.warrantyMonths,
  ].filter(Boolean).length;

  // Calculate display range for results counter
  const startResult = services.length > 0 ? 1 : 0;
  const endResult = services.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Services</h1>

          {/* Search Filters */}
          <div className="space-y-4">
            {/* Breadcrumb */}
            {(filters.subcategory || filters.childCategory) && (
              <nav
                aria-label="breadcrumb"
                className="text-sm text-gray-600 mt-2 select-none"
              >
                <ol className="list-reset flex space-x-2">
                  {filters.category && (
                    <li>
                      {categories.find(
                        (c) => c.name.toString() === filters.category
                      )?.name || "Category"}
                    </li>
                  )}
                  {filters.subcategory && (
                    <>
                      <li>→</li>
                      <li>{filters.subcategory}</li>
                    </>
                  )}
                  {filters.childCategory && (
                    <>
                      <li>→</li>
                      <li>{filters.childCategory}</li>
                    </>
                  )}
                </ol>
              </nav>
            )}

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => {
                    updateFilter("search", e.target.value);
                    console.log("Search query changed to:", e.target.value);
                  }}
                  placeholder="Search services..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Search
              </button>
            </form>

            {/* Elegant Results Counter */}
            {!loading && (
              <div className="flex items-center justify-between py-4 px-6 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-gray-700">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium">
                      Showing {startResult.toLocaleString()}-
                      {endResult.toLocaleString()} of{" "}
                      {totalServices.toLocaleString()} results
                    </span>
                  </div>
                  {hasActiveFilters && (
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <span className="text-xs text-gray-500 font-medium">
                        {activeFiltersCount} filter
                        {activeFiltersCount !== 1 ? "s" : ""} applied
                      </span>
                    </div>
                  )}
                </div>

                {hasMoreServices && (
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <div className="animate-pulse w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>More available</span>
                  </div>
                )}
              </div>
            )}

            {/* Filters Side Drawer */}
            <ServicesFiltersSidebar
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              categorySet={categories}
              filters={filters}
              updateFilter={updateFilter}
              updateFilters={updateFilters}
              clearAllFilters={clearAllFilters}
            />
          </div>
        </div>
      </div>

      {/* Floating Filter Button */}
      {!showFilters && (
        <button
          onClick={() => setShowFilters(true)}
          className="
            fixed 
            left-0 
            top-1/2 
            -translate-y-1/2
            z-40 
            bg-gradient-to-b from-black via-gray-800 to-white
            text-white px-3 py-6 rounded-r-xl shadow-xl 
            flex flex-col items-center justify-center space-y-2
            hover:scale-105 hover:shadow-2xl transition-all duration-300 ease-out
            border border-gray-700
            writing-mode-vertical
            min-h-[120px]
          "
        >
          <Filter className="w-5 h-5" />

          <span
            className="font-medium text-sm transform -rotate-90 whitespace-nowrap"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            Filters
          </span>

          {hasActiveFilters && (
            <span className="bg-white text-black text-xs font-semibold px-2 py-1 rounded-full shadow-md min-w-[24px] text-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      )}

      {/* Services Content */}
      <ServiceListing services={services} loading={loading} error={error} />

      {/* Elegant Load More Section */}
      {!loading && services.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {hasMoreServices ? (
            <div
              ref={loadMoreRef}
              className="flex flex-col items-center justify-center py-12 space-y-6"
            >
              {loadingMore ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
                    <div
                      className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-gray-400 rounded-full animate-spin"
                      style={{
                        animationDirection: "reverse",
                        animationDuration: "1.5s",
                      }}
                    ></div>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 font-medium">
                      Loading more services...
                    </p>
                    <p className="text-sm text-gray-400">
                      Finding the perfect items for you
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={loadMoreServices}
                  className="group relative overflow-hidden bg-gradient-to-r from-gray-900 to-black text-white px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 ease-out"
                >
                  <span className="relative z-10 flex items-center space-x-2">
                    <span>Load More Services</span>
                    <ChevronDown className="w-5 h-5 group-hover:animate-bounce" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-black to-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  You've seen it all! ✨
                </h3>
                <p className="text-gray-600 max-w-md">
                  That's every service we have matching your criteria. Try
                  adjusting your filters to discover more amazing items.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && services.length === 0 && !error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Search className="w-12 h-12 text-gray-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                No services found
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                We couldn't find any services matching your search criteria. Try
                adjusting your filters or search terms.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center space-x-2 bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Clear All Filters</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
