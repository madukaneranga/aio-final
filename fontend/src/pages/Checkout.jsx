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
  const [bankDetailsForSelection, setBankDetailsForSelection] = useState(null);

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

  // Fetch bank details when bank transfer is selected
  useEffect(() => {
    if (selectedPaymentMethod === "bank_transfer" && (orderItems.length > 0 || bookingItems.length > 0)) {
      fetchBankDetailsForPreview();
    }
  }, [selectedPaymentMethod, orderItems, bookingItems, grandTotal]);

  // Fetch bank details for preview when bank transfer is selected
  const fetchBankDetailsForPreview = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/payments/bank-transfer-preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            orderItems: orderItems.map(item => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price
            })),
            bookingItems: bookingItems.map(item => ({
              serviceId: item.id,
              selectedDate: item.selectedDate,
              selectedTime: item.selectedTime,
              price: item.price
            })),
            shippingAddress,
            totalAmount: grandTotal
          })
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setBankDetailsForSelection(data);
      }
    } catch (error) {
      console.error("Error fetching bank details preview:", error);
    }
  };

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
        resolve({ success: true, orderId });
      };

      window.payhere.onDismissed = function () {
        console.log("Payment was cancelled by user");
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
        try {
          const paymentResult = await startPayHerePayment(paymentParams);
          
          if (paymentResult.success) {
            // Only clear cart if payment was successful
            clearOrder();
            clearBookings();
            
            // Navigate to thank you page with transaction ID
            const transactionId = responseData.transactionId || responseData._id;
            const type = bookingItems.length > 0 ? "booking" : "order";
            console.log(`Checkout - PayHere success. Navigating with transactionId: ${transactionId}, type: ${type}`);
            console.log(`Checkout - Full responseData:`, responseData);
            navigate(`/thank-you?transactionId=${transactionId}&type=${type}&paymentMethod=payhere`);
          }
        } catch (paymentError) {
          console.log("PayHere payment failed or cancelled:", paymentError.message);
          // Don't clear cart or navigate - user stays on checkout page
          setLoading(false);
          return;
        }
        
      } else if (selectedPaymentMethod === "bank_transfer") {
        // Clear cart and navigate directly to thank you page
        clearOrder();
        clearBookings();
        
        // Navigate to thank you page with transaction ID
        const transactionId = responseData.transactionId || responseData._id;
        const type = bookingItems.length > 0 ? "booking" : "order";
        console.log(`Checkout - Bank Transfer success. Navigating with transactionId: ${transactionId}, type: ${type}`);
        navigate(`/thank-you?transactionId=${transactionId}&type=${type}&paymentMethod=bank_transfer`);
      } else if (selectedPaymentMethod === "cod") {
        clearOrder();
        clearBookings();
        
        // Navigate to thank you page with transaction ID
        const transactionId = responseData.transactionId || responseData._id;
        const type = bookingItems.length > 0 ? "booking" : "order";
        console.log(`Checkout - COD success. Navigating with transactionId: ${transactionId}, type: ${type}`);
        console.log(`Checkout - Full responseData:`, responseData);
        navigate(`/thank-you?transactionId=${transactionId}&type=${type}&paymentMethod=cod`);
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
                          <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
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
                          <span className="block text-xs mt-1 text-gray-600">
                            Upload ID/Passport in profile to enable COD
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-5 h-5 text-gray-600" />
                    <p className="text-sm text-gray-800">
                      Your payment information is secure and processed locally
                      in Sri Lanka
                    </p>
                  </div>
                </div>

                {/* Bank Transfer Details - Show when selected */}
                {selectedPaymentMethod === "bank_transfer" && bankDetailsForSelection && (
                  <div className="mt-6 p-6 bg-white border-2 border-gray-300 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Bank Transfer Instructions
                    </h3>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-800 font-medium mb-2">
                        Please transfer LKR {formatLKR(grandTotal)} to the bank account(s) below:
                      </p>
                      <p className="text-sm text-gray-600">
                        Bank details will also be available in your Orders section after checkout.
                      </p>
                    </div>

                    {bankDetailsForSelection.bankDetails?.map((bank, index) => (
                      <div key={index} className="mb-4 p-4 border border-gray-300 rounded-lg bg-white">
                        <h4 className="text-md font-semibold text-gray-900 mb-3">
                          {bank.storeName}
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bank Name</label>
                            <p className="text-gray-900 font-medium">{bank.bankDetails.bankName}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Holder</label>
                            <p className="text-gray-900 font-medium">{bank.bankDetails.accountHolderName}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Number</label>
                            <p className="text-gray-900 font-mono font-bold">{bank.bankDetails.accountNumber}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Branch</label>
                            <p className="text-gray-900 font-medium">{bank.bankDetails.branchName}</p>
                          </div>
                          {bank.bankDetails.routingNumber && (
                            <div className="md:col-span-2">
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Routing Number</label>
                              <p className="text-gray-900 font-mono font-bold">{bank.bankDetails.routingNumber}</p>
                            </div>
                          )}
                        </div>

                        <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Contact Store After Transfer:</p>
                          <div className="flex flex-wrap gap-3">
                            {bank.contactInfo.whatsapp && (
                              <a
                                href={`https://wa.me/${bank.contactInfo.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-900 hover:text-black font-medium text-sm"
                              >
                                WhatsApp: {bank.contactInfo.whatsapp}
                              </a>
                            )}
                            {bank.contactInfo.email && (
                              <a
                                href={`mailto:${bank.contactInfo.email}`}
                                className="text-gray-900 hover:text-black font-medium text-sm"
                              >
                                Email: {bank.contactInfo.email}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
                      <p className="text-gray-800 text-sm">
                        <strong>Important:</strong> Please contact the store via WhatsApp or email after making the transfer with your payment receipt for order confirmation.
                      </p>
                    </div>
                  </div>
                )}
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

    </div>
  );
};

export default Checkout;
