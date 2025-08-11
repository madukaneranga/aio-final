import React, { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Search, Filter, X } from "lucide-react";
import ProductListing from "../components/ProductListing";

const Products = () => {
  // URL parameter hooks
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Product data state
  const [products, setProducts] = useState([]);
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

  // Read URL parameters and trigger search
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    const categoryFromUrl = searchParams.get('category');
    const subcategoryFromUrl = searchParams.get('subcategory');
    const childCategoryFromUrl = searchParams.get('childCategory');
    const minPriceFromUrl = searchParams.get('minPrice');
    const maxPriceFromUrl = searchParams.get('maxPrice');
    
    console.log("=== URL PARAMS DEBUG ===");
    console.log("Current URL:", location.pathname + location.search);
    console.log("Search from URL:", searchFromUrl);
    console.log("All URL params:", Object.fromEntries(searchParams.entries()));
    
    // Set state from URL parameters
    if (searchFromUrl) {
      setSearchQuery(searchFromUrl);
    }
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
    if (subcategoryFromUrl) {
      setSelectedSubcategory(subcategoryFromUrl);
    }
    if (childCategoryFromUrl) {
      setSelectedChildCategory(childCategoryFromUrl);
    }
    if (minPriceFromUrl || maxPriceFromUrl) {
      setPriceRange({ 
        min: minPriceFromUrl || "", 
        max: maxPriceFromUrl || "" 
      });
    }
    
    // Trigger search with URL parameters
    if (searchFromUrl || categoryFromUrl || subcategoryFromUrl || childCategoryFromUrl || minPriceFromUrl || maxPriceFromUrl) {
      const filters = {
        search: searchFromUrl || "",
        category: categoryFromUrl || "",
        subcategory: subcategoryFromUrl || "",
        childCategory: childCategoryFromUrl || "",
        minPrice: minPriceFromUrl || "",
        maxPrice: maxPriceFromUrl || "",
      };
      
      console.log("Fetching products with URL filters:", filters);
      fetchProducts(filters);
    } else {
      // No URL params, fetch all products
      fetchProducts();
    }
  }, [searchParams, location]);

  const fetchProducts = async (filters = {}) => {
    try {
      setLoading(true);
      setError("");
      
      console.log("Fetching products with filters:", filters);
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/products/listing`,
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

    console.log("Manual search with filters:", filters);
    fetchProducts(filters);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategoryId("");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedChildCategory("");
    setPriceRange({ min: "", max: "" });
    fetchProducts({});
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
      selectedCategoryId ||
      selectedSubcategory ||
      selectedChildCategory ||
      priceRange.min ||
      priceRange.max
  );

  // Temporary test function - remove this after testing
  const testSearch = () => {
    console.log("Testing manual search with query:", searchQuery);
    fetchProducts({ search: searchQuery });
  };

  // Category tree menu logic
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Products</h1>

          {/* Temporary Test Button - Remove after testing 
          <button 
            onClick={testSearch} 
            className="bg-red-500 text-white p-2 m-2 rounded"
          >
            Test Search: "{searchQuery}"
          </button>

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
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
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
            </form>

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

      {/* Debug Info - Remove after testing 
      <div className="bg-yellow-100 p-4 m-4 rounded">
        <h3 className="font-bold">Debug Info:</h3>
        <p>Current URL: {location.pathname + location.search}</p>
        <p>Search Query State: "{searchQuery}"</p>
        <p>URL Search Param: "{searchParams.get('search')}"</p>
        <p>Products Count: {products.length}</p>
        <p>Loading: {loading.toString()}</p>
        <p>Error: {error || "None"}</p>
      </div>
*/}
      {/* Products Content */}
      <ProductListing
        products={products}
        loading={loading}
        error={error}
      />
    </div>
  );
};

export default Products;