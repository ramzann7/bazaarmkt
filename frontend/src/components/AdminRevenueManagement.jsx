import React, { useState, useEffect } from 'react';
import { getFinancialDashboardData } from '../services/adminDashboardService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function AdminRevenueManagement() {
  const [financialData, setFinancialData] = useState({
    gmv: 0,
    platformRevenue: 0,
    netPayouts: 0,
    pendingBalance: 0,
    commissionRate: 0.05,
    buyerFee: 0.02,
    totalOrders: 0,
    activeArtisans: 0,
    averageOrderValue: 0,
    monthlyGrowth: 0,
    topCategories: [],
    recentTransactions: []
  });
  
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load dashboard data from API
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const response = await getFinancialDashboardData(timeRange);
        
        if (response.success) {
          setFinancialData(response.data);
        } else {
          toast.error('Failed to load dashboard data');
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Error loading dashboard data');
        
        // Fallback to mock data for development
        const mockData = {
          gmv: 125000,
          platformRevenue: 8750,
          netPayouts: 116250,
          pendingBalance: 15000,
          commissionRate: 0.05,
          buyerFee: 0.02,
          totalOrders: 1250,
          activeArtisans: 45,
          averageOrderValue: 100,
          monthlyGrowth: 12.5,
          topCategories: [
            { name: 'Bakery', revenue: 35000, orders: 350 },
            { name: 'Fresh Produce', revenue: 28000, orders: 280 },
            { name: 'Dairy & Eggs', revenue: 22000, orders: 220 },
            { name: 'Artisan Cakes', revenue: 18000, orders: 180 },
            { name: 'Honey & Jams', revenue: 12000, orders: 120 }
          ],
          recentTransactions: [
            { id: 'TXN001', artisan: 'Ramzan\'s Bakery', amount: 150.00, type: 'payout', status: 'completed', date: '2025-08-29' },
            { id: 'TXN002', artisan: 'Fresh Farm Co.', amount: 89.50, type: 'commission', status: 'pending', date: '2025-08-29' },
            { id: 'TXN003', artisan: 'Artisan Bread Co.', amount: 234.75, type: 'payout', status: 'completed', date: '2025-08-28' },
            { id: 'TXN004', artisan: 'Local Honey', amount: 67.25, type: 'commission', status: 'completed', date: '2025-08-28' },
            { id: 'TXN005', artisan: 'Organic Dairy', amount: 189.00, type: 'payout', status: 'pending', date: '2025-08-27' }
          ]
        };
        
        setFinancialData(mockData);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [timeRange]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-US').format(number);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Admin Dashboard
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                ⚙️
              </button>
            </div>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">Revenue Management Dashboard</h1>
            <p className="text-gray-600 mt-1">Track your marketplace performance and financial metrics</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-blue-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gross Marketplace Volume (GMV)</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(financialData.gmv)}</p>
                <p className="text-sm text-gray-500 mt-1">{formatNumber(financialData.totalOrders)} orders</p>
              </div>
              <div className="p-3 bg-white rounded-full shadow-sm">
                💰
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-sm font-medium text-green-600">↗️ {financialData.monthlyGrowth}% from last period</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-green-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Platform Revenue</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(financialData.platformRevenue)}</p>
                <p className="text-sm text-gray-500 mt-1">{(financialData.commissionRate * 100)}% commission + {(financialData.buyerFee * 100)}% buyer fee</p>
              </div>
              <div className="p-3 bg-white rounded-full shadow-sm">
                📊
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-sm font-medium text-green-600">↗️ 8.2% from last period</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-amber-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Payouts</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(financialData.netPayouts)}</p>
                <p className="text-sm text-gray-500 mt-1">Transferred to sellers</p>
              </div>
              <div className="p-3 bg-white rounded-full shadow-sm">
                💳
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-sm font-medium text-green-600">↗️ 15.3% from last period</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-purple-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Balance</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(financialData.pendingBalance)}</p>
                <p className="text-sm text-gray-500 mt-1">Held by Stripe until payout</p>
              </div>
              <div className="p-3 bg-white rounded-full shadow-sm">
                ⏰
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-sm font-medium text-red-600">↘️ 5.1% from last period</span>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-blue-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold mt-1">{formatNumber(financialData.totalOrders)}</p>
                <p className="text-sm text-gray-500 mt-1">Avg. {formatCurrency(financialData.averageOrderValue)} per order</p>
              </div>
              <div className="p-3 bg-white rounded-full shadow-sm">
                🛍️
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-green-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Artisans</p>
                <p className="text-2xl font-bold mt-1">{formatNumber(financialData.activeArtisans)}</p>
                <p className="text-sm text-gray-500 mt-1">Selling this period</p>
              </div>
              <div className="p-3 bg-white rounded-full shadow-sm">
                👥
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-amber-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Order Value</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(financialData.averageOrderValue)}</p>
                <p className="text-sm text-gray-500 mt-1">Per transaction</p>
              </div>
              <div className="p-3 bg-white rounded-full shadow-sm">
                📈
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Categories */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Revenue Categories</h3>
            <div className="space-y-4">
              {financialData.topCategories.map((category, index) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{category.name}</p>
                      <p className="text-sm text-gray-500">{formatNumber(category.orders)} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(category.revenue)}</p>
                    <p className="text-sm text-gray-500">
                      {((category.revenue / financialData.gmv) * 100).toFixed(1)}% of GMV
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {financialData.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      transaction.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.artisan}</p>
                      <p className="text-sm text-gray-500">{transaction.id} • {transaction.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.type === 'payout' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.type === 'payout' ? '-' : '+'}{formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">{transaction.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Commission Rate</p>
              <p className="text-2xl font-bold text-blue-600">{(financialData.commissionRate * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-500">Platform fee on orders</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Buyer Fee</p>
              <p className="text-2xl font-bold text-green-600">{(financialData.buyerFee * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-500">Additional buyer charge</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-gray-600">Payout Schedule</p>
              <p className="text-2xl font-bold text-amber-600">7 days</p>
              <p className="text-xs text-gray-500">Standard payout cycle</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="mt-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">⚠️</span>
              <p className="text-sm text-yellow-800">
                <strong>Pending Balance Alert:</strong> {formatCurrency(financialData.pendingBalance)} is currently held by Stripe. 
                Next payout scheduled for September 5th, 2025.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
