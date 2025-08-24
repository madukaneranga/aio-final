import React from "react";
import ProductCard from "./ProductCard";
import ServiceCard from "./ServiceCard";
import LoadingSpinner from "./LoadingSpinner";
import EmptyState from "./EmptyState";
import { Package } from "lucide-react";

const CustomListing = ({ items = [], loading = false, error = null, type = "product" }) => {
  // Additional safety check
  const safeItems = items || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="mb-6">
        <p className="text-gray-600">
          {safeItems.length} {type === "product" ? "product" : "service"}
          {safeItems.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {safeItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No items found"
          description="Try adjusting your search criteria or check back later for new items."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
          {type === "product" &&
            safeItems.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          {type === "service" &&
            safeItems.map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
        </div>
      )}
    </div>
  );
};

export default CustomListing;