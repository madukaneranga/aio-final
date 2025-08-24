import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getAuthHeaders = () => {
  return {
    "Content-Type": "application/json",
  };
};

const handleResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }

  return data;
};

// Customer-specific wallet API
const customerWalletAPI = {
  getCredits: async () => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/customer/credits`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getRevealEligibility: async (storeId) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/customer/reveals/${storeId}/eligibility`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  revealContact: async (storeId) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/customer/reveals/${storeId}`, {
      method: 'POST',
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getRevealHistory: async (page = 1, limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/customer/reveals?page=${page}&limit=${limit}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

export const useCustomerWallet = () => {
  const { user } = useAuth();
  const [customerData, setCustomerData] = useState({
    credits: { balance: 0, totalPurchased: 0, totalSpent: 0 },
    availableBalance: 0,
  });
  const [revealHistory, setRevealHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch customer credit balance
  const fetchCredits = useCallback(async () => {
    if (!user || user.role !== 'customer') return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await customerWalletAPI.getCredits();
      if (response.success) {
        setCustomerData(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch customer credits:', err);
      setError(err.message || 'Failed to load credits');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check if customer can reveal contact for a specific store
  const canRevealContact = useCallback(async (storeId) => {
    if (!user || user.role !== 'customer') {
      return { canReveal: false, reasons: { notCustomer: true } };
    }

    try {
      const response = await customerWalletAPI.getRevealEligibility(storeId);
      if (response.success) {
        return {
          canReveal: response.data.canReveal,
          reasons: response.data.reasons,
          requiredCredits: response.data.requiredCredits,
          customerCredits: response.data.customerCredits,
          customerWalletBalance: response.data.customerWalletBalance,
        };
      }
    } catch (err) {
      console.error('Failed to check reveal eligibility:', err);
      return { 
        canReveal: false, 
        reasons: { error: err.message || 'Check failed' } 
      };
    }
  }, [user]);

  // Perform contact reveal
  const revealContact = useCallback(async (storeId) => {
    if (!user || user.role !== 'customer') {
      throw new Error('Only customers can reveal contact details');
    }

    try {
      const response = await customerWalletAPI.revealContact(storeId);
      if (response.success) {
        // Update local credits balance after successful reveal
        setCustomerData(prev => ({
          ...prev,
          credits: {
            ...prev.credits,
            balance: response.data.remainingCredits
          }
        }));

        return {
          success: true,
          data: {
            contactDetails: response.data.contactDetails,
            creditsUsed: response.data.creditsUsed,
            remainingCredits: response.data.remainingCredits,
            revealId: response.data.revealId,
          }
        };
      }
    } catch (err) {
      console.error('Failed to reveal contact:', err);
      
      // Handle specific error codes from backend
      if (err.message.includes('INSUFFICIENT_CREDITS')) {
        throw new Error('Insufficient credits to reveal contact details');
      } else if (err.message.includes('ALREADY_REVEALED')) {
        throw new Error('Contact already revealed for this store today');
      } else {
        throw new Error(err.message || 'Failed to reveal contact');
      }
    }
  }, [user]);

  // Get customer's reveal history
  const fetchRevealHistory = useCallback(async (page = 1, limit = 10) => {
    if (!user || user.role !== 'customer') return;

    try {
      setLoading(true);
      const response = await customerWalletAPI.getRevealHistory(page, limit);
      if (response.success) {
        setRevealHistory(response.data.reveals);
        return response.data;
      }
    } catch (err) {
      console.error('Failed to fetch reveal history:', err);
      setError(err.message || 'Failed to load reveal history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load when component mounts or user changes
  useEffect(() => {
    if (user && user.role === 'customer') {
      fetchCredits();
    } else {
      // Clear data for non-customers
      setCustomerData({
        credits: { balance: 0, totalPurchased: 0, totalSpent: 0 },
        availableBalance: 0,
      });
      setRevealHistory([]);
      setError(null);
    }
  }, [user, fetchCredits]);

  return {
    // Data
    customerData,
    revealHistory,
    loading,
    error,
    
    // Actions
    fetchCredits,
    canRevealContact,
    revealContact,
    fetchRevealHistory,
    
    // Computed values
    hasCredits: customerData.credits.balance > 0,
    canPurchaseCredits: customerData.availableBalance >= 1000, // Minimum package price
  };
};

export default useCustomerWallet;