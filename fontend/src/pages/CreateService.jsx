import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ImageUpload from "../components/ImageUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import { Plus, Trash2, Calendar, Clock, ArrowLeft } from "lucide-react";
import imageCompression from "browser-image-compression";


//  ADDED: Firebase storage imports
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase"; //  CHANGED: use firebase storage instead of multer

const CreateService = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    priceType: "fixed",
    category: "",
    duration: "60",
  });
  const [images, setImages] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { user } = useAuth();
  const navigate = useNavigate();

  const categories = [
    "Tutoring",
    "Home Services",
    "Beauty & Wellness",
    "Consulting",
    "Fitness",
    "Technology",
    "Creative Services",
    "Professional Services",
  ];

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        options.push(time);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { startTime: "09:00", endTime: "17:00" }]);
  };

  const updateTimeSlot = (index, field, value) => {
    const updatedSlots = timeSlots.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot
    );
    setTimeSlots(updatedSlots);
  };

  const removeTimeSlot = (index) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const hasOverlappingTimeSlots = () => {
    const slots = timeSlots
      .map((slot) => ({
        start: timeToMinutes(slot.startTime),
        end: timeToMinutes(slot.endTime),
      }))
      .sort((a, b) => a.start - b.start);

    for (let i = 0; i < slots.length - 1; i++) {
      if (slots[i].end > slots[i + 1].start) {
        return true;
      }
    }
    return false;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (hasOverlappingTimeSlots()) {
      setError("Overlapping time slots detected. Please fix them.");
      setLoading(false);
      return;
    }
    try {
      // 🔄 Upload Product images
      const imageUrls = await Promise.all(
        images.map(async (file) => {
          const compressedFile = await imageCompression(
            file,
            compressionOptions
          );
          const imageRef = ref(
            storage,
            `services/id_${Date.now()}_${file.name}`
          );
          await uploadBytes(imageRef, compressedFile);
          return getDownloadURL(imageRef);
        })
      );

      const payload = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        priceType: formData.priceType,
        category: formData.category,
        duration: formData.duration,
        timeSlots: timeSlots, // Already an array or object
        images: imageUrls,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/services`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        navigate("/dashboard");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create service");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!user || user.role !== "store_owner") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You need to be a store owner to create services
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Create New Service
            </h1>
            <p className="text-gray-600 mt-2">
              Add a new service to your store
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Basic Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Enter service title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Describe your service"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (LKR) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Type *
                  </label>
                  <select
                    name="priceType"
                    value={formData.priceType}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="hourly">Hourly Rate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    required
                    min="15"
                    step="15"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Time Slots */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Available Time Slots</span>
                </h3>
                <button
                  type="button"
                  onClick={addTimeSlot}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Time Slot</span>
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Customers can book your service on any
                  date, but only during the time slots you specify here. Add
                  multiple time slots to give customers more booking options.
                </p>
              </div>

              {timeSlots.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No time slots added yet</p>
                  <p className="text-sm text-gray-500">
                    Add time slots to specify when your service is available
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timeSlots.map((slot, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Time
                          </label>
                          <select
                            value={slot.startTime}
                            onChange={(e) =>
                              updateTimeSlot(index, "startTime", e.target.value)
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                          >
                            {timeOptions.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Time
                          </label>
                          <select
                            value={slot.endTime}
                            onChange={(e) =>
                              updateTimeSlot(index, "endTime", e.target.value)
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                          >
                            {timeOptions.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeTimeSlot(index)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove Time Slot</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Service Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Images (up to 5)
              </label>
              <ImageUpload
                images={images}
                onImagesChange={setImages}
                maxImages={5}
                multiple={true}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center space-x-2">
                  {loading && <LoadingSpinner size="sm" />}
                  <span>{loading ? "Creating..." : "Create Service"}</span>
                </div>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateService;
