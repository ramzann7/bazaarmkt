import React, { useState, useEffect } from 'react';
import { getProfile, logoutUser } from '../../services/authservice';
import { onboardingService } from '../../services/onboardingService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function UserRoleCheck() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const userData = await getProfile();
        setUser(userData);
        
        // Check if user is marked as new
        const newUserStatus = onboardingService.isNewUser(userData._id);
        setIsNewUser(newUserStatus);
        
        console.log('Current user data:', userData);
        console.log('Is new user:', newUserStatus);
      } catch (error) {
        console.error('Error getting user profile:', error);
        toast.error('Failed to get user profile');
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  const handleLogout = () => {
    logoutUser();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleCreateArtisanAccount = () => {
    navigate('/register');
  };

  const handleMarkOnboardingCompleted = () => {
    if (user) {
      onboardingService.markOnboardingCompleted(user._id);
      setIsNewUser(false);
      toast.success('Onboarding marked as completed! You can now access the dashboard.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking user role...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">User Role Check</h1>
        
        {user ? (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Current User Information:</h2>
              <div className="space-y-1 text-sm">
                <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'artisan' ? 'bg-green-100 text-green-800' :
                    user.role === 'patron' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </p>
                <p><strong>User ID:</strong> {user._id}</p>
                <p><strong>Onboarding Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    isNewUser ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {isNewUser ? 'New User' : 'Completed'}
                  </span>
                </p>
              </div>
            </div>

            {user.role === 'artisan' || user.role === 'producer' || user.role === 'food_maker' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">✅ Artisan Access Confirmed</h3>
                <p className="text-green-700 text-sm mb-4">
                  You have artisan privileges. The dashboard should work correctly for you.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-blue-800 text-sm mb-2">
                    🔧 <strong>Dashboard Access Fix:</strong> If the dashboard is redirecting to profile, click this button to fix it.
                  </p>
                  <button
                    onClick={handleMarkOnboardingCompleted}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Fix Dashboard Access
                  </button>
                </div>
                
                {isNewUser && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-yellow-800 text-sm mb-2">
                      ⚠️ <strong>Issue Found:</strong> You're marked as a new user, which is causing the dashboard to redirect to profile.
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Go to Artisan Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/dashboard-test')}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Test Dashboard Components
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Patron Account Detected</h3>
                <p className="text-yellow-700 text-sm mb-4">
                  You're currently logged in as a patron. The artisan dashboard is only available for artisan accounts.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={handleCreateArtisanAccount}
                    className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Create Artisan Account
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Go to Homepage
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600 mb-4">No user data found. You may need to log in.</p>
            <button
              onClick={() => navigate('/login')}
              className="bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
