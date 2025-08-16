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
} from "lucide-react";

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
      buttonBg: isLight ? "#ffffff" : "#000000",
      buttonText: isLight ? "#000000" : "#ffffff",
      buttonHover: themeColor,
      buttonHoverText: getContrastColor(themeColor),
      textShadow: isLight
        ? "0 2px 4px rgba(0,0,0,0.3)"
        : "0 2px 4px rgba(0,0,0,0.6)",
      buttonShadow: isLight
        ? "0 4px 15px rgba(0,0,0,0.2)"
        : "0 4px 15px rgba(255,255,255,0.1)",
    };
  };

  const theme = getThemeStyles();

  const heroMedia = [
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
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .fade-in-up-1 { animation: fadeInUp 1s 0.4s forwards; }
          .fade-in-up-2 { animation: fadeInUp 1s 0.6s forwards; }
          .fade-in-up-3 { animation: fadeInUp 1s 0.8s forwards; }
          .fade-in-up-4 { animation: fadeInUp 1s 1s forwards; }
          .fade-in-up-5 { animation: fadeInUp 1s 1.2s forwards; }
        `}
      </style>

      <section className="relative h-screen overflow-hidden">
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

        {/* Elegant Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent"></div>
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"
          style={{
            background: `linear-gradient(135deg, ${theme.accent} 0%, transparent 50%, ${theme.accent} 100%)`,
          }}
        ></div>

        {/* Floating Particles Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content - Desktop */}
              <div className="space-y-8 text-white max-w-2xl">
                {/* Main Title */}
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight leading-none opacity-0 fade-in-up-1">
                    <span
                      className="block font-bold italic"
                      style={{
                        color: theme.primary,
                        textShadow: theme.textShadow,
                      }}
                    >
                      {storeData.name}
                    </span>
                  </h1>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 opacity-0 fade-in-up-4">
                  <button
                    onClick={onExploreClick}
                    className="group px-8 py-4 font-semibold rounded-none relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                    style={{
                      backgroundColor: theme.buttonBg,
                      color: theme.buttonText,
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center space-x-2">
                      <span>EXPLORE COLLECTION</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div
                      className="absolute inset-0 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"
                      style={{ backgroundColor: theme.buttonHover }}
                    ></div>
                  </button>

                  <button
                    onClick={onContactClick}
                    className="px-8 py-4 border-2 font-semibold rounded-none transition-all duration-300"
                    style={{
                      borderColor: theme.primary,
                      color: theme.primary,
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = theme.primary;
                      e.target.style.color = theme.contrast;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = theme.primary;
                    }}
                  >
                    CONTACT US
                  </button>
                </div>

                {/* Trust Indicators */}
                <div className="hidden md:flex items-center space-x-6 text-sm opacity-75 opacity-0 fade-in-up-5">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Secure Shopping</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4" />
                    <span>Fast Shipping</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center space-x-4">
            {/* Slide Indicators */}
            <div className="flex space-x-2">
              {heroMedia.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "w-8"
                      : "bg-white/40 hover:bg-white/60"
                  }`}
                  style={{
                    backgroundColor:
                      index === currentSlide ? theme.primary : undefined,
                  }}
                />
              ))}
            </div>

            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all text-white"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>

            {/* Video Controls (when video is active) */}
            {heroMedia[currentSlide]?.type === "video" && (
              <button
                onClick={toggleVideoPlayback}
                className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all text-white"
              >
                {videoPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Side Navigation */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all text-white opacity-0 hover:opacity-100 group"
        >
          <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all text-white opacity-0 hover:opacity-100 group"
        >
          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </section>
    </>
  );
};

export default PremiumHeroSection;
