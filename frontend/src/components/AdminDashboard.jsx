import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  CubeIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { authToken, getProfile } from '../services/authservice';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import adminService from '../services/adminService';

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const token = authToken.getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const profile = await getProfile();
      if (profile.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.');
        navigate('/');
        return;
      }

      setCurrentUser(profile);
      
      // Load dashboard stats
      const dashboardStats = await adminService.getStats();
      setStats(dashboardStats);
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast.error('Authentication error');
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const adminSections = [
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage all users, view profiles, and control access',
      icon: UsersIcon,
      color: 'bg-blue-500',
      path: '/admin/users'
    },
    {
      id: 'products',
      title: 'Product Management',
      description: 'Manage products, set featured items, and control listings',
      icon: CubeIcon,
      color: 'bg-green-500',
      path: '/admin/products'
    },
    {
      id: 'artisans',
      title: 'Artisan Management',
      description: 'View all artisans and their business information',
      icon: UserGroupIcon,
      color: 'bg-purple-500',
      path: '/admin/artisans'
    },
    {
      id: 'revenue',
      title: 'Revenue Management',
      description: 'Track GMV, platform revenue, payouts, and financial metrics',
      icon: CurrencyDollarIcon,
      color: 'bg-emerald-500',
      path: '/admin/revenue'
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      description: 'View platform statistics and user activity',
      icon: ChartBarIcon,
      color: 'bg-orange-500',
      path: '/admin/analytics'
    },
    {
      id: 'promotional',
      title: 'Promotional Dashboard',
      description: 'Manage spotlight subscriptions and promotional revenue',
      icon: SparklesIcon,
      color: 'bg-amber-500',
      path: '/admin/promotional'
    },
    {
      id: 'platform-settings',
      title: 'Platform Settings',
      description: 'Configure platform fees, payout settings, and general settings',
      icon: CogIcon,
      color: 'bg-purple-500',
      path: '/admin/platform-settings'
    },
    {
      id: 'geographic-settings',
      title: 'Geographic Settings',
      description: 'Configure geographic restrictions and address validation',
      icon: GlobeAltIcon,
      color: 'bg-indigo-500',
      path: '/admin/geographic-settings'
    },
    {
      id: 'geographic-test',
      title: 'Geographic Testing',
      description: 'Test geographic restrictions and address validation',
      icon: ShieldCheckIcon,
      color: 'bg-teal-500',
      path: '/admin/geographic-test'
    },
    {
      id: 'settings',
      title: 'Admin Settings',
      description: 'Configure platform settings and admin preferences',
      icon: CogIcon,
      color: 'bg-gray-500',
      path: '/admin/settings'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {currentUser?.firstName} {currentUser?.lastName}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-blue-100 px-3 py-1 rounded-full">
                <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Admin</span>
              </div>
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                Back to Site
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UsersIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats ? stats.totalUsers : 'Loading...'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CubeIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats ? stats.totalProducts : 'Loading...'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserGroupIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Artisans</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats ? stats.totalArtisans : 'Loading...'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Featured Products</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats ? stats.featuredProducts : 'Loading...'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => (
            <div
              key={section.id}
              onClick={() => navigate(section.path)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${section.color} group-hover:scale-110 transition-transform`}>
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 ml-3">
                  {section.title}
                </h3>
              </div>
              <p className="text-gray-600 text-sm">
                {section.description}
              </p>
              <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                Access Section
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center text-gray-500 py-8">
              <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity to display</p>
              <p className="text-sm">Activity tracking will be available soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
