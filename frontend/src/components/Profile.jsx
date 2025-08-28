import React, { useState, useEffect } from 'react';
import { profileService } from '../services/profileService';
import { getProfile } from '../services/authService';
import toast from 'react-hot-toast';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      console.log('Loading profile...');
      
      // Get user profile from auth service
      const userData = await getProfile();
      setUserRole(userData.role);
      
      // Get artisan profile if user is artisan
      if (userData.role === 'artisan') {
        const artisanProfile = await profileService.getProfile();
        setProfile(artisanProfile);
      } else {
        setProfile(userData);
      }
      
      console.log('Profile loaded:', profile);
    } catch (error) {
      console.error('Error loading profile:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load your profile information.</p>
          <button 
            onClick={loadProfile}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Profile Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              {userRole === 'artisan' ? 'Artisan Profile' : 'User Profile'}
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your account information and preferences
            </p>
          </div>

          {/* Profile Content */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {profile.firstName} {profile.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{profile.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{profile.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{userRole}</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member Since</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  {userRole === 'artisan' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Business Name</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {profile.businessName || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Specialties</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {profile.specialties?.join(', ') || 'Not specified'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex space-x-4">
                <button
                  onClick={() => window.location.href = '/account'}
                  className="btn-primary"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => window.location.href = '/orders'}
                  className="btn-secondary"
                >
                  View Orders
                </button>
                {userRole === 'artisan' && (
                  <button
                    onClick={() => window.location.href = '/products'}
                    className="btn-secondary"
                  >
                    Manage Products
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
