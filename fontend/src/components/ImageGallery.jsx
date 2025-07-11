import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const ImageGallery = ({ images, title }) => {
  const [selectedImage, setSelectedImage] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">No images available</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative">
        <img
          src={images[selectedImage] ? 
            (images[selectedImage].startsWith('http') ? images[selectedImage] : `${import.meta.env.VITE_API_URL}${images[selectedImage]}`) : 
            'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'
          }
          alt={title}
          className="w-full h-96 object-cover rounded-lg"
        />
        
        {/* Mobile Swiper for single image view */}
        <div className="md:hidden">
          <Swiper
            modules={[Navigation, Pagination]}
            spaceBetween={10}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            onSlideChange={(swiper) => setSelectedImage(swiper.activeIndex)}
            className="w-full h-96 rounded-lg"
          >
            {images.map((image, index) => (
              <SwiperSlide key={index}>
                <img
                  src={image ? 
                    (image.startsWith('http') ? image : `${import.meta.env.VITE_API_URL}${image}`) : 
                    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'
                  }
                  alt={`${title} ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      {/* Thumbnail Navigation - Hidden on mobile */}
      {images.length > 1 && (
        <div className="hidden md:flex space-x-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImage === index
                  ? 'border-black ring-2 ring-black ring-opacity-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <img
                src={image ? 
                  (image.startsWith('http') ? image : `${import.meta.env.VITE_API_URL}${image}`) : 
                  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'
                }
                alt={`${title} ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;