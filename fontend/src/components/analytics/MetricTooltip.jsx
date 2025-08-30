import React, { useState } from "react";
import { HelpCircle, X } from "lucide-react";

const MetricTooltip = ({ title, description, businessImpact, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e) => {
    const rect = e.target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    setPosition({
      top: rect.top + scrollTop - 10,
      left: rect.left + rect.width + 10
    });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <button
        className={`inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => e.preventDefault()}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isVisible && (
        <>
          {/* Mobile overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
            onClick={() => setIsVisible(false)}
          />
          
          {/* Tooltip */}
          <div
            className={`
              fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs
              ${window.innerWidth < 768 
                ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' 
                : ''
              }
            `}
            style={window.innerWidth >= 768 ? {
              top: `${position.top}px`,
              left: `${position.left}px`,
            } : {}}
          >
            {/* Mobile close button */}
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 md:hidden"
              onClick={() => setIsVisible(false)}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
              <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
              {businessImpact && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-blue-600 font-medium">💡 Why it matters:</p>
                  <p className="text-xs text-blue-700 mt-1">{businessImpact}</p>
                </div>
              )}
            </div>

            {/* Arrow for desktop */}
            <div className="hidden md:block absolute top-3 -left-1 w-2 h-2 bg-white border-l border-t border-gray-200 transform rotate-45" />
          </div>
        </>
      )}
    </>
  );
};

export default MetricTooltip;