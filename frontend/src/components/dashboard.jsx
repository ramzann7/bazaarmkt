import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  UserIcon, 
  ShoppingBagIcon, 
  ClockIcon, 
  StarIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CogIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";
import { getProfile, logoutUser } from "../services/authService";
import toast from "react-hot-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration
  const [stats] = useState({
    totalOrders: 12,
    totalSpent: 245.50,
    favoriteRestaurants: 3,
    averageRating: 4.8
  });

  const [recentOrders] = useState([
    {
      id: 1,
      restaurant: "Halal Delights",
      items: ["Chicken Shawarma", "Falafel Wrap"],
      total: 28.50,
      status: "delivered",
      date: "2024-01-15"
    },
    {
      id: 2,
      restaurant: "Spice Garden",
      items: ["Butter Chicken", "Naan Bread"],
      total: 32.00,
      status: "preparing",
      date: "2024-01-14"
    },
    {
      id: 3,
      restaurant: "Fresh & Healthy",
      items: ["Greek Salad", "Grilled Fish"],
      total: 24.75,
      status: "delivered",
      date: "2024-01-13"
    }
  ]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await getProfile();
        setUser(data.user);
      } catch (err) {
        toast.error("Session expired. Please login again.");
        logoutUser();
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    logoutUser();
    toast.success("Logged out successfully!");
    navigate("/");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "preparing":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user.name}!</p>
        </div>

        {/* User Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <MapPinIcon className="w-4 h-4 mr-1" />
                  <span>Saint-Hubert, QC</span>
                </div>
                <div className="flex items-center">
                  <StarIcon className="w-4 h-4 mr-1 text-yellow-400" />
                  <span>{stats.averageRating} rating</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="btn-secondary">
                <CogIcon className="w-4 h-4 mr-2" />
                Settings
              </button>
              <button onClick={handleLogout} className="btn-secondary text-red-600 hover:text-red-700">
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ShoppingBagIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalSpent}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <StarIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Favorite Places</p>
                <p className="text-2xl font-bold text-gray-900">{stats.favoriteRestaurants}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Rating</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Recent Orders</h3>
            <button 
              onClick={() => navigate("/orders")}
              className="text-orange-500 hover:text-orange-600 font-medium flex items-center"
            >
              View all
              <ArrowRightIcon className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{order.restaurant}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {order.items.join(", ")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{order.date}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-semibold text-gray-900">${order.total}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button 
            onClick={() => navigate("/restaurants")}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-left hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <ShoppingBagIcon className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Food</h3>
            <p className="text-gray-600">Browse restaurants and place new orders</p>
          </button>

          <button 
            onClick={() => navigate("/orders")}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-left hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <ClockIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Orders</h3>
            <p className="text-gray-600">View and track your current orders</p>
          </button>

          <button 
            onClick={() => navigate("/profile")}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-left hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <UserIcon className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Edit Profile</h3>
            <p className="text-gray-600">Update your personal information</p>
          </button>
        </div>
      </div>
    </div>
  );
}
