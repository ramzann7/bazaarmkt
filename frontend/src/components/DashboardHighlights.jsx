import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon,
  ShoppingBagIcon,
  BellIcon,
  SparklesIcon,
  TruckIcon,
  UserGroupIcon,
  CreditCardIcon,
  ChartPieIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { VECTEEZY_CRAFTSMAN } from '../config/environment';

export default function DashboardHighlights() {
  const dashboardFeatures = [
    {
      icon: ChartBarIcon,
      title: "Revenue Analytics",
      description: "Track your sales performance with detailed analytics including daily, weekly, and monthly revenue trends.",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      features: [
        "Real-time revenue tracking",
        "Sales performance graphs",
        "Revenue breakdown by product",
        "Historical comparison tools"
      ]
    },
    {
      icon: ShoppingBagIcon,
      title: "Order Management",
      description: "Efficiently manage all your orders in one place with real-time notifications and status updates.",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      features: [
        "Order status tracking",
        "Customer information",
        "Delivery management",
        "Order history"
      ]
    },
    {
      icon: CreditCardIcon,
      title: "Wallet & Earnings",
      description: "Monitor your earnings, pending balance, and payout history with complete transparency.",
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      features: [
        "Current balance overview",
        "Pending earnings",
        "Payout history",
        "Transaction details"
      ]
    },
    {
      icon: ChartPieIcon,
      title: "Product Analytics",
      description: "Understand which products perform best and optimize your inventory accordingly.",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      features: [
        "Best-selling products",
        "Product view statistics",
        "Inventory levels",
        "Performance insights"
      ]
    },
    {
      icon: UserGroupIcon,
      title: "Customer Insights",
      description: "Learn about your customers and their purchasing patterns to grow your business.",
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      features: [
        "Customer demographics",
        "Purchase patterns",
        "Customer reviews",
        "Repeat customer tracking"
      ]
    },
    {
      icon: BellIcon,
      title: "Real-time Notifications",
      description: "Stay informed with instant notifications for new orders, reviews, and important updates.",
      color: "text-red-600",
      bgColor: "bg-red-100",
      features: [
        "New order alerts",
        "Review notifications",
        "Low inventory warnings",
        "Payout confirmations"
      ]
    }
  ];

  const stats = [
    { value: "24/7", label: "Dashboard Access" },
    { value: "Real-time", label: "Data Updates" },
    { value: "100%", label: "Transparent" },
    { value: "Secure", label: "All Transactions" }
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-stone-100 via-stone-200 to-stone-300 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={VECTEEZY_CRAFTSMAN}
            alt="Craftsman meticulously painting miniature soldiers"
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-stone-100/90 via-stone-200/85 to-stone-300/90"></div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-stone-800/10 backdrop-blur mb-6">
            <ChartBarIcon className="w-10 h-10 text-stone-800" />
          </div>
          <h1 className="text-5xl font-bold text-stone-900 mb-6 font-display">
            Artisan Dashboard Benefits
          </h1>
          <p className="text-xl text-stone-700 mb-8 max-w-3xl mx-auto leading-relaxed">
            Everything you need to manage and grow your artisan business, all in one powerful dashboard
          </p>
          <Link
            to="/register?type=artisan"
            className="inline-flex items-center bg-stone-800 text-white px-8 py-4 rounded-xl shadow-lg text-lg font-semibold hover:bg-stone-900 transition-all hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <SparklesIcon className="w-6 h-6 mr-2" />
            Become an Artisan
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-amber-600 mb-2 font-display">
                  {stat.value}
                </div>
                <p className="text-stone-600 text-sm font-medium">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-display">
              Complete Business Visibility
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your artisan dashboard provides comprehensive insights and tools to manage every aspect of your business
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dashboardFeatures.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-all border border-stone-200">
                <div className={`w-16 h-16 rounded-xl ${feature.bgColor} flex items-center justify-center mb-6`}>
                  <feature.icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 font-display">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed text-sm">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-16 bg-gradient-to-br from-stone-900 to-stone-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4 font-display">
              Powerful Analytics at Your Fingertips
            </h2>
            <p className="text-lg text-stone-300 max-w-2xl mx-auto">
              Make data-driven decisions with beautiful, easy-to-understand charts and reports
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Mock Dashboard Cards */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Revenue Overview</h3>
                <CurrencyDollarIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">$2,450</div>
              <p className="text-sm text-emerald-400">+12% from last week</p>
              <div className="mt-4 h-24 bg-emerald-500/20 rounded-lg flex items-end justify-around p-2">
                <div className="w-8 bg-emerald-500 rounded-t" style={{height: '40%'}}></div>
                <div className="w-8 bg-emerald-500 rounded-t" style={{height: '60%'}}></div>
                <div className="w-8 bg-emerald-500 rounded-t" style={{height: '80%'}}></div>
                <div className="w-8 bg-emerald-500 rounded-t" style={{height: '100%'}}></div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Orders This Week</h3>
                <ShoppingBagIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">24</div>
              <p className="text-sm text-blue-400">+8 new orders today</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">Pending</span>
                  <span className="text-white font-medium">8</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">Processing</span>
                  <span className="text-white font-medium">12</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">Completed</span>
                  <span className="text-white font-medium">4</span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Wallet Balance</h3>
                <CreditCardIcon className="w-6 h-6 text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">$1,890</div>
              <p className="text-sm text-amber-400">Next payout: Friday</p>
              <div className="mt-4 bg-amber-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-stone-300">Available</span>
                  <span className="text-white font-medium">$1,890</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">Pending</span>
                  <span className="text-white font-medium">$560</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-6">
            <SparklesIcon className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6 font-display">
            Ready to Start Your Artisan Journey?
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Join our community of local artisans and get access to all these powerful tools to grow your business
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register?type=artisan"
              className="inline-flex items-center justify-center bg-amber-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-amber-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <UserGroupIcon className="w-5 h-5 mr-2" />
              Become an Artisan
            </Link>
            <Link
              to="/transparency"
              className="inline-flex items-center justify-center border-2 border-amber-600 text-amber-600 px-8 py-4 rounded-xl font-semibold hover:bg-amber-50 transition-all"
            >
              <CurrencyDollarIcon className="w-5 h-5 mr-2" />
              View Revenue Model
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

