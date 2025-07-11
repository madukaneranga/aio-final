import React from 'react';
import { Palette } from 'lucide-react';

const ColorThemeSelector = ({ selectedColor, onColorChange, className = '' }) => {
  const predefinedColors = [
    { name: 'Classic Black', value: '#000000', preview: 'bg-black' },
    { name: 'Pure White', value: '#FFFFFF', preview: 'bg-white border-2 border-gray-300' },
    { name: 'Slate Gray', value: '#64748b', preview: 'bg-slate-500' },
    { name: 'Royal Blue', value: '#2563eb', preview: 'bg-blue-600' },
    { name: 'Emerald Green', value: '#059669', preview: 'bg-emerald-600' },
    { name: 'Crimson Red', value: '#dc2626', preview: 'bg-red-600' },
    { name: 'Amber Orange', value: '#d97706', preview: 'bg-amber-600' },
    { name: 'Violet Purple', value: '#7c3aed', preview: 'bg-violet-600' },
    { name: 'Rose Pink', value: '#e11d48', preview: 'bg-rose-600' },
    { name: 'Teal', value: '#0d9488', preview: 'bg-teal-600' },
    { name: 'Indigo', value: '#4f46e5', preview: 'bg-indigo-600' },
    { name: 'Lime Green', value: '#65a30d', preview: 'bg-lime-600' }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <Palette className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Store Theme Color</h3>
      </div>

      {/* Predefined Colors */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Choose from preset colors
        </label>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {predefinedColors.map((color) => (
            <button
              key={color.value}
              onClick={() => onColorChange(color.value)}
              className={`group relative p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                selectedColor === color.value
                  ? 'border-black ring-2 ring-black ring-opacity-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              title={color.name}
            >
              <div className={`w-full h-8 rounded ${color.preview} mb-2`}></div>
              <p className="text-xs text-gray-600 text-center truncate">{color.name}</p>
              {selectedColor === color.value && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-black rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Color Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Or choose a custom color
        </label>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-16 h-12 border border-gray-300 rounded-lg cursor-pointer"
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={selectedColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent font-mono"
              placeholder="#000000"
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Theme Preview</h4>
        <div className="space-y-3">
          <div 
            className="p-4 rounded-lg text-white"
            style={{ backgroundColor: selectedColor }}
          >
            <h5 className="font-semibold">Your Store Name</h5>
            <p className="text-sm opacity-90">This is how your store theme will look</p>
          </div>
          <div className="flex space-x-2">
            <button 
              className="px-4 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: selectedColor }}
            >
              Primary Button
            </button>
            <button 
              className="px-4 py-2 rounded-lg font-medium border-2"
              style={{ 
                borderColor: selectedColor, 
                color: selectedColor,
                backgroundColor: 'transparent'
              }}
            >
              Secondary Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorThemeSelector;