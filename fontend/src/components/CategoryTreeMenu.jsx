// At the top of SearchFilters.jsx
import { useState } from "react";
const CategoryTreeMenu = ({ categories, onSelect }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedSubcategory, setExpandedSubcategory] = useState(null);

  const handleCategoryClick = (catId) => {
    setExpandedCategory((prev) => (prev === catId ? null : catId));
    setExpandedSubcategory(null);
  };

  const handleSubcategoryClick = (subName) => {
    setExpandedSubcategory((prev) => (prev === subName ? null : subName));
  };

  return (
    <div className="w-full max-w-xs">
      <h3 className="font-semibold text-gray-900 mb-2">Browse Categories</h3>
      <ul className="space-y-1 text-sm">
        {categories.map((cat) => (
          <li key={cat._id}>
            <button
            type="button"
              onClick={() => handleCategoryClick(cat._id)}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 font-medium"
            >
              {cat.name}
            </button>

            {expandedCategory === cat._id && (
              <ul className="ml-4 mt-1 space-y-1">
                {cat.subcategories.map((sub) => (
                  <li key={sub.name}>
                    <button
                    type="button"
                      onClick={() => handleSubcategoryClick(sub.name)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
                    >
                      {sub.name}
                    </button>

                    {expandedSubcategory === sub.name &&
                      sub.childCategories.length > 0 && (
                        <ul className="ml-4 mt-1 space-y-1">
                          {sub.childCategories.map((child) => (
                            <li key={`${cat._id}-${sub.name}-${child}`}>
                              <button
                              type="button"
                                onClick={() =>
                                  onSelect({
                                    categoryId: cat._id,
                                    category: cat.name,
                                    subcategory: sub.name,
                                    childCategory: child,
                                  })
                                }
                                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-200 text-gray-600"
                              >
                                {child}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoryTreeMenu;
