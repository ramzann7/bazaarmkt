// src/components/Home.jsx
import React, { useState } from 'react';
import { MagnifyingGlassIcon, MapPinIcon, TruckIcon, HeartIcon, StarIcon, UserGroupIcon, ChartBarIcon, CreditCardIcon, CogIcon } from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router-dom';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const categories = [
    {
      name: "Fresh Produce",
      img: "https://images.unsplash.com/photo-1506806732259-39c2d0268443?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Bakery",
      img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Dairy & Eggs",
      img: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Honey & Jams",
      img: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Maple Syrup",
      img: "https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Artisan Cheese",
      img: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Fresh Pasta",
      img: "https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Herbs & Spices",
      img: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    },
  ];

  const artisans = [
    {
      name: "Jean's Artisan Farm",
      desc: "Family-owned since 1985, known for premium organic apples.",
      img: "https://images.unsplash.com/photo-1606788075761-87986d1a6018?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Rosewood Artisan Bakery",
      desc: "Artisan sourdough and pastries, handcrafted daily.",
      img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Maple Grove Artisan Syrup",
      desc: "Locally tapped maple syrup, rich and authentic.",
      img: "https://images.unsplash.com/photo-1615485925600-49d5c3b18e30?auto=format&fit=crop&w=600&q=80",
    },
  ];

  const artisanBenefits = [
    {
      icon: UserGroupIcon,
      title: "Reach New Local Patrons",
      description: "Connect with patrons in your area who are actively seeking local, quality products."
    },
    {
      icon: TruckIcon,
      title: "Flexible Delivery Models",
      description: "Choose between direct delivery or hub-based distribution to fit your artisan business model."
    },
    {
      icon: CogIcon,
      title: "Simple Onboarding & Payments",
      description: "Easy setup process and secure payment processing to get you selling quickly."
    },
    {
      icon: ChartBarIcon,
      title: "Analytics & Insights",
      description: "Track your sales, understand patron preferences, and grow your artisan business with data-driven insights."
    }
  ];

  const artisanSteps = [
    {
      step: "1",
      title: "Sign Up",
      description: "Create your artisan profile in minutes with our simple registration process."
    },
    {
      step: "2",
      title: "Add Products",
      description: "Upload your products with photos, descriptions, and pricing information."
    },
    {
      step: "3",
      title: "Choose Delivery Model",
      description: "Select between direct delivery or hub-based distribution based on your needs."
    },
    {
      step: "4",
      title: "Get Paid",
      description: "Receive secure payments and track your earnings through our platform."
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-gray-800">
      {/* Hero Section */}
      <section
        className="relative h-[70vh] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl font-bold mb-4">Exceptional Local Products</h1>
          <p className="text-lg mb-6">
            From fresh produce to artisanal creations — crafted by local hands,
            delivered to your door.
          </p>
          
          {/* Search Bar with Suggestions */}
          <form onSubmit={handleSearch} className="max-w-md mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products..."
                className="w-full px-6 py-4 pl-14 text-lg border-2 border-white/20 rounded-full focus:border-white focus:ring-2 focus:ring-white/20 transition-all bg-white/10 backdrop-blur-sm text-white placeholder-white/80"
              />
              <MagnifyingGlassIcon className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-white/80" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-amber-600 text-white px-6 py-2 rounded-full hover:bg-amber-700 transition-colors"
              >
                Search
              </button>
            </div>
            {/* Search Suggestions */}
            <div className="mt-4 text-center">
              <p className="text-white/80 text-sm mb-2">Popular searches:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['fresh eggs', 'sourdough bread', 'maple syrup', 'organic honey', 'artisan cheese'].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setSearchQuery(suggestion)}
                    className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full hover:bg-white/30 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Hero Split CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/register"
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-2xl shadow-lg text-lg font-semibold transition-colors"
            >
              Start Shopping
            </Link>
            <Link
              to="/artisan/register"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-8 py-4 rounded-2xl shadow-lg text-lg font-semibold transition-colors border border-white/30"
            >
                              Sell on The Bazar
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-6xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-semibold text-center mb-10">
          Browse by Category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-2xl shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <img
                src={cat.img}
                alt={cat.name}
                className="h-40 w-full object-cover"
              />
              <div className="text-center py-4 bg-white">
                <h3 className="font-semibold text-lg">{cat.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Business Value Section */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
                            <h2 className="text-3xl font-semibold mb-4">Why Sell on The Bazar?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join our community of local artisans and farmers. We provide everything you need to reach new patrons and grow your artisan business.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {artisanBenefits.map((benefit, idx) => (
              <div key={idx} className="text-center">
                <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works for Sellers */}
      <section className="bg-neutral-100 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold mb-4">How It Works for Artisans</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get started in just a few simple steps and start selling your products to local patrons.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {artisanSteps.map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="bg-amber-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet the Artisans */}
      <section className="bg-white py-16 px-4">
        <h2 className="text-3xl font-semibold text-center mb-10">
          Meet the Artisans
        </h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {artisans.map((prod, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-2xl shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <img
                src={prod.img}
                alt={prod.name}
                className="h-48 w-full object-cover"
              />
              <div className="p-4 bg-white">
                <h3 className="font-semibold text-xl mb-2">{prod.name}</h3>
                <p className="text-sm text-gray-600">{prod.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dedicated CTA Block for Businesses */}
      <section className="bg-amber-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Grow Your Artisan Business?</h2>
          <p className="text-xl mb-8 text-amber-100">
                            Join hundreds of local artisans and farmers who are already selling on The Bazar. 
            Start reaching new patrons today.
          </p>
          <Link
            to="/artisan/register"
            className="inline-block bg-white text-amber-600 hover:bg-gray-100 px-12 py-4 rounded-2xl shadow-lg text-xl font-bold transition-colors"
          >
            Become an Artisan
          </Link>
        </div>
      </section>

      {/* Call to Action for Customers */}
      <section className="text-center py-16 bg-amber-50">
        <h2 className="text-3xl font-semibold mb-6">
          Local Quality. Delivered to You.
        </h2>
        <Link
          to="/register"
          className="inline-block bg-amber-700 hover:bg-amber-800 text-white px-8 py-4 rounded-2xl shadow-lg text-lg font-semibold transition-colors"
        >
          Start Shopping
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 text-center">
        <div className="flex justify-center gap-6 mb-4">
          <MapPinIcon className="w-6 h-6" />
          <TruckIcon className="w-6 h-6" />
        </div>
        <p className="text-sm">
                      © {new Date().getFullYear()} The Bazar. Exceptional local products,
          made close to home.
        </p>
      </footer>
    </div>
  );
}
