import React from 'react';
import { Star, MessageSquare } from 'lucide-react';

const ReviewCard = ({ review, showStoreResponse = true, showType = false }) => {
  const maskCustomerName = (name) => {
    if (!name || name.length <= 2) return name;
    return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold text-gray-900">
            {maskCustomerName(review.customerId?.name || 'Anonymous')}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < review.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {new Date(review.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        {showType && (
          <div className="text-right">
            {review.orderId && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Product Order
              </span>
            )}
            {review.bookingId && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Service Booking
              </span>
            )}
          </div>
        )}
      </div>

      <p className="text-gray-700 mb-4">{review.comment}</p>

      {showStoreResponse && review.response && (
        <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-black">
          <div className="flex items-center space-x-2 mb-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Store Response</span>
            <span className="text-sm text-gray-500">
              {new Date(review.response.respondedAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-gray-700">{review.response.message}</p>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;