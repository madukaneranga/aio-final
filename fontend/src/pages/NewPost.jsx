import React, { useState, useRef } from 'react';
import { Upload, Image, Video, Tag, X, Search, Plus, Clock } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase";

const PostCreator = () => {
  const [postData, setPostData] = useState({
    title: '',
    description: '',
    hashtags: '',
    taggedProducts: [],
    mediaType: null, // 'images' or 'video'
    files: []
  });
  
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef(null);

  // Mock product data - replace with your actual product API call
  const mockProducts = [
    { id: 1, name: 'Premium Black Hoodie', price: '$59.99', image: '/api/placeholder/60/60' },
    { id: 2, name: 'Classic White Sneakers', price: '$89.99', image: '/api/placeholder/60/60' },
    { id: 3, name: 'Minimalist Watch', price: '$199.99', image: '/api/placeholder/60/60' },
    { id: 4, name: 'Designer Sunglasses', price: '$149.99', image: '/api/placeholder/60/60' }
  ];

  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const file = files[0];
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (isVideo) {
      // Video validation (30 seconds max would be checked on backend)
      if (file.size > 100 * 1024 * 1024) { // 100MB limit for videos
        alert('Video file too large. Please keep under 100MB.');
        return;
      }
      setPostData(prev => ({
        ...prev,
        mediaType: 'video',
        files: [file]
      }));
    } else if (isImage) {
      // Handle multiple images (max 5)
      const newImages = [...postData.files, ...files].slice(0, 5);
      setPostData(prev => ({
        ...prev,
        mediaType: 'images',
        files: newImages
      }));
    }
  };

  const removeFile = (index) => {
    setPostData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
      mediaType: prev.files.length === 1 ? null : prev.mediaType
    }));
  };

  // Upload files to Firebase Storage
  const uploadFilesToFirebase = async (files, userId) => {
    const uploadPromises = files.map(async (file, index) => {
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `posts/${userId}/${timestamp}_${file.name}`;
        
        // Create storage reference
        const storageRef = ref(storage, fileName);
        
        // Upload file
        const snapshot = await uploadBytes(storageRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        // Update progress for each file
        const progress = Math.round(((index + 1) / files.length) * 70) + 20;
        setUploadProgress(progress);
        
        return downloadURL;
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        throw new Error(`Failed to upload ${file.name}`);
      }
    });

    return Promise.all(uploadPromises);
  };

  // API call to create post
  const createPostAPI = async (postData) => {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create post');
    }

    return response.json();
  };

  // Product search function
  const searchProducts = async (query) => {
    setProductSearch(query);
    if (query.length > 2) {
      try {
        const response = await fetch(`/api/posts/products/search?q=${encodeURIComponent(query)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.products || []);
        } else {
          // Fallback to mock data if API fails
          const filtered = mockProducts.filter(product =>
            product.name.toLowerCase().includes(query.toLowerCase())
          );
          setSearchResults(filtered);
        }
      } catch (error) {
        console.error('Product search failed:', error);
        // Fallback to mock data
        const filtered = mockProducts.filter(product =>
          product.name.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
      }
    } else {
      setSearchResults([]);
    }
  };

  const tagProduct = (product) => {
    if (!postData.taggedProducts.find(p => p.id === product.id)) {
      setPostData(prev => ({
        ...prev,
        taggedProducts: [...prev.taggedProducts, product]
      }));
    }
    setShowProductSearch(false);
    setProductSearch('');
    setSearchResults([]);
  };

  const removeTaggedProduct = (productId) => {
    setPostData(prev => ({
      ...prev,
      taggedProducts: prev.taggedProducts.filter(p => p.id !== productId)
    }));
  };

  const handleSubmit = async () => {
    if (!postData.title.trim() && !postData.files.length) {
      alert('Please add a title or media to your post');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      let mediaUrls = [];
      
      if (postData.files.length > 0) {
        // Get user ID - replace with actual user ID from your auth context
        const userId = localStorage.getItem('userId') || 'user123';
        
        setUploadProgress(20);
        
        // Upload files to Firebase Storage
        mediaUrls = await uploadFilesToFirebase(postData.files, userId);
        
        setUploadProgress(85);
      }

      // Prepare post data
      const postPayload = {
        title: postData.title.trim(),
        description: postData.description.trim(),
        hashtags: postData.hashtags,
        taggedProducts: postData.taggedProducts.map(p => p.id),
        mediaUrls
      };

      // Create post via API
      const response = await createPostAPI(postPayload);
      
      setUploadProgress(100);
      
      setTimeout(() => {
        alert('Post created successfully!');
        // Reset form
        setPostData({
          title: '',
          description: '',
          hashtags: '',
          taggedProducts: [],
          mediaType: null,
          files: []
        });
        setIsUploading(false);
        setUploadProgress(0);
        
        // Optional: Redirect to feed or user profile
        // window.location.href = '/feed';
      }, 500);

    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
      setUploadProgress(0);
      alert(`Failed to create post: ${error.message}`);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-black">Create Post</h2>
        <p className="text-sm text-gray-600 mt-1">Share your thoughts, products, or experiences</p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
          <input
            type="text"
            placeholder="Give your post a catchy title..."
            value={postData.title}
            onChange={(e) => setPostData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 placeholder-gray-500"
            maxLength={100}
          />
          <div className="text-xs text-gray-400 text-right mt-1">
            {postData.title.length}/100
          </div>
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            placeholder="Tell your story, share details, add context..."
            value={postData.description}
            onChange={(e) => setPostData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 placeholder-gray-500"
            rows={4}
            maxLength={1000}
          />
          <div className="text-xs text-gray-400 text-right mt-1">
            {postData.description.length}/1000
          </div>
        </div>

        {/* Hashtags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
          <input
            type="text"
            placeholder="#fashion #lifestyle #trending #sale #newdrop"
            value={postData.hashtags}
            onChange={(e) => setPostData(prev => ({ ...prev, hashtags: e.target.value }))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 placeholder-gray-500"
          />
        </div>

        {/* Media Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          {postData.files.length === 0 ? (
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Upload className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Upload images or video to make your post stand out
              </p>
              <div className="flex gap-2 justify-center">
                <label className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors text-sm flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Images (Max 5)
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleMediaUpload}
                    className="hidden"
                  />
                </label>
                <label className="border border-black text-black px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Video (30s)
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleMediaUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Choose either multiple images OR one video per post
              </p>
            </div>
          ) : (
            <div>
              {/* Media Preview */}
              {postData.mediaType === 'video' ? (
                <div className="relative">
                  <video
                    src={URL.createObjectURL(postData.files[0])}
                    className="w-full h-48 object-cover rounded-lg"
                    controls
                  />
                  <button
                    onClick={() => removeFile(0)}
                    className="absolute top-2 right-2 bg-black text-white rounded-full p-1 hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Video
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {postData.files.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-black text-white rounded-full p-1 hover:bg-gray-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {postData.files.length < 5 && (
                    <label className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                      <Plus className="h-6 w-6 text-gray-400" />
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleMediaUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Product Tagging */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Tag Products</label>
            <button
              onClick={() => setShowProductSearch(!showProductSearch)}
              className="text-black hover:bg-gray-100 p-1 rounded transition-colors"
            >
              <Tag className="h-4 w-4" />
            </button>
          </div>

          {/* Tagged Products Display */}
          {postData.taggedProducts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {postData.taggedProducts.map((product) => (
                <div key={product.id} className="bg-gray-100 border border-gray-200 rounded-lg p-2 flex items-center gap-2 text-sm">
                  <img src={product.image} alt={product.name} className="w-6 h-6 rounded" />
                  <span className="text-gray-700">{product.name}</span>
                  <button
                    onClick={() => removeTaggedProduct(product.id)}
                    className="text-gray-500 hover:text-red-500 ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Product Search */}
          {showProductSearch && (
            <div className="relative">
              <div className="flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products to tag..."
                  value={productSearch}
                  onChange={(e) => searchProducts(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900"
                />
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-10 max-h-48 overflow-y-auto">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => tagProduct(product)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="text-left flex-1">
                        <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                        <p className="text-xs text-gray-600">{product.price}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
        {isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Uploading post...</span>
              <span className="text-black font-medium">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-black h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!postData.title.trim() && !postData.files.length}
            className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            Share Post
          </button>
        )}
      </div>
    </div>
  );
};

export default PostCreator;