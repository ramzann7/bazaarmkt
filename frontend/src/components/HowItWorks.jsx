import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  UserPlusIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  TruckIcon,
  CheckCircleIcon,
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BanknotesIcon,
  SparklesIcon,
  HeartIcon,
  ShieldCheckIcon,
  ClockIcon,
  MapPinIcon,
  BellIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { getPlatformSettings } from '../services/adminService';

export default function HowItWorks() {
  const [platformFee, setPlatformFee] = useState(10); // Default 10%
  const [paymentFee, setPaymentFee] = useState(2.9); // Default 2.9%
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlatformSettings = async () => {
      try {
        const settings = await getPlatformSettings();
        if (settings) {
          setPlatformFee(settings.platformFeePercentage || 10);
          setPaymentFee(settings.paymentProcessingFee || 2.9);
        }
      } catch (error) {
        console.warn('Could not load platform settings, using defaults');
      } finally {
        setLoading(false);
      }
    };
    
    loadPlatformSettings();
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-stone-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">
            How Bazaar Works
          </h1>
          <p className="text-xl text-amber-50 max-w-3xl mx-auto">
            Connecting local artisans with their communities. Simple, transparent, and designed to support local makers.
          </p>
        </div>
      </div>

      {/* For Patrons Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <ShoppingCartIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-stone-900 mb-4 font-display">For Shoppers</h2>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            Discover authentic, handcrafted products from local artisans in your community
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Step 1: Sign Up */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <UserPlusIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex items-center mb-2">
              <span className="text-2xl font-bold text-blue-600 mr-2">1</span>
              <h3 className="text-xl font-semibold text-stone-900 font-display">Create Account</h3>
            </div>
            <p className="text-stone-600 mb-4">
              Quick and easy registration. Add your delivery address to start shopping local.
            </p>
            <ul className="text-sm text-stone-500 space-y-1">
              <li>• Personal information</li>
              <li>• Delivery address</li>
              <li>• Optional payment methods</li>
            </ul>
          </div>

          {/* Step 2: Browse */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
              <MagnifyingGlassIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex items-center mb-2">
              <span className="text-2xl font-bold text-purple-600 mr-2">2</span>
              <h3 className="text-xl font-semibold text-stone-900 font-display">Browse & Discover</h3>
            </div>
            <p className="text-stone-600 mb-4">
              Explore local artisans and their handcrafted products. Filter by category, location, or artisan type.
            </p>
            <ul className="text-sm text-stone-500 space-y-1">
              <li>• Search by product or artisan</li>
              <li>• Filter by category & location</li>
              <li>• View artisan profiles & ratings</li>
            </ul>
          </div>

          {/* Step 3: Add to Cart */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
              <ShoppingCartIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex items-center mb-2">
              <span className="text-2xl font-bold text-green-600 mr-2">3</span>
              <h3 className="text-xl font-semibold text-stone-900 font-display">Add to Cart</h3>
            </div>
            <p className="text-stone-600 mb-4">
              Select products and quantities. Cart organizes by artisan for easy checkout.
            </p>
            <ul className="text-sm text-stone-500 space-y-1">
              <li>• Multiple artisans in one cart</li>
              <li>• Real-time inventory updates</li>
              <li>• Automatic grouping by artisan</li>
            </ul>
          </div>

          {/* Step 4: Choose Delivery */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
              <TruckIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex items-center mb-2">
              <span className="text-2xl font-bold text-orange-600 mr-2">4</span>
              <h3 className="text-xl font-semibold text-stone-900 font-display">Select Delivery</h3>
            </div>
            <p className="text-stone-600 mb-4">
              Choose between pickup or personal delivery from the artisan.
            </p>
            <ul className="text-sm text-stone-500 space-y-1">
              <li>• Pickup at artisan location</li>
              <li>• Personal delivery by artisan</li>
              <li>• Flexible pickup times</li>
            </ul>
          </div>

          {/* Step 5: Checkout */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-4">
              <CreditCardIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex items-center mb-2">
              <span className="text-2xl font-bold text-indigo-600 mr-2">5</span>
              <h3 className="text-xl font-semibold text-stone-900 font-display">Secure Checkout</h3>
            </div>
            <p className="text-stone-600 mb-4">
              Safe and secure payment processing with Stripe. Save cards for faster checkout.
            </p>
            <ul className="text-sm text-stone-500 space-y-1">
              <li>• Stripe secure payments</li>
              <li>• Save payment methods</li>
              <li>• Order confirmation emails</li>
            </ul>
          </div>

          {/* Step 6: Receive */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-4">
              <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex items-center mb-2">
              <span className="text-2xl font-bold text-emerald-600 mr-2">6</span>
              <h3 className="text-xl font-semibold text-stone-900 font-display">Receive & Enjoy</h3>
            </div>
            <p className="text-stone-600 mb-4">
              Pick up or receive your handcrafted products. Confirm receipt to complete the order.
            </p>
            <ul className="text-sm text-stone-500 space-y-1">
              <li>• Order tracking & updates</li>
              <li>• Pickup/delivery notifications</li>
              <li>• Confirm receipt when done</li>
            </ul>
          </div>
        </div>
      </div>

      {/* For Artisans Section */}
      <div className="bg-gradient-to-b from-amber-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
              <BuildingStorefrontIcon className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-3xl font-bold text-stone-900 mb-4 font-display">For Artisans</h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Grow your business with tools designed for local makers. No upfront costs, simple pricing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Step 1: Register */}
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-4">
                <UserPlusIcon className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex items-center mb-2">
                <span className="text-2xl font-bold text-amber-600 mr-2">1</span>
                <h3 className="text-xl font-semibold text-stone-900 font-display">Register</h3>
              </div>
              <p className="text-stone-600 mb-4">
                Create your artisan profile. Add business info, bank details for payouts, and delivery preferences.
              </p>
              <ul className="text-sm text-stone-500 space-y-1">
                <li>• Business information</li>
                <li>• Bank account for payouts</li>
                <li>• Delivery & pickup settings</li>
              </ul>
            </div>

            {/* Step 2: List Products */}
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                <SparklesIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex items-center mb-2">
                <span className="text-2xl font-bold text-purple-600 mr-2">2</span>
                <h3 className="text-xl font-semibold text-stone-900 font-display">List Products</h3>
              </div>
              <p className="text-stone-600 mb-4">
                Add your handcrafted products with photos, descriptions, and pricing. Manage inventory in real-time.
              </p>
              <ul className="text-sm text-stone-500 space-y-1">
                <li>• Ready-to-ship products</li>
                <li>• Made-to-order items</li>
                <li>• Scheduled production runs</li>
              </ul>
            </div>

            {/* Step 3: Receive Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <BellIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex items-center mb-2">
                <span className="text-2xl font-bold text-blue-600 mr-2">3</span>
                <h3 className="text-xl font-semibold text-stone-900 font-display">Receive Orders</h3>
              </div>
              <p className="text-stone-600 mb-4">
                Get instant notifications when customers place orders. Manage everything from your dashboard.
              </p>
              <ul className="text-sm text-stone-500 space-y-1">
                <li>• Real-time email notifications</li>
                <li>• Order management dashboard</li>
                <li>• Customer communication</li>
              </ul>
            </div>

            {/* Step 4: Fulfill Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <ClockIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex items-center mb-2">
                <span className="text-2xl font-bold text-green-600 mr-2">4</span>
                <h3 className="text-xl font-semibold text-stone-900 font-display">Prepare & Deliver</h3>
              </div>
              <p className="text-stone-600 mb-4">
                Prepare orders and update status. Coordinate pickup or deliver personally to customers.
              </p>
              <ul className="text-sm text-stone-500 space-y-1">
                <li>• Update order status</li>
                <li>• Set pickup times</li>
                <li>• Deliver within your radius</li>
              </ul>
            </div>

            {/* Step 5: Get Paid */}
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-4">
                <CurrencyDollarIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex items-center mb-2">
                <span className="text-2xl font-bold text-emerald-600 mr-2">5</span>
                <h3 className="text-xl font-semibold text-stone-900 font-display">Earn Revenue</h3>
              </div>
              <p className="text-stone-600 mb-4">
                Revenue credited to your wallet when customers confirm receipt. Track all earnings in real-time.
              </p>
              <ul className="text-sm text-stone-500 space-y-1">
                <li>• Instant wallet crediting</li>
                <li>• Revenue breakdown & analytics</li>
                <li>• Transaction history</li>
              </ul>
            </div>

          {/* Step 6: Weekly Payouts */}
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-4">
                <BanknotesIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex items-center mb-2">
                <span className="text-2xl font-bold text-indigo-600 mr-2">6</span>
                <h3 className="text-xl font-semibold text-stone-900 font-display">Weekly Payouts</h3>
              </div>
              <p className="text-stone-600 mb-4">
                Automatic weekly payouts to your bank account. Minimum $50 balance, funds arrive in 2-3 business days.
              </p>
              <ul className="text-sm text-stone-500 space-y-1">
                <li>• Every Friday payout schedule</li>
                <li>• $50 minimum threshold</li>
                <li>• Direct to your bank account</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing & Fees Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <ChartBarIcon className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-stone-900 mb-4 font-display">Transparent Pricing</h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Simple, fair pricing. We only succeed when you succeed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Platform Fee */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
              <h3 className="text-xl font-bold text-stone-900 mb-3 font-display">Platform Fee</h3>
              <div className="text-4xl font-bold text-blue-600 mb-4">{platformFee}%</div>
              <p className="text-stone-600 mb-4">
                On product sales only. Covers platform development, hosting, security, and support.
              </p>
              <ul className="text-sm text-stone-600 space-y-2">
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Applied to product revenue only</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>No fee on delivery charges</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>No monthly or listing fees</span>
                </li>
              </ul>
            </div>

            {/* Payment Processing */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <h3 className="text-xl font-bold text-stone-900 mb-3 font-display">Payment Processing</h3>
              <div className="text-4xl font-bold text-purple-600 mb-4">{paymentFee}%</div>
              <p className="text-stone-600 mb-4">
                Stripe payment processing fee. Industry-standard secure payment handling.
              </p>
              <ul className="text-sm text-stone-600 space-y-2">
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Secure PCI-compliant processing</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Credit & debit card support</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Fraud protection included</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Example Calculation */}
          <div className="mt-8 bg-stone-50 rounded-xl p-6 border border-stone-200 max-w-2xl mx-auto">
            <h4 className="font-semibold text-stone-900 mb-4 font-display">Example: $100 Product Sale</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-600">Product Price</span>
                <span className="font-semibold text-stone-900">$100.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Delivery Fee (100% to artisan)</span>
                <span className="font-semibold text-stone-900">$5.00</span>
              </div>
              <div className="border-t border-stone-200 pt-2"></div>
              <div className="flex justify-between">
                <span className="text-stone-600">Total Revenue</span>
                <span className="font-semibold text-stone-900">$105.00</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Platform Fee ({platformFee}% of $100)</span>
                <span className="font-semibold">-${(100 * platformFee / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Payment Processing ({paymentFee}% of $105)</span>
                <span className="font-semibold">-${(105 * paymentFee / 100).toFixed(2)}</span>
              </div>
              <div className="border-t border-stone-300 pt-2"></div>
              <div className="flex justify-between text-lg">
                <span className="font-bold text-stone-900">Your Earnings</span>
                <span className="font-bold text-green-600">
                  ${(105 - (100 * platformFee / 100) - (105 * paymentFee / 100)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-stone-900 mb-4 font-display">Platform Features</h2>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            Everything you need to run your artisan business online
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-stone-900 mb-2 font-display">Secure Payments</h3>
            <p className="text-sm text-stone-600">
              Stripe-powered secure payment processing with fraud protection
            </p>
          </div>

          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <ChartBarIcon className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="font-semibold text-stone-900 mb-2 font-display">Analytics Dashboard</h3>
            <p className="text-sm text-stone-600">
              Track sales, revenue, orders, and customer insights in real-time
            </p>
          </div>

          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <MapPinIcon className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-stone-900 mb-2 font-display">Location-Based</h3>
            <p className="text-sm text-stone-600">
              Customers find artisans near them for fresh, local products
            </p>
          </div>

          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
              <BellIcon className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="font-semibold text-stone-900 mb-2 font-display">Smart Notifications</h3>
            <p className="text-sm text-stone-600">
              Email and platform notifications for orders, updates, and milestones
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4 font-display">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-amber-50 mb-8">
            Join our community of local artisans and passionate shoppers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register?type=artisan"
              className="inline-flex items-center justify-center px-8 py-3 bg-white text-amber-600 rounded-lg font-semibold hover:bg-amber-50 transition-colors shadow-lg"
            >
              <BuildingStorefrontIcon className="w-5 h-5 mr-2" />
              Become an Artisan
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-3 bg-amber-700 text-white rounded-lg font-semibold hover:bg-amber-800 transition-colors shadow-lg"
            >
              <ShoppingCartIcon className="w-5 h-5 mr-2" />
              Start Shopping
            </Link>
          </div>
        </div>
      </div>

      {/* FAQ Highlights */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-stone-900 mb-4 font-display">Common Questions</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="bg-white rounded-lg p-6 border border-stone-200">
            <h3 className="font-semibold text-stone-900 mb-2 font-display">How does payment work?</h3>
            <p className="text-sm text-stone-600">
              Customers pay securely at checkout. Funds are held and released to artisans when customers confirm receipt of their orders. This protects both buyers and sellers.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-stone-200">
            <h3 className="font-semibold text-stone-900 mb-2 font-display">When do artisans get paid?</h3>
            <p className="text-sm text-stone-600">
              Revenue is credited to your wallet when customers confirm receipt. Automatic weekly payouts every Friday for balances over $50.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-stone-200">
            <h3 className="font-semibold text-stone-900 mb-2 font-display">What about delivery?</h3>
            <p className="text-sm text-stone-600">
              Artisans choose their own delivery methods: pickup at their location or personal delivery within their service radius. Artisans keep 100% of delivery fees.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-stone-200">
            <h3 className="font-semibold text-stone-900 mb-2 font-display">Can I save payment methods?</h3>
            <p className="text-sm text-stone-600">
              Yes! Securely save payment methods for faster checkout. All payment data is encrypted and handled by Stripe - we never store your card details.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-stone-200">
            <h3 className="font-semibold text-stone-900 mb-2 font-display">How does inventory work?</h3>
            <p className="text-sm text-stone-600">
              Artisans manage three types: ready-to-ship (immediate stock), made-to-order (custom production), and scheduled orders (batch production). Real-time updates prevent overselling.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-stone-200">
            <h3 className="font-semibold text-stone-900 mb-2 font-display">What if I need to cancel?</h3>
            <p className="text-sm text-stone-600">
              Customers can cancel before artisans confirm the order. Artisans can decline orders with a reason. Full refunds are issued for cancellations, and inventory is automatically restored.
            </p>
          </div>
        </div>
      </div>

      {/* Support Section */}
      <div className="bg-gradient-to-b from-stone-50 to-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <HeartIcon className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">
            Need Help?
          </h2>
          <p className="text-stone-600 mb-6">
            Our support team is here to help you succeed. Whether you're a shopper or an artisan, we're committed to your success.
          </p>
          <a
            href="mailto:support@bazaarmkt.com"
            className="inline-flex items-center justify-center px-6 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors"
          >
            <EnvelopeIcon className="w-5 h-5 mr-2" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

