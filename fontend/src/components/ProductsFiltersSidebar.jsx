import React from "react";
import { X, Star } from "lucide-react";

const ProductsFiltersSidebar = ({
  showFilters,
  setShowFilters,
  categorySet,
  filters,
  updateFilter,
  updateFilters,
  clearAllFilters,
}) => {
  const selectedCategoryObj = categorySet.find(
    (cat) => cat.name === filters.category
  );
  const subcategories = selectedCategoryObj?.subcategories || [];

  const selectedSubcategoryObj = subcategories.find(
    (sub) => sub.name === filters.subcategory
  );

  const childCategories = (
    selectedSubcategoryObj?.childCategories || []
  ).filter((child) => child && (child.name || typeof child === "string"));

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
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
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
            {filters.category && subcategories.length > 0 && (
              <select
                value={filters.subcategory}
                onChange={(e) => updateFilter('subcategory', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2"
              >
                <option value="">All Subcategories</option>
                {subcategories.map((sub, index) => (
                  <option
                    key={`subcategory-${filters.category}-${index}`}
                    value={sub.name}
                  >
                    {sub.name}
                  </option>
                ))}
              </select>
            )}

            {/* Child Category */}
            {filters.subcategory && childCategories.length > 0 && (
              <select
                value={filters.childCategory}
                onChange={(e) => updateFilter('childCategory', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2"
              >
                <option value="">All Child Categories</option>
                {childCategories.map((child, index) => {
                  const childName = typeof child === "string" ? child : child.name;
                  const childValue = typeof child === "string" 
                    ? child 
                    : child.name || child._id || child;

                  return (
                    <option
                      key={`childcategory-${filters.category}-${filters.subcategory}-${index}`}
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
                value={filters.priceRange.min}
                min="0"
                onChange={(e) => {
                  const value = e.target.value === "" ? "" : Math.max(0, Number(e.target.value));
                  updateFilter('priceRange', { ...filters.priceRange, min: value });
                }}
                placeholder="Min"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="number"
                value={filters.priceRange.max}
                min="0"
                onChange={(e) => {
                  const value = e.target.value === "" ? "" : Math.max(0, Number(e.target.value));
                  updateFilter('priceRange', { ...filters.priceRange, max: value });
                }}
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
              value={filters.stock}
              onChange={(e) => updateFilter('stock', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All</option>
              <option value="in">In Stock</option>
              <option value="out">Out of Stock</option>
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
                    star <= filters.rating ? "text-yellow-400" : "text-gray-300"
                  }`}
                  onClick={() => {
                    const newRating = star === filters.rating ? "" : star;
                    updateFilter('rating', newRating);
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
              value={filters.shipping}
              onChange={(e) => updateFilter('shipping', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All</option>
              <option value="free-shiping">Free Shipping</option>
              <option value="paid-shipping">Paid Shipping</option>
              <option value="local-pickup">Local Pickup</option>
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition
            </label>
            <select
              value={filters.condition}
              onChange={(e) => updateFilter('condition', e.target.value)}
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
              value={filters.warrantyMonths}
              onChange={(e) => updateFilter('warrantyMonths', e.target.value)}
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
            onClick={clearAllFilters}
            className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </>
  );
};

export default ProductsFiltersSidebar;