import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Eye, Clock } from 'lucide-react';
import { Star } from 'lucide-react';

const Bookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const endpoint = user.role === 'store_owner' ? '/api/bookings/store' : '/api/bookings/customer';
      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchBookings();
        setSelectedBooking(null);
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const openReviewModal = (booking) => {
    setSelectedBookingForReview(booking);
    setReviewData({ rating: 5, comment: '' });
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          storeId: selectedBookingForReview.storeId._id || selectedBookingForReview.storeId,
          bookingId: selectedBookingForReview._id,
          rating: reviewData.rating,
          comment: reviewData.comment
        })
      });

      if (response.ok) {
        alert('Review submitted successfully!');
        setShowReviewModal(false);
        setSelectedBookingForReview(null);
        fetchBookings(); // Refresh bookings to update review status
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to view bookings</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {user.role === 'store_owner' ? 'Store Bookings' : 'My Bookings'}
          </h1>
          <p className="text-gray-600 mt-2">
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No bookings found</h2>
            <p className="text-gray-600">
              {user.role === 'store_owner' 
                ? 'You haven\'t received any bookings yet' 
                : 'You haven\'t made any bookings yet'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {booking.serviceId?.title || 'Service'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Booking #{booking._id.slice(-6)}
                    </p>
                    {user.role === 'store_owner' && (
                      <p className="text-sm text-gray-600">
                        Customer: {booking.customerId?.name || 'Unknown'}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">${booking.totalAmount}</p>
                    <span className={`inline-block px-3 py-1 text-sm rounded-full ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                </div>

                {/* Service Image */}
                <div className="flex items-center space-x-4 mb-4">
                  <img
                    src={booking.serviceId?.images?.[0] ? 
                      (booking.serviceId.images[0].startsWith('http') ? booking.serviceId.images[0] : `${import.meta.env.VITE_API_URL}${booking.serviceId.images[0]}`) : 
                      'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'
                    }
                    alt={booking.serviceId?.title || 'Service'}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      {booking.serviceId?.title || 'Service'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {booking.serviceId?.category || 'Service'}
                    </p>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {new Date(booking.bookingDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {booking.startTime} - {booking.endTime}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {booking.notes && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Notes:</h4>
                    <p className="text-sm text-gray-600">{booking.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedBooking(booking)}
                    className="flex items-center space-x-2 text-black hover:text-gray-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>

                  {user.role === 'store_owner' && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                    <div className="flex space-x-2">
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => updateBookingStatus(booking._id, 'confirmed')}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          Confirm
                        </button>
                      )}
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => updateBookingStatus(booking._id, 'completed')}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                        >
                          Mark Completed
                        </button>
                      )}
                      <button
                        onClick={() => updateBookingStatus(booking._id, 'cancelled')}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  
                  {user.role === 'store_owner' && booking.status === 'pending' && (
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-orange-600 font-medium">New Booking - Action Required</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-2">
                  <p className="text-xs text-gray-400">
                    Created: {new Date(booking.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Review Section for Completed Bookings */}
                {booking.status === 'completed' && user.role === 'customer' && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Service Completed</h4>
                    <p className="text-sm text-green-700 mb-3">How was your experience with this service?</p>
                    <button
                      onClick={() => openReviewModal(booking)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Write a Review
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Booking Details Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Booking Details #{selectedBooking._id.slice(-6)}
                </h2>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p><strong>Service:</strong> {selectedBooking.serviceId?.title}</p>
                  <p><strong>Status:</strong> {selectedBooking.status}</p>
                  <p><strong>Date:</strong> {new Date(selectedBooking.bookingDate).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {selectedBooking.startTime} - {selectedBooking.endTime}</p>
                  <p><strong>Total:</strong> ${selectedBooking.totalAmount}</p>
                  <p><strong>Platform Fee:</strong> ${selectedBooking.platformFee}</p>
                  <p><strong>Store Amount:</strong> ${selectedBooking.storeAmount}</p>
                </div>
                
                {selectedBooking.notes && (
                  <div>
                    <h3 className="font-semibold">Notes:</h3>
                    <p>{selectedBooking.notes}</p>
                  </div>
                )}
                
                {selectedBooking.paymentDetails && (
                  <div>
                    <h3 className="font-semibold">Payment Details:</h3>
                    <p>Status: {selectedBooking.paymentDetails.paymentStatus}</p>
                    {selectedBooking.paymentDetails.paidAt && (
                      <p>Paid: {new Date(selectedBooking.paymentDetails.paidAt).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedBookingForReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Write a Review</h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      className={`w-8 h-8 ${
                        star <= reviewData.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    >
                      <Star className="w-full h-full" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review
                </label>
                <textarea
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Share your experience with this service..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;