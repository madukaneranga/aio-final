import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Truck,
  MapPin,
  Timer,
  AlertCircle,
  Download,
  CreditCard,
  Building2,
  Banknote,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import { Star } from "lucide-react";

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(null);
  const [markingDelivered, setMarkingDelivered] = useState(null);
  const [updatingPaymentStatus, setUpdatingPaymentStatus] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  useEffect(() => {
    if (user) {
      fetchOrders();
      // Set up real-time updates
      const interval = setInterval(fetchOrders, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const endpoint =
        user.role === "store_owner"
          ? "/api/orders/store"
          : "/api/orders/customer";
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status, notes = "") => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/orders/${orderId}/status`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status, notes }),
        }
      );

      if (response.ok) {
        fetchOrders();
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const cancelOrder = async (orderId) => {
    setCancelling(orderId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/payments/${orderId}/cancel`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "cancelled" }),
        }
      );

      if (response.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
    } finally {
      setCancelling(null);
    }
  };

  const openReviewModal = (order) => {
    setSelectedOrderForReview(order);
    setReviewData({ rating: 5, comment: "" });
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/reviews`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            storeId:
              selectedOrderForReview.storeId._id ||
              selectedOrderForReview.storeId,
            orderId: selectedOrderForReview._id,
            rating: reviewData.rating,
            comment: reviewData.comment,
          }),
        }
      );

      if (response.ok) {
        alert("Review submitted successfully!");
        setShowReviewModal(false);
        setSelectedOrderForReview(null);
        fetchOrders(); // Refresh orders to update review status
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "processing":
        return "bg-purple-100 text-purple-800";
      case "ready":
        return "bg-indigo-100 text-indigo-800";
      case "shipped":
        return "bg-orange-100 text-orange-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "accepted":
        return <CheckCircle className="w-4 h-4" />;
      case "processing":
        return <Package className="w-4 h-4" />;
      case "ready":
        return <Package className="w-4 h-4" />;
      case "shipped":
        return <Truck className="w-4 h-4" />;
      case "delivered":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const canCancelOrder = (order) => {
    if (order.status !== "pending") return false;
    const orderTime = new Date(order.createdAt);
    const now = new Date();
    const timeDiff = (now - orderTime) / (1000 * 60); // difference in minutes
    return timeDiff < 5; // Can cancel within 5 minutes
  };

  const getTimeRemaining = (order) => {
    const orderTime = new Date(order.createdAt);
    const now = new Date();
    const timeDiff = (now - orderTime) / (1000 * 60); // difference in minutes
    const remaining = Math.max(0, 5 - timeDiff);
    return remaining;
  };

  const CountdownTimer = ({ order }) => {
    const [timeLeft, setTimeLeft] = useState(getTimeRemaining(order));

    useEffect(() => {
      const timer = setInterval(() => {
        const remaining = getTimeRemaining(order);
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }, [order]);

    if (timeLeft <= 0 || order.status !== "pending") return null;

    const minutes = Math.floor(timeLeft);
    const seconds = Math.floor((timeLeft - minutes) * 60);

    return (
      <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
        <Timer className="w-4 h-4" />
        <span className="text-sm font-medium">
          Cancel within: {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </div>
    );
  };

  // Download receipt function
  const downloadReceipt = async (orderId, type) => {
    try {
      setDownloadingReceipt(orderId);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/payments/download-receipt/${orderId}?type=${type}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `receipt_${orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        alert(`Error downloading receipt: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error downloading receipt:", error);
      alert("Error downloading receipt. Please try again.");
    } finally {
      setDownloadingReceipt(null);
    }
  };

  // Mark order as delivered (COD)
  const markOrderAsDelivered = async (orderId) => {
    if (!confirm("Are you sure you want to mark this order as delivered?")) {
      return;
    }

    try {
      setMarkingDelivered(orderId);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/orders/${orderId}/mark-delivered`,
        {
          method: "PUT",
          credentials: "include",
        }
      );

      if (response.ok) {
        alert("Order marked as delivered successfully!");
        fetchOrders(); // Refresh orders
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error marking order as delivered:", error);
      alert("Error marking order as delivered. Please try again.");
    } finally {
      setMarkingDelivered(null);
    }
  };

  // Store owner updates payment status to paid
  const updatePaymentStatus = async (orderId, paymentStatus) => {
    if (!confirm(`Are you sure you want to mark this payment as ${paymentStatus}?`)) {
      return;
    }

    try {
      setUpdatingPaymentStatus(orderId);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/orders/${orderId}/update-payment-status`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paymentStatus }),
        }
      );

      if (response.ok) {
        alert("Payment status updated successfully!");
        fetchOrders(); // Refresh orders
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("Error updating payment status. Please try again.");
    } finally {
      setUpdatingPaymentStatus(null);
    }
  };

  // Toggle expand/collapse for orders
  const toggleOrderExpansion = (orderId) => {
    const newExpandedOrders = new Set(expandedOrders);
    if (newExpandedOrders.has(orderId)) {
      newExpandedOrders.delete(orderId);
    } else {
      newExpandedOrders.add(orderId);
    }
    setExpandedOrders(newExpandedOrders);
  };

  const filteredOrders = orders.filter(
    (order) => filter === "all" || order.status === filter
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Please log in to view orders
          </h2>
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
          <h1 className="text-3xl font-bold text-gray-900">
            {user.role === "store_owner" ? "Store Orders" : "My Orders"}
          </h1>
          <p className="text-gray-600 mt-2">
            {orders.length} order{orders.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All Orders" },
              { key: "pending", label: "Pending" },
              { key: "accepted", label: "Accepted" },
              { key: "processing", label: "Processing" },
              { key: "ready", label: "Ready" },
              { key: "shipped", label: "Shipped" },
              { key: "delivered", label: "Delivered" },
              { key: "cancelled", label: "Cancelled" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === key
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders found"
            description="You haven't placed any orders yet or no orders match your current filter."
          />
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrders.has(order._id);
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
              
              return (
                <div
                  key={order._id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
                >
                  {/* Compact Collapsed View - Mobile First */}
                  <div className="p-4">
                    {/* Main Row: Always visible */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleOrderExpansion(order._id)}
                    >
                      {/* Left: Order ID & Status */}
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(order.status)}
                          <span className="font-semibold text-gray-900 text-sm sm:text-base">
                            #{order._id.slice(-8)}
                          </span>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>

                      {/* Right: Amount & Expand */}
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-bold text-gray-900 text-sm sm:text-base">
                            LKR {order.totalAmount}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.paymentDetails?.paymentStatus === "paid" ? "Paid" : "Pending"}
                          </p>
                        </div>
                        
                        <button className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Mobile Info Row: Visible on mobile only */}
                    <div className="mt-3 sm:hidden">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-3">
                          <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                          {user.role === "store_owner" && (
                            <span>{order.customerId?.name || "Unknown"}</span>
                          )}
                          {user.role === "customer" && (
                            <span className="truncate max-w-24">{order.storeId?.name || "Unknown Store"}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Info Row: Hidden on mobile */}
                    <div className="hidden sm:flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                        {user.role === "store_owner" && (
                          <span>Customer: {order.customerId?.name || "Unknown"}</span>
                        )}
                        {user.role === "customer" && (
                          <span>Store: {order.storeId?.name || "Unknown Store"}</span>
                        )}
                      </div>

                      {/* Desktop Quick Actions */}
                      <div className="flex items-center space-x-2">
                        {/* Payment Status Update for Store Owners */}
                        {user.role === "store_owner" && order.status !== "cancelled" && (
                          <>
                            {order.paymentDetails?.paymentMethod === "bank_transfer" && 
                             order.paymentDetails?.paymentStatus === "pending_bank_transfer" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePaymentStatus(order._id, "paid");
                                }}
                                disabled={updatingPaymentStatus === order._id}
                                className="bg-black text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 min-h-[36px]"
                              >
                                {updatingPaymentStatus === order._id ? "..." : "Mark Paid"}
                              </button>
                            )}
                            
                            {order.paymentDetails?.paymentMethod === "cod" && 
                             order.paymentDetails?.paymentStatus === "cod_pending" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePaymentStatus(order._id, "paid");
                                }}
                                disabled={updatingPaymentStatus === order._id}
                                className="bg-black text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 min-h-[36px]"
                              >
                                {updatingPaymentStatus === order._id ? "..." : "Mark Paid"}
                              </button>
                            )}
                          </>
                        )}

                        {/* COD Mark as Delivered for Customers */}
                        {user.role === "customer" && 
                         order.status !== "cancelled" &&
                         order.paymentDetails?.paymentMethod === "cod" && 
                         order.paymentDetails?.paymentStatus === "cod_pending" && 
                         order.canCustomerUpdateStatus && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markOrderAsDelivered(order._id);
                            }}
                            disabled={markingDelivered === order._id}
                            className="bg-black text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 min-h-[36px]"
                          >
                            {markingDelivered === order._id ? "..." : "Mark Delivered"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile Quick Actions: Full width buttons below main content */}
                    <div className="sm:hidden">
                      {/* Payment Status Update for Store Owners */}
                      {user.role === "store_owner" && order.status !== "cancelled" && (
                        <div className="mt-3 space-y-2">
                          {order.paymentDetails?.paymentMethod === "bank_transfer" && 
                           order.paymentDetails?.paymentStatus === "pending_bank_transfer" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePaymentStatus(order._id, "paid");
                              }}
                              disabled={updatingPaymentStatus === order._id}
                              className="w-full bg-black text-white py-2.5 rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
                            >
                              {updatingPaymentStatus === order._id ? "Updating Payment..." : "Mark Payment as Paid"}
                            </button>
                          )}
                          
                          {order.paymentDetails?.paymentMethod === "cod" && 
                           order.paymentDetails?.paymentStatus === "cod_pending" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePaymentStatus(order._id, "paid");
                              }}
                              disabled={updatingPaymentStatus === order._id}
                              className="w-full bg-black text-white py-2.5 rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
                            >
                              {updatingPaymentStatus === order._id ? "Updating Payment..." : "Mark COD Payment as Paid"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* COD Mark as Delivered for Customers */}
                      {user.role === "customer" && 
                       order.status !== "cancelled" &&
                       order.paymentDetails?.paymentMethod === "cod" && 
                       order.paymentDetails?.paymentStatus === "cod_pending" && 
                       order.canCustomerUpdateStatus && (
                        <div className="mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markOrderAsDelivered(order._id);
                            }}
                            disabled={markingDelivered === order._id}
                            className="w-full bg-black text-white py-2.5 rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
                          >
                            {markingDelivered === order._id ? "Marking as Delivered..." : "Mark Order as Delivered"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 animate-in slide-in-from-top duration-200">
                      <div className="p-4 space-y-6">
                        {/* Summary Card - Mobile Priority */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">
                                {user.role === "store_owner" ? "Customer" : "Store"}
                              </p>
                              <p className="font-medium text-gray-900 text-sm">
                                {user.role === "store_owner"
                                  ? order.customerId?.name || "Unknown Customer"
                                  : order.storeId?.name || "Unknown Store"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Order Date</p>
                              <p className="font-medium text-gray-900 text-sm">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                              <p
                                className={`font-medium text-sm ${
                                  order.paymentDetails?.paymentStatus?.toLowerCase() === "paid"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {order.paymentDetails?.paymentStatus?.toLowerCase() === "paid"
                                  ? "Paid"
                                  : "Payment Pending"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">
                            Order Items ({itemCount} item{itemCount !== 1 ? 's' : ''})
                          </h4>
                          <div className="space-y-3">
                            {order.items.map((item, index) => (
                              <div
                                key={index}
                                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                              >
                                <img
                                  src={
                                    item.productId?.images?.[0]
                                      ? item.productId.images[0].startsWith("http")
                                        ? item.productId.images[0]
                                        : `${import.meta.env.VITE_API_URL}${
                                            item.productId.images[0]
                                          }`
                                      : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop"
                                  }
                                  alt={item.productId?.title || "Product"}
                                  className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                    {item.productId?.title || "Product"}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-sm text-gray-500">
                                      Qty: {item.quantity}
                                    </p>
                                    <p className="font-medium text-gray-900 text-sm">
                                      LKR {(item.price * item.quantity).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Shipping Address */}
                        {order.shippingAddress && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                              <MapPin className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">
                                  Shipping Address
                                </h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p>{order.shippingAddress.street}</p>
                                  <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                                  <p>{order.shippingAddress.zipCode}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tracking Number */}
                        {order.trackingNumber && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                              <Truck className="w-5 h-5 text-black mt-1 flex-shrink-0" />
                              <div>
                                <h4 className="font-medium text-black mb-2 text-sm sm:text-base">
                                  Tracking Information
                                </h4>
                                <p className="text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded">
                                  {order.trackingNumber}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Review Section for Delivered Orders */}
                        {order.status === "delivered" && user.role === "customer" && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">
                              Order Completed ✅
                            </h4>
                            {order.reviewed ? (
                              <p className="text-sm text-gray-600">
                                Thank you! You have already reviewed this order.
                              </p>
                            ) : (
                              <>
                                <p className="text-sm text-gray-600 mb-4">
                                  How was your experience with this order?
                                </p>
                                <button
                                  onClick={() => openReviewModal(order)}
                                  className="w-full sm:w-auto bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                >
                                  Write a Review
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Payment Method Details */}
                        {order.paymentDetails && (
                          <div className="space-y-4">
                            {/* Bank Transfer - Customer View */}
                            {order.paymentDetails.paymentMethod === "bank_transfer" && 
                             user.role === "customer" && 
                             order.paymentDetails.paymentStatus === "pending_bank_transfer" && (
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3 mb-4">
                                  <Building2 className="w-5 h-5 text-black mt-1 flex-shrink-0" />
                                  <div>
                                    <h4 className="font-medium text-black mb-2 text-sm sm:text-base">
                                      Bank Transfer Instructions
                                    </h4>
                                    <p className="text-sm text-gray-700 mb-4">
                                      Please transfer LKR {order.totalAmount} to the bank account below and contact the store with your receipt.
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Bank Details for Customer - Mobile Optimized */}
                                {order.bankDetails && (
                                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="font-medium text-gray-900 text-sm">Bank Transfer Details</h4>
                                      <div className="flex items-center space-x-2">
                                        {order.bankDetails.isVerified && (
                                          <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                                            ✓ Verified
                                          </span>
                                        )}
                                        {order.bankDetails.isLocked && (
                                          <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
                                            🔒 Secured
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                          <p className="font-medium text-gray-700 text-xs mb-1">Bank Name</p>
                                          <p className="text-black text-sm">{order.bankDetails.bankName}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium text-gray-700 text-xs mb-1">Account Holder</p>
                                          <p className="text-black text-sm">{order.bankDetails.accountHolderName}</p>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-700 text-xs mb-1">Account Number</p>
                                        <p className="text-black font-mono text-sm bg-white p-2 rounded border select-all">
                                          {order.bankDetails.accountNumber}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-700 text-xs mb-1">Branch</p>
                                        <p className="text-black text-sm">{order.bankDetails.branchName}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                  <p className="font-medium">Reference: Order #{order.combinedId || order._id.slice(-8)}</p>
                                </div>
                              </div>
                            )}

                            {/* Bank Transfer - Store Owner View */}
                            {order.paymentDetails.paymentMethod === "bank_transfer" && 
                             user.role === "store_owner" && 
                             order.paymentDetails.paymentStatus === "pending_bank_transfer" && (
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3 mb-4">
                                  <Building2 className="w-5 h-5 text-black mt-1 flex-shrink-0" />
                                  <div>
                                    <h4 className="font-medium text-black mb-2 text-sm sm:text-base">
                                      Bank Transfer Payment
                                    </h4>
                                    <p className="text-sm text-gray-700">
                                      Waiting for customer to transfer LKR {order.totalAmount}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => updatePaymentStatus(order._id, "paid")}
                                  disabled={updatingPaymentStatus === order._id}
                                  className="w-full sm:w-auto bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50 font-medium"
                                >
                                  {updatingPaymentStatus === order._id ? "Updating Payment Status..." : "Mark Payment as Paid"}
                                </button>
                              </div>
                            )}

                            {/* COD - Customer View */}
                            {order.paymentDetails.paymentMethod === "cod" && 
                             order.paymentDetails.paymentStatus === "cod_pending" && 
                             user.role === "customer" && 
                             order.canCustomerUpdateStatus && (
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3 mb-4">
                                  <Banknote className="w-5 h-5 text-black mt-1 flex-shrink-0" />
                                  <div>
                                    <h4 className="font-medium text-black mb-2 text-sm sm:text-base">
                                      Cash on Delivery
                                    </h4>
                                    <p className="text-sm text-gray-700">
                                      Mark as delivered once you receive your order
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => markOrderAsDelivered(order._id)}
                                  disabled={markingDelivered === order._id}
                                  className="w-full sm:w-auto bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50 font-medium"
                                >
                                  {markingDelivered === order._id ? "Marking as Delivered..." : "Mark Order as Delivered"}
                                </button>
                              </div>
                            )}

                            {/* COD - Store Owner View */}
                            {order.paymentDetails.paymentMethod === "cod" && 
                             order.paymentDetails.paymentStatus === "cod_pending" && 
                             user.role === "store_owner" && (
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3 mb-4">
                                  <Banknote className="w-5 h-5 text-black mt-1 flex-shrink-0" />
                                  <div>
                                    <h4 className="font-medium text-black mb-2 text-sm sm:text-base">
                                      Cash on Delivery
                                    </h4>
                                    <p className="text-sm text-gray-700">
                                      Mark as paid when you receive payment: LKR {order.totalAmount}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => updatePaymentStatus(order._id, "paid")}
                                  disabled={updatingPaymentStatus === order._id}
                                  className="w-full sm:w-auto bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50 font-medium"
                                >
                                  {updatingPaymentStatus === order._id ? "Updating Payment Status..." : "Mark Payment as Paid"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Receipt Download */}
                        {order.receiptGenerated && order.receiptUrl && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3 mb-3">
                              <Download className="w-5 h-5 text-black mt-1 flex-shrink-0" />
                              <div>
                                <h4 className="font-medium text-black mb-1 text-sm sm:text-base">Receipt Available</h4>
                                <p className="text-sm text-gray-600">Download your order receipt as PDF</p>
                              </div>
                            </div>
                            <button
                              onClick={() => downloadReceipt(order._id, 'order')}
                              disabled={downloadingReceipt === order._id}
                              className="w-full sm:w-auto bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50 font-medium"
                            >
                              {downloadingReceipt === order._id ? "Downloading PDF..." : "Download Receipt"}
                            </button>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="space-y-4">
                            {/* View Details Button */}
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="w-full flex items-center justify-center space-x-2 text-black border border-gray-300 py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View Full Details</span>
                            </button>

                            {/* Store Owner Actions */}
                            {user.role === "store_owner" && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {order.status === "pending" && (
                                  <button
                                    onClick={() => updateOrderStatus(order._id, "accepted")}
                                    className="bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                  >
                                    Accept Order
                                  </button>
                                )}
                                {order.status === "accepted" && (
                                  <button
                                    onClick={() => updateOrderStatus(order._id, "processing")}
                                    className="bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                  >
                                    Start Processing
                                  </button>
                                )}
                                {order.status === "processing" && (
                                  <button
                                    onClick={() => updateOrderStatus(order._id, "ready")}
                                    className="bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                  >
                                    Mark Ready
                                  </button>
                                )}
                                {order.status === "ready" && (
                                  <button
                                    onClick={() => updateOrderStatus(order._id, "shipped")}
                                    className="bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                  >
                                    Ship Order
                                  </button>
                                )}
                                {order.status === "shipped" && (
                                  <button
                                    onClick={() => updateOrderStatus(order._id, "delivered")}
                                    className="bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                  >
                                    Mark Delivered
                                  </button>
                                )}
                                {order.status !== "cancelled" && order.status !== "delivered" && (
                                  <button
                                    onClick={() => updateOrderStatus(order._id, "cancelled")}
                                    className="bg-gray-600 text-white py-2.5 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                                  >
                                    Cancel Order
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Order Details #{selectedOrder._id.slice(-8)}
                  </h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Order Status */}
                  <div className="flex items-center space-x-4">
                    <StatusBadge status={selectedOrder.status} />
                    <span className="text-gray-600">
                      Ordered on{" "}
                      {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Items */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
                        >
                          <img
                            src={
                              item.productId?.images?.[0]
                                ? item.productId.images[0].startsWith("http")
                                  ? item.productId.images[0]
                                  : `${import.meta.env.VITE_API_URL}${
                                      item.productId.images[0]
                                    }`
                                : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop"
                            }
                            alt={item.productId?.title || "Product"}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {item.productId?.title || "Product"}
                            </h4>
                            <p className="text-gray-600">
                              Quantity: {item.quantity}
                            </p>
                            <p className="text-gray-600">
                              Price: LKR {item.price}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            LKR {(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">
                      Order Summary
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>LKR {selectedOrder.storeAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Platform Fee:</span>
                        <span>LKR {selectedOrder.platformFee}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>LKR {selectedOrder.totalAmount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  {selectedOrder.shippingAddress && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">
                        Shipping Address
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p>{selectedOrder.shippingAddress.street}</p>
                        <p>
                          {selectedOrder.shippingAddress.city},{" "}
                          {selectedOrder.shippingAddress.state}
                        </p>
                        <p>
                          {selectedOrder.shippingAddress.zipCode},{" "}
                          {selectedOrder.shippingAddress.country}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Payment Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Payment Details
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p>
                        <strong>Status:</strong>{" "}
                        {selectedOrder.paymentDetails?.paymentStatus || "Paid"}
                      </p>
                      <p>
                        <strong>Method:</strong>{" "}
                        {selectedOrder.paymentDetails?.paymentMethod ||
                          "Local Payment"}
                      </p>
                      {selectedOrder.paymentDetails?.paidAt && (
                        <p>
                          <strong>Paid At:</strong>{" "}
                          {new Date(
                            selectedOrder.paymentDetails.paidAt
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedOrderForReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Write a Review
              </h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setReviewData({ ...reviewData, rating: star })
                      }
                      className={`w-8 h-8 ${
                        star <= reviewData.rating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    >
                      <Star className="w-full h-full" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review
                </label>
                <textarea
                  value={reviewData.comment}
                  onChange={(e) =>
                    setReviewData({ ...reviewData, comment: e.target.value })
                  }
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Share your experience with this order..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
