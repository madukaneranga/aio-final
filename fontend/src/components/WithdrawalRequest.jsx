import React, { useState, useEffect } from 'react';
import { walletAPI } from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import { AlertCircle, CheckCircle, CreditCard } from 'lucide-react';

const WithdrawalRequest = ({ summary, onWithdrawalSuccess }) => {
  const [amount, setAmount] = useState('');
  const [bankDetails, setBankDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const response = await walletAPI.getBankDetails();
      setBankDetails(response.data);
    } catch (err) {
      console.error('Failed to fetch bank details:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!bankDetails) {
      setError('Please add bank details before requesting withdrawal');
      return;
    }

    if (!amount || isNaN(amount) || parseFloat(amount) < 100) {
      setError('Please enter a valid amount (minimum Rs. 100)');
      return;
    }

    if (parseFloat(amount) > summary?.availableBalance) {
      setError('Insufficient balance');
      return;
    }

    if (summary?.monthlyWithdrawals >= summary?.monthlyLimit) {
      setError('Monthly withdrawal limit exceeded');
      return;
    }

    setLoading(true);

    try {
      await walletAPI.requestWithdrawal({
        amount: parseFloat(amount),
        bankAccountId: bankDetails._id
      });

      setSuccess('Withdrawal request submitted successfully');
      setAmount('');
      onWithdrawalSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canWithdraw = summary && summary.monthlyWithdrawals < summary.monthlyLimit;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center mb-6">
        <CreditCard className="h-6 w-6 text-black mr-3" />
        <h2 className="text-xl font-semibold text-black">Request Withdrawal</h2>
      </div>

      {!canWithdraw && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-700 font-medium">Monthly withdrawal limit reached</p>
          </div>
          <p className="text-red-600 text-sm mt-1">
            You can make {summary?.monthlyLimit} withdrawals per month. Limit resets on the 1st of each month.
          </p>
        </div>
      )}

      {!bankDetails && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-yellow-700 font-medium">Bank details required</p>
          </div>
          <p className="text-yellow-600 text-sm mt-1">
            Please add your bank details in the Bank Details section below before requesting a withdrawal.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
            Withdrawal Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rs.</span>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!canWithdraw || !bankDetails}
              min="100"
              max={summary?.availableBalance || 0}
              step="0.01"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter amount"
            />
          </div>
          <div className="mt-2 flex justify-between text-sm text-gray-600">
            <span>Minimum: Rs. 100</span>
            <span>Available: {formatCurrency(summary?.availableBalance || 0)}</span>
          </div>
        </div>

        {bankDetails && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Withdrawal to:</h3>
            <p className="text-sm text-gray-700">
              {bankDetails.bankName} - {bankDetails.getMaskedAccountNumber?.() || bankDetails.accountNumber}
            </p>
            <p className="text-sm text-gray-700">{bankDetails.accountHolderName}</p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p>Processing time: 1-3 business days</p>
            <p>Monthly limit: {summary?.monthlyWithdrawals || 0}/{summary?.monthlyLimit || 2}</p>
          </div>
          <button
            type="submit"
            disabled={loading || !canWithdraw || !bankDetails || !amount}
            className="px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Request Withdrawal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WithdrawalRequest;