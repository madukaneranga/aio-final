export const validateMediaUrls = (mediaUrls) => {
  if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) {
    throw new Error('At least one media URL is required');
  }

  // Check if URLs are valid Firebase Storage URLs
  const firebaseStoragePattern = /^https:\/\/firebasestorage\.googleapis\.com\//;
  
  for (const url of mediaUrls) {
    if (!firebaseStoragePattern.test(url)) {
      throw new Error('Invalid media URL format');
    }
  }

  return true;
};

export const determineMediaType = (mediaUrls) => {
  // Check first URL to determine type (frontend should ensure consistency)
  const url = mediaUrls[0];
  
  // Extract file extension from Firebase URL
  const urlParts = url.split('?')[0]; // Remove query params
  const extension = urlParts.split('.').pop().toLowerCase();
  
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const videoExtensions = ['mp4', 'mov', 'avi', 'webm'];
  
  if (imageExtensions.includes(extension)) {
    return 'images';
  } else if (videoExtensions.includes(extension)) {
    return 'video';
  } else {
    throw new Error('Unsupported media type');
  }
};