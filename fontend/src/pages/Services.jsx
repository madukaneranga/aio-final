import React, { useState, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import ServiceListing from "../components/ServiceListing";
import FiltersSidebar from "../components/FilterSidebar";

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

    console.log("Manual search with filters:", filters);
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
            </form>

            {/* Filters Side Drawer */}
            <FiltersSidebar
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              setSelectedCategoryId={setSelectedCategoryId}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedSubcategory={selectedSubcategory}
              setSelectedSubcategory={setSelectedSubcategory}
              selectedChildCategory={selectedChildCategory}
              setSelectedChildCategory={setSelectedChildCategory}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              handleSearch={handleSearch}
            />
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
      {/* Floating Filter Button (opens drawer) */}
      {!showFilters && (
        <button
          onClick={() => setShowFilters(true)}
          className="
      fixed 
      left-0 
      top-24 
      z-40 

      bg-gradient-to-r from-black via-gray-800 to-white
      text-white px-5 py-2 rounded-r-xl shadow-xl flex items-center space-x-3
      hover:scale-105 hover:shadow-2xl transition-all duration-300 ease-out
      border border-gray-700

      md:top-24          /* On md+ screens, keep top:6rem */
      md:left-0

      /* On small screens, center vertically */
      top-1/2 
      -translate-y-1/2
      left-0
      "
        >
          <Filter className="w-5 h-5" />
          <span className="font-medium">Filters</span>

          {hasActiveFilters && (
            <span className="ml-1 bg-white text-black text-xs font-semibold px-2 py-0.5 rounded-full shadow-md">
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
      )}
      {/* Services Content */}
      <ServiceListing services={services} loading={loading} error={error} />
    </div>
  );
};

export default Services;
