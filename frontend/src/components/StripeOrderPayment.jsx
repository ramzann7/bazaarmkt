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
  hidePostalCode: true, // Hide postal code field since we provide our own
};


const StripeOrderPayment = ({ 
  clientSecret, 
  amount, 
  currency = 'CAD',
  onPaymentSuccess,
  onPaymentError,
  orderData,
  isGuest = false,
  savedPaymentMethods = []
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [useSavedCard, setUseSavedCard] = useState(savedPaymentMethods.length > 0);
  const [selectedSavedCard, setSelectedSavedCard] = useState(savedPaymentMethods.find(method => method.isDefault) || savedPaymentMethods[0] || null);
  const [saveCardForFuture, setSaveCardForFuture] = useState(false);
  const [postalCode, setPostalCode] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Prevent double submission
    if (isProcessing || hasSubmitted) {
      console.log('Payment submission blocked - already processing or submitted');
      return;
    }

    // Check if we have a valid client secret
    if (!clientSecret) {
      setPaymentError('Payment session not available. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setHasSubmitted(true);
    setPaymentError(null);

    try {
      let paymentResult;

      if (useSavedCard && selectedSavedCard && !isGuest && selectedSavedCard.stripePaymentMethodId) {
        // Use saved Stripe PaymentMethod ID
        try {
          console.log('Confirming payment with saved card:', {
            clientSecret: clientSecret ? 'Present' : 'Missing',
            paymentMethodId: selectedSavedCard.stripePaymentMethodId
          });
          
          // Confirm payment with the saved Stripe PaymentMethod ID
          paymentResult = await stripe.confirmCardPayment(clientSecret, {
            payment_method: selectedSavedCard.stripePaymentMethodId,
          });
          
          console.log('Saved card payment result:', paymentResult);
        } catch (savedCardError) {
          console.error('Error using saved Stripe PaymentMethod:', savedCardError);
          
          // Check if this is the "payment method not attached to customer" error
          if (savedCardError.message && savedCardError.message.includes('attach it to a Customer first')) {
            setPaymentError('This saved card is no longer valid and cannot be used. Please delete it from your Profile > Payment Methods, then use a new card for this purchase.');
            setUseSavedCard(false); // Switch to new card input automatically
            
            // Remove the broken payment method from the list
            onPaymentError?.(new Error('INVALID_SAVED_CARD: ' + selectedSavedCard.stripePaymentMethodId));
          } else {
            setPaymentError('Unable to use saved card. Please enter your card details manually.');
            setUseSavedCard(false); // Switch to new card input
          }
          return;
        }
      } else {
        // Use new card from CardElement
        const cardElement = elements.getElement(CardElement);
        
        if (!cardElement) {
          setPaymentError('Card information is required. Please enter your card details.');
          return;
        }

        // Validate postal code for Canadian payments
        if (!postalCode || postalCode.trim() === '') {
          setPaymentError('Postal code is required for payment processing.');
          return;
        }

        // Basic Canadian postal code validation (A1A 1A1 format)
        const canadianPostalCodeRegex = /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/;
        if (!canadianPostalCodeRegex.test(postalCode.trim())) {
          setPaymentError('Please enter a valid Canadian postal code (e.g., M5V 3A8).');
          return;
        }

        // Process payment with the card element and postal code
        
        paymentResult = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              address: {
                postal_code: postalCode,
              },
            },
          }
        });
        
      }

      const { error, paymentIntent } = paymentResult;
      

      if (error) {
        console.error('Stripe payment error:', error);
        
        // Handle specific Stripe errors
        if (error.code === 'payment_intent_unexpected_state') {
          setPaymentError('Payment session expired. Please refresh the page and try again.');
          // Only call parent error handler for unexpected state errors
          onPaymentError?.(error);
        } else if (error.code === 'incomplete_cvc' || error.type === 'validation_error') {
          // Don't clear payment intent for validation errors, allow retry
          setPaymentError(error.message || 'Please check your card details and try again.');
          setHasSubmitted(false); // Allow retry for validation errors
        } else {
          setPaymentError(error.message);
          // Call parent error handler for other errors
          onPaymentError?.(error);
        }
      } else if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
        // Clear any error state immediately on success
        setPaymentError(null);
        
        // Save card for future use if requested (for authenticated users only)
        if (saveCardForFuture && !isGuest && paymentIntent.payment_method) {
          try {
            // Handle both string and object payment_method formats from Stripe
            const stripePaymentMethodId = typeof paymentIntent.payment_method === 'string' 
              ? paymentIntent.payment_method 
              : paymentIntent.payment_method.id;
            
            const paymentMethodData = {
              stripePaymentMethodId,
              brand: paymentIntent.payment_method_details?.card?.brand || 'card',
              last4: paymentIntent.payment_method_details?.card?.last4 || '****',
              expiryMonth: paymentIntent.payment_method_details?.card?.exp_month || 12,
              expiryYear: paymentIntent.payment_method_details?.card?.exp_year || 2025,
              cardholderName: paymentIntent.payment_method_details?.card?.name || 'Cardholder',
              isDefault: savedPaymentMethods.length === 0, // First card is default
              type: 'credit_card'
            };
            
            await orderPaymentService.savePaymentMethod(paymentMethodData);
            
            // Update the profile cache to include the new payment method
            try {
              const { updateProfileCache } = await import('../services/profileService');
              // Get current profile and add the new payment method
              const { getProfile } = await import('../services/authservice');
              const currentProfile = await getProfile(true); // Force refresh
              updateProfileCache(currentProfile);
            } catch (cacheError) {
              console.warn('Could not update profile cache:', cacheError);
            }
            
            toast.success('Card saved for future use!');
          } catch (saveError) {
            console.error('❌ Error saving card:', saveError);
            console.error('❌ Save error details:', saveError.response?.data);
            
            // Handle specific error for payment methods that can't be reused
            if (saveError.response?.data?.error === 'PAYMENT_METHOD_NOT_REUSABLE') {
              toast.error('This card cannot be saved for future use. Your payment was successful, but you\'ll need to enter card details for future orders.', {
                duration: 6000
              });
            } else {
              toast.error('Failed to save card for future use, but payment was successful');
            }
            // Don't fail the payment if saving fails
          }
        }

        // For requires_capture status, proceed with order creation
        // The backend will handle capturing the payment when creating the order

        // Confirm payment and create order
        const result = await orderPaymentService.confirmPaymentAndCreateOrder(
          paymentIntent.id,
          orderData
        );

        if (result.success) {
          // Clear any error state before showing success
          setPaymentError(null);
          toast.success('Payment successful! Order created.');
          onPaymentSuccess?.(result.data);
        } else {
          throw new Error(result.message || 'Failed to create order');
        }
      } else {
        // Handle other payment intent statuses
        if (paymentIntent.status === 'processing') {
          setPaymentError('Payment is being processed. Please wait a moment and refresh the page to check status.');
        } else if (paymentIntent.status === 'requires_action') {
          setPaymentError('Payment requires additional action. Please complete the required steps.');
        } else {
          setPaymentError(`Payment status: ${paymentIntent.status}. Please try again.`);
        }
        setHasSubmitted(false); // Allow retry
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setPaymentError(error.message || 'Payment failed');
      onPaymentError?.(error);
    } finally {
      setIsProcessing(false);
      // Only reset hasSubmitted for non-critical errors
      if (paymentError && (paymentError.includes('validation') || paymentError.includes('incomplete'))) {
        setHasSubmitted(false);
      }
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
        {/* Saved Payment Methods Section */}
        {!isGuest && savedPaymentMethods.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-stone-800 font-display">Choose Payment Method</h4>
            
            {/* Use Saved Card Option */}
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment-option"
                  checked={useSavedCard}
                  onChange={() => setUseSavedCard(true)}
                  className="text-amber-600 w-4 h-4"
                />
                <span className="text-stone-700 font-medium">Use Saved Card</span>
              </label>
              
              {useSavedCard && (
                <div className="ml-7 space-y-2">
                  {savedPaymentMethods.map((method, index) => (
                    <label key={index} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="saved-card"
                        checked={selectedSavedCard === method}
                        onChange={() => setSelectedSavedCard(method)}
                        className="text-amber-600 w-4 h-4"
                      />
                      <div className="flex items-center space-x-3 p-3 border border-stone-200 rounded-lg hover:border-amber-300 transition-colors">
                        <CreditCardIcon className="w-5 h-5 text-amber-600" />
                        <div>
                          <div className="font-medium text-stone-800">
                            {method.brand || method.cardType} •••• {method.last4 || method.last4Digits}
                          </div>
                          <div className="text-sm text-stone-600">
                            Expires {method.expiryMonth}/{method.expiryYear}
                          </div>
                        </div>
                        {method.isDefault && (
                          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {/* Use New Card Option */}
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="payment-option"
                checked={!useSavedCard}
                onChange={() => setUseSavedCard(false)}
                className="text-amber-600 w-4 h-4"
              />
              <span className="text-stone-700 font-medium">Enter New Card Information</span>
            </label>
          </div>
        )}

        {/* Card Information Section */}
        {(!useSavedCard || !selectedSavedCard?.stripePaymentMethodId || isGuest) && (
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-3">
              {isGuest ? 'Card Information' : 'Card Information'}
            </label>
            <div className="p-4 border-2 border-stone-300 rounded-xl focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
            
            {/* Postal Code Field for Canadian Payments */}
            <div className="mt-4">
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                placeholder="e.g., M5V 3A8"
                className="w-full p-3 border-2 border-stone-300 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                maxLength="7"
              />
              <p className="text-xs text-stone-500 mt-1">
                Enter your Canadian postal code for payment verification
              </p>
            </div>
            
            {!isGuest && savedPaymentMethods.length > 0 && !selectedSavedCard?.stripePaymentMethodId && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  💳 <strong>First time using saved card?</strong> Enter your card details below to create a secure Stripe PaymentMethod for future use.
                </p>
              </div>
            )}
            {!isGuest && savedPaymentMethods.length > 0 && selectedSavedCard?.stripePaymentMethodId && (
              <p className="text-sm text-stone-600 mt-2">
                💡 <strong>Tip:</strong> Your saved cards are shown above for reference. For security, please enter your card details below.
              </p>
            )}
          </div>
        )}

        {/* Saved Card Ready Message */}
        {useSavedCard && selectedSavedCard?.stripePaymentMethodId && !isGuest && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-emerald-800 font-medium">Ready to Pay with Saved Card</p>
                <p className="text-emerald-700 text-sm">
                  Your saved {selectedSavedCard.brand || selectedSavedCard.cardType} card ending in {selectedSavedCard.last4 || selectedSavedCard.last4Digits} is ready to use.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Saved Card Needs Setup Message */}
        {useSavedCard && selectedSavedCard && !selectedSavedCard?.stripePaymentMethodId && !isGuest && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-amber-800 font-medium">Setup Required for Saved Card</p>
                <p className="text-amber-700 text-sm">
                  Your saved {selectedSavedCard.brand || selectedSavedCard.cardType} card ending in {selectedSavedCard.last4 || selectedSavedCard.last4Digits} needs to be set up for secure payments. Please enter your card details below and check "Save this card for future purchases" to enable one-click payments.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save Card for Future Use Checkbox */}
        {!isGuest && (!useSavedCard || !selectedSavedCard?.stripePaymentMethodId) && (
          <div className="flex items-center space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <input
              type="checkbox"
              id="saveCard"
              checked={saveCardForFuture}
              onChange={(e) => setSaveCardForFuture(e.target.checked)}
              className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
            />
            <label htmlFor="saveCard" className="text-sm text-amber-800 cursor-pointer">
              <span className="font-medium">Save this card for future purchases</span>
              <p className="text-amber-700 text-xs mt-1">
                Your card details will be securely stored with Stripe for faster checkout next time.
              </p>
            </label>
          </div>
        )}

        {paymentError && !isProcessing && (
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
          disabled={!stripe || isProcessing || hasSubmitted}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
            !stripe || isProcessing || hasSubmitted
              ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
              : 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing Payment...
            </>
          ) : hasSubmitted ? (
            <>
              <CreditCardIcon className="w-5 h-5" />
              Payment Submitted
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
