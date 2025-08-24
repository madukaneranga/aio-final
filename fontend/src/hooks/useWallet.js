import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { walletAPI, contactRevealAPI } from '../utils/api';

export const useWallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [settings, setSettings] = useState(null);
  const [credits, setCredits] = useState(null);
  const [creditPackages, setCreditPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await walletAPI.getSummary();
      setSummary(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const fetchWalletDetails = useCallback(async () => {
    try {
      const response = await walletAPI.getDetails();
      setWallet(response.data);
      setSettings(response.data.settings);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const fetchTransactions = useCallback(async (filters = {}) => {
    try {
      const response = await walletAPI.getTransactions(filters);
      setTransactions(response.data.transactions);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const fetchAnalytics = useCallback(async (period = 'month') => {
    try {
      const response = await walletAPI.getAnalytics(period);
      setAnalytics(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const fetchCredits = useCallback(async (page = 1, limit = 10) => {
    try {
      const response = await walletAPI.getCredits(page, limit);
      setCredits(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const fetchCreditPackages = useCallback(async () => {
    try {
      const response = await walletAPI.getCreditPackages();
      setCreditPackages(response.data.packages || []);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const purchaseCredits = async (packageId) => {
    try {
      const response = await walletAPI.purchaseCredits(packageId);
      // Refresh wallet data after credit purchase
      await Promise.all([
        fetchSummary(),
        fetchWalletDetails(),
        fetchCredits(),
        fetchCreditPackages()
      ]);
      return response;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Credit purchase failed');
    }
  };

  const requestWithdrawal = async (amount, bankAccountId) => {
    try {
      const response = await walletAPI.requestWithdrawal({ amount, bankAccountId });
      // Refresh all wallet data after withdrawal request
      await Promise.all([
        fetchSummary(),
        fetchWalletDetails(),
        fetchTransactions()
      ]);
      return response;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Withdrawal request failed');
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const response = await walletAPI.updateSettings(newSettings);
      setSettings(response.data);
      // Refresh wallet details to get updated settings
      await fetchWalletDetails();
      return response;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Settings update failed');
    }
  };

  const refreshWalletData = useCallback(async () => {
    // Only fetch wallet data for store owners
    if (!user || user.role !== 'store_owner') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchSummary(),
        fetchWalletDetails(),
        fetchTransactions(),
        fetchAnalytics(),
        fetchCredits(),
        fetchCreditPackages()
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, fetchSummary, fetchWalletDetails, fetchTransactions, fetchAnalytics, fetchCredits, fetchCreditPackages]);

  // Contact reveal methods
  const canRevealContact = async (storeId) => {
    try {
      const response = await contactRevealAPI.canReveal(storeId);
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to check reveal eligibility');
    }
  };

  const revealContact = async (storeId, recaptchaToken = null) => {
    try {
      const response = await contactRevealAPI.revealContact(storeId, recaptchaToken);
      // Refresh wallet data after credit usage
      await Promise.all([
        fetchSummary(),
        fetchWalletDetails(),
        fetchCredits()
      ]);
      return response;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Contact reveal failed');
    }
  };

  const getMyReveals = async (page = 1, limit = 10) => {
    try {
      const response = await contactRevealAPI.getMyReveals(page, limit);
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to fetch reveal history');
    }
  };

  useEffect(() => {
    if (user && user.role === 'store_owner') {
      refreshWalletData();
    } else {
      // Clear wallet data for non-store owners
      setWallet(null);
      setSummary(null);
      setTransactions([]);
      setAnalytics(null);
      setSettings(null);
      setCredits(null);
      setCreditPackages([]);
      setError(null);
      setLoading(false);
    }
  }, [user, refreshWalletData]);

  // Derived state for easy access
  const canWithdraw = wallet?.canWithdraw || false;
  const monthlyGrowth = wallet?.monthlyGrowth || 0;
  const walletStatus = wallet?.metadata?.walletStatus || 'active';

  return {
    // Core wallet data
    wallet,
    summary,
    transactions,
    analytics,
    settings,
    credits,
    creditPackages,
    
    // Loading states
    loading,
    error,
    
    // Computed values
    canWithdraw,
    monthlyGrowth,
    walletStatus,
    
    // Wallet actions
    fetchSummary,
    fetchWalletDetails,
    fetchTransactions,
    fetchAnalytics,
    requestWithdrawal,
    updateSettings,
    refreshWalletData,
    
    // Credit actions
    fetchCredits,
    fetchCreditPackages,
    purchaseCredits,
    
    // Contact reveal actions
    canRevealContact,
    revealContact,
    getMyReveals,
    
    // Utility functions
    clearError: () => setError(null),
    setError,
  };
};