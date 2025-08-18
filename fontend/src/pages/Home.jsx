import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HeroSection from "../components/HeroSection";
import ProductCard from "../components/ProductCard";
import ServiceCard from "../components/ServiceCard";
import StoreCard from "../components/StoreCard";
import LuxuryHeroSection from "../components/LuxuryHeroSection";
import CategorySection from "../components/CategorySection";
import FlashDealsBanner from "../components/FlashDealSection";
import {
  ArrowRight,
  Package,
  Calendar,
  Star,
  TrendingUp,
  Users,
  Shield,
  Store,
} from "lucide-react";

const Home = () => {
  const [productsOnSale, seProductsOnSale] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [featuredStores, setFeaturedStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [flashDeal, setFlashDeal] = useState(null);
  const [showFlashDeal, setShowFlashDeal] = useState(false);

  useEffect(() => {
    fetchFeaturedContent();
    loadCategories();
    fetchFlashDeal();
  }, []);

  const fetchFeaturedContent = async () => {
    try {
      const [productsRes, productsOnSaleRes, servicesRes, storesRes] =
        await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/products`),
          fetch(`${import.meta.env.VITE_API_URL}/api/products/on-sale`),
          fetch(`${import.meta.env.VITE_API_URL}/api/services`),
          fetch(`${import.meta.env.VITE_API_URL}/api/stores/featured/list`),
        ]);

      if (productsRes.ok) {
        try {
          const products = await productsRes.json();
          setFeaturedProducts(products.slice(0, 12));
        } catch (error) {
          console.error("Error parsing products JSON:", error);
          setFeaturedProducts([]);
        }
      }
      if (productsOnSaleRes.ok) {
        try {
          const productsOnSale = await productsOnSaleRes.json();
          seProductsOnSale(productsOnSale.slice(0, 12));
        } catch (error) {
          console.error("Error parsing products JSON:", error);
          seProductsOnSale([]);
        }
      }

      if (servicesRes.ok) {
        try {
          const services = await servicesRes.json();
          setFeaturedServices(services.slice(0, 8));
        } catch (error) {
          console.error("Error parsing services JSON:", error);
          setFeaturedServices([]);
        }
      }

      if (storesRes.ok) {
        try {
          const stores = await storesRes.json();
          setFeaturedStores(stores);
        } catch (error) {
          console.error("Error parsing stores JSON:", error);
          setFeaturedStores([]);
        }
      }
    } catch (error) {
      console.error("Error fetching featured content:", error);
      setFeaturedProducts([]);
      setFeaturedServices([]);
      setFeaturedStores([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlashDeal = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/flash-deals/current`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setFlashDeal(result.data);
          setShowFlashDeal(true);
        }
      } else {
        setShowFlashDeal(false);
      }
    } catch (error) {
      console.error("Error fetching flash deal:", error);
      setShowFlashDeal(false);
    }
  };

  const trackFlashDealClick = async (flashDealId) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL}/api/flash-deals/${flashDealId}/click`,
        {
          method: "POST",
        }
      );
    } catch (error) {
      console.error("Error tracking click:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const handleFlashDealClick = () => {
    if (flashDeal) {
      trackFlashDealClick(flashDeal._id);
      // Add your navigation logic
      window.location.href = "/deals";
    }
  };

  // Function to get timer values based on sale status
  const getFlashDealProps = () => {
    if (!flashDeal) return null;

    const { timeRemaining, saleStatus } = flashDeal;

    if (saleStatus === "upcoming") {
      return {
        saleStartsInHours: timeRemaining.hours,
        saleStartsInMinutes: timeRemaining.minutes,
        saleStartsInSeconds: timeRemaining.seconds,
        saleEndsInHours: 0,
        saleEndsInMinutes: 0,
        saleEndsInSeconds: 0,
        timerLabel: flashDeal.timerLabel,
      };
    } else {
      return {
        saleStartsInHours: 0,
        saleStartsInMinutes: 0,
        saleStartsInSeconds: 0,
        saleEndsInHours: timeRemaining.hours,
        saleEndsInMinutes: timeRemaining.minutes,
        saleEndsInSeconds: timeRemaining.seconds,
        timerLabel: "Sale Ends In:",
      };
    }
  };

    const flashDealProps = getFlashDealProps();

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
      <LuxuryHeroSection
        images={[
          "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/Hero%2Fordinary-life-scene-from-mall-america%20(1).jpg?alt=media&token=fdb88ecc-68c6-49fb-8258-a5a3410393ee",
          "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/Hero%2Ftwo-happy-girls-sweaters-having-fun-with-shopping-trolley-megaphone-white-wall.jpg?alt=media&token=886c6960-8622-4770-9afd-fc8dbcce99e7",
          "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/Hero%2Felderly-woman-shopping-customer-day.jpg?alt=media&token=db76d51e-5d2b-44b3-b52a-21ee1b0533c0",
        ]}
      />

      {productsOnSale?.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">On Sale</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Handpicked premium products from top-rated stores
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {productsOnSale.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                to="/products-on-sale"
                className="inline-flex items-center space-x-2 bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                <span>View All Products</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}
      <section className="py-0 bg-white">
        <CategorySection categories={categories} />
      </section>
      {showFlashDeal && flashDeal && flashDealProps && (
        <section className="py-0 bg-white">

            <FlashDealsBanner
              // Timer props from backend
              {...flashDealProps}
              // Content from backend
              saleName={flashDeal.saleName}
              saleSubtitle={flashDeal.saleSubtitle}
              discountText={flashDeal.discountText}
              buttonText={flashDeal.buttonText}
              // Design from backend
              backgroundColor={flashDeal.backgroundColor}
              backgroundImage={flashDeal.backgroundImage}
              textColor={flashDeal.textColor}
              accentColor={flashDeal.accentColor}
              // Image from backend
              heroImage={flashDeal.heroImage}
              showHeroImage={flashDeal.showHeroImage}
              // Custom click handler
              onButtonClick={handleFlashDealClick}
            />
      
        </section>
      )}
      {/* Featured Products */}
      <section className="py-5 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Featured Products
            </h2>
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
      <section className="py-5 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Featured Services
            </h2>
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

      {/* Call to Action */}
      <section className="py-10 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Start Your Business Journey
          </h2>
          <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto">
            Join thousands of successful entrepreneurs and start earning today.
            Create your store in minutes.
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
      <section className="py-5 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Premium Stores
            </h2>
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
