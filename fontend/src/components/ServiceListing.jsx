import React from "react";
import ServiceCard from "./ServiceCard";
import LoadingSpinner from "./LoadingSpinner";
import EmptyState from "./EmptyState";
import { Calendar } from "lucide-react";

const ServiceListing = ({ services, loading, error }) => {
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
          {services.length} service{services.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No services found"
          description="Try adjusting your search criteria or check back later for new services."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
          {services.map((service) => (
            <ServiceCard key={service._id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ServiceListing;