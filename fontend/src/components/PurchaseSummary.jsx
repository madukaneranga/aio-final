import React, { useState } from "react";
import { 
  Package, 
  Calendar, 
  Clock, 
  MapPin, 
  CreditCard, 
  Copy, 
  Check,
  Receipt as ReceiptIcon,
  Truck,
  User,
  Store,
  Phone,
  Mail,
  CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatLKR } from "../utils/currency";
import { 
  calculateDeliveryEstimate, 
  getDeliveryEstimateText,
  hasPreorderItems,
  getProvinceFromCity,
  createDeliveryTimeline
} from "../utils/deliveryEstimate";

const PurchaseSummary = ({ data, type = "order" }) => {
  const [copiedId, setCopiedId] = useState(false);
  
  if (!data) return null;

  const isOrder = type === "order";
  const purchaseId = data.combinedId || data._id;
  const shortId = purchaseId.slice(-8).toUpperCase();

  // Copy purchase ID to clipboard
  const handleCopyId = () => {
    navigator.clipboard.writeText(purchaseId).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }).catch(() => {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = purchaseId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  // Calculate delivery estimate for orders
  let deliveryEstimate = null;
  if (isOrder && data.shippingAddress) {
    const customerProvince = getProvinceFromCity(data.shippingAddress.state);
    const storeProvince = data.storeId?.province || "Western";
    const hasPreorder = hasPreorderItems(data.items);
    
    deliveryEstimate = calculateDeliveryEstimate({
      customerProvince,
      storeProvince,
      shippingMethod: "standard", // You can make this dynamic based on order
      hasPreorderItems: hasPreorder,
      storeProcessingDays: 1
    });
  }

  // Format date for display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get payment method display
  const getPaymentMethodDisplay = (method) => {
    switch (method) {
      case 'payhere': return 'PayHere (Online Payment)';
      case 'bank_transfer': return 'Bank Transfer';
      case 'cod': return 'Cash on Delivery';
      default: return method || 'Unknown';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'processing': return 'text-purple-600 bg-purple-100';
      case 'shipped': return 'text-indigo-600 bg-indigo-100';
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Purchase Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isOrder ? "Order Confirmed!" : "Booking Confirmed!"}
              </h2>
              <p className="text-gray-600">
                Your {isOrder ? "order" : "booking"} has been successfully processed
              </p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(data.status)}`}>
            {data.status?.charAt(0).toUpperCase() + data.status?.slice(1)}
          </div>
        </div>

        {/* Purchase ID */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">{isOrder ? "Order" : "Booking"} ID</p>
            <p className="text-lg font-mono font-semibold text-gray-900">#{shortId}</p>
          </div>
          <button
            onClick={handleCopyId}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {copiedId ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy ID</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Items/Service Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isOrder ? "Order Items" : "Service Details"}
        </h3>
        
        {isOrder ? (
          <div className="space-y-4">
            {data.items?.map((item, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <img
                    src={
                      item.productId?.images?.[0]?.startsWith("http")
                        ? item.productId.images[0]
                        : item.productId?.images?.[0] 
                        ? `${import.meta.env.VITE_API_URL}${item.productId.images[0]}`
                        : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop"
                    }
                    alt={item.productId?.title || "Product"}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.productId?.title || "Product"}</h4>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  {item.productId?.isPreorder && (
                    <span className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded mt-1">
                      Preorder
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatLKR(item.price * item.quantity)}</p>
                  <p className="text-sm text-gray-600">{formatLKR(item.price)} each</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <img
                  src={
                    data.serviceId?.images?.[0]?.startsWith("http")
                      ? data.serviceId.images[0]
                      : data.serviceId?.images?.[0]
                      ? `${import.meta.env.VITE_API_URL}${data.serviceId.images[0]}`
                      : "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop"
                  }
                  alt={data.serviceId?.title || "Service"}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{data.serviceId?.title || "Service"}</h4>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {data.bookingDetails?.date ? formatDate(data.bookingDetails.date) : "Date TBD"}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    {data.bookingDetails?.startTime && data.bookingDetails?.endTime 
                      ? `${data.bookingDetails.startTime} - ${data.bookingDetails.endTime}`
                      : "Time TBD"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatLKR(data.totalAmount)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delivery/Service Information */}
      {isOrder ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Information</h3>
          
          {/* Delivery Estimate */}
          {deliveryEstimate && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Estimated Delivery</h4>
              </div>
              <p className="text-blue-800 font-medium">
                {getDeliveryEstimateText(deliveryEstimate)}
              </p>
              {deliveryEstimate.hasPreorderItems && (
                <p className="text-sm text-blue-700 mt-1">
                  ⏰ Extra processing time included for preorder items
                </p>
              )}
            </div>
          )}

          {/* Shipping Address */}
          {data.shippingAddress && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-gray-900 font-medium">
                <MapPin className="w-4 h-4" />
                <span>Shipping Address</span>
              </div>
              <div className="pl-6 text-gray-600">
                <p>{data.shippingAddress.street}</p>
                <p>{data.shippingAddress.city}, {data.shippingAddress.state} {data.shippingAddress.zipCode}</p>
                <p>{data.shippingAddress.country}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Information</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center space-x-2 text-gray-900 font-medium">
                <Calendar className="w-4 h-4" />
                <span>Appointment Details</span>
              </div>
              <div className="pl-6 text-gray-600">
                <p>Date: {data.bookingDetails?.date ? formatDate(data.bookingDetails.date) : "To be confirmed"}</p>
                <p>Time: {data.bookingDetails?.startTime && data.bookingDetails?.endTime 
                  ? `${data.bookingDetails.startTime} - ${data.bookingDetails.endTime}`
                  : "To be confirmed"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Store & Payment Information */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Store Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Information</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Store className="w-4 h-4 text-gray-600" />
              <span className="font-medium">{data.storeId?.name || "Store Name"}</span>
            </div>
            {data.storeId?.contactInfo?.email && (
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-600" />
                <a 
                  href={`mailto:${data.storeId.contactInfo.email}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {data.storeId.contactInfo.email}
                </a>
              </div>
            )}
            {data.storeId?.contactInfo?.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-600" />
                <a 
                  href={`tel:${data.storeId.contactInfo.phone}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {data.storeId.contactInfo.phone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatLKR(data.storeAmount || data.totalAmount)}</span>
            </div>
            {data.platformFee && (
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee:</span>
                <span>{formatLKR(data.platformFee)}</span>
              </div>
            )}
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>{formatLKR(data.totalAmount)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CreditCard className="w-4 h-4" />
              <span>{getPaymentMethodDisplay(data.paymentDetails?.paymentMethod)}</span>
            </div>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              data.paymentDetails?.paymentStatus === "paid" 
                ? "bg-green-100 text-green-800" 
                : "bg-yellow-100 text-yellow-800"
            }`}>
              {data.paymentDetails?.paymentStatus === "paid" ? "✓ Paid" : "Payment Pending"}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to={`/receipt/${data._id}?type=${type}`}
            className="flex items-center justify-center space-x-2 p-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            <ReceiptIcon className="w-4 h-4" />
            <span className="text-sm">View Receipt</span>
          </Link>
          
          <Link
            to={isOrder ? "/orders" : "/bookings"}
            className="flex items-center justify-center space-x-2 p-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Package className="w-4 h-4" />
            <span className="text-sm">Track {isOrder ? "Order" : "Booking"}</span>
          </Link>
          
          {data.storeId?.contactInfo?.phone && (
            <a
              href={`https://wa.me/${data.storeId.contactInfo.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 p-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm">Contact Store</span>
            </a>
          )}
          
          <Link
            to="/"
            className="flex items-center justify-center space-x-2 p-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Package className="w-4 h-4" />
            <span className="text-sm">Continue Shopping</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PurchaseSummary;