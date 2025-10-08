import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheckIcon,
  DocumentTextIcon,
  ScaleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { getPlatformSettings } from '../services/adminService';

export default function TermsOfService() {
  const [platformFee, setPlatformFee] = useState(10); // Default 10%
  const [paymentFee, setPaymentFee] = useState(2.9); // Default 2.9%

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
      }
    };
    
    loadPlatformSettings();
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-stone-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-4">
            <DocumentTextIcon className="w-12 h-12 text-amber-400" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-center font-display">
            Terms of Service
          </h1>
          <p className="text-lg text-stone-300 text-center">
            Last Updated: October 8, 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 mb-8">
          <div className="flex items-start mb-4">
            <ScaleIcon className="w-6 h-6 text-amber-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">Agreement to Terms</h2>
              <p className="text-stone-600 mb-4">
                Welcome to BazaarMkt ("Company," "we," "our," "us"). By accessing or using the BazaarMkt platform ("Platform," "Service"), 
                you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
              </p>
              <p className="text-stone-600">
                These Terms constitute a legally binding agreement between you and BazaarMkt regarding your use of the Platform, 
                whether as a customer ("Patron") or artisan ("Artisan," "Seller").
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Definitions */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">1. Definitions</h2>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold text-stone-900 mb-1">"Platform"</dt>
                <dd className="text-stone-600 ml-4">The BazaarMkt website, mobile application, and all associated services.</dd>
              </div>
              <div>
                <dt className="font-semibold text-stone-900 mb-1">"Artisan" or "Seller"</dt>
                <dd className="text-stone-600 ml-4">A registered user who lists and sells handcrafted products on the Platform.</dd>
              </div>
              <div>
                <dt className="font-semibold text-stone-900 mb-1">"Patron" or "Customer"</dt>
                <dd className="text-stone-600 ml-4">A registered user who purchases products from Artisans through the Platform.</dd>
              </div>
              <div>
                <dt className="font-semibold text-stone-900 mb-1">"Product"</dt>
                <dd className="text-stone-600 ml-4">Any handcrafted item listed for sale by an Artisan on the Platform.</dd>
              </div>
              <div>
                <dt className="font-semibold text-stone-900 mb-1">"Order"</dt>
                <dd className="text-stone-600 ml-4">A transaction initiated by a Patron to purchase Product(s) from an Artisan.</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Section 2: Account Registration */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">2. Account Registration and Eligibility</h2>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">2.1 Eligibility</h3>
              <p className="text-stone-600">
                You must be at least 18 years of age to use the Platform. By using the Platform, you represent and warrant that you meet this requirement.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">2.2 Account Creation</h3>
              <p className="text-stone-600 mb-2">
                To use certain features, you must register for an account. You agree to:
              </p>
              <ul className="list-disc ml-8 text-stone-600 space-y-1">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">2.3 Account Types</h3>
              <p className="text-stone-600 mb-2">
                The Platform offers two account types:
              </p>
              <ul className="list-disc ml-8 text-stone-600 space-y-1">
                <li><strong>Patron Account:</strong> For customers purchasing products</li>
                <li><strong>Artisan Account:</strong> For sellers listing and selling handcrafted products</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: For Patrons */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">3. Terms for Patrons (Customers)</h2>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">3.1 Purchases</h3>
              <p className="text-stone-600">
                All purchases are made directly from Artisans. BazaarMkt facilitates the transaction but is not a party to the sale. 
                You agree to pay all charges at the prices in effect when incurred, including applicable taxes and delivery fees.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">3.2 Payment</h3>
              <p className="text-stone-600 mb-2">
                Payment is processed securely through Stripe at checkout. By providing payment information, you:
              </p>
              <ul className="list-disc ml-8 text-stone-600 space-y-1">
                <li>Authorize us to charge your payment method for all purchases</li>
                <li>Represent that you are authorized to use the payment method</li>
                <li>Agree that payment information is accurate and complete</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">3.3 Order Confirmation and Fulfillment</h3>
              <p className="text-stone-600">
                After placing an order, you will receive confirmation via email. Artisans are responsible for fulfilling orders 
                according to their stated preparation times and delivery methods. You must confirm receipt of completed orders 
                within a reasonable timeframe.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">3.4 Cancellations and Refunds</h3>
              <p className="text-stone-600">
                You may cancel orders before the Artisan confirms them. Once confirmed, cancellations are subject to the Artisan's 
                approval. Full refunds are issued for cancelled orders. The Artisan may decline orders with valid reason, 
                resulting in an automatic full refund.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">3.5 Product Quality</h3>
              <p className="text-stone-600">
                While we strive to ensure quality, all products are handcrafted by independent Artisans. BazaarMkt does not guarantee 
                product quality, suitability, or fitness for any particular purpose. Disputes should be resolved directly with the Artisan.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: For Artisans */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">4. Terms for Artisans (Sellers)</h2>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">4.1 Listing Products</h3>
              <p className="text-stone-600 mb-2">
                As an Artisan, you may list handcrafted products on the Platform. You represent and warrant that:
              </p>
              <ul className="list-disc ml-8 text-stone-600 space-y-1">
                <li>You own or have the right to sell all listed products</li>
                <li>Product descriptions and images are accurate and truthful</li>
                <li>Products comply with all applicable laws and regulations</li>
                <li>Products are handcrafted and meet quality standards</li>
                <li>Pricing is accurate and includes all necessary information</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">4.2 Prohibited Items</h3>
              <p className="text-stone-600 mb-2">
                You may not list the following:
              </p>
              <ul className="list-disc ml-8 text-stone-600 space-y-1">
                <li>Illegal items or items that violate any laws</li>
                <li>Counterfeit or unauthorized replica products</li>
                <li>Products that infringe on intellectual property rights</li>
                <li>Hazardous, dangerous, or recalled items</li>
                <li>Items prohibited by payment processors</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">4.3 Order Fulfillment</h3>
              <p className="text-stone-600">
                You are solely responsible for fulfilling orders accurately and timely. You must update order status promptly, 
                maintain accurate inventory, and fulfill orders according to your stated preparation times and delivery methods.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">4.4 Fees and Payment</h3>
              <p className="text-stone-600 mb-2">
                BazaarMkt charges the following fees:
              </p>
              <ul className="list-disc ml-8 text-stone-600 space-y-1">
                <li><strong>Platform Fee:</strong> {platformFee}% of product sales (not applied to delivery fees)</li>
                <li><strong>Payment Processing Fee:</strong> {paymentFee}% on total transaction amount (charged by Stripe)</li>
              </ul>
              <p className="text-stone-600 mt-2">
                Revenue is credited to your BazaarMkt Wallet when Patrons confirm receipt. Automatic weekly payouts are processed 
                every Friday for balances over $50, arriving within 2-3 business days.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">4.5 Taxes</h3>
              <p className="text-stone-600">
                You are responsible for determining and paying all applicable taxes related to your sales, including sales tax, 
                GST/HST, income tax, and business taxes. BazaarMkt does not collect or remit taxes on your behalf.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">4.6 Business Compliance</h3>
              <p className="text-stone-600">
                You are responsible for obtaining all necessary licenses, permits, and insurance required to operate your business 
                and sell products in your jurisdiction.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Platform Rules */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">5. Platform Rules and Conduct</h2>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">5.1 Prohibited Activities</h3>
              <p className="text-stone-600 mb-2">
                You agree not to:
              </p>
              <ul className="list-disc ml-8 text-stone-600 space-y-1">
                <li>Violate any laws, regulations, or third-party rights</li>
                <li>Provide false, inaccurate, or misleading information</li>
                <li>Impersonate any person or entity</li>
                <li>Interfere with or disrupt the Platform or servers</li>
                <li>Attempt to gain unauthorized access to any systems</li>
                <li>Use automated tools to access or scrape the Platform</li>
                <li>Engage in fraudulent or deceptive practices</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Circumvent any security features or payment processes</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">5.2 Content Standards</h3>
              <p className="text-stone-600">
                All content you post (product listings, reviews, messages) must be respectful, accurate, and comply with our 
                community standards. We reserve the right to remove any content that violates these Terms.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Intellectual Property */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">6. Intellectual Property Rights</h2>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">6.1 Platform Ownership</h3>
              <p className="text-stone-600">
                The Platform, including all content, features, functionality, software, and design, is owned by BazaarMkt and is 
                protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, 
                or create derivative works without express written permission.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">6.2 User Content License</h3>
              <p className="text-stone-600">
                By posting content on the Platform (product listings, photos, descriptions), you grant BazaarMkt a worldwide, 
                non-exclusive, royalty-free license to use, display, reproduce, and distribute such content for the purpose of 
                operating and promoting the Platform. You retain all ownership rights to your content.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">6.3 Trademark</h3>
              <p className="text-stone-600">
                "BazaarMkt" and all related logos are trademarks of BazaarMkt. You may not use our trademarks without prior written consent.
              </p>
            </div>
          </div>
        </section>

        {/* Section 7: Payment Terms */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">7. Payment and Financial Terms</h2>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">7.1 Payment Processing</h3>
              <p className="text-stone-600">
                All payments are processed through Stripe, our third-party payment processor. By using the Platform, you agree to 
                Stripe's Terms of Service and Privacy Policy.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">7.2 Platform Fees</h3>
              <p className="text-stone-600 mb-2">
                BazaarMkt charges a platform fee of {platformFee}% on product sales. This fee:
              </p>
              <ul className="list-disc ml-8 text-stone-600 space-y-1">
                <li>Is calculated as a percentage of the product subtotal (excluding delivery fees)</li>
                <li>Does not apply to delivery fees (artisans keep 100% of delivery fees)</li>
                <li>Is automatically deducted before crediting revenue to Artisan Wallets</li>
                <li>May be adjusted with 30 days notice to Artisans</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">7.3 Payment Processing Fees</h3>
              <p className="text-stone-600">
                Stripe charges a payment processing fee of {paymentFee}% on the total transaction amount. This fee is deducted from 
                Artisan earnings.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">7.4 Artisan Payouts</h3>
              <p className="text-stone-600 mb-2">
                Artisan payouts are processed as follows:
              </p>
              <ul className="list-disc ml-8 text-stone-600 space-y-1">
                <li>Revenue is credited to Wallet when Patrons confirm order receipt</li>
                <li>Automatic weekly payouts every Friday</li>
                <li>Minimum balance of $50 required for payout</li>
                <li>Funds typically arrive within 2-3 business days</li>
                <li>Valid bank account information must be on file</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">7.5 Refunds</h3>
              <p className="text-stone-600">
                Refunds are issued for cancelled or declined orders. Funds are returned to the original payment method within 
                5-10 business days. Artisan revenue is not credited until Patron confirms receipt, protecting both parties.
              </p>
            </div>
          </div>
        </section>

        {/* Section 8: Delivery and Fulfillment */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">8. Delivery and Fulfillment</h2>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">8.1 Delivery Methods</h3>
              <p className="text-stone-600 mb-2">
                Artisans may offer:
              </p>
              <ul className="list-disc ml-8 text-stone-600 space-y-1">
                <li><strong>Pickup:</strong> Patron collects order at Artisan's location</li>
                <li><strong>Personal Delivery:</strong> Artisan delivers within their specified radius</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">8.2 Artisan Responsibilities</h3>
              <p className="text-stone-600">
                Artisans are responsible for packaging orders safely, coordinating pickup times or deliveries, and ensuring products 
                arrive in good condition.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">8.3 Patron Responsibilities</h3>
              <p className="text-stone-600">
                Patrons must be available at the scheduled pickup/delivery time, inspect products upon receipt, and confirm receipt 
                through the Platform to release payment to the Artisan.
              </p>
            </div>
          </div>
        </section>

        {/* Section 9: Disputes */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">9. Disputes and Resolution</h2>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">9.1 Direct Resolution</h3>
              <p className="text-stone-600">
                We encourage Patrons and Artisans to resolve disputes directly and amicably. The Platform provides messaging 
                features to facilitate communication.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">9.2 Platform Mediation</h3>
              <p className="text-stone-600">
                If direct resolution fails, contact our support team at support@bazaarmkt.com. We will review the situation and 
                may mediate disputes, but final resolution authority rests with the parties involved.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">9.3 Limitation of Liability</h3>
              <p className="text-stone-600">
                BazaarMkt is a marketplace platform connecting Artisans and Patrons. We are not responsible for the quality, safety, 
                or legality of products listed, the accuracy of listings, or the ability of Artisans to fulfill orders.
              </p>
            </div>
          </div>
        </section>

        {/* Section 10: Privacy and Data */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">10. Privacy and Data Protection</h2>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">10.1 Data Collection</h3>
              <p className="text-stone-600">
                Our use of your personal information is governed by our <Link to="/privacy" className="text-amber-600 hover:text-amber-700 underline">Privacy Policy</Link>. 
                By using the Platform, you consent to our data practices as described in the Privacy Policy.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">10.2 Data Security</h3>
              <p className="text-stone-600">
                We implement reasonable security measures to protect your data. However, no method of transmission over the internet 
                is 100% secure. You acknowledge the inherent security risks of providing information online.
              </p>
            </div>
          </div>
        </section>

        {/* Section 11: Liability and Disclaimers */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">11. Disclaimers and Limitation of Liability</h2>
          <div className="bg-amber-50 rounded-xl border-2 border-amber-200 p-6 space-y-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-stone-900 mb-2">11.1 "As Is" Basis</h3>
                <p className="text-stone-600">
                  THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. 
                  WE DISCLAIM ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">11.2 Limitation of Liability</h3>
              <p className="text-stone-600">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, BAZAAR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, 
                OR ANY LOSS OF DATA, USE, OR GOODWILL.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">11.3 Maximum Liability</h3>
              <p className="text-stone-600">
                Our total liability to you for any claims arising from your use of the Platform shall not exceed the greater of 
                (a) the amount you have paid to BazaarMkt in the past 12 months, or (b) $100.
              </p>
            </div>
          </div>
        </section>

        {/* Section 12: Termination */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">12. Account Termination</h2>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">12.1 Voluntary Termination</h3>
              <p className="text-stone-600">
                You may close your account at any time through your account settings. Outstanding orders must be completed, 
                and pending payments must be settled before account closure.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">12.2 Termination by BazaarMkt</h3>
              <p className="text-stone-600 mb-2">
                We reserve the right to suspend or terminate your account if you:
              </p>
              <ul className="list-disc ml-8 text-stone-600 space-y-1">
                <li>Violate these Terms of Service</li>
                <li>Engage in fraudulent or illegal activities</li>
                <li>Harm the Platform or other users</li>
                <li>Fail to pay fees or charges owed</li>
                <li>Provide false or misleading information</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">12.3 Effect of Termination</h3>
              <p className="text-stone-600">
                Upon termination, your right to use the Platform ceases immediately. Outstanding balances will be paid out 
                according to normal payout schedules. Product listings will be removed.
              </p>
            </div>
          </div>
        </section>

        {/* Section 13: Changes to Terms */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">13. Modifications to Terms</h2>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <p className="text-stone-600 mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of material changes via email or 
              prominent notice on the Platform at least 30 days before the changes take effect.
            </p>
            <p className="text-stone-600">
              Continued use of the Platform after changes constitutes acceptance of the modified Terms. If you do not agree to 
              the changes, you must stop using the Platform and may close your account.
            </p>
          </div>
        </section>

        {/* Section 14: General Provisions */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">14. General Provisions</h2>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">14.1 Governing Law</h3>
              <p className="text-stone-600">
                These Terms are governed by the laws of the Province of Quebec and the federal laws of Canada applicable therein, 
                without regard to conflict of law principles.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">14.2 Dispute Resolution</h3>
              <p className="text-stone-600">
                Any disputes arising from these Terms shall first be attempted to be resolved through good-faith negotiation. 
                If unsuccessful, disputes shall be resolved through binding arbitration in Montreal, Quebec.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">14.3 Severability</h3>
              <p className="text-stone-600">
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or 
                eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">14.4 Entire Agreement</h3>
              <p className="text-stone-600">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and BazaarMkt regarding 
                the use of the Platform and supersede all prior agreements.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">14.5 Assignment</h3>
              <p className="text-stone-600">
                You may not assign or transfer these Terms or your account without our prior written consent. We may assign 
                these Terms without restriction.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-2">14.6 Waiver</h3>
              <p className="text-stone-600">
                Our failure to enforce any provision of these Terms shall not constitute a waiver of that provision or any other provision.
              </p>
            </div>
          </div>
        </section>

        {/* Section 15: Contact */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">15. Contact Information</h2>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
            <p className="text-stone-600 mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="space-y-2 text-stone-700">
              <p className="flex items-center">
                <strong className="mr-2">Email:</strong>
                <a href="mailto:legal@bazaarmkt.com" className="text-amber-600 hover:text-amber-700 underline">
                  legal@bazaarmkt.com
                </a>
              </p>
              <p className="flex items-center">
                <strong className="mr-2">Support:</strong>
                <a href="mailto:support@bazaarmkt.com" className="text-amber-600 hover:text-amber-700 underline">
                  support@bazaarmkt.com
                </a>
              </p>
              <p>
                <strong>Platform:</strong> BazaarMkt Marketplace
              </p>
              <p>
                <strong>Last Updated:</strong> October 8, 2025
              </p>
            </div>
          </div>
        </section>

        {/* Acceptance Notice */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6 text-center">
          <ShieldCheckIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-stone-900 mb-3 font-display">
            By Using BazaarMkt, You Agree to These Terms
          </h3>
          <p className="text-stone-600 mb-4">
            Your continued use of the Platform constitutes acceptance of these Terms of Service
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/how-it-works"
              className="inline-flex items-center justify-center px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors border-2 border-blue-200"
            >
              Learn How It Works
            </Link>
            <Link
              to="/privacy"
              className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              View Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

