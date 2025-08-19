import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ImageUpload from "../components/ImageUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase";
import ColorSelector from "../components/ColorSelect";

const CreateProduct = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Categories and selections
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedChildCategory, setSelectedChildCategory] = useState("");
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
  });

  // Load categories once on mount
  useEffect(() => {
    loadCategories();
  }, []);

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
    const compressionOptions = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1000,
      useWebWorker: true,
    };
    return Promise.all(
      images.map(async (file) => {
        const compressedFile = await imageCompression(file, compressionOptions);
        const imageRef = ref(storage, `products/id_${Date.now()}_${file.name}`);
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
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : undefined,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        childCategory: selectedChildCategory,
        stock: totalStock,
        images: imageUrls,
        isPreorder: formData.isPreorder,
        shipping: formData.shipping,
        condition: formData.condition,
        warrentyMonths: Number(formData.warrentyMonths) || 0,
        variants: variantsPayload.length > 0 ? variantsPayload : undefined,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/products`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Create New Product
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Product Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Sample Product Name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
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
                    formData.discount && formData.discount >0  ? "bg-gray-100" : "border-gray-300"
                  }`}
                  disabled={!!formData.discount && formData.discount >0 }
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

            {/* Category, Subcategory, Child Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={onCategoryChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Subcategory
                </label>
                <select
                  value={selectedSubcategory}
                  onChange={onSubcategoryChange}
                  required
                  disabled={!selectedCategory}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select a subcategory</option>
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
                <label className="block text-sm font-medium mb-2">
                  Child Category
                </label>
                <select
                  value={selectedChildCategory}
                  onChange={onChildCategoryChange}
                  required
                  disabled={!selectedSubcategory}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select a child category</option>
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


            {/* Tags Section -  */}
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
                    className="bg-black text-white  px-3 py-1 rounded-full text-sm flex items-center gap-2"
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

            {/* Buttons */}
            <div className="flex justify-end space-x-4 mt-8">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
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
                    <span>Creating...</span>
                  </div>
                ) : (
                  "Create Product"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProduct;
