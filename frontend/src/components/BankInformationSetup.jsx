/**
 * Bank Information Setup Component
 * Allows artisans to add their bank information and setup Stripe Connect
 */

import React, { useState, useEffect } from 'react';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import * as profileService from '../services/profileService';

export default function BankInformationSetup({ artisan, onUpdate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [isSettingUpStripe, setIsSettingUpStripe] = useState(false);
  const [stripeStatus, setStripeStatus] = useState(null);
  
  const [bankInfo, setBankInfo] = useState({
    accountHolderName: '',
    accountNumber: '',
    routingNumber: '',
    bankName: '',
    accountType: 'checking'
  });

  const [showAccountNumber, setShowAccountNumber] = useState(false);

  useEffect(() => {
    loadStripeConnectStatus();
  }, []);

  const loadStripeConnectStatus = async () => {
    try {
      setIsLoading(true);
      const response = await profileService.getStripeConnectStatus();
      
      if (response.success) {
        setStripeStatus(response.data);
      }
    } catch (error) {
      console.error('Error loading Stripe Connect status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBankInfoChange = (field, value) => {
    setBankInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveBankInfo = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!bankInfo.accountHolderName || !bankInfo.accountNumber || 
        !bankInfo.routingNumber || !bankInfo.bankName) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate account number (should be numeric)
    if (!/^\d+$/.test(bankInfo.accountNumber)) {
      toast.error('Account number should contain only numbers');
      return;
    }

    // Validate routing number (should be 9 digits)
    if (!/^\d{9}$/.test(bankInfo.routingNumber)) {
      toast.error('Routing number should be exactly 9 digits');
      return;
    }

    try {
      setIsSavingBank(true);
      
      // Save bank info to artisan profile (encrypted on backend)
      const response = await profileService.updateArtisanProfile({
        bankInfo: bankInfo
      });

      if (response.success) {
        toast.success('Bank information saved securely!');
        
        // Ask if they want to set up Stripe Connect now
        const setupNow = window.confirm(
          'Bank information saved! Would you like to setup Stripe Connect now to start receiving payouts?'
        );
        
        if (setupNow) {
          await handleSetupStripeConnect();
        } else {
          // Reload status
          await loadStripeConnectStatus();
        }
        
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
      console.error('Error saving bank info:', error);
      toast.error(error.message || 'Failed to save bank information');
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleSetupStripeConnect = async () => {
    try {
      setIsSettingUpStripe(true);
      
      const response = await profileService.setupStripeConnect();
      
      if (response.success) {
        toast.success('Stripe Connect setup successfully! You can now receive payouts.');
        await loadStripeConnectStatus();
        
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
      
      if (error.message?.includes('Bank information is required')) {
        toast.error('Please save your bank information first');
      } else {
        toast.error(error.message || 'Failed to setup Stripe Connect');
      }
    } finally {
      setIsSettingUpStripe(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <BanknotesIcon className="w-7 h-7 text-primary" />
          Bank Information & Payouts
        </h3>
        <p className="text-gray-600">
          Securely add your bank information to receive weekly payouts via Stripe Connect
        </p>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <ShieldCheckIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Your Information is Secure</h4>
            <p className="text-sm text-blue-800">
              All bank information is encrypted using AES-256 encryption and securely stored. 
              Stripe Connect handles all payment processing with bank-level security.
            </p>
          </div>
        </div>
      </div>

      {/* Stripe Connect Status */}
      {stripeStatus && stripeStatus.isSetup && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-green-900 text-lg mb-2">
                Stripe Connect Active ✓
              </h4>
              <div className="space-y-1 text-sm text-green-800">
                <p><strong>Account ID:</strong> {stripeStatus.accountId}</p>
                <p><strong>Payouts Enabled:</strong> {stripeStatus.payoutsEnabled ? '✓ Yes' : '✗ No'}</p>
                <p><strong>Charges Enabled:</strong> {stripeStatus.chargesEnabled ? '✓ Yes' : '✗ No'}</p>
                <p><strong>Status:</strong> {stripeStatus.status}</p>
                {stripeStatus.setupAt && (
                  <p><strong>Setup Date:</strong> {new Date(stripeStatus.setupAt).toLocaleDateString()}</p>
                )}
              </div>
              <div className="mt-3 p-3 bg-white rounded border border-green-300">
                <p className="text-sm text-green-900">
                  <strong>💰 Weekly Payouts:</strong> Your earnings will be automatically transferred to your 
                  bank account every week. You'll receive an email notification before each payout.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Information Not Setup */}
      {stripeStatus && !stripeStatus.isSetup && !stripeStatus.hasBankInfo && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <InformationCircleIcon className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">Setup Required</h4>
              <p className="text-sm text-amber-800">
                Add your bank information below to start receiving payouts for your sales.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bank Info Ready for Stripe Connect */}
      {stripeStatus && !stripeStatus.isSetup && stripeStatus.hasBankInfo && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-8 h-8 text-emerald-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-emerald-900 text-lg mb-2">
                Bank Information Saved ✓
              </h4>
              <p className="text-sm text-emerald-800 mb-4">
                Your bank information has been securely saved. Click the button below to complete 
                your Stripe Connect setup and start receiving payouts.
              </p>
              <button
                onClick={handleSetupStripeConnect}
                disabled={isSettingUpStripe}
                className="btn-primary flex items-center gap-2"
              >
                {isSettingUpStripe ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Setting up...
                  </>
                ) : (
                  <>
                    <BanknotesIcon className="w-5 h-5" />
                    Setup Stripe Connect Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Information Form */}
      {(!stripeStatus || !stripeStatus.isSetup) && (
        <form onSubmit={handleSaveBankInfo} className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <LockClosedIcon className="w-5 h-5 text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900">Bank Account Details</h4>
          </div>

          {/* Account Holder Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Holder Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bankInfo.accountHolderName}
              onChange={(e) => handleBankInfoChange('accountHolderName', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="John Doe"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Name as it appears on your bank account</p>
          </div>

          {/* Bank Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bank Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bankInfo.bankName}
              onChange={(e) => handleBankInfoChange('bankName', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="TD Canada Trust"
              required
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Type <span className="text-red-500">*</span>
            </label>
            <select
              value={bankInfo.accountType}
              onChange={(e) => handleBankInfoChange('accountType', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>

          {/* Routing Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Routing Number (9 digits) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bankInfo.routingNumber}
              onChange={(e) => handleBankInfoChange('routingNumber', e.target.value.replace(/\D/g, '').slice(0, 9))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
              placeholder="123456789"
              maxLength="9"
              required
            />
            <p className="text-xs text-gray-500 mt-1">9-digit routing/transit number</p>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showAccountNumber ? "text" : "password"}
                value={bankInfo.accountNumber}
                onChange={(e) => handleBankInfoChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                placeholder="••••••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowAccountNumber(!showAccountNumber)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showAccountNumber ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Your bank account number (digits only)</p>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSavingBank}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isSavingBank ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving Securely...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="w-5 h-5" />
                  Save Bank Information Securely
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Your information is encrypted and never shared
            </p>
          </div>
        </form>
      )}

      {/* How Payouts Work */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <InformationCircleIcon className="w-5 h-5 text-primary" />
          How Payouts Work
        </h4>
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>📅 Schedule:</strong> Automatic weekly payouts every Friday</p>
          <p><strong>💰 Amount:</strong> Your earnings minus 10% platform fee</p>
          <p><strong>⏱️ Processing:</strong> 2-3 business days to reach your account</p>
          <p><strong>📧 Notifications:</strong> Email confirmation before each payout</p>
          <p><strong>💳 Minimum:</strong> $50 minimum balance required for payout</p>
        </div>
      </div>
    </div>
  );
}

