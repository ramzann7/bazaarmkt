import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const SimpleProfileTest = () => {
  console.log("🔍 SimpleProfileTest: Component starting...");
  
  try {
    const { user, isProviderReady } = useAuth();
    
    console.log("🔍 SimpleProfileTest: Auth context loaded:", {
      hasUser: !!user,
      userRole: user?.role,
      isProviderReady
    });
    
    // Redirect patrons to account page
    if (user && (user.role === 'patron' || user.role === 'customer' || user.role === 'buyer')) {
      console.log('🔄 SimpleProfileTest: Patron user detected, redirecting to /account');
      return <Navigate to="/account" replace />;
    }
    
    // Show loading if not ready
    if (!isProviderReady) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing authentication...</p>
          </div>
        </div>
      );
    }
    
    // Show user info
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Simple Profile Test</h1>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-600 mb-2">User Role: <span className="font-semibold">{user?.role || 'None'}</span></p>
            <p className="text-gray-600 mb-2">User ID: <span className="font-semibold">{user?._id || 'None'}</span></p>
            <p className="text-gray-600 mb-4">Email: <span className="font-semibold">{user?.email || 'None'}</span></p>
            <button 
              onClick={() => window.location.href = '/account'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Account
            </button>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("🔍 SimpleProfileTest: Error in component:", error);
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-red-600 text-xl mb-4">SimpleProfileTest Error</h1>
          <p className="text-red-500 mb-4">{error.message}</p>
          <button 
            onClick={() => window.location.href = '/account'}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go to Account
          </button>
        </div>
      </div>
    );
  }
};

export default SimpleProfileTest;
