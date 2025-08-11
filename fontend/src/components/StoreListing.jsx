import React from "react";
import StoreCard from "./StoreCard";
import LoadingSpinner from "./LoadingSpinner";
import EmptyState from "./EmptyState";
import { Store } from "lucide-react";

const StoreListing = ({ stores, loading, error }) => {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="mb-6">
        <p className="text-gray-600">
          {stores.length} store{stores.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {stores.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No stores found"
          description="Try adjusting your search criteria or check back later for new stores."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <StoreCard key={store._id} store={store} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StoreListing;