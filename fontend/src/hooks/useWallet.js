import { useState, useEffect } from 'react';
import { walletAPI } from '../utils/api';

export const useWallet = () => {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    try {
      const response = await walletAPI.getSummary();
      setSummary(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchTransactions = async (filters = {}) => {
    try {
      const response = await walletAPI.getTransactions(filters);
      setTransactions(response.data.transactions);
    } catch (err) {
      setError(err.message);
    }
  };

  const requestWithdrawal = async (amount, bankAccountId) => {
    try {
      const response = await walletAPI.requestWithdrawal({ amount, bankAccountId });
      await fetchSummary();
      await fetchTransactions();
      return response;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Withdrawal request failed');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchTransactions()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    summary,
    transactions,
    loading,
    error,
    fetchSummary,
    fetchTransactions,
    requestWithdrawal
  };
};