import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { Calendar, Clock, MapPin, ArrowLeft } from 'lucide-react';

const BookingSummary = () => {
  const { bookingItems, bookingTotal } = useCart();

  if (bookingItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No bookings found</h2>
          <p className="text-gray-600 mb-8">You haven't booked any services yet</p>
          <Link
            to="/services"
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Browse Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/services"
            className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Services</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Booking Summary</h1>
          <p className="text-gray-600 mt-2">Review your service bookings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Items */}
          <div className="lg:col-span-2 space-y-6">
            {bookingItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start space-x-4">
                  <img
                    src={item.image ? 
                      (item.image.startsWith('http') ? item.image : `${import.meta.env.VITE_API_URL}${item.image}`) : 
                      'https://images.unsplash.com/photo-1560472354-b43ff0c44a43?w=400&h=300&fit=crop'
                    }
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-2xl font-bold text-black mb-4">${item.price}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{item.date}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{item.time}</span>
                      </div>
                      {item.notes && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-500">Notes:</p>
                          <p className="text-sm text-gray-700">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Booking Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6 h-fit">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Services ({bookingItems.length})</span>
                <span className="font-semibold">${bookingTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee (5%)</span>
                <span className="font-semibold">${(bookingTotal * 0.05).toFixed(2)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${(bookingTotal * 1.05).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Link
              to="/checkout"
              className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors block text-center"
            >
              Proceed to Payment
            </Link>

            <div className="mt-4 text-center">
              <Link
                to="/services"
                className="text-gray-600 hover:text-black transition-colors text-sm"
              >
                Continue Browsing Services
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;