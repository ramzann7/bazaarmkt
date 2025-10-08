import React, { useState, useEffect } from 'react';
import { 
  InformationCircleIcon, 
  HeartIcon, 
  CurrencyDollarIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { revenueService } from '../services/revenueService';
import { getPlatformSettings } from '../services/adminService';

export default function RevenueTransparency() {
  const [transparencyInfo, setTransparencyInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [platformFee, setPlatformFee] = useState(10); // Default 10%
  const [paymentFee, setPaymentFee] = useState(2.9); // Default 2.9%

  useEffect(() => {
    loadTransparencyInfo();
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
    }
  };

  const loadTransparencyInfo = async () => {
    try {
      setIsLoading(true);
      const info = await revenueService.getTransparencyInfo();
      setTransparencyInfo(info);
    } catch (error) {
      console.error('Error loading transparency info:', error);
      // Fallback to static data with dynamic fees
      const artisanEarnings = 100 - platformFee - paymentFee;
      setTransparencyInfo({
        commissionStructure: {
          platformCommission: `${platformFee}%`,
          artisanEarnings: `${artisanEarnings}%`,
          description: `For every sale, artisans receive ${artisanEarnings}% of the total amount while ${platformFee}% goes to platform maintenance and development.`
        },
        promotionalFeatures: {
          description: 'Artisans can purchase additional promotional features to increase visibility and sales.',
          availableFeatures: [
            'Featured Product ($25/7 days)',
            'Sponsored Product ($50/14 days)',
            'Artisan Spotlight ($100/30 days)',
            'Search Boost ($35/21 days)'
          ]
        },
        paymentProcessing: {
          description: 'All payments are processed securely through Stripe with transparent fee structure.',
          processingFees: `Standard Stripe processing fees apply (${paymentFee}% + 30¢ per transaction)`
        },
        settlement: {
          description: 'Artisan earnings are settled weekly via direct deposit or PayPal.',
          minimumPayout: '$25',
          processingTime: '3-5 business days'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <HeartIcon className="h-6 w-6 text-orange-500 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">Supporting Local Artisans</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Commission Structure */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 text-green-600 mr-2" />
            Fair Revenue Sharing
          </h3>
          
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{(100 - platformFee - paymentFee).toFixed(1)}%</div>
                <p className="text-sm text-gray-600">Net to Artisans</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{platformFee}%</div>
                <p className="text-sm text-gray-600">Platform Fee</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            {transparencyInfo?.commissionStructure?.description || 
              `For every sale, artisans receive ${(100 - platformFee - paymentFee).toFixed(1)}% of the total amount (after ${platformFee}% platform fee and ${paymentFee}% payment processing).`}
          </p>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
              No hidden fees or surprise charges
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
              Transparent pricing structure
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
              Weekly payouts to artisans
            </div>
          </div>
        </div>

        {/* How Your Purchase Helps */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
            How Your Purchase Helps
          </h3>

          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Direct Support</h4>
              <p className="text-sm text-gray-600">
                Your purchase directly supports local artisans and their families, helping them grow their businesses.
              </p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Platform Development</h4>
              <p className="text-sm text-gray-600">
                The {platformFee}% platform fee helps us maintain and improve the marketplace, ensuring better service for everyone.
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Community Growth</h4>
              <p className="text-sm text-gray-600">
                By supporting local artisans, you're helping build stronger, more sustainable communities.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Features */}
      {transparencyInfo?.promotionalFeatures && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Artisan Growth Opportunities</h3>
          <p className="text-sm text-gray-600 mb-4">
            {transparencyInfo.promotionalFeatures.description}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transparencyInfo.promotionalFeatures.availableFeatures.map((feature, index) => (
              <div key={index} className="flex items-center text-sm text-gray-600">
                <ArrowRightIcon className="h-4 w-4 text-orange-500 mr-2" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Processing Info */}
      {transparencyInfo?.paymentProcessing && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Secure Payment Processing</h3>
          <p className="text-sm text-gray-600">
            {transparencyInfo.paymentProcessing.description}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {transparencyInfo.paymentProcessing.processingFees}
          </p>
        </div>
      )}

      {/* Call to Action */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Every Purchase Makes a Difference
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            When you buy from local artisans, you're not just getting quality products - you're supporting dreams, families, and communities.
          </p>
          <div className="flex items-center justify-center text-sm text-orange-600 font-medium">
            <HeartIcon className="h-4 w-4 mr-2" />
            Thank you for supporting local artisans!
          </div>
        </div>
      </div>
    </div>
  );
}
