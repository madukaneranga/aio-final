import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import ProductCard from '../components/ProductCard';
import ServiceCard from '../components/ServiceCard';
import StoreCard from '../components/StoreCard';
import { ArrowRight, Package, Calendar, Star, TrendingUp, Users, Shield, Store } from 'lucide-react';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [featuredStores, setFeaturedStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedContent();
  }, []);

  const fetchFeaturedContent = async () => {
    try {
      const [productsRes, servicesRes, storesRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/products`),
        fetch(`${import.meta.env.VITE_API_URL}/api/services`),
        fetch(`${import.meta.env.VITE_API_URL}/api/stores/featured/list`)
      ]);

      if (productsRes.ok) {
        try {
          const products = await productsRes.json();
          setFeaturedProducts(products.slice(0, 8));
        } catch (error) {
          console.error('Error parsing products JSON:', error);
          setFeaturedProducts([]);
        }
      }

      if (servicesRes.ok) {
        try {
          const services = await servicesRes.json();
          setFeaturedServices(services.slice(0, 8));
        } catch (error) {
          console.error('Error parsing services JSON:', error);
          setFeaturedServices([]);
        }
      }

      if (storesRes.ok) {
        try {
          const stores = await storesRes.json();
          setFeaturedStores(stores);
        } catch (error) {
          console.error('Error parsing stores JSON:', error);
          setFeaturedStores([]);
        }
      }
    } catch (error) {
      console.error('Error fetching featured content:', error);
      setFeaturedProducts([]);
      setFeaturedServices([]);
      setFeaturedStores([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <HeroSection
        images={[
          'https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/Hero%2Fordinary-life-scene-from-mall-america%20(1).jpg?alt=media&token=fdb88ecc-68c6-49fb-8258-a5a3410393ee',
          'https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/Hero%2Ftwo-happy-girls-sweaters-having-fun-with-shopping-trolley-megaphone-white-wall.jpg?alt=media&token=886c6960-8622-4770-9afd-fc8dbcce99e7',
          'https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/Hero%2Felderly-woman-shopping-customer-day.jpg?alt=media&token=db76d51e-5d2b-44b3-b52a-21ee1b0533c0'
        ]}
        title="All In One Marketplace"
        subtitle="Discover premium products and professional services from verified local businesses"
      />

      {/* Stats Section */}
      {/*<section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-black rounded-lg mx-auto mb-4">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">1000+</div>
              <div className="text-gray-600">Active Stores</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-black rounded-lg mx-auto mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">50K+</div>
              <div className="text-gray-600">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-black rounded-lg mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">$2M+</div>
              <div className="text-gray-600">Sales Volume</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-black rounded-lg mx-auto mb-4">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">4.9</div>
              <div className="text-gray-600">Average Rating</div>
            </div>
          </div>
        </div>
      </section>
      */}

      {/* Featured Products */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Handpicked premium products from top-rated stores
            </p>
          </div>
          
          {featuredProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {featuredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
              <div className="text-center mt-12">
                <Link
                  to="/products"
                  className="inline-flex items-center space-x-2 bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  <span>View All Products</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No products available yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Services</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional services from certified experts and specialists
            </p>
          </div>
          
          {featuredServices.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {featuredServices.map((service) => (
                  <ServiceCard key={service._id} service={service} />
                ))}
              </div>
              <div className="text-center mt-12">
                <Link
                  to="/services"
                  className="inline-flex items-center space-x-2 bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  <span>View All Services</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No services available yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Why Choose AIO */}
      {/*<section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose AIO?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The all-in-one platform that connects buyers and sellers seamlessly
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Secure & Trusted</h3>
              <p className="text-gray-600">
                All transactions are protected with bank-level security. Shop with confidence knowing your data is safe.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quality Guaranteed</h3>
              <p className="text-gray-600">
                Every store is verified and products are quality-checked. Get exactly what you expect, every time.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">24/7 Support</h3>
              <p className="text-gray-600">
                Our dedicated support team is here to help you anytime. Get assistance when you need it most.
              </p>
            </div>
          </div>
        </div>
      </section>*/}

      {/* Call to Action */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">Start Your Business Journey</h2>
          <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto">
            Join thousands of successful entrepreneurs and start earning today. Create your store in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-black px-8 py-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
            >
              <Package className="w-5 h-5" />
              <span>Sell Products</span>
            </Link>
            <Link
              to="/register"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-black transition-colors flex items-center justify-center space-x-2"
            >
              <Calendar className="w-5 h-5" />
              <span>Offer Services</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Premium Stores */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Premium Stores</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Explore our curated collection of top-performing stores with excellent customer reviews
            </p>
          </div>
          
          {featuredStores.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredStores.map((store) => (
                  <StoreCard key={store._id} store={store} />
                ))}
              </div>
              <div className="text-center mt-12">
                <Link
                  to="/stores"
                  className="inline-flex items-center space-x-2 bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  <span>View All Stores</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No stores available yet</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;