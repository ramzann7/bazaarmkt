import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showTopUp, setShowTopUp] = useState(false);

  const tabs = [
    {
      id: 'dashboard',
      name: t('wallet.dashboard'),
      icon: WalletIcon,
      component: WalletDashboard
    },
    {
      id: 'transactions',
      name: t('wallet.transactions'),
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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full mb-6 shadow-lg">
            <WalletIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-stone-800 mb-3 font-display">{t('wallet.title')}</h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            {t('wallet.subtitle')}
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
            className="btn-primary inline-flex items-center"
          >
            <CreditCardIcon className="w-5 h-5 mr-2" />
            {t('wallet.topUp')}
          </button>
          
          <button
            onClick={() => setActiveTab('transactions')}
            className="btn-secondary inline-flex items-center"
          >
            <ClockIcon className="w-5 h-5 mr-2" />
            {t('wallet.viewTransactions')}
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
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
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
      <div className="mt-12 card p-6">
        <h3 className="text-lg font-medium text-stone-800 mb-4 font-display">{t('wallet.overview')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-stone-800 mb-2">{t('wallet.totalEarnings')}</h4>
            <ul className="text-sm text-stone-600 space-y-1">
              <li>• {t('artisan.revenue.earnings')}</li>
              <li>• {t('transparency.platformFee')}</li>
              <li>• {t('wallet.viewTransactions')}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-stone-800 mb-2">{t('wallet.topUp')}</h4>
            <ul className="text-sm text-stone-600 space-y-1">
              <li>• {t('wallet.available')}</li>
              <li>• {t('checkout.securePayment')}</li>
              <li>• {t('wallet.payoutSchedule')}</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default MyWallet;
