import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { walletAPI } from '../utils/api';

export const useWallet = () => {
  const { user } = useAuth();
  const refreshIntervalRef = useRef(null);
  
  // Wallet Summary State
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState(null);
  
  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState(null);
  const [transactionsPagination, setTransactionsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false
  });
  
  // Bank Details State
  const [bankDetails, setBankDetails] = useState([]);
  const [bankDetailsLoading, setBankDetailsLoading] = useState(false);
  const [bankDetailsError, setBankDetailsError] = useState(null);
  
  // Settings State
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  
  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  
  // Operation States
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [bankDetailsSubmitting, setBankDetailsSubmitting] = useState(false);
  const [settingsUpdating, setSettingsUpdating] = useState(false);

  // Utility function to handle API errors
  const handleError = useCallback((error, setter) => {
    console.error('Wallet API Error:', error);
    
    let errorMessage = 'An unexpected error occurred';
    
    // Handle different types of errors
    if (error?.response) {
      // Server responded with an error status
      errorMessage = error.response.data?.error || error.response.data?.message || 'Server error occurred';
    } else if (error?.request) {
      // Request was made but no response received
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error?.message) {
      // Something else happened
      errorMessage = error.message;
    }
    
    setter(errorMessage);
    
    // You can add additional error reporting here (e.g., to monitoring service)
    // sendErrorToMonitoring(error);
  }, []);

  // Format currency utility
  const formatCurrency = useCallback((amount) => {
    if (amount === null || amount === undefined) return '0.00';
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  }, []);

  // Get transaction status color
  const getTransactionStatusColor = useCallback((status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  // Check if user can withdraw
  const canWithdraw = useMemo(() => {
    if (!wallet) return false;
    
    const hasBalance = wallet.balance?.availableBalance > 0;
    const withinLimit = (wallet.withdrawalInfo?.monthlyWithdrawals || 0) < (wallet.withdrawalInfo?.monthlyLimit || 0);
    const isActive = wallet.metadata?.walletStatus === 'active';
    const hasBankDetails = bankDetails && bankDetails.length > 0;
    
    return hasBalance && withinLimit && isActive && hasBankDetails;
  }, [wallet, bankDetails]);

  // Fetch wallet summary with retry mechanism
  const fetchWalletSummary = useCallback(async (retryCount = 0) => {
    if (!user) return;
    
    try {
      setWalletLoading(true);
      setWalletError(null);
      const response = await walletAPI.getSummary();
      setWallet(response.data);
    } catch (error) {
      // Retry logic for network errors
      if (retryCount < 2 && (error?.request || error?.code === 'NETWORK_ERROR')) {
        console.log(`Retrying wallet summary fetch (attempt ${retryCount + 1})`);
        setTimeout(() => fetchWalletSummary(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      handleError(error, setWalletError);
    } finally {
      setWalletLoading(false);
    }
  }, [user, handleError]);

  // Fetch transactions with pagination and filters
  const fetchTransactions = useCallback(async (params = {}) => {
    if (!user) return;
    
    try {
      setTransactionsLoading(true);
      setTransactionsError(null);
      
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });
      
      const response = await fetch(`/api/wallet/transactions?${queryParams}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      setTransactions(data.data.transactions);
      setTransactionsPagination(data.data.pagination);
    } catch (error) {
      handleError(error, setTransactionsError);
    } finally {
      setTransactionsLoading(false);
    }
  }, [user, handleError]);

  // Fetch bank details
  const fetchBankDetails = useCallback(async () => {
    if (!user) return;
    
    try {
      setBankDetailsLoading(true);
      setBankDetailsError(null);
      const response = await walletAPI.getBankDetails();
      setBankDetails(response.data || []);
    } catch (error) {
      handleError(error, setBankDetailsError);
    } finally {
      setBankDetailsLoading(false);
    }
  }, [user, handleError]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async (period = '30d') => {
    if (!user) return;
    
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      
      const response = await fetch(`/api/wallet/analytics?period=${period}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data.data);
    } catch (error) {
      handleError(error, setAnalyticsError);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [user, handleError]);

  // Fetch wallet settings separately
  const fetchWalletSettings = useCallback(async () => {
    if (!user || !wallet) return;
    
    try {
      setSettingsLoading(true);
      setSettingsError(null);
      
      // Extract settings from wallet object (since there's no separate settings endpoint)
      if (wallet.settings) {
        setSettings(wallet.settings);
      }
    } catch (error) {
      handleError(error, setSettingsError);
    } finally {
      setSettingsLoading(false);
    }
  }, [user, wallet, handleError]);

  // Initialize settings when wallet data is loaded
  useEffect(() => {
    if (wallet?.settings) {
      setSettings(wallet.settings);
    }
  }, [wallet]);

  // Request withdrawal with optimistic updates
  const requestWithdrawal = useCallback(async (withdrawalData) => {
    if (!user) throw new Error('User not authenticated');
    
    // Optimistic update - temporarily reduce available balance
    const originalWallet = wallet;
    if (wallet) {
      setWallet(prev => ({
        ...prev,
        balance: {
          ...prev.balance,
          availableBalance: prev.balance.availableBalance - withdrawalData.amount,
          pendingWithdrawals: prev.balance.pendingWithdrawals + withdrawalData.amount
        },
        withdrawalInfo: {
          ...prev.withdrawalInfo,
          monthlyWithdrawals: prev.withdrawalInfo.monthlyWithdrawals + 1
        }
      }));
    }
    
    try {
      setWithdrawalLoading(true);
      const response = await walletAPI.requestWithdrawal(withdrawalData);
      
      // Refresh wallet data to get accurate server state
      await fetchWalletSummary();
      await fetchTransactions({ page: 1, limit: 20 });
      
      return response.data;
    } catch (error) {
      // Revert optimistic update on error
      if (originalWallet) {
        setWallet(originalWallet);
      }
      throw error; // Let the component handle the error display
    } finally {
      setWithdrawalLoading(false);
    }
  }, [user, wallet, fetchWalletSummary, fetchTransactions]);

  // Add bank details
  const addBankDetails = useCallback(async (bankData) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setBankDetailsSubmitting(true);
      const response = await walletAPI.addBankDetails(bankData);
      
      // Refresh bank details and wallet summary
      await fetchBankDetails();
      await fetchWalletSummary();
      
      return response.data;
    } catch (error) {
      throw error; // Let the component handle the error display
    } finally {
      setBankDetailsSubmitting(false);
    }
  }, [user, fetchBankDetails, fetchWalletSummary]);

  // Update wallet settings
  const updateWalletSettings = useCallback(async (settingsData) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setSettingsUpdating(true);
      setSettingsError(null);
      const response = await walletAPI.updateSettings(settingsData);
      
      // Update local settings state immediately
      setSettings(response.data);
      
      // Also refresh wallet summary to get updated settings in wallet object
      await fetchWalletSummary();
      
      return response.data;
    } catch (error) {
      handleError(error, setSettingsError);
      throw error; // Let the component handle the error display
    } finally {
      setSettingsUpdating(false);
    }
  }, [user, fetchWalletSummary, handleError]);

  // Refresh all wallet data
  const refreshWallet = useCallback(async () => {
    if (!user) return;
    
    await Promise.all([
      fetchWalletSummary(),
      fetchTransactions({ page: 1, limit: 20 }),
      fetchBankDetails()
    ]);
  }, [user, fetchWalletSummary, fetchTransactions, fetchBankDetails]);

  // Auto-refresh setup
  const setupAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    // Refresh wallet data every 30 seconds
    refreshIntervalRef.current = setInterval(() => {
      if (user) {
        fetchWalletSummary();
      }
    }, 30000);
  }, [user, fetchWalletSummary]);

  // Handle window focus/blur for smart refreshing
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchWalletSummary();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchWalletSummary();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchWalletSummary]);

  // Initial data fetch and auto-refresh setup
  useEffect(() => {
    if (user) {
      refreshWallet();
      setupAutoRefresh();
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [user, refreshWallet, setupAutoRefresh]);

  // Get first available bank account (since we no longer use "default" concept)
  const primaryBankAccount = useMemo(() => {
    return bankDetails && bankDetails.length > 0 ? bankDetails[0] : null;
  }, [bankDetails]);

  // Get formatted wallet balance
  const formattedBalances = useMemo(() => {
    if (!wallet?.balance) return {};
    
    return {
      available: formatCurrency(wallet.balance.availableBalance),
      pending: formatCurrency(wallet.balance.pendingBalance),
      totalEarnings: formatCurrency(wallet.balance.totalEarnings),
      totalWithdrawals: formatCurrency(wallet.balance.totalWithdrawals),
      pendingWithdrawals: formatCurrency(wallet.balance.pendingWithdrawals)
    };
  }, [wallet, formatCurrency]);

  return {
    // State
    wallet,
    walletLoading,
    walletError,
    transactions,
    transactionsLoading,
    transactionsError,
    transactionsPagination,
    bankDetails,
    bankDetailsLoading,
    bankDetailsError,
    settings,
    settingsLoading,
    settingsError,
    analytics,
    analyticsLoading,
    analyticsError,
    
    // Operation states
    withdrawalLoading,
    bankDetailsSubmitting,
    settingsUpdating,
    
    // Methods
    fetchWalletSummary,
    fetchTransactions,
    fetchBankDetails,
    fetchAnalytics,
    fetchWalletSettings,
    requestWithdrawal,
    addBankDetails,
    updateWalletSettings,
    refreshWallet,
    
    // Utilities
    formatCurrency,
    getTransactionStatusColor,
    canWithdraw,
    primaryBankAccount,
    formattedBalances
  };
};

export default useWallet;