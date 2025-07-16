import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ImageUpload from "../components/ImageUpload";
import ColorThemeSelector from "../components/ColorThemeSelector";
import TimeSlotManager from "../components/TimeSlotManager";
import LoadingSpinner from "../components/LoadingSpinner";
import { Store, Package, Calendar, MapPin, Phone, Mail } from "lucide-react";
//  ADDED: Firebase storage imports
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase"; //  CHANGED: use firebase storage instead of multer

const CreateStore = () => {
  const [formData, setFormData] = useState({
    name: "",
    type: "product",
    description: "",
    themeColor: "#000000",
    contactInfo: {
      email: "",
      phone: "",
      address: "",
    },
  });
  const [heroImages, setHeroImages] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingStore, setCheckingStore] = useState(true);

  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return; // Wait until user is loaded

    if (user.role === "store_owner" && user.storeId) {
      navigate("/dashboard");
    } else {
      setCheckingStore(false); // Allow rendering store creation page
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!window.payhere) {
      const script = document.createElement("script");
      script.src = "https://sandbox.payhere.lk/lib/payhere.js";
      script.async = true;
      script.onload = () => setPayhereLoaded(true);
      script.onerror = () => {
        console.error("PayHere SDK failed to load");
        setPayhereLoaded(false);
      };
      document.body.appendChild(script);
    } else {
      setPayhereLoaded(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 🔄 Upload hero images to Firebase
      const uploadPromises = heroImages.map(async (file) => {
        const imageRef = ref(storage, `stores/${Date.now()}_${file.name}`);
        await uploadBytes(imageRef, file);
        return getDownloadURL(imageRef);
      });

      const imageUrls = await Promise.all(uploadPromises);

      // 🏪 Create the store
      const payload = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        themeColor: formData.themeColor,
        contactInfo: formData.contactInfo,
        timeSlots: timeSlots,
        heroImages: imageUrls,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/stores`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create store");
      }

      const storeData = await response.json();

      // 💳 Start subscription
      const subResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscriptions/create-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!subResponse.ok) {
        alert(
          "Store created, but failed to start subscription. Please contact support."
        );
        await refreshUser();
        return navigate("/dashboard");
      }

      const { paymentParams } = await subResponse.json();

      // 🚀 Start PayHere modal payment
      await startPayHerePayment(paymentParams);

      // Optional post-payment action
      alert("Subscription payment successful!");
      await refreshUser();
      navigate("/dashboard");
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 💳 Start PayHere Payment with JS SDK
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("contactInfo.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        contactInfo: {
          ...prev.contactInfo,
          [field]: value,
        },
      }));
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  if (checkingStore) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">Please log in to create a store</p>
          <Link
            to="/login"
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (user.role === "customer") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Upgrade to Store Owner
          </h2>
          <p className="text-gray-600 mb-6">
            You need a store owner account to create a store. Please create a
            new store owner account.
          </p>
          <Link
            to="/register"
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Create Store Owner Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div
            className="text-white px-8 py-8"
            style={{ backgroundColor: formData.themeColor }}
          >
            <h1 className="text-3xl font-bold mb-2">Create Your Store</h1>
            <p className="opacity-90">
              Start your entrepreneurial journey with AIO
            </p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Store Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  What type of store do you want to create?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, type: "product" })
                    }
                    className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                      formData.type === "product"
                        ? "border-black bg-black text-white"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Package className="w-8 h-8 mb-3" />
                    <h3 className="font-semibold text-lg mb-2">
                      Product Store
                    </h3>
                    <p className="text-sm opacity-80">
                      Sell physical products with inventory management and
                      shipping
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, type: "service" })
                    }
                    className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                      formData.type === "service"
                        ? "border-black bg-black text-white"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Calendar className="w-8 h-8 mb-3" />
                    <h3 className="font-semibold text-lg mb-2">
                      Service Store
                    </h3>
                    <p className="text-sm opacity-80">
                      Offer services with booking, scheduling, and appointment
                      management
                    </p>
                  </button>
                </div>
              </div>

              {/* Store Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                    placeholder="Enter your store name"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                  placeholder="Describe your store and what you offer to customers"
                />
              </div>

              {/* Color Theme Selector */}
              <ColorThemeSelector
                selectedColor={formData.themeColor}
                onColorChange={(color) =>
                  setFormData({ ...formData, themeColor: color })
                }
              />

              {/* Time Slots for Service Stores */}
              {formData.type === "service" && (
                <TimeSlotManager
                  timeSlots={timeSlots}
                  onTimeSlotsChange={setTimeSlots}
                />
              )}

              {/* Hero Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Hero Images (up to 5)
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Upload high-quality images that represent your store
                </p>
                <ImageUpload
                  images={heroImages}
                  onImagesChange={setHeroImages}
                  maxImages={5}
                  multiple={true}
                />
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Contact Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </label>
                    <input
                      type="email"
                      name="contactInfo.email"
                      value={formData.contactInfo.email}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                      placeholder="store@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>Phone</span>
                    </label>
                    <input
                      type="tel"
                      name="contactInfo.phone"
                      value={formData.contactInfo.phone}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                      placeholder="+94 77 123 4567"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    name="contactInfo.address"
                    value={formData.contactInfo.address}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                    placeholder="123 Main Street, Colombo, Sri Lanka"
                  />
                </div>
              </div>

              {/* Subscription Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-blue-900 mb-2">
                  Monthly Subscription
                </h4>
                <p className="text-blue-800 mb-2">LKR 1,000 per month</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Unlimited product/service listings</li>
                  <li>• Advanced analytics and reports</li>
                  <li>• Customer management tools</li>
                  <li>• 24/7 support</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading && <LoadingSpinner size="sm" />}
                  <span>{loading ? "Creating Store..." : "Create Store"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStore;
