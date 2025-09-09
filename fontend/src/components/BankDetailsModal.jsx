import React, { useState, useEffect } from 'react';
import { X, Building2, Lock, Unlock, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const BankDetailsModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  bankDetails,
  isLoading = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    branchName: '',
    branchCode: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bankDetails) {
      setFormData({
        bankName: bankDetails.bankName || '',
        accountNumber: bankDetails.accountNumber || '',
        accountHolderName: bankDetails.accountHolderName || '',
        branchName: bankDetails.branchName || '',
        branchCode: bankDetails.branchCode || ''
      });
      // Bank details exist, start in viewing mode
      setIsEditing(false);
    } else {
      // No bank details exist, start in editing mode (adding new)
      setIsEditing(true);
    }
  }, [bankDetails]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (formData.accountNumber.length < 8) {
      newErrors.accountNumber = 'Account number must be at least 8 digits';
    } else if (formData.accountNumber.length > 20) {
      newErrors.accountNumber = 'Account number must not exceed 20 digits';
    } else if (!/^\d+$/.test(formData.accountNumber)) {
      newErrors.accountNumber = 'Account number must contain only digits';
    }

    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    } else if (!/^[a-zA-Z\s.'-]+$/.test(formData.accountHolderName)) {
      newErrors.accountHolderName = 'Account holder name contains invalid characters';
    }

    if (!formData.branchName.trim()) {
      newErrors.branchName = 'Branch name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
      setErrors({});
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to update bank details' });
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setErrors({});
  };

  const handleCancel = () => {
    if (bankDetails) {
      // Reset to original data and exit edit mode
      setFormData({
        bankName: bankDetails.bankName || '',
        accountNumber: bankDetails.accountNumber || '',
        accountHolderName: bankDetails.accountHolderName || '',
        branchName: bankDetails.branchName || '',
        branchCode: bankDetails.branchCode || ''
      });
      setIsEditing(false);
    } else {
      onClose();
    }
    setErrors({});
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const getStatusDisplay = () => {
    if (!bankDetails) {
      return {
        text: 'Add New Bank Details',
        icon: <Building2 className="w-4 h-4 text-black" />,
        bgColor: 'bg-white text-black border-black'
      };
    }
    
    if (isEditing) {
      return {
        text: 'Edit Mode',
        icon: <Unlock className="w-4 h-4 text-black" />,
        bgColor: 'bg-white text-black border-black'
      };
    }
    
    return {
      text: bankDetails.isVerified ? 'Verified Bank Details' : 'Pending Verification',
      icon: bankDetails.isVerified 
        ? <CheckCircle className="w-4 h-4 text-white" /> 
        : <Clock className="w-4 h-4 text-gray-600" />,
      bgColor: bankDetails.isVerified 
        ? 'bg-black text-white border-black' 
        : 'bg-gray-100 text-gray-800 border-gray-400'
    };
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Bank Details</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Status Banner */}
        <div className={`p-3 rounded-lg border mb-4 ${statusInfo.bgColor}`}>
          <div className="flex items-center gap-2">
            {statusInfo.icon}
            <span className="text-sm font-medium">{statusInfo.text}</span>
          </div>
          {bankDetails && !bankDetails.isVerified && !isEditing && (
            <p className="text-xs mt-1 text-gray-600">
              Your bank details are under verification. You'll be notified once approved.
            </p>
          )}
          {bankDetails?.isVerified && !isEditing && (
            <p className="text-xs mt-1 text-gray-300">
              Your bank details have been verified and are secure.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bank Name *
            </label>
            <input
              type="text"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-black ${
                errors.bankName ? 'border-gray-400 bg-gray-50' : 'border-gray-300'
              } ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
              placeholder="Enter bank name"
              disabled={!isEditing || isLoading}
              readOnly={!isEditing}
            />
            {errors.bankName && (
              <p className="text-xs text-gray-700 mt-1 font-medium">{errors.bankName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number *
            </label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-black ${
                errors.accountNumber ? 'border-gray-400 bg-gray-50' : 'border-gray-300'
              } ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
              placeholder="Enter account number"
              disabled={!isEditing || isLoading}
              readOnly={!isEditing}
            />
            {errors.accountNumber && (
              <p className="text-xs text-gray-700 mt-1 font-medium">{errors.accountNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Holder Name *
            </label>
            <input
              type="text"
              value={formData.accountHolderName}
              onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
              className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-black ${
                errors.accountHolderName ? 'border-gray-400 bg-gray-50' : 'border-gray-300'
              } ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
              placeholder="Enter account holder name"
              disabled={!isEditing || isLoading}
              readOnly={!isEditing}
            />
            {errors.accountHolderName && (
              <p className="text-xs text-gray-700 mt-1 font-medium">{errors.accountHolderName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch Name *
            </label>
            <input
              type="text"
              value={formData.branchName}
              onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
              className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-black ${
                errors.branchName ? 'border-gray-400 bg-gray-50' : 'border-gray-300'
              } ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
              placeholder="Enter branch name"
              disabled={!isEditing || isLoading}
              readOnly={!isEditing}
            />
            {errors.branchName && (
              <p className="text-xs text-gray-700 mt-1 font-medium">{errors.branchName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch Code (Optional)
            </label>
            <input
              type="text"
              value={formData.branchCode}
              onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
              className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-black ${
                errors.branchCode ? 'border-gray-400 bg-gray-50' : 'border-gray-300'
              } ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
              placeholder="Enter branch code (if available)"
              disabled={!isEditing || isLoading}
              readOnly={!isEditing}
            />
            {errors.branchCode && (
              <p className="text-xs text-gray-700 mt-1 font-medium">{errors.branchCode}</p>
            )}
          </div>


          {errors.submit && (
            <div className="p-3 bg-gray-100 border-2 border-gray-400 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-600" />
                <p className="text-sm text-gray-800 font-medium">{errors.submit}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            {!isEditing && bankDetails && (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border-2 border-gray-300 bg-white rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleEditToggle}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Edit
                </button>
              </>
            )}

            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border-2 border-gray-300 bg-white rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Saving...' : bankDetails ? 'Request Change' : 'Add Bank Details'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default BankDetailsModal;