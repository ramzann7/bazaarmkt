# Stripe Connect Integration with Existing Bank Info + Platform Cash Flow Tracking

## 🏦 PART 1: Integrate Existing Bank Information with Stripe Connect

### Current Bank Info Structure (Already in Database)

```javascript
// artisan document in MongoDB
{
  bankInfo: {
    accountNumber: "encrypted:xxxx", // AES-256 encrypted
    routingNumber: "110000000",
    accountHolderName: "John Artisan",
    bankName: "TD Canada Trust",
    accountType: "checking", // or "savings"
    lastUpdated: ISODate("2025-10-08")
  },
  stripeConnectAccountId: null, // Will be populated
  stripeExternalAccountId: null, // Will be populated
  stripeConnectStatus: "pending" // pending, active, disabled
}
```

---

## 📋 IMPLEMENTATION

### Step 1: Update Stripe Connect Setup to Use Existing Bank Info

```javascript
// backend/routes/profile/index.js
// Enhanced setupStripeConnect endpoint

router.post('/stripe-connect/setup', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usersCollection = req.app.locals.db.collection('users');
    const artisansCollection = req.app.locals.db.collection('artisans');
    
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const artisan = await artisansCollection.findOne({ user: user._id });
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }
    
    // Check if bank info exists
    if (!artisan.bankInfo || !artisan.bankInfo.accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Bank information is required. Please add your bank details in Profile > Setup > Bank Information.'
      });
    }
    
    // Check if already set up
    if (artisan.stripeConnectAccountId) {
      // Verify account status
      const StripeService = require('../../services/stripeService');
      const stripeService = new StripeService();
      const accountStatus = await stripeService.getAccountStatus(artisan.stripeConnectAccountId);
      
      return res.json({
        success: true,
        message: 'Stripe Connect already set up',
        data: {
          accountId: artisan.stripeConnectAccountId,
          payoutsEnabled: accountStatus.payouts_enabled,
          chargesEnabled: accountStatus.charges_enabled,
          status: artisan.stripeConnectStatus
        }
      });
    }
    
    // Decrypt bank info
    const { decryptBankInfo } = require('../../utils/encryption');
    const decryptedBankInfo = decryptBankInfo(artisan.bankInfo);
    
    const StripeService = require('../../services/stripeService');
    const stripeService = new StripeService();
    
    // Prepare artisan data for Stripe
    const artisanData = {
      email: user.email,
      firstName: user.firstName || artisan.artisanName.split(' ')[0],
      lastName: user.lastName || artisan.artisanName.split(' ')[1] || '',
      phone: user.phone || artisan.contactInfo?.phone,
      businessName: artisan.businessName || artisan.artisanName,
      description: artisan.description || 'Artisan products',
      address: artisan.address
    };
    
    // Create Stripe Connect account
    console.log('🔄 Creating Stripe Connect account for artisan:', artisan._id);
    const connectAccount = await stripeService.createConnectAccount(artisanData, decryptedBankInfo);
    
    // Add bank account to Connect account
    console.log('🏦 Adding bank account to Stripe Connect:', connectAccount.id);
    const externalAccount = await stripeService.addBankAccount(connectAccount.id, decryptedBankInfo);
    
    // Update artisan with Stripe Connect IDs
    await artisansCollection.updateOne(
      { _id: artisan._id },
      { 
        $set: { 
          stripeConnectAccountId: connectAccount.id,
          stripeExternalAccountId: externalAccount.id,
          stripeConnectStatus: 'active',
          stripeConnectSetupAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    console.log('✅ Stripe Connect setup complete for artisan:', artisan._id);
    
    res.json({
      success: true,
      message: 'Stripe Connect account created successfully! You can now receive weekly payouts.',
      data: {
        accountId: connectAccount.id,
        externalAccountId: externalAccount.id,
        bankName: decryptedBankInfo.bankName,
        last4: decryptedBankInfo.accountNumber.slice(-4),
        status: 'active'
      }
    });
    
  } catch (error) {
    console.error('❌ Error setting up Stripe Connect:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup Stripe Connect: ' + error.message
    });
  }
});

// Get Stripe Connect status
router.get('/stripe-connect/status', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usersCollection = req.app.locals.db.collection('users');
    const artisansCollection = req.app.locals.db.collection('artisans');
    
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
    const artisan = await artisansCollection.findOne({ user: user._id });
    
    if (!artisan) {
      return res.status(404).json({ success: false, message: 'Artisan profile not found' });
    }
    
    if (!artisan.stripeConnectAccountId) {
      return res.json({
        success: true,
        data: {
          isSetup: false,
          hasBankInfo: !!(artisan.bankInfo && artisan.bankInfo.accountNumber),
          status: 'not_setup'
        }
      });
    }
    
    // Get live status from Stripe
    const StripeService = require('../../services/stripeService');
    const stripeService = new StripeService();
    const accountStatus = await stripeService.getAccountStatus(artisan.stripeConnectAccountId);
    
    res.json({
      success: true,
      data: {
        isSetup: true,
        accountId: artisan.stripeConnectAccountId,
        payoutsEnabled: accountStatus.payouts_enabled,
        chargesEnabled: accountStatus.charges_enabled,
        status: artisan.stripeConnectStatus,
        setupAt: artisan.stripeConnectSetupAt,
        requirements: accountStatus.requirements
      }
    });
    
  } catch (error) {
    console.error('Error getting Stripe Connect status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
```

---

## 💰 PART 2: Platform Fees Flow to Platform Bank Account

### Configuration

```javascript
// backend/config/stripe-platform.js

module.exports = {
  // Platform Stripe account receives all payments
  PLATFORM_STRIPE_ACCOUNT_ID: process.env.STRIPE_ACCOUNT_ID || 'acct_xxx',
  
  // Platform fee structure
  PLATFORM_FEE_PERCENTAGE: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 10, // 10%
  STRIPE_FEE_PERCENTAGE: 2.9, // Stripe's fee
  STRIPE_FEE_FIXED: 0.30, // Stripe's fixed fee per transaction (CAD)
  
  // Platform bank account for deposits (configured in Stripe Dashboard)
  // Stripe automatically deposits to your bank account based on your payout schedule
  PAYOUT_SCHEDULE: {
    interval: 'weekly', // daily, weekly, monthly
    weekly_anchor: 'monday', // Day of week for weekly payouts
    delay_days: 2 // Wait 2 days after funds available
  }
};
```

---

### How Platform Fees Work with Stripe Connect

```
OPTION 1: Application Fees (Recommended)
=========================================

When order is placed:
1. PaymentIntent created on Platform account
2. application_fee_amount specified (platform's cut)
3. transfer_data.destination = artisan Connect account

Flow:
User Pays $100
  └─> Platform receives $100 (minus Stripe fee $3.20)
      ├─> Platform keeps $10 (application fee)
      └─> Transfer $86.80 to Artisan Connect account

Platform Balance: $10 (goes to platform bank account)
Artisan Balance: $86.80 (goes to artisan bank account)


OPTION 2: Separate Transfers (More Control)
============================================

When order is placed:
1. PaymentIntent created on Platform account
2. Capture full payment to Platform account
3. Manually transfer artisan portion

Flow:
User Pays $100
  └─> Platform receives $100 (minus Stripe fee $3.20) = $96.80
      └─> Platform balance: $96.80
          
After confirmation:
  Platform transfers $86.80 to Artisan
  Platform keeps $10 (automatically stays in platform balance)

Platform Balance: $10 (goes to platform bank account via payout schedule)
Artisan Balance: $86.80 (artisan can request payout)
```

---

### Implementation: Platform Fee Collection

```javascript
// backend/routes/orders/index.js
// Update payment intent creation

// Option 1: Application Fees (Simpler, Recommended)
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmount * 100, // $100.00
  currency: 'cad',
  capture_method: 'manual',
  application_fee_amount: platformFee * 100, // $10.00 goes to platform
  transfer_data: {
    destination: artisan.stripeConnectAccountId, // $90.00 goes to artisan
  },
  metadata: {
    orderId: orderId.toString(),
    artisanId: artisanId.toString(),
    platformFee: platformFee.toString()
  }
});

// Option 2: Separate Transfers (More control, used for manual capture)
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmount * 100,
  currency: 'cad',
  capture_method: 'manual',
  metadata: {
    orderId: orderId.toString(),
    artisanId: artisanId.toString()
  }
});

// After confirmation, capture and transfer
const captured = await stripe.paymentIntents.capture(paymentIntentId);

// Calculate fees
const platformFeePercentage = 0.10; // 10%
const platformFee = totalAmount * platformFeePercentage;
const artisanAmount = totalAmount - platformFee;

// Transfer to artisan (platform fee automatically stays in platform account)
const transfer = await stripe.transfers.create({
  amount: Math.round(artisanAmount * 100),
  currency: 'cad',
  destination: artisan.stripeConnectAccountId,
  transfer_group: orderId.toString(),
  metadata: {
    orderId: orderId.toString(),
    platformFee: platformFee.toFixed(2),
    artisanAmount: artisanAmount.toFixed(2)
  }
});

// Platform fee ($10) stays in platform Stripe balance
// Stripe will automatically payout to platform bank account based on schedule
```

---

### Track Platform Fees in Database

```javascript
// backend/routes/orders/index.js
// After capture and transfer

// Create platform revenue record
await db.collection('platform_revenues').insertOne({
  type: 'order_commission',
  orderId: new ObjectId(orderId),
  artisanId: new ObjectId(artisanId),
  orderTotal: totalAmount,
  platformFee: platformFee,
  platformFeePercentage: platformFeePercentage,
  artisanAmount: artisanAmount,
  stripeFee: totalAmount * 0.029 + 0.30, // Estimate
  netPlatformRevenue: platformFee - (totalAmount * 0.029 + 0.30),
  stripeTransferId: transfer.id,
  stripePaymentIntentId: paymentIntentId,
  status: 'completed',
  createdAt: new Date()
});
```

---

## 📊 PART 3: Admin Cash Flow Component

### Component: PlatformCashFlow.jsx

```jsx
// frontend/src/components/admin/PlatformCashFlow.jsx

import React, { useState, useEffect } from 'react';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  ShoppingCartIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import * as adminService from '../../services/adminService';
import toast from 'react-hot-toast';

export default function PlatformCashFlow() {
  const [cashFlowData, setCashFlowData] = useState({
    totalRevenue: 0,
    orderCommissions: 0,
    promotionalRevenue: 0,
    spotlightRevenue: 0,
    stripeBalance: 0,
    pendingPayouts: 0,
    netRevenue: 0
  });
  
  const [transactions, setTransactions] = useState([]);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadCashFlowData();
  }, [timeRange]);
  
  const loadCashFlowData = async () => {
    try {
      setIsLoading(true);
      
      // Load platform cash flow data
      const response = await adminService.getPlatformCashFlow(timeRange);
      
      setCashFlowData(response.data.summary);
      setTransactions(response.data.transactions);
      
    } catch (error) {
      console.error('Error loading cash flow data:', error);
      toast.error('Failed to load cash flow data');
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getTransactionIcon = (type) => {
    switch (type) {
      case 'order_commission':
        return ShoppingCartIcon;
      case 'promotional_feature':
        return SparklesIcon;
      case 'spotlight_subscription':
        return SparklesIcon;
      case 'stripe_payout':
        return BanknotesIcon;
      default:
        return CurrencyDollarIcon;
    }
  };
  
  const getTransactionColor = (type) => {
    switch (type) {
      case 'order_commission':
        return 'text-green-600 bg-green-100';
      case 'promotional_feature':
        return 'text-purple-600 bg-purple-100';
      case 'spotlight_subscription':
        return 'text-amber-600 bg-amber-100';
      case 'stripe_payout':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Platform Cash Flow</h2>
          <p className="text-gray-600 mt-1">Track all revenue flowing to the platform</p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
            <option value="all">All Time</option>
          </select>
          
          <button
            onClick={() => {/* Export to CSV */}}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span>Export</span>
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Platform Revenue */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <BanknotesIcon className="w-6 h-6" />
            </div>
            <ArrowTrendingUpIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-medium opacity-90">Total Platform Revenue</h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(cashFlowData.totalRevenue)}</p>
          <p className="text-xs opacity-75 mt-2">Before Stripe fees</p>
        </div>
        
        {/* Order Commissions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCartIcon className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">10%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Order Commissions</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(cashFlowData.orderCommissions)}</p>
          <p className="text-xs text-gray-500 mt-2">From completed orders</p>
        </div>
        
        {/* Promotional Revenue */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <SparklesIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Promotional Features</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(cashFlowData.promotionalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-2">Spotlight & boosts</p>
        </div>
        
        {/* Net Revenue */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <ChartBarIcon className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-sm font-medium opacity-90">Net Platform Revenue</h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(cashFlowData.netRevenue)}</p>
          <p className="text-xs opacity-75 mt-2">After Stripe fees</p>
        </div>
      </div>
      
      {/* Stripe Balance Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <CreditCardIcon className="w-8 h-8" />
              <h3 className="text-lg font-medium opacity-90">Current Stripe Balance</h3>
            </div>
            <p className="text-4xl font-bold mt-3">{formatCurrency(cashFlowData.stripeBalance)}</p>
            <p className="text-sm opacity-75 mt-2">
              Available for payout to platform bank account
            </p>
          </div>
          
          <div className="text-right">
            <div className="bg-white/20 rounded-lg p-4 mb-3">
              <p className="text-xs opacity-75">Pending Payouts</p>
              <p className="text-xl font-bold">{formatCurrency(cashFlowData.pendingPayouts)}</p>
            </div>
            <button className="px-6 py-2 bg-white text-indigo-600 rounded-lg hover:bg-gray-50 font-semibold text-sm">
              View Stripe Dashboard →
            </button>
          </div>
        </div>
      </div>
      
      {/* Revenue Breakdown Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Breakdown</h3>
        
        <div className="space-y-4">
          {/* Order Commissions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Order Commissions (10%)</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(cashFlowData.orderCommissions)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${(cashFlowData.orderCommissions / cashFlowData.totalRevenue) * 100}%` }}
              ></div>
            </div>
          </div>
          
          {/* Promotional Revenue */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Promotional Features</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(cashFlowData.promotionalRevenue)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${(cashFlowData.promotionalRevenue / cashFlowData.totalRevenue) * 100}%` }}
              ></div>
            </div>
          </div>
          
          {/* Spotlight Revenue */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Artisan Spotlight</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(cashFlowData.spotlightRevenue)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-amber-500 h-2 rounded-full"
                style={{ width: `${(cashFlowData.spotlightRevenue / cashFlowData.totalRevenue) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <p className="text-sm text-gray-600 mt-1">All revenue flowing to platform account</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {transactions.length > 0 ? (
            transactions.map((transaction, index) => {
              const Icon = getTransactionIcon(transaction.type);
              return (
                <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${getTransactionColor(transaction.type)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-500 mt-1">{formatDate(transaction.createdAt)}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        +{formatCurrency(transaction.amount)}
                      </p>
                      {transaction.orderId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Order #{transaction.orderId.toString().slice(-8)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-gray-500">
              <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No transactions found for this period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Backend API: Get Platform Cash Flow

```javascript
// backend/routes/admin/index.js

router.get('/cash-flow', adminAuth, async (req, res) => {
  try {
    const { timeRange = '30' } = req.query;
    const db = req.app.locals.db;
    
    // Calculate date range
    const startDate = timeRange === 'all' 
      ? new Date(0) 
      : new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000);
    
    // Get platform revenues
    const platformRevenues = await db.collection('platform_revenues').find({
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 }).toArray();
    
    // Calculate summary
    const summary = {
      totalRevenue: 0,
      orderCommissions: 0,
      promotionalRevenue: 0,
      spotlightRevenue: 0,
      stripeFees: 0,
      netRevenue: 0,
      stripeBalance: 0,
      pendingPayouts: 0
    };
    
    platformRevenues.forEach(rev => {
      summary.totalRevenue += rev.platformFee || 0;
      
      if (rev.type === 'order_commission') {
        summary.orderCommissions += rev.platformFee || 0;
      } else if (rev.type === 'promotional_feature') {
        summary.promotionalRevenue += rev.amount || 0;
      } else if (rev.type === 'spotlight_subscription') {
        summary.spotlightRevenue += rev.amount || 0;
      }
      
      summary.stripeFees += rev.stripeFee || 0;
    });
    
    summary.netRevenue = summary.totalRevenue - summary.stripeFees;
    
    // Get current Stripe balance (would need Stripe API call)
    // summary.stripeBalance = await getStripeBalance();
    
    // Format transactions for display
    const transactions = platformRevenues.slice(0, 50).map(rev => ({
      _id: rev._id,
      type: rev.type,
      amount: rev.platformFee || rev.amount,
      description: getTransactionDescription(rev),
      orderId: rev.orderId,
      artisanId: rev.artisanId,
      createdAt: rev.createdAt,
      metadata: rev.metadata
    }));
    
    res.json({
      success: true,
      data: {
        summary,
        transactions,
        timeRange
      }
    });
    
  } catch (error) {
    console.error('Error getting platform cash flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load cash flow data'
    });
  }
});

function getTransactionDescription(revenue) {
  switch (revenue.type) {
    case 'order_commission':
      return `10% commission from order #${revenue.orderId?.toString().slice(-8)}`;
    case 'promotional_feature':
      return `Promotional feature purchase`;
    case 'spotlight_subscription':
      return `Artisan Spotlight subscription`;
    default:
      return 'Platform revenue';
  }
}
```

---

### Add to Admin Dashboard

```jsx
// frontend/src/components/AdminDashboard.jsx
// Add new section

const adminSections = [
  // ... existing sections
  {
    id: 'cash-flow',
    title: 'Platform Cash Flow',
    description: 'Track all revenue and fees flowing to the platform',
    icon: BanknotesIcon,
    color: 'bg-emerald-500',
    path: '/admin/cash-flow'
  },
  // ... rest of sections
];
```

---

## 🔐 Security Considerations

### Bank Information Security

1. **Encryption at Rest**: All bank account numbers encrypted with AES-256
2. **Decryption Only When Needed**: Only decrypt for Stripe Connect setup
3. **No Client-Side Exposure**: Bank details never sent to frontend
4. **Audit Logging**: All bank info access logged
5. **Role-Based Access**: Only artisan can update their own bank info

### Platform Revenue Security

1. **Automatic Stripe Payouts**: Funds go directly to platform bank account
2. **No Manual Intervention**: Reduces fraud risk
3. **Transaction Reconciliation**: Daily reconciliation against Stripe balance
4. **Audit Trail**: Complete record of all platform fees
5. **Real-Time Monitoring**: Alerts for unusual transactions

---

## 📈 Benefits

### For Platform
✅ Automated revenue collection
✅ Real-time cash flow visibility
✅ Stripe handles all bank transfers
✅ Complete audit trail
✅ Tax reporting ready

### For Artisans
✅ Use existing bank information
✅ One-click Stripe Connect setup
✅ Weekly automated payouts
✅ Professional payment infrastructure
✅ Tax documentation provided

---

## 🚀 Deployment Checklist

### Phase 1: Stripe Connect with Bank Info
- [ ] Deploy updated setupStripeConnect endpoint
- [ ] Add Stripe Connect status endpoint
- [ ] Update artisan profile UI to show Connect status
- [ ] Test with sandbox Stripe accounts
- [ ] Document bank info requirements

### Phase 2: Platform Fee Collection
- [ ] Configure platform Stripe account
- [ ] Set up bank account in Stripe Dashboard
- [ ] Update payment intent creation
- [ ] Test commission flow
- [ ] Verify platform fees stay in platform account

### Phase 3: Cash Flow Dashboard
- [ ] Deploy PlatformCashFlow component
- [ ] Add backend cash-flow endpoint
- [ ] Create platform_revenues collection
- [ ] Add to admin navigation
- [ ] Test data accuracy

### Phase 4: Testing & Monitoring
- [ ] End-to-end testing
- [ ] Reconciliation with Stripe
- [ ] Monitor first week of payouts
- [ ] Gather artisan feedback
- [ ] Document any issues

---

**Status:** Ready for Implementation
**Priority:** HIGH - Core business functionality
**Estimated Effort:** 2-3 weeks


