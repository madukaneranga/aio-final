import React, { useState, useEffect } from "react";

const LuxuryHeroSection = ({
  ads = [],

  autoSlideInterval = 5000,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Default demo ads if none provided
  const defaultAds = [
    {
      id: 1,
      title: "Premium Collection",
      subtitle: "Discover Luxury",
      description: "Exclusive products from top store owners",
      type: "store_owner",
      ctaText: "Shop Now",
      image:
        "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/Hero%2Fordinary-life-scene-from-mall-america%20(1).jpg?alt=media&token=fdb88ecc-68c6-49fb-8258-a5a3410393ee",
    },
    {
      id: 2,
      title: "Platform Spotlight",
      subtitle: "Join Our Community",
      description: "Connect with premium brands and exclusive offers",
      type: "platform",
      ctaText: "Sign Up Now",
      image:
        "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/Hero%2Ftwo-happy-girls-sweaters-having-fun-with-shopping-trolley-megaphone-white-wall.jpg?alt=media&token=886c6960-8622-4770-9afd-fc8dbcce99e7",
    },
    {
      id: 3,
      title: "Curated Selection",
      subtitle: "Handpicked for You",
      description: "Premium quality meets exceptional design",
      type: "store_owner",
      ctaText: "Explore",
      image:
        "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/Hero%2Fordinary-life-scene-from-mall-america%20(1).jpg?alt=media&token=fdb88ecc-68c6-49fb-8258-a5a3410393ee",
    },
    {
      id: 4,
      title: "Art Of Leather",
      subtitle: "Handpicked for You",
      description: "Premium quiality leather products",
      type: "store_owner",
      ctaText: "Explore",
      image:
        "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/Hero%2Felderly-woman-shopping-customer-day.jpg?alt=media&token=db76d51e-5d2b-44b3-b52a-21ee1b0533c0",
    },
  ];

  // Merge ads with images - prioritize provided data
  const activeAds = ads.length > 0 ? ads : defaultAds;

  // Combine ads with your images
  const slidesData = activeAds;

  useEffect(() => {
    if (!isHovered && slidesData.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slidesData.length);
      }, autoSlideInterval);

      return () => clearInterval(interval);
    }
  }, [isHovered, slidesData.length, autoSlideInterval]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slidesData.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + slidesData.length) % slidesData.length
    );
  };



  return (
    <div
      className="relative h-screen max-h-[550px] min-h-[400px] bg-black overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Slider */}
      <div className="relative w-full h-full">
        {slidesData.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentSlide
                ? "opacity-100 scale-100"
                : "opacity-0 scale-105"
            }`}
            style={{
              backgroundImage: `url(${slide.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Luxury Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/30 to-black/80" />

            {/* Premium Border Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

            {/* Content */}
            <div className="relative z-10 h-full flex items-center justify-center">
              <div className="max-w-4xl mx-auto px-6 text-center">
                {/* Badge */}
                <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-6 hover:bg-white/15 transition-all duration-300">
                  <span className="text-sm font-light tracking-wider text-white/90">
                    {slide.type === "platform"
                      ? "PLATFORM EXCLUSIVE"
                      : "PREMIUM COLLECTION"}
                  </span>
                </div>

                {/* Main Title */}
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-thin mb-4 text-white tracking-tight leading-none">
                  {slide.title}
                </h1>

                {/* Subtitle */}
                <h2 className="text-xl md:text-3xl lg:text-4xl font-light mb-6 text-white/80 tracking-wide">
                  {slide.subtitle}
                </h2>

                {/* Description */}
                <p className="text-lg md:text-xl font-light text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed">
                  {slide.description}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    className="group relative px-8 py-4 bg-white text-black font-medium tracking-wider uppercase overflow-hidden hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
                  >
                    <span className="relative z-10">{slide.ctaText}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                  </button>

                  <button
                    
                    className="group px-8 py-4 border-2 border-white/30 text-white font-medium tracking-wider uppercase backdrop-blur-sm hover:border-white hover:bg-white/10 transition-all duration-300 transform hover:scale-105"
                  >
                    <span className="group-hover:text-white transition-colors duration-300">
                      Browse Collection
                    </span>
                  </button>
                </div>

                {/* Luxury Accent Line */}
                <div className="mt-12 flex justify-center">
                  <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {slidesData.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 border border-white/30 backdrop-blur-md text-white hover:bg-white/10 hover:border-white/60 transition-all duration-300 group"
          >
            <i className="fas fa-chevron-left group-hover:transform group-hover:-translate-x-1 transition-transform duration-300"></i>
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 border border-white/30 backdrop-blur-md text-white hover:bg-white/10 hover:border-white/60 transition-all duration-300 group"
          >
            <i className="fas fa-chevron-right group-hover:transform group-hover:translate-x-1 transition-transform duration-300"></i>
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {slidesData.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex space-x-3">
          {slidesData.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full border transition-all duration-300 hover:scale-125 ${
                index === currentSlide
                  ? "bg-white border-white shadow-lg"
                  : "bg-transparent border-white/50 hover:border-white"
              }`}
            />
          ))}
        </div>
      )}

      {/* Premium Corner Accents */}
      <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-white/20 z-10"></div>
      <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-white/20 z-10"></div>
      <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-white/20 z-10"></div>
      <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-white/20 z-10"></div>
    </div>
  );
};

export default LuxuryHeroSection;
