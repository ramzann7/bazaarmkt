import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserIcon,
  MapPinIcon,
  CreditCardIcon,
  CheckIcon,
  ArrowLeftIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { cartService } from '../services/cartService';
import { orderService } from '../services/orderService';
import { guestService } from '../services/guestService';
import toast from 'react-hot-toast';

export default function GuestCheckout() {
  const navigate = useNavigate();
  const [step, setStep] = useState('info'); // info, address, payment, confirmation
  const [isLoading, setIsLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  
  // Form data
  const [guestInfo, setGuestInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Canada'
  });
  
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: ''
  });

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    const cartItems = cartService.getCart(null); // Guest cart
    const total = cartService.getCartTotal(null);
    setCart(cartItems);
    setCartTotal(total);
  };

  const validateGuestInfo = () => {
    const { firstName, lastName, email, phone } = guestInfo;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Please fill in all required fields');
      return false;
    }
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const validateAddress = () => {
    const { street, city, state, zipCode } = deliveryAddress;
    if (!street.trim() || !city.trim() || !state.trim() || !zipCode.trim()) {
      toast.error('Please fill in all address fields');
      return false;
    }
    return true;
  };

  const validatePayment = () => {
    const { cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = paymentInfo;
    if (!cardNumber.trim() || !expiryMonth || !expiryYear || !cvv.trim() || !cardholderName.trim()) {
      toast.error('Please fill in all payment fields');
      return false;
    }
    if (cardNumber.replace(/\s/g, '').length < 13) {
      toast.error('Please enter a valid card number');
      return false;
    }
    if (cvv.length < 3) {
      toast.error('Please enter a valid CVV');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    switch (step) {
      case 'info':
        if (validateGuestInfo()) {
          setStep('address');
        }
        break;
      case 'address':
        if (validateAddress()) {
          setStep('payment');
        }
        break;
      case 'payment':
        if (validatePayment()) {
          handlePlaceOrder();
        }
        break;
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsLoading(true);
    try {
      // Create guest user with provided info
      const guestData = await guestService.createGuest(guestInfo);
      
      // Prepare order data
      const orderData = {
        items: cart.map(item => ({
          productId: item._id,
          quantity: item.quantity
        })),
        deliveryAddress: {
          ...deliveryAddress,
          recipientName: `${guestInfo.firstName} ${guestInfo.lastName}`
        },
        deliveryInstructions: "",
        isGuestOrder: true,
        guestInfo: {
          firstName: guestInfo.firstName,
          lastName: guestInfo.lastName,
          email: guestInfo.email,
          phone: guestInfo.phone
        },
        paymentMethod: 'credit_card',
        paymentInfo: {
          cardNumber: paymentInfo.cardNumber.replace(/\s/g, '').slice(-4), // Only store last 4 digits
          expiryMonth: paymentInfo.expiryMonth,
          expiryYear: paymentInfo.expiryYear,
          cardholderName: paymentInfo.cardholderName
        }
      };

      // Create order
      const result = await orderService.createOrder(orderData);
      
      // Clear cart
      cartService.clearCart(null);
      
      setStep('confirmation');
      toast.success(`Order placed successfully! ${result.orders.length} order${result.orders.length > 1 ? 's' : ''} created.`);
      
    } catch (error) {
      console.error('Error placing order:', error);
      const errorMessage = error.response?.data?.message || 'Failed to place order. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price);
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  if (step === 'confirmation') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckIcon className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Order Confirmed!</h2>
          <p className="text-stone-600 mb-6">
            Thank you for your order! We'll send you updates via email. 
            Create an account to track your orders and save your information for future purchases.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/register')}
              className="w-full btn-primary"
            >
              Create Account to Track Orders
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full btn-secondary"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/cart')}
            className="flex items-center text-stone-600 hover:text-amber-600 transition-colors duration-300 mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Cart
          </button>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Guest Checkout</h1>
          <p className="text-stone-600">Complete your purchase as a guest</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-8">
                <div className={`flex items-center ${step === 'info' ? 'text-amber-600' : 'text-stone-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'info' ? 'bg-amber-100' : 'bg-stone-100'}`}>
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <span className="ml-2 text-sm font-medium">Guest Info</span>
                </div>
                <div className={`flex-1 h-px mx-4 ${step === 'address' || step === 'payment' ? 'bg-amber-600' : 'bg-stone-200'}`}></div>
                <div className={`flex items-center ${step === 'address' ? 'text-amber-600' : step === 'payment' ? 'text-stone-400' : 'text-stone-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'address' ? 'bg-amber-100' : 'bg-stone-100'}`}>
                    <MapPinIcon className="w-4 h-4" />
                  </div>
                  <span className="ml-2 text-sm font-medium">Address</span>
                </div>
                <div className={`flex-1 h-px mx-4 ${step === 'payment' ? 'bg-amber-600' : 'bg-stone-200'}`}></div>
                <div className={`flex items-center ${step === 'payment' ? 'text-amber-600' : 'text-stone-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment' ? 'bg-amber-100' : 'bg-stone-100'}`}>
                    <CreditCardIcon className="w-4 h-4" />
                  </div>
                  <span className="ml-2 text-sm font-medium">Payment</span>
                </div>
              </div>

              {/* Step Content */}
              {step === 'info' && (
                <div>
                  <h2 className="text-xl font-semibold text-stone-900 mb-6">Guest Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">First Name *</label>
                      <input
                        type="text"
                        value={guestInfo.firstName}
                        onChange={(e) => setGuestInfo({...guestInfo, firstName: e.target.value})}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Last Name *</label>
                      <input
                        type="text"
                        value={guestInfo.lastName}
                        onChange={(e) => setGuestInfo({...guestInfo, lastName: e.target.value})}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Enter your last name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Email *</label>
                      <input
                        type="email"
                        value={guestInfo.email}
                        onChange={(e) => setGuestInfo({...guestInfo, email: e.target.value})}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Enter your email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={guestInfo.phone}
                        onChange={(e) => setGuestInfo({...guestInfo, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 'address' && (
                <div>
                  <h2 className="text-xl font-semibold text-stone-900 mb-6">Delivery Address</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Street Address *</label>
                      <input
                        type="text"
                        value={deliveryAddress.street}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Enter your street address"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">City *</label>
                        <input
                          type="text"
                          value={deliveryAddress.city}
                          onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">State/Province *</label>
                        <input
                          type="text"
                          value={deliveryAddress.state}
                          onChange={(e) => setDeliveryAddress({...deliveryAddress, state: e.target.value})}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">ZIP/Postal Code *</label>
                        <input
                          type="text"
                          value={deliveryAddress.zipCode}
                          onChange={(e) => setDeliveryAddress({...deliveryAddress, zipCode: e.target.value})}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="ZIP Code"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'payment' && (
                <div>
                  <h2 className="text-xl font-semibold text-stone-900 mb-6">Payment Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Card Number *</label>
                      <input
                        type="text"
                        value={paymentInfo.cardNumber}
                        onChange={(e) => setPaymentInfo({...paymentInfo, cardNumber: formatCardNumber(e.target.value)})}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Cardholder Name *</label>
                      <input
                        type="text"
                        value={paymentInfo.cardholderName}
                        onChange={(e) => setPaymentInfo({...paymentInfo, cardholderName: e.target.value})}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Name on card"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Expiry Month *</label>
                        <select
                          value={paymentInfo.expiryMonth}
                          onChange={(e) => setPaymentInfo({...paymentInfo, expiryMonth: e.target.value})}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                          <option value="">MM</option>
                          {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                            <option key={month} value={month.toString().padStart(2, '0')}>
                              {month.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Expiry Year *</label>
                        <select
                          value={paymentInfo.expiryYear}
                          onChange={(e) => setPaymentInfo({...paymentInfo, expiryYear: e.target.value})}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                          <option value="">YYYY</option>
                          {Array.from({length: 10}, (_, i) => new Date().getFullYear() + i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">CVV *</label>
                        <input
                          type="text"
                          value={paymentInfo.cvv}
                          onChange={(e) => setPaymentInfo({...paymentInfo, cvv: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="123"
                          maxLength="4"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t border-stone-200">
                {step !== 'info' && (
                  <button
                    onClick={() => setStep(step === 'address' ? 'info' : 'address')}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={isLoading}
                  className="btn-primary ml-auto"
                >
                  {isLoading ? 'Processing...' : step === 'payment' ? 'Place Order' : 'Continue'}
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-4">
                {cart.map((item) => (
                  <div key={item._id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900">{item.name}</p>
                      <p className="text-xs text-stone-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-stone-900">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-stone-200 pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>Guest Checkout:</strong> You'll receive order updates via email. 
                  Create an account after checkout to track orders and save your information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
