// Delivery estimation utility for Sri Lankan provinces

const DELIVERY_TIMES = {
  // Same province - faster delivery
  same_province: {
    standard: { min: 1, max: 2 },
    express: { min: 1, max: 1 }
  },
  // Different province - slower delivery  
  different_province: {
    standard: { min: 3, max: 5 },
    express: { min: 2, max: 3 }
  }
};

const PROVINCES = {
  "Western": ["Colombo", "Gampaha", "Kalutara"],
  "Central": ["Kandy", "Matale", "Nuwara Eliya"], 
  "Southern": ["Galle", "Matara", "Hambantota"],
  "Northern": ["Jaffna", "Kilinochchi", "Mannar", "Mullaitivu", "Vavuniya"],
  "Eastern": ["Ampara", "Batticaloa", "Trincomalee"],
  "North Western": ["Kurunegala", "Puttalam"],
  "North Central": ["Anuradhapura", "Polonnaruwa"],
  "Uva": ["Badulla", "Monaragala"],
  "Sabaragamuwa": ["Ratnapura", "Kegalle"]
};

/**
 * Calculate estimated delivery date range for an order
 * @param {Object} options - Delivery calculation options
 * @param {string} options.customerProvince - Customer's province 
 * @param {string} options.storeProvince - Store's province
 * @param {string} options.shippingMethod - 'standard' or 'express'
 * @param {boolean} options.hasPreorderItems - Whether order contains preorder items
 * @param {number} options.storeProcessingDays - Additional processing days from store
 * @returns {Object} - Delivery estimation object
 */
export const calculateDeliveryEstimate = ({
  customerProvince = "Western",
  storeProvince = "Western", 
  shippingMethod = "standard",
  hasPreorderItems = false,
  storeProcessingDays = 0
}) => {
  try {
    // Determine if same province
    const isSameProvince = customerProvince === storeProvince;
    
    // Get base delivery times
    const deliveryCategory = isSameProvince ? 'same_province' : 'different_province';
    const baseTimes = DELIVERY_TIMES[deliveryCategory][shippingMethod] || DELIVERY_TIMES.different_province.standard;
    
    // Calculate additional delays
    let additionalDays = storeProcessingDays;
    
    // Add extra time for preorder items
    if (hasPreorderItems) {
      additionalDays += 2; // 2 extra days for preorder processing
    }
    
    // Calculate final delivery range
    const minDays = baseTimes.min + additionalDays;
    const maxDays = baseTimes.max + additionalDays;
    
    // Calculate actual dates (skip weekends if delivery falls on weekend)
    const estimatedMinDate = addBusinessDays(new Date(), minDays);
    const estimatedMaxDate = addBusinessDays(new Date(), maxDays);
    
    return {
      minDays,
      maxDays,
      estimatedMinDate,
      estimatedMaxDate,
      deliveryRange: formatDeliveryRange(estimatedMinDate, estimatedMaxDate),
      shippingMethod,
      isSameProvince,
      hasPreorderItems,
      additionalProcessingDays: additionalDays
    };
    
  } catch (error) {
    console.error("Error calculating delivery estimate:", error);
    
    // Fallback to standard estimate
    const fallbackDate = addBusinessDays(new Date(), 5);
    return {
      minDays: 3,
      maxDays: 5,
      estimatedMinDate: addBusinessDays(new Date(), 3),
      estimatedMaxDate: fallbackDate,
      deliveryRange: formatDeliveryRange(addBusinessDays(new Date(), 3), fallbackDate),
      shippingMethod: "standard",
      isSameProvince: false,
      hasPreorderItems: false,
      additionalProcessingDays: 0,
      error: "Using fallback estimate"
    };
  }
};

/**
 * Add business days to a date (skipping weekends)
 * @param {Date} date - Starting date
 * @param {number} businessDays - Number of business days to add
 * @returns {Date} - Resulting date
 */
const addBusinessDays = (date, businessDays) => {
  const result = new Date(date);
  let daysToAdd = businessDays;
  
  while (daysToAdd > 0) {
    result.setDate(result.getDate() + 1);
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      daysToAdd--;
    }
  }
  
  return result;
};

/**
 * Format delivery date range for display
 * @param {Date} minDate - Minimum delivery date
 * @param {Date} maxDate - Maximum delivery date  
 * @returns {string} - Formatted date range
 */
const formatDeliveryRange = (minDate, maxDate) => {
  const options = { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  
  const minFormatted = minDate.toLocaleDateString('en-US', options);
  const maxFormatted = maxDate.toLocaleDateString('en-US', options);
  
  // If same date, show single date
  if (minDate.toDateString() === maxDate.toDateString()) {
    return `Expected by ${minFormatted}`;
  }
  
  return `Expected between ${minFormatted} - ${maxFormatted}`;
};

/**
 * Get delivery estimate text for display
 * @param {Object} estimate - Delivery estimate object
 * @returns {string} - Human-readable delivery estimate
 */
export const getDeliveryEstimateText = (estimate) => {
  if (!estimate) return "Delivery estimate unavailable";
  
  const { deliveryRange, shippingMethod, isSameProvince, hasPreorderItems } = estimate;
  
  let text = deliveryRange;
  
  // Add additional context
  if (hasPreorderItems) {
    text += " (includes preorder processing time)";
  }
  
  if (shippingMethod === "express") {
    text += " - Express Delivery";
  }
  
  return text;
};

/**
 * Check if order contains preorder items
 * @param {Array} items - Order items array
 * @returns {boolean} - True if any item is preorder
 */
export const hasPreorderItems = (items = []) => {
  return items.some(item => 
    item.productId?.isPreorder || 
    item.isPreorder === true
  );
};

/**
 * Get province from city name (helper function)
 * @param {string} city - City name
 * @returns {string} - Province name or "Western" as default
 */
export const getProvinceFromCity = (city = "") => {
  if (!city) return "Western";
  
  for (const [province, cities] of Object.entries(PROVINCES)) {
    if (cities.some(c => c.toLowerCase().includes(city.toLowerCase()))) {
      return province;
    }
  }
  
  // Default to Western province (Colombo area)
  return "Western";
};

/**
 * Create delivery timeline for UI display
 * @param {Object} estimate - Delivery estimate object
 * @returns {Array} - Timeline steps array
 */
export const createDeliveryTimeline = (estimate) => {
  if (!estimate) return [];
  
  const today = new Date();
  const timeline = [];
  
  // Order confirmed (today)
  timeline.push({
    status: "completed",
    title: "Order Confirmed",
    description: "Your order has been confirmed and payment processed",
    date: today,
    icon: "check"
  });
  
  // Processing (next day or same day)
  const processingDate = addBusinessDays(today, estimate.additionalProcessingDays > 0 ? 1 : 0);
  timeline.push({
    status: estimate.additionalProcessingDays > 0 ? "pending" : "completed",
    title: "Processing",
    description: estimate.hasPreorderItems ? "Processing preorder items" : "Preparing your order",
    date: processingDate,
    icon: "package"
  });
  
  // Shipped
  const shippedDate = addBusinessDays(today, Math.max(1, estimate.additionalProcessingDays));
  timeline.push({
    status: "pending",
    title: "Shipped", 
    description: `Your order is on its way via ${estimate.shippingMethod} delivery`,
    date: shippedDate,
    icon: "truck"
  });
  
  // Delivered
  timeline.push({
    status: "pending",
    title: "Delivered",
    description: estimate.deliveryRange,
    date: estimate.estimatedMinDate,
    icon: "home"
  });
  
  return timeline;
};

export default {
  calculateDeliveryEstimate,
  getDeliveryEstimateText,
  hasPreorderItems,
  getProvinceFromCity,
  createDeliveryTimeline
};