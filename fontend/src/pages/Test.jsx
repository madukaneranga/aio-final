import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ServiceCard from '../components/ServiceCard';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade, Parallax } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import 'swiper/css/parallax';
import { 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  ArrowLeft, 
  Share2, 
  Heart, 
  ShoppingBag,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  MessageCircle,
  Globe,
  Camera,
  Play
} from 'lucide-react';
import { formatLKR } from '../utils/currency';

const Test = () => {
  const { id } = useParams();
  const [storeData, setStoreData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [isScrolled, setIsScrolled] = useState(false);
  const videoRef = useRef(null);
  const heroRef = useRef(null);

  // Mock social media data - replace with actual store social data
  const mockSocialData = {
    facebook: 'https://facebook.com/store',
    instagram: 'https://instagram.com/store', 
    twitter: 'https://twitter.com/store',
    linkedin: 'https://linkedin.com/company/store',
    youtube: 'https://youtube.com/store',
    website: 'https://store.com'
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    if (!themeColor) return { 
      backgroundColor: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)', 
      color: '#ffffff',
      primary: '#000000',
      gradient: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)'
    };
    
    if (themeColor.startsWith('#')) {
      const isLight = isLightColor(themeColor);
      return {
        backgroundColor: `linear-gradient(135deg, ${themeColor} 0%, ${adjustBrightness(themeColor, -20)} 100%)`,
        color: isLight ? '#000000' : '#ffffff',
        primary: themeColor,
        gradient: `linear-gradient(135deg, ${themeColor} 0%, ${adjustBrightness(themeColor, -20)} 100%)`,
        lightGradient: `linear-gradient(135deg, ${themeColor}20 0%, ${adjustBrightness(themeColor, -20)}10 100%)`
      };
    }
    
    return { 
      backgroundColor: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)', 
      color: '#ffffff',
      primary: '#000000',
      gradient: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)'
    };
  };

  const adjustBrightness = (hex, percent) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  const isLightColor = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 155;
  };

  const handleImageLoad = (src) => {
    setLoadedImages(prev => new Set(prev).add(src));
  };

  const isVideoFile = (src) => {
    return src && (src.includes('.mp4') || src.includes('.webm') || src.includes('.mov'));
  };

  const getSocialIcon = (platform) => {
    const iconProps = { className: "w-5 h-5" };
    switch (platform) {
      case 'facebook': return <Facebook {...iconProps} />;
      case 'instagram': return <Instagram {...iconProps} />;
      case 'twitter': return <Twitter {...iconProps} />;
      case 'linkedin': return <Linkedin {...iconProps} />;
      case 'youtube': return <Youtube {...iconProps} />;
      case 'website': return <Globe {...iconProps} />;
      case 'whatsapp': return <MessageCircle {...iconProps} />;
      default: return <Globe {...iconProps} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-600 to-black rounded-full animate-spin"></div>
          <div className="relative bg-white rounded-full p-8">
            <div className="w-16 h-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-6">
            {error || 'Store not found'}
          </h2>
          <Link 
            to="/" 
            className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-white to-gray-100 text-black font-semibold rounded-full hover:scale-105 transform transition-all duration-300 shadow-xl"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { store, listings = [] } = storeData;
  
  if (!store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-6">Store not found</h2>
          <Link 
            to="/" 
            className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-white to-gray-100 text-black font-semibold rounded-full hover:scale-105 transform transition-all duration-300 shadow-xl"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Floating Action Buttons */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50 space-y-4">
        <div className="flex flex-col space-y-3">
          <button 
            className="w-14 h-14 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full shadow-2xl hover:scale-110 transform transition-all duration-300 flex items-center justify-center backdrop-blur-sm"
            style={{ background: `linear-gradient(135deg, ${themeStyles.primary}20, ${themeStyles.primary}40)` }}
          >
            <Heart className="w-6 h-6" />
          </button>
          <button 
            className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full shadow-2xl hover:scale-110 transform transition-all duration-300 flex items-center justify-center backdrop-blur-sm"
            style={{ background: `linear-gradient(135deg, ${themeStyles.primary}30, ${themeStyles.primary}50)` }}
          >
            <Share2 className="w-6 h-6" />
          </button>
          <button 
            className="w-14 h-14 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full shadow-2xl hover:scale-110 transform transition-all duration-300 flex items-center justify-center backdrop-blur-sm"
            style={{ background: `linear-gradient(135deg, ${themeStyles.primary}40, ${themeStyles.primary}60)` }}
          >
            <ShoppingBag className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Premium Breadcrumb */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <Link
            to="/"
            className="group inline-flex items-center space-x-3 text-gray-600 hover:text-black transition-all duration-300"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-gray-100 to-white rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>
      </div>

      {/* Premium Hero Section */}
      <section className="relative h-[70vh] overflow-hidden" ref={heroRef}>
        <Swiper
          modules={[Navigation, Pagination, Autoplay, EffectFade, Parallax]}
          spaceBetween={0}
          slidesPerView={1}
          navigation={{
            nextEl: '.swiper-button-next-custom',
            prevEl: '.swiper-button-prev-custom',
          }}
          pagination={{ 
            clickable: true,
            bulletClass: 'swiper-pagination-bullet-custom',
            bulletActiveClass: 'swiper-pagination-bullet-active-custom'
          }}
          autoplay={{ delay: 8000, disableOnInteraction: false }}
          effect="fade"
          parallax={true}
          className="h-full"
        >
          {heroImages.map((media, index) => (
            <SwiperSlide key={index}>
              <div className="relative h-full">
                {isVideoFile(media) ? (
                  <div className="relative h-full">
                    <video
                      ref={videoRef}
                      src={media?.startsWith('http') ? media : `${import.meta.env.VITE_API_URL}${media}`}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full p-2">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="relative h-full overflow-hidden">
                    <img
                      src={media?.startsWith('http') ? media : `${import.meta.env.VITE_API_URL}${media}`}
                      alt={`${store.name} ${index + 1}`}
                      className={`w-full h-full object-cover transform scale-105 transition-all duration-1000 ${
                        loadedImages.has(media) ? 'opacity-100' : 'opacity-0'
                      }`}
                      data-swiper-parallax="-100"
                      onLoad={() => handleImageLoad(media)}
                    />
                    {!loadedImages.has(media) && (
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
                    )}
                  </div>
                )}
                
                {/* Premium Overlay */}
                <div 
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20"
                  style={{ 
                    background: `linear-gradient(135deg, ${store.themeColor || '#000000'}90 0%, transparent 50%, ${store.themeColor || '#000000'}30 100%)`
                  }}
                />
                
                {/* Hero Content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="text-center max-w-5xl px-8"
                    data-swiper-parallax="-200"
                  >
                    <div className="mb-6">
                      <h1 
                        className="text-4xl md:text-7xl font-bold mb-6 leading-tight bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent animate-fadeInUp"
                        style={{ 
                          animationDelay: '0.3s',
                          textShadow: '0 4px 20px rgba(0,0,0,0.3)'
                        }}
                      >
                        {store.name}
                      </h1>
                      <div className="w-32 h-1 mx-auto mb-8 bg-gradient-to-r from-transparent via-white to-transparent rounded-full opacity-80"></div>
                      <p 
                        className="text-xl md:text-2xl mb-8 opacity-90 max-w-4xl mx-auto leading-relaxed text-white animate-fadeInUp font-light"
                        style={{ animationDelay: '0.6s' }}
                      >
                        {store.description}
                      </p>
                    </div>
                    
                    <div 
                      className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fadeInUp"
                      style={{ animationDelay: '0.9s' }}
                    >
                      <button 
                        className="px-12 py-4 bg-white text-black font-semibold rounded-full hover:scale-105 transform transition-all duration-300 shadow-2xl hover:shadow-white/20 backdrop-blur-sm"
                      >
                        Explore {store.type === 'product' ? 'Products' : 'Services'}
                      </button>
                      <button 
                        className="px-12 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-black transform transition-all duration-300 backdrop-blur-sm"
                      >
                        Contact Store
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Navigation */}
        <div className="swiper-button-prev-custom absolute left-6 top-1/2 transform -translate-y-1/2 z-10 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 cursor-pointer">
          <ArrowLeft className="w-6 h-6" />
        </div>
        <div className="swiper-button-next-custom absolute right-6 top-1/2 transform -translate-y-1/2 z-10 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 cursor-pointer rotate-180">
          <ArrowLeft className="w-6 h-6" />
        </div>
      </section>

      {/* Premium Store Information */}
      <div 
        className="py-20 relative overflow-hidden"
        style={{ 
          background: themeStyles.gradient,
          color: themeStyles.color
        }}
      >
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-16">
            {/* Store Details */}
            <div className="xl:col-span-2">
              <div className="flex flex-col lg:flex-row items-start space-y-8 lg:space-y-0 lg:space-x-12">
                {/* Profile Image */}
                {store.profileImage && (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                    <img
                      src={store.profileImage.startsWith('http') ? store.profileImage : `${import.meta.env.VITE_API_URL}${store.profileImage}`}
                      alt={store.name}
                      className="relative w-32 h-32 rounded-full object-cover ring-4 ring-white/30 shadow-2xl group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  </div>
                )}

                <div className="flex-1">
                  <div className="mb-8">
                    <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                      {store.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-6 mb-6">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-6 h-6 ${i < Math.floor(store.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-white/30'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-xl font-semibold">{store.rating || 0}</span>
                        <span className="text-white/80">({reviews.length} reviews)</span>
                      </div>
                      <div className="w-px h-6 bg-white/30"></div>
                      <span className="capitalize text-lg font-medium bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                        {store.type} Store
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-xl leading-relaxed mb-10 text-white/90 font-light">
                    {store.description}
                  </p>
                  
                  {/* Owner Info */}
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                      Store Owner
                    </h3>
                    <div className="space-y-2">
                      <p className="text-lg font-medium">{store.ownerId?.name || 'Store Owner'}</p>
                      <p className="text-white/70">{store.ownerId?.email || ''}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & Social Info */}
            <div className="space-y-8">
              {/* Contact Information */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <h3 className="text-2xl font-semibold mb-8 flex items-center">
                  <div className="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
                  Contact Information
                </h3>
                <div className="space-y-6">
                  {store.contactInfo?.email && (
                    <div className="flex items-center space-x-4 group hover:scale-105 transition-transform duration-300">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Mail className="w-6 h-6" />
                      </div>
                      <span className="text-lg">{store.contactInfo.email}</span>
                    </div>
                  )}
                  {store.contactInfo?.phone && (
                    <div className="flex items-center space-x-4 group hover:scale-105 transition-transform duration-300">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Phone className="w-6 h-6" />
                      </div>
                      <span className="text-lg">{store.contactInfo.phone}</span>
                    </div>
                  )}
                  {store.contactInfo?.address && (
                    <div className="flex items-start space-x-4 group hover:scale-105 transition-transform duration-300">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mt-1">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <span className="text-lg leading-relaxed">{store.contactInfo.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Social Media */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl font-semibold mb-8 flex items-center">
                  <div className="w-3 h-3 bg-pink-400 rounded-full mr-3"></div>
                  Follow Us
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(mockSocialData).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-16 h-16 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 group"
                    >
                      {getSocialIcon(platform)}
                    </a>
                  ))}
                </div>
              </div>

              {/* Sales Stats */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center">
                <div className="mb-4">
                  <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    {formatLKR(store.totalSales || 0)}
                  </div>
                  <p className="text-white/80 text-lg">Total Sales</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
                  <div>
                    <div className="text-2xl font-bold">{listings.length}</div>
                    <div className="text-sm text-white/70">{store.type}s</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{reviews.length}</div>
                    <div className="text-sm text-white/70">Reviews</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Listings Section */}
      <div className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-gray-900">
              {store.type === 'product' ? 'Curated Products' : 'Premium Services'}
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-transparent via-black to-transparent mx-auto mb-8 rounded-full"></div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Discover our collection of {listings.length} carefully selected {store.type === 'product' ? 'products' : 'services'} designed to exceed your expectations
            </p>
          </div>

          {listings.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-32 h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full mx-auto mb-8 flex items-center justify-center">
                <ShoppingBag className="w-16 h-16 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Coming Soon
              </h3>
              <p className="text-xl text-gray-500 mb-4">
                Amazing {store.type === 'product' ? 'products' : 'services'} are on their way
              </p>
              <p className="text-gray-400">Check back soon for exciting new additions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {listings.map((item, index) => (
                <div 
                  key={item._id}
                  className="group transform hover:scale-105 transition-all duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {store.type === 'product' ? (
                    <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
                      <ProductCard product={item} />
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
                      <ServiceCard service={item} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Premium Reviews Section */}
      <div className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              What Our Customers Say
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-transparent via-black to-transparent mx-auto mb-8 rounded-full"></div>
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-7 h-7 ${
                        i < Math.floor(store.rating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-2xl font-bold text-gray-900">{store.rating || 0}</span>
                <span className="text-xl text-gray-600">({reviews.length} reviews)</span>
              </div>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative mb-12">
                <div className="w-32 h-32 bg-gradient-to-r from-yellow-200 to-yellow-300 rounded-full mx-auto flex items-center justify-center shadow-xl">
                  <Star className="w-16 h-16 text-yellow-600" />
                </div>
                <div className="absolute inset-0 bg-yellow-400 rounded-full mx-auto w-32 h-32 animate-ping opacity-20"></div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Be the First to Review</h3>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Share your experience and help others discover this amazing store
              </p>
              <button 
                className="px-12 py-4 bg-gradient-to-r from-black to-gray-800 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 shadow-xl"
              >
                Write First Review
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Review Summary */}
              <div className="bg-white rounded-3xl shadow-2xl p-12 border border-gray-100">
                <h3 className="text-2xl font-bold mb-8 text-center text-gray-900">Review Overview</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="text-center">
                    <div className="relative mb-8">
                      <div className="text-7xl font-bold text-gray-900 mb-4">{store.rating || 0}</div>
                      <div className="flex justify-center mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-8 h-8 mx-1 ${
                              i < Math.floor(store.rating || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xl text-gray-600">Based on {reviews.length} reviews</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviews.filter(r => r.rating === rating).length;
                      const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2 w-16">
                            <span className="text-lg font-medium">{rating}</span>
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-3 rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-lg font-medium text-gray-700 w-12 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Individual Reviews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {reviews.map((review, index) => (
                  <div 
                    key={review._id} 
                    className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-700">
                            {(review.customerId?.name || 'A').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg">
                            {maskCustomerName(review.customerId?.name || 'Anonymous Customer')}
                          </p>
                          <div className="flex items-center space-x-3 mt-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-5 h-5 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500 font-medium">
                              {new Date(review.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        {review.orderId && (
                          <span className="text-xs bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 px-3 py-2 rounded-full font-medium shadow-sm">
                            Product Purchase
                          </span>
                        )}
                        {review.bookingId && (
                          <span className="text-xs bg-gradient-to-r from-green-100 to-green-200 text-green-800 px-3 py-2 rounded-full font-medium shadow-sm">
                            Service Booking
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-700 mb-6 leading-relaxed text-lg">
                      "{review.comment}"
                    </p>

                    {review.response && (
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border-l-4 border-black">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">S</span>
                          </div>
                          <div>
                            <span className="text-sm font-bold text-gray-900">Store Response</span>
                            <span className="text-sm text-gray-500 ml-2">
                              {new Date(review.response.respondedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{review.response.message}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Load More Reviews */}
              {reviews.length > 6 && (
                <div className="text-center pt-12">
                  <button className="px-12 py-4 bg-gradient-to-r from-gray-900 to-black text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 shadow-xl">
                    Load More Reviews
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Premium Footer CTA */}
      <div 
        className="py-24 relative overflow-hidden"
        style={{ background: themeStyles.gradient }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold mb-8 text-white leading-tight">
            Ready to Experience Excellence?
          </h2>
          <p className="text-xl text-white/90 mb-12 leading-relaxed font-light">
            Join thousands of satisfied customers who have discovered the premium quality and exceptional service that defines our brand
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="px-12 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transform transition-all duration-300 shadow-2xl hover:shadow-white/20">
              Shop Now
            </button>
            <button className="px-12 py-4 bg-transparent border-2 border-white text-white font-bold rounded-full hover:bg-white hover:text-black transform transition-all duration-300">
              Contact Us
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
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
        
        .animate-fadeInUp {
          animation: fadeInUp 1s ease-out forwards;
          opacity: 0;
        }
        
        .swiper-pagination-bullet-custom {
          width: 12px;
          height: 12px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          margin: 0 6px;
          transition: all 0.3s ease;
        }
        
        .swiper-pagination-bullet-active-custom {
          background: white;
          transform: scale(1.3);
        }
        
        .group:hover .group-hover\\:blur-2xl {
          filter: blur(2rem);
        }
      `}</style>
    </div>
  );
};

export default Test;