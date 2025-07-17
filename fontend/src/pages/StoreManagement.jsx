// StoreManagement.jsx

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ImageUpload from "../components/ImageUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import { Store, Camera, Eye, EyeOff, MessageSquare, Star } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase";

const StoreManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [store, setStore] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [subscription, setSubscription] = useState(null);
  const [hoveredTab, setHoveredTab] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    themeColor: "#000000",
    contactInfo: {
      email: "",
      phone: "",
      address: "",
    },
  });

  const [heroImages, setHeroImages] = useState([]);
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    if (user?.role === "store_owner" && user?.storeId) {
      fetchStoreData();
      fetchReviews();
    } else {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const fetchStoreData = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/stores/${user.storeId}`);
      if (!res.ok) throw new Error("Failed to fetch store");
      const data = await res.json();
      setStore(data.store);
      setFormData({
        name: data.store.name || "",
        description: data.store.description || "",
        themeColor: data.store.themeColor || "#000000",
        contactInfo: data.store.contactInfo || { email: "", phone: "", address: "" },
      });

      const subRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscriptions/my-subscription`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!subRes.ok) throw new Error("Failed to fetch subscription");
      const subData = await subRes.json();
      setSubscription(subData || { package: "basic" });
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to load store or subscription data");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/reviews/manage`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let imageUrls = [];

      if (heroImages.length > 0) {
        const uploadPromises = heroImages.map(async (file) => {
          const imageRef = ref(storage, `stores/${Date.now()}_${file.name}`);
          await uploadBytes(imageRef, file);
          return getDownloadURL(imageRef);
        });
        imageUrls = await Promise.all(uploadPromises);
      }

      const finalImages = imageUrls.length > 0 ? imageUrls : store?.heroImages || [];

      const payload = {
        name: formData.name,
        description: formData.description,
        themeColor: formData.themeColor,
        contactInfo: formData.contactInfo,
        heroImages: finalImages,
      };

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/stores/${store._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update store");
      }

      const updatedStore = await res.json();
      setStore(updatedStore);
      setHeroImages([]);
      setSuccess("Store updated successfully!");
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleProfileImageUpload = async () => {
    if (!profileImage) return;

    try {
      const imageRef = ref(storage, `users/${Date.now()}_${profileImage.name}`);
      await uploadBytes(imageRef, profileImage);
      const imageUrl = await getDownloadURL(imageRef);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/stores/${store._id}/profile-image`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ profileImage: imageUrl }),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update profile image");
      }

      const updatedStore = await res.json();
      setStore(updatedStore);
      setProfileImage(null);
      setSuccess("Profile image updated successfully!");
    } catch (err) {
      setError(err.message || "Network error");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("contactInfo.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        contactInfo: { ...prev.contactInfo, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const toggleReviewVisibility = async (reviewId, isVisible) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/reviews/${reviewId}/visibility`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ isVisible }),
        }
      );
      if (res.ok) {
        fetchReviews();
        setSuccess(`Review ${isVisible ? "shown" : "hidden"} successfully!`);
      }
    } catch (err) {
      setError("Failed to update review visibility");
    }
  };

  const respondToReview = async (reviewId, message) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/reviews/${reviewId}/respond`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ message }),
        }
      );
      if (res.ok) {
        fetchReviews();
        setSuccess("Response added successfully!");
      }
    } catch (err) {
      setError("Failed to respond to review");
    }
  };

  const filteredReviews = reviews.filter((review) => {
    switch (reviewFilter) {
      case "visible":
        return review.isVisible;
      case "hidden":
        return !review.isVisible;
      case "unanswered":
        return !review.response;
      default:
        return true;
    }
  });

  const maskCustomerName = (name) => {
    if (!name || name.length <= 2) return name;
    return name.charAt(0) + "*".repeat(name.length - 2) + name.charAt(name.length - 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Store Found</h2>
          <p className="text-gray-600">Please create a store first</p>
        </div>
      </div>
    );
  }

  // ... The rest of the UI rendering remains unchanged (tabs, forms, etc.)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs (Fixed) */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8 relative">
            {[
              { id: "details", name: "Store Details", icon: Store },
              { id: "reviews", name: "Reviews", icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              const isDisabled = tab.id === "reviews" && subscription?.package === "basic";
              return (
                <div key={tab.id} className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => !isDisabled && setActiveTab(tab.id)}
                    onMouseEnter={() => isDisabled && setHoveredTab(tab.id)}
                    onMouseLeave={() => isDisabled && setHoveredTab(null)}
                    disabled={isDisabled}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? "border-black text-black"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } ${
                      isDisabled
                        ? "opacity-50 cursor-not-allowed hover:text-gray-500 hover:border-transparent"
                        : ""
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </button>

                  {isDisabled && hoveredTab === tab.id && (
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap z-10">
                      Upgrade your plan
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Error & Success Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Form & Review Tabs below here */}
        {/* You can reuse your current form & review JSX as-is below this */}
      </div>
    </div>
  );
};

export default StoreManagement;
