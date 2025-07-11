// Currency utilities for LKR (Sri Lankan Rupees)

export const formatLKR = (amount) => {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatLKRCompact = (amount) => {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  
  if (amount >= 1000000) {
    return `LKR ${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `LKR ${(amount / 1000).toFixed(1)}K`;
  }
  
  return formatLKR(amount);
};

export const parseLKR = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  
  // Remove currency symbols and spaces
  const cleaned = value.replace(/[LKR\s,]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
};

export const validateLKRAmount = (amount) => {
  const parsed = parseLKR(amount);
  return {
    isValid: parsed >= 0 && parsed <= 10000000, // Max 10M LKR
    value: parsed,
    error: parsed < 0 ? 'Amount cannot be negative' : 
           parsed > 10000000 ? 'Amount cannot exceed LKR 10,000,000' : null
  };
};