import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ImageUpload from "../components/ImageUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase";
import { Plus, Trash2, Calendar, Clock, ArrowLeft } from "lucide-react";

const CreateProduct = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Categories and selections
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedChildCategory, setSelectedChildCategory] = useState("");
  const [totalVariantStock, setTotalVariantStock] = useState(0);
  const [timeSlots, setTimeSlots] = useState([]);
  const [globalExclusions, setGlobalExclusions] = useState({
    excludeWeekends: false,
    excludeWeekdays: [],
    excludeTimeRanges: [],
    excludeSpecificDates: []
  });

  // Images & loading
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields including extra fields
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    oldPrice: "",
    stock: "",
    isPreorder: false,
    priceType: "",
    condition: "",
    warrentyMonths: "",
    variants: [], // Combined variants: { name, hex, size, stock }
  });

  // Load categories once on mount
  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const total = formData.variants.reduce(
      (sum, v) => sum + (Number(v.stock) || 0),
      0
    );
    setTotalVariantStock(total);
  }, [formData.variants]);

  const loadCategories = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  // Handle cascading selects for categories
  const onCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setSelectedSubcategory("");
    setSelectedChildCategory("");
  };

  const onSubcategoryChange = (e) => {
    setSelectedSubcategory(e.target.value);
    setSelectedChildCategory("");
  };

  const onChildCategoryChange = (e) => {
    setSelectedChildCategory(e.target.value);
  };

  // Handle normal inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Variants: Add a new variant row
  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { name: "", hex: "#000000", size: "", stock: "" },
      ],
    }));
  };

  // Update variant fields
  const updateVariant = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData((prev) => ({
      ...prev,
      variants: newVariants,
    }));
  };

  // Remove variant row
  const removeVariant = (index) => {
    const newVariants = formData.variants.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      variants: newVariants,
    }));
  };

  // Upload images, compress and get URLs
  const uploadImages = async () => {
    const compressionOptions = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1000,
      useWebWorker: true,
    };
    return Promise.all(
      images.map(async (file) => {
        const compressedFile = await imageCompression(file, compressionOptions);
        const imageRef = ref(storage, `services/id_${Date.now()}_${file.name}`);
        await uploadBytes(imageRef, compressedFile);
        return getDownloadURL(imageRef);
      })
    );
  };

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

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const addTimeSlot = () => {
    const today = getTodayDate();
    setTimeSlots([...timeSlots, { 
      startDate: today, 
      endDate: today, 
      startTime: "09:00", 
      endTime: "17:00",
      excludeDates: []
    }]);
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

  // Generate individual date slots from date ranges
  const generateDateSlots = () => {
    const dateSlots = [];
    
    timeSlots.forEach(slot => {
      const startDate = new Date(slot.startDate);
      const endDate = new Date(slot.endDate);
      const excludeDates = slot.excludeDates || [];
      
      // Generate slots for each date in the range, excluding specified dates
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Check global exclusions
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isExcludedWeekday = globalExclusions.excludeWeekdays.includes(dayOfWeek);
        const isGloballyExcludedDate = globalExclusions.excludeSpecificDates.includes(dateStr);
        
        // Skip if date is excluded by any rule
        if (excludeDates.includes(dateStr) || 
            (globalExclusions.excludeWeekends && isWeekend) ||
            isExcludedWeekday ||
            isGloballyExcludedDate) {
          continue;
        }
        
        // Generate time slots for this date, excluding global time ranges
        const timeSegments = generateTimeSegmentsForDate(slot.startTime, slot.endTime);
        
        timeSegments.forEach(segment => {
          dateSlots.push({
            date: dateStr,
            startTime: segment.startTime,
            endTime: segment.endTime
          });
        });
      }
    });
    
    return dateSlots;
  };

  // Generate time segments excluding global time exclusions
  const generateTimeSegmentsForDate = (slotStartTime, slotEndTime) => {
    const segments = [];
    const slotStart = timeToMinutes(slotStartTime);
    const slotEnd = timeToMinutes(slotEndTime);
    
    // Sort exclusions by start time
    const sortedExclusions = [...globalExclusions.excludeTimeRanges]
      .map(range => ({
        start: timeToMinutes(range.startTime),
        end: timeToMinutes(range.endTime)
      }))
      .sort((a, b) => a.start - b.start);
    
    let currentStart = slotStart;
    
    sortedExclusions.forEach(exclusion => {
      // If there's a gap before this exclusion, add a segment
      if (currentStart < exclusion.start && currentStart < slotEnd) {
        const segmentEnd = Math.min(exclusion.start, slotEnd);
        segments.push({
          startTime: minutesToTime(currentStart),
          endTime: minutesToTime(segmentEnd)
        });
      }
      // Move past this exclusion
      currentStart = Math.max(currentStart, exclusion.end);
    });
    
    // Add final segment if there's time left
    if (currentStart < slotEnd) {
      segments.push({
        startTime: minutesToTime(currentStart),
        endTime: minutesToTime(slotEnd)
      });
    }
    
    return segments.length > 0 ? segments : [{
      startTime: slotStartTime,
      endTime: slotEndTime
    }];
  };

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Check for overlapping time slots on the same date
  const hasOverlappingTimeSlots = () => {
    const dateSlots = generateDateSlots();
    
    // Group slots by date
    const slotsByDate = {};
    dateSlots.forEach(slot => {
      if (!slotsByDate[slot.date]) {
        slotsByDate[slot.date] = [];
      }
      slotsByDate[slot.date].push({
        start: timeToMinutes(slot.startTime),
        end: timeToMinutes(slot.endTime)
      });
    });
    
    // Check for overlaps within each date
    for (const date in slotsByDate) {
      const slots = slotsByDate[date].sort((a, b) => a.start - b.start);
      
      for (let i = 0; i < slots.length - 1; i++) {
        if (slots[i].end > slots[i + 1].start) {
          return true;
        }
      }
    }
    
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (hasOverlappingTimeSlots()) {
        setError("Overlapping time slots detected on the same date. Please fix them.");
        setLoading(false);
        return;
      }

      // Upload images
      const imageUrls = await uploadImages();

      // Validate required selects
      if (!selectedCategory || !selectedSubcategory || !selectedChildCategory) {
        setError("Please select category, subcategory, and child category.");
        setLoading(false);
        return;
      }

      // Generate individual date-time slots
      const dateTimeSlots = generateDateSlots();

      // Prepare payload, transform variants: convert stock to number
      const variantsPayload =
        formData.variants.length > 0
          ? formData.variants.map(({ name, hex, size, stock }) => ({
              name,
              hex,
              size,
              stock: Number(stock) || 0,
            }))
          : [];

      // Calculate total stock if variants exist
      const totalStock =
        variantsPayload.length > 0
          ? variantsPayload.reduce((acc, v) => acc + v.stock, 0)
          : Number(formData.stock) || 0;

      const payload = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : undefined,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        childCategory: selectedChildCategory,
        stock: totalStock,
        images: imageUrls,
        isPreorder: formData.isPreorder,
        priceType: formData.priceType,
        condition: formData.condition,
        warrentyMonths: Number(formData.warrentyMonths) || 0,
        variants: variantsPayload.length > 0 ? variantsPayload : undefined,
        timeSlots: dateTimeSlots, // Send individual date-time slots
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
      console.error(error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Create New Service
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Service Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Sample Service Name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="A detailed description of the service..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 resize-none"
                />
              </div>
            </div>

            {/* Price, Old Price, Stock, Is Preorder */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Price (LKR)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="2999.99"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Old Price (optional)
                </label>
                <input
                  type="number"
                  name="oldPrice"
                  value={formData.oldPrice}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="0.00"
                />
              </div>
            </div>
            {/* Category, Subcategory, Child Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={onCategoryChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Subcategory
                </label>
                <select
                  value={selectedSubcategory}
                  onChange={onSubcategoryChange}
                  required
                  disabled={!selectedCategory}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select a subcategory</option>
                  {categories
                    .find((cat) => cat.name === selectedCategory)
                    ?.subcategories.map((subcat) => (
                      <option key={subcat.name} value={subcat.name}>
                        {subcat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Child Category
                </label>
                <select
                  value={selectedChildCategory}
                  onChange={onChildCategoryChange}
                  required
                  disabled={!selectedSubcategory}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select a child category</option>
                  {categories
                    .find((cat) => cat.name === selectedCategory)
                    ?.subcategories.find(
                      (sub) => sub.name === selectedSubcategory
                    )
                    ?.childCategories.map((childCat) => (
                      <option key={childCat} value={childCat}>
                        {childCat}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Price Type, Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Price Type
                </label>
                <select
                  name="priceType"
                  value={formData.priceType}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select priceType</option>
                  <option value="fixed">Fixed Price</option>
                  <option value="hourly">Hourly Rate</option>
                </select>
                {formData.priceType === "hourly" && (
                  <p className="text-xs text-gray-500 mb-2">
                    {formData.price || "Price"} per hour (LKR)
                  </p>
                )}
              </div>
              {formData.priceType === "fixed" && (
                <div>
                  <label className="block text-sm font-medium mb-2">
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="60"
                  />
                </div>
              )}
            </div>

            {/* Global Exclusions */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Trash2 className="w-5 h-5" />
                <span>Global Exclusions (Apply to All Slots)</span>
              </h3>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> These exclusions will apply to all your time slots automatically. 
                  For example, if you exclude weekends, none of your slots will be available on Saturday or Sunday.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Day Exclusions */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Exclude Days</h4>
                  
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={globalExclusions.excludeWeekends}
                        onChange={(e) => setGlobalExclusions(prev => ({
                          ...prev,
                          excludeWeekends: e.target.checked
                        }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Exclude Weekends (Saturday & Sunday)</span>
                    </label>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Exclude specific weekdays:</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { day: 1, name: 'Monday' },
                          { day: 2, name: 'Tuesday' },
                          { day: 3, name: 'Wednesday' },
                          { day: 4, name: 'Thursday' },
                          { day: 5, name: 'Friday' }
                        ].map(({ day, name }) => (
                          <label key={day} className="flex items-center space-x-1">
                            <input
                              type="checkbox"
                              checked={globalExclusions.excludeWeekdays.includes(day)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setGlobalExclusions(prev => ({
                                    ...prev,
                                    excludeWeekdays: [...prev.excludeWeekdays, day]
                                  }));
                                } else {
                                  setGlobalExclusions(prev => ({
                                    ...prev,
                                    excludeWeekdays: prev.excludeWeekdays.filter(d => d !== day)
                                  }));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-xs">{name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Range Exclusions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Exclude Time Ranges</h4>
                    <button
                      type="button"
                      onClick={() => setGlobalExclusions(prev => ({
                        ...prev,
                        excludeTimeRanges: [...prev.excludeTimeRanges, { startTime: '12:00', endTime: '13:00' }]
                      }))}
                      className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                    >
                      Add Time Range
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {globalExclusions.excludeTimeRanges.map((range, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
                        <select
                          value={range.startTime}
                          onChange={(e) => {
                            const newRanges = [...globalExclusions.excludeTimeRanges];
                            newRanges[index].startTime = e.target.value;
                            setGlobalExclusions(prev => ({ ...prev, excludeTimeRanges: newRanges }));
                          }}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          {timeOptions.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                        <span className="text-sm text-gray-500">to</span>
                        <select
                          value={range.endTime}
                          onChange={(e) => {
                            const newRanges = [...globalExclusions.excludeTimeRanges];
                            newRanges[index].endTime = e.target.value;
                            setGlobalExclusions(prev => ({ ...prev, excludeTimeRanges: newRanges }));
                          }}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          {timeOptions.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const newRanges = globalExclusions.excludeTimeRanges.filter((_, i) => i !== index);
                            setGlobalExclusions(prev => ({ ...prev, excludeTimeRanges: newRanges }));
                          }}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    
                    {globalExclusions.excludeTimeRanges.length === 0 && (
                      <p className="text-sm text-gray-500 italic">No time ranges excluded</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Global Specific Dates */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Exclude Specific Dates (Holidays, etc.)</h4>
                  <input
                    type="date"
                    min={getTodayDate()}
                    onChange={(e) => {
                      if (e.target.value && !globalExclusions.excludeSpecificDates.includes(e.target.value)) {
                        setGlobalExclusions(prev => ({
                          ...prev,
                          excludeSpecificDates: [...prev.excludeSpecificDates, e.target.value]
                        }));
                        e.target.value = "";
                      }
                    }}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
                
                {globalExclusions.excludeSpecificDates.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {globalExclusions.excludeSpecificDates.map((date, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center bg-red-100 text-red-800 text-xs px-2 py-1 rounded"
                      >
                        {new Date(date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            setGlobalExclusions(prev => ({
                              ...prev,
                              excludeSpecificDates: prev.excludeSpecificDates.filter(d => d !== date)
                            }));
                          }}
                          className="ml-1 text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date and Time Slots */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Available Date & Time Slots</span>
                </h3>
                <button
                  type="button"
                  onClick={addTimeSlot}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Date & Time Slot</span>
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> You can select a date range and time slot. 
                  If you select multiple dates (e.g., Jan 1-5), it will create individual 
                  slots for each date with the same time. Customers can book your service 
                  only during the slots you specify here.
                </p>
              </div>

              {/* Preview All Generated Slots */}
              {timeSlots.length > 0 && (
                <div className="space-y-4">
                  {/* Compact Tag View */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h4 className="text-xs font-medium text-green-800 mb-2">
                      All Slots ({generateDateSlots().length} total)
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {generateDateSlots()
                        .sort((a, b) => new Date(a.date) - new Date(b.date) || a.startTime.localeCompare(b.startTime))
                        .map((slot, index) => (
                          <span
                            key={index}
                            className="inline-block bg-white border border-green-300 rounded px-2 py-1 text-xs text-green-700"
                          >
                            {new Date(slot.date).toLocaleDateString('en-US', {
                              month: 'numeric',
                              day: 'numeric'
                            })} {slot.startTime}-{slot.endTime}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Calendar View */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Calendar View</span>
                    </h4>
                    {(() => {
                      const slots = generateDateSlots();
                      const slotsByDate = {};
                      
                      // Group slots by date
                      slots.forEach(slot => {
                        if (!slotsByDate[slot.date]) {
                          slotsByDate[slot.date] = [];
                        }
                        slotsByDate[slot.date].push(slot);
                      });

                      // Get date range for calendar
                      const allDates = Object.keys(slotsByDate).sort();
                      if (allDates.length === 0) return <p className="text-blue-600 text-sm">No slots to display</p>;

                      const startDate = new Date(allDates[0]);
                      const endDate = new Date(allDates[allDates.length - 1]);
                      
                      // Create calendar months
                      const months = [];
                      const currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                      const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
                      
                      while (currentMonth <= lastMonth) {
                        months.push(new Date(currentMonth));
                        currentMonth.setMonth(currentMonth.getMonth() + 1);
                      }

                      return (
                        <div className="space-y-6">
                          {months.map((month, monthIndex) => {
                            const year = month.getFullYear();
                            const monthNum = month.getMonth();
                            const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                            
                            // Get first day of month and number of days
                            const firstDay = new Date(year, monthNum, 1);
                            const lastDay = new Date(year, monthNum + 1, 0);
                            const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
                            const daysInMonth = lastDay.getDate();
                            
                            // Create calendar grid
                            const calendarDays = [];
                            
                            // Add empty cells for days before month starts
                            for (let i = 0; i < startDayOfWeek; i++) {
                              calendarDays.push(<div key={`empty-${i}`} className="p-2"></div>);
                            }
                            
                            // Add days of the month
                            for (let day = 1; day <= daysInMonth; day++) {
                              const dateStr = `${year}-${(monthNum + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                              const daySlots = slotsByDate[dateStr] || [];
                              const hasSlots = daySlots.length > 0;
                              
                              calendarDays.push(
                                <div
                                  key={day}
                                  className={`p-2 border border-gray-200 min-h-[80px] ${
                                    hasSlots 
                                      ? 'bg-green-100 border-green-300' 
                                      : 'bg-gray-50'
                                  }`}
                                >
                                  <div className={`text-sm font-medium mb-1 ${
                                    hasSlots ? 'text-green-800' : 'text-gray-400'
                                  }`}>
                                    {day}
                                  </div>
                                  {hasSlots && (
                                    <div className="space-y-1">
                                      {daySlots.slice(0, 3).map((slot, slotIndex) => (
                                        <div
                                          key={slotIndex}
                                          className="bg-green-200 text-green-800 text-xs px-1 py-0.5 rounded truncate"
                                          title={`${slot.startTime}-${slot.endTime}`}
                                        >
                                          {slot.startTime}-{slot.endTime}
                                        </div>
                                      ))}
                                      {daySlots.length > 3 && (
                                        <div className="text-xs text-green-600">
                                          +{daySlots.length - 3} more
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            
                            return (
                              <div key={monthIndex} className="bg-white rounded border">
                                <h5 className="text-sm font-semibold text-gray-800 p-3 border-b bg-gray-50">
                                  {monthName}
                                </h5>
                                <div className="p-2">
                                  {/* Week day headers */}
                                  <div className="grid grid-cols-7 mb-2">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                      <div key={day} className="text-xs font-medium text-gray-600 text-center p-2">
                                        {day}
                                      </div>
                                    ))}
                                  </div>
                                  {/* Calendar grid */}
                                  <div className="grid grid-cols-7 gap-1">
                                    {calendarDays}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Legend */}
                          <div className="flex items-center space-x-4 text-xs">
                            <div className="flex items-center space-x-1">
                              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                              <span className="text-gray-600">Available</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></div>
                              <span className="text-gray-600">Not Available</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {timeSlots.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No date & time slots added yet</p>
                  <p className="text-sm text-gray-500">
                    Add date ranges and time slots to specify when your service is available
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timeSlots.map((slot, index) => (
                    <div key={index} className="bg-gray-50 p-6 rounded-lg border">
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Start Date</span>
                          </label>
                          <input
                            type="date"
                            value={slot.startDate}
                            min={getTodayDate()}
                            onChange={(e) =>
                              updateTimeSlot(index, "startDate", e.target.value)
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>End Date</span>
                          </label>
                          <input
                            type="date"
                            value={slot.endDate}
                            min={slot.startDate}
                            onChange={(e) =>
                              updateTimeSlot(index, "endDate", e.target.value)
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Start Time</span>
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
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>End Time</span>
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
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove</span>
                        </button>
                      </div>
                      
                      {/* Exclude Dates Section */}
                      {slot.startDate && slot.endDate && slot.startDate !== slot.endDate && (
                        <div className="mt-4 border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-gray-700">
                              Exclude Dates (Optional)
                            </label>
                            <input
                              type="date"
                              min={slot.startDate}
                              max={slot.endDate}
                              onChange={(e) => {
                                if (e.target.value && !slot.excludeDates?.includes(e.target.value)) {
                                  const newExcludeDates = [...(slot.excludeDates || []), e.target.value];
                                  updateTimeSlot(index, "excludeDates", newExcludeDates);
                                  e.target.value = ""; // Reset the input
                                }
                              }}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                              placeholder="Select date to exclude"
                            />
                          </div>
                          
                          {slot.excludeDates?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {slot.excludeDates.map((excludeDate, excludeIndex) => (
                                <span
                                  key={excludeIndex}
                                  className="inline-flex items-center bg-red-100 text-red-800 text-xs px-2 py-1 rounded"
                                >
                                  {new Date(excludeDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newExcludeDates = slot.excludeDates.filter(date => date !== excludeDate);
                                      updateTimeSlot(index, "excludeDates", newExcludeDates);
                                    }}
                                    className="ml-1 text-red-600 hover:text-red-800"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Preview of generated slots */}
                      {slot.startDate && slot.endDate && (
                        <div className="mt-4 p-3 bg-white rounded border">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            This will create {(() => {
                              const start = new Date(slot.startDate);
                              const end = new Date(slot.endDate);
                              const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                              const excludedDays = slot.excludeDates?.length || 0;
                              return totalDays - excludedDays;
                            })()} individual slots:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const slots = [];
                              const start = new Date(slot.startDate);
                              const end = new Date(slot.endDate);
                              const excludeDates = slot.excludeDates || [];
                              
                              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                                const dateStr = d.toISOString().split('T')[0];
                                if (!excludeDates.includes(dateStr)) {
                                  slots.push(
                                    <span key={dateStr} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                                      {d.toLocaleDateString()} {slot.startTime}-{slot.endTime}
                                    </span>
                                  );
                                }
                              }
                              return slots;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Service Images */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Service Images (up to 10)
              </label>
              <ImageUpload
                images={images}
                onImagesChange={setImages}
                maxImages={10}
                multiple
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-4 mt-8">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  "Create Service"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProduct;