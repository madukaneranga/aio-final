import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { formatLKR } from '../utils/currency';

const Cart = () => {
  const { orderItems, bookingItems, updateQuantity, removeFromOrder, removeFromBooking, orderTotal, bookingTotal } = useCart();

  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0) + bookingItems.length;
  const grandTotal = orderTotal + bookingTotal;

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add some products or book services to get started</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/products"
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Browse Products
            </Link>
            <Link
              to="/services"
              className="bg-white border-2 border-black text-black px-6 py-3 rounded-lg hover:bg-black hover:text-white transition-colors"
            >
              Browse Services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-600 mt-2">
            {totalItems} item{totalItems !== 1 ? 's' : ''} in your cart
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products */}
            {orderItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Products ({orderItems.length})</h2>
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div key={item.id} className="cart-item-animate flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                      <img
                        src={item.image ? 
                          (item.image.startsWith('http') ? item.image : `${import.meta.env.VITE_API_URL}${item.image}`) : 
                          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop'
                        }
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        <p className="text-gray-600">{formatLKR(item.price)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatLKR(item.price * item.quantity)}</p>
                        <button
                          onClick={() => removeFromOrder(item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bookings */}
            {bookingItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Service Bookings ({bookingItems.length})</h2>
                <div className="space-y-4">
                  {bookingItems.map((item) => (
                    <div key={`${item.id}-${item.date}-${item.time}`} className="cart-item-animate flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                      <img
                        src={item.image ? 
                          (item.image.startsWith('http') ? item.image : `${import.meta.env.VITE_API_URL}${item.image}`) : 
                          'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop'
                        }
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        <p className="text-gray-600">{formatLKR(item.price)}</p>
                        <p className="text-sm text-gray-500">
                          {item.date} at {item.time}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatLKR(item.price)}</p>
                        <button
                          onClick={() => removeFromBooking(item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6 h-fit">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3">
              {orderItems.length > 0 && (
                <div className="flex justify-between">
                  <span>Products ({orderItems.reduce((sum, item) => sum + item.quantity, 0)})</span>
                  <span>{formatLKR(orderTotal)}</span>
                </div>
              )}
              {bookingItems.length > 0 && (
                <div className="flex justify-between">
                  <span>Services ({bookingItems.length})</span>
                  <span>{formatLKR(bookingTotal)}</span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatLKR(grandTotal)}</span>
                </div>
              </div>
            </div>
            <Link
              to="/checkout"
              className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors mt-6 block text-center"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;