import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatLKR } from "../utils/currency";
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

  /*useEffect(() => {
    if (user?.role === "store_owner") {
      fetchDashboardData();
    }
  }, [user]);*/

  useEffect(() => {
    if (user?.role === "store_owner" && user?.storeId) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch store data first
      if (user.storeId) {
        const storeResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/stores/${user.storeId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (!storeResponse.ok) {
          throw new Error("Failed to fetch store data");
        }
        const storeData = await storeResponse.json();
        setStore(storeData.store);

        // Fetch products only if store type is 'product'
        if (storeData.store?.type === "product") {
          const productsResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/api/products?storeId=${
              user.storeId
            }`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          if (!productsResponse.ok) {
            throw new Error("Failed to fetch products");
          }
          const productsData = await productsResponse.json();
          setProducts(productsData);
          setStats((prev) => ({ ...prev, totalProducts: productsData.length }));
        } else if (storeData.store?.type === "service") {
          const servicesResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/api/services?storeId=${
              user.storeId
            }`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          if (!servicesResponse.ok) {
            throw new Error("Failed to fetch services");
          }
          const servicesData = await servicesResponse.json();
          setServices(servicesData);
          setStats((prev) => ({ ...prev, totalServices: servicesData.length }));
        }
      }

      // Fetch orders
      const ordersResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/orders/store`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!ordersResponse.ok) {
        throw new Error("Failed to fetch orders");
      }
      const orders = await ordersResponse.json();
      setRecentOrders(orders.slice(0, 5));
      setStats((prev) => ({ ...prev, totalOrders: orders.length }));

      // Fetch bookings
      const bookingsResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/bookings/store`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!bookingsResponse.ok) {
        throw new Error("Failed to fetch bookings");
      }
      const bookings = await bookingsResponse.json();
      setRecentBookings(bookings.slice(0, 5));
      setStats((prev) => ({ ...prev, totalBookings: bookings.length }));

      // Fetch subscription
      const subscriptionResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscriptions/my-subscription`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!subscriptionResponse.ok) {
        throw new Error("Failed to fetch subscription");
      }
      const subscriptionData = await subscriptionResponse.json();
      setSubscription(subscriptionData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Optionally show an error message to the user
      alert("Failed to load dashboard data. Please try again.");
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

        // 🔥 Start PayHere payment modal
        await startPayHerePayment(paymentParams);

        alert("Your monthly subscription (LKR 1,500) is now active.");
        fetchDashboardData(); // ✅ Refresh UI
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

  const handleEdit = (item) => {
    setEditingItem({
      ...item,
      price: item.price.toString(),
      stock: item.stock?.toString() || "",
      duration: item.duration?.toString() || "",
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
      };

      if (store?.type === "product") {
        updates.stock = editingItem.stock;
      } else {
        updates.duration = editingItem.duration;
        updates.priceType = editingItem.priceType || "fixed";
      }

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

        {/* Subscription Status */}
        {subscription && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Subscription Status
                </h3>
                <p className="text-gray-600">
                  Status:{" "}
                  <span
                    className={`font-medium ${
                      subscription.status === "active"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {subscription.status.toUpperCase()}
                  </span>
                </p>
                <p className="text-gray-600">
                  Package:{" "}
                  <span className="font-medium text-amber-600">
                    {subscription.package.toUpperCase()}
                  </span>
                </p>

                <p className="text-gray-600">
                  Expires: {new Date(subscription.endDate).toLocaleDateString()}
                </p>
                <p className="text-gray-600">
                  Monthly Fee: {formatLKR(subscription.amount)}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
                {subscription.status === "cancelled" && (
                  <button
                    onClick={createSubscription}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
                  >
                    Re-Subscribe
                  </button>
                )}
                {subscription.status !== "cancelled" &&
                  new Date(subscription.startdate).getTime() +
                    6 * 24 * 60 * 60 * 1000 <
                    new Date().getTime() && (
                    <button
                      onClick={cancelSubscription}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors w-full sm:w-auto"
                    >
                      Cancel Subscription
                    </button>
                  )}
              </div>
            </div>
          </div>
        )}

        {!subscription && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Subscription Status
                </h3>
                <p className="text-gray-600">
                  Status: <span className="text-red-600">PENDING</span>
                </p>
                <p className="text-red-600">
                  A subscription is required to sell your products or services
                  on AIO.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
                <button
                  onClick={createSubscription}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        )}

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
