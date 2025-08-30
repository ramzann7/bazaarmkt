import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authToken, getProfile } from '../services/authService';
import { guestService } from '../services/guestService';
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
      const isGuest = guestService.isGuestUser();
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
        // New user - redirect to profile setup regardless of role
        setRedirectPath('/profile');
        return;
      }

      // Returning users - route based on role
      if (userRole === 'artisan' || userRole === 'producer' || userRole === 'food_maker') {
        // Artisans go to orders page to check for new orders
        try {
          const orders = await orderService.getArtisanOrders();
          const hasNewOrders = orders.some(order => 
            order.status === 'pending' || order.status === 'confirmed'
          );
          
          if (hasNewOrders) {
            // Has new orders - go to orders page
            setRedirectPath('/orders');
          } else {
            // No new orders - go to dashboard
            setRedirectPath('/dashboard');
          }
        } catch (error) {
          console.error('Error checking artisan orders:', error);
          // Fallback to dashboard
          setRedirectPath('/dashboard');
        }
      } else {
        // Patrons and other users go to homepage to see products
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
