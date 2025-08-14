import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ImageUpload from "../components/ImageUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase";
import { Plus, Trash2, Calendar, Clock, ArrowLeft, Info, Settings, X } from "lucide-react";

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

  // Generate 30-minute time options (only :00 and :30)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour < 22; hour++) {
      options.push(`${hour.toString().padStart(2, "0")}:00`);
      options.push(`${hour.toString().padStart(2, "0")}:30`);
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

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Generate 30-minute slots from time range
  const generateThirtyMinuteSlots = (startTime, endTime) => {
    const slots = [];
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      slots.push({
        startTime: minutesToTime(minutes),
        endTime: minutesToTime(minutes + 30)
      });
    }
    
    return slots;
  };

  // Check if a time slot overlaps with exclusion ranges
  const isSlotExcluded = (slotStart, slotEnd, exclusionRanges) => {
    const slotStartMinutes = timeToMinutes(slotStart);
    const slotEndMinutes = timeToMinutes(slotEnd);
    
    return exclusionRanges.some(range => {
      const excludeStart = timeToMinutes(range.startTime);
      const excludeEnd = timeToMinutes(range.endTime);
      
      // Check if slot overlaps with exclusion range
      return !(slotEndMinutes <= excludeStart || slotStartMinutes >= excludeEnd);
    });
  };

  // Generate all 30-minute date-time slots (including excluded ones)
  const generateAllThirtyMinuteSlots = () => {
    const allSlots = [];
    
    timeSlots.forEach(slot => {
      const startDate = new Date(slot.startDate);
      const endDate = new Date(slot.endDate);
      const excludeDates = slot.excludeDates || [];
      
      // Generate slots for each date in the range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Check if this date should be completely excluded
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isExcludedWeekday = globalExclusions.excludeWeekdays.includes(dayOfWeek);
        const isGloballyExcludedDate = globalExclusions.excludeSpecificDates.includes(dateStr);
        const isSlotExcludedDate = excludeDates.includes(dateStr);
        
        // Skip entire date if excluded by any rule
        if ((globalExclusions.excludeWeekends && isWeekend) ||
            isExcludedWeekday ||
            isGloballyExcludedDate ||
            isSlotExcludedDate) {
          continue;
        }
        
        // Generate 30-minute slots for this date
        const thirtyMinSlots = generateThirtyMinuteSlots(slot.startTime, slot.endTime);
        
        thirtyMinSlots.forEach(timeSlot => {
          // Check if this specific 30-min slot is excluded by global time ranges
          const isExcluded = isSlotExcluded(
            timeSlot.startTime, 
            timeSlot.endTime, 
            globalExclusions.excludeTimeRanges
          );
          
          allSlots.push({
            date: dateStr,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            excluded: isExcluded
          });
        });
      }
    });
    
    return allSlots;
  };

  // Group consecutive time slots for better display
  const groupConsecutiveSlots = (slots) => {
    if (!slots || slots.length === 0) return [];
    
    // Sort slots by date and time
    const sortedSlots = [...slots].sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
    
    const groupedByDate = {};
    
    // Group by date first
    sortedSlots.forEach(slot => {
      if (!groupedByDate[slot.date]) {
        groupedByDate[slot.date] = [];
      }
      groupedByDate[slot.date].push(slot);
    });
    
    // Group consecutive slots within each date
    const result = [];
    
    Object.keys(groupedByDate).forEach(date => {
      const dateSlots = groupedByDate[date];
      const groups = [];
      let currentGroup = [dateSlots[0]];
      
      for (let i = 1; i < dateSlots.length; i++) {
        const prevSlot = currentGroup[currentGroup.length - 1];
        const currentSlot = dateSlots[i];
        
        // Check if slots are consecutive (previous end time = current start time)
        if (prevSlot.endTime === currentSlot.startTime && 
            prevSlot.excluded === currentSlot.excluded) {
          currentGroup.push(currentSlot);
        } else {
          groups.push(currentGroup);
          currentGroup = [currentSlot];
        }
      }
      groups.push(currentGroup);
      
      // Format grouped slots
      groups.forEach(group => {
        const startTime = group[0].startTime;
        const endTime = group[group.length - 1].endTime;
        const excluded = group[0].excluded;
        
        result.push({
          date,
          startTime,
          endTime,
          excluded,
          slotCount: group.length
        });
      });
    });
    
    return result;
  };

  // Check for overlapping time slots on the same date (only non-excluded ones)
  const hasOverlappingTimeSlots = () => {
    const allSlots = generateAllThirtyMinuteSlots();
    const availableSlots = allSlots.filter(slot => !slot.excluded);
    
    // Group available slots by date
    const slotsByDate = {};
    availableSlots.forEach(slot => {
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

      // Generate all 30-minute date-time slots (including excluded ones)
      const thirtyMinuteSlots = generateAllThirtyMinuteSlots();

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
        timeSlots: thirtyMinuteSlots, // Send 30-minute slots with excluded flag
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm">
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-8 py-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900">Create New Service</h1>
            <p className="text-gray-600 mt-2">Set up your service with available time slots</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Basic Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      placeholder="e.g., Hair Cut & Styling"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>

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
                      placeholder="2500.00"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
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
                    placeholder="Describe your service in detail..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 resize-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                {/* Categories */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={onCategoryChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory *
                    </label>
                    <select
                      value={selectedSubcategory}
                      onChange={onSubcategoryChange}
                      required
                      disabled={!selectedCategory}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select subcategory</option>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Child Category *
                    </label>
                    <select
                      value={selectedChildCategory}
                      onChange={onChildCategoryChange}
                      required
                      disabled={!selectedSubcategory}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select child category</option>
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
              </div>

              {/* Availability Settings */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Settings className="w-6 h-6 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Availability Settings</h2>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Configure when your service is NOT available:</p>
                      <p className="text-blue-700">Set global exclusions that apply to all time slots, then add specific time periods when you're available.</p>
                    </div>
                  </div>
                </div>

                {/* Exclusion Tabs */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="border-b border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3">
                      {/* Day Exclusions */}
                      <div className="p-6 border-r border-gray-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <Calendar className="w-5 h-5 text-gray-600" />
                          <h3 className="font-medium text-gray-900">Day Exclusions</h3>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Quick Weekend Toggle */}
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={globalExclusions.excludeWeekends}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Add Saturday (6) and Sunday (0) to excludeWeekdays
                                  setGlobalExclusions(prev => ({
                                    ...prev,
                                    excludeWeekends: true,
                                    excludeWeekdays: [...new Set([...prev.excludeWeekdays, 0, 6])]
                                  }));
                                } else {
                                  // Remove Saturday and Sunday from excludeWeekdays
                                  setGlobalExclusions(prev => ({
                                    ...prev,
                                    excludeWeekends: false,
                                    excludeWeekdays: prev.excludeWeekdays.filter(d => d !== 0 && d !== 6)
                                  }));
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                            />
                            <span className="text-sm text-gray-700 font-medium">Exclude Weekends (Quick)</span>
                          </label>
                          
                          <div className="space-y-2">
                            <p className="text-xs text-gray-600 font-medium">Or Select Individual Days:</p>
                            <div className="space-y-2">
                              {[
                                { day: 1, name: 'Mon' },
                                { day: 2, name: 'Tue' },
                                { day: 3, name: 'Wed' },
                                { day: 4, name: 'Thu' },
                                { day: 5, name: 'Fri' },
                                { day: 6, name: 'Sat' },
                                { day: 0, name: 'Sun' }
                              ].map(({ day, name }) => (
                                <label key={day} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={globalExclusions.excludeWeekdays.includes(day)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setGlobalExclusions(prev => {
                                          const newExcludeWeekdays = [...prev.excludeWeekdays, day];
                                          // Check if both Saturday and Sunday are now selected
                                          const hasWeekends = newExcludeWeekdays.includes(0) && newExcludeWeekdays.includes(6);
                                          return {
                                            ...prev,
                                            excludeWeekdays: newExcludeWeekdays,
                                            excludeWeekends: hasWeekends
                                          };
                                        });
                                      } else {
                                        setGlobalExclusions(prev => {
                                          const newExcludeWeekdays = prev.excludeWeekdays.filter(d => d !== day);
                                          // Update excludeWeekends if removing Saturday or Sunday
                                          const hasWeekends = newExcludeWeekdays.includes(0) && newExcludeWeekdays.includes(6);
                                          return {
                                            ...prev,
                                            excludeWeekdays: newExcludeWeekdays,
                                            excludeWeekends: hasWeekends
                                          };
                                        });
                                      }
                                    }}
                                    className="w-3 h-3 rounded border-gray-300 text-black focus:ring-black"
                                  />
                                  <span className={`text-xs ${(day === 0 || day === 6) ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                                    {name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Time Exclusions */}
                      <div className="p-6 border-r border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <Clock className="w-5 h-5 text-gray-600" />
                            <h3 className="font-medium text-gray-900">Time Exclusions</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setGlobalExclusions(prev => ({
                              ...prev,
                              excludeTimeRanges: [...prev.excludeTimeRanges, { startTime: '12:00', endTime: '13:00' }]
                            }))}
                            className="text-black hover:text-gray-700 p-1"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-3 max-h-40 overflow-y-auto">
                          {globalExclusions.excludeTimeRanges.map((range, index) => (
                            <div key={index} className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <select
                                  value={range.startTime}
                                  onChange={(e) => {
                                    const newRanges = [...globalExclusions.excludeTimeRanges];
                                    newRanges[index].startTime = e.target.value;
                                    setGlobalExclusions(prev => ({ ...prev, excludeTimeRanges: newRanges }));
                                  }}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-black focus:border-transparent"
                                >
                                  {timeOptions.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                  ))}
                                </select>
                                <span className="text-xs text-gray-500">to</span>
                                <select
                                  value={range.endTime}
                                  onChange={(e) => {
                                    const newRanges = [...globalExclusions.excludeTimeRanges];
                                    newRanges[index].endTime = e.target.value;
                                    setGlobalExclusions(prev => ({ ...prev, excludeTimeRanges: newRanges }));
                                  }}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-black focus:border-transparent"
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
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          {globalExclusions.excludeTimeRanges.length === 0 && (
                            <p className="text-xs text-gray-500 italic">No time ranges excluded</p>
                          )}
                        </div>
                      </div>

                      {/* Date Exclusions */}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <Calendar className="w-5 h-5 text-gray-600" />
                            <h3 className="font-medium text-gray-900">Date Exclusions</h3>
                          </div>
                          <input
                            type="date"
                            min={getTodayDate()}
                            onChange={(e) => {
                              const selectedDate = e.target.value;
                              if (selectedDate && selectedDate !== '' && !globalExclusions.excludeSpecificDates.includes(selectedDate)) {
                                setGlobalExclusions(prev => ({
                                  ...prev,
                                  excludeSpecificDates: [...prev.excludeSpecificDates, selectedDate]
                                }));
                                // Clear the input value immediately
                                e.target.value = '';
                              }
                            }}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-black focus:border-transparent"
                            placeholder="Select date"
                          />
                        </div>
                        
                        <div className="max-h-40 overflow-y-auto">
                          {globalExclusions.excludeSpecificDates.length > 0 ? (
                            <div className="space-y-2">
                              {globalExclusions.excludeSpecificDates.map((date, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between bg-gray-50 border border-gray-200 text-gray-800 text-xs px-3 py-2 rounded-lg"
                                >
                                  <span>
                                    {new Date(date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGlobalExclusions(prev => ({
                                        ...prev,
                                        excludeSpecificDates: prev.excludeSpecificDates.filter(d => d !== date)
                                      }));
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 italic">No specific dates excluded</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Available Time Slots */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-6 h-6 text-gray-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Available Time Slots</h2>
                  </div>
                  <button
                    type="button"
                    onClick={addTimeSlot}
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Time Slot</span>
                  </button>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium mb-1">How Time Slots Work:</p>
                      <ul className="space-y-1 text-green-700">
                        <li>• All slots are automatically divided into 30-minute segments</li>
                        <li>• Select date ranges and times when your service is available</li>
                        <li>• Times must be in 30-minute intervals (9:00, 9:30, 10:00, etc.)</li>
                        <li>• Customers can book individual 30-minute slots</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Preview All Generated Slots */}
                {timeSlots.length > 0 && (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Slot Summary</span>
                      </h4>
                      {(() => {
                        const allSlots = generateAllThirtyMinuteSlots();
                        const availableSlots = allSlots.filter(slot => !slot.excluded);
                        const excludedSlots = allSlots.filter(slot => slot.excluded);
                        
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="text-2xl font-bold text-green-800">{availableSlots.length}</div>
                              <div className="text-sm text-green-700">Available Slots</div>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="text-2xl font-bold text-red-800">{excludedSlots.length}</div>
                              <div className="text-sm text-red-700">Excluded Slots</div>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <div className="text-2xl font-bold text-gray-800">{allSlots.length}</div>
                              <div className="text-sm text-gray-700">Total Slots</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Grouped Slots Preview */}
                    {(() => {
                      const allSlots = generateAllThirtyMinuteSlots();
                      const availableSlots = allSlots.filter(slot => !slot.excluded);
                      const excludedSlots = allSlots.filter(slot => slot.excluded);
                      const groupedAvailable = groupConsecutiveSlots(availableSlots);
                      const groupedExcluded = groupConsecutiveSlots(excludedSlots);
                      
                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Available Slots */}
                          {groupedAvailable.length > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-green-800 mb-3 flex items-center justify-between">
                                <span>Available Time Ranges</span>
                                <span className="text-xs bg-green-100 px-2 py-1 rounded">
                                  {availableSlots.length} total slots
                                </span>
                              </h4>
                              <div className="max-h-48 overflow-y-auto space-y-2">
                                {groupedAvailable
                                  .sort((a, b) => new Date(a.date) - new Date(b.date) || timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
                                  .map((slot, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between bg-white border border-green-300 rounded-lg px-3 py-2"
                                    >
                                      <div className="text-sm text-green-700">
                                        <span className="font-medium">
                                          {new Date(slot.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                          })}
                                        </span>
                                        <span className="ml-2">
                                          {slot.startTime} - {slot.endTime}
                                        </span>
                                      </div>
                                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                        {slot.slotCount} slots
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Excluded Slots */}
                          {groupedExcluded.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-red-800 mb-3 flex items-center justify-between">
                                <span>Excluded Time Ranges</span>
                                <span className="text-xs bg-red-100 px-2 py-1 rounded">
                                  {excludedSlots.length} total slots
                                </span>
                              </h4>
                              <div className="max-h-48 overflow-y-auto space-y-2">
                                {groupedExcluded
                                  .sort((a, b) => new Date(a.date) - new Date(b.date) || timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
                                  .map((slot, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between bg-white border border-red-300 rounded-lg px-3 py-2"
                                    >
                                      <div className="text-sm text-red-700">
                                        <span className="font-medium">
                                          {new Date(slot.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                          })}
                                        </span>
                                        <span className="ml-2">
                                          {slot.startTime} - {slot.endTime}
                                        </span>
                                      </div>
                                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                        {slot.slotCount} slots
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {timeSlots.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Time Slots Added</h3>
                    <p className="text-gray-600 mb-4">Add date ranges and time slots to specify when your service is available</p>
                    <button
                      type="button"
                      onClick={addTimeSlot}
                      className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Add Your First Time Slot
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {timeSlots.map((slot, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                            <Clock className="w-5 h-5 text-gray-600" />
                            <span>Time Slot {index + 1}</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(index)}
                            className="bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100 transition-colors flex items-center space-x-1 border border-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm">Remove</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Start Date *
                            </label>
                            <input
                              type="date"
                              value={slot.startDate}
                              min={getTodayDate()}
                              onChange={(e) =>
                                updateTimeSlot(index, "startDate", e.target.value)
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              End Date *
                            </label>
                            <input
                              type="date"
                              value={slot.endDate}
                              min={slot.startDate}
                              onChange={(e) =>
                                updateTimeSlot(index, "endDate", e.target.value)
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Start Time *
                            </label>
                            <select
                              value={slot.startTime}
                              onChange={(e) =>
                                updateTimeSlot(index, "startTime", e.target.value)
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent"
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
                              End Time *
                            </label>
                            <select
                              value={slot.endTime}
                              onChange={(e) =>
                                updateTimeSlot(index, "endTime", e.target.value)
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent"
                            >
                              {timeOptions.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        {/* Exclude Dates Section */}
                        {slot.startDate && slot.endDate && slot.startDate !== slot.endDate && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <label className="text-sm font-medium text-gray-700">
                                Exclude Specific Dates (Optional)
                              </label>
                              <input
                                type="date"
                                min={slot.startDate}
                                max={slot.endDate}
                                onChange={(e) => {
                                  const selectedDate = e.target.value;
                                  if (selectedDate && selectedDate !== '' && !slot.excludeDates?.includes(selectedDate)) {
                                    const newExcludeDates = [...(slot.excludeDates || []), selectedDate];
                                    updateTimeSlot(index, "excludeDates", newExcludeDates);
                                    // Clear the input value immediately
                                    e.target.value = '';
                                  }
                                }}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                                placeholder="Select date to exclude"
                              />
                            </div>
                            
                            {slot.excludeDates?.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {slot.excludeDates.map((excludeDate, excludeIndex) => (
                                  <span
                                    key={excludeIndex}
                                    className="inline-flex items-center bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-lg border border-gray-300"
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
                                      className="ml-2 text-gray-600 hover:text-red-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Individual Slot Preview */}
                        {slot.startDate && slot.endDate && (
                          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-3">
                              This Slot Preview:
                            </p>
                            {(() => {
                              const slotPreview = [];
                              const start = new Date(slot.startDate);
                              const end = new Date(slot.endDate);
                              const excludeDates = slot.excludeDates || [];
                              
                              let totalSlots = 0;
                              let availableSlots = 0;
                              
                              // Generate preview by date
                              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                                const dateStr = d.toISOString().split('T')[0];
                                const dayOfWeek = d.getDay();
                                
                                // Check if date is excluded
                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                const isExcludedWeekday = globalExclusions.excludeWeekdays.includes(dayOfWeek);
                                const isGloballyExcludedDate = globalExclusions.excludeSpecificDates.includes(dateStr);
                                const isSlotExcludedDate = excludeDates.includes(dateStr);
                                
                                if ((globalExclusions.excludeWeekends && isWeekend) ||
                                    isExcludedWeekday ||
                                    isGloballyExcludedDate ||
                                    isSlotExcludedDate) {
                                  continue; // Skip this date entirely
                                }
                                
                                const daySlots = generateThirtyMinuteSlots(slot.startTime, slot.endTime);
                                const dayAvailableSlots = [];
                                const dayExcludedSlots = [];
                                
                                daySlots.forEach(timeSlot => {
                                  totalSlots++;
                                  const isExcluded = isSlotExcluded(
                                    timeSlot.startTime, 
                                    timeSlot.endTime, 
                                    globalExclusions.excludeTimeRanges
                                  );
                                  
                                  if (isExcluded) {
                                    dayExcludedSlots.push(timeSlot);
                                  } else {
                                    dayAvailableSlots.push(timeSlot);
                                    availableSlots++;
                                  }
                                });
                                
                                // Group consecutive slots for this date
                                const groupedAvailable = groupConsecutiveSlots(
                                  dayAvailableSlots.map(ts => ({
                                    date: dateStr,
                                    startTime: ts.startTime,
                                    endTime: ts.endTime,
                                    excluded: false
                                  }))
                                );
                                
                                const groupedExcluded = groupConsecutiveSlots(
                                  dayExcludedSlots.map(ts => ({
                                    date: dateStr,
                                    startTime: ts.startTime,
                                    endTime: ts.endTime,
                                    excluded: true
                                  }))
                                );
                                
                                if (groupedAvailable.length > 0 || groupedExcluded.length > 0) {
                                  slotPreview.push(
                                    <div key={dateStr} className="text-xs">
                                      <div className="font-medium text-gray-800 mb-1">
                                        {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                                      </div>
                                      <div className="ml-2 space-y-1">
                                        {groupedAvailable.map((group, gIndex) => (
                                          <div key={`available-${gIndex}`} className="text-green-700">
                                            ✓ {group.startTime} - {group.endTime} 
                                            <span className="text-green-600 ml-1">({group.slotCount} slots)</span>
                                          </div>
                                        ))}
                                        {groupedExcluded.map((group, gIndex) => (
                                          <div key={`excluded-${gIndex}`} className="text-red-600">
                                            ✗ {group.startTime} - {group.endTime} 
                                            <span className="text-red-500 ml-1">({group.slotCount} slots excluded)</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }
                              }
                              
                              return (
                                <div className="space-y-3">
                                  <div className="flex space-x-4 text-sm">
                                    <span className="text-green-700 font-medium">
                                      {availableSlots} Available
                                    </span>
                                    <span className="text-red-700 font-medium">
                                      {totalSlots - availableSlots} Excluded
                                    </span>
                                    <span className="text-gray-700 font-medium">
                                      {totalSlots} Total
                                    </span>
                                  </div>
                                  {slotPreview.length > 0 ? (
                                    <div className="max-h-32 overflow-y-auto space-y-2 border-t border-gray-200 pt-2">
                                      {slotPreview}
                                    </div>
                                  ) : (
                                    <div className="text-gray-500 text-xs italic border-t border-gray-200 pt-2">
                                      No available slots for this time range
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Service Images */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Service Images
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Images (up to 10)
                  </label>
                  <ImageUpload
                    images={images}
                    onImagesChange={setImages}
                    maxImages={10}
                    multiple
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Creating Service...</span>
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
    </div>
  );
};

export default CreateProduct;