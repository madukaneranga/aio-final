import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Search, Filter, X, ChevronDown, Sparkles } from "lucide-react";
import CustomListing from "../components/CustomListing";
import ProductsFiltersSidebar from "../components/ProductsFiltersSidebar";
import FlashDealsBanner from "../components/FlashDealSection";

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

const CustomSales = () => {
  // URL parameter hooks
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Product data state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
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

  // Track initialization state
  const [hasInitialized, setHasInitialized] = useState(false);
  const initializationRef = useRef(false);

  const [flashDeal, setFlashDeal] = useState(null);
  const [showFlashDeal, setShowFlashDeal] = useState(false);

  // Don't debounce on first load to prevent double fetch
  const debouncedFilters = useDebounce(filters, hasInitialized ? 300 : 0);

  // Derived state for backwards compatibility
  const selectedCategoryObj = categories.find(
    (cat) => cat.name === filters.category
  );
  const subcategories = selectedCategoryObj?.subcategories || [];
  const childCategories =
    subcategories.find((sub) => sub.name === filters.subcategory)
      ?.childCategories || [];

  // Initialize filters from URL parameters ONCE on mount
  useEffect(() => {
    if (initializationRef.current) return; // Prevent multiple initializations

    const searchFromUrl = searchParams.get("search");
    const categoryFromUrl = searchParams.get("category");

    console.log("=== INITIALIZING FROM URL ===");
    console.log("Current URL:", location.pathname + location.search);
    console.log("Search from URL:", searchFromUrl);
    console.log("Category from URL:", categoryFromUrl);
    console.log("All URL params:", Object.fromEntries(searchParams.entries()));

    // Build initial filters from URL
    const initialFilters = {
      search: searchFromUrl || "",
      category: categoryFromUrl || "",
      subcategory: "",
      childCategory: "",
      priceRange: { min: "", max: "" },
      stock: "",
      rating: "",
      shipping: "",
      condition: "",
      warrantyMonths: "",
    };

    console.log("Setting initial filters:", initialFilters);

    // Set filters and mark as initialized
    setFilters(initialFilters);
    initializationRef.current = true;

    // Immediately fetch with initial filters (no debounce)
    fetchProducts(initialFilters, 1, false).then(() => {
      setHasInitialized(true);
    });
  }, []); // Empty dependency array - only run once on mount

  // Fetch products function with pagination
  const fetchProducts = async (
    searchFilters = {},
    page = 1,
    append = false
  ) => {
    try {
      if (!append) {
        setLoading(true);
        setProducts([]);
      } else {
        setLoadingMore(true);
      }
      setError("");

      console.log(
        "Fetching products with filters:",
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
        `${import.meta.env.VITE_API_URL}/api/products/sale-listing`,
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
          "Products fetched:",
          data.products.length,
          "items",
          "Total:",
          data.total
        );

        if (append) {
          setProducts((prev) => [...prev, ...data.products]);
        } else {
          setProducts(data.products);
        }

        setTotalProducts(data.total);
        setHasMoreProducts(
          data.products.length === PRODUCTS_PER_PAGE && data.hasMore
        );
        setCurrentPage(page);
      } else {
        setError("Failed to fetch products");
        console.error("API Error:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more products
  const loadMoreProducts = useCallback(() => {
    if (!loadingMore && hasMoreProducts && !loading) {
      const nextPage = currentPage + 1;
      fetchProducts(debouncedFilters, nextPage, true);
    }
  }, [loadingMore, hasMoreProducts, loading, currentPage, debouncedFilters]);

  // Intersection observer for infinite scroll
  const loadMoreRef = useIntersectionObserver(
    useCallback(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadMoreProducts();
        }
      },
      [loadMoreProducts]
    )
  );

  // Handle filter changes AFTER initialization
  useEffect(() => {
    // Only respond to filter changes after initial load
    if (hasInitialized && initializationRef.current) {
      console.log("Filter changed after initialization:", debouncedFilters);
      setCurrentPage(1);
      fetchProducts(debouncedFilters, 1, false);
    }
  }, [debouncedFilters, hasInitialized]);

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
    fetchFlashDeal();
  }, []);

  const fetchFlashDeal = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/flash-deals/current`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setFlashDeal(result.data);
          setShowFlashDeal(true);
        }
      } else {
        setShowFlashDeal(false);
      }
    } catch (error) {
      console.error("Error fetching flash deal:", error);
      setShowFlashDeal(false);
    }
  };

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
    fetchProducts(filters, 1, false);
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

  const getFlashDealProps = () => {
    if (!flashDeal) return null;

    const { timeRemaining, saleStatus } = flashDeal;

    if (saleStatus === "upcoming") {
      return {
        saleStartsInHours: timeRemaining.hours,
        saleStartsInMinutes: timeRemaining.minutes,
        saleStartsInSeconds: timeRemaining.seconds,
        saleEndsInHours: 0,
        saleEndsInMinutes: 0,
        saleEndsInSeconds: 0,
        timerLabel: flashDeal.timerLabel,
      };
    } else {
      return {
        saleStartsInHours: 0,
        saleStartsInMinutes: 0,
        saleStartsInSeconds: 0,
        saleEndsInHours: timeRemaining.hours,
        saleEndsInMinutes: timeRemaining.minutes,
        saleEndsInSeconds: timeRemaining.seconds,
        timerLabel: "Sale Ends In:",
      };
    }
  };

  const flashDealProps = getFlashDealProps();

  // Calculate display range for results counter
  const startResult = products.length > 0 ? 1 : 0;
  const endResult = products.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {showFlashDeal && flashDeal && flashDealProps && (
        <section className="py-0 bg-white">
          <FlashDealsBanner
            // Timer props from backend
            {...flashDealProps}
            // Content from backend
            saleName={flashDeal.saleName}
            saleSubtitle={flashDeal.saleSubtitle}
            discountText={flashDeal.discountText}
            buttonText={flashDeal.buttonText}
            // Design from backend
            backgroundColor={flashDeal.backgroundColor}
            backgroundImage={flashDeal.backgroundImage}
            textColor={flashDeal.textColor}
            accentColor={flashDeal.accentColor}
            // Image from backend
            heroImage={flashDeal.heroImage}
            showHeroImage={flashDeal.showHeroImage}
            onPage={true}
          />
        </section>
      )}


      {/* Products Content */}
      {products && (
        <CustomListing
          items={products}
          loading={loading}
          error={error}
          type="product"
        />
      )}

      {/* Elegant Load More Section */}
      {!loading && products.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {hasMoreProducts ? (
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
                      Loading more products...
                    </p>
                    <p className="text-sm text-gray-400">
                      Finding the perfect items for you
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={loadMoreProducts}
                  className="group relative overflow-hidden bg-gradient-to-r from-gray-900 to-black text-white px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 ease-out"
                >
                  <span className="relative z-10 flex items-center space-x-2">
                    <span>Load More Products</span>
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
                  That's every product we have matching your criteria. Try
                  adjusting your filters to discover more amazing items.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && products.length === 0 && !error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Search className="w-12 h-12 text-gray-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                No products found
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                We couldn't find any products matching your search criteria. Try
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

export default CustomSales;
