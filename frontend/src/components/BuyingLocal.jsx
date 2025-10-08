import React from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartIcon, 
  TruckIcon, 
  GlobeAltIcon, 
  UserGroupIcon, 
  StarIcon,
  SparklesIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';

const BuyingLocal = () => {
  const benefits = [
    {
      icon: HeartIcon,
      title: "Support Local Artisans",
      description: "Your purchases directly support local artisans, craftspeople, and small business owners, helping them sustain their livelihoods and preserve their traditional crafts.",
      color: "text-red-600"
    },
    {
      icon: SparklesIcon,
      title: "Authentic Handcrafted Quality",
      description: "Each product is carefully handcrafted with attention to detail, ensuring unique, high-quality items you won't find anywhere else.",
      color: "text-amber-600"
    },
    {
      icon: GlobeAltIcon,
      title: "Reduce Environmental Impact",
      description: "Shorter transportation distances and sustainable practices mean fewer carbon emissions, less packaging waste, and a smaller environmental footprint.",
      color: "text-emerald-600"
    },
    {
      icon: UserGroupIcon,
      title: "Build Community Connections",
      description: "Meet the artisans behind your purchases, learn their stories, and become part of a vibrant local community network.",
      color: "text-indigo-600"
    },
    {
      icon: StarIcon,
      title: "Preserve Traditional Crafts",
      description: "Local artisans use time-honored techniques passed down through generations, creating products with cultural significance and superior craftsmanship.",
      color: "text-amber-500"
    },
    {
      icon: CurrencyDollarIcon,
      title: "Strengthen Local Economy",
      description: "Money spent on local artisans circulates within the community, creating jobs and fostering economic growth right where you live.",
      color: "text-green-600"
    }
  ];

  const stats = [
    { number: "3x", label: "More money stays in your community when you buy local" },
    { number: "68%", label: "Less carbon footprint compared to mass-produced goods" },
    { number: "100%", label: "Authentic handcrafted products from local makers" },
    { number: "Direct", label: "Connection with artisans and their craft stories" }
  ];

  const tips = [
    "Explore our marketplace to discover talented local artisans",
    "Read artisan profiles to learn about their craft and story",
    "Follow your favorite artisans for new product releases",
    "Share your purchases on social media to support local makers",
    "Leave reviews to help artisans grow their businesses",
    "Gift local handcrafted items to spread community love"
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/vecteezy_exploring-a-vibrant-artisan-market-and-selecting-pottery-on_70827611.jpeg" 
            alt="Vibrant artisan market with pottery"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/95 via-orange-50/90 to-stone-100/95"></div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-6">
            <HeartIcon className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 font-display">
            Why Buy Local?
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Every purchase from a local artisan strengthens your community, preserves traditional crafts, 
            and creates meaningful connections that go far beyond the transaction.
          </p>
          <Link
            to="/search?view=all"
            className="inline-flex items-center bg-amber-600 text-white px-8 py-4 rounded-xl shadow-lg text-lg font-semibold hover:bg-amber-700 transition-all hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <ShoppingBagIcon className="w-6 h-6 mr-2" />
            Explore Local Artisans
          </Link>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 font-display">
            The Benefits of Supporting Local Artisans
          </h2>
          <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
            When you choose local, you're not just buying a product—you're investing in people, craftsmanship, and community.
          </p>
          
          {/* Feature Image - Spinning Wheel Artisan */}
          <div className="mb-12 rounded-2xl overflow-hidden shadow-xl max-w-4xl mx-auto">
            <img 
              src="/vecteezy_a-man-is-spinning-yarn-on-a-spinning-wheel_69187328.jpg" 
              alt="Artisan crafting on spinning wheel - traditional craftsmanship"
              className="w-full h-80 object-cover"
            />
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-all border border-stone-100">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center mb-6`}>
                  <benefit.icon className={`w-8 h-8 ${benefit.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 font-display">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-stone-900 to-stone-800">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4 text-white font-display">
            The Impact of Your Choices
          </h2>
          <p className="text-center text-stone-300 mb-12 max-w-2xl mx-auto">
            Every purchase from a local artisan creates ripples throughout the community
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center bg-stone-800/50 rounded-xl p-6 backdrop-blur">
                <div className="text-5xl font-bold text-amber-400 mb-3 font-display">
                  {stat.number}
                </div>
                <p className="text-stone-200 text-sm leading-relaxed">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Get Started */}
      <section className="py-16 px-4 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 font-display">
            How to Support Local Artisans
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Getting started is easy—and every small action makes a big difference
          </p>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Image Section */}
            <div className="lg:col-span-1 rounded-xl overflow-hidden shadow-lg">
              <img 
                src="/vecteezy_a-woman-working-on-a-wooden-box-in-a-workshop_68945818.jpeg" 
                alt="Artisan crafting wooden products in workshop"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Content Section */}
            <div className="lg:col-span-2 grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-sm border border-stone-200">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center mr-4">
                    <SparklesIcon className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 font-display">
                    Simple Steps to Get Started
                  </h3>
                </div>
                <ul className="space-y-4">
                  {tips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                        <span className="text-xs font-semibold text-amber-700">{index + 1}</span>
                      </div>
                      <span className="text-gray-600 text-sm leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-8 text-white shadow-lg">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center mr-4">
                    <HeartIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold font-display">
                    Ready to Start?
                  </h3>
                </div>
                <p className="text-white/90 mb-6 leading-relaxed">
                  Explore our marketplace to discover talented local artisans and their amazing handcrafted products. 
                  Every purchase makes a real difference in someone's life and strengthens your community.
                </p>
                <div className="space-y-3">
                  <Link
                    to="/search?view=all"
                    className="block w-full text-center bg-white text-amber-600 px-6 py-3 rounded-lg font-semibold hover:bg-stone-50 transition-all shadow-md hover:shadow-lg"
                  >
                    Browse All Products
                  </Link>
                  <Link
                    to="/find-artisans"
                    className="block w-full text-center border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-all backdrop-blur"
                  >
                    Discover Artisans
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900">
        <div className="max-w-4xl mx-auto text-center px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 backdrop-blur mb-6">
            <UserGroupIcon className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-6 font-display">
            Join the Local Movement
          </h2>
          <p className="text-xl text-stone-200 mb-8 leading-relaxed">
            Every time you choose to support a local artisan, you're preserving traditions, 
            sustaining livelihoods, and building a stronger, more connected community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/search?view=all"
              className="inline-flex items-center justify-center bg-amber-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-amber-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <ShoppingBagIcon className="w-5 h-5 mr-2" />
              Start Shopping
            </Link>
            <Link
              to="/find-artisans"
              className="inline-flex items-center justify-center border-2 border-amber-400 text-amber-400 px-8 py-4 rounded-xl font-semibold hover:bg-amber-400 hover:text-white transition-all"
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Meet Our Artisans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BuyingLocal;
