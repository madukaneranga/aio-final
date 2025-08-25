import React, { useState, useEffect } from 'react';
import { walletAPI } from '../utils/api';
import { AlertCircle, CheckCircle, Building, Lock, Edit, Clock, X } from 'lucide-react';

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
  const [lockInfo, setLockInfo] = useState(null);
  const [pendingChangeRequest, setPendingChangeRequest] = useState(null);
  const [showChangeRequestForm, setShowChangeRequestForm] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const response = await walletAPI.getBankDetails();
      if (response.data) {
        setExistingDetails(response.data);
        setLockInfo(response.lockInfo);
        setPendingChangeRequest(response.pendingChangeRequest);
        
        setFormData({
          accountHolderName: response.data.accountHolderName || '',
          bankName: response.data.bankName || '',
          accountNumber: response.data.accountNumber || '',
          routingNumber: response.data.routingNumber || '',
          branchName: response.data.branchName || '',
          branchCode: response.data.branchCode || '',
          accountType: response.data.accountType || 'savings'
        });
      } else {
        setLockInfo(response.lockInfo);
        setPendingChangeRequest(response.pendingChangeRequest);
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
      const response = await walletAPI.updateBankDetails(formData);
      setSuccess(response.message || 'Bank details updated successfully');
      await fetchBankDetails();
    } catch (err) {
      if (err.message.includes('locked') || err.response?.data?.requiresChangeRequest) {
        setError('Bank details are locked. Please submit a change request to modify them.');
        setShowChangeRequestForm(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleChangeRequest = async (e) => {
    e.preventDefault();
    if (changeRequestReason.trim().length < 10) {
      setError('Please provide a detailed reason (minimum 10 characters)');
      return;
    }
    
    setError('');
    setSuccess('');
    setIsSubmittingRequest(true);
    
    try {
      const response = await walletAPI.submitBankChangeRequest({
        requestedDetails: formData,
        reason: changeRequestReason.trim()
      });
      
      setSuccess(response.message);
      setShowChangeRequestForm(false);
      setChangeRequestReason('');
      await fetchBankDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmittingRequest(false);
    }
  };
  
  const cancelChangeRequest = async (requestId) => {
    try {
      setError('');
      const response = await walletAPI.cancelBankChangeRequest(requestId);
      setSuccess(response.message);
      await fetchBankDetails();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Building className="h-6 w-6 text-black mr-3" />
          <h2 className="text-xl font-semibold text-black">Bank Details</h2>
        </div>
        <div className="flex items-center space-x-2">
          {existingDetails?.isVerified && (
            <span className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full">
              Verified
            </span>
          )}
          {lockInfo?.isLocked && (
            <span className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full flex items-center">
              <Lock className="w-3 h-3 mr-1" />
              Locked
            </span>
          )}
        </div>
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
      
      {/* Lock Status Info */}
      {lockInfo?.isLocked && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <Lock className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-yellow-700">
              <p className="font-medium mb-1">Bank Details Locked for Security</p>
              <p className="text-sm">
                Your bank details have been locked {lockInfo.lockReason === 'auto_lock_after_first_save' ? 'automatically after first save' : lockInfo.lockReason}.
                {lockInfo.lockedAt && ` Locked on ${new Date(lockInfo.lockedAt).toLocaleDateString()}.`}
              </p>
              <p className="text-sm mt-1">
                To modify your bank details, please submit a change request below.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Pending Change Request Info */}
      {pendingChangeRequest && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-blue-700">
                <p className="font-medium mb-1">Change Request Pending</p>
                <p className="text-sm">
                  Your change request submitted on {new Date(pendingChangeRequest.requestedAt).toLocaleDateString()} is pending admin review.
                </p>
                <p className="text-xs mt-1 text-blue-600">
                  Request Age: {pendingChangeRequest.requestAge} days
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => cancelChangeRequest(pendingChangeRequest._id)}
              className="text-blue-600 hover:text-blue-800 p-1"
              title="Cancel Request"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={lockInfo?.isLocked && !showChangeRequestForm ? handleChangeRequest : handleSubmit} className="space-y-6">
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
              disabled={lockInfo?.isLocked && !showChangeRequestForm}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              disabled={lockInfo?.isLocked && !showChangeRequestForm}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              disabled={lockInfo?.isLocked && !showChangeRequestForm}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              disabled={lockInfo?.isLocked && !showChangeRequestForm}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              disabled={lockInfo?.isLocked && !showChangeRequestForm}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              disabled={lockInfo?.isLocked && !showChangeRequestForm}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
            disabled={lockInfo?.isLocked && !showChangeRequestForm}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="savings">Savings Account</option>
            <option value="checking">Checking Account</option>
            <option value="business">Business Account</option>
          </select>
        </div>
        
        {/* Change Request Reason Field */}
        {(lockInfo?.isLocked && showChangeRequestForm) && (
          <div>
            <label htmlFor="changeRequestReason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Change Request *
            </label>
            <textarea
              id="changeRequestReason"
              value={changeRequestReason}
              onChange={(e) => setChangeRequestReason(e.target.value)}
              required
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Please provide a detailed reason why you need to change your bank details (minimum 10 characters)"
            />
            <p className="text-xs text-gray-500 mt-1">
              {changeRequestReason.length}/500 characters (minimum 10 required)
            </p>
          </div>
        )}

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

        <div className="flex justify-end space-x-3">
          {lockInfo?.isLocked && !showChangeRequestForm && !pendingChangeRequest && (
            <button
              type="button"
              onClick={() => setShowChangeRequestForm(true)}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Request Change
            </button>
          )}
          
          {showChangeRequestForm && (
            <button
              type="button"
              onClick={() => {
                setShowChangeRequestForm(false);
                setChangeRequestReason('');
                setError('');
              }}
              className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          )}
          
          {(!lockInfo?.isLocked || showChangeRequestForm) && !pendingChangeRequest && (
            <button
              type="submit"
              disabled={loading || isSubmittingRequest || (showChangeRequestForm && changeRequestReason.trim().length < 10)}
              className="px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading || isSubmittingRequest ? 'Saving...' : 
               showChangeRequestForm ? 'Submit Change Request' :
               existingDetails ? 'Update Bank Details' : 'Save Bank Details'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default BankDetailsForm;