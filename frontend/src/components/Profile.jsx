import React, { useState, useEffect } from 'react';
import BuyerProfile from './BuyerProfile';
import ArtisanProfile from './ArtisanProfile';
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

  // Route to appropriate profile based on user role
  if (userRole === 'artisan') {
    return <ArtisanProfile />;
  } else {
    return <BuyerProfile />;
  }
}
