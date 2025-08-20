import React, { useState, useEffect } from "react";
import { ArrowRight, Play, Star, ShoppingBag, Heart } from "lucide-react";

export default function CustomizableEcommerceBanner({
  // API Configuration
  apiEndpoint = null,

  // Banner Configuration
  bannerConfig = {
    height: "500px", // Desktop height
    mobileHeight: "350px", // Mobile height
    tabletHeight: "450px", // Tablet height
    layout: "split", // "split", "overlay", "product-focus"
    mobileLayout: "stacked", // "stacked", "overlay", "product-only"
    showProductCarousel: true,
    maxProducts: 3,
    mobileMaxProducts: 1, // Show fewer products on mobile
    topMargin: "0px", // Desktop header space
    mobileTopMargin: "0px", // Mobile header space
    bottomMargin: "0px",
    containerPadding: "1.5rem",
    mobilePadding: "1rem",
  },

  // Brand Configuration
  brandConfig = {
    name: "LUXE",
    tagline: "Premium Collection 2025",
    heroTitle: "REDEFINE YOUR STYLE",
    mobileHeroTitle: "REDEFINE\nYOUR STYLE", // Shorter for mobile
    description:
      "Discover premium products designed for the modern minimalist.",
    mobileDescription: "Premium products for modern minimalists.", // Shorter for mobile
    currency: "LKR",
    locale: "Sri Lanka",
  },

  // Theme Configuration
  themeConfig = {
    primaryColor: "white",
    secondaryColor: "gray-400",
    backgroundColor: "black",
    gradientFrom: "black",
    gradientTo: "gray-900",
    transparency: false,
    overlayOpacity: 0.8,
  },

  // Content Configuration
  contentConfig = {
    showRatings: true,
    showDiscounts: true,
    showStock: true,
    autoSlide: true,
    slideInterval: 4000,
    showTrustBadges: true,
    compactMode: true,
    mobileAutoSlide: false, // Disable auto-slide on mobile for better UX
    touchSwipe: true, // Enable touch swipe on mobile
  },

  // CTA Configuration
  ctaConfig = {
    primaryButton: {
      text: "Shop Now",
      mobileText: "Shop", // Shorter text for mobile
      action: () => console.log("Primary CTA clicked"),
    },
    secondaryButton: {
      text: "Explore",
      mobileText: "View All",
      action: () => console.log("Secondary CTA clicked"),
      show: true,
      showOnMobile: false, // Hide secondary button on mobile to save space
    },
  },

  // Trust Badges (compact)
  trustBadges = ["4.9★ (2.3k)", "Free Shipping", "30-day Returns"],
  mobileTrustBadges = ["4.9★", "Free Ship", "Returns"], // Shorter for mobile

  // Default Products (fallback if API fails)
  defaultProducts = [
    {
      id: 1,
      name: "Minimalist Watch",
      price: 89700,
      originalPrice: 119700,
      image:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=500&fit=crop&auto=format",
      category: "Watches",
      discount: 25,
      inStock: true,
      rating: 4.9,
    },
    {
      id: 2,
      name: "Premium Leather",
      price: 56700,
      originalPrice: 74700,
      image:
        "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/sales%2Fsale.png?alt=media&token=131461b9-f22b-41fc-b8e8-3d467401d3d7",
      category: "Accessories",
      discount: 24,
      inStock: true,
      rating: 4.8,
    },
    {
      id: 3,
      name: "Tech Essentials",
      price: 179700,
      originalPrice: 239700,
      image:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop&auto=format",
      category: "Technology",
      discount: 25,
      inStock: false,
      rating: 4.9,
    },
  ],

  // Event Handlers
  onAddToCart = () => {},
  onProductClick = () => {},
  onWishlist = () => {},
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Responsive breakpoint detection
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Set products based on screen size
  useEffect(() => {
    const maxProducts = isMobile ? bannerConfig.mobileMaxProducts : bannerConfig.maxProducts;
    setProducts(defaultProducts.slice(0, maxProducts));
  }, [isMobile, bannerConfig.maxProducts, bannerConfig.mobileMaxProducts]);

  // API Data Fetching
  useEffect(() => {
    const fetchProducts = async () => {
      if (!apiEndpoint) return;

      setLoading(true);
      try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) throw new Error("Failed to fetch products");

        const data = await response.json();
        const maxProducts = isMobile ? bannerConfig.mobileMaxProducts : bannerConfig.maxProducts;
        const fetchedProducts = (data.products || data || defaultProducts).slice(0, maxProducts);
        setProducts(fetchedProducts);
      } catch (err) {
        console.error("API Error:", err);
        const maxProducts = isMobile ? bannerConfig.mobileMaxProducts : bannerConfig.maxProducts;
        setProducts(defaultProducts.slice(0, maxProducts));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [apiEndpoint, isMobile]);

  // Auto-slide functionality (disabled on mobile if configured)
  useEffect(() => {
    setIsLoaded(true);
    const shouldAutoSlide = isMobile ? contentConfig.mobileAutoSlide : contentConfig.autoSlide;
    
    if (shouldAutoSlide && products.length > 1 && bannerConfig.showProductCarousel) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % products.length);
      }, contentConfig.slideInterval);
      return () => clearInterval(interval);
    }
  }, [products.length, contentConfig.autoSlide, contentConfig.mobileAutoSlide, isMobile]);

  // Mouse tracking for interactive background (disabled on mobile)
  useEffect(() => {
    if (isMobile) return;
    
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isMobile]);

  // Touch swipe handling
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    if (!contentConfig.touchSwipe) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    if (!contentConfig.touchSwipe) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!contentConfig.touchSwipe || !touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentSlide < products.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  // Utility Functions
  const formatPrice = (price) => {
    return `${brandConfig.currency} ${price.toLocaleString()}`;
  };

  const renderStars = (rating, size = "w-3 h-3") => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`${size} ${
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : "text-gray-400"
        }`}
      />
    ));
  };

  // Get responsive values
  const getHeight = () => {
    if (isMobile) return bannerConfig.mobileHeight;
    if (isTablet) return bannerConfig.tabletHeight;
    return bannerConfig.height;
  };

  const getLayout = () => {
    return isMobile ? bannerConfig.mobileLayout : bannerConfig.layout;
  };

  const getMarginTop = () => {
    return isMobile ? bannerConfig.mobileTopMargin : bannerConfig.topMargin;
  };

  const getPadding = () => {
    return isMobile ? bannerConfig.mobilePadding : bannerConfig.containerPadding;
  };

  const getHeroTitle = () => {
    return isMobile && brandConfig.mobileHeroTitle ? brandConfig.mobileHeroTitle : brandConfig.heroTitle;
  };

  const getDescription = () => {
    return isMobile && brandConfig.mobileDescription ? brandConfig.mobileDescription : brandConfig.description;
  };

  const getTrustBadges = () => {
    return isMobile ? mobileTrustBadges : trustBadges;
  };

  return (
    <div
      className={`relative w-full ${
        themeConfig.transparency
          ? "bg-transparent"
          : `bg-${themeConfig.backgroundColor}`
      } text-${themeConfig.primaryColor} overflow-hidden`}
      style={{ 
        height: getHeight(),
        marginTop: getMarginTop(),
        marginBottom: bannerConfig.bottomMargin 
      }}
    >
      {/* Conditional Background - Only show if not transparent */}
      {!themeConfig.transparency && (
        <div className="absolute inset-0">
          <div
            className={`absolute inset-0 bg-gradient-to-br from-${themeConfig.gradientFrom} via-${themeConfig.backgroundColor} to-${themeConfig.gradientTo}`}
            style={{ opacity: themeConfig.overlayOpacity }}
          />
          {!isMobile && (
            <div
              className="absolute inset-0 opacity-5"
              style={{
                background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.1), transparent 40%)`,
              }}
            />
          )}
        </div>
      )}

      {/* Transparent Overlay Mode - Shows over existing background */}
      {themeConfig.transparency && (
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60"
            style={{ opacity: themeConfig.overlayOpacity }}
          />
          {!isMobile && (
            <div
              className="absolute inset-0 opacity-10"
              style={{
                background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.2), transparent 40%)`,
              }}
            />
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}

      {/* Main Banner Content */}
      <div 
        className="relative z-40 h-full flex items-center"
        style={{ padding: getPadding() }}
      >
        <div className="max-w-7xl mx-auto w-full">
          
          {/* Split Layout (Desktop) / Stacked Layout (Mobile) */}
          {(getLayout() === "split" || getLayout() === "stacked") && (
            <div className={`${
              getLayout() === "split" ? "grid lg:grid-cols-2 gap-8 items-center" : 
              "flex flex-col space-y-6"
            } h-full`}>
              
              {/* Content Section */}
              <div
                className={`${
                  getLayout() === "stacked" ? "order-1 text-center lg:text-left" : ""
                } space-y-4 lg:space-y-6 transform transition-all duration-1000 ${
                  isLoaded
                    ? "translate-y-0 opacity-100"
                    : "translate-y-10 opacity-0"
                }`}
              >
                <div className="space-y-3 lg:space-y-4">
                  <div
                    className={`text-xs lg:text-sm uppercase tracking-[0.3em] text-${themeConfig.secondaryColor} font-light`}
                  >
                    {brandConfig.tagline}
                  </div>
                  <h1 className={`${
                    isMobile ? "text-2xl sm:text-3xl" : "text-3xl md:text-4xl lg:text-5xl"
                  } font-bold leading-tight tracking-tight`}>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 whitespace-pre-line">
                      {getHeroTitle()}
                    </span>
                  </h1>
                  <p
                    className={`${
                      isMobile ? "text-sm" : "text-base"
                    } text-${themeConfig.secondaryColor} ${
                      getLayout() === "stacked" ? "max-w-2xl mx-auto lg:mx-0" : "max-w-md"
                    } leading-relaxed`}
                  >
                    {getDescription()}
                  </p>
                </div>

                <div className={`flex ${
                  isMobile ? "flex-col space-y-3" : "flex-col sm:flex-row"
                } gap-3 ${getLayout() === "stacked" ? "justify-center lg:justify-start" : ""}`}>
                  <button
                    onClick={ctaConfig.primaryButton.action}
                    className={`group relative ${
                      isMobile ? "px-8 py-3 text-sm" : "px-6 py-3"
                    } bg-${themeConfig.primaryColor} text-${themeConfig.backgroundColor} font-semibold overflow-hidden transition-all duration-300 hover:scale-105 rounded-lg touch-manipulation`}
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {isMobile ? ctaConfig.primaryButton.mobileText : ctaConfig.primaryButton.text}
                      <ArrowRight className={`ml-2 ${isMobile ? "w-4 h-4" : "w-4 h-4"} transition-transform group-hover:translate-x-1`} />
                    </span>
                  </button>

                  {ctaConfig.secondaryButton.show && (!isMobile || ctaConfig.secondaryButton.showOnMobile) && (
                    <button
                      onClick={ctaConfig.secondaryButton.action}
                      className={`group ${
                        isMobile ? "px-8 py-3 text-sm" : "px-6 py-3"
                      } border border-${themeConfig.primaryColor}/20 backdrop-blur-sm hover:bg-${themeConfig.primaryColor}/10 transition-all duration-300 flex items-center justify-center rounded-lg touch-manipulation`}
                    >
                      <Play className={`mr-2 ${isMobile ? "w-4 h-4" : "w-4 h-4"}`} />
                      {isMobile ? ctaConfig.secondaryButton.mobileText : ctaConfig.secondaryButton.text}
                    </button>
                  )}
                </div>

                {contentConfig.showTrustBadges && (
                  <div
                    className={`flex ${
                      isMobile ? "flex-wrap justify-center lg:justify-start gap-2" : "flex-wrap items-center gap-4"
                    } text-xs text-${themeConfig.secondaryColor}`}
                  >
                    {getTrustBadges().map((badge, index) => (
                      <span key={index} className="whitespace-nowrap">
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Showcase */}
              {bannerConfig.showProductCarousel && (
                <div
                  className={`${
                    getLayout() === "stacked" ? "order-2" : ""
                  } relative transform transition-all duration-1000 delay-300 ${
                    isLoaded
                      ? "translate-y-0 opacity-100"
                      : "translate-y-10 opacity-0"
                  }`}
                >
                  <div className="relative">
                    {/* Product Display */}
                    <div 
                      className="relative overflow-hidden rounded-xl"
                      onTouchStart={onTouchStart}
                      onTouchMove={onTouchMove}
                      onTouchEnd={onTouchEnd}
                    >
                      <div
                        className="flex transition-transform duration-700 ease-in-out"
                        style={{
                          transform: `translateX(-${currentSlide * 100}%)`,
                        }}
                      >
                        {products.map((product) => (
                          <div
                            key={product.id}
                            className="w-full flex-shrink-0"
                          >
                            <div
                              className="relative group cursor-pointer"
                              onClick={() => onProductClick(product)}
                            >
                              <div className={`${
                                isMobile ? "aspect-[16/9]" : "aspect-[4/3]"
                              } overflow-hidden bg-gray-900 rounded-xl`}>
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                                {/* Compact Discount Badge */}
                                {contentConfig.showDiscounts && product.discount && (
                                  <div
                                    className={`absolute top-2 left-2 lg:top-3 lg:left-3 bg-${themeConfig.primaryColor} text-${themeConfig.backgroundColor} px-2 py-1 text-xs font-bold rounded`}
                                  >
                                    -{product.discount}%
                                  </div>
                                )}

                                {/* Stock Status */}
                                {contentConfig.showStock && !product.inStock && (
                                  <div className="absolute top-2 right-2 lg:top-3 lg:right-3 bg-red-600 text-white px-2 py-1 text-xs font-bold rounded">
                                    {isMobile ? "Out" : "Sold Out"}
                                  </div>
                                )}
                              </div>

                              {/* Product Info Overlay */}
                              <div className="absolute bottom-3 left-3 right-3 lg:bottom-4 lg:left-4 lg:right-4">
                                <div
                                  className={`text-xs uppercase tracking-wider text-${themeConfig.secondaryColor} mb-1`}
                                >
                                  {product.category}
                                </div>
                                <h3 className={`${
                                  isMobile ? "text-base" : "text-lg"
                                } font-bold mb-2 line-clamp-1`}>
                                  {product.name}
                                </h3>

                                {contentConfig.showRatings && product.rating && (
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div className="flex items-center">
                                      {renderStars(product.rating, "w-3 h-3")}
                                    </div>
                                    <span
                                      className={`text-xs text-${themeConfig.secondaryColor}`}
                                    >
                                      {product.rating}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center space-x-2">
                                  <span className={`${
                                    isMobile ? "text-base" : "text-lg"
                                  } font-bold`}>
                                    {formatPrice(product.price)}
                                  </span>
                                  {product.originalPrice && (
                                    <span
                                      className={`text-sm text-${themeConfig.secondaryColor} line-through`}
                                    >
                                      {formatPrice(product.originalPrice)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Hover/Touch Actions */}
                              <div className={`absolute ${
                                isMobile ? "top-2 right-2" : "top-3 right-3"
                              } flex flex-col gap-2 ${
                                isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              } transition-opacity duration-300`}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onWishlist(product);
                                  }}
                                  className={`p-2 bg-${themeConfig.primaryColor}/20 backdrop-blur-md rounded-lg hover:bg-${themeConfig.primaryColor}/30 transition-colors touch-manipulation`}
                                >
                                  <Heart className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCart(product);
                                  }}
                                  disabled={!product.inStock}
                                  className={`p-2 backdrop-blur-md rounded-lg transition-all duration-300 touch-manipulation ${
                                    product.inStock
                                      ? `bg-${themeConfig.primaryColor}/20 hover:bg-${themeConfig.primaryColor} hover:text-${themeConfig.backgroundColor} cursor-pointer`
                                      : "bg-gray-500/50 cursor-not-allowed"
                                  }`}
                                >
                                  <ShoppingBag className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Slide Indicators */}
                    {products.length > 1 && (
                      <div className="flex justify-center mt-4 space-x-1">
                        {products.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`${
                              isMobile ? "h-2 touch-manipulation" : "h-1.5"
                            } rounded-full transition-all duration-300 ${
                              currentSlide === index
                                ? `bg-${themeConfig.primaryColor} ${isMobile ? "w-8" : "w-6"}`
                                : `bg-${themeConfig.primaryColor}/30 ${isMobile ? "w-2" : "w-1.5"}`
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Overlay Layout */}
          {getLayout() === "overlay" && (
            <div className="relative h-full flex items-center justify-center text-center">
              <div
                className={`space-y-4 lg:space-y-6 max-w-3xl mx-auto transform transition-all duration-1000 ${
                  isLoaded
                    ? "translate-y-0 opacity-100"
                    : "translate-y-10 opacity-0"
                }`}
              >
                <div
                  className={`text-xs lg:text-sm uppercase tracking-[0.3em] text-${themeConfig.secondaryColor} font-light`}
                >
                  {brandConfig.tagline}
                </div>
                <h1 className={`${
                  isMobile ? "text-3xl sm:text-4xl" : "text-4xl md:text-6xl"
                } font-bold leading-tight tracking-tight`}>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 whitespace-pre-line">
                    {getHeroTitle()}
                  </span>
                </h1>
                <p
                  className={`${
                    isMobile ? "text-base" : "text-lg"
                  } text-${themeConfig.secondaryColor} max-w-2xl mx-auto`}
                >
                  {getDescription()}
                </p>
                <div className={`flex ${
                  isMobile ? "flex-col space-y-3" : "flex-col sm:flex-row gap-4"
                } justify-center`}>
                  <button
                    onClick={ctaConfig.primaryButton.action}
                    className={`${
                      isMobile ? "px-8 py-4 text-sm" : "px-8 py-4"
                    } bg-${themeConfig.primaryColor} text-${themeConfig.backgroundColor} font-semibold hover:scale-105 transition-transform duration-300 rounded-lg touch-manipulation`}
                  >
                    {isMobile ? ctaConfig.primaryButton.mobileText : ctaConfig.primaryButton.text}
                    <ArrowRight className="ml-2 w-5 h-5 inline" />
                  </button>
                  {ctaConfig.secondaryButton.show && (!isMobile || ctaConfig.secondaryButton.showOnMobile) && (
                    <button
                      onClick={ctaConfig.secondaryButton.action}
                      className={`${
                        isMobile ? "px-8 py-4 text-sm" : "px-8 py-4"
                      } border border-${themeConfig.primaryColor}/20 hover:bg-${themeConfig.primaryColor}/10 transition-colors duration-300 rounded-lg touch-manipulation`}
                    >
                      <Play className="mr-2 w-5 h-5 inline" />
                      {isMobile ? ctaConfig.secondaryButton.mobileText : ctaConfig.secondaryButton.text}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}