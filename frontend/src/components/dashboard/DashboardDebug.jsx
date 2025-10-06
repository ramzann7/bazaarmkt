import React, { useState, useEffect } from 'react';
import { getProfile } from '../../services/authservice';
import { orderService } from '../../services/orderService';
import { revenueService } from '../../services/revenueService';
import { useNavigate } from 'react-router-dom';

export default function DashboardDebug() {
  const [debugLog, setDebugLog] = useState([]);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const addLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry, data);
    setDebugLog(prev => [...prev, { message: logEntry, data }]);
  };

  useEffect(() => {
    const debugDashboard = async () => {
      addLog('🚀 Starting dashboard debug...');
      
      try {
        // Step 1: Load user profile
        addLog('Step 1: Loading user profile...');
        const userData = await getProfile();
        addLog('✅ User profile loaded', userData);
        setUser(userData);

        // Step 2: Check user role
        addLog('Step 2: Checking user role...');
        const userRole = userData.role || userData.userType; // Check both role and userType for compatibility
        if (userRole !== 'artisan' && userRole !== 'producer' && userRole !== 'food_maker') {
          addLog('❌ User is not an artisan, should redirect to home');
          return;
        }
        addLog('✅ User is an artisan');

        // Step 3: Load orders
        addLog('Step 3: Loading orders...');
        try {
          const ordersData = await orderService.getArtisanOrders();
          addLog('✅ Orders loaded', { count: ordersData.length, data: ordersData });
          setOrders(ordersData);
        } catch (error) {
          addLog('❌ Error loading orders', error);
        }

        // Step 4: Load revenue data
        addLog('Step 4: Loading revenue data...');
        try {
          const revenueData = await revenueService.getArtisanRevenueSummary('month');
          addLog('✅ Revenue loaded', revenueData);
          setRevenue(revenueData);
        } catch (error) {
          addLog('❌ Error loading revenue', error);
        }

        addLog('✅ Dashboard debug completed successfully');
      } catch (error) {
        addLog('❌ Error in dashboard debug', error);
      } finally {
        setLoading(false);
      }
    };

    debugDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Debugging dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Debug</h1>
        
        {/* Debug Log */}
        <div className="bg-black text-green-400 p-4 rounded-lg mb-6 font-mono text-sm max-h-96 overflow-y-auto">
          <h2 className="text-white mb-2">Debug Log:</h2>
          {debugLog.map((log, index) => (
            <div key={index} className="mb-1">
              {log.message}
              {log.data && (
                <pre className="text-xs mt-1 text-gray-300">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>

        {/* User Data */}
        {user && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">User Data</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
              </div>
              <div>
                <p><strong>User ID:</strong> {user._id}</p>
                <p><strong>Created:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                <p><strong>Active:</strong> {user.isActive ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Orders Data */}
        {orders && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Orders Data</h2>
            <p><strong>Total Orders:</strong> {orders.length}</p>
            {orders.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Recent Orders:</h3>
                <div className="space-y-2">
                  {orders.slice(0, 3).map((order, index) => (
                    <div key={index} className="border p-2 rounded">
                      <p><strong>Order ID:</strong> {order._id}</p>
                      <p><strong>Status:</strong> {order.status}</p>
                      <p><strong>Amount:</strong> ${order.totalAmount}</p>
                      <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Revenue Data */}
        {revenue && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Revenue Data</h2>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(revenue, null, 2)}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Main Dashboard
          </button>
          <button
            onClick={() => navigate('/dashboard-test-simple')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Try Simple Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Reload Debug
          </button>
        </div>
      </div>
    </div>
  );
}
