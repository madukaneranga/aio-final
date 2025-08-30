import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../contexts/WishlistContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useGlobalChat } from "../contexts/ChatContext";
import RoleSwitching from "./RoleSwitching";
import MegaMenu from "./Category/MegaMenu";

import {
  Search,
  ShoppingCart,
  Heart,
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
  MessageCircle,
} from "lucide-react";
import { use } from "react";

const Header = () => {
  const { user, logout, refreshUser } = useAuth();
  const { orderItems, bookingItems } = useCart();
  const { wishlistItems } = useWishlist();
  const { unreadCount } = useNotifications();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const navigate = useNavigate();

  const { globalUnreadCount: chatUnreadCount = 0, isConnected: isChatConnected, initializeSocket } = useGlobalChat();

  // Initialize global chat socket when user is available
  useEffect(() => {
    if (user?.id) {
      console.log('📱 Header: Initializing chat socket for user:', user.id);
      initializeSocket(user);
    }
  }, [user?.id, initializeSocket]);

  // Debug: Log unread count changes
  useEffect(() => {
    console.log('📱 Header: Chat unread count changed:', chatUnreadCount, 'Connected:', isChatConnected);
  }, [chatUnreadCount, isChatConnected]);

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
    // DON'T call handleSearch here!
  };

  const handleCategoryNavigation = (category, subcategory, childCategory) => {
    // Handle navigation logic here
    console.log("Navigate to:", {
      category: category.name,
      subcategory: subcategory?.name,
      childCategory,
    });

    // Example: You could use react-router here
    // navigate(`/category/${category._id}${subcategory ? `/${subcategory.name}` : ''}${childCategory ? `/${childCategory}` : ''}`);
  };

  // This should ONLY run on form submit
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const searchUrl = `/products?search=${encodeURIComponent(searchQuery)}`;
      navigate(searchUrl);
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/categories`
        );
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    };

    loadCategories();
  }, []);


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
        credentials: "include",
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

  // Menu Button Component (3-lines icon)
  const MenuButton = ({ onClick, isOpen }) => (
    <button
      onClick={onClick}
      className="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Toggle menu"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isOpen ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        )}
      </svg>
    </button>
  );

  return (
    <>
      <RoleSwitching currentRole={user?.role} isTransitioning={isSwitching} />

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg" : "bg-white"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Section: Logo + Menu Button */}
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-3xl font-black text-black hover:text-gray-700 transition-colors tracking-tight font-sans"
              >
                AIO
              </Link>
              <MenuButton
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCategoryMenuOpen(!isCategoryMenuOpen);
                }}
                isOpen={isCategoryMenuOpen}
              />
            </div>

            {/* Center Section: Search Bar (Desktop) */}
            <div className="hidden lg:flex flex-1 justify-center max-w-2xl mx-8">
              <form
                onSubmit={handleSearch}
                className="w-full max-w-lg"
              >
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    placeholder="Search products & services..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent shadow-sm text-sm"
                  />
                </div>
              </form>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-6">
              <Link
                to="/products"
                className="text-gray-600 hover:text-black transition-colors font-medium text-sm"
              >
                Products
              </Link>
              <Link
                to="/services"
                className="text-gray-600 hover:text-black transition-colors font-medium text-sm"
              >
                Services
              </Link>
              <Link
                to="/stores"
                className="text-gray-600 hover:text-black transition-colors font-medium text-sm"
              >
                Stores
              </Link>
              {user?.role === "store_owner" && (
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-black transition-colors font-medium text-sm"
                >
                  Dashboard
                </Link>
              )}
              {/* Switch Role Button */}
              {user && (
                <button
                  onClick={handleRoleSwitch}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    user?.role === "store_owner"
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-md"
                  }`}
                >
                  {user?.role === "store_owner"
                    ? "Switch to Buying"
                    : "Switch to Selling"}
                </button>
              )}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2">
              {/* Action Icons */}
              {user?.role === "customer" && (
                <>
                  <Link
                    to="/cart"
                    className="relative p-2.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {totalItems > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-black text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                        {totalItems}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/wishlist"
                    className="relative p-2.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <Heart className="w-5 h-5" />
                    {wishlistItems && wishlistItems.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-black text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                        {wishlistItems.length}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {user?.role === "store_owner" && (
                <Link
                  to="/wallet-dashboard"
                  className="relative p-2.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                >
                  <Wallet className="w-5 h-5" />
                </Link>
              )}

              {user && (
                <Link
                  to="/chats"
                  className="relative p-2.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                  aria-label={`You have ${chatUnreadCount} unread messages`}
                  title={`Chat ${
                    isChatConnected ? "(Connected)" : "(Disconnected)"
                  } - ${chatUnreadCount} unread`}
                >
                  <MessageCircle className="w-5 h-5" />
                  {chatUnreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-medium">
                      {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                    </span>
                  )}
                </Link>
              )}
              
              {user && (
                <Link
                  to="/notifications"
                  className="relative p-2.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                  aria-label={`You have ${unreadCount} unread notifications`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
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
                          <Link
                            to="/wishlist"
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            My Wishlist
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
                className="lg:hidden p-2.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-all ml-2"
                aria-label="Toggle mobile menu"
              >
                {isMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-gray-100 bg-white">
              <div className="py-4 space-y-4">
                {/* Mobile Search */}
                <form
                  onSubmit={handleSearch}
                  className="px-4"
                >
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleInputChange}
                      placeholder="Search products & services..."
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                    />
                  </div>
                </form>

                {/* Mobile Navigation */}
                <nav className="px-4 space-y-1">
                  <Link
                    to="/products"
                    className="flex items-center px-3 py-2.5 text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Products
                  </Link>
                  <Link
                    to="/services"
                    className="flex items-center px-3 py-2.5 text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Services
                  </Link>
                  <Link
                    to="/stores"
                    className="flex items-center px-3 py-2.5 text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Stores
                  </Link>
                  {user?.role === "store_owner" && (
                    <Link
                      to="/dashboard"
                      className="flex items-center px-3 py-2.5 text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                  )}
                  
                  {/* Mobile Role Switch */}
                  {user && (
                    <button
                      onClick={() => {
                        handleRoleSwitch();
                        setIsMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all font-medium ${
                        user?.role === "store_owner"
                          ? "text-gray-600 hover:text-black hover:bg-gray-50"
                          : "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                      }`}
                    >
                      {user?.role === "store_owner"
                        ? "Switch to Buying"
                        : "Switch to Selling"}
                    </button>
                  )}
                </nav>
              </div>
            </div>
          )}
        </div>
      </header>
      {/* Mega Menu */}
      <MegaMenu
        categories={categories}
        isOpen={isCategoryMenuOpen}
        onClose={() => setIsCategoryMenuOpen(false)}
        onCategoryClick={handleCategoryNavigation}
      />
    </>
  );
};

export default Header;
