// නමෝ බුද්ධාය!
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { WishlistProvider } from "./contexts/WishlistContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import ScrollToTopButton from "./components/ScrollToTopButton";

// Pages
import Home from "./pages/Home";
import Stores from "./pages/Stores";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import StoreDetail from "./pages/StoreDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import StoreDashboard from "./pages/StoreDashboard";
import CreateStore from "./pages/CreateStore";
import CreateProduct from "./pages/CreateProduct";
import ManageProducts from "./pages/ManageProducts";
import Orders from "./pages/Orders";
import Receipt from "./pages/Receipt";
import StoreManagement from "./pages/StoreManagement";
import NotFound from "./pages/NotFound";
import SalesAnalytics from "./pages/SalesAnalytics";
import PlatformSettings from "./pages/PlatformSettings";
import HelpCenter from "./pages/HelpCenter";
import ContactUs from "./pages/ContactUs";
import Notifications from "./pages/Notifications";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import WalletDashboard from "./pages/WalletDashboard";
import SubscriptionManagement from "./pages/SubscriptionManagement";
import Maintenance from "./pages/Maintenance";
import NfcCardCustomizer from "./pages/NfcCardCustomizer";
import Test from "./pages/Test";
import NewPost from "./pages/NewPost";
import SocialFeed from "./pages/SocialFeed";
import CustomSales from "./pages/CustomSales";
import Wishlist from "./pages/Wishlist";
import ThankYou from "./pages/ThankYou";
import AdminDashboard from "./pages/AdminDashboard";

import "./App.css";

// Toggle this to enable/disable maintenance
const maintenanceMode = false;

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
          <NotificationProvider>
            <CartProvider>
              <WishlistProvider>
            <Router>
              {maintenanceMode ? (
                <Maintenance />
              ) : (
                <Routes>
                  {/* ✅ Standalone routes (no Header/Footer) */}
                  <Route path="/feed" element={<SocialFeed />} />
                  <Route path="/admin/*" element={<AdminDashboard />} />

                  {/* ✅ All other routes use main layout */}
                  <Route
                    path="*"
                    element={
                      <div className="min-h-screen bg-white flex flex-col">
                        <Header />
                        <main className="flex-1">
                          <ScrollToTop />
                          <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/stores" element={<Stores />} />
                            <Route path="/products" element={<Products />} />
                            <Route
                              path="/product/:id"
                              element={<ProductDetail />}
                            />
                            <Route
                              path="/store/:id"
                              element={<StoreDetail />}
                            />
                            <Route path="/cart" element={<Cart />} />
                            <Route path="/wishlist" element={<Wishlist />} />
                            <Route path="/checkout" element={<Checkout />} />
                            <Route path="/thank-you" element={<ThankYou />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route
                              path="/dashboard"
                              element={<StoreDashboard />}
                            />
                            <Route
                              path="/create-store"
                              element={<CreateStore />}
                            />
                            <Route
                              path="/create-product"
                              element={<CreateProduct />}
                            />
                            <Route
                              path="/manage-products"
                              element={<ManageProducts />}
                            />
                            <Route path="/orders" element={<Orders />} />
                            <Route path="/receipt/:id" element={<Receipt />} />
                            <Route
                              path="/store-management"
                              element={<StoreManagement />}
                            />
                            <Route
                              path="/sales-analytics"
                              element={<SalesAnalytics />}
                            />
                            <Route
                              path="/platform-settings"
                              element={<PlatformSettings />}
                            />
                            <Route
                              path="/help-center"
                              element={<HelpCenter />}
                            />
                            <Route path="/contact-us" element={<ContactUs />} />
                            <Route
                              path="/privacy-policy"
                              element={<PrivacyPolicy />}
                            />
                            <Route
                              path="/terms-of-service"
                              element={<TermsOfService />}
                            />
                            <Route
                              path="/notifications"
                              element={<Notifications />}
                            />
           
                            <Route
                              path="/wallet-dashboard"
                              element={<WalletDashboard />}
                            />
                            <Route
                              path="/sub-management"
                              element={<SubscriptionManagement />}
                            />
                            <Route path="/sale" element={<CustomSales />} />
                            <Route path="/test" element={<Test />} />
                            <Route path="/new-post" element={<NewPost />} />
                            <Route
                              path="/NfcCard"
                              element={<NfcCardCustomizer />}
                            />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                        <Footer />
                        <ScrollToTopButton />
                      </div>
                    }
                  />
                </Routes>
              )}
            </Router>
              </WishlistProvider>
            </CartProvider>
          </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
