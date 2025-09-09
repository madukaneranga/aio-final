import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import StoreCard from "../components/StoreCard";
import EnhancedCategorySection from "../components/EnhancedCategorySection";
import FlashDealsBanner from "../components/FlashDealSection";
import HeroBanner from "../components/HeroBanner";
import { productsAPI, storesAPI, categoriesAPI, flashDealsAPI } from "../utils/api";
import {
  ArrowRight,
  Package,

  Store,
} from "lucide-react";

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredStores, setFeaturedStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [flashDeal, setFlashDeal] = useState(null);
  const [showFlashDeal, setShowFlashDeal] = useState(false);

  const shopNowRef = useRef(null);


  useEffect(() => {
    fetchFeaturedContent();
    loadCategories();
    fetchFlashDeal();
  }, []);

  const fetchFeaturedContent = async () => {
    try {
      const [products, stores] = await Promise.all([
        productsAPI.getAll(),
        storesAPI.getFeatured(),
      ]);

      setFeaturedProducts(products.slice(0, 12));
      setFeaturedStores(stores);
    } catch (error) {
      console.error("Error fetching featured content:", error);
      setFeaturedProducts([]);
      setFeaturedStores([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlashDeal = async () => {
    try {
      const dealData = await flashDealsAPI.getCurrent();
      if (dealData) {
        setFlashDeal(dealData);
        setShowFlashDeal(true);
      } else {
        setFlashDeal(null);
        setShowFlashDeal(false);
      }
    } catch (error) {
      console.error("Error fetching flash deal:", error);
      setFlashDeal(null);
      setShowFlashDeal(false);
    }
  };

  const trackFlashDealClick = async (flashDealId) => {
    try {
      await flashDealsAPI.trackClick(flashDealId);
    } catch (error) {
      console.error("Error tracking click:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const categories = await categoriesAPI.getAll();
      setCategories(categories);
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
      {showFlashDeal && flashDeal && flashDealProps ? (
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
      ) : (
        <HeroBanner
        />
      )}

      <section className="py-0" ref={shopNowRef}>
        <EnhancedCategorySection categories={categories} />
      </section>

      {/* Featured Products */}
      <section className="py-5 bg-gray-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 leading-tight font-sans">
              Featured Products
            </h2>
          </div>

          {featuredProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
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

      {/* Call to Action */}
      <section className="py-10 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight font-sans">
            Start Your Business Journey
          </h2>
          <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto font-body">
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
          </div>
        </div>
      </section>

      {/* Premium Stores */}
      <section className="py-5 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 leading-tight font-sans">
              Premium Stores
            </h2>
          </div>

          {featuredStores.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
