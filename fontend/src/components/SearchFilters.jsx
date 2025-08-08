import React, { useState, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import CategoryTreeMenu from "./CategoryTreeMenu";

const SearchFilters = ({
  onSearch,
  categories = [],
  showPriceFilter = true,
  placeholder = "Search...",
}) => {
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

  const handleSearch = (e) => {
    e?.preventDefault?.();

    onSearch({
      search: searchQuery,
      categoryId: selectedCategoryId,
      category: selectedCategory,
      subcategory: selectedSubcategory,
      childCategory: selectedChildCategory,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategoryId("");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedChildCategory("");
    setPriceRange({ min: "", max: "" });
    onSearch({});
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
    <div className="space-y-4">
      {/* Breadcrumb */}
      {showPriceFilter && (
        <>
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
        </>
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
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>

        <button
          type="button"
          onClick={handleSearch} // now triggered by click instead of submit
          className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Search
        </button>

        {showPriceFilter && (
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
        )}
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
            <CategoryTreeMenu
              categories={categories}
              onSelect={({
                categoryId,
                category,
                subcategory,
                childCategory,
              }) => {
                setSelectedCategoryId(categoryId || "");
                setSelectedCategory(category || "");
                setSelectedSubcategory(subcategory || "");
                setSelectedChildCategory(childCategory || "");
              }}
            />

            {showPriceFilter && (
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
            )}
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
  );
};

export default SearchFilters;
