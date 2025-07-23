import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import ImageGallery from "../components/ImageGallery";
import { formatLKR } from "../utils/currency";
import {
  ShoppingCart,
  Plus,
  Minus,
  Star,
  Store,
  ArrowLeft,
  Check,
} from "lucide-react";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const { addToOrder } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    // Set default variants when product loads
    if (product) {
      if (product.variants?.colors?.length > 0) {
        setSelectedColor(product.variants.colors[0].name);
      }
      if (product.variants?.sizes?.length > 0) {
        setSelectedSize(product.variants.sizes[0].name);
      }
    }
  }, [product]);

  // For development/testing only
  useEffect(() => {
  if (product) {
    setProduct((prev) => ({
      ...prev,
      variants: {
        colors: [
          { name: "Red", hex: "#FF0000" },
          { name: "Blue", hex: "#0000FF" },
          { name: "White", hex: "#FFFFFF" },
        ],
        sizes: [
          { name: "XS", inStock: true },
          { name: "S", inStock: true },
          { name: "M", inStock: false },
          { name: "L", inStock: true },
        ],
      },
    }));
  }
}, [product]);


  const fetchProduct = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/products/${id}`
      );
      const data = await response.json();
      setProduct(data);
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };


  const getCurrentVariant = () => {
    if (!product?.variants) return null;

    return {
      color: selectedColor,
      size: selectedSize,
      price: product.price, // You can add variant-specific pricing logic here
    };
  };

  const isVariantSelectionComplete = () => {
    const hasColors = product?.variants?.colors?.length > 0;
    const hasSizes = product?.variants?.sizes?.length > 0;

    if (hasColors && !selectedColor) return false;
    if (hasSizes && !selectedSize) return false;

    return true;
  };

  const handleBuyNow = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "customer") {
      alert("Only customers can add items to cart");
      return;
    }

    if (!isVariantSelectionComplete()) {
      alert("Please select all product variants");
      return;
    }

    const productWithVariants = {
      ...product,
      storeId: product.storeId?._id || product.storeId,
      selectedVariants: getCurrentVariant(),
    };

    addToOrder(productWithVariants, quantity);
    navigate("/cart");
  };

  const handleAddToCart = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "customer") {
      alert("Only customers can add items to cart");
      return;
    }

    if (!isVariantSelectionComplete()) {
      alert("Please select all product variants");
      return;
    }

    const productWithVariants = {
      ...product,
      storeId: product.storeId?._id || product.storeId,
      selectedVariants: getCurrentVariant(),
    };

    addToOrder(productWithVariants, quantity);
    alert("Product added to cart!");
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Product not found
          </h2>
          <Link to="/products" className="text-black hover:text-gray-700">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/products"
            className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div>
            <ImageGallery images={product.images} title={product.title} />
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {product.title}
              </h1>
              <div className="flex items-center space-x-4 mb-6">
                <span className="text-5xl font-bold text-black">
                  {formatLKR(product.price)}
                </span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-gray-600">4.5 (125 reviews)</span>
                  </div>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600 capitalize bg-gray-100 px-3 py-1 rounded-full text-sm">
                    {product.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Store Info */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Store className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <Link
                    to={`/store/${product.storeId._id}`}
                    className="font-semibold text-black hover:text-gray-700 transition-colors text-lg"
                  >
                    {product.storeId.name}
                  </Link>
                  <p className="text-sm text-gray-600">Visit Store</p>
                </div>
              </div>
            </div>

            {/* Product Variants */}
            {product.variants &&
              (product.variants.colors?.length > 0 ||
                product.variants.sizes?.length > 0) && (
                <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
                  <h3 className="text-lg font-semibold">Product Options</h3>

                  {/* Color Variants */}
                  {product.variants.colors &&
                    product.variants.colors.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-sm font-medium text-gray-700">
                            Color
                          </label>
                          <span className="text-sm text-gray-600 capitalize font-medium">
                            {selectedColor}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {product.variants.colors.map((color) => (
                            <button
                              key={color.name}
                              onClick={() => setSelectedColor(color.name)}
                              className={`relative w-14 h-14 rounded-full border-2 transition-all transform hover:scale-110 hover:shadow-lg ${
                                selectedColor === color.name
                                  ? "border-black shadow-xl ring-2 ring-gray-200"
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            >
                              {selectedColor === color.name && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Check
                                    className={`w-6 h-6 ${
                                      color.hex === "#FFFFFF" ||
                                      color.hex === "#ffffff" ||
                                      color.name.toLowerCase() === "white"
                                        ? "text-gray-800"
                                        : "text-white"
                                    }`}
                                  />
                                </div>
                              )}
                              <span className="sr-only">{color.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Size Variants */}
                  {product.variants.sizes &&
                    product.variants.sizes.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-sm font-medium text-gray-700">
                            Size
                          </label>
                          <span className="text-sm text-gray-600 uppercase font-medium">
                            {selectedSize}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          {product.variants.sizes.map((size) => (
                            <button
                              key={size.name}
                              onClick={() => setSelectedSize(size.name)}
                              disabled={!size.inStock}
                              className={`relative py-3 px-4 text-sm font-medium rounded-lg border-2 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                                selectedSize === size.name
                                  ? "border-black bg-black text-white shadow-lg"
                                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                              }`}
                            >
                              <span className="uppercase">{size.name}</span>
                              {!size.inStock && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-full h-0.5 bg-red-400 transform rotate-45"></div>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Size Guide Link */}
                        <button className="text-sm text-gray-600 hover:text-black underline underline-offset-2 transition-colors mt-2">
                          Size Guide
                        </button>
                      </div>
                    )}

                  {/* Selected Variant Summary */}
                  {(selectedColor || selectedSize) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Selected:
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {selectedColor && (
                          <span className="capitalize">
                            Color:{" "}
                            <span className="font-medium">{selectedColor}</span>
                          </span>
                        )}
                        {selectedSize && (
                          <span className="uppercase">
                            Size:{" "}
                            <span className="font-medium">{selectedSize}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Product Description */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <p className="text-gray-700 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Stock Status */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Stock Status
                </span>
                <span
                  className={`text-sm font-medium ${
                    product.stock > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {product.stock > 0
                    ? `${product.stock} available`
                    : "Out of stock"}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-black h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((product.stock / 100) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Quantity and Add to Cart */}
            {product.stock > 0 && user?.role === "customer" && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Quantity
                  </label>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="text-2xl font-semibold w-12 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= product.stock}
                      className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={handleAddToCart}
                    disabled={!isVariantSelectionComplete()}
                    className="flex-1 bg-black text-white py-4 px-6 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>Add to Cart</span>
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={!isVariantSelectionComplete()}
                    className="bg-white border-2 border-black text-black py-4 px-6 rounded-lg hover:bg-black hover:text-white transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Buy Now - {formatLKR(product.price)}
                  </button>
                </div>

                {/* Variant Selection Warning */}
                {!isVariantSelectionComplete() && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-800 text-sm font-medium">
                      Please select all product options before adding to cart
                    </p>
                  </div>
                )}
              </div>
            )}

            {product.stock === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <p className="text-red-800 font-semibold text-lg">
                  Out of Stock
                </p>
                <p className="text-red-600">
                  This item is currently unavailable.
                </p>
              </div>
            )}

            {user?.role !== "customer" && user && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <p className="text-yellow-800 font-semibold">
                  Store Owner Account
                </p>
                <p className="text-yellow-600">
                  Only customers can purchase products.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
