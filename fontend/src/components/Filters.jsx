import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Star,
  Truck,
  Tag,
  DollarSign,
  Grid,
  Sliders,
  Check,
  Menu
} from "lucide-react";

const Filters = ({ 
  categories = [], 
  onFiltersChange, 
  initialFilters = {},
  loading = false 
}) => {
  // Filter sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Search filters state
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialFilters.categoryId || "");
  const [selectedCategory, setSelectedCategory] = useState(initialFilters.category || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState(initialFilters.subcategory || "");
  const [selectedChildCategory, setSelectedChildCategory] = useState(initialFilters.childCategory || "");
  const [priceRange, setPriceRange] = useState({ 
    min: initialFilters.minPrice || "", 
    max: initialFilters.maxPrice || "" 
  });
  
  // Advanced filters
  const [selectedBrands, setSelectedBrands] = useState(initialFilters.brands || []);
  const [selectedColors, setSelectedColors] = useState(initialFilters.colors || []);
  const [selectedSizes, setSelectedSizes] = useState(initialFilters.sizes || []);
  const [selectedRating, setSelectedRating] = useState(initialFilters.rating || "");
  const [inStock, setInStock] = useState(initialFilters.inStock || false);
  const [freeShipping, setFreeShipping] = useState(initialFilters.freeShipping || false);
  const [onSale, setOnSale] = useState(initialFilters.onSale || false);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || "relevance");

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    categories: false,
    price: false,
    brands: false,
    colors: true,
    sizes: true,
    rating: true,
    availability: true,
    features: true
  });

  // Mock data for brands and colors (replace with real data from your API)
  const mockBrands = ["Apple", "Samsung", "Sony", "Nike", "Adidas", "Zara", "H&M"];
  const mockColors = ["Black", "White", "Red", "Blue", "Green", "Gray", "Brown"];
  const mockSizes = ["XS", "S", "M", "L", "XL", "XXL"];

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Get category-dependent filters
  const getCategoryFilters = () => {
    const selectedCat = categories.find(cat => cat._id === selectedCategoryId);
    
    if (!selectedCat) return { showBrands: true, showColors: false, showSizes: false, brands: mockBrands };
    
    // Customize based on your actual categories
    switch (selectedCat.name?.toLowerCase()) {
      case "electronics":
      case "technology":
        return {
          showBrands: true,
          showColors: true,
          showSizes: false,
          brands: ["Apple", "Samsung", "Sony", "Dell", "HP", "Lenovo"],
          colors: ["Black", "White", "Silver", "Gold", "Blue"]
        };
      case "clothing":
      case "fashion":
      case "apparel":
        return {
          showBrands: true,
          showColors: true,
          showSizes: true,
          brands: ["Nike", "Adidas", "Zara", "H&M", "Uniqlo", "Levi's"],
          colors: ["Black", "White", "Red", "Blue", "Green", "Pink", "Yellow"]
        };
      default:
        return {
          showBrands: true,
          showColors: false,
          showSizes: false,
          brands: mockBrands
        };
    }
  };

  const categoryFilters = getCategoryFilters();

  const selectedCategoryObj = categories.find(
    (cat) => cat._id === selectedCategoryId
  );
  const subcategories = selectedCategoryObj?.subcategories || [];
  const childCategories =
    subcategories.find((sub) => sub.name === selectedSubcategory)
      ?.childCategories || [];

  const toggleArrayFilter = (array, setArray, value) => {
    if (array.includes(value)) {
      setArray(array.filter(item => item !== value));
    } else {
      setArray([...array, value]);
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedCategoryId) count++;
    if (selectedSubcategory) count++;
    if (selectedChildCategory) count++;
    if (priceRange.min || priceRange.max) count++;
    if (selectedBrands.length) count++;
    if (selectedColors.length) count++;
    if (selectedSizes.length) count++;
    if (selectedRating) count++;
    if (inStock) count++;
    if (freeShipping) count++;
    if (onSale) count++;
    return count;
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategoryId("");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedChildCategory("");
    setPriceRange({ min: "", max: "" });
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedRating("");
    setInStock(false);
    setFreeShipping(false);
    setOnSale(false);
    setSortBy("relevance");
  };

  // Call parent function when filters change
  useEffect(() => {
    const filters = {
      search: searchQuery,
      categoryId: selectedCategoryId,
      category: selectedCategory,
      subcategory: selectedSubcategory,
      childCategory: selectedChildCategory,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      brands: selectedBrands,
      colors: selectedColors,
      sizes: selectedSizes,
      rating: selectedRating,
      inStock,
      freeShipping,
      onSale,
      sortBy
    };
    
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  }, [
    searchQuery, selectedCategoryId, selectedCategory, 
    selectedSubcategory, selectedChildCategory, priceRange,
    selectedBrands, selectedColors, selectedSizes,
    selectedRating, inStock, freeShipping, onSale, sortBy
  ]);

  const FilterSection = ({ title, isCollapsed, onToggle, children, icon: Icon }) => (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {Icon && <Icon className="w-4 h-4 text-gray-600" />}
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {!isCollapsed && <div className="px-4 pb-4">{children}</div>}
    </div>
  );

  const CheckboxFilter = ({ options, selected, onChange, limit = null }) => (
    <div className="space-y-2">
      {(limit ? options.slice(0, limit) : options).map((option) => (
        <label key={option} className="flex items-center space-x-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => onChange(option)}
            className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2"
          />
          <span className="text-sm text-gray-700 group-hover:text-black transition-colors">
            {option}
          </span>
        </label>
      ))}
    </div>
  );

  const ActiveFiltersBar = () => {
    const activeCount = getActiveFiltersCount();
    if (activeCount === 0) return null;

    return (
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">
            Active Filters ({activeCount})
          </span>
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            Clear All
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <span className="inline-flex items-center bg-black text-white text-xs px-2 py-1 rounded-full">
              Search: "{searchQuery}"
              <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSearchQuery("")} />
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
              {selectedCategory}
              <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => {
                setSelectedCategoryId("");
                setSelectedCategory("");
              }} />
            </span>
          )}
          {selectedBrands.map(brand => (
            <span key={brand} className="inline-flex items-center bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
              {brand}
              <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => toggleArrayFilter(selectedBrands, setSelectedBrands, brand)} />
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
      }`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Active Filters */}
        <ActiveFiltersBar />

        {/* Filter Sections */}
        <div className="flex-1 overflow-y-auto">
          {/* Categories */}
          <FilterSection
            title="Categories"
            icon={Grid}
            isCollapsed={collapsedSections.categories}
            onToggle={() => toggleSection('categories')}
          >
            <div className="space-y-2">
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  const categoryId = e.target.value;
                  const category = categories.find(cat => cat._id === categoryId);
                  setSelectedCategoryId(categoryId);
                  setSelectedCategory(category?.name || "");
                  setSelectedSubcategory("");
                  setSelectedChildCategory("");
                  // Reset category-dependent filters
                  setSelectedBrands([]);
                  setSelectedColors([]);
                  setSelectedSizes([]);
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              
              {selectedCategoryId && subcategories.length > 0 && (
                <div className="ml-4 space-y-2">
                  {subcategories.map(sub => (
                    <label key={sub.name} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="subcategory"
                        checked={selectedSubcategory === sub.name}
                        onChange={() => setSelectedSubcategory(sub.name)}
                        className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                      />
                      <span className="text-sm text-gray-700">{sub.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </FilterSection>

          {/* Price Range */}
          <FilterSection
            title="Price Range"
            icon={DollarSign}
            isCollapsed={collapsedSections.price}
            onToggle={() => toggleSection('price')}
          >
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  placeholder="Min"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black"
                />
                <input
                  type="number"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  placeholder="Max"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {["Under $25", "$25-$50", "$50-$100", "$100-$200", "$200+"].map(range => (
                  <button
                    key={range}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full transition-colors"
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </FilterSection>

          {/* Brands (Category-dependent) */}
          {categoryFilters.showBrands && (
            <FilterSection
              title="Brands"
              icon={Tag}
              isCollapsed={collapsedSections.brands}
              onToggle={() => toggleSection('brands')}
            >
              <CheckboxFilter
                options={categoryFilters.brands || mockBrands}
                selected={selectedBrands}
                onChange={(brand) => toggleArrayFilter(selectedBrands, setSelectedBrands, brand)}
                limit={6}
              />
            </FilterSection>
          )}

          {/* Colors (Category-dependent) */}
          {categoryFilters.showColors && (
            <FilterSection
              title="Colors"
              isCollapsed={collapsedSections.colors}
              onToggle={() => toggleSection('colors')}
            >
              <div className="grid grid-cols-4 gap-2">
                {(categoryFilters.colors || mockColors).map(color => (
                  <button
                    key={color}
                    onClick={() => toggleArrayFilter(selectedColors, setSelectedColors, color)}
                    className={`aspect-square rounded-full border-2 transition-all ${
                      selectedColors.includes(color)
                        ? 'border-black scale-110'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color.toLowerCase() }}
                    title={color}
                  >
                    {selectedColors.includes(color) && (
                      <Check className="w-3 h-3 text-white m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </FilterSection>
          )}

          {/* Sizes (Category-dependent) */}
          {categoryFilters.showSizes && (
            <FilterSection
              title="Sizes"
              isCollapsed={collapsedSections.sizes}
              onToggle={() => toggleSection('sizes')}
            >
              <div className="grid grid-cols-3 gap-2">
                {mockSizes.map(size => (
                  <button
                    key={size}
                    onClick={() => toggleArrayFilter(selectedSizes, setSelectedSizes, size)}
                    className={`p-2 text-sm border rounded-md transition-colors ${
                      selectedSizes.includes(size)
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </FilterSection>
          )}

          {/* Rating */}
          <FilterSection
            title="Customer Rating"
            icon={Star}
            isCollapsed={collapsedSections.rating}
            onToggle={() => toggleSection('rating')}
          >
            <div className="space-y-2">
              {[4, 3, 2, 1].map(rating => (
                <label key={rating} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rating"
                    checked={selectedRating === rating.toString()}
                    onChange={() => setSelectedRating(rating.toString())}
                    className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                  />
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-gray-600">& up</span>
                  </div>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Availability & Features */}
          <FilterSection
            title="Availability & Features"
            icon={Truck}
            isCollapsed={collapsedSections.availability}
            onToggle={() => toggleSection('availability')}
          >
            <div className="space-y-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                />
                <span className="text-sm text-gray-700">In Stock</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={freeShipping}
                  onChange={(e) => setFreeShipping(e.target.checked)}
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                />
                <span className="text-sm text-gray-700">Free Shipping</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onSale}
                  onChange={(e) => setOnSale(e.target.checked)}
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                />
                <span className="text-sm text-gray-700">On Sale</span>
              </label>
            </div>
          </FilterSection>
        </div>
      </div>

      {/* Toggle Button for Mobile/Collapsed State */}
      {!sidebarOpen && (
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
            {getActiveFiltersCount() > 0 && (
              <span className="bg-black text-white text-xs px-2 py-1 rounded-full">
                {getActiveFiltersCount()}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Search Bar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-4 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="relevance">Most Relevant</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="newest">Newest First</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>

        {/* Content Placeholder */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          ) : (
            <div className="text-center py-20">
              <Grid className="w-16 h-16 mx-auto mb-4 opacity-30 text-gray-400" />
              <h3 className="text-lg font-medium mb-2 text-gray-700">Replace this with ProductListing</h3>
              <p className="text-sm text-gray-500">Import this component and pass products data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Filters;