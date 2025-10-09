import React, { useState, useRef } from 'react';
import { CameraIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { updateProfile } from '../services/authservice';
import toast from 'react-hot-toast';
import api from '../services/api';

const ProfilePictureUpload = ({ currentPicture, onUpdate, className = '' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
      setShowPreview(true);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!previewUrl) return;

    setIsUploading(true);
    try {
      // Convert data URL to blob
      const response = await fetch(previewUrl);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('profilePicture', blob, 'profile.jpg');

      // Upload to backend
      const uploadResponse = await api.post('/upload/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (uploadResponse.data.success) {
        const profilePictureUrl = uploadResponse.data.data.profilePicture;

        // Update user profile with new picture URL
        await updateProfile({ profilePicture: profilePictureUrl });

        toast.success('Profile picture updated successfully!');
        setShowPreview(false);
        setPreviewUrl(null);

        // Notify parent component to refresh
        if (onUpdate) {
          onUpdate(profilePictureUrl);
        }
      } else {
        toast.error('Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setShowPreview(false);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className={`relative inline-block ${className}`}>
        {/* Profile Picture Display */}
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
          {currentPicture ? (
            <img
              src={currentPicture}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UserIcon className="w-16 h-16 text-white" />
            </div>
          )}
          
          {/* Camera Button Overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200"
            title="Change profile picture"
          >
            <div className="text-center">
              <CameraIcon className="w-8 h-8 text-white mx-auto mb-1" />
              <span className="text-white text-xs font-medium">Change Photo</span>
            </div>
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-stone-800">Preview Profile Picture</h3>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isUploading}
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Preview Image */}
            <div className="mb-6">
              <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-100">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isUploading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </button>
            </div>

            {/* Info Text */}
            <p className="text-xs text-gray-500 mt-4 text-center">
              Image will be resized to 400x400px and optimized for web
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfilePictureUpload;

