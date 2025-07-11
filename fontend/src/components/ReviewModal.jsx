import React, { useState } from 'react';
import { Star, X } from 'lucide-react';

const ReviewModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  orderOrBooking, 
  type = 'order' // 'order' or 'booking'
}) => {
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await onSubmit(reviewData);
      setReviewData({ rating: 5, comment: '' });
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Write a Review</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {orderOrBooking && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Reviewing {type === 'order' ? 'order' : 'service booking'}:
            </p>
            <p className="font-medium text-gray-900">
              {type === 'order' 
                ? `Order #${orderOrBooking._id?.slice(-8)}` 
                : orderOrBooking.serviceId?.title || 'Service'
              }
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating *
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewData({ ...reviewData, rating: star })}
                  className={`w-8 h-8 transition-colors ${
                    star <= reviewData.rating
                      ? 'text-yellow-400'
                      : 'text-gray-300 hover:text-yellow-300'
                  }`}
                >
                  <Star className={`w-full h-full ${star <= reviewData.rating ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {reviewData.rating === 1 && 'Poor'}
              {reviewData.rating === 2 && 'Fair'}
              {reviewData.rating === 3 && 'Good'}
              {reviewData.rating === 4 && 'Very Good'}
              {reviewData.rating === 5 && 'Excellent'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review *
            </label>
            <textarea
              value={reviewData.comment}
              onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder={`Share your experience with this ${type}...`}
              required
              minLength={10}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {reviewData.comment.length}/500 characters (minimum 10)
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || reviewData.comment.length < 10}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;