import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CategoryCard from './CategoryCard';


const CategorySection = ({ categories, title = "Categories" }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (!container || !categories?.length) return;

    const scrollAmount = 280; // Card width (256px) + gap (16px) + some buffer
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    
    if (direction === 'left') {
      if (container.scrollLeft <= 0) {
        // If at the beginning, jump to the end
        container.scrollTo({ left: maxScrollLeft, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }
    } else {
      if (container.scrollLeft >= maxScrollLeft) {
        // If at the end, jump to the beginning
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  // Mock data for demo - matches your category structure
  const mockCategories = categories || [
    { 
      _id: 1, 
      name: "Electronics & Tech", 
      image: ["https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400"] 
    },
    { 
      _id: 2, 
      name: "Fashion & Style", 
      image: ["https://images.unsplash.com/photo-1445205170230-053b83016050?w=400"] 
    },
    { 
      _id: 3, 
      name: "Home & Garden", 
      image: ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400"] 
    },
    { 
      _id: 4, 
      name: "Sports & Outdoors", 
      image: ["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400"] 
    },
    { 
      _id: 5, 
      name: "Books & Media", 
      image: ["https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400"] 
    },
    { 
      _id: 6, 
      name: "Health & Beauty", 
      image: ["https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400"] 
    },
    { 
      _id: 7, 
      name: "Automotive", 
      image: ["https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=400"] 
    },
    { 
      _id: 8, 
      name: "Arts & Crafts", 
      image: ["https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400"] 
    }
  ];

  return (
    <section className="py-6 bg-white">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-medium text-black">
            {title}
          </h2>
        </div>

        {/* Categories Swiper with Side Navigation */}
        <div className="relative">
          {/* Left Navigation Button */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* Right Navigation Button */}
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>

          {/* Categories Container */}
          <div className="mx-12">
            <div
              ref={scrollRef}
              className="flex space-x-4 overflow-x-auto scrollbar-hide pb-2"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitScrollbar: { display: 'none' }
              }}
            >
              {mockCategories.map((category) => (
                <CategoryCard
                  key={category._id}
                  category={category}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategorySection;