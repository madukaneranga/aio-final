import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const CategoryCard = ({ category }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const categoryName = category.name || "";

  const handleClick = () => {
    if (categoryName.trim()) {
      const categoryUrl = `/products?category=${encodeURIComponent(
        categoryName
      )}`;
      console.log("Navigating to:", categoryUrl);
      navigate(categoryUrl);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Get first image or use placeholder
  const imageUrl =
    category.image && category.image.length > 0 ? category.image[0] : null;

  return (
    <div className="group cursor-pointer flex-shrink-0" onClick={handleClick}>
      <div className="relative w-64 h-32 bg-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105">
        {/* Background Image */}
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={category.name}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
        )}

        {/* Text Overlay */}
        <div className="absolute inset-0 flex items-start justify-start p-4">
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900 leading-tight max-w-[140px]">
              {category.name}
            </h3>
          </div>
        </div>

        {/* Subtle overlay for better text readability */}
        <div className="absolute inset-0 bg-white bg-opacity-10" />
      </div>
    </div>
  );
};

export default CategoryCard;
