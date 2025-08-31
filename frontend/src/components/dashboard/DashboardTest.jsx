import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '../../services/authservice';
import { orderService } from '../../services/orderService';
import { revenueService } from '../../services/revenueService';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardTest() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isProviderReady } = useAuth();
  const [testResults, setTestResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    const results = {};

    try {
      // Test 1: Check authentication
      results.auth = {
        isAuthenticated,
        isProviderReady,
        hasUser: !!user,
        userRole: user?.role,
        userId: user?._id
      };

      // Test 2: Check profile loading
      try {
        const profile = await getProfile();
        results.profile = {
          success: true,
          data: profile,
          role: profile.role,
          isArtisan: profile.role === 'artisan' || profile.role === 'producer' || profile.role === 'food_maker'
        };
      } catch (error) {
        results.profile = {
          success: false,
          error: error.message
        };
      }

      // Test 3: Check orders loading
      try {
        const orders = await orderService.getArtisanOrders();
        results.orders = {
          success: true,
          count: Array.isArray(orders) ? orders.length : 0,
          data: orders
        };
      } catch (error) {
        results.orders = {
          success: false,
          error: error.message
        };
      }

      // Test 4: Check revenue loading
      try {
        const revenue = await revenueService.getArtisanRevenueSummary('month');
        results.revenue = {
          success: true,
          data: revenue
        };
      } catch (error) {
        results.revenue = {
          success: false,
          error: error.message
        };
      }

      // Test 5: Check dashboard navigation
      results.navigation = {
        currentPath: window.location.pathname,
        canAccessDashboard: user?.role === 'artisan' || user?.role === 'producer' || user?.role === 'food_maker'
      };

    } catch (error) {
      results.generalError = error.message;
    }

    setTestResults(results);
    setIsLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-stone-900 mb-4">Dashboard Test Results</h1>
          
          <div className="mb-4">
            <button
              onClick={runTests}
              disabled={isLoading}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {isLoading ? 'Running Tests...' : 'Run Tests Again'}
            </button>
          </div>

          <div className="space-y-4">
            {/* Authentication Test */}
            <div className="border border-stone-200 rounded-lg p-4">
              <h3 className="font-semibold text-stone-900 mb-2">Authentication Test</h3>
              <pre className="text-sm bg-stone-100 p-2 rounded overflow-auto">
                {JSON.stringify(testResults.auth, null, 2)}
              </pre>
            </div>

            {/* Profile Test */}
            <div className="border border-stone-200 rounded-lg p-4">
              <h3 className="font-semibold text-stone-900 mb-2">Profile Test</h3>
              <pre className="text-sm bg-stone-100 p-2 rounded overflow-auto">
                {JSON.stringify(testResults.profile, null, 2)}
              </pre>
            </div>

            {/* Orders Test */}
            <div className="border border-stone-200 rounded-lg p-4">
              <h3 className="font-semibold text-stone-900 mb-2">Orders Test</h3>
              <pre className="text-sm bg-stone-100 p-2 rounded overflow-auto">
                {JSON.stringify(testResults.orders, null, 2)}
              </pre>
            </div>

            {/* Revenue Test */}
            <div className="border border-stone-200 rounded-lg p-4">
              <h3 className="font-semibold text-stone-900 mb-2">Revenue Test</h3>
              <pre className="text-sm bg-stone-100 p-2 rounded overflow-auto">
                {JSON.stringify(testResults.revenue, null, 2)}
              </pre>
            </div>

            {/* Navigation Test */}
            <div className="border border-stone-200 rounded-lg p-4">
              <h3 className="font-semibold text-stone-900 mb-2">Navigation Test</h3>
              <pre className="text-sm bg-stone-100 p-2 rounded overflow-auto">
                {JSON.stringify(testResults.navigation, null, 2)}
              </pre>
            </div>

            {/* General Error */}
            {testResults.generalError && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h3 className="font-semibold text-red-900 mb-2">General Error</h3>
                <p className="text-red-700">{testResults.generalError}</p>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Test Dashboard Navigation
            </button>
            <button
              onClick={() => navigate('/dashboard-fixed')}
              className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Test Dashboard-Fixed Navigation
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="block w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Test Profile Navigation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
