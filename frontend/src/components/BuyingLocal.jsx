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
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

const BuyingLocal = () => {
  const benefits = [
    {
      icon: HeartIcon,
      title: "Support Local Artisans",
      description: "Your purchases directly support local artisans, craftspeople, and small business owners, helping them sustain their livelihoods and keep their traditions alive.",
      color: "text-red-600"
    },
    {
      icon: SparklesIcon,
      title: "Fresh, Seasonal Products",
      description: "Local products are harvested at peak ripeness and delivered quickly, ensuring maximum freshness, flavor, and nutritional value.",
      color: "text-green-600"
    },
    {
      icon: GlobeAltIcon,
      title: "Reduce Environmental Impact",
      description: "Shorter transportation distances mean fewer carbon emissions, less packaging waste, and a smaller environmental footprint.",
      color: "text-blue-600"
    },
    {
      icon: UserGroupIcon,
      title: "Build Community Connections",
      description: "Meet the people behind your food, learn their stories, and become part of a vibrant local community network.",
      color: "text-purple-600"
    },
    {
      icon: StarIcon,
      title: "Higher Quality Ingredients",
      description: "Local artisans often use traditional methods and sustainable practices, resulting in superior taste and quality.",
      color: "text-yellow-600"
    },
    {
      icon: ClockIcon,
      title: "Seasonal Eating",
      description: "Connect with nature's rhythms by eating what's in season, which is often more nutritious and environmentally sustainable.",
      color: "text-orange-600"
    }
  ];

  const stats = [
    { number: "3x", label: "More money stays in your community when you buy local" },
    { number: "50%", label: "Less transportation emissions compared to imported goods" },
    { number: "24hrs", label: "Average time from farm to your table" },
    { number: "100%", label: "Transparency about how your food is produced" }
  ];

  const tips = [
    "Visit local markets to meet artisans face-to-face",
    "Join a Community Supported Agriculture (CSA) program",
    "Look for local product labels and certifications",
    "Ask restaurants and stores about their local sourcing",
    "Follow local artisans on social media for updates",
    "Plan meals around seasonal availability"
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-green-50 to-amber-50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Why Buy Local?
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover how choosing local products creates a positive impact on your community, 
            environment, and personal well-being.
          </p>
          <Link
            to="/search"
            className="inline-block bg-primary text-white px-8 py-4 rounded-2xl shadow-lg text-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Start Shopping Local
          </Link>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-semibold text-center mb-12">
            The Benefits of Buying Local
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-shadow">
                <div className={`w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-6`}>
                  <benefit.icon className={`w-8 h-8 ${benefit.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-semibold text-center mb-12">
            The Impact of Your Choices
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <p className="text-gray-600">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Get Started */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-semibold text-center mb-12">
            How to Start Buying Local
          </h2>
          <div className="bg-white rounded-2xl p-8 shadow-md">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Simple Steps to Get Started
                </h3>
                <ul className="space-y-3">
                  {tips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-600">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-primary-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Ready to Start?
                </h3>
                <p className="text-gray-600 mb-6">
                  Explore our marketplace to discover local producers and their amazing products. 
                  Every purchase makes a difference in your community.
                </p>
                <Link
                  to="/search"
                  className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors"
                >
                  Browse Local Products
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-primary">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-6">
            Join the Local Movement
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Every time you choose local, you're making a positive impact on your community, 
            environment, and the people who grow your food.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/search"
              className="inline-block bg-white text-primary px-8 py-4 rounded-2xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Start Shopping
            </Link>
                         <Link
               to="/artisans"
               className="inline-block border-2 border-white text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white hover:text-primary transition-colors"
             >
               Meet Our Artisans
             </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BuyingLocal;
