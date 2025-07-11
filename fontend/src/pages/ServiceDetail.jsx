import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import ImageGallery from '../components/ImageGallery';
import { formatLKR } from '../utils/currency';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Calendar as CalendarIcon, Clock, Star, Store, ArrowLeft } from 'lucide-react';

const ServiceDetail = () => {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const { addToBooking } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchService();
  }, [id]);

  const fetchService = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/services/${id}`);
      const data = await response.json();
      setService(data);
    } catch (error) {
      console.error('Error fetching service:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableTimeSlots = () => {
    if (!service?.timeSlots || service.timeSlots.length === 0) {
      // Default time slots if none specified
      return [
        '09:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00', '17:00'
      ];
    }

    // Generate time slots from service time slots
    const slots = [];
    service.timeSlots.forEach(slot => {
      const start = slot.startTime;
      const end = slot.endTime;
      
      // Generate 1-hour slots between start and end time
      const startHour = parseInt(start.split(':')[0]);
      const endHour = parseInt(end.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
      }
    });

    return [...new Set(slots)].sort(); // Remove duplicates and sort
  };

  const handleBookNow = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'customer') {
      alert('Only customers can book services');
      return;
    }

    if (!selectedTime) {
      alert('Please select a time slot');
      return;
    }

    const bookingDetails = {
      date: selectedDate.toISOString().split('T')[0],
      time: selectedTime,
      notes
    };

    // Ensure we pass the service with proper storeId
    const serviceWithStoreId = {
      ...service,
      storeId: service.storeId?._id || service.storeId
    };
    
    addToBooking(serviceWithStoreId, bookingDetails);
    navigate('/booking-summary');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Service not found</h2>
          <Link to="/services" className="text-black hover:text-gray-700">
            Back to Services
          </Link>
        </div>
      </div>
    );
  }

  const availableTimeSlots = getAvailableTimeSlots();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/services"
            className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Services</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Service Images */}
          <div>
            <ImageGallery images={service.images} title={service.title} />
          </div>

          {/* Service Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{service.title}</h1>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-gray-600">4.5 (89 reviews)</span>
                </div>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600 capitalize">{service.category}</span>
              </div>
              <p className="text-4xl font-bold text-black mb-4">
                {formatLKR(service.price)}
                <span className="text-lg text-gray-500 ml-2">
                  {service.priceType === 'hourly' ? '/hour' : ''}
                </span>
              </p>
            </div>

            {/* Store Info */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-3">
                <Store className="w-6 h-6 text-gray-400" />
                <div>
                  <Link
                    to={`/store/${service.storeId._id}`}
                    className="font-semibold text-black hover:text-gray-700 transition-colors"
                  >
                    {service.storeId.name}
                  </Link>
                  <p className="text-sm text-gray-600">Visit Store</p>
                </div>
              </div>
            </div>

            {/* Service Description */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <p className="text-gray-700 leading-relaxed">{service.description}</p>
            </div>

            {/* Duration */}
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="w-5 h-5" />
              <span>Duration: {service.duration} minutes</span>
            </div>

            {/* Booking Section */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5" />
                <span>Book This Service</span>
              </h3>

              {/* Date Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <Calendar
                  onChange={setSelectedDate}
                  value={selectedDate}
                  minDate={new Date()}
                  className="w-full border border-gray-300 rounded-lg"
                />
              </div>

              {/* Time Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {availableTimeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`p-2 text-sm rounded-lg border transition-colors ${
                        selectedTime === time
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Any special requirements or notes..."
                />
              </div>

              <button
                onClick={handleBookNow}
                className="w-full bg-black text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Book Now - {formatLKR(service.price)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;