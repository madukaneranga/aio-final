import React, { useState } from 'react';
import { Upload, X, Image } from 'lucide-react';

const ImageUpload = ({ 
  images = [], 
  onImagesChange, 
  maxImages = 10, 
  multiple = true,
  className = '' 
}) => {
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (multiple) {
      const newImages = [...images, ...imageFiles].slice(0, maxImages);
      onImagesChange(newImages);
    } else {
      onImagesChange(imageFiles.slice(0, 1));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-black bg-gray-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          type="file"
          multiple={multiple}
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-sm text-gray-500">
            PNG, JPG, GIF up to 10MB {multiple && `(max ${maxImages})`}
          </p>
        </label>
      </div>

      {/* Image Preview */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={typeof image === 'string' ? image : URL.createObjectURL(image)}
                alt={`Upload ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Status */}
      {multiple && (
        <p className="text-sm text-gray-500">
          {images.length} of {maxImages} images uploaded
        </p>
      )}
    </div>
  );
};

export default ImageUpload;