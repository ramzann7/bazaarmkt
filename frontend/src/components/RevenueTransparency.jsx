import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  InformationCircleIcon, 
  HeartIcon, 
  CurrencyDollarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  CreditCardIcon,
  ClockIcon,
  BanknotesIcon,
  ChartBarIcon,
  SparklesIcon,
  ShieldCheckIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { revenueService } from '../services/revenueService';
import { getPlatformSettings } from '../services/adminService';
import { VECTEEZY_SPINNING_WHEEL } from '../config/environment';

export default function RevenueTransparency() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [platformFee, setPlatformFee] = useState(10); // Default 10%
  const [paymentFee, setPaymentFee] = useState(2.9); // Default 2.9%

  useEffect(() => {
    loadPlatformSettings();
  }, []);

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
      setIsLoading(false);
    }
  };

  const artisanEarnings = 100 - platformFee - paymentFee;

  const revenueBreakdown = [
    {
      percentage: artisanEarnings.toFixed(1),
      label: "Direct to Artisan",
      description: "Goes directly to the artisan for their craft and time",
      color: "emerald",
      icon: HeartIcon
    },
    {
      percentage: platformFee,
      label: "Platform Fee",
      description: "Maintains marketplace, payment processing, and customer support",
      color: "amber",
      icon: SparklesIcon
    },
    {
      percentage: paymentFee,
      label: "Payment Processing",
      description: "Secure payment processing through Stripe",
      color: "blue",
      icon: ShieldCheckIcon
    }
  ];

  const payoutFeatures = [
    {
      icon: CalendarIcon,
      title: "Weekly Payouts",
      description: "Automatic weekly payouts every Friday for all completed orders",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100"
    },
    {
      icon: BanknotesIcon,
      title: "Low Minimum",
      description: "$25 minimum payout threshold - start earning right away",
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      icon: ClockIcon,
      title: "Fast Processing",
      description: "Funds typically arrive in 3-5 business days after payout",
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      icon: CreditCardIcon,
      title: "Flexible Methods",
      description: "Choose from direct deposit, PayPal, or bank transfer",
      color: "text-amber-600",
      bgColor: "bg-amber-100"
    }
  ];

  const transparencyPrinciples = [
    "No hidden fees or surprise charges",
    "Clear revenue breakdown for every sale",
    "Real-time earnings tracking in your dashboard",
    "Detailed transaction history always available",
    "Full visibility into pending and completed payouts",
    "Transparent fee structure - what you see is what you get"
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={VECTEEZY_SPINNING_WHEEL}
            alt="Artisan at work"
            className="w-full h-full object-cover opacity-10"
          />
        </div>
        
        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur mb-6">
            <CurrencyDollarIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-6 font-display">
            Revenue & Payouts
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
            Complete transparency in how revenue is shared, when you get paid, and how you can track every dollar you earn
          </p>
        </div>
      </section>

      {/* Revenue Breakdown Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-display">
              Fair & Transparent Revenue Model
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              For every $100 in sales, here's exactly how the revenue is distributed
            </p>
          </div>

          {/* Visual Breakdown */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {revenueBreakdown.map((item, index) => (
                <div key={index} className={`bg-${item.color}-50 rounded-xl p-6 border-2 border-${item.color}-200`}>
                  <div className="flex items-center justify-between mb-4">
                    <item.icon className={`w-8 h-8 text-${item.color}-600`} />
                    <div className={`text-4xl font-bold text-${item.color}-600 font-display`}>
                      {item.percentage}%
                    </div>
                  </div>
                  <h3 className={`text-lg font-bold text-gray-900 mb-2`}>
                    {item.label}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Example Calculation */}
            <div className="bg-stone-50 rounded-xl p-6 border border-stone-200">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                <ChartBarIcon className="w-5 h-5 mr-2 text-amber-600" />
                Example: $100 Sale
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Sale Amount</span>
                  <span className="font-bold text-gray-900">$100.00</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Platform Fee ({platformFee}%)</span>
                  <span className="font-medium text-amber-600">-${(platformFee).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Payment Processing ({paymentFee}%)</span>
                  <span className="font-medium text-blue-600">-${(paymentFee).toFixed(2)}</span>
                </div>
                <div className="border-t border-stone-300 pt-3 flex items-center justify-between">
                  <span className="font-bold text-gray-900">You Earn</span>
                  <span className="text-2xl font-bold text-emerald-600">${artisanEarnings.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transparency Principles */}
          <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-6 font-display">Our Transparency Promise</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {transparencyPrinciples.map((principle, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-stone-200">{principle}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Wallet & Payouts Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-display">
              Wallet & Payout System
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your earnings are automatically tracked and paid out on a reliable schedule
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {payoutFeatures.map((feature, index) => (
              <div key={index} className="bg-stone-50 rounded-xl p-6 border border-stone-200">
                <div className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* How Payouts Work */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 font-display">
              How Payouts Work
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mb-4">
                  1
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Order Completed</h4>
                <p className="text-sm text-gray-600">
                  When a customer receives their order, the funds become available in your wallet
                </p>
              </div>
              
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mb-4">
                  2
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Weekly Processing</h4>
                <p className="text-sm text-gray-600">
                  Every Friday, we automatically process payouts for all available funds over $25
                </p>
              </div>
              
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mb-4">
                  3
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Funds Arrive</h4>
                <p className="text-sm text-gray-600">
                  Funds typically arrive in your account within 3-5 business days
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Revenue Opportunities */}
      <section className="py-16 px-4 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-display">
              Grow Your Revenue
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Optional promotional features to increase your visibility and sales
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-stone-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center mr-4">
                  <SparklesIcon className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">
                  Featured Products
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                Boost your best products to the top of search results and category pages
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <ArrowRightIcon className="w-4 h-4 text-amber-500 mr-2" />
                  7-day feature: $25
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <ArrowRightIcon className="w-4 h-4 text-amber-500 mr-2" />
                  14-day feature: $40
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <ArrowRightIcon className="w-4 h-4 text-amber-500 mr-2" />
                  30-day feature: $70
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-stone-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mr-4">
                  <ChartBarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">
                  Artisan Spotlight
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                Get featured on the homepage and in weekly newsletters
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <ArrowRightIcon className="w-4 h-4 text-purple-500 mr-2" />
                  Homepage feature
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <ArrowRightIcon className="w-4 h-4 text-purple-500 mr-2" />
                  Newsletter inclusion
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <ArrowRightIcon className="w-4 h-4 text-purple-500 mr-2" />
                  30 days: $100
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-stone-900 via-stone-800 to-emerald-900">
        <div className="max-w-4xl mx-auto text-center px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 backdrop-blur mb-6">
            <HeartIcon className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-6 font-display">
            Ready to Start Earning?
          </h2>
          <p className="text-xl text-stone-200 mb-8 leading-relaxed">
            Join our community of artisans and start building your business with complete transparency
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register?type=artisan"
              className="inline-flex items-center justify-center bg-emerald-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-emerald-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Become an Artisan
            </Link>
            <Link
              to="/dashboard-highlights"
              className="inline-flex items-center justify-center border-2 border-emerald-400 text-emerald-400 px-8 py-4 rounded-xl font-semibold hover:bg-emerald-400 hover:text-white transition-all"
            >
              <ChartBarIcon className="w-5 h-5 mr-2" />
              View Dashboard Benefits
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
