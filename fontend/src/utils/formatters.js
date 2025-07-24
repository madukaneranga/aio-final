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
    processing: 'text-purple-600 bg-purple-50'
  };
  return colors[status] || 'text-gray-600 bg-gray-50';
};