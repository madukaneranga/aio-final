import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ImageUpload from "../components/ImageUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase";

const CreateService = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Categories and selections
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedChildCategory, setSelectedChildCategory] = useState("");

  // Images & loading
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields including extra fields
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    oldPrice: "",
    duration: 30, // Default 30 minutes
  });

  // Duration options in 30-minute increments
  const durationOptions = [
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
    { value: 90, label: "1 hour 30 minutes" },
    { value: 120, label: "2 hours" },
    { value: 150, label: "2 hours 30 minutes" },
    { value: 180, label: "3 hours" },
    { value: 210, label: "3 hours 30 minutes" },
    { value: 240, label: "4 hours" },
    { value: 270, label: "4 hours 30 minutes" },
    { value: 300, label: "5 hours" },
    { value: 330, label: "5 hours 30 minutes" },
    { value: 360, label: "6 hours" },
  ];

  // Load categories once on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  // Handle cascading selects for categories
  const onCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setSelectedSubcategory("");
    setSelectedChildCategory("");
  };

  const onSubcategoryChange = (e) => {
    setSelectedSubcategory(e.target.value);
    setSelectedChildCategory("");
  };

  const onChildCategoryChange = (e) => {
    setSelectedChildCategory(e.target.value);
  };

  // Handle normal inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Upload images, compress and get URLs
  const uploadImages = async () => {
    const compressionOptions = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1000,
      useWebWorker: true,
    };
    return Promise.all(
      images.map(async (file) => {
        const compressedFile = await imageCompression(file, compressionOptions);
        const imageRef = ref(storage, `services/id_${Date.now()}_${file.name}`);
        await uploadBytes(imageRef, compressedFile);
        return getDownloadURL(imageRef);
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Upload images
      const imageUrls = await uploadImages();

      // Validate required selects
      if (!selectedCategory || !selectedSubcategory || !selectedChildCategory) {
        setError("Please select category, subcategory, and child category.");
        setLoading(false);
        return;
      }
      
      // Validate required user fields
      if (!user?.storeId) {
        setError("Store information not found. Please ensure you have a store setup.");
        setLoading(false);
        return;
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : undefined,
        duration: parseInt(formData.duration),
        category: selectedCategory,
        subcategory: selectedSubcategory,
        childCategory: selectedChildCategory,
        images: imageUrls,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/services`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        navigate("/dashboard");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create service");
      }
    } catch (error) {
      console.error(error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "store_owner") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You need to be a store owner to create services
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-8 py-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900">Create New Service</h1>
            <p className="text-gray-600 mt-2">Set up your service with available time slots</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Basic Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Hair Cut & Styling"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration *
                    </label>
                    <select
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      {durationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (LKR) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      placeholder="2500.00"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Old Price (LKR)
                    </label>
                    <input
                      type="number"
                      name="oldPrice"
                      value={formData.oldPrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="3000.00"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Optional: Show original price if offering a discount
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Describe your service in detail..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 resize-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                {/* Categories */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={onCategoryChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory *
                    </label>
                    <select
                      value={selectedSubcategory}
                      onChange={onSubcategoryChange}
                      required
                      disabled={!selectedCategory}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select subcategory</option>
                      {categories
                        .find((cat) => cat.name === selectedCategory)
                        ?.subcategories.map((subcat) => (
                          <option key={subcat.name} value={subcat.name}>
                            {subcat.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Child Category *
                    </label>
                    <select
                      value={selectedChildCategory}
                      onChange={onChildCategoryChange}
                      required
                      disabled={!selectedSubcategory}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select child category</option>
                      {categories
                        .find((cat) => cat.name === selectedCategory)
                        ?.subcategories.find(
                          (sub) => sub.name === selectedSubcategory
                        )
                        ?.childCategories.map((childCat) => (
                          <option key={childCat} value={childCat}>
                            {childCat}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Service Images */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Service Images
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Images (up to 10)
                  </label>
                  <ImageUpload
                    images={images}
                    onImagesChange={setImages}
                    maxImages={10}
                    multiple
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Creating Service...</span>
                    </div>
                  ) : (
                    "Create Service"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateService;