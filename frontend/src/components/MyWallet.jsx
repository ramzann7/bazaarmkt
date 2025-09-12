import React, { useState } from 'react';
import { 
  WalletIcon,
  CreditCardIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import WalletDashboard from './WalletDashboard';
import WalletTransactions from './WalletTransactions';
import WalletTopUp from './WalletTopUp';

const MyWallet = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showTopUp, setShowTopUp] = useState(false);

  const tabs = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: WalletIcon,
      component: WalletDashboard
    },
    {
      id: 'transactions',
      name: 'Transactions',
      icon: ChartBarIcon,
      component: WalletTransactions
    }
  ];

  const handleTopUpSuccess = () => {
    setShowTopUp(false);
    // Refresh the dashboard data
    window.location.reload();
  };

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Wallet</h1>
        <p className="mt-2 text-gray-600">
          Manage your wallet balance, view transactions, and track your earnings.
        </p>
      </div>

      {/* Top-up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <WalletTopUp 
              onSuccess={handleTopUpSuccess}
              onCancel={() => setShowTopUp(false)}
            />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowTopUp(true)}
            className="inline-flex items-center px-4 py-2 bg-[#D77A61] text-white rounded-lg hover:bg-[#C06A51] transition-colors"
          >
            <CreditCardIcon className="w-5 h-5 mr-2" />
            Top Up Wallet
          </button>
          
          <button
            onClick={() => setActiveTab('transactions')}
            className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ClockIcon className="w-5 h-5 mr-2" />
            View Transactions
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-[#D77A61] text-[#D77A61]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {ActiveComponent && <ActiveComponent />}
      </div>

      {/* Help Section */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">How Your Wallet Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Earning Money</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Revenue from product sales is automatically added to your wallet</li>
              <li>• Platform fees are deducted before crediting your wallet</li>
              <li>• You can track all earnings in the transactions tab</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Spending Money</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use your wallet balance to purchase promotional features</li>
              <li>• Top up your wallet anytime using Stripe</li>
              <li>• Set up automatic payouts to your bank account</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyWallet;
