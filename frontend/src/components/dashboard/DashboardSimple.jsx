import React, { useState, useEffect } from 'react';
import { getProfile, logoutUser } from '../../services/authservice';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function DashboardSimple() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        console.log('DashboardSimple: Starting to load...');
        
        // Step 1: Get user profile
        console.log('DashboardSimple: Getting user profile...');
        const userData = await getProfile();
        console.log('DashboardSimple: User profile loaded:', userData);
        setUser(userData);

        // Step 2: Check if user is artisan
        if (userData.role !== 'artisan' && userData.role !== 'producer' && userData.role !== 'food_maker') {
          console.log('DashboardSimple: User is not an artisan, redirecting...');
          toast.error("Dashboard is only available for artisans");
          navigate("/");
          return;
        }

        console.log('DashboardSimple: User is artisan, proceeding...');
        setLoading(false);
        
      } catch (error) {
        console.error('DashboardSimple: Error loading dashboard:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  const handleLogout = () => {
    logoutUser();
    toast.success("Logged out successfully!");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading simple dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Simple Artisan Dashboard</h1>
              <p className="text-gray-600 mt-2">Welcome back, {user?.firstName}!</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Reload
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Role:</strong> {user?.role}</p>
              <p><strong>User ID:</strong> {user?._id}</p>
            </div>
            <div>
              <p><strong>Dashboard Status:</strong> <span className="text-green-600">✅ Working</span></p>
              <p><strong>Component:</strong> Simple Dashboard</p>
            </div>
          </div>
        </div>

        {/* Simple Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Dashboard Status</h3>
            <p className="text-3xl font-bold text-green-600">✅ Working</p>
            <p className="text-sm text-gray-600">Simple dashboard loaded successfully</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User Role</h3>
            <p className="text-3xl font-bold text-blue-600">{user?.role}</p>
            <p className="text-sm text-gray-600">Artisan access confirmed</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Next Steps</h3>
            <p className="text-3xl font-bold text-orange-600">→</p>
            <p className="text-sm text-gray-600">Try the full dashboard now</p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Dashboard Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Try Full Dashboard
            </button>
            <button
              onClick={() => navigate('/dashboard-debug')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Debug Dashboard
            </button>
            <button
              onClick={() => navigate('/dashboard-test')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Test Components
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
