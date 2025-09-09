import { validationErrorResponse } from "../utils/responseFormatter.js";
import mongoose from "mongoose";

export const validateCreateStore = (req, res, next) => {
  const errors = [];
  const { name, description, themeColor, contactInfo, heroImages, idImages, addressVerificationImages } = req.body;

  if (!name) {
    errors.push({ field: 'name', message: 'Store name is required' });
  } else if (typeof name !== 'string') {
    errors.push({ field: 'name', message: 'Store name must be a string' });
  } else if (name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Store name cannot be empty' });
  } else if (name.length > 100) {
    errors.push({ field: 'name', message: 'Store name must not exceed 100 characters' });
  }

  if (description && typeof description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
  }

  if (description && description.length > 2000) {
    errors.push({ field: 'description', message: 'Description must not exceed 2000 characters' });
  }

  if (themeColor && typeof themeColor !== 'string') {
    errors.push({ field: 'themeColor', message: 'Theme color must be a string' });
  }

  if (contactInfo && typeof contactInfo !== 'object') {
    errors.push({ field: 'contactInfo', message: 'Contact info must be an object' });
  } else if (contactInfo) {
    // Validate individual contact info fields
    const { email, phone, whatsapp, address } = contactInfo;
    
    if (email && typeof email !== 'string') {
      errors.push({ field: 'contactInfo.email', message: 'Email must be a string' });
    }
    
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push({ field: 'contactInfo.email', message: 'Email must be a valid email address' });
    }
    
    if (phone && typeof phone !== 'string') {
      errors.push({ field: 'contactInfo.phone', message: 'Phone must be a string' });
    }
    
    if (whatsapp && typeof whatsapp !== 'string') {
      errors.push({ field: 'contactInfo.whatsapp', message: 'WhatsApp must be a string' });
    }
    
    if (address && typeof address !== 'string') {
      errors.push({ field: 'contactInfo.address', message: 'Address must be a string' });
    }
    
    if (address && address.length > 500) {
      errors.push({ field: 'contactInfo.address', message: 'Address must not exceed 500 characters' });
    }
  }

  if (heroImages && !Array.isArray(heroImages)) {
    errors.push({ field: 'heroImages', message: 'Hero images must be an array' });
  } else if (heroImages) {
    heroImages.forEach((url, index) => {
      if (typeof url !== 'string' || !url.trim()) {
        errors.push({ field: `heroImages[${index}]`, message: 'Hero image URL must be a valid string' });
      }
    });
  }

  if (idImages && !Array.isArray(idImages)) {
    errors.push({ field: 'idImages', message: 'ID images must be an array' });
  } else if (idImages) {
    idImages.forEach((url, index) => {
      if (typeof url !== 'string' || !url.trim()) {
        errors.push({ field: `idImages[${index}]`, message: 'ID image URL must be a valid string' });
      }
    });
  }

  if (addressVerificationImages && !Array.isArray(addressVerificationImages)) {
    errors.push({ field: 'addressVerificationImages', message: 'Address verification images must be an array' });
  } else if (addressVerificationImages) {
    addressVerificationImages.forEach((url, index) => {
      if (typeof url !== 'string' || !url.trim()) {
        errors.push({ field: `addressVerificationImages[${index}]`, message: 'Address verification image URL must be a valid string' });
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateStoreId = (req, res, next) => {
  const storeId = req.params.id || req.params.storeId;

  if (!storeId) {
    return res.status(400).json(validationErrorResponse([
      { field: 'storeId', message: 'Store ID is required' }
    ]));
  }

  if (!mongoose.Types.ObjectId.isValid(storeId)) {
    return res.status(400).json(validationErrorResponse([
      { field: 'storeId', message: 'Invalid store ID format' }
    ]));
  }

  next();
};

export const validateUpdateStore = (req, res, next) => {
  const errors = [];
  const { name, description, themeColor, contactInfo } = req.body;

  if (name !== undefined) {
    if (!name) {
      errors.push({ field: 'name', message: 'Store name cannot be empty' });
    } else if (typeof name !== 'string') {
      errors.push({ field: 'name', message: 'Store name must be a string' });
    } else if (name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Store name cannot be empty' });
    } else if (name.length > 100) {
      errors.push({ field: 'name', message: 'Store name must not exceed 100 characters' });
    }
  }

  if (description !== undefined && typeof description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
  }

  if (description && description.length > 2000) {
    errors.push({ field: 'description', message: 'Description must not exceed 2000 characters' });
  }

  if (themeColor !== undefined && typeof themeColor !== 'string') {
    errors.push({ field: 'themeColor', message: 'Theme color must be a string' });
  }

  if (contactInfo !== undefined && typeof contactInfo !== 'object') {
    errors.push({ field: 'contactInfo', message: 'Contact info must be an object' });
  } else if (contactInfo) {
    // Validate individual contact info fields
    const { email, phone, whatsapp, address } = contactInfo;
    
    if (email !== undefined && typeof email !== 'string') {
      errors.push({ field: 'contactInfo.email', message: 'Email must be a string' });
    }
    
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push({ field: 'contactInfo.email', message: 'Email must be a valid email address' });
    }
    
    if (phone !== undefined && typeof phone !== 'string') {
      errors.push({ field: 'contactInfo.phone', message: 'Phone must be a string' });
    }
    
    if (whatsapp !== undefined && typeof whatsapp !== 'string') {
      errors.push({ field: 'contactInfo.whatsapp', message: 'WhatsApp must be a string' });
    }
    
    if (address !== undefined && typeof address !== 'string') {
      errors.push({ field: 'contactInfo.address', message: 'Address must be a string' });
    }
    
    if (address && address.length > 500) {
      errors.push({ field: 'contactInfo.address', message: 'Address must not exceed 500 characters' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateProfileImage = (req, res, next) => {
  const errors = [];
  const { profileImage } = req.body;

  if (!profileImage) {
    errors.push({ field: 'profileImage', message: 'Profile image is required' });
  } else if (typeof profileImage !== 'string') {
    errors.push({ field: 'profileImage', message: 'Profile image must be a string' });
  } else if (profileImage.trim().length === 0) {
    errors.push({ field: 'profileImage', message: 'Profile image cannot be empty' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateVerificationDocs = (req, res, next) => {
  const errors = [];
  const { idImages, addressVerificationImages } = req.body;

  if (idImages !== undefined && !Array.isArray(idImages)) {
    errors.push({ field: 'idImages', message: 'ID images must be an array' });
  } else if (idImages) {
    idImages.forEach((url, index) => {
      if (typeof url !== 'string' || !url.trim()) {
        errors.push({ field: `idImages[${index}]`, message: 'ID image URL must be a valid string' });
      }
    });
  }

  if (addressVerificationImages !== undefined && !Array.isArray(addressVerificationImages)) {
    errors.push({ field: 'addressVerificationImages', message: 'Address verification images must be an array' });
  } else if (addressVerificationImages) {
    addressVerificationImages.forEach((url, index) => {
      if (typeof url !== 'string' || !url.trim()) {
        errors.push({ field: `addressVerificationImages[${index}]`, message: 'Address verification image URL must be a valid string' });
      }
    });
  }

  if (!idImages && !addressVerificationImages) {
    errors.push({ field: 'documents', message: 'At least one type of verification document is required' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateSearchQuery = (req, res, next) => {
  const errors = [];
  const { search, category } = req.query;

  if (search && typeof search !== 'string') {
    errors.push({ field: 'search', message: 'Search query must be a string' });
  }

  if (search && search.length > 100) {
    errors.push({ field: 'search', message: 'Search query must not exceed 100 characters' });
  }

  if (category && typeof category !== 'string') {
    errors.push({ field: 'category', message: 'Category must be a string' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateSearchBody = (req, res, next) => {
  const errors = [];
  const { search } = req.body;

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