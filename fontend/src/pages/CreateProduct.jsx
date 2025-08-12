import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ImageUpload from "../components/ImageUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase";

const CreateProduct = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    stock: "",
    variants: {
      colors: [],
      sizes: [],
    },
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedChildCategory, setSelectedChildCategory] = useState("");

  const { user } = useAuth();
  const navigate = useNavigate();

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

  // Variant handlers
  const addColor = () => {
    setFormData((prev) => ({
      ...prev,
      variants: {
        ...prev.variants,
        colors: [...prev.variants.colors, { name: "", hex: "#000000" }],
      },
    }));
  };

  const updateColor = (index, field, value) => {
    const newColors = [...formData.variants.colors];
    newColors[index][field] = value;
    setFormData((prev) => ({
      ...prev,
      variants: {
        ...prev.variants,
        colors: newColors,
      },
    }));
  };

  const removeColor = (index) => {
    const newColors = formData.variants.colors.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      variants: {
        ...prev.variants,
        colors: newColors,
      },
    }));
  };

  const addSize = () => {
    setFormData((prev) => ({
      ...prev,
      variants: {
        ...prev.variants,
        sizes: [...prev.variants.sizes, { name: "", inStock: true }],
      },
    }));
  };

  const updateSize = (index, field, value) => {
    const newSizes = [...formData.variants.sizes];
    newSizes[index][field] = field === "inStock" ? value === "true" : value;
    setFormData((prev) => ({
      ...prev,
      variants: {
        ...prev.variants,
        sizes: newSizes,
      },
    }));
  };

  const removeSize = (index) => {
    const newSizes = formData.variants.sizes.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      variants: {
        ...prev.variants,
        sizes: newSizes,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const compressionOptions = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1000,
      useWebWorker: true,
    };

    try {
      // 🔄 Upload Product images
      const imageUrls = await Promise.all(
        images.map(async (file) => {
          const compressedFile = await imageCompression(
            file,
            compressionOptions
          );
          const imageRef = ref(
            storage,
            `products/id_${Date.now()}_${file.name}`
          );
          await uploadBytes(imageRef, compressedFile);
          return getDownloadURL(imageRef);
        })
      );

      const payload = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        stock: formData.stock,
        images: imageUrls,
        // Only send variants if any colors or sizes exist
        ...(formData.variants.colors.length > 0 ||
        formData.variants.sizes.length > 0
          ? { variants: formData.variants }
          : {}),
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/products`,
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
        setError(data.error || "Failed to create product");
      }
    } catch (error) {
      console.error(error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!user || user.role !== "store_owner") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You need to be a store owner to create products
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Create New Product
            </h1>
            <p className="text-gray-600 mt-2">
              Add a new product to your store
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Product Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="Enter product title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="Describe your product"
              />
            </div>

            {/* Price and Stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (LKR)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images (up to 10)
              </label>
              <ImageUpload
                images={images}
                onImagesChange={setImages}
                maxImages={10}
                multiple={true}
              />
            </div>

            {/* Variants Section */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color Variants
              </label>
              {formData.variants.colors.map((color, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Color Name"
                    value={color.name}
                    onChange={(e) => updateColor(index, "name", e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1"
                  />
                  <input
                    type="color"
                    value={color.hex}
                    onChange={(e) => updateColor(index, "hex", e.target.value)}
                    className="w-10 h-10 border"
                  />
                  <button
                    type="button"
                    onClick={() => removeColor(index)}
                    className="text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addColor}
                className="text-blue-500 hover:underline mt-2"
              >
                + Add Color
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Size Variants
              </label>
              {formData.variants.sizes.map((size, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Size Name"
                    value={size.name}
                    onChange={(e) => updateSize(index, "name", e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1"
                  />
                  <select
                    value={size.inStock ? "true" : "false"}
                    onChange={(e) =>
                      updateSize(index, "inStock", e.target.value)
                    }
                    className="border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="true">In Stock</option>
                    <option value="false">Out of Stock</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeSize(index)}
                    className="text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSize}
                className="text-blue-500 hover:underline mt-2"
              >
                + Add Size
              </button>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center space-x-2">
                  {loading && <LoadingSpinner size="sm" />}
                  <span>{loading ? "Creating..." : "Create Product"}</span>
                </div>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProduct;
