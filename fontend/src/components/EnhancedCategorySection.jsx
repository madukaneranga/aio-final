import React, { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

const EnhancedCategoryCard = ({ category, index }) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const imageUrl =
    category.image && category.image.length > 0 ? category.image[0] : null;

  // Professional gradient backgrounds for categories without images
  const gradients = [
    "from-purple-600 via-blue-600 to-cyan-600",
    "from-pink-500 via-red-500 to-yellow-500",
    "from-green-500 via-teal-500 to-blue-500",
    "from-indigo-600 via-purple-600 to-pink-600",
    "from-orange-500 via-red-500 to-pink-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-violet-600 via-purple-600 to-blue-600",
    "from-amber-500 via-orange-500 to-red-500",
  ];

  const selectedGradient = gradients[index % gradients.length];

  return (
    <Link to={`/products?category=${encodeURIComponent(category.name)}`}>
      <div className="group cursor-pointer flex-none">
        <div className="relative w-72 h-40 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-black/20 hover:scale-[1.02] transform">
          {/* Background Image or Gradient */}
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={category.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={handleImageError}
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${selectedGradient}`}
            />
          )}

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-between p-6">
            {/* Top Section - Category Stats */}
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                <Sparkles className="w-3 h-3 text-white" />
                <span className="text-xs text-white font-medium">Popular</span>
              </div>
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <ArrowUpRight className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Bottom Section - Category Info */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white leading-tight drop-shadow-lg">
                {category.name}
              </h3>
              <div className="flex items-center space-x-4 text-white/80">
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-xs font-medium">Trending</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3" />
                  <span className="text-xs font-medium">1.2k+ items</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hover Animation Border */}
          <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-white/30 transition-all duration-300" />
        </div>
      </div>
    </Link>
  );
};

const EnhancedCategorySection = ({
  categories,
  title = "Explore Categories",
}) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollAmount = 300;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;

    if (direction === "left") {
      if (container.scrollLeft <= 0) {
        container.scrollTo({ left: maxScrollLeft, behavior: "smooth" });
      } else {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      }
    } else {
      if (container.scrollLeft >= maxScrollLeft) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  // Enhanced mock data with professional categories
  const enhancedCategories =
    categories && categories.length > 0
      ? categories
      : [
          {
            _id: 1,
            name: "Digital Marketing & SEO",
            image: [
              "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
            ],
          },
          {
            _id: 2,
            name: "Web Development & Design",
            image: [
              "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop",
            ],
          },
          {
            _id: 3,
            name: "Graphic Design & Branding",
            image: [
              "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop",
            ],
          },
          {
            _id: 4,
            name: "Business Consulting",
            image: [
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop",
            ],
          },
          {
            _id: 5,
            name: "Content Creation & Copywriting",
            image: [
              "https://images.unsplash.com/photo-1486312338219-ce68e2c6b81d?w=600&h=400&fit=crop",
            ],
          },
          {
            _id: 6,
            name: "Photography & Video",
            image: [
              "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&h=400&fit=crop",
            ],
          },
          {
            _id: 7,
            name: "E-commerce Solutions",
            image: [
              "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop",
            ],
          },
          {
            _id: 8,
            name: "Legal & Financial Services",
            image: [
              "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=400&fit=crop",
            ],
          },
        ];

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 leading-tight font-sans">
            {title}
          </h2>
        </div>

        {/* Categories Carousel */}
        <div className="relative">
          {/* Navigation Buttons */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-xl border border-gray-100 flex items-center justify-center hover:bg-gray-50 hover:shadow-2xl transition-all duration-300 group"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 group-hover:text-black transition-colors" />
          </button>

          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-xl border border-gray-100 flex items-center justify-center hover:bg-gray-50 hover:shadow-2xl transition-all duration-300 group"
          >
            <ChevronRight className="w-6 h-6 text-gray-600 group-hover:text-black transition-colors" />
          </button>

          {/* Categories Container */}
          <div className="mx-16">
            <div
              ref={scrollRef}
              className="flex space-x-6 overflow-x-auto scrollbar-hide pb-4"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitScrollbar: { display: "none" },
              }}
            >
              {enhancedCategories.map((category, index) => (
                <EnhancedCategoryCard
                  key={category._id}
                  category={category}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnhancedCategorySection;
