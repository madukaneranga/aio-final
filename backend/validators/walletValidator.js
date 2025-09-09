import { validationErrorResponse } from "../utils/responseFormatter.js";
import mongoose from "mongoose";

export const validateTransactionQuery = (req, res, next) => {
  const errors = [];
  const { page, limit, type, status, startDate, endDate, sortBy, sortOrder } = req.query;

  // Validate page
  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push({ field: 'page', message: 'Page must be a positive integer' });
    }
  }

  // Validate limit
  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push({ field: 'limit', message: 'Limit must be between 1 and 100' });
    }
  }

  // Validate type
  if (type !== undefined) {
    const validTypes = ['sale', 'withdrawal', 'refund', 'adjustment'];
    if (!validTypes.includes(type)) {
      errors.push({ field: 'type', message: `Type must be one of: ${validTypes.join(', ')}` });
    }
  }

  // Validate status
  if (status !== undefined) {
    const validStatuses = ['completed', 'pending', 'approved', 'rejected', 'processing', 'cancelled', 'failed'];
    if (!validStatuses.includes(status)) {
      errors.push({ field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` });
    }
  }

  // Validate dates
  if (startDate !== undefined) {
    const date = new Date(startDate);
    if (isNaN(date.getTime())) {
      errors.push({ field: 'startDate', message: 'Start date must be a valid date' });
    }
  }

  if (endDate !== undefined) {
    const date = new Date(endDate);
    if (isNaN(date.getTime())) {
      errors.push({ field: 'endDate', message: 'End date must be a valid date' });
    }
  }

  // Validate sort parameters
  if (sortBy !== undefined) {
    const validSortFields = ['createdAt', 'amount', 'type', 'status'];
    if (!validSortFields.includes(sortBy)) {
      errors.push({ field: 'sortBy', message: `Sort field must be one of: ${validSortFields.join(', ')}` });
    }
  }

  if (sortOrder !== undefined) {
    if (!['asc', 'desc'].includes(sortOrder)) {
      errors.push({ field: 'sortOrder', message: 'Sort order must be either "asc" or "desc"' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateBankDetails = (req, res, next) => {
  const errors = [];
  const { accountHolderName, accountNumber, bankName, branchName, branchCode } = req.body;

  // Validate accountHolderName
  if (!accountHolderName) {
    errors.push({ field: 'accountHolderName', message: 'Account holder name is required' });
  } else if (typeof accountHolderName !== 'string') {
    errors.push({ field: 'accountHolderName', message: 'Account holder name must be a string' });
  } else if (accountHolderName.trim().length === 0) {
    errors.push({ field: 'accountHolderName', message: 'Account holder name cannot be empty' });
  } else if (accountHolderName.length > 100) {
    errors.push({ field: 'accountHolderName', message: 'Account holder name must not exceed 100 characters' });
  } else if (!/^[a-zA-Z\s.'-]+$/.test(accountHolderName)) {
    errors.push({ field: 'accountHolderName', message: 'Account holder name contains invalid characters' });
  }

  // Validate accountNumber
  if (!accountNumber) {
    errors.push({ field: 'accountNumber', message: 'Account number is required' });
  } else if (typeof accountNumber !== 'string') {
    errors.push({ field: 'accountNumber', message: 'Account number must be a string' });
  } else if (accountNumber.trim().length === 0) {
    errors.push({ field: 'accountNumber', message: 'Account number cannot be empty' });
  } else if (!/^[0-9]+$/.test(accountNumber)) {
    errors.push({ field: 'accountNumber', message: 'Account number must contain only digits' });
  } else if (accountNumber.length < 8 || accountNumber.length > 20) {
    errors.push({ field: 'accountNumber', message: 'Account number must be between 8 and 20 digits' });
  }

  // Validate bankName
  if (!bankName) {
    errors.push({ field: 'bankName', message: 'Bank name is required' });
  } else if (typeof bankName !== 'string') {
    errors.push({ field: 'bankName', message: 'Bank name must be a string' });
  } else if (bankName.trim().length === 0) {
    errors.push({ field: 'bankName', message: 'Bank name cannot be empty' });
  } else if (bankName.length > 100) {
    errors.push({ field: 'bankName', message: 'Bank name must not exceed 100 characters' });
  }

  // Validate branchName
  if (!branchName) {
    errors.push({ field: 'branchName', message: 'Branch name is required' });
  } else if (typeof branchName !== 'string') {
    errors.push({ field: 'branchName', message: 'Branch name must be a string' });
  } else if (branchName.trim().length === 0) {
    errors.push({ field: 'branchName', message: 'Branch name cannot be empty' });
  } else if (branchName.length > 100) {
    errors.push({ field: 'branchName', message: 'Branch name must not exceed 100 characters' });
  }

  // Validate branchCode (optional)
  if (branchCode !== undefined && branchCode !== null && branchCode !== '') {
    if (typeof branchCode !== 'string') {
      errors.push({ field: 'branchCode', message: 'Branch code must be a string' });
    } else if (branchCode.length > 10) {
      errors.push({ field: 'branchCode', message: 'Branch code must not exceed 10 characters' });
    }
  }


  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateWithdrawalRequest = (req, res, next) => {
  const errors = [];
  const { amount, bankAccountId, note } = req.body;

  // Validate amount
  if (!amount) {
    errors.push({ field: 'amount', message: 'Amount is required' });
  } else if (typeof amount !== 'number') {
    errors.push({ field: 'amount', message: 'Amount must be a number' });
  } else if (amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be greater than 0' });
  } else if (amount < 100) {
    errors.push({ field: 'amount', message: 'Minimum withdrawal amount is Rs. 100' });
  } else if (amount > 500000) {
    errors.push({ field: 'amount', message: 'Maximum withdrawal amount is Rs. 500,000' });
  } else if (amount % 0.01 !== 0) {
    errors.push({ field: 'amount', message: 'Amount can have maximum 2 decimal places' });
  }

  // Validate bankAccountId
  if (!bankAccountId) {
    errors.push({ field: 'bankAccountId', message: 'Bank account ID is required' });
  } else if (!mongoose.Types.ObjectId.isValid(bankAccountId)) {
    errors.push({ field: 'bankAccountId', message: 'Invalid bank account ID format' });
  }

  // Validate note (optional)
  if (note !== undefined) {
    if (typeof note !== 'string') {
      errors.push({ field: 'note', message: 'Note must be a string' });
    } else if (note.length > 500) {
      errors.push({ field: 'note', message: 'Note must not exceed 500 characters' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateWalletSettings = (req, res, next) => {
  const errors = [];
  const { autoWithdrawal } = req.body;

  if (autoWithdrawal !== undefined) {
    if (typeof autoWithdrawal !== 'object' || autoWithdrawal === null) {
      errors.push({ field: 'autoWithdrawal', message: 'Auto withdrawal settings must be an object' });
    } else {
      const { enabled, threshold } = autoWithdrawal;

      // Validate enabled
      if (enabled !== undefined && typeof enabled !== 'boolean') {
        errors.push({ field: 'autoWithdrawal.enabled', message: 'Enabled must be a boolean' });
      }

      // Validate threshold
      if (threshold !== undefined) {
        if (typeof threshold !== 'number') {
          errors.push({ field: 'autoWithdrawal.threshold', message: 'Threshold must be a number' });
        } else if (threshold <= 0) {
          errors.push({ field: 'autoWithdrawal.threshold', message: 'Threshold must be greater than 0' });
        } else if (threshold < 1000) {
          errors.push({ field: 'autoWithdrawal.threshold', message: 'Minimum threshold is Rs. 1,000' });
        } else if (threshold > 1000000) {
          errors.push({ field: 'autoWithdrawal.threshold', message: 'Maximum threshold is Rs. 1,000,000' });
        }
      }
    }
  }

  if (Object.keys(req.body).length === 0) {
    errors.push({ field: 'body', message: 'Request body cannot be empty' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateAnalyticsQuery = (req, res, next) => {
  const errors = [];
  const { period } = req.query;

  // Validate period
  if (period !== undefined) {
    const validPeriods = ['7d', '30d', '90d', '1y'];
    if (!validPeriods.includes(period)) {
      errors.push({ field: 'period', message: `Period must be one of: ${validPeriods.join(', ')}` });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};