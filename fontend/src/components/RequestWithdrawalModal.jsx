import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, DollarSign, Building2 } from 'lucide-react';

const RequestWithdrawalModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  availableBalance,
  bankDetails = [],
  defaultBankAccount,
  monthlyWithdrawals,
  monthlyLimit,
  currency = "LKR",
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    note: '',
    bankAccountId: ''
  });
  const [errors, setErrors] = useState({});
  const [selectedBankAccount, setSelectedBankAccount] = useState(null);

  // Set default bank account when modal opens
  useEffect(() => {
    if (isOpen && defaultBankAccount) {
      setSelectedBankAccount(defaultBankAccount);
      setFormData(prev => ({
        ...prev,
        bankAccountId: defaultBankAccount._id
      }));
    }
  }, [isOpen, defaultBankAccount]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const validateForm = () => {
    const newErrors = {};
    const amount = parseFloat(formData.amount);

    if (!formData.amount || isNaN(amount)) {
      newErrors.amount = 'Amount is required';
    } else if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (amount > availableBalance) {
      newErrors.amount = 'Amount exceeds available balance';
    } else if (amount < 100) {
      newErrors.amount = 'Minimum withdrawal amount is LKR 100';
    } else if (amount > 500000) {
      newErrors.amount = 'Maximum withdrawal amount is LKR 500,000';
    }

    if (monthlyWithdrawals >= monthlyLimit) {
      newErrors.limit = 'Monthly withdrawal limit exceeded';
    }

    if (!formData.bankAccountId || !selectedBankAccount) {
      newErrors.bank = 'Please select a bank account';
    }

    if (bankDetails.length === 0) {
      newErrors.bank = 'Bank details required. Please add bank details first.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await onSubmit({
        amount: parseFloat(formData.amount),
        bankAccountId: formData.bankAccountId,
        note: formData.note
      });
      handleClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to submit withdrawal request' });
    }
  };

  const handleClose = () => {
    setFormData({ amount: '', note: '', bankAccountId: '' });
    setErrors({});
    setSelectedBankAccount(null);
    onClose();
  };

  const handleBankAccountChange = (accountId) => {
    const account = bankDetails.find(acc => acc._id === accountId);
    setSelectedBankAccount(account);
    setFormData(prev => ({ ...prev, bankAccountId: accountId }));
  };

  if (!isOpen) return null;

  const canWithdraw = monthlyWithdrawals < monthlyLimit && bankDetails.length > 0 && availableBalance > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Request Withdrawal</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Available Balance Info */}
        <div className="mb-4 p-3 bg-black text-white rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-gray-300" />
            <span className="text-sm text-gray-300">Available Balance</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {currency} {formatCurrency(availableBalance)}
          </p>
        </div>

        {/* Withdrawal Limits */}
        <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg">
          <div className="text-sm text-gray-800 space-y-1">
            <p>Monthly Withdrawals: {monthlyWithdrawals} / {monthlyLimit}</p>
            <p>Minimum Amount: {currency} 100.00</p>
          </div>
        </div>

        {/* Bank Account Selection */}
        {bankDetails.length > 0 ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Bank Account *
            </label>
            <select
              value={formData.bankAccountId}
              onChange={(e) => handleBankAccountChange(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-black"
            >
              <option value="">Select a bank account</option>
              {bankDetails.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.bankName} - ****{account.accountNumber?.slice(-4)}
                </option>
              ))}
            </select>
            
            {selectedBankAccount && (
              <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-black" />
                  <span className="text-sm text-black font-medium">Selected Bank Account</span>
                </div>
                <div className="text-sm text-gray-800">
                  <p>{selectedBankAccount.bankName}</p>
                  <p>Account: ****{selectedBankAccount.accountNumber?.slice(-4)}</p>
                  <p>Holder: {selectedBankAccount.accountHolderName}</p>
                  <p>Branch: {selectedBankAccount.branchName}</p>
                  {selectedBankAccount.isVerified !== undefined && (
                    <p className={`font-medium ${
                      selectedBankAccount.isVerified ? "text-green-600" : "text-yellow-600"
                    }`}>
                      Status: {selectedBankAccount.isVerified ? "Verified" : "Pending Verification"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 p-3 bg-gray-100 border-2 border-gray-400 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-800 font-medium">No bank details found</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Please add bank details before requesting a withdrawal.
            </p>
          </div>
        )}

        {/* Error Messages */}
        {(errors.limit || errors.bank) && (
          <div className="mb-4 p-3 bg-white border-2 border-gray-400 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-800">Cannot Process Withdrawal</span>
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              {errors.limit && <li>• {errors.limit}</li>}
              {errors.bank && <li>• {errors.bank}</li>}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Withdrawal Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                {currency}
              </span>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className={`w-full pl-12 pr-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-black ${
                  errors.amount ? 'border-gray-400 bg-gray-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={!canWithdraw}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-gray-700 mt-1 font-medium">{errors.amount}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-black"
              placeholder="Add any notes for this withdrawal..."
              maxLength={500}
              disabled={!canWithdraw}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.note.length}/500 characters
            </p>
          </div>

          {errors.submit && (
            <div className="p-3 bg-gray-100 border-2 border-gray-400 rounded-lg">
              <p className="text-sm text-gray-800 font-medium">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border-2 border-gray-300 bg-white rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canWithdraw || isLoading}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Submitting...' : 'Request Withdrawal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestWithdrawalModal;