import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { CreditCardIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { orderPaymentService } from '../services/orderPaymentService';
import toast from 'react-hot-toast';

const CARD_ELEMENT_OPTIONS = {
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

const StripeOrderPayment = ({ 
  clientSecret, 
  amount, 
  currency = 'CAD',
  onPaymentSuccess,
  onPaymentError,
  orderData,
  isGuest = false
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        }
      });

      if (error) {
        setPaymentError(error.message);
        onPaymentError?.(error);
      } else if (paymentIntent.status === 'succeeded') {
        // Confirm payment and create order
        const result = await orderPaymentService.confirmPaymentAndCreateOrder(
          paymentIntent.id,
          orderData
        );

        if (result.success) {
          toast.success('Payment successful! Order created.');
          onPaymentSuccess?.(result.data);
        } else {
          throw new Error(result.message || 'Failed to create order');
        }
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setPaymentError(error.message || 'Payment failed');
      onPaymentError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <CreditCardIcon className="w-6 h-6 text-amber-600" />
        </div>
        <h3 className="text-2xl font-bold text-stone-800 font-display">Payment Details</h3>
      </div>

      <div className="mb-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
        <div className="flex justify-between items-center">
          <span className="text-stone-600 font-medium">Total Amount:</span>
          <span className="text-2xl font-bold text-amber-600">
            {new Intl.NumberFormat('en-CA', {
              style: 'currency',
              currency: currency
            }).format(amount)}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-3">
            Card Information
          </label>
          <div className="p-4 border-2 border-stone-300 rounded-xl focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>

        {paymentError && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-800 text-sm">{paymentError}</span>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-amber-800 font-medium mb-1">Secure Payment</p>
              <p className="text-amber-700">
                Your payment information is encrypted and secure. We use Stripe to process payments safely.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
            !stripe || isProcessing
              ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
              : 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing Payment...
            </>
          ) : (
            <>
              <CreditCardIcon className="w-5 h-5" />
              Complete Payment
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-stone-500">
          By completing this payment, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
};

export default StripeOrderPayment;
