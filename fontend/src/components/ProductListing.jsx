import React from "react";
import ProductCard from "./ProductCard";
import LoadingSpinner from "./LoadingSpinner";
import EmptyState from "./EmptyState";
import { Package } from "lucide-react";

const ProductListing = ({ products, loading, error }) => {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="max-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="mb-6">
        <p className="text-gray-600">
          {products.length} product{products.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="Try adjusting your search criteria or check back later for new products."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-34 xl:grid-cols-7 gap-6">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductListing;