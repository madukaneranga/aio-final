import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import ImageGallery from "../components/ImageGallery";
import { formatLKR } from "../utils/currency";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  Calendar as CalendarIcon,
  Clock,
  Star,
  Store,
  ArrowLeft,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Tag,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

// Utility function to mask customer names for privacy
const maskCustomerName = (name) => {
  if (!name || name === "Anonymous") return "Anonymous";
  const words = name.split(" ");
  if (words.length === 1) {
    return words[0].charAt(0) + "*".repeat(Math.max(0, words[0].length - 1));
  }
  return words[0] + " " + words[1].charAt(0) + ".";
};

// Utility function to generate time slots
const generateTimeSlots = (startTime, endTime, duration, bufferTime = 0) => {
  const slots = [];
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);

  const current = new Date(start);

  while (current < end) {
    const slotEnd = new Date(current.getTime() + duration * 60000);

    if (slotEnd <= end) {
      slots.push({
        start: current.toTimeString().slice(0, 5),
        end: slotEnd.toTimeString().slice(0, 5),
        label: `${current.toTimeString().slice(0, 5)} - ${slotEnd
          .toTimeString()
          .slice(0, 5)}`,
      });
    }

    current.setMinutes(current.getMinutes() + duration + bufferTime);
  }

  return slots;
};

// Utility function to check if date is working day
const isWorkingDay = (date, workingDays) => {
  if (!workingDays || workingDays.length === 0) return true;
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayName = days[date.getDay()];
  return workingDays.includes(dayName);
};

// Utility function to check if date is excluded
const isExcludedDate = (date, excludedDates) => {
  if (!excludedDates || excludedDates.length === 0) return false;
  // Fix timezone issue by using local date comparison
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  
  return excludedDates.some(
    (excludedDate) => {
      const excludedDateObj = new Date(excludedDate);
      const excludedYear = excludedDateObj.getFullYear();
      const excludedMonth = String(excludedDateObj.getMonth() + 1).padStart(2, '0');
      const excludedDay = String(excludedDateObj.getDate()).padStart(2, '0');
      const excludedDateString = `${excludedYear}-${excludedMonth}-${excludedDay}`;
      return excludedDateString === dateString;
    }
  );
};

// Helper function to format date consistently (fixes timezone issues)
const formatDateForAPI = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ServiceDetail = () => {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [reviews, setReviews] = useState([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [allTimeSlots, setAllTimeSlots] = useState([]); // All slots for display
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const { addToBooking } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchService();
    fetchReviews();
  }, [id]);

  useEffect(() => {
    if (service && store && selectedDate) {
      fetchAvailableTimeSlots();
    }
  }, [selectedDate, service, store]);

  const fetchService = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/services/${id}`
      );
      const data = await response.json();
      setService(data);

      // Fetch store details separately
      if (data.storeId) {
        const storeResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/stores/${data.storeId._id}`
        );
        const storeData = await storeResponse.json();
        setStore(storeData.store);
      }
    } catch (error) {
      console.error("Error fetching service:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/reviews/store/${id}`
      );
      if (response.ok) {
        const data = await response.json();
        setReviews(data || []);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setReviews([]);
    }
  };

  // Helper function to check if two time ranges overlap on the same date
  const timeRangesOverlap = (start1, end1, start2, end2) => {
    const startTime1 = new Date(`2000-01-01T${start1}:00`);
    const endTime1 = new Date(`2000-01-01T${end1}:00`);
    const startTime2 = new Date(`2000-01-01T${start2}:00`);
    const endTime2 = new Date(`2000-01-01T${end2}:00`);

    return startTime1 < endTime2 && startTime2 < endTime1;
  };

  // Helper function to check if two dates are the same day (fixed timezone issue)
  const isSameDate = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return formatDateForAPI(d1) === formatDateForAPI(d2);
  };

  const fetchAvailableTimeSlots = async () => {
    if (!service || !store) return;

    setLoadingSlots(true);
    try {
      // Use the fixed date formatting
      const dateString = formatDateForAPI(selectedDate);

      // Fetch existing bookings for the selected date and potentially nearby dates
      let existingBookings = [];
      try {
        const bookingsResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/bookings/availability/${
            service.storeId._id
          }?date=${dateString}`
        );

        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json();
          existingBookings = bookingsData.bookings || [];
        }
      } catch (bookingError) {
        console.warn(
          "Could not fetch bookings, assuming no conflicts:",
          bookingError
        );
        existingBookings = [];
      }

      // Generate time slots based on store working hours and service duration
      const workingHours = store.serviceSettings?.workingHours || {
        start: "09:00",
        end: "17:00",
      };
      const bufferTime = store.serviceSettings?.bookingBuffer || 0;
      const serviceDuration = service.duration || 60;

      const allSlots = generateTimeSlots(
        workingHours.start,
        workingHours.end,
        serviceDuration,
        bufferTime
      );

      // Set all slots for display
      setAllTimeSlots(allSlots);

      // Filter out slots that conflict with existing bookings on the same date
      const availableSlots = allSlots.filter((slot) => {
        // Check if this slot overlaps with any existing booking on the same date
        const hasConflict = existingBookings.some((booking) => {
          const bookingDate = booking.bookingDetails?.date;
          const bookingStart = booking.bookingDetails?.startTime;
          const bookingEnd = booking.bookingDetails?.endTime;

          // Skip if booking data is incomplete
          if (!bookingDate || !bookingStart || !bookingEnd) return false;

          // Only check for conflicts on the same date
          if (!isSameDate(bookingDate, selectedDate)) return false;

          // Check for time overlap
          return timeRangesOverlap(
            slot.start,
            slot.end,
            bookingStart,
            bookingEnd
          );
        });

        return !hasConflict;
      });

      // Extract booked times for display purposes (only for the selected date)
      const bookedTimes = existingBookings
        .filter(
          (booking) =>
            booking.bookingDetails?.date &&
            isSameDate(booking.bookingDetails.date, selectedDate)
        )
        .map((booking) => booking.bookingDetails?.startTime)
        .filter(Boolean);

      setAvailableTimeSlots(availableSlots);
      setBookedSlots(bookedTimes);
    } catch (error) {
      console.error("Error fetching available time slots:", error);
      // Fallback: generate basic time slots
      const workingHours = store?.serviceSettings?.workingHours || {
        start: "09:00",
        end: "17:00",
      };
      const serviceDuration = service?.duration || 60;
      const fallbackSlots = generateTimeSlots(
        workingHours.start,
        workingHours.end,
        serviceDuration
      );
      setAllTimeSlots(fallbackSlots);
      setAvailableTimeSlots(fallbackSlots);
      setBookedSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookNow = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "customer") {
      alert("Only customers can book services");
      return;
    }

    if (!selectedTime) {
      alert("Please select a time slot");
      return;
    }

    const selectedSlot = availableTimeSlots.find(
      (slot) => slot.start === selectedTime
    );
    if (!selectedSlot) {
      alert("Selected time slot is no longer available");
      return;
    }

    const bookingDetails = {
      date: formatDateForAPI(selectedDate), // Use fixed date formatting
      time: selectedTime,
      endTime: selectedSlot.end,
      duration: service.duration,
      notes,
    };

    console.log("Booking Details:", bookingDetails);

    // Ensure we pass the service with proper storeId
    const serviceWithStoreId = {
      ...service,
      storeId: service.storeId?._id || service.storeId,
    };

    addToBooking(serviceWithStoreId, bookingDetails);
    navigate("/booking-summary");
  };

  // Calendar tile content to show availability
  const tileContent = ({ date, view }) => {
    if (view !== "month" || !store) return null;

    const workingDays = store.serviceSettings?.workingDays || [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ];
    const excludedDates = store.serviceSettings?.excludedDates || [];

    const isWorking = isWorkingDay(date, workingDays);
    const isExcluded = isExcludedDate(date, excludedDates);
    const isPast = date < new Date().setHours(0, 0, 0, 0);

    if (isPast) return null;

    if (isExcluded || !isWorking) {
      return <div className="text-xs text-red-500 text-center">●</div>;
    }

    return <div className="text-xs text-green-500 text-center">●</div>;
  };

  // Calendar tile className to style availability
  const tileClassName = ({ date, view }) => {
    if (view !== "month" || !store) return "";

    const workingDays = store.serviceSettings?.workingDays || [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ];
    const excludedDates = store.serviceSettings?.excludedDates || [];

    const isWorking = isWorkingDay(date, workingDays);
    const isExcluded = isExcludedDate(date, excludedDates);
    const isPast = date < new Date().setHours(0, 0, 0, 0);

    if (isPast) return "react-calendar__tile--past";
    if (isExcluded || !isWorking) return "react-calendar__tile--unavailable";

    return "react-calendar__tile--available";
  };

  // Disable unavailable dates
  const tileDisabled = ({ date, view }) => {
    if (view !== "month") return false;

    // Don't disable if store data isn't loaded yet
    if (!store) return false;

    const workingDays = store.serviceSettings?.workingDays || [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ];
    const excludedDates = store.serviceSettings?.excludedDates || [];
    const advanceBookingDays = store.serviceSettings?.advanceBookingDays || 30;

    const isWorking = isWorkingDay(date, workingDays);
    const isExcluded = isExcludedDate(date, excludedDates);
    const isPast = date < new Date().setHours(0, 0, 0, 0);
    const isTooFarAhead =
      date > new Date(Date.now() + advanceBookingDays * 24 * 60 * 60 * 1000);

    return isPast || isExcluded || !isWorking || isTooFarAhead;
  };

  // Helper function to check if a time slot is in the past
  const isSlotInPast = (slot) => {
    const today = new Date();
    const selectedDateFormatted = formatDateForAPI(selectedDate);
    const todayFormatted = formatDateForAPI(today);
    
    // If selected date is not today, no slots are in the past
    if (selectedDateFormatted !== todayFormatted) {
      return false;
    }
    
    // If it's today, check if the slot time has passed
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    const [slotHour, slotMinute] = slot.start.split(':').map(Number);
    const slotTimeInMinutes = slotHour * 60 + slotMinute;
    
    return slotTimeInMinutes <= currentTimeInMinutes;
  };

  // Helper function to check if a time slot is available
  const isSlotAvailable = (slot) => {
    // Check if slot is in the past
    if (isSlotInPast(slot)) {
      return false;
    }
    
    return availableTimeSlots.some(availableSlot => availableSlot.start === slot.start);
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Service not found
          </h2>
          <Link to="/services" className="text-black hover:text-gray-700">
            Back to Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom CSS for calendar styling */}
      <style>{`
  .react-calendar__tile--available {
    background-color: #f0fdf4 !important;
    color: #166534 !important;
  }
  .react-calendar__tile--unavailable {
    background-color: #fef2f2 !important;
    color: #dc2626 !important;
  }
  .react-calendar__tile--past {
    background-color: #f3f4f6 !important;
    color: #9ca3af !important;
  }
  .react-calendar__tile--active {
    background-color: #000000 !important;
    color: white !important;
  }
  .react-calendar__tile--active.react-calendar__tile--available {
    background-color: #000000 !important;
    color: white !important;
  }
  .react-calendar__tile:hover {
    background-color: #e5e7eb !important;
  }
  .react-calendar__tile--active:hover {
    background-color: #374151 !important;
  }
`}</style>

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {service.title}
              </h1>

              {/* Category Breadcrumb */}
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                <Tag className="w-4 h-4" />
                <span className="capitalize">{service.category}</span>
                {service.subcategory && (
                  <>
                    <span>›</span>
                    <span className="capitalize">{service.subcategory}</span>
                  </>
                )}
                {service.childCategory && (
                  <>
                    <span>›</span>
                    <span className="capitalize">{service.childCategory}</span>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-gray-600">
                    {service.rating || 0} ({reviews.length} reviews)
                  </span>
                </div>
                <span className="text-gray-400">|</span>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600">
                    {service.bookingCount || 0} bookings
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-4 mb-4">
                <p className="text-4xl font-bold text-black">
                  {formatLKR(service.price)}
                  <span className="text-lg text-gray-500 ml-2">
                    {service.priceType === "hourly" ? "/hour" : ""}
                  </span>
                </p>
                {service.oldPrice && service.oldPrice > service.price && (
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl text-gray-500 line-through">
                      {formatLKR(service.oldPrice)}
                    </span>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-semibold">
                      {Math.round(
                        ((service.oldPrice - service.price) /
                          service.oldPrice) *
                          100
                      )}
                      % OFF
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Store Info */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    {store?.profileImage ? (
                      <img
                        src={store.profileImage}
                        alt={service.storeId.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <Store className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <Link
                      to={`/store/${service.storeId._id}`}
                      className="font-semibold text-black hover:text-gray-700 transition-colors"
                    >
                      {service.storeId.name}
                    </Link>
                    <div className="flex items-center space-x-2 mt-1">
                      {store?.isVerified && (
                        <span className="flex items-center text-green-600 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </span>
                      )}
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {store?.storeLevel || "Bronze"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="flex items-center space-x-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{store?.rating || 0}</span>
                  </div>
                  <p className="text-gray-600">
                    {store?.completionRate || 0}% completion
                  </p>
                </div>
              </div>

              {/* Store Contact Info */}
              {store?.contactInfo && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{store.contactInfo.address}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{store.contactInfo.phone}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{store.contactInfo.email}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Service Description */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <p className="text-gray-700 leading-relaxed">
                {service.description}
              </p>
            </div>

            {/* Service Details */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold mb-3">Service Details</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Clock className="w-5 h-5" />
                  <span>Duration: {service.duration} minutes</span>
                </div>

                {service.bookingSettings && (
                  <div className="space-y-2 text-sm">
                    {service.bookingSettings.minAdvanceBookingHours && (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>
                          Book at least{" "}
                          {service.bookingSettings.minAdvanceBookingHours} hours
                          in advance
                        </span>
                      </div>
                    )}
                    {service.bookingSettings.maxBookingsPerSlot && (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>
                          Max {service.bookingSettings.maxBookingsPerSlot}{" "}
                          booking(s) per time slot
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Working Hours */}
            {store?.serviceSettings && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-semibold mb-3">Working Hours</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hours:</span>
                    <span>
                      {store.serviceSettings.workingHours?.start || "09:00"} -{" "}
                      {store.serviceSettings.workingHours?.end || "17:00"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Working Days:</span>
                    <span className="capitalize">
                      {store.serviceSettings.workingDays?.join(", ") ||
                        "Mon - Fri"}
                    </span>
                  </div>
                  {store.serviceSettings.bookingBuffer > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Buffer Time:</span>
                      <span>{store.serviceSettings.bookingBuffer} minutes</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Booking Section */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5" />
                <span>Book This Service</span>
              </h3>

              {/* Legend */}
              <div className="mb-4 flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-green-100"></div>
                  <span className="text-gray-600">Available</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-100"></div>
                  <span className="text-gray-600">Booked</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-gray-100"></div>
                  <span className="text-gray-600">Past/Unavailable</span>
                </div>
              </div>

              {/* Date Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <Calendar
                  onChange={setSelectedDate}
                  value={selectedDate}
                  minDate={new Date()}
                  maxDate={
                    new Date(
                      Date.now() +
                        (store?.serviceSettings?.advanceBookingDays || 30) *
                          24 *
                          60 *
                          60 *
                          1000
                    )
                  }
                  tileContent={tileContent}
                  tileClassName={tileClassName}
                  tileDisabled={tileDisabled}
                  className="w-full border border-gray-300 rounded-lg"
                />
              </div>

              {/* Time Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Time
                </label>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                  </div>
                ) : allTimeSlots.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {allTimeSlots.map((slot) => {
                      const isAvailable = isSlotAvailable(slot);
                      const isBooked = bookedSlots.includes(slot.start);
                      const isPast = isSlotInPast(slot);
                      
                      return (
                        <button
                          key={slot.start}
                          onClick={() => isAvailable ? setSelectedTime(slot.start) : null}
                          disabled={!isAvailable}
                          className={`p-3 text-sm rounded-lg border transition-colors ${
                            selectedTime === slot.start
                              ? "bg-black text-white border-black"
                              : isAvailable
                              ? "bg-white text-gray-700 border-gray-300 hover:border-black"
                              : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          }`}
                        >
                          <div className="font-medium">{slot.label}</div>
                          {isBooked ? (
                            <div className="text-xs text-red-500 mt-1">Booked</div>
                          ) : isPast ? (
                            <div className="text-xs text-gray-400 mt-1">Past</div>
                          ) : !isAvailable ? (
                            <div className="text-xs text-gray-400 mt-1">Unavailable</div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <XCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No time slots available for this date</p>
                    <p className="text-sm">Please select another date</p>
                  </div>
                )}
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
                disabled={!selectedTime}
                className={`w-full py-3 px-6 rounded-lg transition-colors ${
                  selectedTime
                    ? "bg-black text-white hover:bg-gray-800"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Book Now - {formatLKR(service.price)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Customer Reviews
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(store?.rating || 0)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-semibold">
                  {store?.rating || 0}
                </span>
                <span className="text-gray-600">
                  ({reviews.length} reviews)
                </span>
              </div>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Reviews Yet
              </h3>
              <p className="text-gray-600">
                Be the first to review this store!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Review Summary */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Review Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 mb-2">
                        {store?.rating || 0}
                      </div>
                      <div className="flex justify-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.floor(store?.rating || 0)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-600">
                        {reviews.length} total reviews
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviews.filter(
                        (r) => r.rating === rating
                      ).length;
                      const percentage =
                        reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div
                          key={rating}
                          className="flex items-center space-x-2"
                        >
                          <span className="text-sm w-8">{rating}★</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-8">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Individual Reviews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <div
                    key={review._id}
                    className="bg-white rounded-lg shadow-sm p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {maskCustomerName(
                            review.customerId?.name || "Anonymous"
                          )}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
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
                    </div>

                    <p className="text-gray-700 mb-4">{review.comment}</p>

                    {review.response && (
                      <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-black">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Store Response
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(
                              review.response.respondedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700">
                          {review.response.message}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;