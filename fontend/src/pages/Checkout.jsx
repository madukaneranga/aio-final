import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Smartphone, Building2, Banknote, Lock, ShoppingBag } from 'lucide-react';
import { formatLKR } from '../utils/currency';

const Checkout = () => {
  const { cartItems, bookingItems, cartTotal, bookingTotal, clearCart, clearBookings } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('bank_transfer');
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Sri Lanka'
  });

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0) + bookingItems.length;
  const subtotal = cartTotal + bookingTotal;
  const platformFee = subtotal * 0.07;
  const grandTotal = subtotal + platformFee;

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/payment-methods`);
      if (response.ok) {
        const methods = await response.json();
        setPaymentMethods(methods);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const getPaymentIcon = (iconName) => {
    switch (iconName) {
      case 'building-2': return <Building2 className="w-6 h-6" />;
      case 'smartphone': return <Smartphone className="w-6 h-6" />;
      case 'banknote': return <Banknote className="w-6 h-6" />;
      case 'credit-card': return <CreditCard className="w-6 h-6" />;
      default: return <CreditCard className="w-6 h-6" />;
    }
  };

  const handleAddressChange = (e) => {
    setShippingAddress({
      ...shippingAddress,
      [e.target.name]: e.target.value
    });
  };

  const handleCheckout = async () => {
    if (!user) {
      alert('Please log in to continue');
      navigate('/login');
      return;
    }

    if (user.role !== 'customer') {
      alert('Only customers can place orders');
      return;
    }

    setLoading(true);

    try {
      // Process orders for products
      if (cartItems.length > 0) {
        if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode) {
          alert('Please fill in all shipping address fields');
          setLoading(false);
          return;
        }

        // Group items by store
        const itemsByStore = cartItems.reduce((acc, item) => {
          const storeId = typeof item.storeId === 'object' ? item.storeId._id : (item.storeId || 'unknown');
          if (!acc[storeId]) {
            acc[storeId] = [];
          }
          acc[storeId].push({
            productId: item.id,
            quantity: item.quantity
          });
          return acc;
        }, {});

        // Create separate orders for each store
        for (const [storeId, items] of Object.entries(itemsByStore)) {
          const orderResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/create-order-intent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              items,
              storeId: storeId,
              shippingAddress,
              paymentMethod: selectedPaymentMethod
            })
          });

          if (!orderResponse.ok) {
            const errorData = await orderResponse.json();
            alert(`Order failed: ${errorData.error}`);
            setLoading(false);
            return;
          }
        }
      }

      // Process bookings for services
      for (const booking of bookingItems) {
        const bookingResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/create-booking-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            serviceId: booking.id,
            bookingDate: booking.date,
            startTime: booking.time,
            endTime: booking.endTime || (booking.time ? booking.time.split(':').map((t, i) => i === 0 ? String(parseInt(t) + 1).padStart(2, '0') : t).join(':') : ''),
            notes: booking.notes,
            paymentMethod: selectedPaymentMethod
          })
        });

        if (!bookingResponse.ok) {
          const errorData = await bookingResponse.json();
          alert(`Booking failed: ${errorData.error}`);
          setLoading(false);
          return;
        }
      }

      // Clear cart and bookings after successful checkout
      clearCart();
      clearBookings();
      
      alert('Payment successful! Your orders and bookings have been confirmed.');
      navigate('/orders');
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add some items to proceed with checkout</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">Complete your purchase</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Checkout Form */}
          <div className="space-y-6">
            {/* Shipping Address */}
            {cartItems.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Address</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={shippingAddress.street}
                      onChange={handleAddressChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={shippingAddress.city}
                        onChange={handleAddressChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Colombo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Province *
                      </label>
                      <select
                        name="state"
                        value={shippingAddress.state}
                        onChange={handleAddressChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="">Select Province</option>
                        <option value="Western">Western</option>
                        <option value="Central">Central</option>
                        <option value="Southern">Southern</option>
                        <option value="Northern">Northern</option>
                        <option value="Eastern">Eastern</option>
                        <option value="North Western">North Western</option>
                        <option value="North Central">North Central</option>
                        <option value="Uva">Uva</option>
                        <option value="Sabaragamuwa">Sabaragamuwa</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={shippingAddress.zipCode}
                        onChange={handleAddressChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="10001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        name="country"
                        value={shippingAddress.country}
                        onChange={handleAddressChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 cursor-not-allowed"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPaymentMethod === method.id
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedPaymentMethod === method.id}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`mr-3 ${selectedPaymentMethod === method.id ? 'text-white' : 'text-gray-400'}`}>
                      {getPaymentIcon(method.icon)}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${selectedPaymentMethod === method.id ? 'text-white' : 'text-gray-900'}`}>
                        {method.name}
                      </div>
                      <div className={`text-sm ${selectedPaymentMethod === method.id ? 'text-gray-200' : 'text-gray-500'}`}>
                        {method.description}
                      </div>
                    </div>
                  </label>
                ))}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-blue-800">
                      Your payment information is secure and processed locally in Sri Lanka
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-sm p-6 h-fit">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            
            {/* Cart Items */}
            {cartItems.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Products</h3>
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <img
                        src={item.image ? 
                          (item.image.startsWith('http') ? item.image : `${import.meta.env.VITE_API_URL}${item.image}`) : 
                          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop'
                        }
                        alt={item.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatLKR(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking Items */}
            {bookingItems.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Service Bookings</h3>
                <div className="space-y-3">
                  {bookingItems.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex items-center space-x-3">
                      <img
                        src={item.image ? 
                          (item.image.startsWith('http') ? item.image : `${import.meta.env.VITE_API_URL}${item.image}`) : 
                          'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop'
                        }
                        alt={item.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-500">{item.date} at {item.time}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{formatLKR(item.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatLKR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee (7%)</span>
                <span className="font-medium">{formatLKR(platformFee)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total</span>
                <span>{formatLKR(grandTotal)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : `Pay ${formatLKR(grandTotal)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;