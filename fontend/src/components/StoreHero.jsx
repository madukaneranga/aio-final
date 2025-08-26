import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ArrowRight,
  Star,
  Shield,
  Truck,
  Crown,
  Award,
  Users,
  CheckCircle,
  Store,
  MapPin,
  Tag,
} from "lucide-react";
import { use } from "react";

// ✅ FIXED: Properly destructure props
const PremiumHeroSection = ({
  store = {},
  user = {},
  reviews = {},
  onExploreClick,
  onContactClick,
}) => {
  // Mock data - replace with your actual data
  const defaultStore = {
    name: "Art Of Leather ",
    description:
      "Discover extraordinary craftsmanship and timeless elegance in our curated selection of premium products.",
    themeColor: "#000000ff", // Gold
    stats: [{ label: "Sales", value: "1000+" }],
  };
  const heroMediaMock = [
    {
      type: "video",
      src: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
      poster:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
      title: "Luxury Redefined",
    },
    {
      type: "image",
      src: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
      title: "Crafted Perfection",
    },
    {
      type: "image",
      src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
      title: "Timeless Elegance",
    },
  ];
  const [heroMedia, setHeroMedia] = useState(heroMediaMock);

  useEffect(() => {
    console.log("Store Hero Images:", store?.heroImages);
    if (store?.heroImages.length > 0) {
      const newHeroMedia = store.heroImages.map((imageSrc) => ({
        type: "image",
        src: imageSrc,
        title: "",
      }));
      setHeroMedia(newHeroMedia);
    }
  }, [store?.heroImages]); // Add dependency

  // Default user data
  const defaultUser = {
    id: "user_456",
    subscriptionLevel: "Premium",
    favoriteStores: ["store_123"],
    isStoreOwner: false,
    relationshipToStore: "customer",
  };
  // Use passed store prop or fallback to default

  const storeData = { ...defaultStore, ...store };
  const userData = { ...defaultUser, ...user };
  const reviewsData = reviews.length > 0 ? reviews : Array(127).fill({});

  // Color utility functions for elegant theme handling
  const isLightColor = (color) => {
    const getRGB = (color) => {
      if (color.startsWith("#")) {
        const hex = color.slice(1);
        return [
          parseInt(hex.substr(0, 2), 16),
          parseInt(hex.substr(2, 2), 16),
          parseInt(hex.substr(4, 2), 16),
        ];
      }
      if (color.startsWith("rgb")) {
        return color.match(/\d+/g).map(Number);
      }
      const div = document.createElement("div");
      div.style.color = color;
      document.body.appendChild(div);
      const rgb = getComputedStyle(div).color.match(/\d+/g).map(Number);
      document.body.removeChild(div);
      return rgb;
    };

    const [r, g, b] = getRGB(color);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
  };

  const getContrastColor = (bgColor) => {
    return isLightColor(bgColor) ? "#000000" : "#ffffff";
  };

  const getThemeStyles = () => {
    const themeColor = storeData.themeColor || "#000000";
    const isLight = isLightColor(themeColor);

    return {
      primary: themeColor,
      contrast: getContrastColor(themeColor),
      accent: isLight ? `${themeColor}20` : `${themeColor}40`,
      buttonBg: themeColor,
      buttonText: getContrastColor(themeColor),
      buttonHover: isLight ? "#ffffff" : "#000000",
      buttonHoverText: isLight ? "#000000" : "#ffffff",
      textShadow: isLight
        ? "0 4px 8px rgba(0,0,0,0.5)"
        : "0 4px 8px rgba(0,0,0,0.8)",
      buttonShadow: `0 8px 25px ${themeColor}40`,
      brandGlow: `0 0 40px ${themeColor}60`,
      cardBackground: isLight ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
      borderColor: `${themeColor}60`,
    };
  };

  const theme = getThemeStyles();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  // Parallax effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-slide functionality
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroMedia.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPlaying, heroMedia.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroMedia.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroMedia.length) % heroMedia.length);
  };

  const toggleVideoPlayback = () => {
    const video = document.querySelector(".hero-video");
    if (video) {
      if (videoPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setVideoPlaying(!videoPlaying);
    }
  };

  return (
    <>
      {/* ✅ FIXED: Moved CSS keyframes to a separate style tag without jsx attribute */}
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(40px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.9) translateY(30px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(50px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes brandGlow {
            0%, 100% {
              text-shadow: 0 0 20px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 0, 0, 0.4), 0 0 60px rgba(0, 0, 0, 0.2);
            }
            50% {
              text-shadow: 0 0 30px rgba(0, 0, 0, 0.8), 0 0 60px rgba(0, 0, 0, 0.6), 0 0 90px rgba(0, 0, 0, 0.4);
            }
          }
          
          .fade-in-up-1 { animation: fadeInUp 1.2s 0.3s forwards; }
          .fade-in-up-2 { animation: fadeInUp 1s 0.6s forwards; }
          .fade-in-up-3 { animation: fadeInUp 1s 0.9s forwards; }
          .fade-in-up-4 { animation: fadeInScale 1.2s 1.2s forwards; }
          .fade-in-up-5 { animation: fadeInUp 1s 1.5s forwards; }
          .slide-in-right { animation: slideInRight 1.2s 0.8s forwards; }
          .brand-glow { animation: brandGlow 3s ease-in-out infinite; }
        `}
      </style>

      <section className="relative min-h-screen overflow-hidden">
        {/* Background Gradient */}
        <div 
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.1) 0%, transparent 70%)" }}
        >
        
        {/* Background Media Container */}
        <div className="absolute inset-0">
          {heroMedia.map((media, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                index === currentSlide
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-110"
              }`}
              style={{
                transform: `translateY(${scrollY * 0.5}px)`,
              }}
            >
              {media.type === "video" ? (
                <video
                  className="hero-video w-full h-full object-cover"
                  src={media.src}
                  poster={media.poster}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={media.src}
                  alt={media.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ))}
        </div>

        {/* Professional Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/60"></div>
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, rgba(0,0,0,0.2) 0%, transparent 40%, rgba(0,0,0,0.1) 100%)",
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20"></div>

        {/* Enhanced Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-pulse"
              style={{
                width: Math.floor(4 + Math.random() * 6) + 'px',
                height: Math.floor(4 + Math.random() * 6) + 'px',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                left: Math.floor(Math.random() * 100) + '%',
                top: Math.floor(Math.random() * 100) + '%',
                animationDelay: Math.floor(Math.random() * 5) + 's',
                animationDuration: Math.floor(4 + Math.random() * 6) + 's',
                boxShadow: '0 0 20px rgba(0, 0, 0, 0.6)',
              }}
            />
          ))}
          {/* Brand-colored accent lines */}
          <div
            className="absolute top-20 left-0 w-32 h-0.5 opacity-30 animate-pulse"
            style={{ backgroundColor: theme.primary }}
          ></div>
          <div
            className="absolute bottom-32 right-20 w-24 h-0.5 opacity-40 animate-pulse"
            style={{ backgroundColor: theme.primary, animationDelay: '2s' }}
          ></div>
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 min-h-screen flex items-center">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-center min-h-[80vh]">
              {/* Left Content - Store Information */}
              <div className="lg:col-span-8 space-y-8 md:space-y-10 text-white max-w-4xl">
                {/* Store Branding Section */}
                <div className="space-y-6">
                  {/* Store Logo & Name */}
                  <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-4 sm:space-y-0 opacity-0 fade-in-up-1">
                    {storeData.profileImage && (
                      <div className="relative">
                        <img
                          src={storeData.profileImage? storeData.profileImage : ""}
                          alt={storeData.name + " logo"}
                          className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 shadow-lg"
                          style={{ borderColor: theme.primary }}
                        />
                        {storeData.isVerified && (
                          <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    )}
                    {!storeData.profileImage && (
                      <div 
                        className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center border-4 shadow-lg"
                        style={{ borderColor: theme.primary, backgroundColor: theme.primary }}
                      >
                        <Store className="w-8 h-8 md:w-10 md:h-10 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none text-center sm:text-left">
                        <span
                          className={`block ${storeData.isPremium ? 'brand-glow' : ''}`}
                          style={{
                            color: theme.primary,
                            textShadow: theme.textShadow,
                          }}
                        >
                          {storeData.name}
                        </span>
                      </h1>
                      {storeData.tagline && (
                        <p className="text-lg sm:text-xl md:text-2xl text-white/90 mt-2 font-light italic text-center sm:text-left">
                          {storeData.tagline}
                        </p>
                      )}
                    </div>
                  </div>


                  {/* Store Stats & Trust Indicators */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-6 opacity-0 fade-in-up-3">
                    {/* Rating */}
                    <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-white font-semibold">
                        {storeData.rating?.toFixed(1) || '0.0'}
                      </span>
                      <span className="text-white/70">({reviewsData.length} reviews)</span>
                    </div>
                    
                    {/* Followers */}
                    <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                      <Users className="w-5 h-5 text-white" />
                      <span className="text-white font-semibold">
                        {storeData.stats?.followersCount?.toLocaleString() || '0'}
                      </span>
                      <span className="text-white/70">followers</span>
                    </div>

                    {/* Premium Badge */}
                    {storeData.isPremium && (
                      <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-full px-6 py-2 shadow-lg animate-pulse">
                        <Crown className="w-5 h-5 text-white animate-bounce" />
                        <span className="text-white font-bold tracking-wide">PREMIUM STORE</span>
                      </div>
                    )}

                    {/* Store Category Badge */}
                    {storeData.category && (
                      <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                        <Tag className="w-5 h-5 text-white" />
                        <span className="text-white font-semibold capitalize">{storeData.category}</span>
                      </div>
                    )}

                    {/* Store Location */}
                    {storeData.location && (
                      <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                        <MapPin className="w-5 h-5 text-white" />
                        <span className="text-white font-semibold">{storeData.location}</span>
                      </div>
                    )}

                    {/* Verified Badge */}
                    {storeData.isVerified && (
                      <div className="flex items-center space-x-2 bg-blue-500/20 backdrop-blur-sm rounded-full px-4 py-2">
                        <CheckCircle className="w-5 h-5 text-blue-400" />
                        <span className="text-white font-semibold">Verified</span>
                      </div>
                    )}

                    {/* Years in Business */}
                    {storeData.establishedYear && (
                      <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                        <Award className="w-5 h-5 text-white" />
                        <span className="text-white font-semibold">
                          {new Date().getFullYear() - storeData.establishedYear}+ years
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enhanced CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 opacity-0 fade-in-up-4">
                  <button
                    onClick={onExploreClick}
                    className="group px-8 sm:px-10 py-4 sm:py-5 font-bold text-base sm:text-lg rounded-lg relative overflow-hidden transition-all duration-500 hover:scale-105 shadow-2xl w-full sm:w-auto"
                    style={{
                      backgroundColor: theme.primary,
                      color: theme.contrast,
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center space-x-3">
                      <Store className="w-6 h-6" />
                      <span className="tracking-wide">
                        {storeData.type === 'product' ? 
                          (storeData.customCTA?.primary || 'SHOP NOW') : 
                          (storeData.customCTA?.primary || 'BOOK SERVICE')}
                      </span>
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>

                  <button
                    onClick={onContactClick}
                    className="group px-8 sm:px-10 py-4 sm:py-5 border-3 font-bold text-base sm:text-lg rounded-lg transition-all duration-500 hover:scale-105 bg-white/10 backdrop-blur-sm w-full sm:w-auto"
                    style={{
                      borderColor: theme.primary,
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = theme.primary;
                      e.target.style.color = theme.contrast;
                      e.target.style.borderColor = theme.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                      e.target.style.color = "white";
                      e.target.style.borderColor = theme.primary;
                    }}
                  >
                    <span className="flex items-center justify-center space-x-3">
                      <span className="tracking-wide">
                        {storeData.customCTA?.secondary || 'GET IN TOUCH'}
                      </span>
                    </span>
                  </button>
                </div>

                {/* Enhanced Trust Indicators */}
                <div className="hidden md:flex items-center flex-wrap gap-6 text-sm opacity-0 fade-in-up-5">
                  <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    <span className="text-white font-medium">Secure Shopping</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                    <Truck className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">Fast Delivery</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                    <CheckCircle className="w-5 h-5 text-yellow-400" />
                    <span className="text-white font-medium">Quality Guaranteed</span>
                  </div>
                  {storeData.stats?.totalSales && (
                    <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                      <Award className="w-5 h-5 text-purple-400" />
                      <span className="text-white font-medium">
                        {storeData.stats.totalSales}+ Happy Customers
                      </span>
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation Controls */}
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center space-x-3 sm:space-x-6 bg-black/20 backdrop-blur-lg rounded-full px-3 sm:px-6 py-2 sm:py-3">
            {/* Slide Indicators */}
            <div className="flex space-x-2 sm:space-x-3">
              {heroMedia.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-3 rounded-full transition-all duration-500 hover:scale-110 ${
                    index === currentSlide
                      ? "w-8 shadow-lg"
                      : "w-3 bg-white/50 hover:bg-white/70"
                  }`}
                  style={{
                    backgroundColor:
                      index === currentSlide ? theme.primary : undefined,
                    boxShadow: index === currentSlide ? theme.brandGlow : undefined,
                  }}
                />
              ))}
            </div>

            {/* Control Divider */}
            <div className="w-px h-6 bg-white/30"></div>

            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 rounded-full backdrop-blur-sm hover:scale-110 transition-all duration-300 text-white border-2 border-white/30 hover:border-white/50"
              style={{
                backgroundColor: theme.cardBackground,
              }}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            {/* Video Controls (when video is active) */}
            {heroMedia[currentSlide]?.type === "video" && (
              <button
                onClick={toggleVideoPlayback}
                className="p-3 rounded-full backdrop-blur-sm hover:scale-110 transition-all duration-300 text-white border-2 border-white/30 hover:border-white/50"
                style={{
                  backgroundColor: theme.cardBackground,
                }}
              >
                {videoPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Enhanced Side Navigation */}
        <button
          onClick={prevSlide}
          className="absolute left-2 sm:left-6 top-1/2 transform -translate-y-1/2 z-20 p-2 sm:p-4 rounded-full backdrop-blur-lg border-2 border-white/20 hover:border-white/40 transition-all duration-300 text-white opacity-70 hover:opacity-100 hover:scale-110 group shadow-lg"
          style={{
            backgroundColor: theme.cardBackground,
          }}
        >
          <ChevronLeft className="w-5 h-5 sm:w-7 sm:h-7 group-hover:-translate-x-1 transition-transform duration-300" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-2 sm:right-6 top-1/2 transform -translate-y-1/2 z-20 p-2 sm:p-4 rounded-full backdrop-blur-lg border-2 border-white/20 hover:border-white/40 transition-all duration-300 text-white opacity-70 hover:opacity-100 hover:scale-110 group shadow-lg"
          style={{
            backgroundColor: theme.cardBackground,
          }}
        >
          <ChevronRight className="w-5 h-5 sm:w-7 sm:h-7 group-hover:translate-x-1 transition-transform duration-300" />
        </button>
        </section>
    </>
  );
};

export default PremiumHeroSection;
