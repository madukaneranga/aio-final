import React, { useState, useEffect } from "react";
import ImageUpload from "./ImageUpload";
import LoadingSpinner from "./LoadingSpinner";
import ColorSelector from "./ColorSelect";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase";

const UpdateProduct = ({ product, onUpdate, onCancel, limitsInfo }) => {
  // Categories and selections
  const [categories, setCategories] = useState([]);
  const [totalVariantStock, setTotalVariantStock] = useState(0);

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
    stock: "",
    isPreorder: false,
    shipping: "",
    condition: "",
    warrentyMonths: "",
    variants: [], // Combined variants: { name, hex, size, stock }
    tags: [],
    category: "",
    subcategory: "",
    childCategory: "",
  });

  // Load categories once on mount
  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || "",
        description: product.description || "",
        price: product.price?.toString() || "",
        oldPrice: product.oldPrice?.toString() || "",
        discount: product.discount?.toString() || "",
        stock: product.stock?.toString() || "",
        isPreorder: product.isPreorder || false,
        shipping: product.shipping || "",
        condition: product.condition || "",
        warrentyMonths: product.warrentyMonths?.toString() || "",
        variants: product.variants || [],
        tags: product.tags || [],
        category: product.category || "",
        subcategory: product.subcategory || "",
        childCategory: product.childCategory || "",
      });
      
      // Set existing images
      if (product.images && product.images.length > 0) {
        setImages(product.images);
      }
    }
  }, [product]);

  useEffect(() => {
    const total = formData.variants.reduce(
      (sum, v) => sum + (Number(v.stock) || 0),
      0
    );
    setTotalVariantStock(total);
  }, [formData.variants]);

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

  // Variants: Add a new variant row
  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { name: "", hex: "#000000", size: "", stock: "" },
      ],
    }));
  };

  // Update variant fields
  const updateVariant = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData((prev) => ({
      ...prev,
      variants: newVariants,
    }));
  };

  // Remove variant row
  const removeVariant = (index) => {
    const newVariants = formData.variants.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      variants: newVariants,
    }));
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
        const imageRef = ref(storage, `products/id_${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, compressedFile);
        return getDownloadURL(imageRef);
      }
      
      return image;
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Upload images
      const imageUrls = await uploadImages();

      // Prepare payload, transform variants: convert stock to number
      const variantsPayload =
        formData.variants.length > 0
          ? formData.variants.map(({ name, hex, size, stock }) => ({
              name,
              hex,
              size,
              stock: Number(stock) || 0,
            }))
          : [];

      // Calculate total stock if variants exist
      const totalStock =
        variantsPayload.length > 0
          ? variantsPayload.reduce((acc, v) => acc + v.stock, 0)
          : Number(formData.stock) || 0;

      const payload = {
        description: formData.description,
        price: parseFloat(formData.price),
        oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : undefined,
        stock: totalStock,
        images: imageUrls,
        isPreorder: formData.isPreorder,
        shipping: formData.shipping,
        condition: formData.condition,
        warrentyMonths: Number(formData.warrentyMonths) || 0,
        variants: variantsPayload.length > 0 ? variantsPayload : undefined,
        tags: formData.tags,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/products/${product._id}`,
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
        alert("Product updated successfully!");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update product");
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
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Product</h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Product Title (Cannot be changed)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  disabled={true}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Product title cannot be modified after creation
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="A detailed description of the product..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 resize-none"
                />
              </div>
            </div>

            {/* Price, Old Price, Discount, Stock, Is Preorder */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <div>
                <label className="block text-sm font-medium mb-2">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  name="stock"
                  value={
                    formData.variants.length > 0
                      ? totalVariantStock
                      : formData.stock
                  }
                  onChange={handleChange}
                  min="0"
                  className={`w-full border rounded-lg px-4 py-2 ${
                    formData.variants.length > 0
                      ? "bg-gray-100 cursor-not-allowed"
                      : "border-gray-300"
                  }`}
                  placeholder="0"
                  disabled={formData.variants.length > 0}
                  required={formData.variants.length === 0}
                />
                {formData.variants.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Stock is managed via variants and cannot be set here.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center space-x-2 mt-6 md:mt-0">
                <input
                  type="checkbox"
                  name="isPreorder"
                  checked={formData.isPreorder}
                  onChange={handleChange}
                  id="isPreorder"
                  className="h-5 w-5"
                />
                <label htmlFor="isPreorder" className="text-sm font-medium">
                  Is Preorder
                </label>
              </div>
            </div>

            {/* Category, Subcategory, Child Category (DISABLED) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category (Cannot be changed)
                </label>
                <input
                  type="text"
                  value={formData.category}
                  disabled={true}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Subcategory (Cannot be changed)
                </label>
                <input
                  type="text"
                  value={formData.subcategory}
                  disabled={true}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Child Category (Cannot be changed)
                </label>
                <input
                  type="text"
                  value={formData.childCategory}
                  disabled={true}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Shipping, Condition, Warranty */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Shipping Info
                </label>
                <select
                  name="shipping"
                  value={formData.shipping}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select shipping</option>
                  <option value="free-shipping">Free Shipping</option>
                  <option value="paid-shipping">Paid Shipping</option>
                  <option value="local-pickup">Local Pickup</option>
                </select>
                <p className="text-xs text-gray-500 mb-2">
                  You can only charge for the <b>Paid Shipping</b> fees through
                  the user.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Condition
                </label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select condition</option>
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Warranty Months
                </label>
                <input
                  type="number"
                  name="warrentyMonths"
                  value={formData.warrentyMonths}
                  onChange={handleChange}
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Variants */}
            {limitsInfo?.itemVariants && (
              <div>
                <label className="block text-sm font-medium mb-2">Variants</label>
                <p className="text-xs text-gray-500 mb-2">
                  Add color, size, and stock for each variant combination.
                </p>

                {formData.variants.map((variant, idx) => (
                  <div key={idx} className="flex items-center space-x-4 mb-3">
                    <ColorSelector
                      selectedColor={variant.name}
                      onColorSelect={(index, colorName) => {
                        updateVariant(index, "name", colorName);
                      }}
                      variantIndex={idx}
                    />
                    <input
                      type="text"
                      placeholder="Size (e.g. M, L, 42)"
                      value={variant.size}
                      onChange={(e) => updateVariant(idx, "size", e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 w-32 h-10"
                    />
                    <input
                      type="number"
                      placeholder="Stock"
                      value={variant.stock}
                      onChange={(e) =>
                        updateVariant(idx, "stock", e.target.value)
                      }
                      min="0"
                      className="border border-gray-300 rounded-lg px-3 py-2 w-20 h-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      className="text-red-500 hover:text-red-700 px-2 py-2 h-10 flex items-center"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addVariant}
                  className="text-blue-500 hover:text-blue-700 font-medium"
                >
                  + Add Variant
                </button>

                {formData.variants.length > 0 && (
                  <p className="text-sm font-medium mt-2">
                    Total Stock (from variants):{" "}
                    <span className="text-green-600 font-semibold">
                      {totalVariantStock}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Tags Section */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Product Tags
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

            {/* Product Images */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Product Images (up to 10)
              </label>
              <ImageUpload
                images={images}
                onImagesChange={setImages}
                maxImages={10}
                multiple
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  "Update Product"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdateProduct;