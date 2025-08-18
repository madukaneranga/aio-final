// ImageGalleryPro.jsx
import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const ImageGalleryPro = ({ images, title }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">No images available</span>
      </div>
    );
  }

  const formatSrc = (image) =>
    image?.startsWith("http")
      ? image
      : `${import.meta.env.VITE_API_URL}${image}`;

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative group">
        <img
          src={formatSrc(images[selectedImage])}
          alt={title}
          loading="lazy"
          className="hidden md:block w-full h-96 object-cover rounded-lg cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
          onClick={() => setLightboxOpen(true)}
        />

        {/* Mobile Swiper with autoplay */}
        <div className="md:hidden">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={10}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 3500, disableOnInteraction: false }}
            onSlideChange={(swiper) => setSelectedImage(swiper.activeIndex)}
            className="w-full h-96 rounded-lg"
          >
            {images.map((image, index) => (
              <SwiperSlide key={index}>
                <img
                  src={formatSrc(image)}
                  alt={`${title} ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover rounded-lg"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      {/* Thumbnail Navigation */}
      {images.length > 1 && (
        <div className="hidden md:flex space-x-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImage === index
                  ? "border-black ring-2 ring-black ring-opacity-50"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <img
                src={formatSrc(image)}
                alt={`${title} ${index + 1}`}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox */}
     {lightboxOpen && (
  <div
    className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
    onClick={() => setLightboxOpen(false)} // closes if you click background
  >
    {/* Inner wrapper stops propagation so clicks on swiper don’t bubble up */}
    <div
      className="relative w-full max-w-4xl h-[80vh]"
      onClick={(e) => e.stopPropagation()}
    >
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={30}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        initialSlide={selectedImage}
        onSlideChange={(swiper) => setSelectedImage(swiper.activeIndex)}
        className="w-full h-full"
      >
        {images.map((image, index) => (
          <SwiperSlide
            key={index}
            className="flex items-center justify-center"
          >
            <Zoom>
              <img
                src={formatSrc(image)}
                alt={`${title} ${index + 1}`}
                className="max-h-[80vh] object-contain rounded-lg"
              />
            </Zoom>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Close button */}
      <button
  className="absolute top-5 right-5 text-white text-3xl font-bold z-50 cursor-pointer"
  onClick={() => setLightboxOpen(false)}
>
  ✕
</button>

    </div>
  </div>
)}
    </div>
  );
};

export default ImageGalleryPro;
