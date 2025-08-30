import React, { useState, useEffect } from "react";
import ImageUpload from "./ImageUpload";
import LoadingSpinner from "./LoadingSpinner";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase";

const UpdateService = ({ service, onUpdate, onCancel }) => {
  // Categories and selections
  const [categories, setCategories] = useState([]);

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
    discount: "",
    duration: 30, // Default 30 minutes
    tags: [],
    category: "",
    subcategory: "",
    childCategory: "",
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

  useEffect(() => {
    if (service) {
      setFormData({
        title: service.title || "",
        description: service.description || "",
        price: service.price?.toString() || "",
        oldPrice: service.oldPrice?.toString() || "",
        discount: service.discount?.toString() || "",
        duration: service.duration || 30,
        tags: service.tags || [],
        category: service.category || "",
        subcategory: service.subcategory || "",
        childCategory: service.childCategory || "",
      });
      
      // Set existing images
      if (service.images && service.images.length > 0) {
        setImages(service.images);
      }
    }
  }, [service]);

  // Auto-calculate price when oldPrice or discount changes
  useEffect(() => {
    if (formData.oldPrice && formData.discount) {
      const original = parseFloat(formData.oldPrice);
      const discountPercent = parseFloat(formData.discount);
      if (original > 0 && discountPercent >= 0) {
        const newPrice = original * (1 - discountPercent / 100);
        setFormData((prev) => ({
          ...prev,
          price: newPrice.toFixed(2),
        }));
      }
    }
  }, [formData.oldPrice, formData.discount]);

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

  // Handle normal inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // If user manually changes price, clear discount
    if (name === "price" && formData.discount) {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
        discount: "", // Clear discount
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // Upload images, compress and get URLs
  const uploadImages = async () => {
    if (images.length === 0) return [];
    
    const compressionOptions = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1000,
      useWebWorker: true,
    };

    const uploadPromises = images.map(async (image) => {
      // If it's already a URL (existing image), return it
      if (typeof image === 'string') {
        return image;
      }
      
      // If it's a File object (new image), upload it
      if (image instanceof File) {
        const compressedFile = await imageCompression(image, compressionOptions);
        const imageRef = ref(storage, `services/id_${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, compressedFile);
        return getDownloadURL(imageRef);
      }
      
      return image;
    });

    return Promise.all(uploadPromises);
  };

  //tagging
  const addTag = (tagText) => {
    if (tagText.trim() && !formData.tags.includes(tagText.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagText.trim()],
      }));
    }
  };

  const removeTag = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleTagInput = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(e.target.value);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Upload images
      const imageUrls = await uploadImages();

      const payload = {
        description: formData.description,
        price: parseFloat(formData.price),
        oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : undefined,
        duration: parseInt(formData.duration),
        images: imageUrls,
        tags: formData.tags,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/services/${service._id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        onUpdate();
        alert("Service updated successfully!");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update service");
      }
    } catch (error) {
      console.error(error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-8 py-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Edit Service</h2>
              <p className="text-gray-600 mt-2">Update your service details</p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
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
              <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Title (Cannot be changed)
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    disabled={true}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Service title cannot be modified after creation
                  </p>
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

              {/* Price, Old Price, Discount */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Price (LKR)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="1"
                    placeholder="2999.99"
                    className={`w-full border rounded-lg px-4 py-2 ${
                      formData.discount && formData.discount > 0 ? "bg-gray-100" : "border-gray-300"
                    }`}
                    disabled={!!formData.discount && formData.discount > 0}
                  />
                  {formData.discount && (
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-calculated from original price and discount
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Original Price (optional)
                  </label>
                  <input
                    type="number"
                    name="oldPrice"
                    value={formData.oldPrice}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Discount (%) (optional)
                  </label>
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="1"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="0"
                  />
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

              {/* Categories (DISABLED) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category (Cannot be changed)
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    disabled={true}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subcategory (Cannot be changed)
                  </label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    disabled={true}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Child Category (Cannot be changed)
                  </label>
                  <input
                    type="text"
                    value={formData.childCategory}
                    disabled={true}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Tags Section */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Service Tags
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Press Enter or comma to add tags. Great for search and
                categorization.
              </p>

              <input
                type="text"
                placeholder="Type a tag and press Enter..."
                onKeyDown={handleTagInput}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-3"
              />

              {/* Display added tags */}
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-black text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="text-white hover:text-red-500 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {formData.tags.length === 0 && (
                <p className="text-gray-400 text-sm">No tags added yet</p>
              )}
            </div>

            {/* Service Images */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Service Images
              </h3>
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
                onClick={onCancel}
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
                    <span>Updating Service...</span>
                  </div>
                ) : (
                  "Update Service"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdateService;