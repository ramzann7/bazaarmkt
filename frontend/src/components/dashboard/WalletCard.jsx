import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  CurrencyDollarIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  ClockIcon
} from "@heroicons/react/24/outline";
import walletService from "../../services/walletService";
import toast from "react-hot-toast";

export default function WalletCard() {
  const [walletBalance, setWalletBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setIsLoading(true);
      const walletResponse = await walletService.getWalletBalance();
      console.log('WalletCard: Wallet response:', walletResponse);
      if (walletResponse.success) {
        console.log('WalletCard: Setting wallet balance to:', walletResponse.data.balance);
        setWalletBalance(walletResponse.data.balance);
        setPendingBalance(walletResponse.data.pendingBalance || 0);
      }
      
      // Load recent transactions (if available)
      try {
        const transactionsResponse = await walletService.getTransactions();
        console.log('WalletCard: Transactions response:', transactionsResponse);
        if (transactionsResponse.success) {
          setRecentTransactions(transactionsResponse.data.transactions?.slice(0, 3) || []);
        }
      } catch (error) {
        console.log('No recent transactions available');
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'revenue':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />;
      case 'payout':
        return <CurrencyDollarIcon className="w-4 h-4 text-blue-500" />;
      case 'spotlight_purchase':
        return <EyeIcon className="w-4 h-4 text-purple-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'revenue':
        return 'text-green-600';
      case 'payout':
        return 'text-blue-600';
      case 'spotlight_purchase':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <CurrencyDollarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Wallet</h3>
        </div>
        <Link
          to="/my-wallet"
          className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center space-x-1"
        >
          <span>Details</span>
          <EyeIcon className="w-3 h-3" />
        </Link>
      </div>

      {/* Balance */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">Available Balance</p>
        <div className="flex items-baseline space-x-2">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-lg font-bold text-gray-400">Loading...</span>
            </div>
          ) : (
            <>
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(walletBalance)}
              </span>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
            </>
          )}
        </div>
        
        {/* Pending Balance */}
        {!isLoading && pendingBalance > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-primary-500" />
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-semibold text-primary-dark">
                {formatCurrency(pendingBalance)}
              </span>
              <span className="text-xs text-primary">pending</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500 mb-1">This Month</p>
          <p className="text-sm font-semibold text-gray-800">
            {recentTransactions.length > 0 ? recentTransactions.length : '0'} txns
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500 mb-1">Pending</p>
          <p className="text-sm font-semibold text-primary">
            {formatCurrency(pendingBalance)}
          </p>
        </div>
      </div>

      {/* Single Action Button */}
      <Link
        to="/my-wallet"
        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 border border-blue-200"
      >
        <EyeIcon className="w-4 h-4" />
        <span>View Details</span>
      </Link>
    </div>
  );
}
