import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ImageUpload from "../components/ImageUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import { Store, Camera, Eye, EyeOff, MessageSquare, Star } from "lucide-react";
//  ADDED: Firebase storage imports
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase"; //  CHANGED: use firebase storage instead of multer

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
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/stores/${user.storeId}`
      );
      if (response.ok) {
        const data = await response.json();
        setStore(data.store);
        setFormData({
          name: data.store.name || "",
          description: data.store.description || "",
          themeColor: data.store.themeColor || "#000000",
          contactInfo: data.store.contactInfo || {
            email: "",
            phone: "",
            address: "",
          },
        });
      }
    } catch (error) {
      console.error("Error fetching store:", error);
      setError("Failed to load store data");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/reviews/manage`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let imageUrls = [];

      // If new images selected, upload and get URLs
      if (heroImages.length > 0) {
        const uploadPromises = heroImages.map(async (file) => {
          const imageRef = ref(storage, `stores/${Date.now()}_${file.name}`);
          await uploadBytes(imageRef, file);
          return getDownloadURL(imageRef);
        });

        imageUrls = await Promise.all(uploadPromises);
      }

      // Use existing images if no new ones are uploaded
      const finalImages = imageUrls.length > 0 ? imageUrls : store.heroImages;

      const payload = {
        name: formData.name,
        description: formData.description,
        themeColor: formData.themeColor,
        contactInfo: formData.contactInfo,
        heroImages: finalImages,
      };

      const response = await fetch(
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

      if (response.ok) {
        const updatedStore = await response.json();
        setStore(updatedStore);
        setHeroImages([]);
        setSuccess("Store updated successfully!");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update store");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleProfileImageUpload = async () => {
    if (!profileImage) return;

    try {
      // Upload a single image to Firebase
      const imageRef = ref(storage, `users/${Date.now()}_${profileImage.name}`);
      await uploadBytes(imageRef, profileImage);
      const imageUrl = await getDownloadURL(imageRef);

      const payload = {
        profileImage: imageUrl, // use imageUrl directly, not array
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/stores/${store._id}/profile-image`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const updatedStore = await response.json();
        setStore(updatedStore);
        setProfileImage(null);
        setSuccess("Profile image updated successfully!");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update profile image");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
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
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const toggleReviewVisibility = async (reviewId, isVisible) => {
    try {
      const response = await fetch(
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

      if (response.ok) {
        fetchReviews();
        setSuccess(`Review ${isVisible ? "shown" : "hidden"} successfully!`);
      }
    } catch (error) {
      setError("Failed to update review visibility");
    }
  };

  const respondToReview = async (reviewId, message) => {
    try {
      const response = await fetch(
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

      if (response.ok) {
        fetchReviews();
        setSuccess("Response added successfully!");
      }
    } catch (error) {
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
    return (
      name.charAt(0) +
      "*".repeat(name.length - 2) +
      name.charAt(name.length - 1)
    );
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            No Store Found
          </h2>
          <p className="text-gray-600">Please create a store first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Store Management</h1>
          <p className="text-gray-600 mt-2">
            Manage your store settings and reviews
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 relative">
              {[
                { id: "details", name: "Store Details", icon: Store },
                { id: "reviews", name: "Reviews", icon: MessageSquare },
              ].map((tab) => {
                const Icon = tab.icon;
                const isReviewsTab = tab.id === "reviews";
                const isDisabled =
                  isReviewsTab && subscription.plan === "basic";

                // Tooltip state per tab — can also use local state if needed
                const [hovered, setHovered] = React.useState(false);

                return (
                  <div key={tab.id} className="relative inline-block">
                    <button
                      onClick={() => !isDisabled && setActiveTab(tab.id)}
                      onMouseEnter={() => isDisabled && setHovered(true)}
                      onMouseLeave={() => isDisabled && setHovered(false)}
                      className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? "border-black text-black"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      } ${
                        isDisabled
                          ? "opacity-50 cursor-not-allowed hover:text-gray-500 hover:border-transparent"
                          : ""
                      }`}
                      disabled={isDisabled} // disables pointer events on some browsers (optional)
                      type="button"
                    >
                      <Icon className="w-5 h-5" />
                      <span>
                        {tab.name}
                        {isReviewsTab && reviews.length > 0 && (
                          <span className="ml-1 bg-black text-white text-xs px-2 py-1 rounded-full">
                            {reviews.length}
                          </span>
                        )}
                      </span>
                    </button>

                    {/* Tooltip */}
                    {isDisabled && hovered && (
                      <div
                        className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg"
                        style={{ zIndex: 1000 }}
                      >
                        Upgrade your plan
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

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

        {/* Store Details Tab */}
        {activeTab === "details" && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Profile Image */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Store Profile Image
                </h3>
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {store.profileImage ? (
                        <img
                          src={
                            store.profileImage.startsWith("http")
                              ? store.profileImage
                              : `${import.meta.env.VITE_API_URL}${
                                  store.profileImage
                                }`
                          }
                          alt="Store profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Store className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full hover:bg-gray-800 transition-colors cursor-pointer">
                      <Camera className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProfileImage(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {profileImage && (
                    <div className="flex items-center space-x-4">
                      <img
                        src={URL.createObjectURL(profileImage)}
                        alt="New profile"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleProfileImageUpload}
                        className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileImage(null)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme Color
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="color"
                      name="themeColor"
                      value={formData.themeColor}
                      onChange={handleChange}
                      className="w-16 h-12 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.themeColor}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          themeColor: e.target.value,
                        }))
                      }
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              {/* Hero Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hero Images (up to 5)
                </label>
                <ImageUpload
                  images={heroImages}
                  onImagesChange={setHeroImages}
                  maxImages={5}
                  multiple={true}
                />
                {store.heroImages && store.heroImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">
                      Current Images:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {store.heroImages.map((image, index) => (
                        <img
                          key={index}
                          src={
                            image.startsWith("http")
                              ? image
                              : `${import.meta.env.VITE_API_URL}${image}`
                          }
                          alt={`Hero ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="contactInfo.email"
                      value={formData.contactInfo.email}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="contactInfo.phone"
                      value={formData.contactInfo.phone}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {saving && <LoadingSpinner size="sm" />}
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === "reviews" && (
          <div className="space-y-6">
            {/* Review Statistics */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Review Statistics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-900">
                    {reviews.length > 0
                      ? (
                          reviews.reduce((sum, r) => sum + r.rating, 0) /
                          reviews.length
                        ).toFixed(1)
                      : "0.0"}
                  </div>
                  <div className="text-sm text-yellow-700">Average Rating</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">
                    {reviews.length}
                  </div>
                  <div className="text-sm text-blue-700">Total Reviews</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">
                    {reviews.filter((r) => r.isVisible).length}
                  </div>
                  <div className="text-sm text-green-700">Visible Reviews</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-900">
                    {reviews.filter((r) => r.response).length}
                  </div>
                  <div className="text-sm text-purple-700">Responded To</div>
                </div>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Reviews Yet
                </h3>
                <p className="text-gray-600">
                  Customer reviews will appear here once you receive them
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Filter Options */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setReviewFilter("all")}
                      className={`px-3 py-1 rounded-full text-sm ${
                        reviewFilter === "all"
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      All Reviews ({reviews.length})
                    </button>
                    <button
                      onClick={() => setReviewFilter("visible")}
                      className={`px-3 py-1 rounded-full text-sm ${
                        reviewFilter === "visible"
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Visible ({reviews.filter((r) => r.isVisible).length})
                    </button>
                    <button
                      onClick={() => setReviewFilter("hidden")}
                      className={`px-3 py-1 rounded-full text-sm ${
                        reviewFilter === "hidden"
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Hidden ({reviews.filter((r) => !r.isVisible).length})
                    </button>
                    <button
                      onClick={() => setReviewFilter("unanswered")}
                      className={`px-3 py-1 rounded-full text-sm ${
                        reviewFilter === "unanswered"
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Unanswered ({reviews.filter((r) => !r.response).length})
                    </button>
                  </div>
                </div>

                {filteredReviews.map((review) => (
                  <div
                    key={review._id}
                    className="bg-white rounded-lg shadow-sm p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {maskCustomerName(
                              review.customerId?.name || "Anonymous"
                            )}
                          </p>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                            {review.orderId && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Order
                              </span>
                            )}
                            {review.bookingId && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Booking
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            toggleReviewVisibility(
                              review._id,
                              !review.isVisible
                            )
                          }
                          className={`p-2 rounded-lg transition-colors ${
                            review.isVisible
                              ? "bg-green-100 text-green-600 hover:bg-green-200"
                              : "bg-red-100 text-red-600 hover:bg-red-200"
                          }`}
                          title={
                            review.isVisible ? "Hide review" : "Show review"
                          }
                        >
                          {review.isVisible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4">{review.comment}</p>

                    {review.response ? (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Your Response
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(
                              review.response.respondedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700">
                          {review.response.message}
                        </p>
                      </div>
                    ) : (
                      <div className="border-t pt-4">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const message = e.target.message.value;
                            if (message.trim()) {
                              respondToReview(review._id, message);
                              e.target.reset();
                            }
                          }}
                          className="flex space-x-3"
                        >
                          <input
                            type="text"
                            name="message"
                            placeholder="Respond to this review..."
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                          />
                          <button
                            type="submit"
                            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                          >
                            Respond
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreManagement;
