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
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [transactionSummary, setTransactionSummary] = useState(null);

  useEffect(() => {
    loadWalletData();
    loadArtisanProfile();
  }, []);

  const loadArtisanProfile = async () => {
    try {
      // Use the main profile endpoint which now includes artisan data
      const response = await profileService.getProfile();
      if (response.data?.user?.artisan) {
        setArtisanProfile(response.data.user.artisan);
        
        // Check if bank info is configured
        const bankInfo = response.data.user.artisan.bankInfo;
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
      const [balanceResponse, statsResponse, transactionsResponse] = await Promise.all([
        walletService.getWalletBalance(),
        walletService.getWalletStats('30'),
        walletService.getTransactions(1, 10) // Get recent 10 transactions
      ]);

      if (balanceResponse.success) {
        setWalletData(balanceResponse.data);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (transactionsResponse.success) {
        const transactions = transactionsResponse.data.transactions || [];
        setRecentTransactions(transactions.slice(0, 5)); // Show only 5 most recent
        
        // Calculate transaction summary
        const summary = calculateTransactionSummary(transactions);
        setTransactionSummary(summary);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      setError('Failed to load wallet data');
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTransactionSummary = (transactions) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    const recentTransactions = transactions.filter(t => new Date(t.createdAt) >= thirtyDaysAgo);
    const weeklyTransactions = transactions.filter(t => new Date(t.createdAt) >= sevenDaysAgo);

    const summary = {
      totalTransactions: recentTransactions.length,
      weeklyTransactions: weeklyTransactions.length,
      totalRevenue: recentTransactions
        .filter(t => ['revenue', 'order_revenue'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0),
      totalSpent: recentTransactions
        .filter(t => ['purchase', 'payout', 'wallet_deduction'].includes(t.type))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      lastTransactionDate: transactions.length > 0 ? transactions[0].createdAt : null
    };

    return summary;
  };

  const formatCurrency = (amount) => {
    return walletService.formatCurrency(amount, walletData?.currency);
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-stone-200 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-stone-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-stone-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-800 mb-2 font-display">Error Loading Wallet</h3>
          <p className="text-stone-500 mb-4">{error}</p>
          <button
            onClick={loadWalletData}
            className="btn-primary"
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-900 mb-1">
                Bank Information Required for Payouts
              </h4>
              <p className="text-sm text-amber-700 mb-3">
                To receive weekly payouts, please configure your bank account information in your profile.
              </p>
              <a
                href="/profile?tab=payment"
                className="btn-primary text-sm"
              >
                Add Bank Information
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Balance Card - Compact and Neutral */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-stone-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-stone-600" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-stone-800 font-display">Wallet Balance</h2>
              <p className="text-2xl font-bold text-stone-800">{formatCurrency(walletData?.balance || 0)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-stone-500">
              {transactionSummary?.totalTransactions || 0} transactions (30 days)
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Available for promotions and payouts
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Summary & Payout Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Summary */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-stone-800 mb-4 font-display flex items-center">
            <ChartBarIcon className="w-5 h-5 text-amber-600 mr-2" />
            Transaction Summary (30 days)
          </h3>
          
          {transactionSummary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(transactionSummary.totalRevenue)}
                  </p>
                  <p className="text-sm text-emerald-700">Total Revenue</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(transactionSummary.totalSpent)}
                  </p>
                  <p className="text-sm text-red-700">Total Spent</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-600">Transactions:</span>
                  <span className="font-medium text-stone-800">{transactionSummary.totalTransactions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">This week:</span>
                  <span className="font-medium text-stone-800">{transactionSummary.weeklyTransactions}</span>
                </div>
              </div>
              
              {transactionSummary.lastTransactionDate && (
                <div className="text-xs text-stone-500 pt-2 border-t border-stone-200">
                  Last transaction: {new Date(transactionSummary.lastTransactionDate).toLocaleDateString()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-stone-500">
              <p>No transaction data available</p>
            </div>
          )}
        </div>

        {/* Payout Information */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-stone-800 mb-4 font-display flex items-center">
            <ClockIcon className="w-5 h-5 text-blue-600 mr-2" />
            Payout Information
          </h3>
          
          <div className="space-y-4">
            {walletData?.payoutSettings ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Status:</span>
                  <span className={`font-medium ${walletData.payoutSettings.enabled ? 'text-emerald-600' : 'text-stone-500'}`}>
                    {walletData.payoutSettings.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Schedule:</span>
                  <span className="font-medium text-stone-800 capitalize">
                    {walletData.payoutSettings.schedule}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Minimum:</span>
                  <span className="font-medium text-stone-800">
                    {formatCurrency(walletData.payoutSettings.minimumPayout)}
                  </span>
                </div>
                
                {walletData.payoutSettings.nextPayoutDate && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">Next Payout:</span>
                      <span className="text-blue-800 font-bold">
                        {new Date(walletData.payoutSettings.nextPayoutDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {walletData.balance >= walletData.payoutSettings.minimumPayout 
                        ? 'Eligible for payout' 
                        : `Need ${formatCurrency(walletData.payoutSettings.minimumPayout - walletData.balance)} more`}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-stone-500">
                <p>Payout settings not configured</p>
                {!hasBankInfo && (
                  <p className="text-xs mt-2">Add bank information to enable payouts</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-stone-800 mb-4 font-display flex items-center">
            <ArrowRightIcon className="w-5 h-5 text-purple-600 mr-2" />
            Recent Transactions
          </h3>
          
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction._id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-lg">
                    {walletService.getTransactionTypeIcon(transaction.type)}
                  </div>
                  <div>
                    <p className="font-medium text-stone-800">
                      {walletService.getTransactionTypeDisplay(transaction.type)}
                    </p>
                    <p className="text-sm text-stone-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${walletService.getTransactionTypeColor(transaction.type)}`}>
                    {['revenue', 'top_up', 'refund', 'adjustment'].includes(transaction.type) ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </p>
                  <p className="text-xs text-stone-400">
                    {transaction.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => {/* Navigate to transactions tab */}}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              View all transactions →
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => {/* Navigate to top-up */}}
          className="card p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <ArrowUpIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-stone-800 font-display">Top Up Wallet</h3>
              <p className="text-sm text-stone-500">Add funds via Stripe</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => {/* Navigate to transactions */}}
          className="card p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-stone-800 font-display">View All Transactions</h3>
              <p className="text-sm text-stone-500">See complete wallet activity</p>
            </div>
          </div>
        </button>
      </div>


      {/* Low Balance Warning */}
      {walletData?.balance < 50 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
            <div>
              <h4 className="font-medium text-amber-800 font-display">Low Wallet Balance</h4>
              <p className="text-sm text-amber-700">
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
