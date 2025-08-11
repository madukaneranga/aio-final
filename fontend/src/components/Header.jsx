import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useNotifications } from "../contexts/NotificationContext";
import RoleSwitching from "./RoleSwitching";
import {
  Search,
  ShoppingCart,
  Bell,
  User,
  Menu,
  X,
  Store,
  Plus,
  Package,
  Calendar,
  TrendingUp,
  Wallet,
} from "lucide-react";

const Header = () => {
  const { user, logout, refreshUser } = useAuth();
  const { orderItems, bookingItems } = useCart();
  const { unreadCount } = useNotifications();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // This should ONLY update state, not trigger search
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    console.log("User typed:", value);
    // DON'T call handleSearch here!
  };

  // This should ONLY run on form submit
  const handleSearch = (e) => {
    e.preventDefault();
    console.log("Form submitted - searching for:", searchQuery);
    if (searchQuery.trim()) {
      const searchUrl = `/products?search=${encodeURIComponent(searchQuery)}`;
      console.log("Navigating to:", searchUrl);
      navigate(searchUrl);
    }
  };

  // Add this inside your component
  useEffect(() => {
    console.log("searchQuery state is now:", searchQuery);
  }, [searchQuery]);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate("/");
  };

  const switchUserRole = async () => {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/auth/switch-role`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to switch role");
    }

    refreshUser();

    return response.json();
  };

  const handleRoleSwitch = () => {
    setIsSwitching(true);
    setTimeout(async () => {
      try {
        const result = await switchUserRole();
        if (result.role === "customer") {
          navigate("/");
        } else {
          if (user?.storeId) {
            navigate("/dashboard");
          } else {
            navigate("/create-store");
          }
        }
      } catch (err) {
        console.error(err.message);
      } finally {
        setIsSwitching(false);
      }
    }, 4000); // wait 4s before switching
  };

  const totalItems =
    orderItems.reduce((sum, item) => sum + item.quantity, 0) +
    bookingItems.length;

  return (
    <>
      <RoleSwitching currentRole={user?.role} isTransitioning={isSwitching} />

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg" : "bg-white"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link
              to="/"
              className="text-2xl font-bold text-black hover:text-gray-700 transition-colors"
            >
              AIO
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link
                to="/products"
                className="text-gray-700 hover:text-black transition-colors font-medium"
              >
                Products
              </Link>
              <Link
                to="/services"
                className="text-gray-700 hover:text-black transition-colors font-medium"
              >
                Services
              </Link>
              <Link
                to="/stores"
                className="text-gray-700 hover:text-black transition-colors font-medium"
              >
                Stores
              </Link>
              {user?.role === "store_owner" && (
                <Link
                  to="/dashboard"
                  className="text-gray-700 hover:text-black transition-colors font-medium"
                >
                  Dashboard
                </Link>
              )}
              {/* Switch Role Button */}
              {user && (
                <button
                  onClick={handleRoleSwitch} // <-- calls the function we defined
                  className={`font-medium transition-colors ${
                    user?.role === "store_owner"
                      ? "text-black hover:text-gray-700"
                      : "bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-clip-text text-transparent hover:opacity-80 animate-pulse"
                  }`}
                >
                  {user?.role === "store_owner"
                    ? "Switch to Buying"
                    : "Switch to Selling"}
                </button>
              )}
            </nav>

            {/* Search Bar */}
            <form
              onSubmit={handleSearch}
              className="hidden lg:flex items-center space-x-2"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleInputChange}
                  placeholder="Search products & services..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent w-64"
                />
              </div>
            </form>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Cart - Only for customers */}
              {user?.role === "customer" && (
                <Link
                  to="/cart"
                  className="relative p-2 text-gray-700 hover:text-black transition-colors"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </Link>
              )}

              {user?.role === "store_owner" && (
                <Link
                  to="/wallet-dashboard"
                  className="relative p-2 text-gray-700 hover:text-black transition-colors"
                >
                  <Wallet className="w-6 h-6" />
                </Link>
              )}

              {user && (
                <Link
                  to="/notifications"
                  className="relative p-2 text-gray-700 hover:text-black transition-colors"
                  aria-label={`You have ${unreadCount} unread notifications`}
                >
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* User Menu */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 p-2 text-gray-700 hover:text-black transition-colors"
                  >
                    <User className="w-6 h-6" />
                    <span className="hidden sm:block font-medium">
                      {user.name}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500 capitalize">
                          {user.role.replace("_", " ")}
                        </p>
                      </div>

                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Profile Settings
                      </Link>

                      {/* Switch Role Button */}
                      {user && (
                        <button
                          onClick={handleRoleSwitch} // <-- calls the function we defined
                          className={`block px-4 py-2  font-medium transition-colors ${
                            user?.role === "store_owner"
                              ? "text-black hover:text-gray-700"
                              : "bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-clip-text text-transparent hover:opacity-80 animate-pulse"
                          }`}
                        >
                          {user?.role === "store_owner"
                            ? "Switch to Buying"
                            : "Switch to Selling"}
                        </button>
                      )}
                      {user.role === "customer" && (
                        <>
                          <Link
                            to="/orders"
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            My Orders
                          </Link>
                          <Link
                            to="/bookings"
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            My Bookings
                          </Link>
                        </>
                      )}

                      {user.role === "store_owner" && (
                        <>
                          <Link
                            to="/dashboard"
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <div className="flex items-center space-x-2">
                              <Store className="w-4 h-4" />
                              <span>Dashboard</span>
                            </div>
                          </Link>
                          <Link
                            to="/sales-analytics"
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="w-4 h-4" />
                              <span>Analytics</span>
                            </div>
                          </Link>
                          <Link
                            to="/orders"
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <div className="flex items-center space-x-2">
                              <Package className="w-4 h-4" />
                              <span>Orders</span>
                            </div>
                          </Link>
                          <Link
                            to="/bookings"
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4" />
                              <span>Bookings</span>
                            </div>
                          </Link>
                        </>
                      )}

                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-black transition-colors font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:text-black transition-colors"
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="space-y-4">
                <form
                  onSubmit={handleSearch}
                  className="flex items-center space-x-2"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </form>

                <nav className="space-y-2">
                  <Link
                    to="/stores"
                    className="block text-gray-700 hover:text-black transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Stores
                  </Link>
                  <Link
                    to="/products"
                    className="block text-gray-700 hover:text-black transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Products
                  </Link>
                  <Link
                    to="/services"
                    className="block text-gray-700 hover:text-black transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Services
                  </Link>
                  {user?.role === "store_owner" && (
                    <Link
                      to="/dashboard"
                      className="block text-gray-700 hover:text-black transition-colors font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                  )}
                </nav>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;
