import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CameraIcon,
  UserIcon,
  MapPinIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { getProfile } from '../services/authservice';
import { profileService } from '../services/profileService';
import toast from 'react-hot-toast';

export default function ArtisanShopSetup() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    tagline: '',
    bio: '',
    bannerImage: null,
    profileImage: null
  });
  const [previewBanner, setPreviewBanner] = useState(null);
  const [previewProfile, setPreviewProfile] = useState(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const userData = await getProfile();
      setUser(userData);
      
      // Pre-fill form with existing data
      setFormData({
        tagline: userData.tagline || '',
        bio: userData.bio || '',
        bannerImage: null,
        profileImage: null
      });
      
      if (userData.bannerImage) {
        setPreviewBanner(userData.bannerImage);
      }
      if (userData.profileImage) {
        setPreviewProfile(userData.profileImage);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (field, file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (field === 'bannerImage') {
          setPreviewBanner(e.target.result);
        } else {
          setPreviewProfile(e.target.result);
        }
      };
      reader.readAsDataURL(file);
      
      setFormData(prev => ({
        ...prev,
        [field]: file
      }));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Prepare update data
      const updateData = {
        tagline: formData.tagline,
        bio: formData.bio
      };
      
      // Handle image uploads (simplified - in real app you'd upload to server)
      if (formData.bannerImage) {
        updateData.bannerImage = previewBanner;
      }
      if (formData.profileImage) {
        updateData.profileImage = previewProfile;
      }
      
      await profileService.updateProfile(updateData);
      
      toast.success('Shop profile updated successfully!');
      navigate(`/shop/${user._id}`);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getCompletionPercentage = () => {
    let completed = 0;
    if (formData.tagline) completed += 25;
    if (formData.bio) completed += 25;
    if (previewBanner) completed += 25;
    if (previewProfile) completed += 25;
    return completed;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Please log in to set up your shop.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const completionPercentage = getCompletionPercentage();

  return (
    <div className="min-h-screen bg-primary-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Set Up Your Artisan Shop</h1>
          <p className="text-lg text-gray-600 mb-6">
            Make your shop personal and connect with your customers
          </p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className="bg-primary h-3 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">{completionPercentage}% Complete</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-6">
            {/* Tagline */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2 text-primary" />
                Shop Tagline
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                A short, catchy description that captures your craft and story.
              </p>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleInputChange('tagline', e.target.value)}
                placeholder="e.g., 'Handcrafted jams made from Montreal berries'"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-2">
                {formData.tagline.length}/100 characters
              </p>
            </div>

            {/* Bio */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserIcon className="w-5 h-5 mr-2 text-primary" />
                Your Story
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Share your journey, passion, and what makes your products special.
              </p>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell your story... How did you start? What inspires you? What makes your products unique?"
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-2">
                {formData.bio.length}/500 characters
              </p>
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-6">
            {/* Banner Image */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CameraIcon className="w-5 h-5 mr-2 text-primary" />
                Banner Image
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Show your workspace, ingredients, or finished products. This appears at the top of your shop.
              </p>
              
              <div className="space-y-4">
                {previewBanner ? (
                  <div className="relative">
                    <img
                      src={previewBanner}
                      alt="Banner preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setPreviewBanner(null);
                        setFormData(prev => ({ ...prev, bannerImage: null }));
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <span className="sr-only">Remove</span>
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-amber-400 transition-colors">
                    <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Upload a banner image</p>
                    <p className="text-sm text-gray-500">Recommended: 1200x400 pixels</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('bannerImage', e.target.files[0])}
                      className="hidden"
                      id="banner-upload"
                    />
                    <label
                      htmlFor="banner-upload"
                      className="mt-4 inline-block bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark cursor-pointer"
                    >
                      Choose Image
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Image */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserIcon className="w-5 h-5 mr-2 text-primary" />
                Profile Photo
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                A photo of you or your logo. This helps customers connect with the maker.
              </p>
              
              <div className="space-y-4">
                {previewProfile ? (
                  <div className="relative">
                    <img
                      src={previewProfile}
                      alt="Profile preview"
                      className="w-24 h-24 object-cover rounded-full mx-auto"
                    />
                    <button
                      onClick={() => {
                        setPreviewProfile(null);
                        setFormData(prev => ({ ...prev, profileImage: null }));
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <span className="sr-only">Remove</span>
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-full p-8 text-center hover:border-amber-400 transition-colors w-32 h-32 mx-auto">
                    <UserIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-600">Upload photo</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('profileImage', e.target.files[0])}
                      className="hidden"
                      id="profile-upload"
                    />
                    <label
                      htmlFor="profile-upload"
                      className="mt-2 inline-block bg-primary text-white px-3 py-1 rounded text-xs hover:bg-primary-dark cursor-pointer"
                    >
                      Choose
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-12">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Skip for Now
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <CheckCircleIcon className="w-5 h-5" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save & View Shop'}</span>
            <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tips */}
        <div className="mt-12 bg-primary-100 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-4">💡 Tips for a Great Shop</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-primary-800">
            <div>
              <p className="font-medium mb-2">Tagline Ideas:</p>
              <ul className="space-y-1">
                <li>• "Handmade sourdough from Verdun since 2015"</li>
                <li>• "Fresh jams from our family orchard"</li>
                <li>• "Artisan breads, made with love"</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2">Story Elements:</p>
              <ul className="space-y-1">
                <li>• How you got started</li>
                <li>• Your inspiration</li>
                <li>• What makes you unique</li>
                <li>• Your connection to the community</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
