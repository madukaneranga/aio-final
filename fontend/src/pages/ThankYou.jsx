import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  CheckCircle, 
  Calendar,
  Package,
  ArrowLeft,
  AlertCircle,
  Loader,
  Gift,
  Star,
  Timer
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import PurchaseSummary from "../components/PurchaseSummary";
import SocialShareButtons from "../components/SocialShareButtons";
import RecommendationGrid from "../components/RecommendationGrid";
import { calculateDeliveryEstimate, getDeliveryEstimateText } from "../utils/deliveryEstimate";
import { formatLKR } from "../utils/currency";
import LoadingSpinner from "../components/LoadingSpinner";

const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [purchaseData, setPurchaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deliveryEstimate, setDeliveryEstimate] = useState(null);
  

  const transactionId = searchParams.get("transactionId");
  const type = searchParams.get("type"); // 'order' or 'booking'
  const paymentMethod = searchParams.get("paymentMethod");
  


  useEffect(() => {
    console.log(`ThankYou - useEffect triggered. transactionId: ${transactionId}, type: ${type}, user:`, user, 'authLoading:', authLoading);
    
    if (!transactionId || !type) {
      console.error(`ThankYou - Missing required params. transactionId: ${transactionId}, type: ${type}`);
      setError("Invalid purchase information");
      setLoading(false);
      return;
    }
    
    // Wait for auth to finish loading before proceeding
    if (authLoading) {
      console.log("ThankYou - Auth still loading, waiting...");
      return;
    }
    
    // If auth finished loading but no user, show auth error
    if (!user) {
      console.log("ThankYou - Auth finished loading but no user found");
      setError("Please log in to view purchase information");
      setLoading(false);
      return;
    }
    
    // Auth is loaded and user exists, fetch purchase data
    fetchPurchaseData();
  }, [transactionId, type, user, authLoading]);

  // Track purchase completion for analytics
  useEffect(() => {
    if (purchaseData && !loading && !error) {
      // Google Analytics 4 - Enhanced E-commerce Purchase Event
      if (typeof gtag !== 'undefined') {
        const items = type === "order" ? 
          purchaseData.items?.map(item => ({
            item_id: item.productId?._id,
            item_name: item.productId?.title,
            category: item.productId?.category,
            quantity: item.quantity,
            price: item.productId?.price
          })) :
          [{
            item_id: purchaseData.serviceId?._id,
            item_name: purchaseData.serviceId?.title,
            category: purchaseData.serviceId?.category,
            quantity: 1,
            price: purchaseData.totalAmount
          }];

        gtag('event', 'purchase', {
          transaction_id: purchaseData._id,
          value: purchaseData.totalAmount,
          currency: 'LKR',
          items: items
        });
      }

      // Microsoft Clarity - Custom Purchase Event
      if (typeof clarity !== 'undefined') {
        clarity('event', 'purchase', {
          type: type,
          amount: purchaseData.totalAmount,
          transaction_id: purchaseData._id
        });
      }
    }
  }, [purchaseData, loading, error, type]);

  const fetchPurchaseData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/thank-you/${type}/${transactionId}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPurchaseData(data);
        
        // Calculate delivery estimate for orders
        if (type === "order" && data.shippingAddress) {
          const estimate = calculateDeliveryEstimate({
            customerProvince: data.shippingAddress.province || "Western",
            storeProvince: data.storeId?.province || "Western",
            shippingMethod: data.shippingMethod || "standard",
            hasPreorderItems: data.items?.some(item => item.productId?.isPreorder),
            storeProcessingDays: data.storeId?.processingDays || 0
          });
          setDeliveryEstimate(estimate);
        }
      } else {
        const errorData = await response.text();
        throw new Error(`Failed to fetch purchase data: ${response.status}`);
      }
    } catch (err) {
      console.error("ThankYou - Error fetching purchase data:", err);
      setError(`Unable to load purchase information: ${err.message}`);
    } finally {
      console.log("ThankYou - Setting loading to false");
      setLoading(false);
    }
  };

  const handleContinueShopping = () => {
    navigate(type === "order" ? "/products" : "/services");
  };

  const handleViewPurchase = () => {
    navigate(`/${type === "order" ? "orders" : "bookings"}`);
  };

  console.log(`ThankYou - Rendering with: loading=${loading}, authLoading=${authLoading}, error=${error}, purchaseData=${!!purchaseData}`);

  // Show loading while auth is loading OR while fetching purchase data
  if (authLoading || loading) {
    console.log("ThankYou - Rendering loading spinner");
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Only show error if auth finished loading AND we have an actual error OR missing purchase data
  if (error || !purchaseData) {
    console.log("ThankYou - Rendering error state");
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "We couldn't find your purchase information."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-black text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  console.log("ThankYou - Rendering success state with purchaseData");
  
  const isPending = purchaseData.status === "pending" || purchaseData.paymentStatus === "pending";
  const isOrder = type === "order";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          {isPending ? (
            <div className="space-y-4">
              <Timer className="w-16 h-16 text-yellow-500 mx-auto animate-pulse" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Payment Processing... ⏳
              </h1>
              <p className="text-gray-600 text-lg">
                {paymentMethod === "payhere" 
                  ? "We're confirming your PayHere payment. This usually takes a few moments."
                  : "Your payment is being processed. We'll update you once confirmed."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Thank You! 🎉
              </h1>
              <p className="text-gray-600 text-lg">
                Your {isOrder ? "order" : "booking"} has been confirmed successfully!
              </p>
            </div>
          )}
        </div>

        {/* Quick Summary Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {isOrder ? "Order" : "Booking"} Details
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>ID:</strong> #{purchaseData._id?.slice(-8).toUpperCase()}</p>
                <p><strong>Date:</strong> {new Date(purchaseData.createdAt).toLocaleDateString()}</p>
                <p><strong>Total:</strong> {formatLKR(purchaseData.totalAmount)}</p>
                <p><strong>Payment:</strong> 
                  <span className={`ml-1 px-2 py-1 rounded text-xs ${
                    isPending ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {isPending ? 'Processing' : 'Confirmed'}
                  </span>
                </p>
              </div>
            </div>
            
            {isOrder && deliveryEstimate && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  Delivery Information
                </h3>
                <div className="text-sm">
                  <p className="font-medium text-green-700">
                    {getDeliveryEstimateText(deliveryEstimate)}
                  </p>
                  <p className="text-gray-600 mt-1">
                    Shipping to: {purchaseData.shippingAddress?.city}, {purchaseData.shippingAddress?.province}
                  </p>
                </div>
              </div>
            )}
            
            {!isOrder && purchaseData.scheduledDate && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Service Information
                </h3>
                <div className="text-sm">
                  <p className="font-medium text-blue-700">
                    Scheduled: {new Date(purchaseData.scheduledDate).toLocaleDateString()}
                  </p>
                  <p className="text-gray-600 mt-1">
                    Duration: {purchaseData.serviceId?.duration || "As needed"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={handleViewPurchase}
            className="flex-1 bg-black text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors text-center"
          >
            View {isOrder ? "Order" : "Booking"} Details
          </button>
          <button
            onClick={handleContinueShopping}
            className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            Continue Shopping
          </button>
        </div>

        {/* Detailed Purchase Summary */}
        <div className="mb-8">
          <PurchaseSummary 
            purchaseData={purchaseData}
            type={type}
            deliveryEstimate={deliveryEstimate}
          />
        </div>

        {/* Social Sharing */}
        <div className="mb-8">
          <SocialShareButtons 
            purchaseData={purchaseData}
            type={type}
          />
        </div>

        {/* Recommendations */}
        <div className="mb-8">
          <RecommendationGrid
            purchaseData={purchaseData}
            type={type}
          />
        </div>

        {/* Next Steps */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
          <div className="text-center">
            <Gift className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              What's Next?
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4 mt-4 text-left">
              {isOrder ? (
                <>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-2">📦 Order Updates</h4>
                    <p className="text-gray-600 text-sm">
                      Track your order status and get real-time updates via email and SMS.
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-2">🚚 Delivery</h4>
                    <p className="text-gray-600 text-sm">
                      Your order will be delivered within the estimated timeframe. No need to be home!
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-2">📅 Service Confirmation</h4>
                    <p className="text-gray-600 text-sm">
                      The service provider will contact you 24 hours before your appointment.
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-2">⭐ Rate & Review</h4>
                    <p className="text-gray-600 text-sm">
                      After service completion, please share your experience to help others.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Customer Support */}
        <div className="text-center mt-8 p-4 bg-gray-100 rounded-lg">
          <p className="text-gray-600 text-sm">
            Need help with your {isOrder ? "order" : "booking"}? 
            <a href="/contact" className="text-blue-600 hover:underline ml-1">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;