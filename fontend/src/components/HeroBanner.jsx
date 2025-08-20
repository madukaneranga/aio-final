import React from "react";
import { ArrowRight } from "lucide-react";

// Hero Banner Component
const HeroBanner = ({
  // Content props
  headline = "Discover Amazing Products",
  description = "Experience quality and style like never before",
  ctaButtonText = "SHOP NOW",
  ctaButtonLink = "/shop",
  badgeText = "NEW COLLECTION",
  showBadge = true,
  showCtaButton = true,

  // Design props
  backgroundColor = "linear-gradient(135deg, #667eea, #764ba2)",
  backgroundImage = null, // URL for background image
  textColor = "#ffffff",
  accentColor = "#ffff00", // Color for badge and accents
  buttonBgColor = "#ffffff",
  buttonTextColor = "#000000",

  // Image props
  heroImage = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500&h=400&fit=crop&format=png",
  heroImageAlt = "Hero Image",
  showHeroImage = true,

  // Layout props
  className = "",
  minHeight = "500px",
}) => {
  const backgroundStyle = backgroundImage
    ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: backgroundColor };

  return (
    <section
      className={`relative overflow-hidden ${className}`}
      style={{ ...backgroundStyle, minHeight }}
    >
      {/* Background Pattern/Glow Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-20 w-48 h-48 bg-white rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white rounded-full blur-2xl"></div>
        {/* Geometric patterns */}
        <div className="absolute top-5 right-5 w-4 h-4 bg-yellow-300 rotate-45"></div>
        <div className="absolute bottom-20 left-20 w-6 h-6 bg-cyan-300 rotate-12"></div>
        <div className="absolute top-20 right-1/3 w-3 h-3 bg-pink-300 rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 h-full">
        <div
          className="flex flex-col lg:flex-row items-stretch h-full"
          style={{ minHeight }}
        >
          {/* LEFT SIDE - Content */}
          <div
            className="flex-1 flex flex-col justify-center text-center lg:text-left px-4 sm:px-6 lg:px-8 py-12 lg:py-16"
            style={{ color: textColor }}
          >
            {/* Badge */}
            {showBadge && badgeText && (
              <div
                className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 mb-6 mx-auto lg:mx-0 w-fit"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: accentColor }}
                ></div>
                <span className="font-bold text-sm">{badgeText}</span>
              </div>
            )}

            {/* Main Headline */}
            <h1 className="text-4xl lg:text-6xl font-black mb-6 leading-tight">
              {headline}
            </h1>

            {/* Description */}
            <p className="text-lg lg:text-xl mb-8 opacity-90 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {description}
            </p>

            {/* CTA Button */}
            {showCtaButton && ctaButtonText && (
              <a href={ctaButtonLink} className="inline-block">
                <button
                  type="button"
                  className="font-bold text-lg px-8 py-4 rounded-lg transition-all duration-300 shadow-xl hover:scale-105 flex items-center gap-3 mx-auto lg:mx-0 w-fit hover:shadow-2xl"
                  style={{
                    backgroundColor: buttonBgColor,
                    color: buttonTextColor,
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.filter = "brightness(0.9)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.filter = "brightness(1)";
                  }}
                >
                  {ctaButtonText}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </a>
            )}
          </div>

          {/* RIGHT SIDE - Hero Image */}
          {showHeroImage && heroImage && (
            <div className="hidden lg:block flex-1">
              <img
                src={heroImage}
                alt={heroImageAlt}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// Hero Section Carousel Component (updated to use HeroBanner)
const HeroSectionCarousel = ({
  banners = [],
  autoSlideInterval = 5000,
  showControls = true,
  showDots = true,
  pauseOnHover = true,
  enableSwipe = true,
  transitionDuration = 500,
  className = "",
}) => {
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const touchStartX = React.useRef(0);
  const touchEndX = React.useRef(0);
  const autoSlideRef = React.useRef(null);

  // Auto-slide functionality
  React.useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    autoSlideRef.current = setInterval(() => {
      nextSlide();
    }, autoSlideInterval);

    return () => {
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
      }
    };
  }, [currentSlide, banners.length, autoSlideInterval, isPaused]);

  const nextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev + 1) % banners.length);
    setTimeout(() => setIsTransitioning(false), transitionDuration);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
    setTimeout(() => setIsTransitioning(false), transitionDuration);
  };

  const goToSlide = (index) => {
    if (isTransitioning || index === currentSlide) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), transitionDuration);
  };

  // Touch/Swipe handlers
  const handleTouchStart = (e) => {
    if (!enableSwipe) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (!enableSwipe) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!enableSwipe) return;

    const touchDiff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(touchDiff) > minSwipeDistance) {
      if (touchDiff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  // Mouse handlers for pause on hover
  const handleMouseEnter = () => {
    if (pauseOnHover) {
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      setIsPaused(false);
    }
  };

  if (!banners || banners.length === 0) {
    return (
      <div className="w-full h-[500px] bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-lg">No banners to display</p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Banner Container */}
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{
          transform: `translateX(-${currentSlide * 100}%)`,
          transitionDuration: `${transitionDuration}ms`,
        }}
      >
        {banners.map((banner, index) => (
          <div key={index} className="w-full flex-shrink-0">
            <HeroBanner {...banner} />
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      {showControls && banners.length > 1 && (
        <>
          {/* Previous Button */}
          <button
            onClick={prevSlide}
            disabled={isTransitioning}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous slide"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Next Button */}
          <button
            onClick={nextSlide}
            disabled={isTransitioning}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next slide"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {showDots && banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              disabled={isTransitioning}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-white scale-125 shadow-lg"
                  : "bg-white/50 hover:bg-white/80 hover:scale-110"
              } disabled:cursor-not-allowed`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress Bar 
      {banners.length > 1 && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-black/20 z-10">
          <div
            className="h-full bg-white/80 transition-all ease-linear"
            style={{
              width: `${((currentSlide + 1) / banners.length) * 100}%`,
              transitionDuration: isPaused ? "0ms" : `${autoSlideInterval}ms`,
            }}
          />
        </div>
      )}*/}
    </div>
  );
};

// Demo Component with sample hero banners
const HeroDemo = () => {
  const sampleBanners = [
    {
      headline: "Discover Your Style",
      description:
        "Explore our curated collection of premium fashion and accessories that define modern elegance.",
      badgeText: "NEW COLLECTION",
      ctaButtonText: "EXPLORE NOW",
      ctaButtonLink: "/collections",
      backgroundColor: "linear-gradient(135deg, #667eea, #764ba2)",
      accentColor: "#ffff00",
      heroImage:
        "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/sales%2Fsale.png?alt=media&token=131461b9-f22b-41fc-b8e8-3d467401d3d7",
      showBadge: true,
      showCtaButton: true,
    },
    {
      headline: "Tech Revolution",
      description:
        "Experience the latest in technology with our cutting-edge gadgets and innovative solutions.",
      badgeText: "INNOVATION HUB",
      ctaButtonText: "DISCOVER TECH",
      ctaButtonLink: "/tech",
      backgroundColor: "linear-gradient(135deg, #000428, #004e92)",
      accentColor: "#00ff88",
      heroImage:
        "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/sales%2Fsale.png?alt=media&token=131461b9-f22b-41fc-b8e8-3d467401d3d7",
      showBadge: true,
      showCtaButton: true,
    },
    {
      headline: "Lifestyle Reimagined",
      description:
        "Transform your everyday with products designed for the modern lifestyle. Quality meets innovation.",
      badgeText: "FEATURED",
      ctaButtonText: "SHOP LIFESTYLE",
      ctaButtonLink: "/lifestyle",
      backgroundColor: "linear-gradient(135deg, #ff9a56, #ff6b6b)",
      accentColor: "#ffffff",
      buttonBgColor: "#000000",
      buttonTextColor: "#ffffff",
      heroImage:
        "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/sales%2Fsale.png?alt=media&token=131461b9-f22b-41fc-b8e8-3d467401d3d7",
      showBadge: true,
      showCtaButton: true,
    },
  ];

  return (
    <div className="w-full">
      <HeroSectionCarousel
        banners={sampleBanners}
        autoSlideInterval={6000}
        showControls={true}
        showDots={true}
        pauseOnHover={true}
        enableSwipe={true}
        transitionDuration={500}
      />
    </div>
  );
};

export default HeroDemo;
