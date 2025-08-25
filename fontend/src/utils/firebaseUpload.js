// utils/firebaseUpload.js

import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

/**
 * Upload file to Firebase Storage with compression and optimization
 * @param {File} file - File to upload
 * @param {string} folder - Storage folder (default: 'ChatFolder')
 * @param {Object} options - Upload options
 * @returns {Object} Upload result with URL and metadata
 */
export const uploadFileToFirebase = async (file, folder = 'ChatFolder', options = {}) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file size (max 10MB)
    const maxSize = options.maxSizeMB || 10;
    if (file.size > maxSize * 1024 * 1024) {
      throw new Error(`File size must be less than ${maxSize}MB`);
    }

    // Validate file type (only images for chat)
    const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not allowed. Only images are supported.');
    }

    let processedFile = file;

    // Compress image if it's an image file
    if (file.type.startsWith('image/')) {
      processedFile = await compressImage(file, options.compression);
    }

    // Generate unique filename
    const filename = generateUniqueFilename(processedFile.name);
    
    // Create storage reference
    const storageRef = ref(storage, `${folder}/${filename}`);
    
    // Set metadata
    const metadata = {
      contentType: processedFile.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        fileSize: processedFile.size.toString(),
      }
    };

    // Upload file
    const snapshot = await uploadBytes(storageRef, processedFile, metadata);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      success: true,
      url: downloadURL,
      filename: processedFile.name,
      originalName: file.name,
      size: processedFile.size,
      mimeType: processedFile.type,
      path: `${folder}/${filename}`,
      metadata: snapshot.metadata,
    };

  } catch (error) {
    console.error('Firebase upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

/**
 * Compress image file for optimal upload
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 * @returns {File} Compressed image file
 */
export const compressImage = async (file, options = {}) => {
  try {
    const compressionOptions = {
      maxSizeMB: options.maxSizeMB || 1, // 1MB default
      maxWidthOrHeight: options.maxWidthOrHeight || 1920, // 1920px default
      useWebWorker: true,
      fileType: options.fileType || file.type,
      initialQuality: options.initialQuality || 0.8,
      alwaysKeepResolution: options.alwaysKeepResolution || false,
      ...options
    };

    const compressedFile = await imageCompression(file, compressionOptions);
    
    console.log(`Image compressed: ${file.size} bytes → ${compressedFile.size} bytes`);
    
    return compressedFile;
  } catch (error) {
    console.error('Image compression error:', error);
    // Return original file if compression fails
    return file;
  }
};

/**
 * Generate unique filename with timestamp and random string
 * @param {string} originalName - Original filename
 * @returns {string} Unique filename
 */
export const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  
  // Sanitize filename
  const sanitizedName = nameWithoutExt
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 20); // Limit name length
  
  return `${timestamp}_${randomId}_${sanitizedName}.${extension}`;
};

/**
 * Delete file from Firebase Storage
 * @param {string} filePath - File path in storage
 * @returns {boolean} Success status
 */
export const deleteFileFromFirebase = async (filePath) => {
  try {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    console.log(`File deleted: ${filePath}`);
    return true;
  } catch (error) {
    console.error('Firebase delete error:', error);
    if (error.code === 'storage/object-not-found') {
      // File doesn't exist, consider it deleted
      return true;
    }
    throw new Error(`Delete failed: ${error.message}`);
  }
};

/**
 * Upload multiple files with progress tracking
 * @param {File[]} files - Array of files to upload
 * @param {string} folder - Storage folder
 * @param {Function} onProgress - Progress callback
 * @param {Object} options - Upload options
 * @returns {Object[]} Array of upload results
 */
export const uploadMultipleFiles = async (files, folder = 'ChatFolder', onProgress = null, options = {}) => {
  const results = [];
  let completed = 0;

  for (const file of files) {
    try {
      const result = await uploadFileToFirebase(file, folder, options);
      results.push(result);
      completed++;
      
      if (onProgress) {
        onProgress({
          completed,
          total: files.length,
          percentage: Math.round((completed / files.length) * 100),
          currentFile: file.name,
        });
      }
    } catch (error) {
      results.push({
        success: false,
        error: error.message,
        filename: file.name,
      });
      completed++;
      
      if (onProgress) {
        onProgress({
          completed,
          total: files.length,
          percentage: Math.round((completed / files.length) * 100),
          currentFile: file.name,
          error: error.message,
        });
      }
    }
  }

  return results;
};

/**
 * Get file info from Firebase Storage URL
 * @param {string} downloadURL - Firebase download URL
 * @returns {Object} File information
 */
export const getFileInfoFromURL = (downloadURL) => {
  try {
    const url = new URL(downloadURL);
    const pathParts = url.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    const folder = pathParts[pathParts.length - 2];
    
    return {
      filename: decodeURIComponent(filename),
      folder: decodeURIComponent(folder),
      fullPath: `${folder}/${filename}`,
      url: downloadURL,
    };
  } catch (error) {
    console.error('Error parsing Firebase URL:', error);
    return null;
  }
};

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateFile = (file, options = {}) => {
  const errors = [];
  
  // Check file size
  const maxSize = options.maxSizeMB || 10;
  if (file.size > maxSize * 1024 * 1024) {
    errors.push(`File size must be less than ${maxSize}MB`);
  }
  
  // Check file type
  const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not allowed. Only images are supported.');
  }
  
  // Check filename length
  if (file.name.length > 255) {
    errors.push('Filename too long');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Create a preview URL for file
 * @param {File} file - File to create preview for
 * @returns {string} Preview URL
 */
export const createFilePreview = (file) => {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file);
  }
  return null;
};

/**
 * Revoke preview URL to free memory
 * @param {string} previewURL - Preview URL to revoke
 */
export const revokeFilePreview = (previewURL) => {
  if (previewURL && previewURL.startsWith('blob:')) {
    URL.revokeObjectURL(previewURL);
  }
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} File extension
 */
export const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

/**
 * Check if file is an image
 * @param {File|string} file - File object or mime type
 * @returns {boolean} True if file is an image
 */
export const isImageFile = (file) => {
  const mimeType = typeof file === 'string' ? file : file.type;
  return mimeType.startsWith('image/');
};

/**
 * Resize image before upload
 * @param {File} file - Image file
 * @param {Object} dimensions - Target dimensions
 * @returns {File} Resized image file
 */
export const resizeImage = async (file, dimensions = {}) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = dimensions;
      
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        },
        file.type,
        quality
      );
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Upload progress tracker
 */
export class UploadProgressTracker {
  constructor() {
    this.uploads = new Map();
    this.listeners = new Set();
  }
  
  addUpload(id, filename, totalSize) {
    this.uploads.set(id, {
      id,
      filename,
      totalSize,
      uploadedSize: 0,
      percentage: 0,
      status: 'uploading',
      startTime: Date.now(),
    });
    this.notifyListeners();
  }
  
  updateProgress(id, uploadedSize) {
    const upload = this.uploads.get(id);
    if (upload) {
      upload.uploadedSize = uploadedSize;
      upload.percentage = Math.round((uploadedSize / upload.totalSize) * 100);
      this.notifyListeners();
    }
  }
  
  completeUpload(id, result) {
    const upload = this.uploads.get(id);
    if (upload) {
      upload.status = result.success ? 'completed' : 'failed';
      upload.result = result;
      upload.endTime = Date.now();
      upload.duration = upload.endTime - upload.startTime;
      this.notifyListeners();
    }
  }
  
  removeUpload(id) {
    this.uploads.delete(id);
    this.notifyListeners();
  }
  
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  notifyListeners() {
    const uploads = Array.from(this.uploads.values());
    this.listeners.forEach(callback => callback(uploads));
  }
  
  getUploads() {
    return Array.from(this.uploads.values());
  }
  
  getActiveUploads() {
    return this.getUploads().filter(upload => upload.status === 'uploading');
  }
  
  clear() {
    this.uploads.clear();
    this.notifyListeners();
  }
}

/**
 * Create a global upload progress tracker instance
 */
export const uploadProgressTracker = new UploadProgressTracker();

/**
 * Upload file with progress tracking
 * @param {File} file - File to upload
 * @param {string} folder - Storage folder
 * @param {Object} options - Upload options
 * @returns {Object} Upload result with progress tracking
 */
export const uploadFileWithProgress = async (file, folder = 'ChatFolder', options = {}) => {
  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  try {
    // Add to progress tracker
    uploadProgressTracker.addUpload(uploadId, file.name, file.size);
    
    // Start upload
    const result = await uploadFileToFirebase(file, folder, options);
    
    // Mark as completed
    uploadProgressTracker.completeUpload(uploadId, result);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      uploadProgressTracker.removeUpload(uploadId);
    }, 3000);
    
    return {
      ...result,
      uploadId,
    };
    
  } catch (error) {
    // Mark as failed
    uploadProgressTracker.completeUpload(uploadId, {
      success: false,
      error: error.message,
    });
    
    // Auto-remove after 5 seconds for failed uploads
    setTimeout(() => {
      uploadProgressTracker.removeUpload(uploadId);
    }, 5000);
    
    throw error;
  }
};

/**
 * Batch upload files with progress tracking
 * @param {File[]} files - Files to upload
 * @param {string} folder - Storage folder
 * @param {Object} options - Upload options
 * @returns {Promise<Object[]>} Upload results
 */
export const batchUploadFiles = async (files, folder = 'ChatFolder', options = {}) => {
  const { maxConcurrent = 3 } = options;
  const results = [];
  
  // Process files in batches
  for (let i = 0; i < files.length; i += maxConcurrent) {
    const batch = files.slice(i, i + maxConcurrent);
    
    const batchResults = await Promise.allSettled(
      batch.map(file => uploadFileWithProgress(file, folder, options))
    );
    
    results.push(...batchResults.map(result => 
      result.status === 'fulfilled' ? result.value : { success: false, error: result.reason.message }
    ));
  }
  
  return results;
};

/**
 * Upload ID verification document to Firebase Storage
 * @param {File} file - ID document file to upload
 * @param {Object} options - Upload options
 * @returns {Object} Upload result with URL and metadata
 */
export const uploadIdDocument = async (file, options = {}) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file size (max 5MB for ID documents)
    const maxSize = options.maxSizeMB || 5;
    if (file.size > maxSize * 1024 * 1024) {
      throw new Error(`File size must be less than ${maxSize}MB`);
    }

    // Validate file type (only images for ID documents)
    const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not allowed. Only image files are supported.');
    }

    // Compress image for optimal storage
    let processedFile = file;
    if (file.type.startsWith('image/')) {
      processedFile = await compressImage(file, {
        maxSizeMB: 2, // Compress to max 2MB for ID documents
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.9, // Higher quality for ID documents
      });
    }

    // Generate unique filename with ID prefix
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 15);
    
    const filename = `id_${timestamp}_${randomId}_${sanitizedName}.${extension}`;
    
    // Create storage reference in id-documents folder
    const storageRef = ref(storage, `id-documents/${filename}`);
    
    // Set metadata for ID documents
    const metadata = {
      contentType: processedFile.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        fileSize: processedFile.size.toString(),
        documentType: 'id_verification',
        uploadType: 'customer_verification',
      }
    };

    // Upload file
    const snapshot = await uploadBytes(storageRef, processedFile, metadata);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      success: true,
      url: downloadURL,
      filename: filename,
      originalName: file.name,
      size: processedFile.size,
      mimeType: processedFile.type,
      path: `id-documents/${filename}`,
      metadata: snapshot.metadata,
      documentType: 'id_verification',
    };

  } catch (error) {
    console.error('ID document upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

/**
 * Default export with all utilities
 */
export default {
  uploadFileToFirebase,
  compressImage,
  generateUniqueFilename,
  deleteFileFromFirebase,
  uploadMultipleFiles,
  getFileInfoFromURL,
  validateFile,
  createFilePreview,
  revokeFilePreview,
  formatFileSize,
  getFileExtension,
  isImageFile,
  resizeImage,
  UploadProgressTracker,
  uploadProgressTracker,
  uploadFileWithProgress,
  batchUploadFiles,
  uploadIdDocument,
};