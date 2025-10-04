import React, { useState, useEffect } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import walletService from '../services/walletService';
import toast from 'react-hot-toast';

const WalletTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    page: 1
  });

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await walletService.getTransactions(
        filters.page,
        20,
        filters.type || null,
        filters.status || null
      );

      if (response.success) {
        setTransactions(response.data.transactions || []);
        // Use pagination data from backend
        setPagination(response.data.pagination || {
          current: filters.page,
          pages: 1,
          total: response.data.transactions?.length || 0
        });
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
      setTransactions([]);
      setPagination({
        current: 1,
        pages: 1,
        total: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    return walletService.getTransactionTypeIcon(type);
  };

  const getTransactionColor = (type) => {
    return walletService.getTransactionTypeColor(type);
  };

  const getTransactionDisplayName = (type) => {
    return walletService.getTransactionTypeDisplay(type);
  };

  const formatAmount = (amount, type) => {
    const isCredit = ['revenue', 'top_up', 'refund', 'adjustment'].includes(type);
    const sign = isCredit ? '+' : '-';
    return `${sign}${walletService.formatCurrency(Math.abs(amount))}`;
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-stone-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-stone-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="p-6 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-stone-800 font-display">Transaction History</h2>
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-stone-400" />
            <span className="text-sm text-stone-500">Filters</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 border-b border-stone-200 bg-stone-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Transaction Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-100 focus:border-amber-400 transition-all duration-200 bg-white text-stone-700"
            >
              <option value="">All Types</option>
              <option value="revenue">Revenue</option>
              <option value="top_up">Top-up</option>
              <option value="purchase">Purchase</option>
              <option value="payout">Payout</option>
              <option value="refund">Refund</option>
              <option value="fee">Fee</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-100 focus:border-amber-400 transition-all duration-200 bg-white text-stone-700"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ type: '', status: '', page: 1 })}
              className="w-full px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="divide-y divide-stone-200">
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <MagnifyingGlassIcon className="w-12 h-12 text-stone-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-800 mb-2 font-display">No Transactions Found</h3>
            <p className="text-stone-500">
              {filters.type || filters.status 
                ? 'Try adjusting your filters to see more transactions.'
                : 'Your transaction history will appear here once you start using your wallet.'
              }
            </p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction._id} className="p-6 hover:bg-stone-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <h4 className="font-medium text-stone-800">
                      {getTransactionDisplayName(transaction.type)}
                    </h4>
                    <p className="text-sm text-stone-500">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-stone-400">
                      {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                    {formatAmount(transaction.amount, transaction.type)}
                  </p>
                  <p className="text-sm text-stone-500">
                    Balance: {walletService.formatCurrency(transaction.balanceAfter)}
                  </p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                    transaction.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    transaction.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-stone-100 text-stone-800'
                  }`}>
                    {transaction.status}
                  </span>
                </div>
              </div>

              {transaction.reference && (
                <div className="mt-2 text-xs text-stone-400">
                  Reference: {transaction.reference}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="p-6 border-t border-stone-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-stone-500">
              Showing page {pagination?.current || 1} of {pagination?.pages || 1} 
              ({pagination?.total || 0} total transactions)
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange((pagination?.current || 1) - 1)}
                disabled={(pagination?.current || 1) === 1}
                className="p-2 text-stone-400 hover:text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              <span className="px-3 py-1 text-sm font-medium text-stone-700">
                {pagination?.current || 1}
              </span>
              
              <button
                onClick={() => handlePageChange((pagination?.current || 1) + 1)}
                disabled={(pagination?.current || 1) === (pagination?.pages || 1)}
                className="p-2 text-stone-400 hover:text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletTransactions;
