import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  BuildingStorefrontIcon, 
  HeartIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  SparklesIcon,
  QuestionMarkCircleIcon,
  EnvelopeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import Logo from './Logo';

export default function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-gradient-to-b from-stone-800 to-stone-900 text-white py-8 md:py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content - 3 columns on mobile, 4 on desktop */}
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 mb-6 md:mb-8">
          {/* Brand Section - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:block">
            <div className="flex items-center space-x-3 mb-4">
              <Logo showText={false} className="w-16 h-16" />
              <span className="text-2xl font-bold tracking-wide font-display">BazaarMkt</span>
            </div>
            <p className="text-gray-300 mb-4 text-sm leading-relaxed">
              {t('footer.tagline')}. Connecting communities with authentic, handcrafted products from local makers.
            </p>
            <div className="flex items-center space-x-2 text-xs text-amber-400">
              <HeartIcon className="w-4 h-4" />
              <span className="font-medium">Made with love for local communities</span>
            </div>
          </div>

          {/* Discover */}
          <div>
            <h3 className="text-xs md:text-base font-semibold mb-2 md:mb-4 font-display flex items-center">
              <ShoppingBagIcon className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2 text-amber-400" />
              <span className="text-xs md:text-base">{t('footer.discover')}</span>
            </h3>
            <ul className="space-y-1.5 md:space-y-2.5">
              <li>
                <Link to="/find-artisans" className="text-xs md:text-sm text-gray-300 hover:text-amber-400 transition-colors flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">{t('nav.findArtisans')}</span>
                </Link>
              </li>
              <li>
                <Link to="/search?view=all" className="text-xs md:text-sm text-gray-300 hover:text-amber-400 transition-colors flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">{t('footer.browseProducts')}</span>
                </Link>
              </li>
              <li>
                <Link to="/community" className="text-xs md:text-sm text-gray-300 hover:text-amber-400 transition-colors flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">{t('nav.community')}</span>
                </Link>
              </li>
              <li className="hidden md:block">
                <Link to="/buying-local" className="text-xs md:text-sm text-gray-300 hover:text-amber-400 transition-colors flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">{t('nav.buyingLocal')}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* For Artisans */}
          <div>
            <h3 className="text-xs md:text-base font-semibold mb-2 md:mb-4 font-display flex items-center">
              <BuildingStorefrontIcon className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2 text-amber-400" />
              <span className="text-xs md:text-base">{t('footer.forArtisans')}</span>
            </h3>
            <ul className="space-y-1.5 md:space-y-2.5">
              <li>
                <Link to="/register?type=artisan" className="text-xs md:text-sm text-gray-300 hover:text-amber-400 transition-colors flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">{t('footer.becomeArtisan')}</span>
                </Link>
              </li>
              <li className="hidden md:block">
                <Link to="/dashboard-highlights" className="text-xs md:text-sm text-gray-300 hover:text-amber-400 transition-colors flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">{t('footer.dashboardBenefits')}</span>
                </Link>
              </li>
              <li>
                <Link to="/transparency" className="text-xs md:text-sm text-gray-300 hover:text-amber-400 transition-colors flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">{t('footer.revenuePayouts')}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* About & Help */}
          <div>
            <h3 className="text-xs md:text-base font-semibold mb-2 md:mb-4 font-display flex items-center">
              <QuestionMarkCircleIcon className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2 text-amber-400" />
              <span className="text-xs md:text-base">{t('footer.aboutHelp')}</span>
            </h3>
            <ul className="space-y-1.5 md:space-y-2.5">
              <li>
                <Link to="/how-it-works" className="text-xs md:text-sm text-gray-300 hover:text-amber-400 transition-colors flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">{t('nav.howItWorks')}</span>
                </Link>
              </li>
              <li className="hidden md:block">
                <Link to="/profile" className="text-xs md:text-sm text-gray-300 hover:text-amber-400 transition-colors flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">{t('footer.myAccount')}</span>
                </Link>
              </li>
              <li className="hidden md:block">
                <Link to="/orders" className="text-xs md:text-sm text-gray-300 hover:text-amber-400 transition-colors flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">{t('nav.myOrders')}</span>
                </Link>
              </li>
              <li>
                <a href="mailto:support@bazaarmkt.com" className="text-xs md:text-sm text-gray-300 hover:text-amber-400 transition-colors flex items-center group">
                  <EnvelopeIcon className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  <span className="group-hover:translate-x-1 transition-transform">{t('footer.contactSupport')}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section - Simplified on mobile */}
        <div className="border-t border-stone-700 mt-6 md:mt-8 pt-6 md:pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
            <p className="text-xs md:text-sm text-gray-400 text-center md:text-left">
              {t('footer.copyright')}
            </p>
            <div className="flex flex-wrap justify-center md:justify-end gap-3 md:gap-6">
              <Link to="/how-it-works" className="text-xs md:text-sm text-gray-400 hover:text-amber-400 transition-colors">
                {t('nav.howItWorks')}
              </Link>
              <Link to="/privacy" className="text-xs md:text-sm text-gray-400 hover:text-amber-400 transition-colors">
                {t('common.privacy')}
              </Link>
              <Link to="/terms" className="text-xs md:text-sm text-gray-400 hover:text-amber-400 transition-colors">
                {t('common.terms')}
              </Link>
              <Link to="/transparency" className="text-xs md:text-sm text-gray-400 hover:text-amber-400 transition-colors">
                {t('footer.transparency')}
              </Link>
            </div>
          </div>
          
          {/* Trust Indicators - Hidden on mobile, simplified on tablet */}
          <div className="hidden md:flex flex-wrap justify-center items-center gap-4 lg:gap-6 mt-6 pt-6 border-t border-stone-700">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <MapPinIcon className="w-4 h-4 text-green-400" />
              <span>{t('footer.trustIndicators.localArtisans')}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <HeartIcon className="w-4 h-4 text-red-400" />
              <span>{t('footer.trustIndicators.supportingCommunities')}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <SparklesIcon className="w-4 h-4 text-amber-400" />
              <span>{t('footer.trustIndicators.authenticProducts')}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <UserGroupIcon className="w-4 h-4 text-blue-400" />
              <span>{t('footer.trustIndicators.communityFirst')}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
