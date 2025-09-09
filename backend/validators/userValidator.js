import { validationErrorResponse } from "../utils/responseFormatter.js";

export const validateUserSearch = (req, res, next) => {
  const errors = [];
  const { search } = req.query;

  if (search && typeof search !== 'string') {
    errors.push({ field: 'search', message: 'Search query must be a string' });
  }

  if (search && search.length > 100) {
    errors.push({ field: 'search', message: 'Search query must not exceed 100 characters' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateUpdateProfile = (req, res, next) => {
  const errors = [];
  const { name, email, phone, address } = req.body;

  if (name !== undefined) {
    if (!name) {
      errors.push({ field: 'name', message: 'Name cannot be empty' });
    } else if (typeof name !== 'string') {
      errors.push({ field: 'name', message: 'Name must be a string' });
    } else if (name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name cannot be empty' });
    } else if (name.length > 100) {
      errors.push({ field: 'name', message: 'Name must not exceed 100 characters' });
    }
  }

  if (email !== undefined) {
    if (!email) {
      errors.push({ field: 'email', message: 'Email cannot be empty' });
    } else if (typeof email !== 'string') {
      errors.push({ field: 'email', message: 'Email must be a string' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
  }

  if (phone !== undefined && phone) {
    if (typeof phone !== 'string') {
      errors.push({ field: 'phone', message: 'Phone must be a string' });
    } else if (phone.length > 20) {
      errors.push({ field: 'phone', message: 'Phone must not exceed 20 characters' });
    }
  }

  if (address !== undefined && address) {
    // Handle both string and object address formats
    if (typeof address === 'string') {
      if (address.length > 500) {
        errors.push({ field: 'address', message: 'Address must not exceed 500 characters' });
      }
    } else if (typeof address === 'object' && address !== null) {
      // Validate nested address object
      const { street, city, state, zipCode, country } = address;
      
      if (street && typeof street !== 'string') {
        errors.push({ field: 'address.street', message: 'Street must be a string' });
      }
      if (city && typeof city !== 'string') {
        errors.push({ field: 'address.city', message: 'City must be a string' });
      }
      if (state && typeof state !== 'string') {
        errors.push({ field: 'address.state', message: 'State must be a string' });
      }
      if (zipCode && typeof zipCode !== 'string') {
        errors.push({ field: 'address.zipCode', message: 'Zip code must be a string' });
      }
      if (country && typeof country !== 'string') {
        errors.push({ field: 'address.country', message: 'Country must be a string' });
      }
      
      // Check total length when combined
      const fullAddress = [street, city, state, zipCode, country].filter(Boolean).join(', ');
      if (fullAddress.length > 500) {
        errors.push({ field: 'address', message: 'Combined address must not exceed 500 characters' });
      }
    } else {
      errors.push({ field: 'address', message: 'Address must be a string or an object with address fields' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateVerificationUpload = (req, res, next) => {
  const errors = [];
  const { idDocumentUrl, originalName, size } = req.body;

  if (!idDocumentUrl) {
    errors.push({ field: 'idDocumentUrl', message: 'ID document URL is required' });
  } else if (typeof idDocumentUrl !== 'string') {
    errors.push({ field: 'idDocumentUrl', message: 'ID document URL must be a string' });
  } else if (idDocumentUrl.trim().length === 0) {
    errors.push({ field: 'idDocumentUrl', message: 'ID document URL cannot be empty' });
  }

  if (originalName && typeof originalName !== 'string') {
    errors.push({ field: 'originalName', message: 'Original name must be a string' });
  }

  if (size !== undefined) {
    if (typeof size !== 'number') {
      errors.push({ field: 'size', message: 'File size must be a number' });
    } else if (size <= 0) {
      errors.push({ field: 'size', message: 'File size must be greater than 0' });
    } else if (size > 5 * 1024 * 1024) {
      errors.push({ field: 'size', message: 'File size must be less than 5MB' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};