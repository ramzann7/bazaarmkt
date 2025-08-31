import React, { useState, useEffect } from 'react';
import { getProfile } from '../../services/authservice';
import { useNavigate } from 'react-router-dom';

export default function DashboardMinimal() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('DashboardMinimal: Loading user...');
        const userData = await getProfile();
        console.log('DashboardMinimal: User loaded:', userData);
        setUser(userData);
        setLoading(false);
      } catch (err) {
        console.error('DashboardMinimal: Error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading minimal dashboard...</p>
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Minimal Dashboard Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Info</h2>
          <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <p className="text-green-600">✅ Minimal dashboard is working!</p>
          <p className="text-gray-600">If you can see this, the basic dashboard functionality works.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="block w-full text-left px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Try Full Dashboard
            </button>
            <button
              onClick={() => navigate('/dashboard-simple')}
              className="block w-full text-left px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Simple Dashboard
            </button>
            <button
              onClick={() => navigate('/dashboard-debug')}
              className="block w-full text-left px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Debug Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
