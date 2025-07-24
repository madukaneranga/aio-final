import React, { useState, useEffect } from 'react';
import { walletAPI } from '../utils/api';
import { AlertCircle, CheckCircle, Building } from 'lucide-react';

const BankDetailsForm = () => {
  const [formData, setFormData] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    branchName: '',
    branchCode: '',
    accountType: 'savings'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingDetails, setExistingDetails] = useState(null);

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const response = await walletAPI.getBankDetails();
      if (response.data) {
        setExistingDetails(response.data);
        setFormData({
          accountHolderName: response.data.accountHolderName || '',
          bankName: response.data.bankName || '',
          accountNumber: response.data.accountNumber || '',
          routingNumber: response.data.routingNumber || '',
          branchName: response.data.branchName || '',
          branchCode: response.data.branchCode || '',
          accountType: response.data.accountType || 'savings'
        });
      }
    } catch (err) {
      console.error('Failed to fetch bank details:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await walletAPI.updateBankDetails(formData);
      setSuccess('Bank details updated successfully');
      await fetchBankDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Building className="h-6 w-6 text-black mr-3" />
          <h2 className="text-xl font-semibold text-black">Bank Details</h2>
        </div>
        {existingDetails?.isVerified && (
          <span className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full">
            Verified
          </span>
        )}
      </div>

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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700 mb-2">
              Account Holder Name *
            </label>
            <input
              type="text"
              id="accountHolderName"
              name="accountHolderName"
              value={formData.accountHolderName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Enter full name as per bank records"
            />
          </div>

          <div>
            <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
              Bank Name *
            </label>
            <input
              type="text"
              id="bankName"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="e.g., Commercial Bank of Ceylon"
            />
          </div>

          <div>
            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Account Number *
            </label>
            <input
              type="text"
              id="accountNumber"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Enter account number"
            />
          </div>

          <div>
            <label htmlFor="routingNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Routing Number *
            </label>
            <input
              type="text"
              id="routingNumber"
              name="routingNumber"
              value={formData.routingNumber}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Enter routing number"
            />
          </div>

          <div>
            <label htmlFor="branchName" className="block text-sm font-medium text-gray-700 mb-2">
              Branch Name *
            </label>
            <input
              type="text"
              id="branchName"
              name="branchName"
              value={formData.branchName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="e.g., Colombo Main Branch"
            />
          </div>

          <div>
            <label htmlFor="branchCode" className="block text-sm font-medium text-gray-700 mb-2">
              Branch Code
            </label>
            <input
              type="text"
              id="branchCode"
              name="branchCode"
              value={formData.branchCode}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Enter branch code (if applicable)"
            />
          </div>
        </div>

        <div>
          <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-2">
            Account Type *
          </label>
          <select
            id="accountType"
            name="accountType"
            value={formData.accountType}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="savings">Savings Account</option>
            <option value="checking">Checking Account</option>
            <option value="business">Business Account</option>
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-blue-700 text-sm">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Bank details will be verified before processing withdrawals</li>
                <li>Ensure all information matches your bank records exactly</li>
                <li>Changes to bank details may require re-verification</li>
                <li>Only local Sri Lankan bank accounts are supported</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : existingDetails ? 'Update Bank Details' : 'Save Bank Details'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BankDetailsForm;