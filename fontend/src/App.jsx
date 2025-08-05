import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import StoreList from "./pages/StoreList";
import ProductList from "./pages/ProductList";
import ServiceList from "./pages/ServiceList";
import ProductDetail from "./pages/ProductDetail";
import ServiceDetail from "./pages/ServiceDetail";
import StoreDetail from "./pages/StoreDetail";
import Cart from "./pages/Cart";
import BookingSummary from "./pages/BookingSummary";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import StoreDashboard from "./pages/StoreDashboard";
import CreateStore from "./pages/CreateStore";
import CreateProduct from "./pages/CreateProduct";
import CreateService from "./pages/CreateService";
import ManageProducts from "./pages/ManageProducts";
import ManageServices from "./pages/ManageServices";
import Orders from "./pages/Orders";
import Bookings from "./pages/Bookings";
import StoreManagement from "./pages/StoreManagement";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import SalesAnalytics from "./pages/SalesAnalytics";
import PlatformSettings from "./pages/PlatformSettings";
import HelpCenter from "./pages/HelpCenter";
import ContactUs from "./pages/ContactUs";
import Notifications from "./pages/Notifications";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AdminWithdrawals from "./pages/AdminWithdrawals";
import WalletDashboard from "./pages/WallerDashboard";
import SubscriptionManagement from "./pages/SubscriptionManagement";

import "./App.css";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <CartProvider>
            <Router>
              <div className="min-h-screen bg-white flex flex-col">
                <Header />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/stores" element={<StoreList />} />
                    <Route path="/products" element={<ProductList />} />
                    <Route path="/services" element={<ServiceList />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/service/:id" element={<ServiceDetail />} />
                    <Route path="/store/:id" element={<StoreDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route
                      path="/booking-summary"
                      element={<BookingSummary />}
                    />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/dashboard" element={<StoreDashboard />} />
                    <Route path="/create-store" element={<CreateStore />} />
                    <Route path="/create-product" element={<CreateProduct />} />
                    <Route path="/create-service" element={<CreateService />} />
                    <Route
                      path="/manage-products"
                      element={<ManageProducts />}
                    />
                    <Route
                      path="/manage-services"
                      element={<ManageServices />}
                    />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/bookings" element={<Bookings />} />
                    <Route
                      path="/store-management"
                      element={<StoreManagement />}
                    />
                    <Route
                      path="/sales-analytics"
                      element={<SalesAnalytics />}
                    />
                    <Route path="/admin" element={<Admin />} />
                    <Route
                      path="/platform-settings"
                      element={<PlatformSettings />}
                    />
                    <Route path="/help-center" element={<HelpCenter />} />
                    <Route path="/contact-us" element={<ContactUs />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route
                      path="/terms-of-service"
                      element={<TermsOfService />}
                    />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/admin-withdrawals" element={<AdminWithdrawals />} />
                    <Route path="/wallet-dashboard" element={<WalletDashboard />} />
                    <Route path="/sub-management" element={<SubscriptionManagement />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </Router>
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
