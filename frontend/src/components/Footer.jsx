import React from 'react';
import { Link } from 'react-router-dom';
import { BuildingStorefrontIcon, HeartIcon } from '@heroicons/react/24/outline';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="bg-[#2E2E2E] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <Logo showText={false} className="w-20 h-20" />
              <span className="text-2xl font-bold tracking-wide">Bazaar</span>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              Supporting local artisans with love. Empowering neighbours, artisans, and farmers to share their craft with the community.
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <HeartIcon className="w-4 h-4 text-[#D77A61]" />
              <span>Made with love for local communities</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 font-serif">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-[#E6B655] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/find-artisans" className="text-gray-300 hover:text-[#E6B655] transition-colors">
                  Find Artisans
                </Link>
              </li>
              <li>
                <Link to="/community" className="text-gray-300 hover:text-[#E6B655] transition-colors">
                  Community
                </Link>
              </li>
              <li>
                <Link to="/buying-local" className="text-gray-300 hover:text-[#E6B655] transition-colors">
                  Why Buy Local
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4 font-serif">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/profile" className="text-gray-300 hover:text-[#E6B655] transition-colors">
                  My Account
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-gray-300 hover:text-[#E6B655] transition-colors">
                  My Orders
                </Link>
              </li>
              <li>
                <Link to="/transparency" className="text-gray-300 hover:text-[#E6B655] transition-colors">
                  Revenue Transparency
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400 text-center md:text-left">
              © 2025 Bazaar. Supporting local artisans with love.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy" className="text-sm text-gray-400 hover:text-[#E6B655] transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm text-gray-400 hover:text-[#E6B655] transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
