
import {
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Linkedin,
  MessageCircle, // WhatsApp
  Send, // Telegram
  Camera, // Snapchat
  Music, // TikTok
  Hash, // Pinterest (using Hash as placeholder)
  Globe, // Website
  Phone, // Viber
  Zap, // Discord
  Github,
  Twitch,

} from "lucide-react";

// Format currency
export const formatCurrency = (amount, currency = 'LKR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Format date
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format date and time
export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Truncate text
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Generate time slots
export const generateTimeSlots = (startHour = 9, endHour = 17, interval = 60) => {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (interval === 30) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  return slots;
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone
export const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

// Get file extension
export const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

// Check if file is image
export const isImageFile = (file) => {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const extension = getFileExtension(file.name).toLowerCase();
  return imageTypes.includes(extension);
};

// Calculate store amount (no platform fee)
export const calculateStoreAmount = (amount) => {
  return amount;
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Local storage helpers
export const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error getting from localStorage:', error);
      return null;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting to localStorage:', error);
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }
};

// Image URL helper
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${import.meta.env.VITE_API_URL}${imagePath}`;
};

// Default images
export const defaultImages = {
  product: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
  service: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop',
  store: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
  user: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'

};

//violations  check
export const getUsageViolations = (usage, newLimits) => {
  const violations = {};

  if (usage.products?.count > newLimits.items) {
    violations.violatedProducts = usage.products.count - newLimits.items;
  }

  if (usage.services?.count > newLimits.items) {
    violations.violatedServices = usage.services.count - newLimits.items;
  }

  if (usage.products?.images > newLimits.itemImages) {
    violations.violatedProductImages = usage.products.images - newLimits.itemImages;
  }

  if (usage.services?.images > newLimits.itemImages) {
    violations.violatedServiceImages = usage.services.images - newLimits.itemImages;
  }

  if (usage.headerImages?.count > newLimits.headerImages) {
    violations.violatedHeaderImages = usage.headerImages.count - newLimits.headerImages;
  }

  if (usage.variants?.used && !newLimits.itemVariants) {
    violations.violatedVariants = true;
  }

  return violations;
};


export const extractSocialInfo = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;

    // Instagram
    if (hostname.includes('instagram.com')) {
      const username = pathname.split('/')[1];
      return { platform: 'instagram', username };
    }
    
    // Twitter/X
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      const username = pathname.split('/')[1];
      return { platform: 'twitter', username };
    }
    
    // Facebook
    if (hostname.includes('facebook.com')) {
      const username = pathname.split('/')[1];
      return { platform: 'facebook', username };
    }
    
    // YouTube
    if (hostname.includes('youtube.com')) {
      const username = pathname.replace('/@', '').replace('/', '');
      return { platform: 'youtube', username };
    }
    
    // TikTok
    if (hostname.includes('tiktok.com')) {
      const username = pathname.replace('/@', '').replace('/', '');
      return { platform: 'tiktok', username };
    }
    
    // WhatsApp
    if (hostname.includes('wa.me')) {
      const phone = pathname.replace('/', '');
      return { platform: 'whatsapp', username: phone };
    }
    
    // Snapchat
    if (hostname.includes('snapchat.com')) {
      const username = pathname.replace('/add/', '');
      return { platform: 'snapchat', username };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing URL:', url, error);
    return null;
  }

};
