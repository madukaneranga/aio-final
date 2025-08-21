import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';

const MegaMenu = ({ 
  categories = [], 
  isOpen, 
  onClose, 
  onCategoryClick 
}) => {
  const [activeCategory, setActiveCategory] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const timeoutRef = useRef(null);
  const menuRef = useRef(null);

  // Check if device is mobile
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Handle category hover for desktop
  const handleCategoryHover = (categoryId) => {
    if (!isMobile && isOpen) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setActiveCategory(categoryId);
    }
  };

  // Handle menu mouse leave
  const handleMenuLeave = () => {
    if (!isMobile && isOpen) {
      timeoutRef.current = setTimeout(() => {
        onClose?.();
        setActiveCategory(null);
      }, 200);
    }
  };

  // Handle menu mouse enter
  const handleMenuEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // Handle category click
  const handleCategoryClick = (category, event) => {
    if (isMobile) {
      event.preventDefault();
      setActiveCategory(activeCategory === category._id ? null : category._id);
    } else {
      onCategoryClick?.(category);
      onClose?.();
    }
  };

  // Handle subcategory click
  const handleSubcategoryClick = (category, subcategory) => {
    onCategoryClick?.(category, subcategory);
    onClose?.();
    setActiveCategory(null);
  };

  // Handle child category click
  const handleChildCategoryClick = (category, subcategory, childCategory) => {
    onCategoryClick?.(category, subcategory, childCategory);
    onClose?.();
    setActiveCategory(null);
  };

  // Handle click outside for mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && menuRef.current && !menuRef.current.contains(event.target)) {
        onClose?.();
        setActiveCategory(null);
      }
    };

    if (isOpen && isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, isMobile]);

  // Reset when menu closes
  useEffect(() => {
    if (!isOpen) {
      setActiveCategory(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [isOpen]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Desktop Menu */}
      <div className="hidden md:block relative z-50">
        <div 
          ref={menuRef}
          className="absolute top-0 left-0 bg-white/95 backdrop-blur-md border border-gray-200 shadow-lg rounded-lg overflow-hidden"
          onMouseLeave={handleMenuLeave}
          onMouseEnter={handleMenuEnter}
          style={{ width: '800px' }}
        >
          <div className="flex">
            {/* Categories Sidebar */}
            <div className="w-64 bg-gray-50/90 backdrop-blur-sm border-r border-gray-200">
              <div className="py-2">
                {categories.map((category) => (
                  <button
                    key={category._id}
                    onMouseEnter={() => handleCategoryHover(category._id)}
                    onClick={(e) => handleCategoryClick(category, e)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-all duration-150 ${
                      activeCategory === category._id
                        ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-100/80'
                    }`}
                  >
                    <span>{category.name}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategories Content */}
            {activeCategory && (
              <div className="flex-1 bg-white/90 backdrop-blur-sm">
                {(() => {
                  const category = categories.find(cat => cat._id === activeCategory);
                  return category ? (
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                        {category.name}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {category.subcategories.map((subcategory, index) => (
                          <div key={index} className="space-y-3">
                            <button
                              onClick={() => handleSubcategoryClick(category, subcategory)}
                              className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200 block text-left"
                            >
                              {subcategory.name}
                            </button>
                            <div className="space-y-2">
                              {subcategory.childCategories.map((childCategory, childIndex) => (
                                <button
                                  key={childIndex}
                                  onClick={() => handleChildCategoryClick(category, subcategory, childCategory)}
                                  className="block text-xs text-gray-600 hover:text-blue-600 transition-colors duration-200 text-left leading-relaxed"
                                >
                                  {childCategory}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden fixed inset-0 z-50">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Sidebar */}
        <div 
          ref={menuRef}
          className="absolute left-0 top-0 h-full w-80 bg-white/95 backdrop-blur-md rounded-r-lg overflow-y-auto border-r border-gray-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Categories */}
          <div className="py-2">
            {categories.map((category) => (
              <div key={category._id}>
                <button
                  onClick={(e) => handleCategoryClick(category, e)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                >
                  <span>{category.name}</span>
                  <ChevronRight 
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      activeCategory === category._id ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                
                {/* Expanded Subcategories */}
                {activeCategory === category._id && (
                  <div className="bg-gray-50 border-t border-gray-200">
                    {category.subcategories.map((subcategory, index) => (
                      <div key={index} className="px-6 py-3 border-b border-gray-200 last:border-b-0">
                        <button
                          onClick={() => handleSubcategoryClick(category, subcategory)}
                          className="block w-full text-left text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200 mb-2"
                        >
                          {subcategory.name}
                        </button>
                        <div className="space-y-1">
                          {subcategory.childCategories.map((childCategory, childIndex) => (
                            <button
                              key={childIndex}
                              onClick={() => handleChildCategoryClick(category, subcategory, childCategory)}
                              className="block w-full text-left text-xs text-gray-600 hover:text-blue-600 transition-colors duration-200 py-1"
                            >
                              {childCategory}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default MegaMenu;