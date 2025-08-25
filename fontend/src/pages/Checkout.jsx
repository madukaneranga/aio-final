import React, { useState, useEffect } from "react";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  Smartphone,
  Building2,
  Banknote,
  Lock,
  ShoppingBag,
} from "lucide-react";
import { formatLKR } from "../utils/currency";

const provinces = [
  "Western",
  "Central",
  "Southern",
  "Northern",
  "Eastern",
  "North Western",
  "North Central",
  "Uva",
  "Sabaragamuwa",
];

const Checkout = () => {
  const {
    orderItems,
    bookingItems,
    orderTotal,
    bookingTotal,
    clearOrder,
    clearBookings,
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("payhere");
  const [shippingAddress, setShippingAddress] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Sri Lanka",
  });
  const [payhereReady, setPayhereReady] = useState(false);
  const [bankTransferData, setBankTransferData] = useState(null);
  const [showBankTransfer, setShowBankTransfer] = useState(false);

  const totalItems =
    orderItems.reduce((sum, item) => sum + item.quantity, 0) +
    bookingItems.length;
  const subtotal = orderTotal + bookingTotal;
  const platformFee = subtotal * 0.07;
  const grandTotal = subtotal + platformFee;

  // Load PayHere script and detect when ready
  useEffect(() => {
    if (orderItems.length || bookingItems.length) {
      fetchPaymentMethods();
    }

    if (!window.payhere) {
      const script = document.createElement("script");
      script.src = "https://www.payhere.lk/lib/payhere.js";
      script.async = true;
      script.onload = () => {
        setPayhereReady(true);
        console.log("PayHere script loaded");
      };
      script.onerror = () => {
        alert("Failed to load PayHere payment gateway script");
      };
      document.body.appendChild(script);
    } else {
      setPayhereReady(true);
    }
  }, [orderItems, bookingItems, user]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/payments/payment-methods`
      );
      if (response.ok) {
        const methods = await response.json();
        
        // Check user verification status for COD
        if (user) {
          try {
            const verificationResponse = await fetch(
              `${import.meta.env.VITE_API_URL}/api/users/verification-status`,
              { credentials: "include" }
            );
            
            if (verificationResponse.ok) {
              const verificationData = await verificationResponse.json();
              const isVerified = verificationData.verificationStatus === "verified";
              
              // Update COD availability based on verification status
              const updatedMethods = methods.map(method => {
                if (method.id === "cod") {
                  return { ...method, available: isVerified };
                }
                return method;
              });
              
              setPaymentMethods(updatedMethods);
            } else {
              setPaymentMethods(methods);
            }
          } catch (verificationError) {
            console.error("Error checking verification status:", verificationError);
            setPaymentMethods(methods);
          }
        } else {
          // If no user, disable COD
          const updatedMethods = methods.map(method => {
            if (method.id === "cod") {
              return { ...method, available: false };
            }
            return method;
          });
          setPaymentMethods(updatedMethods);
        }
      } else {
        console.error("Failed to fetch payment methods:", response.status);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const handleAddressChange = (e) => {
    setShippingAddress({
      ...shippingAddress,
      [e.target.name]: e.target.value,
    });
  };

  const startPayHerePayment = (paymentParams) => {
    return new Promise((resolve, reject) => {
      if (!window.payhere) {
        alert("Payment gateway not loaded, please try again later.");
        return reject(new Error("PayHere script not loaded"));
      }

      window.payhere.onCompleted = function (orderId) {
        console.log("Payment completed. OrderID:", orderId);
        resolve(orderId);
      };

      window.payhere.onDismissed = function () {
        alert("Payment was cancelled.");
        reject(new Error("Payment cancelled"));
      };

      window.payhere.onError = function (error) {
        console.error("PayHere payment error:", error);
        alert("Payment failed. Please try again.");
        reject(new Error("Payment error: " + error));
      };

      console.log("Starting PayHere payment with params:", paymentParams);
      window.payhere.startPayment(paymentParams);
    });
  };

  const handleCheckout = async () => {
    if (!user) {
      alert("Please log in to continue");
      navigate("/login");
      return;
    }

    if (user.role !== "customer") {
      alert("Only customers can place orders");
      return;
    }

    if (
      orderItems.length > 0 &&
      (!shippingAddress.street ||
        !shippingAddress.city ||
        !shippingAddress.state ||
        !shippingAddress.zipCode ||
        isNaN(shippingAddress.zipCode))
    ) {
      alert("Please fill in all shipping address fields correctly");
      return;
    }

    // Check for PayHere readiness only if PayHere is selected
    if (selectedPaymentMethod === "payhere" && !payhereReady) {
      alert("Payment gateway is still loading, please wait a moment.");
      return;
    }

    setLoading(true);

    try {
      let endpoint = "";
      switch (selectedPaymentMethod) {
        case "payhere":
          endpoint = "/api/payments/payhere-intent";
          break;
        case "bank_transfer":
          endpoint = "/api/payments/bank-transfer-intent";
          break;
        case "cod":
          endpoint = "/api/payments/cod-intent";
          break;
        default:
          alert("Please select a payment method");
          setLoading(false);
          return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentMethod: selectedPaymentMethod,
            orderItems: orderItems.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
              storeId:
                typeof item.storeId === "object"
                  ? item.storeId._id
                  : item.storeId || "unknown",
            })),
            bookingItems: bookingItems.map((item) => ({
              serviceId: item.id,
              storeId: item.storeId, 
              bookingDetails: {
                date: new Date(item.bookingDetails.date), 
                startTime: item.bookingDetails.time, 
                endTime: item.bookingDetails.endTime, 
                duration: item.duration || item.bookingDetails.duration, 
                timeZone: "Asia/Colombo", 
              },
              notes: item.bookingDetails.notes || item.notes, 
            })),
            shippingAddress,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        if (data.requiresVerification) {
          alert("Document verification required for Cash on Delivery. Please upload your ID/Passport in your profile settings.");
          navigate("/profile");
          setLoading(false);
          return;
        }
        alert(
          `Payment creation failed: ${data.error || "Unknown error"}`
        );
        setLoading(false);
        return;
      }

      const responseData = await response.json();

      if (selectedPaymentMethod === "payhere") {
        const { paymentParams } = responseData;
        if (!paymentParams) {
          alert("Payment parameters missing in response.");
          setLoading(false);
          return;
        }

        // Start PayHere payment
        await startPayHerePayment(paymentParams);
        clearOrder();
        clearBookings();
        alert("Payment successful!");
      } else if (selectedPaymentMethod === "bank_transfer") {
        // Store bank transfer data for display
        setBankTransferData(responseData);
        clearOrder();
        clearBookings();
        setShowBankTransfer(true);
        return; // Don't navigate yet, show bank details first
      } else if (selectedPaymentMethod === "cod") {
        clearOrder();
        clearBookings();
        alert("COD order created successfully! You can mark it as delivered once you receive your order/service.");
      }

      // Navigate to appropriate page
      if (orderItems.length > 0 && bookingItems.length > 0) {
        navigate("/orders");
      } else if (orderItems.length > 0) {
        navigate("/orders");
      } else if (bookingItems.length > 0) {
        navigate("/bookings");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getPaymentIcon = (iconName) => {
    switch (iconName) {
      case "building-2":
        return <Building2 className="w-6 h-6" />;
      case "smartphone":
        return <Smartphone className="w-6 h-6" />;
      case "banknote":
        return <Banknote className="w-6 h-6" />;
      case "credit-card":
        return <CreditCard className="w-6 h-6" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Your cart is empty
          </h2>
          <p className="text-gray-600 mb-8">
            Add some items to proceed with checkout
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">Complete your purchase</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Checkout Form */}
          <div className="space-y-6">
            {/* Shipping Address */}
            {orderItems.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Shipping Address
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={shippingAddress.street}
                      onChange={handleAddressChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={shippingAddress.city}
                        onChange={handleAddressChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Colombo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Province *
                      </label>
                      <select
                        name="state"
                        value={shippingAddress.state}
                        onChange={handleAddressChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="">Select Province</option>
                        <option value="Western">Western</option>
                        <option value="Central">Central</option>
                        <option value="Southern">Southern</option>
                        <option value="Northern">Northern</option>
                        <option value="Eastern">Eastern</option>
                        <option value="North Western">North Western</option>
                        <option value="North Central">North Central</option>
                        <option value="Uva">Uva</option>
                        <option value="Sabaragamuwa">Sabaragamuwa</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={shippingAddress.zipCode}
                        onChange={handleAddressChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="10001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        name="country"
                        value={shippingAddress.country}
                        onChange={handleAddressChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 cursor-not-allowed"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Payment Method
              </h2>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                      !method.available
                        ? "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60"
                        : selectedPaymentMethod === method.id
                        ? "border-black bg-black text-white cursor-pointer"
                        : "border-gray-200 hover:border-gray-300 cursor-pointer"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedPaymentMethod === method.id}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      disabled={!method.available}
                      className="sr-only"
                    />
                    <div
                      className={`mr-3 ${
                        selectedPaymentMethod === method.id
                          ? "text-white"
                          : "text-gray-400"
                      }`}
                    >
                      {getPaymentIcon(method.icon)}
                    </div>
                    <div className="flex-1">
                      <div
                        className={`font-medium ${
                          selectedPaymentMethod === method.id
                            ? "text-white"
                            : "text-gray-900"
                        }`}
                      >
                        {method.name}
                        {method.id === "cod" && !method.available && (
                          <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            Verification Required
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-sm ${
                          selectedPaymentMethod === method.id
                            ? "text-gray-200"
                            : "text-gray-500"
                        }`}
                      >
                        {method.description}
                        {method.id === "cod" && !method.available && (
                          <span className="block text-xs mt-1 text-red-600">
                            Upload ID/Passport in profile to enable COD
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-blue-800">
                      Your payment information is secure and processed locally
                      in Sri Lanka
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-sm p-6 h-fit">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Order Summary
            </h2>

            {/* Cart Items */}
            {orderItems.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Products</h3>
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <img
                        src={
                          item.image
                            ? item.image.startsWith("http")
                              ? item.image
                              : `${import.meta.env.VITE_API_URL}${item.image}`
                            : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop"
                        }
                        alt={item.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {item.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatLKR(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking Items */}
            {bookingItems.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">
                  Service Bookings
                </h3>
                <div className="space-y-3">
                  {bookingItems.map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className="flex items-center space-x-3"
                    >
                      <img
                        src={
                          item.image
                            ? item.image.startsWith("http")
                              ? item.image
                              : `${import.meta.env.VITE_API_URL}${item.image}`
                            : "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop"
                        }
                        alt={item.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {item.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.date} at {item.time}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatLKR(item.price)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatLKR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee (7%)</span>
                <span className="font-medium">{formatLKR(platformFee)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total</span>
                <span>{formatLKR(grandTotal)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : `Pay ${formatLKR(grandTotal)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Bank Transfer Details Modal */}
      {showBankTransfer && bankTransferData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-90vh overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Bank Transfer Details</h2>
                <button
                  onClick={() => {
                    setShowBankTransfer(false);
                    navigate("/orders");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800 font-medium">
                  Please transfer LKR {formatLKR(bankTransferData.totalAmount)} to the bank account(s) below and contact the store with your transfer receipt.
                </p>
              </div>

              {bankTransferData.bankDetails.map((bank, index) => (
                <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {bank.storeName}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Bank Name</label>
                      <p className="text-gray-900">{bank.bankDetails.bankName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Account Holder</label>
                      <p className="text-gray-900">{bank.bankDetails.accountHolderName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Account Number</label>
                      <p className="text-gray-900 font-mono">{bank.bankDetails.accountNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Branch</label>
                      <p className="text-gray-900">{bank.bankDetails.branchName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Routing Number</label>
                      <p className="text-gray-900 font-mono">{bank.bankDetails.routingNumber}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Contact Store:</p>
                    <div className="flex flex-wrap gap-4">
                      {bank.contactInfo.whatsapp && (
                        <a
                          href={`https://wa.me/${bank.contactInfo.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          WhatsApp: {bank.contactInfo.whatsapp}
                        </a>
                      )}
                      {bank.contactInfo.email && (
                        <a
                          href={`mailto:${bank.contactInfo.email}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Email: {bank.contactInfo.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                <p className="text-yellow-800 text-sm">
                  <strong>Important:</strong> Please contact the store via WhatsApp or email after making the transfer with your payment receipt for order confirmation.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowBankTransfer(false);
                    navigate("/orders");
                  }}
                  className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Go to My Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
