// src/components/FiltersSidebar.jsx
import React, { useEffect } from "react";
import { X, Star } from "lucide-react";

const ProductsFiltersSidebar = ({
  showFilters,
  setShowFilters,
  categorySet,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  selectedChildCategory,
  setSelectedChildCategory,
  priceRange,
  setPriceRange,
  handleSearch,
  selectedStock,
  setSelectedStock,
  selectedRating,
  setSelectedRating,
  selectedShipping,
  setSelectedShipping,
  selectedCondition,
  setSelectedCondition,
  selectedWarrentyMonths,
  setSelectedWarrentyMonths,
}) => {
  const selectedCategoryObj = categorySet.find(
    (cat) => cat.name === selectedCategory
  );
  const subcategories = selectedCategoryObj?.subcategories || [];

  const selectedSubcategoryObj = subcategories.find(
    (sub) => sub.name === selectedSubcategory
  );

  const childCategories = (
    selectedSubcategoryObj?.childCategories || []
  ).filter((child) => child && (child.name || typeof child === "string"));

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedChildCategory("");
    setPriceRange({ min: "", max: "" });
  };

  // Auto-trigger search on price range changes (because setPriceRange is async)
  useEffect(() => {
    handleSearch();
  }, [priceRange]);

  return (
    <>
      {/* Overlay */}
      {showFilters && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowFilters(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300 z-50
        ${showFilters ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          <button
            type="button"
            onClick={() => setShowFilters(false)}
            className="text-gray-500 hover:text-gray-700 flex items-center"
          >
            <X className="w-5 h-5" />
            <span className="ml-1">Close</span>
          </button>
        </div>

        {/* Body */}
        <div
          className="p-4 space-y-4 overflow-y-auto"
          style={{ height: "calc(100% - 120px)" }}
        >
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categories
            </label>

            {/* Main Category */}

            <select
              value={selectedCategory}
              onChange={(e) => {
                const categoryValue = e.target.value;

                setSelectedCategory(categoryValue || "");
                setSelectedSubcategory(""); // Reset subcategory
                setSelectedChildCategory(""); // Reset child category

                handleSearch(); // Auto apply filter
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2"
            >
              <option value="">All Categories</option>
              {categorySet.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            {/* Subcategory */}
            {selectedCategory && subcategories.length > 0 && (
              <select
                value={selectedSubcategory}
                onChange={(e) => {
                  const subcategoryValue = e.target.value;

                  setSelectedSubcategory(subcategoryValue || "");
                  setSelectedChildCategory(""); // Reset child category

                  handleSearch(); // Auto apply filter
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2"
              >
                <option value="">All Subcategories</option>
                {subcategories.map((sub, index) => (
                  <option
                    key={`subcategory-${selectedCategory}-${index}`}
                    value={sub.name}
                  >
                    {sub.name}
                  </option>
                ))}
              </select>
            )}

            {/* Child Category */}
            {selectedSubcategory && childCategories.length > 0 && (
              <select
                value={selectedChildCategory}
                onChange={(e) => {
                  const childCategoryValue = e.target.value;
                  setSelectedChildCategory(childCategoryValue || "");

                  handleSearch(); // Auto apply filter
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2"
              >
                <option value="">All Child Categories</option>
                {childCategories.map((child, index) => {
                  const childName =
                    typeof child === "string" ? child : child.name;
                  const childValue =
                    typeof child === "string"
                      ? child
                      : child.name || child._id || child;

                  return (
                    <option
                      key={`childcategory-${selectedCategory}-${selectedSubcategory}-${index}`}
                      value={childValue}
                    >
                      {childName}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                name="min"
                value={priceRange.min}
                min="0"
                onChange={(e) =>
                  setPriceRange({
                    ...priceRange,
                    min:
                      e.target.value === ""
                        ? ""
                        : Math.max(0, Number(e.target.value)),
                  })
                }
                placeholder="Min"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="number"
                name="max"
                value={priceRange.max}
                min="0"
                onChange={(e) =>
                  setPriceRange({
                    ...priceRange,
                    max:
                      e.target.value === ""
                        ? ""
                        : Math.max(0, Number(e.target.value)),
                  })
                }
                placeholder="Max"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* Stock Availability */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Availability
            </label>
            <select
              value={selectedStock}
              onChange={(e) => {
                setSelectedStock(e.target.value);
                handleSearch();
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All</option>
              <option value="in-stock">In Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Rating
            </label>
            <div className="flex space-x-1 cursor-pointer">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={24}
                  className={`transition-colors ${
                    star <= selectedRating ? "text-yellow-400" : "text-gray-300"
                  }`}
                  onClick={() => {
                    // toggle rating: if clicked star is already selected, clear it
                    setSelectedRating(star === selectedRating ? "" : star);
                    handleSearch();
                  }}
                />
              ))}
            </div>
          </div>

          {/* Shipping */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shipping Options
            </label>
            <select
              value={selectedShipping}
              onChange={(e) => {
                setSelectedShipping(e.target.value);
                handleSearch();
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All</option>
              <option value="free">Free Shipping</option>
              <option value="paid">Paid Shipping</option>
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition
            </label>
            <select
              value={selectedCondition}
              onChange={(e) => {
                setSelectedCondition(e.target.value);
                handleSearch();
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Any</option>
              <option value="new">New</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </div>

          {/* Warranty Months */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warranty (Months)
            </label>
            <input
              type="number"
              min="0"
              value={selectedWarrentyMonths}
              onChange={(e) => {
                setSelectedWarrentyMonths(e.target.value);
                handleSearch();
              }}
              placeholder="e.g., 12"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter warranty months (e.g., 6 means ≥ 6 months)
            </p>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white space-y-2">
          <button
            type="button"
            onClick={() => {
              clearAllFilters();
              handleSearch();
            }}
            className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Clear All Filters
          </button>
          {/* Optional: keep this if you want manual Apply Filters button */}
          {/* 
          <button
            type="button"
            onClick={() => {
              handleSearch();
              setShowFilters(false);
            }}
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Apply Filters
          </button> 
          */}
        </div>
      </div>
    </>
  );
};

export default ProductsFiltersSidebar;
