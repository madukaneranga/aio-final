import React from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const HeroSection = ({ images, title, subtitle, themeColor = 'black' }) => {
  const defaultImages = [
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop',
    'https://images.unsplash.com/photo-1560472354-b43ff0c44a43?w=1200&h=400&fit=crop'
  ];

  const heroImages = images && images.length > 0 ? images : defaultImages;
  
  const getThemeClasses = () => {
    switch (themeColor) {
      case 'white':
        return {
          overlay: 'bg-white bg-opacity-80',
          text: 'text-black',
          primaryBtn: 'bg-black text-white hover:bg-gray-800',
          secondaryBtn: 'bg-white border-2 border-black text-black hover:bg-black hover:text-white'
        };
      case 'gray':
        return {
          overlay: 'bg-gray-600 bg-opacity-80',
          text: 'text-white',
          primaryBtn: 'bg-white text-black hover:bg-gray-200',
          secondaryBtn: 'bg-transparent border-2 border-white text-white hover:bg-white hover:text-black'
        };
      default: // black
        return {
          overlay: 'bg-black bg-opacity-60',
          text: 'text-white',
          primaryBtn: 'bg-white text-black hover:bg-gray-200',
          secondaryBtn: 'bg-transparent border-2 border-white text-white hover:bg-white hover:text-black'
        };
    }
  };
  
  const themeClasses = getThemeClasses();

  return (
    <section className="hero-section relative h-[50vh]">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={0}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000 }}
        className="h-full"
      >
        {heroImages.map((image, index) => (
          <SwiperSlide key={index}>
            <div className="relative h-full">
              <img
                src={image?.startsWith('http') ? image : `${import.meta.env.VITE_API_URL}${image}`}
                alt={`Slide ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className={`absolute inset-0 flex items-center justify-center ${themeClasses.overlay}`}>
                <div className={`text-center max-w-4xl px-6 ${themeClasses.text}`}>
                  <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
                    {title || 'All In One Marketplace'}
                  </h1>
                  <p className="text-lg md:text-xl mb-8 opacity-90 max-w-3xl mx-auto leading-relaxed">
                    {subtitle || 'Discover premium products and professional services from verified local businesses'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link 
                      to="/products"
                      className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${themeClasses.primaryBtn}`}
                    >
                      Shop Products
                    </Link>
                    <Link 
                      to="/services"
                      className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${themeClasses.secondaryBtn}`}
                    >
                      Book Services
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
};

export default HeroSection;