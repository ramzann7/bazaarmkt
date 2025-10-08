import React, { useState } from 'react';
import { loginUser, getProfile } from '../../services/authservice';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function LoginDebug() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setDebugInfo({});

    try {
      console.log('LoginDebug: Starting login process...');
      console.log('LoginDebug: Email:', formData.email);
      
      // Step 1: Attempt login
      console.log('LoginDebug: Step 1 - Calling loginUser...');
      const loginResult = await loginUser(formData);
      console.log('LoginDebug: Login result:', loginResult);
      
      setDebugInfo(prev => ({
        ...prev,
        loginSuccess: true,
        loginResult: loginResult
      }));

      // Step 2: Get profile
      console.log('LoginDebug: Step 2 - Getting profile...');
      const profile = await getProfile();
      console.log('LoginDebug: Profile result:', profile);
      
      setDebugInfo(prev => ({
        ...prev,
        profileSuccess: true,
        profile: profile
      }));

      // Step 3: Check if user is artisan
      if (profile.role === 'artisan' || profile.role === 'producer' || profile.role === 'food_maker') {
        console.log('LoginDebug: User is artisan, navigating to dashboard...');
        toast.success('Login successful! Redirecting to dashboard...');
        navigate('/dashboard');
      } else {
        console.log('LoginDebug: User is not artisan, role:', profile.role);
        setDebugInfo(prev => ({
          ...prev,
          userRole: profile.role,
          isArtisan: false
        }));
        toast.error('This account is not an artisan account');
      }

    } catch (error) {
      console.error('LoginDebug: Error during login:', error);
      setDebugInfo(prev => ({
        ...prev,
        error: {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        }
      }));
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testBackendConnection = async () => {
    try {
      console.log('LoginDebug: Testing backend connection...');
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('LoginDebug: Backend response status:', response.status);
      setDebugInfo(prev => ({
        ...prev,
        backendTest: {
          status: response.status,
          ok: response.ok
        }
      }));
    } catch (error) {
      console.error('LoginDebug: Backend connection error:', error);
      setDebugInfo(prev => ({
        ...prev,
        backendTest: {
          error: error.message
        }
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Login Debug Tool</h1>
        
        {/* Login Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Login</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Logging in...' : 'Test Login'}
              </button>
              <button
                type="button"
                onClick={testBackendConnection}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Test Backend
              </button>
            </div>
          </form>
        </div>

        {/* Debug Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">Current Token:</h3>
              <p className="text-sm text-gray-600 font-mono bg-gray-100 p-2 rounded">
                {localStorage.getItem('token') || 'No token found'}
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Debug Results:</h3>
              <pre className="text-sm text-gray-600 bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Try Dashboard
            </button>
            <button
              onClick={() => navigate('/dashboard-debug')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Dashboard Debug
            </button>
            <button
              onClick={() => localStorage.clear()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Clear Storage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
