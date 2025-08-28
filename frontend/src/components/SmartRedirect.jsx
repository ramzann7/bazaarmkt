import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authToken, getProfile } from '../services/authService';
import { guestService } from '../services/guestService';
import { onboardingService } from '../services/onboardingService';

export default function SmartRedirect() {
  const [redirectPath, setRedirectPath] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    determineRedirect();
  }, []);

  const determineRedirect = async () => {
    try {
      const token = authToken.getToken();
      
      if (!token) {
        // No token - new visitor, go to homepage
        setRedirectPath('/');
        return;
      }

      // Check if it's a guest user
      const isGuest = guestService.isGuestUser();
      if (isGuest) {
        // Guest users go to homepage
        setRedirectPath('/');
        return;
      }

      // Get user profile to check if they're new
      const profile = await getProfile();
      const userId = profile._id;
      
      // Check if user is new (first time after registration)
      const isNewUser = onboardingService.isNewUser(userId);
      
      if (isNewUser) {
        // New user - redirect to profile setup
        setRedirectPath('/profile');
        return;
      }

      // Returning user - go to homepage
      setRedirectPath('/');
      
    } catch (error) {
      console.error('Error determining redirect:', error);
      // Fallback to homepage
      setRedirectPath('/');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-stone-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <Navigate to={redirectPath} replace />;
}
