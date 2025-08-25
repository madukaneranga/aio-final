import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { 
  Calendar, 
  Eye, 
  Clock, 
  Download, 
  Building2, 
  Banknote,
  ChevronDown,
  ChevronUp 
} from "lucide-react";
import { Star } from "lucide-react";

const Bookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] =
    useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(null);
  const [markingDelivered, setMarkingDelivered] = useState(null);
  const [updatingPaymentStatus, setUpdatingPaymentStatus] = useState(null);
  const [expandedBookings, setExpandedBookings] = useState(new Set());

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const endpoint =
        user.role === "store_owner"
          ? "/api/bookings/store"
          : "/api/bookings/customer";
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/bookings/${bookingId}/status`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            
          },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        fetchBookings();
        setSelectedBooking(null);
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
    }
  };

  const openReviewModal = (booking) => {
    setSelectedBookingForReview(booking);
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
              selectedBookingForReview.storeId._id ||
              selectedBookingForReview.storeId,
            bookingId: selectedBookingForReview._id,
            rating: reviewData.rating,
            comment: reviewData.comment,
          }),
        }
      );

      if (response.ok) {
        alert("Review submitted successfully!");
        setShowReviewModal(false);
        setSelectedBookingForReview(null);
        fetchBookings(); // Refresh bookings to update review status
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

  // Download receipt function
  const downloadReceipt = async (bookingId, type) => {
    try {
      setDownloadingReceipt(bookingId);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/payments/download-receipt/${bookingId}?type=${type}`,
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
        a.download = `receipt_${bookingId}.pdf`;
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

  // Mark booking as completed (COD)
  const markBookingAsCompleted = async (bookingId) => {
    if (!confirm("Are you sure you want to mark this booking as completed?")) {
      return;
    }

    try {
      setMarkingDelivered(bookingId);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/bookings/${bookingId}/mark-delivered`,
        {
          method: "PUT",
          credentials: "include",
        }
      );

      if (response.ok) {
        alert("Booking marked as completed successfully!");
        fetchBookings(); // Refresh bookings
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error marking booking as completed:", error);
      alert("Error marking booking as completed. Please try again.");
    } finally {
      setMarkingDelivered(null);
    }
  };

  // Store owner updates payment status to paid
  const updatePaymentStatus = async (bookingId, paymentStatus) => {
    if (!confirm(`Are you sure you want to mark this payment as ${paymentStatus}?`)) {
      return;
    }

    try {
      setUpdatingPaymentStatus(bookingId);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/bookings/${bookingId}/update-payment-status`,
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
        fetchBookings(); // Refresh bookings
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

  // Toggle expand/collapse for bookings
  const toggleBookingExpansion = (bookingId) => {
    const newExpandedBookings = new Set(expandedBookings);
    if (newExpandedBookings.has(bookingId)) {
      newExpandedBookings.delete(bookingId);
    } else {
      newExpandedBookings.add(bookingId);
    }
    setExpandedBookings(newExpandedBookings);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Please log in to view bookings
          </h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {user.role === "store_owner" ? "Store Bookings" : "My Bookings"}
          </h1>
          <p className="text-gray-600 mt-2">
            {bookings.length} booking{bookings.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              No bookings found
            </h2>
            <p className="text-gray-600">
              {user.role === "store_owner"
                ? "You haven't received any bookings yet"
                : "You haven't made any bookings yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking) => {
              const isExpanded = expandedBookings.has(booking._id);
              
              return (
                <div
                  key={booking._id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
                >
                  {/* Compact Collapsed View - Mobile First */}
                  <div className="p-4">
                    {/* Main Row: Always visible */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleBookingExpansion(booking._id)}
                    >
                      {/* Left: Booking ID & Status */}
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-black" />
                          <span className="font-semibold text-gray-900 text-sm sm:text-base">
                            #{booking._id.slice(-6)}
                          </span>
                        </div>
                        <span
                          className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {booking.status}
                        </span>
                      </div>

                      {/* Right: Amount & Expand */}
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-bold text-gray-900 text-sm sm:text-base">
                            LKR {booking.totalAmount}
                          </p>
                          <p className="text-xs text-gray-500">
                            {booking.paymentDetails?.paymentStatus === "paid" ? "Paid" : "Pending"}
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
                          <span className="truncate max-w-20">{booking.serviceId?.title || "Service"}</span>
                          <span>{new Date(booking.bookingDate).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs">
                          <span>{booking.startTime}-{booking.endTime}</span>
                        </div>
                      </div>
                      {user.role === "store_owner" && (
                        <div className="mt-1 text-sm text-gray-600">
                          <span>Customer: {booking.customerId?.name || "Unknown"}</span>
                        </div>
                      )}
                    </div>

                    {/* Desktop Info Row: Hidden on mobile */}
                    <div className="hidden sm:flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <span>{booking.serviceId?.title || "Service"}</span>
                        <span>{new Date(booking.bookingDate).toLocaleDateString()}</span>
                        <span>{booking.startTime} - {booking.endTime}</span>
                        {user.role === "store_owner" && (
                          <span>Customer: {booking.customerId?.name || "Unknown"}</span>
                        )}
                      </div>

                      {/* Desktop Quick Actions */}
                      <div className="flex items-center space-x-2">
                        {/* Payment Status Update for Store Owners */}
                        {user.role === "store_owner" && booking.status !== "cancelled" && (
                          <>
                            {booking.paymentDetails?.paymentMethod === "bank_transfer" && 
                             booking.paymentDetails?.paymentStatus === "pending_bank_transfer" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePaymentStatus(booking._id, "paid");
                                }}
                                disabled={updatingPaymentStatus === booking._id}
                                className="bg-black text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 min-h-[36px]"
                              >
                                {updatingPaymentStatus === booking._id ? "..." : "Mark Paid"}
                              </button>
                            )}
                            
                            {booking.paymentDetails?.paymentMethod === "cod" && 
                             booking.paymentDetails?.paymentStatus === "cod_pending" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePaymentStatus(booking._id, "paid");
                                }}
                                disabled={updatingPaymentStatus === booking._id}
                                className="bg-black text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 min-h-[36px]"
                              >
                                {updatingPaymentStatus === booking._id ? "..." : "Mark Paid"}
                              </button>
                            )}
                          </>
                        )}

                        {/* COD Mark as Completed for Customers */}
                        {user.role === "customer" && 
                         booking.status !== "cancelled" &&
                         booking.paymentDetails?.paymentMethod === "cod" && 
                         booking.paymentDetails?.paymentStatus === "cod_pending" && 
                         booking.canCustomerUpdateStatus && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markBookingAsCompleted(booking._id);
                            }}
                            disabled={markingDelivered === booking._id}
                            className="bg-black text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 min-h-[36px]"
                          >
                            {markingDelivered === booking._id ? "..." : "Mark Complete"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile Quick Actions: Full width buttons below main content */}
                    <div className="sm:hidden">
                      {/* Payment Status Update for Store Owners */}
                      {user.role === "store_owner" && booking.status !== "cancelled" && (
                        <div className="mt-3 space-y-2">
                          {booking.paymentDetails?.paymentMethod === "bank_transfer" && 
                           booking.paymentDetails?.paymentStatus === "pending_bank_transfer" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePaymentStatus(booking._id, "paid");
                              }}
                              disabled={updatingPaymentStatus === booking._id}
                              className="w-full bg-black text-white py-2.5 rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
                            >
                              {updatingPaymentStatus === booking._id ? "Updating Payment..." : "Mark Payment as Paid"}
                            </button>
                          )}
                          
                          {booking.paymentDetails?.paymentMethod === "cod" && 
                           booking.paymentDetails?.paymentStatus === "cod_pending" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePaymentStatus(booking._id, "paid");
                              }}
                              disabled={updatingPaymentStatus === booking._id}
                              className="w-full bg-black text-white py-2.5 rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
                            >
                              {updatingPaymentStatus === booking._id ? "Updating Payment..." : "Mark COD Payment as Paid"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* COD Mark as Completed for Customers */}
                      {user.role === "customer" && 
                       booking.status !== "cancelled" &&
                       booking.paymentDetails?.paymentMethod === "cod" && 
                       booking.paymentDetails?.paymentStatus === "cod_pending" && 
                       booking.canCustomerUpdateStatus && (
                        <div className="mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markBookingAsCompleted(booking._id);
                            }}
                            disabled={markingDelivered === booking._id}
                            className="w-full bg-black text-white py-2.5 rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
                          >
                            {markingDelivered === booking._id ? "Marking as Completed..." : "Mark Service as Completed"}
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
                                {user.role === "store_owner" ? "Customer" : "Service"}
                              </p>
                              <p className="font-medium text-gray-900 text-sm">
                                {user.role === "store_owner"
                                  ? booking.customerId?.name || "Unknown Customer"
                                  : booking.serviceId?.title || "Unknown Service"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Booking Date</p>
                              <p className="font-medium text-gray-900 text-sm">
                                {new Date(booking.bookingDate).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {booking.startTime} - {booking.endTime}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                              <p
                                className={`font-medium text-sm ${
                                  booking.paymentDetails?.paymentStatus?.toLowerCase() === "paid"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {booking.paymentDetails?.paymentStatus?.toLowerCase() === "paid"
                                  ? "Paid"
                                  : "Payment Pending"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Service Details */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">
                            Service Information
                          </h4>
                          <div className="flex items-start space-x-4">
                            <img
                              src={
                                booking.serviceId?.images?.[0]
                                  ? booking.serviceId.images[0].startsWith("http")
                                    ? booking.serviceId.images[0]
                                    : `${import.meta.env.VITE_API_URL}${
                                        booking.serviceId.images[0]
                                      }`
                                  : "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop"
                              }
                              alt={booking.serviceId?.title || "Service"}
                              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm sm:text-base">
                                {booking.serviceId?.title || "Service"}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {booking.serviceId?.category || "Service"}
                              </p>
                              <p className="font-medium text-gray-900 text-sm mt-2">
                                LKR {booking.totalAmount}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        {booking.notes && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">
                              Special Notes
                            </h4>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                              {booking.notes}
                            </p>
                          </div>
                        )}

                        {/* Payment Method Details */}
                        {booking.paymentDetails && (
                          <div className="space-y-4">
                            {/* Bank Transfer - Customer View */}
                            {booking.paymentDetails.paymentMethod === "bank_transfer" && 
                             user.role === "customer" && 
                             booking.paymentDetails.paymentStatus === "pending_bank_transfer" && (
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3 mb-4">
                                  <Building2 className="w-5 h-5 text-black mt-1 flex-shrink-0" />
                                  <div>
                                    <h4 className="font-medium text-black mb-2 text-sm sm:text-base">
                                      Bank Transfer Instructions
                                    </h4>
                                    <p className="text-sm text-gray-700 mb-4">
                                      Please transfer LKR {booking.totalAmount} to the bank account below and contact the store with your receipt.
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Bank Details for Customer - Mobile Optimized */}
                                {booking.bankDetails && (
                                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="font-medium text-gray-900 text-sm">Bank Transfer Details</h4>
                                      <div className="flex items-center space-x-2">
                                        {booking.bankDetails.isVerified && (
                                          <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                                            ✓ Verified
                                          </span>
                                        )}
                                        {booking.bankDetails.isLocked && (
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
                                          <p className="text-black text-sm">{booking.bankDetails.bankName}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium text-gray-700 text-xs mb-1">Account Holder</p>
                                          <p className="text-black text-sm">{booking.bankDetails.accountHolderName}</p>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-700 text-xs mb-1">Account Number</p>
                                        <p className="text-black font-mono text-sm bg-white p-2 rounded border select-all">
                                          {booking.bankDetails.accountNumber}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-700 text-xs mb-1">Branch</p>
                                        <p className="text-black text-sm">{booking.bankDetails.branchName}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                  <p className="font-medium">Reference: Booking #{booking.combinedId || booking._id.slice(-8)}</p>
                                </div>
                              </div>
                            )}

                            {/* Bank Transfer - Store Owner View */}
                            {booking.paymentDetails.paymentMethod === "bank_transfer" && 
                             user.role === "store_owner" && 
                             booking.paymentDetails.paymentStatus === "pending_bank_transfer" && (
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3 mb-4">
                                  <Building2 className="w-5 h-5 text-black mt-1 flex-shrink-0" />
                                  <div>
                                    <h4 className="font-medium text-black mb-2 text-sm sm:text-base">
                                      Bank Transfer Payment
                                    </h4>
                                    <p className="text-sm text-gray-700">
                                      Waiting for customer to transfer LKR {booking.totalAmount}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => updatePaymentStatus(booking._id, "paid")}
                                  disabled={updatingPaymentStatus === booking._id}
                                  className="w-full sm:w-auto bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50 font-medium"
                                >
                                  {updatingPaymentStatus === booking._id ? "Updating Payment Status..." : "Mark Payment as Paid"}
                                </button>
                              </div>
                            )}

                            {/* COD - Customer View */}
                            {booking.paymentDetails.paymentMethod === "cod" && 
                             booking.paymentDetails.paymentStatus === "cod_pending" && 
                             user.role === "customer" && 
                             booking.canCustomerUpdateStatus && (
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3 mb-4">
                                  <Banknote className="w-5 h-5 text-black mt-1 flex-shrink-0" />
                                  <div>
                                    <h4 className="font-medium text-black mb-2 text-sm sm:text-base">
                                      Cash on Service
                                    </h4>
                                    <p className="text-sm text-gray-700">
                                      Mark as completed once service is finished
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => markBookingAsCompleted(booking._id)}
                                  disabled={markingDelivered === booking._id}
                                  className="w-full sm:w-auto bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50 font-medium"
                                >
                                  {markingDelivered === booking._id ? "Marking as Completed..." : "Mark Service as Completed"}
                                </button>
                              </div>
                            )}

                            {/* COD - Store Owner View */}
                            {booking.paymentDetails.paymentMethod === "cod" && 
                             booking.paymentDetails.paymentStatus === "cod_pending" && 
                             user.role === "store_owner" && (
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3 mb-4">
                                  <Banknote className="w-5 h-5 text-black mt-1 flex-shrink-0" />
                                  <div>
                                    <h4 className="font-medium text-black mb-2 text-sm sm:text-base">
                                      Cash on Service
                                    </h4>
                                    <p className="text-sm text-gray-700">
                                      Mark as paid when you receive payment: LKR {booking.totalAmount}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => updatePaymentStatus(booking._id, "paid")}
                                  disabled={updatingPaymentStatus === booking._id}
                                  className="w-full sm:w-auto bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50 font-medium"
                                >
                                  {updatingPaymentStatus === booking._id ? "Updating Payment Status..." : "Mark Payment as Paid"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Receipt Download */}
                        {booking.receiptGenerated && booking.receiptUrl && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3 mb-3">
                              <Download className="w-5 h-5 text-black mt-1 flex-shrink-0" />
                              <div>
                                <h4 className="font-medium text-black mb-1 text-sm sm:text-base">Receipt Available</h4>
                                <p className="text-sm text-gray-600">Download your booking receipt as PDF</p>
                              </div>
                            </div>
                            <button
                              onClick={() => downloadReceipt(booking._id, 'booking')}
                              disabled={downloadingReceipt === booking._id}
                              className="w-full sm:w-auto bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50 font-medium"
                            >
                              {downloadingReceipt === booking._id ? "Downloading PDF..." : "Download Receipt"}
                            </button>
                          </div>
                        )}

                        {/* Review Section for Completed Bookings */}
                        {booking.status === "completed" && user.role === "customer" && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">
                              Service Completed ✅
                            </h4>
                            {booking.reviewed ? (
                              <p className="text-sm text-gray-600">
                                Thank you! You have already reviewed this service.
                              </p>
                            ) : (
                              <>
                                <p className="text-sm text-gray-600 mb-4">
                                  How was your experience with this service?
                                </p>
                                <button
                                  onClick={() => openReviewModal(booking)}
                                  className="w-full sm:w-auto bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                >
                                  Write a Review
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="space-y-4">
                            {/* View Details Button */}
                            <button
                              onClick={() => setSelectedBooking(booking)}
                              className="w-full flex items-center justify-center space-x-2 text-black border border-gray-300 py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View Full Details</span>
                            </button>

                            {/* Store Owner Actions */}
                            {user.role === "store_owner" && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {booking.status === "pending" && (
                                  <button
                                    onClick={() => updateBookingStatus(booking._id, "confirmed")}
                                    className="bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                  >
                                    Confirm Booking
                                  </button>
                                )}
                                {booking.status === "confirmed" && (
                                  <button
                                    onClick={() => updateBookingStatus(booking._id, "completed")}
                                    className="bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                  >
                                    Mark Completed
                                  </button>
                                )}
                                {booking.status !== "completed" && booking.status !== "cancelled" && (
                                  <button
                                    onClick={() => updateBookingStatus(booking._id, "cancelled")}
                                    className="bg-gray-600 text-white py-2.5 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                                  >
                                    Cancel Booking
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

        {/* Booking Details Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Booking Details #{selectedBooking._id.slice(-6)}
                </h2>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p>
                    <strong>Service:</strong> {selectedBooking.serviceId?.title}
                  </p>
                  <p>
                    <strong>Status:</strong> {selectedBooking.status}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(selectedBooking.bookingDate).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Time:</strong> {selectedBooking.startTime} -{" "}
                    {selectedBooking.endTime}
                  </p>
                  <p>
                    <strong>Total:</strong> {selectedBooking.totalAmount} LKR
                  </p>
                  <p>
                    <strong>Platform Fee:</strong> {selectedBooking.platformFee}{" "}
                    LKR
                  </p>
                  <p>
                    <strong>Store Amount:</strong> {selectedBooking.storeAmount}{" "}
                    LKR
                  </p>
                </div>

                {selectedBooking.notes && (
                  <div>
                    <h3 className="font-semibold">Notes:</h3>
                    <p>{selectedBooking.notes}</p>
                  </div>
                )}

                {selectedBooking.paymentDetails && (
                  <div>
                    <h3 className="font-semibold">Payment Details:</h3>
                    <p>
                      Status: {selectedBooking.paymentDetails.paymentStatus}
                    </p>
                    {selectedBooking.paymentDetails.paidAt && (
                      <p>
                        Paid:{" "}
                        {new Date(
                          selectedBooking.paymentDetails.paidAt
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedBookingForReview && (
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
                  placeholder="Share your experience with this service..."
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

export default Bookings;
