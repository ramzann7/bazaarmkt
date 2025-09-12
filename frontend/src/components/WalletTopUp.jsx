import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { 
  CreditCardIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import walletService from '../services/walletService';
import toast from 'react-hot-toast';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const WalletTopUpForm = ({ onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const predefinedAmounts = [25, 50, 100, 250, 500];

  const handleAmountChange = (value) => {
    setAmount(value);
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!amount || amount < 10) {
      setError('Minimum top-up amount is $10');
      return;
    }

    if (amount > 10000) {
      setError('Maximum top-up amount is $10,000');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      const { data } = await walletService.createTopUpPaymentIntent(parseFloat(amount));
      
      if (!data.clientSecret) {
        throw new Error('Failed to create payment intent');
      }

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
          }
        }
      );

      if (stripeError) {
        setError(stripeError.message);
        setLoading(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // Confirm the top-up with our backend
        const confirmResponse = await walletService.confirmTopUp(paymentIntent.id);
        
        if (confirmResponse.success) {
          toast.success(`Successfully added ${walletService.formatCurrency(amount)} to your wallet!`);
          onSuccess(confirmResponse.data);
        } else {
          throw new Error('Failed to confirm top-up');
        }
      }
    } catch (error) {
      console.error('Error processing top-up:', error);
      setError(error.message || 'Failed to process top-up');
      toast.error('Failed to process top-up');
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Top-up Amount
        </label>
        
        {/* Predefined amounts */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {predefinedAmounts.map((predefinedAmount) => (
            <button
              key={predefinedAmount}
              type="button"
              onClick={() => handleAmountChange(predefinedAmount.toString())}
              className={`p-3 text-center border rounded-lg font-medium transition-colors ${
                amount === predefinedAmount.toString()
                  ? 'border-[#D77A61] bg-[#D77A61] text-white'
                  : 'border-gray-300 hover:border-[#D77A61] hover:text-[#D77A61]'
              }`}
            >
              ${predefinedAmount}
            </button>
          ))}
        </div>

        {/* Custom amount input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            min="10"
            max="10000"
            step="0.01"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="Enter custom amount"
            className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D77A61] focus:border-transparent"
          />
        </div>
        
        <p className="mt-2 text-sm text-gray-500">
          Minimum: $10 • Maximum: $10,000
        </p>
      </div>

      {/* Card Element */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Information
        </label>
        <div className="p-4 border border-gray-300 rounded-lg">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading || !amount}
          className="px-6 py-2 text-sm font-medium text-white bg-[#D77A61] rounded-lg hover:bg-[#C06A51] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CreditCardIcon className="w-4 h-4" />
              <span>Add ${amount || '0'} to Wallet</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

const WalletTopUp = ({ onSuccess, onCancel }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const handleSuccess = (data) => {
    setSuccessData(data);
    setShowSuccess(true);
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      onSuccess(data);
    }, 3000);
  };

  if (showSuccess && successData) {
    return (
      <div className="text-center py-8">
        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Top-up Successful!</h3>
        <p className="text-gray-500 mb-4">
          {walletService.formatCurrency(successData.transaction.amount)} has been added to your wallet.
        </p>
        <p className="text-sm text-gray-400">
          New balance: {walletService.formatCurrency(successData.newBalance)}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Top Up Wallet</h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      <Elements stripe={stripePromise}>
        <WalletTopUpForm onSuccess={handleSuccess} onCancel={onCancel} />
      </Elements>
    </div>
  );
};

export default WalletTopUp;
