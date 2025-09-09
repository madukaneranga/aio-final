import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatLKR } from "../utils/currency";
import {
  Plus,
  Package,
  DollarSign,
  TrendingUp,
  Settings,
  Store,
  Edit,
  Trash2,
  Eye,
  Star,
  Wallet,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import UpdateProduct from "../components/UpdateProduct";
import useUserPackage from "../hooks/useUserPackage";
import { useWallet } from "../hooks/useWallet";
import { storesAPI, productsAPI, ordersAPI, subscriptionsAPI } from "../utils/api";

const StoreDashboard = () => {
  const { user } = useAuth();
  const [store, setStore] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalEarnings: 0,
  });
  const {
    usageInfo,
    errorInfo,
    loadUsage,
    planInfo,
    limitsInfo,
    productsInfo,
    headerImagesInfo,
    variantsInfo,
  } = useUserPackage();

  const {
    wallet,
    summary: walletSummary,
    analytics,
    loading: walletLoading,
  } = useWallet();

  const [recentOrders, setRecentOrders] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== "store_owner") return;

    user?.storeId ? fetchDashboardData() : navigate("/create-store");
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    loadUsage();

    try {
      // --- Store ---
      if (user.storeId) {
        try {
          const storeData = await storesAPI.getById(user.storeId);
          setStore(storeData.store);

          // --- Products ---
          try {
            const productsData = await productsAPI.getAll({ storeId: user.storeId });
            setProducts(productsData);
            setStats((prev) => ({
              ...prev,
              totalProducts: productsData.length,
            }));
          } catch (productsError) {
            console.error("Error fetching products:", productsError);
            setProducts([]);
          }
        } catch (storeError) {
          console.error("Error fetching store:", storeError);
          setStore(null);
        }
      } else {
        setStore(null);
      }

      // --- Orders ---
      try {
        const orders = await ordersAPI.getOrdersByStore(user.storeId);
        setRecentOrders(orders.slice(0, 5));
        setStats((prev) => ({ ...prev, totalOrders: orders.length }));
      } catch (ordersError) {
        console.error("Error fetching orders:", ordersError);
        setRecentOrders([]);
      }

      // --- Subscription ---
      try {
        const subscriptionData = await subscriptionsAPI.getMySubscription();
        setSubscription(subscriptionData.subscription);
      } catch (subscriptionError) {
        console.error("Error fetching subscription:", subscriptionError);
        // Set a default pending subscription object instead of null
        setSubscription({ status: "pending", package: null });
      }
    } catch (error) {
      console.error("Unexpected error fetching dashboard data:", error);
      // Optional: show toast only for unexpected issues
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
  };

  const handleUpdateComplete = () => {
    fetchDashboardData();
    setEditingProduct(null);
  };

  const handleUpdateCancel = () => {
    setEditingProduct(null);
  };

  const handleDelete = async (itemId, type) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    setDeleting(itemId);
    try {
      await productsAPI.delete(itemId);
      setProducts(products.filter((p) => p._id !== itemId));
      alert("Product deleted successfully!");
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Error deleting product");
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

          <Link
            to="/create-product"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 flex items-center space-x-3"
          >
            <Plus className="w-8 h-8 text-black" />
            <div>
              <p className="font-semibold text-gray-900">Add Product</p>
              {productsInfo?.limitReached ? (
                <p className="text-sm text-red-500">Reached max products</p>
              ) : (
                <p className="text-sm text-gray-500">Create new product</p>
              )}
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

          <Link
            to="/wallet-dashboard"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 flex items-center space-x-3"
          >
            <Wallet className="w-8 h-8 text-green-600" />
            <div>
              <p className="font-semibold text-gray-900">Wallet & Credits</p>
              <div className="text-sm text-gray-500 space-y-1">
                <p>Balance: {walletSummary ? formatLKR(walletSummary.availableBalance) : "Loading..."}</p>
                <p>Credits: {walletSummary?.credits?.balance || 0}</p>
              </div>
            </div>
          </Link>

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

          {store && (
            <Link
              to={`/store/${store._id}`}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 flex items-center space-x-3"
            >
              <Store className="w-8 h-8 text-black" />
              <div>
                <p className="font-semibold text-gray-900">View My Store</p>
                <p className="text-sm text-gray-500">{store.name}</p>
              </div>
            </Link>
          )}
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
                {subscription.package && subscription.status === "active" ? (
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
                      A subscription is required to sell your products on AIO.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
                <p className="text-sm text-gray-500">Total Earnings</p>
                <p className="text-3xl font-bold text-gray-900">
                  {walletSummary ? formatLKR(walletSummary.totalEarnings || 0) : formatLKR(0)}
                </p>
                {walletSummary?.monthlyGrowth !== undefined && (
                  <p className={`text-sm ${walletSummary.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {walletSummary.monthlyGrowth >= 0 ? '+' : ''}{walletSummary.monthlyGrowth.toFixed(1)}% this month
                  </p>
                )}
              </div>
              <DollarSign className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Store Rating</p>
                <p className="text-3xl font-bold text-gray-900">
                  {store?.rating || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Management */}
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
                          onClick={() => handleEditProduct(product)}
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

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Activity
              </h2>
              <Link
                to="/orders"
                className="text-black hover:text-gray-700 text-sm"
              >
                View All
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No recent activity
              </p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((item) => (
                  <div
                    key={item._id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          Order #{item._id.slice(-6)}
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

        {/* Update Components */}
        {editingProduct && (
          <UpdateProduct
            product={editingProduct}
            onUpdate={handleUpdateComplete}
            onCancel={handleUpdateCancel}
            limitsInfo={limitsInfo}
          />
        )}
      </div>
    </div>
  );
};

export default StoreDashboard;