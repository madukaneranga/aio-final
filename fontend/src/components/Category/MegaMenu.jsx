import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';

// Add custom animations
const styles = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-20px);
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`;

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

  // Inject styles
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const styleTag = document.createElement('style');
      styleTag.textContent = styles;
      document.head.appendChild(styleTag);
      
      return () => {
        if (styleTag.parentNode) {
          styleTag.parentNode.removeChild(styleTag);
        }
      };
    }
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Desktop Menu */}
      <div className="hidden lg:block fixed top-16 left-0 right-0 z-40 flex justify-center">
        <div 
          ref={menuRef}
          className="mt-2 bg-white backdrop-blur-xl border border-gray-100 shadow-2xl rounded-2xl overflow-hidden transform transition-all duration-300 ease-out"
          onMouseLeave={handleMenuLeave}
          onMouseEnter={handleMenuEnter}
          style={{ 
            maxWidth: 'calc(100vw - 40px)',
            width: 'fit-content',
            minWidth: '900px',
            maxHeight: 'calc(100vh - 80px)',
            animation: isOpen ? 'slideDown 0.3s ease-out' : 'slideUp 0.3s ease-out'
          }}
        >
            <div className="flex min-h-[500px] max-h-full overflow-hidden">
              {/* Categories Sidebar */}
              <div className="w-80 bg-gradient-to-b from-gray-50 to-gray-100/80 border-r border-gray-200">
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Browse Categories
                  </div>
                  {categories.map((category) => (
                    <button
                      key={category._id}
                      onMouseEnter={() => handleCategoryHover(category._id)}
                      onClick={(e) => handleCategoryClick(category, e)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 mx-2 rounded-xl text-left text-sm font-medium transition-all duration-300 group ${
                        activeCategory === category._id
                          ? 'bg-black text-white shadow-lg transform scale-[1.02]'
                          : 'text-gray-700 hover:bg-white hover:shadow-md hover:transform hover:scale-[1.01]'
                      }`}
                    >
                      <span className="flex-1">{category.name}</span>
                      <ChevronRight className={`w-4 h-4 transition-all duration-300 ${
                        activeCategory === category._id 
                          ? 'text-white transform rotate-90' 
                          : 'text-gray-400 group-hover:text-gray-600 group-hover:transform group-hover:translate-x-1'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategories Content */}
              <div className="flex-1 bg-white overflow-y-auto">
                {activeCategory && (
                  <div className="animate-fadeIn">
                    {(() => {
                      const category = categories.find(cat => cat._id === activeCategory);
                      return category ? (
                        <div className="p-8">
                          <div className="flex items-center mb-8">
                            <div className="w-2 h-8 bg-black rounded-full mr-4"></div>
                            <h3 className="text-2xl font-bold text-gray-900">
                              {category.name}
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                            {category.subcategories.map((subcategory, index) => (
                              <div key={index} className="group">
                                <button
                                  onClick={() => handleSubcategoryClick(category, subcategory)}
                                  className="text-base font-bold text-gray-900 hover:text-black transition-all duration-300 block text-left mb-4 group-hover:transform group-hover:translate-x-2"
                                >
                                  {subcategory.name}
                                </button>
                                <div className="space-y-2 pl-0 group-hover:pl-4 transition-all duration-300">
                                  {subcategory.childCategories.map((childCategory, childIndex) => (
                                    <button
                                      key={childIndex}
                                      onClick={() => handleChildCategoryClick(category, subcategory, childCategory)}
                                      className="block text-sm text-gray-600 hover:text-black hover:font-medium transition-all duration-300 text-left leading-relaxed py-1 hover:transform hover:translate-x-2"
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
                {!activeCategory && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ChevronRight className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-lg font-medium">Hover over a category to explore</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="lg:hidden fixed inset-0 z-50">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
        
        {/* Sidebar */}
        <div 
          ref={menuRef}
          className="absolute left-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-hidden"
          style={{
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)'
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-black to-gray-800 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Browse Categories</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          {/* Categories */}
          <div className="overflow-y-auto h-full pb-24">
            <div className="py-4">
              {categories.map((category, categoryIndex) => (
                <div key={category._id} className="mb-2">
                  <button
                    onClick={(e) => handleCategoryClick(category, e)}
                    className={`w-full flex items-center justify-between px-6 py-4 text-left font-medium transition-all duration-300 group ${
                      activeCategory === category._id
                        ? 'bg-black text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{category.name}</span>
                    <ChevronRight 
                      className={`w-5 h-5 transition-all duration-300 ${
                        activeCategory === category._id 
                          ? 'rotate-90 text-white' 
                          : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                    />
                  </button>
                  
                  {/* Expanded Subcategories */}
                  <div className={`overflow-hidden transition-all duration-300 ease-out ${
                    activeCategory === category._id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="bg-gradient-to-b from-gray-50 to-gray-100 border-y border-gray-200">
                      {category.subcategories.map((subcategory, index) => (
                        <div key={index} className="px-8 py-4 border-b border-gray-200/50 last:border-b-0">
                          <button
                            onClick={() => handleSubcategoryClick(category, subcategory)}
                            className="block w-full text-left text-base font-semibold text-gray-900 hover:text-black transition-all duration-200 mb-3"
                          >
                            {subcategory.name}
                          </button>
                          <div className="space-y-2 pl-4 border-l-2 border-gray-300">
                            {subcategory.childCategories.map((childCategory, childIndex) => (
                              <button
                                key={childIndex}
                                onClick={() => handleChildCategoryClick(category, subcategory, childCategory)}
                                className="block w-full text-left text-sm text-gray-600 hover:text-black hover:font-medium transition-all duration-200 py-1"
                              >
                                {childCategory}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MegaMenu;