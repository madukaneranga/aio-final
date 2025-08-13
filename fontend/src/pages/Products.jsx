// ============ PRODUCTS.JSX (MAIN COMPONENT) ============
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Search, Filter, X } from "lucide-react";
import ProductListing from "../components/ProductListing";
import ProductsFiltersSidebar from "../components/ProductsFiltersSidebar";

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

const Products = () => {
  // URL parameter hooks
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Product data state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);

  // Unified filters state - THIS IS THE KEY CHANGE
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
    warrantyMonths: ""
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
      setFilters(prev => ({
        ...prev,
        search: searchFromUrl
      }));
    }
  }, [searchParams, location]);

  // Fetch products function
  const fetchProducts = async (searchFilters = {}) => {
    try {
      setLoading(true);
      setError("");

      console.log("Fetching products with filters:", searchFilters);

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
        warrantyMonths: searchFilters.warrantyMonths || ""
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/products/listing`,
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
        console.log("Products fetched:", data.length, "items");
        setProducts(data);
      } else {
        setError("Failed to fetch products");
        console.error("API Error:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch products when debounced filters change
  useEffect(() => {
    fetchProducts(debouncedFilters);
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
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      // Auto-clear dependent filters
      if (key === 'category') {
        newFilters.subcategory = "";
        newFilters.childCategory = "";
      } else if (key === 'subcategory') {
        newFilters.childCategory = "";
      }
      
      return newFilters;
    });
  }, []);

  const updateFilters = useCallback((updates) => {
    setFilters(prev => ({ ...prev, ...updates }));
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
      warrantyMonths: ""
    });
  }, []);

  // Manual search handler (for search form)
  const handleSearch = (e) => {
    e?.preventDefault?.();
    
    // Force immediate search without debounce
    fetchProducts(filters);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Products</h1>

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
                    updateFilter('search', e.target.value);
                    console.log("Search query changed to:", e.target.value);
                  }}
                  placeholder="Search products..."
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

            {/* Filters Side Drawer */}
            <ProductsFiltersSidebar
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
    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
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

      {/* Products Content */}
      <ProductListing products={products} loading={loading} error={error} />
    </div>
  );
};

export default Products;