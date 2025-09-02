import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authToken, getProfile } from '../services/authService';
import { cartService } from '../services/cartService';
import { onboardingService } from '../services/onboardingService';
import { orderService } from '../services/orderService';

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
      const isGuest = cartService.isGuestUser();
      if (isGuest) {
        // Guest users go to homepage
        setRedirectPath('/');
        return;
      }

      // Get user profile to check role and onboarding status
      const profile = await getProfile();
      const userId = profile._id;
      const userRole = profile.role;
      
      // Check if user is new (first time after registration)
      const isNewUser = onboardingService.isNewUser(userId);
      
      if (isNewUser) {
        // For existing artisan users, mark onboarding as completed automatically
        if (userRole === 'artisan' || userRole === 'producer' || userRole === 'food_maker') {
          onboardingService.markOnboardingCompleted(userId);
          console.log('Auto-marked onboarding as completed for existing artisan user');
        } else {
          // New user - redirect to profile setup for non-artisan users
          setRedirectPath('/profile');
          return;
        }
      }

      // Returning users - route based on role
      if (userRole === 'artisan' || userRole === 'producer' || userRole === 'food_maker') {
        // For artisans, always go to dashboard first
        // Orders will be checked and displayed on the dashboard
        setRedirectPath('/dashboard');
      } else {
        // Patrons and other users go to homepage to see products
        // Dashboard is now artisan-only
        setRedirectPath('/');
      }
      
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
