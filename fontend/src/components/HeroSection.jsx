import React from 'react';
import { ChevronLeft, ChevronRight, Star, Percent, Calendar, ShoppingBag } from 'lucide-react';

const HeroCarousel = ({ 
  banners = [], 
  autoPlay = true, 
  autoPlayDelay = 5000,
  themeColor = 'black' 
}) => {
  const [currentSlide, setCurrentSlide] = React.useState(0);
  
  const defaultBanners = [
    {
      id: 1,
      type: 'promotion',
      title: 'Summer Sale Spectacular',
      subtitle: 'Up to 70% off on electronics, fashion & home decor',
      discount: '70% OFF',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=500&fit=crop',
      ctaText: 'Shop Now',
      ctaLink: '/sale',
      badge: 'Limited Time'
    },
    {
      id: 2,
      type: 'category',
      title: 'Premium Tech Collection',
      subtitle: 'Latest gadgets from top brands - Free shipping worldwide',
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&h=500&fit=crop',
      ctaText: 'Explore Deals',
      ctaLink: '/electronics',
      badge: 'New Arrivals'
    },
    {
      id: 3,
      type: 'seasonal',
      title: 'Back to School Essentials',
      subtitle: 'Everything you need for a successful academic year',
      discount: 'Buy 2 Get 1 FREE',
      image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&h=500&fit=crop',
      ctaText: 'Shop Collection',
      ctaLink: '/back-to-school',
      badge: 'Student Special'
    }
  ];

  const slides = banners.length > 0 ? banners : defaultBanners;
  
  const getThemeClasses = () => {
    switch (themeColor) {
      case 'white':
        return {
          overlay: 'bg-gradient-to-r from-white/90 to-white/70',
          text: 'text-gray-800',
          primaryBtn: 'bg-black text-white hover:bg-gray-800 hover:scale-105',
          badge: 'bg-black text-white',
          discount: 'text-red-600'
        };
      case 'gray':
        return {
          overlay: 'bg-gradient-to-r from-gray-900/85 to-gray-800/70',
          text: 'text-white',
          primaryBtn: 'bg-white text-black hover:bg-gray-100 hover:scale-105',
          badge: 'bg-white text-gray-900',
          discount: 'text-yellow-400'
        };
      default:
        return {
          overlay: 'bg-gradient-to-r from-black/75 to-black/50',
          text: 'text-white',
          primaryBtn: 'bg-white text-black hover:bg-gray-100 hover:scale-105',
          badge: 'bg-white text-black',
          discount: 'text-yellow-400'
        };
    }
  };
  
  const themeClasses = getThemeClasses();

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  React.useEffect(() => {
    if (!autoPlay) return;
    
    const interval = setInterval(nextSlide, autoPlayDelay);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayDelay]);

  const getBadgeIcon = (type) => {
    switch (type) {
      case 'promotion': return <Percent className="w-3 h-3" />;
      case 'seasonal': return <Calendar className="w-3 h-3" />;
      case 'category': return <Star className="w-3 h-3" />;
      default: return <ShoppingBag className="w-3 h-3" />;
    }
  };

  return (
    <section className="relative h-[60vh] min-h-[500px] overflow-hidden">
      {/* Main Carousel */}
      <div className="relative h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentSlide 
                ? 'opacity-100 transform scale-100' 
                : 'opacity-0 transform scale-105'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay with content */}
            <div className={`absolute inset-0 ${themeClasses.overlay}`}>
              <div className="container mx-auto h-full flex items-center px-6">
                <div className={`max-w-2xl ${themeClasses.text} animate-in slide-in-from-left duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
                  
                  {/* Badge */}
                  {slide.badge && (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4 ${themeClasses.badge} animate-in fade-in duration-1500`}>
                      {getBadgeIcon(slide.type)}
                      {slide.badge}
                    </div>
                  )}

                  {/* Discount/Offer */}
                  {slide.discount && (
                    <div className={`text-4xl md:text-6xl font-black mb-4 ${themeClasses.discount} animate-in zoom-in duration-1000 delay-300`}>
                      {slide.discount}
                    </div>
                  )}

                  {/* Title */}
                  <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight animate-in slide-in-from-bottom duration-1000 delay-500">
                    {slide.title}
                  </h1>

                  {/* Subtitle */}
                  <p className="text-lg md:text-xl mb-8 opacity-90 leading-relaxed animate-in slide-in-from-bottom duration-1000 delay-700">
                    {slide.subtitle}
                  </p>

                  {/* CTA Button */}
                  <button
                    onClick={() => window.location.href = slide.ctaLink || '#'}
                    className={`inline-flex items-center gap-3 px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 ${themeClasses.primaryBtn} animate-in slide-in-from-bottom duration-1000 delay-1000`}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    {slide.ctaText || 'Shop Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 z-10"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 z-10"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-white scale-125' 
                : 'bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full">
        <div 
          className="h-full bg-white transition-all duration-300 ease-out"
          style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
        />
      </div>
    </section>
  );
};

export default HeroCarousel;