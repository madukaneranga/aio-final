import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ServiceCard from '../components/ServiceCard';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Star, MapPin, Phone, Mail, ArrowLeft } from 'lucide-react';
import { formatLKR } from '../utils/currency';

const StoreDetail = () => {
  const { id } = useParams();
  const [storeData, setStoreData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchStoreData();
      fetchReviews();
    }
  }, [id]);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stores/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch store: ${response.status}`);
      }
      
      const data = await response.json();
      setStoreData(data);
    } catch (error) {
      console.error('Error fetching store data:', error);
      setError('Failed to load store data');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reviews/store/${id}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    }
  };

  const maskCustomerName = (name) => {
    if (!name || name.length <= 2) return name;
    return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
  };

  const getThemeStyles = (themeColor) => {
    if (!themeColor) return { backgroundColor: '#000000', color: '#ffffff' };
    
    // Handle hex colors
    if (themeColor.startsWith('#')) {
      const isLight = isLightColor(themeColor);
      return {
        backgroundColor: themeColor,
        color: isLight ? '#000000' : '#ffffff'
      };
    }
    
    // Default to black
    return { backgroundColor: '#000000', color: '#ffffff' };
  };

  const isLightColor = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 155;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Store not found'}
          </h2>
          <Link to="/" className="text-black hover:text-gray-700">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { store, listings = [] } = storeData;
  
  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Store not found</h2>
          <Link to="/" className="text-black hover:text-gray-700">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const defaultImages = [
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop',
    'https://images.unsplash.com/photo-1560472354-b43ff0c44a43?w=1200&h=400&fit=crop'
  ];

  const heroImages = store.heroImages && store.heroImages.length > 0 ? store.heroImages : defaultImages;
  const themeStyles = getThemeStyles(store.themeColor);
  const isLightTheme = isLightColor(store.themeColor || '#000000');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/"
            className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative h-[40vh]">
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
                  alt={`${store.name} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ 
                    backgroundColor: `${store.themeColor || '#000000'}80`
                  }}
                >
                  <div 
                    className="text-center max-w-4xl px-6"
                    style={{ color: themeStyles.color }}
                  >
                    <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
                      {store.name}
                    </h1>
                    <p className="text-lg md:text-xl mb-8 opacity-90 max-w-3xl mx-auto leading-relaxed">
                      {store.description}
                    </p>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* Store Info */}
      <div 
        className="py-12"
        style={themeStyles}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Store Details */}
            <div className="lg:col-span-2">
              <div className="flex items-start space-x-6">
                {store.profileImage && (
                  <img
                    src={store.profileImage.startsWith('http') ? store.profileImage : `${import.meta.env.VITE_API_URL}${store.profileImage}`}
                    alt={store.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2" style={{ color: themeStyles.color }}>
                    {store.name}
                  </h1>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center space-x-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span style={{ color: isLightTheme ? '#666' : '#ccc' }}>
                        {store.rating || 0} ({reviews.length} reviews)
                      </span>
                    </div>
                    <span style={{ color: isLightTheme ? '#999' : '#666' }}>|</span>
                    <span 
                      className="capitalize" 
                      style={{ color: isLightTheme ? '#666' : '#ccc' }}
                    >
                      {store.type} Store
                    </span>
                  </div>
                  <p 
                    className="leading-relaxed mb-6" 
                    style={{ color: isLightTheme ? '#333' : '#ddd' }}
                  >
                    {store.description}
                  </p>
                  
                  {/* Owner Info */}
                  <div 
                    className="rounded-lg p-4" 
                    style={{ 
                      backgroundColor: isLightTheme ? '#f9f9f9' : 'rgba(255,255,255,0.1)' 
                    }}
                  >
                    <h3 
                      className="font-semibold mb-2" 
                      style={{ color: themeStyles.color }}
                    >
                      Store Owner
                    </h3>
                    <p style={{ color: isLightTheme ? '#333' : '#ddd' }}>
                      {store.ownerId?.name || 'Store Owner'}
                    </p>
                    <p 
                      className="text-sm" 
                      style={{ color: isLightTheme ? '#666' : '#ccc' }}
                    >
                      {store.ownerId?.email || ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div 
              className="rounded-lg p-6" 
              style={{ 
                backgroundColor: isLightTheme ? '#f9f9f9' : 'rgba(255,255,255,0.1)' 
              }}
            >
              <h3 
                className="text-lg font-semibold mb-4" 
                style={{ color: themeStyles.color }}
              >
                Contact Information
              </h3>
              <div className="space-y-3">
                {store.contactInfo?.email && (
                  <div className="flex items-center space-x-3">
                    <Mail 
                      className="w-5 h-5" 
                      style={{ color: isLightTheme ? '#999' : '#ccc' }} 
                    />
                    <span style={{ color: isLightTheme ? '#333' : '#ddd' }}>
                      {store.contactInfo.email}
                    </span>
                  </div>
                )}
                {store.contactInfo?.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone 
                      className="w-5 h-5" 
                      style={{ color: isLightTheme ? '#999' : '#ccc' }} 
                    />
                    <span style={{ color: isLightTheme ? '#333' : '#ddd' }}>
                      {store.contactInfo.phone}
                    </span>
                  </div>
                )}
                {store.contactInfo?.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin 
                      className="w-5 h-5 mt-0.5" 
                      style={{ color: isLightTheme ? '#999' : '#ccc' }} 
                    />
                    <span style={{ color: isLightTheme ? '#333' : '#ddd' }}>
                      {store.contactInfo.address}
                    </span>
                  </div>
                )}
              </div>
              
              <div 
                className="mt-6 pt-6 border-t" 
                style={{ 
                  borderColor: isLightTheme ? '#e5e5e5' : 'rgba(255,255,255,0.2)' 
                }}
              >
                <div className="text-center">
                  <p 
                    className="text-2xl font-bold" 
                    style={{ color: themeStyles.color }}
                  >
                    {formatLKR(store.totalSales || 0)}
                  </p>
                  <p 
                    className="text-sm" 
                    style={{ color: isLightTheme ? '#666' : '#ccc' }}
                  >
                    Total Sales
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              {store.type === 'product' ? 'Our Products' : 'Our Services'}
            </h2>
            <p className="text-gray-600">
              {listings.length} {store.type === 'product' ? 'products' : 'services'} available
            </p>
          </div>

          {listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">
                No {store.type === 'product' ? 'products' : 'services'} available yet
              </p>
              <p className="mt-2 text-gray-400">Check back later for new listings</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((item) => (
                store.type === 'product' ? (
                  <ProductCard key={item._id} product={item} />
                ) : (
                  <ServiceCard key={item._id} service={item} />
                )
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Customer Reviews</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(store.rating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-semibold">{store.rating || 0}</span>
                <span className="text-gray-600">({reviews.length} reviews)</span>
              </div>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
              <p className="text-gray-600">Be the first to review this store!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Review Summary */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Review Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 mb-2">{store.rating || 0}</div>
                      <div className="flex justify-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.floor(store.rating || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-600">{reviews.length} total reviews</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviews.filter(r => r.rating === rating).length;
                      const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center space-x-2">
                          <span className="text-sm w-8">{rating}★</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-8">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Individual Reviews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <div key={review._id} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {maskCustomerName(review.customerId?.name || 'Anonymous')}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {review.orderId && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Product Order
                          </span>
                        )}
                        {review.bookingId && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Service Booking
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4">{review.comment}</p>

                    {review.response && (
                      <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-black">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-700">Store Response</span>
                          <span className="text-sm text-gray-500">
                            {new Date(review.response.respondedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{review.response.message}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreDetail;