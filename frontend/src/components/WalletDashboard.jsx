import React, { useState, useEffect } from 'react';
import { 
  CreditCardIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { profileService } from '../services/profileService';
import walletService from '../services/walletService';
import toast from 'react-hot-toast';

const WalletDashboard = () => {
  const [walletData, setWalletData] = useState(null);
  const [stats, setStats] = useState(null);
  const [artisanProfile, setArtisanProfile] = useState(null);
  const [hasBankInfo, setHasBankInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWalletData();
    loadArtisanProfile();
  }, []);

  const loadArtisanProfile = async () => {
    try {
      const response = await profileService.getArtisanProfile();
      if (response.data) {
        setArtisanProfile(response.data);
        
        // Check if bank info is configured
        const bankInfo = response.data.bankInfo;
        const isConfigured = bankInfo && 
          bankInfo.accountHolderName && 
          bankInfo.institutionNumber && 
          bankInfo.transitNumber && 
          bankInfo.accountNumber;
        
        setHasBankInfo(isConfigured);
      }
    } catch (error) {
      console.error('Error loading artisan profile:', error);
      // Not critical, just won't show bank info prompt
    }
  };

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [balanceResponse, statsResponse] = await Promise.all([
        walletService.getWalletBalance(),
        walletService.getWalletStats('30')
      ]);

      if (balanceResponse.success) {
        setWalletData(balanceResponse.data);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      setError('Failed to load wallet data');
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return walletService.formatCurrency(amount, walletData?.currency);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Wallet</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadWalletData}
            className="px-4 py-2 bg-[#D77A61] text-white rounded-lg hover:bg-[#C06A51]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bank Info Required Alert */}
      {!hasBankInfo && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-6 w-6 text-primary mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-900 mb-1">
                Bank Information Required for Payouts
              </h4>
              <p className="text-sm text-primary-dark mb-3">
                To receive weekly payouts, please configure your bank account information in your profile.
              </p>
              <a
                href="/profile?tab=payment"
                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm font-medium transition-colors"
              >
                Add Bank Information
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-r from-[#D77A61] to-[#C06A51] rounded-lg shadow-sm p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium mb-2">Wallet Balance</h2>
            <p className="text-3xl font-bold">{formatCurrency(walletData?.balance || 0)}</p>
            <p className="text-sm opacity-90 mt-1">
              Available for promotions and payouts
            </p>
          </div>
          <div className="text-right">
            <CurrencyDollarIcon className="w-12 h-12 opacity-80" />
            <div className="mt-2">
              <span className="text-sm opacity-90">
                {walletData?.recentTransactionsCount || 0} transactions this month
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => {/* Navigate to top-up */}}
          className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:border-[#D77A61] transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <ArrowUpIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-gray-900">Top Up Wallet</h3>
              <p className="text-sm text-gray-500">Add funds via Stripe</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => {/* Navigate to transactions */}}
          className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:border-[#D77A61] transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-gray-900">View Transactions</h3>
              <p className="text-sm text-gray-500">See all wallet activity</p>
            </div>
          </div>
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <ArrowUpIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Revenue (30 days)</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(stats.revenue.total)}
                </p>
                <p className="text-xs text-gray-400">
                  {stats.revenue.count} transactions
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <CreditCardIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Top-ups (30 days)</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(stats.top_up.total)}
                </p>
                <p className="text-xs text-gray-400">
                  {stats.top_up.count} transactions
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <ArrowDownIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Spent (30 days)</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(stats.purchase.total)}
                </p>
                <p className="text-xs text-gray-400">
                  {stats.purchase.count} transactions
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Settings */}
      {walletData?.payoutSettings && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payout Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Payout Status</p>
              <p className={`font-medium ${walletData.payoutSettings.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                {walletData.payoutSettings.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Schedule</p>
              <p className="font-medium text-gray-900 capitalize">
                {walletData.payoutSettings.schedule}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Minimum Payout</p>
              <p className="font-medium text-gray-900">
                {formatCurrency(walletData.payoutSettings.minimumPayout)}
              </p>
            </div>
            {walletData.payoutSettings.nextPayoutDate && (
              <div>
                <p className="text-sm text-gray-500">Next Payout</p>
                <p className="font-medium text-gray-900">
                  {new Date(walletData.payoutSettings.nextPayoutDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Low Balance Warning */}
      {walletData?.balance < 50 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
            <div>
              <h4 className="font-medium text-yellow-800">Low Wallet Balance</h4>
              <p className="text-sm text-yellow-700">
                Your wallet balance is below the minimum payout threshold. 
                Consider topping up to continue using promotional features.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletDashboard;
