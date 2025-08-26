export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getTransactionTypeColor = (type) => {
  const colors = {
    sale: 'text-green-600 bg-green-50',
    withdrawal: 'text-red-600 bg-red-50',
    refund: 'text-orange-600 bg-orange-50',
    adjustment: 'text-blue-600 bg-blue-50'
  };
  return colors[type] || 'text-gray-600 bg-gray-50';
};

export const getStatusColor = (status) => {
  const colors = {
    completed: 'text-green-600 bg-green-50',
    pending: 'text-yellow-600 bg-yellow-50',
    approved: 'text-blue-600 bg-blue-50',
    rejected: 'text-red-600 bg-red-50',
    processing: 'text-purple-600 bg-purple-50',
    active: 'text-green-600 bg-green-50',
    inactive: 'text-red-600 bg-red-50',
    cancelled: 'text-gray-600 bg-gray-50'
  };
  return colors[status] || 'text-gray-600 bg-gray-50';
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return formatDate(dateString);
  } catch (error) {
    return 'N/A';
  }
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatNumber = (number, options = {}) => {
  if (number === null || number === undefined || isNaN(number)) return 'N/A';
  
  const {
    notation = 'standard',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
  } = options;
  
  return new Intl.NumberFormat('en-US', {
    notation,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(number);
};

export const formatPercentage = (value, total) => {
  if (!value || !total || total === 0) return '0%';
  
  const percentage = (value / total) * 100;
  return `${Math.round(percentage * 10) / 10}%`;
};

export const truncateText = (text, maxLength = 50) => {
  if (!text || typeof text !== 'string') return 'N/A';
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + '...';
};

export const capitalizeFirstLetter = (string) => {
  if (!string || typeof string !== 'string') return '';
  
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const formatStatus = (status) => {
  if (!status) return 'Unknown';
  
  return status.split('_')
    .map(word => capitalizeFirstLetter(word))
    .join(' ');
};

export const formatArrayDisplay = (array, maxItems = 3) => {
  if (!Array.isArray(array) || array.length === 0) return 'None';
  
  if (array.length <= maxItems) {
    return array.join(', ');
  }
  
  const displayed = array.slice(0, maxItems);
  const remaining = array.length - maxItems;
  
  return `${displayed.join(', ')} and ${remaining} more`;
};

export const formatObjectDisplay = (obj, key = 'name') => {
  if (!obj || typeof obj !== 'object') return 'N/A';
  
  if (obj[key]) return obj[key];
  if (obj.title) return obj.title;
  if (obj.label) return obj.label;
  if (obj._id) return obj._id;
  
  return 'Unknown';
};