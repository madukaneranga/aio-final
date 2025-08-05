import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatLKR } from "../utils/currency";
import Pricing from "../components/Pricing";
import {
  Plus,
  Package,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Settings,
  Store,
  Edit,
  Trash2,
  Eye,
  Star,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

const StoreDashboard = () => {
  const { user } = useAuth();
  const [store, setStore] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalServices: 0,
    totalOrders: 0,
    totalBookings: 0,
    totalEarnings: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [packages, setPackages] = useState([]);
  const [subPackage, setSubPackage] = useState("");

  const currentItems = products.length > 0 ? products : services;

  useEffect(() => {
    if (user?.role === "store_owner" && user?.storeId) {
      fetchDashboardData();
    }
  }, [user]);

  useEffect(() => {
    if (packages.length > 0 && !subPackage) {
      setSubPackage(packages[0].name);
    }
  }, [packages]);

  const loadPayHereSDK = () => {
    return new Promise((resolve, reject) => {
      if (window.payhere) return resolve();

      const script = document.createElement("script");
      script.src = "https://sandbox.payhere.lk/lib/payhere.js";
      script.type = "text/javascript";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("PayHere SDK failed to load"));
      document.body.appendChild(script);
    });
  };

  const handlePackageUpgrade = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscriptions/upgrade`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ packageName: subPackage }),
        }
      );

      const result = await response.json();

      // 🛑 Handle downgrade restriction (if backend returns 403)
      if (response.status === 403 && result.nextAvailableDowngradeDate) {
        const formattedDate = new Date(
          result.nextAvailableDowngradeDate
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        alert(`⛔ You can downgrade only after: ${formattedDate}`);
        return;
      }

      // ❌ Other error
      if (!response.ok) {
        throw new Error(result.message || "Failed to upgrade package");
      }

      // 💳 If PayHere payment is required
      if (result.paymentRequired && result.paymentParams) {
        try {
          const orderId = await startPayHerePayment(result.paymentParams);
          console.log("✅ PayHere Payment successful with Order ID:", orderId);
        } catch (paymentError) {
          console.error("❌ Payment failed:", paymentError);
          alert("Payment was not successful. Upgrade was not completed.");
          return;
        }
      }

      // ✅ Update subscription
      setSubscription(result.updatedSubscription || result);

      // ✅ Close modal
      setShowUpgradeModal(false);

      alert(`✅ Successfully upgraded to: ${subPackage.toUpperCase()}`);
    } catch (error) {
      console.error("❌ Upgrade Error:", error);
      alert(error.message || "Something went wrong during the upgrade.");
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);

    const authHeader = {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };

    try {
      // --- Store ---
      if (user.storeId) {
        const storeResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/stores/${user.storeId}`,
          { headers: authHeader }
        );

        if (storeResponse.ok) {
          const storeData = await storeResponse.json();
          setStore(storeData.store);

          // --- Products or Services ---
          if (storeData.store?.type === "product") {
            const productsResponse = await fetch(
              `${import.meta.env.VITE_API_URL}/api/products?storeId=${
                user.storeId
              }`,
              { headers: authHeader }
            );
            if (productsResponse.ok) {
              const productsData = await productsResponse.json();
              setProducts(productsData);
              setStats((prev) => ({
                ...prev,
                totalProducts: productsData.length,
              }));
            } else {
              setProducts([]);
            }
          } else if (storeData.store?.type === "service") {
            const servicesResponse = await fetch(
              `${import.meta.env.VITE_API_URL}/api/services?storeId=${
                user.storeId
              }`,
              { headers: authHeader }
            );
            if (servicesResponse.ok) {
              const servicesData = await servicesResponse.json();
              setServices(servicesData);
              setStats((prev) => ({
                ...prev,
                totalServices: servicesData.length,
              }));
            } else {
              setServices([]);
            }
          }
        } else {
          setStore(null);
        }
      } else {
        setStore(null);
      }

      // --- Orders ---
      const ordersResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/orders/store`,
        { headers: authHeader }
      );
      if (ordersResponse.ok) {
        const orders = await ordersResponse.json();
        setRecentOrders(orders.slice(0, 5));
        setStats((prev) => ({ ...prev, totalOrders: orders.length }));
      } else {
        setRecentOrders([]);
      }

      // --- Bookings ---
      const bookingsResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/bookings/store`,
        { headers: authHeader }
      );
      if (bookingsResponse.ok) {
        const bookings = await bookingsResponse.json();
        setRecentBookings(bookings.slice(0, 5));
        setStats((prev) => ({ ...prev, totalBookings: bookings.length }));
      } else {
        setRecentBookings([]);
      }

      // --- Subscription ---
      const subscriptionResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscriptions/my-subscription`,
        { headers: authHeader }
      );
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        setSubscription(subscriptionData);
        setSubPackage(subscriptionData?.package || null);
      } else {
        setSubscription(null);
        setSubPackage(null);
      }

      // --- Packages ---
      const packageResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/packages`,
        { headers: authHeader }
      );
      if (packageResponse.ok) {
        const packageData = await packageResponse.json();
        setPackages(packageData);
      } else {
        setPackages([]);
      }
    } catch (error) {
      console.error("Unexpected error fetching dashboard data:", error);
      // Optional: show toast only for unexpected issues
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    console.log("cancelSubscription called");
    try {
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ subscriptionId: subscription._id }),
      });

      if (response.ok) {
        alert("Subscription cancelled successfully");
        fetchDashboardData(); // ✅ Refresh UI immediately
      } else {
        const errorData = await response.json();
        alert("Cancel failed: " + errorData?.error || "Unknown error");
      }
    } catch (error) {
      console.error("Cancel error:", error);
      alert("Error cancelling subscription");
    }
  };

  const createSubscription = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscriptions/create-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        const { paymentParams } = await response.json();

        await loadPayHereSDK();

        // 🔥 Start PayHere payment modal
        await startPayHerePayment(paymentParams);

        // ✅ Refresh subscription and dashboard data after successful payment
        await fetchDashboardData();

        // 💡 Wait for subscription to update
        const refreshedSubscription = await fetch(
          `${import.meta.env.VITE_API_URL}/api/subscriptions/my-subscription`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const subscriptionData = await refreshedSubscription.json();
        setSubscription(subscriptionData);

        alert(
          `Your monthly subscription (LKR ${subscriptionData.amount}) is now active.`
        );
      } else {
        const errorData = await response.json();
        alert(
          "Subscription setup failed. Please contact support: " +
            (errorData?.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Error starting subscription. Please try again.");
    }
  };

  const startPayHerePayment = (paymentParams) => {
    return new Promise((resolve, reject) => {
      if (!window.payhere) {
        alert("Payment gateway not loaded. Please refresh and try again.");
        return reject(new Error("PayHere SDK not loaded"));
      }

      window.payhere.onCompleted = function (orderId) {
        console.log("✅ Payment completed. Order ID:", orderId);
        resolve(orderId);
      };

      window.payhere.onDismissed = function () {
        alert("Payment was cancelled.");
        reject(new Error("Payment cancelled"));
      };

      window.payhere.onError = function (error) {
        console.error("❌ PayHere error:", error);
        alert("Payment failed. Please try again.");
        reject(new Error("Payment error: " + error));
      };

      console.log("▶️ Starting PayHere payment with:", paymentParams);
      window.payhere.startPayment(paymentParams);
    });
  };

  const handleEdit = (editingItem) => {
    setEditingItem({
      ...editingItem,
      price: editingItem.price?.toString() || "",
      stock: editingItem.stock?.toString() || "",
      variants: {
        colors: editingItem.variants?.colors || [],
        sizes: editingItem.variants?.sizes || [],
      },
    });

    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      // Prepare the JSON payload
      const updates = {
        title: editingItem.title,
        description: editingItem.description,
        price: editingItem.price,
        category: editingItem.category,
        ...(store?.type === "product"
          ? {
              stock: editingItem.stock,
              ...(editingItem.variants?.colors?.length > 0 ||
              editingItem.variants?.sizes?.length > 0
                ? { variants: editingItem.variants }
                : {}),
            }
          : {
              duration: editingItem.duration,
              priceType: editingItem.priceType || "fixed",
            }),
      };

      const endpoint = store?.type === "product" ? "products" : "services";

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/${endpoint}/${editingItem._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        fetchDashboardData();
        setShowEditModal(false);
        setEditingItem(null);
        alert(
          `${
            store?.type === "product" ? "Product" : "Service"
          } updated successfully!`
        );
      } else {
        alert(
          `Failed to update ${
            store?.type === "product" ? "product" : "service"
          }`
        );
      }
    } catch (error) {
      console.error("Error updating item:", error);
      alert(
        `Error updating ${store?.type === "product" ? "product" : "service"}`
      );
    }
  };

  const handleDelete = async (itemId, type) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    setDeleting(itemId);
    try {
      const endpoint = type === "product" ? "products" : "services";
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/${endpoint}/${itemId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        if (type === "product") {
          setProducts(products.filter((p) => p._id !== itemId));
        } else {
          setServices(services.filter((s) => s._id !== itemId));
        }
        alert(
          `${
            type.charAt(0).toUpperCase() + type.slice(1)
          } deleted successfully!`
        );
      } else {
        alert(`Failed to delete ${type}`);
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      alert(`Error deleting ${type}`);
    } finally {
      setDeleting(null);
    }
  };

  if (!user || user.role !== "store_owner") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You need to be a store owner to access this page
          </p>
          <Link
            to="/create-store"
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Create Store
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  const categories =
    store?.type === "product"
      ? [
          "Electronics",
          "Clothing",
          "Home & Garden",
          "Sports & Outdoors",
          "Books",
          "Beauty & Health",
          "Toys & Games",
          "Food & Beverages",
        ]
      : [
          "Tutoring",
          "Home Services",
          "Beauty & Wellness",
          "Consulting",
          "Fitness",
          "Technology",
          "Creative Services",
          "Professional Services",
        ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Store Dashboard</h1>
          <p className="text-gray-600 mt-2">
            {store ? `Welcome back to ${store.name}` : "Manage your store"}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {!store && (
            <Link
              to="/create-store"
              className="bg-black text-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 flex items-center space-x-3"
            >
              <Plus className="w-8 h-8 text-white" />
              <div>
                <p className="font-semibold text-white">Create Store</p>
                <p className="text-sm text-gray-300">Start your business</p>
              </div>
            </Link>
          )}

          {store?.type === "product" && (
            <>
              <Link
                to="/create-product"
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 flex items-center space-x-3"
              >
                <Plus className="w-8 h-8 text-black" />
                <div>
                  <p className="font-semibold text-gray-900">Add Product</p>
                  <p className="text-sm text-gray-500">Create new product</p>
                </div>
              </Link>
              <Link
                to="/orders"
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 flex items-center space-x-3"
              >
                <Package className="w-8 h-8 text-black" />
                <div>
                  <p className="font-semibold text-gray-900">View Orders</p>
                  <p className="text-sm text-gray-500">Manage orders</p>
                </div>
              </Link>
            </>
          )}

          {store?.type === "service" && (
            <>
              <Link
                to="/create-service"
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 flex items-center space-x-3"
              >
                <Calendar className="w-8 h-8 text-black" />
                <div>
                  <p className="font-semibold text-gray-900">Add Service</p>
                  <p className="text-sm text-gray-500">Create new service</p>
                </div>
              </Link>
              <Link
                to="/bookings"
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 flex items-center space-x-3"
              >
                <Users className="w-8 h-8 text-black" />
                <div>
                  <p className="font-semibold text-gray-900">View Bookings</p>
                  <p className="text-sm text-gray-500">Manage bookings</p>
                </div>
              </Link>
            </>
          )}

          <Link
            to="/store-management"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 flex items-center space-x-3"
          >
            <Settings className="w-8 h-8 text-black" />
            <div>
              <p className="font-semibold text-gray-900">Store Settings</p>
              <p className="text-sm text-gray-500">Manage store</p>
            </div>
          </Link>
        </div>

        {/* Subscription Management Card */}
        <div className="relative w-full rounded-3xl px-8 py-6 mb-6 bg-gradient-to-br from-gray-50 via-white to-gray-100 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          {/* Subtle accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-black via-gray-600 to-black"></div>

          {/* Decorative corner element */}
          <div className="absolute top-4 right-4 w-12 h-12 border-2 border-gray-300 rounded-full opacity-20"></div>
          <div className="absolute top-6 right-6 w-8 h-8 border-2 border-gray-400 rounded-full opacity-30"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <h3 className="text-xl font-light text-black tracking-wide">
                  {subscription
                    ? "Package Management"
                    : "Subscription Required"}
                </h3>
              </div>

              <div className="space-y-2 text-gray-700">
                {subscription ? (
                  <>
                    <p className="flex items-center gap-2">
                      <span className="text-gray-600 font-light">
                        Current Plan:
                      </span>
                      <span className="font-medium text-black bg-gray-200 px-3 py-1 rounded-full text-sm tracking-wide">
                        {subscription.package.toUpperCase()}
                      </span>
                    </p>

                    <p className="flex items-center gap-2">
                      <span className="text-gray-600 font-light">Status:</span>
                      <span
                        className={`font-medium text-sm tracking-wide ${
                          subscription.status === "active"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {subscription.status.toUpperCase()}
                      </span>
                    </p>

                    <p className="text-gray-600 font-light">
                      <span className="font-medium text-black">Expires:</span>{" "}
                      {new Date(subscription.endDate).toLocaleDateString()}
                    </p>

                    <p className="text-gray-600 font-light">
                      <span className="font-medium text-black">
                        Monthly Fee:
                      </span>{" "}
                      {formatLKR(subscription.amount)}
                    </p>

                    <p className="text-gray-600 font-light leading-relaxed max-w-md">
                      Upgrade anytime to unlock more features. Downgrades are
                      available after one month from your last update.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="flex items-center gap-2">
                      <span className="text-gray-600 font-light">
                        Subscription Status:
                      </span>
                      <span className="font-medium text-red-600 text-sm tracking-wide">
                        PENDING
                      </span>
                    </p>

                    <p className="text-gray-600 font-light leading-relaxed max-w-md">
                      A subscription is required to sell your products or
                      services on AIO.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Link to="/sub-management">
                <button className="bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-2 group">
                  <span>
                    {subscription ? "Manage Plan" : "Get Subscription"}
                  </span>
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </Link>

              <span className="text-xs text-gray-500 font-light">
                {subscription ? "Instant activation" : "Quick setup"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalOrders}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalBookings}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Earnings</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatLKR(store?.totalSales || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Store Rating</p>
                <p className="text-3xl font-bold text-gray-900">
                  {store?.rating || 4.5}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Management for Product Stores */}
          {store?.type === "product" && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Manage Products
                </h2>
                <Link
                  to="/create-product"
                  className="text-black hover:text-gray-700 text-sm"
                >
                  Add New
                </Link>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No products yet</p>
                  <Link
                    to="/create-product"
                    className="text-black hover:text-gray-700 text-sm"
                  >
                    Create your first product
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {products.slice(0, 5).map((product) => (
                    <div
                      key={product._id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img
                            src={
                              product.images?.[0]
                                ? product.images[0].startsWith("http")
                                  ? product.images[0]
                                  : `${import.meta.env.VITE_API_URL}${
                                      product.images[0]
                                    }`
                                : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop"
                            }
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {product.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatLKR(product.price)} • {product.stock} in
                              stock
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/product/${product._id}`}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-green-600 hover:text-green-800 p-1"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product._id, "product")}
                            disabled={deleting === product._id}
                            className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {products.length > 5 && (
                    <div className="text-center">
                      <Link
                        to="/manage-products"
                        className="text-black hover:text-gray-700 text-sm"
                      >
                        View all {products.length} products
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Service Management for Service Stores */}
          {store?.type === "service" && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Manage Services
                </h2>
                <Link
                  to="/create-service"
                  className="text-black hover:text-gray-700 text-sm"
                >
                  Add New
                </Link>
              </div>

              {services.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No services yet</p>
                  <Link
                    to="/create-service"
                    className="text-black hover:text-gray-700 text-sm"
                  >
                    Create your first service
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {services.slice(0, 5).map((service) => (
                    <div
                      key={service._id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img
                            src={
                              service.images?.[0]
                                ? service.images[0].startsWith("http")
                                  ? service.images[0]
                                  : `${import.meta.env.VITE_API_URL}${
                                      service.images[0]
                                    }`
                                : "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop"
                            }
                            alt={service.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {service.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatLKR(service.price)} • {service.duration}{" "}
                              min
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/service/${service._id}`}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleEdit(service)}
                            className="text-green-600 hover:text-green-800 p-1"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(service._id, "service")}
                            disabled={deleting === service._id}
                            className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {services.length > 5 && (
                    <div className="text-center">
                      <Link
                        to="/manage-services"
                        className="text-black hover:text-gray-700 text-sm"
                      >
                        View all {services.length} services
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Activity
              </h2>
              <Link
                to={store?.type === "product" ? "/orders" : "/bookings"}
                className="text-black hover:text-gray-700 text-sm"
              >
                View All
              </Link>
            </div>

            {(store?.type === "product" ? recentOrders : recentBookings)
              .length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No recent activity
              </p>
            ) : (
              <div className="space-y-4">
                {(store?.type === "product"
                  ? recentOrders
                  : recentBookings
                ).map((item) => (
                  <div
                    key={item._id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {store?.type === "product"
                            ? `Order #${item._id.slice(-6)}`
                            : item.serviceId?.title || "Service"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.customerId?.name || "Customer"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatLKR(item.totalAmount)}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${
                            item.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : item.status === "confirmed" ||
                                item.status === "processing"
                              ? "bg-blue-100 text-blue-800"
                              : item.status === "completed" ||
                                item.status === "delivered"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Edit {store?.type === "product" ? "Product" : "Service"}
                  </h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editingItem.title}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          title: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editingItem.description}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price (LKR)
                      </label>
                      <input
                        type="number"
                        value={editingItem.price}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            price: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>

                    {store?.type === "product" ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Stock Quantity
                        </label>
                        <input
                          type="number"
                          value={editingItem.stock}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              stock: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                          required
                          min="0"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={editingItem.duration}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              duration: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                          required
                          min="15"
                          step="15"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={editingItem.category}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          category: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {store?.type === "service" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price Type
                      </label>
                      <select
                        value={editingItem.priceType || "fixed"}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            priceType: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="fixed">Fixed Price</option>
                        <option value="hourly">Hourly Rate</option>
                      </select>
                    </div>
                  )}
                  {store?.type === "product" && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color Variants
                      </label>
                      {(editingItem?.variants?.colors || []).map(
                        (color, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 mb-2"
                          >
                            <input
                              type="text"
                              placeholder="Color Name"
                              value={color.name}
                              onChange={(e) => {
                                const updated = [
                                  ...editingItem.variants.colors,
                                ];
                                updated[index].name = e.target.value;
                                setEditingItem((prev) => ({
                                  ...prev,
                                  variants: {
                                    ...prev.variants,
                                    colors: updated,
                                  },
                                }));
                              }}
                              className="border border-gray-300 rounded px-2 py-1"
                            />
                            <input
                              type="color"
                              value={color.hex}
                              onChange={(e) => {
                                const updated = [
                                  ...editingItem.variants.colors,
                                ];
                                updated[index].hex = e.target.value;
                                setEditingItem((prev) => ({
                                  ...prev,
                                  variants: {
                                    ...prev.variants,
                                    colors: updated,
                                  },
                                }));
                              }}
                              className="w-10 h-10 border"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated =
                                  editingItem.variants.colors.filter(
                                    (_, i) => i !== index
                                  );
                                setEditingItem((prev) => ({
                                  ...prev,
                                  variants: {
                                    ...prev.variants,
                                    colors: updated,
                                  },
                                }));
                              }}
                              className="text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem((prev) => ({
                            ...prev,
                            variants: {
                              ...prev.variants,
                              colors: [
                                ...(prev.variants.colors || []),
                                { name: "", hex: "#000000" },
                              ],
                            },
                          }));
                        }}
                        className="text-blue-500 hover:underline mt-2"
                      >
                        + Add Color
                      </button>
                    </div>
                  )}
                  {store?.type === "product" && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Size Variants
                      </label>
                      {(editingItem?.variants?.sizes || []).map(
                        (size, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 mb-2"
                          >
                            <input
                              type="text"
                              placeholder="Size Name"
                              value={size.name}
                              onChange={(e) => {
                                const updated = [...editingItem.variants.sizes];
                                updated[index].name = e.target.value;
                                setEditingItem((prev) => ({
                                  ...prev,
                                  variants: {
                                    ...prev.variants,
                                    sizes: updated,
                                  },
                                }));
                              }}
                              className="border border-gray-300 rounded px-2 py-1"
                            />
                            <select
                              value={size.inStock ? "true" : "false"}
                              onChange={(e) => {
                                const updated = [...editingItem.variants.sizes];
                                updated[index].inStock =
                                  e.target.value === "true";
                                setEditingItem((prev) => ({
                                  ...prev,
                                  variants: {
                                    ...prev.variants,
                                    sizes: updated,
                                  },
                                }));
                              }}
                              className="border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="true">In Stock</option>
                              <option value="false">Out of Stock</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const updated =
                                  editingItem.variants.sizes.filter(
                                    (_, i) => i !== index
                                  );
                                setEditingItem((prev) => ({
                                  ...prev,
                                  variants: {
                                    ...prev.variants,
                                    sizes: updated,
                                  },
                                }));
                              }}
                              className="text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem((prev) => ({
                            ...prev,
                            variants: {
                              ...prev.variants,
                              sizes: [
                                ...(prev.variants.sizes || []),
                                { name: "", inStock: true },
                              ],
                            },
                          }));
                        }}
                        className="text-blue-500 hover:underline mt-2"
                      >
                        + Add Size
                      </button>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                    >
                      Update {store?.type === "product" ? "Product" : "Service"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreDashboard;
