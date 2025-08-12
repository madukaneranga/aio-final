// ColorSelector.jsx
import React, { useState } from 'react';
import Black from "../assests/colors/black.png"
import Blue from "../assests/colors/blue.png";
import Gray from "../assests/colors/gray.png";
import Green from "../assests/colors/green.png";
import Orange from "../assests/colors/orange.png";
import Pink from "../assests/colors/pink.png";
import Purple from "../assests/colors/purple.png";
import Red from "../assests/colors/red.png";
import White from "../assests/colors/white.png";
import Yellow from "../assests/colors/yellow.png";

const ColorSelector = ({ selectedColor, onColorSelect, variantIndex }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Define your color options with images only
  const colorOptions = [
    { name: 'black', image: Black },
    { name: 'blue', image: Blue },
    { name: 'gray', image: Gray },
    { name: 'green', image: Green },
    { name: 'orange', image: Orange },
    { name: 'pink', image: Pink },
    { name: 'purple', image: Purple },
    { name: 'red', image: Red },
    { name: 'white', image: White },
    { name: 'yellow', image: Yellow }
  ];

  const handleColorSelect = (colorName) => {
    onColorSelect(variantIndex, colorName);
    setIsOpen(false);
  };

  const selectedColorData = colorOptions.find(color => color.name === selectedColor) || null;

  return (
    <div className="relative">
      {/* Selected Color Display / Dropdown Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-gray-400 min-w-[150px]"
      >
        {selectedColorData ? (
          <>
            <img 
              src={selectedColorData.image} 
              alt={selectedColorData.name}
              className="w-6 h-6 rounded"
            />
            <span className="flex-1 capitalize">{selectedColorData.name}</span>
          </>
        ) : (
          <span className="text-gray-500 flex-1">Select Color</span>
        )}
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
          {colorOptions.map((color) => (
            <div
              key={color.name}
              onClick={() => handleColorSelect(color.name)}
              className={`flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer ${
                selectedColor === color.name ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
            >
              <img 
                src={color.image} 
                alt={color.name}
                className="w-8 h-8 rounded"
              />
              <span className="capitalize">{color.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ColorSelector;