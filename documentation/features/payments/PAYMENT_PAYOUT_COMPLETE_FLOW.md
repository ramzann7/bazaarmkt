# Payment & Payout System - Complete Flow Documentation

**Date**: October 14, 2025  
**Status**: ✅ COMPREHENSIVE REVIEW COMPLETE  
**Document Purpose**: Map entire payment flow from patron purchase to artisan bank account

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Complete Payment Flow Diagram](#complete-payment-flow-diagram)
3. [Phase 1: Order Creation & Payment Authorization](#phase-1-order-creation--payment-authorization)
4. [Phase 2: Order Fulfillment](#phase-2-order-fulfillment)
5. [Phase 3: Order Confirmation & Revenue Recognition](#phase-3-order-confirmation--revenue-recognition)
6. [Phase 4: Weekly Automated Payouts](#phase-4-weekly-automated-payouts)
7. [Key Components & Dependencies](#key-components--dependencies)
8. [Fee Structure & Calculations](#fee-structure--calculations)
9. [Identified Gaps & Issues](#identified-gaps--issues)
10. [Recommendations](#recommendations)

---

## Executive Summary

### Current State

The BazaarMKT platform has a **partially implemented** payment and payout system with the following characteristics:

✅ **What Works:**
- Stripe payment processing for orders
- Wallet balance tracking for artisans
- Basic revenue recognition
- Platform fee calculations (10%)
- Payment processing fee calculations (2.9% + $0.30)
- Order status management
- Guest and authenticated user flows

⚠️ **What's Incomplete:**
- Payment authorization vs immediate capture inconsistency
- Stripe Connect integration exists but not fully utilized
- Automated weekly payouts not fully operational
- Escrow/hold mechanism not implemented
- Direct bank transfers to artisans need testing

🚨 **Critical Gaps:**
1. No proper hold/escrow mechanism for patron orders
2. Stripe Connect onboarding exists but needs integration
3. Weekly payout cron job exists but requires Stripe Connect setup
4. Payment capture happens immediately for guests, authorized for patrons (inconsistent)

---

## Complete Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: ORDER CREATION & PAYMENT                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Patron Places Order                                                 │
│    ↓                                                                 │
│ [Frontend: Cart.jsx]                                                │
│    ↓                                                                 │
│ POST /api/orders/payment-intent                                     │
│    ↓                                                                 │
│ [Backend: orders/index.js:createPaymentIntent()]                    │
│    │                                                                 │
│    ├─ Calculate total (items + delivery fees)                       │
│    ├─ Create Stripe PaymentIntent                                   │
│    │   • capture_method: 'manual' ⭐                                 │
│    │   • Amount: totalAmount × 100 (cents)                          │
│    │   • Currency: CAD                                              │
│    │   • Metadata: orderId, artisanId, userId                       │
│    │                                                                 │
│    └─ Return clientSecret to frontend                               │
│         ↓                                                            │
│ [Frontend: StripeOrderPayment.jsx]                                  │
│    ↓                                                                 │
│ stripe.confirmCardPayment(clientSecret)                             │
│    ↓                                                                 │
│ ✅ Payment AUTHORIZED (not captured)                                │
│    • Funds held on patron's card                                    │
│    • 7-day authorization window                                     │
│    • Order status: 'pending'                                        │
│    • Payment status: 'authorized' (patrons) or 'captured' (guests) │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2: ORDER FULFILLMENT                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Artisan Receives Order Notification                                 │
│    ↓                                                                 │
│ Artisan Updates Status:                                             │
│    • confirmed → preparing → ready_for_pickup/ready_for_delivery    │
│    ↓                                                                 │
│ PUT /api/orders/:id/status                                          │
│    ↓                                                                 │
│ [Backend: orders/index.js:updateOrderStatus()]                      │
│    │                                                                 │
│    ├─ Validate artisan ownership                                    │
│    ├─ Update order status                                           │
│    ├─ Send patron notification                                      │
│    └─ Handle special delivery triggers                              │
│                                                                      │
│ Artisan Marks Order as:                                             │
│    • 'delivered' (delivery orders)                                  │
│    • 'picked_up' (pickup orders)                                    │
│                                                                      │
│ ⏰ 48-Hour Confirmation Window Starts                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3: CONFIRMATION & REVENUE RECOGNITION                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ OPTION A: Manual Confirmation (Patron)                              │
│ ┌─────────────────────────────────────────┐                        │
│ │ Patron Clicks "Confirm Receipt"         │                        │
│ │    ↓                                     │                        │
│ │ POST /api/orders/:id/confirm-receipt    │                        │
│ │    ↓                                     │                        │
│ │ [Backend: confirmOrderReceipt()]         │                        │
│ │    │                                     │                        │
│ │    ├─ Validate order ownership           │                        │
│ │    ├─ Check status (delivered/picked_up) │                        │
│ │    └─ Update to 'completed'              │                        │
│ └─────────────────────────────────────────┘                        │
│                               OR                                     │
│ OPTION B: Auto-Confirmation (48 Hours)                              │
│ ┌─────────────────────────────────────────┐                        │
│ │ Vercel Cron Job Runs Every Hour         │                        │
│ │    ↓                                     │                        │
│ │ GET /api/cron/auto-capture-payments     │                        │
│ │    ↓                                     │                        │
│ │ [Backend: auto-capture-payments.js]      │                        │
│ │    │                                     │                        │
│ │    ├─ Find orders with:                  │                        │
│ │    │   • status: delivered/picked_up     │                        │
│ │    │   • paymentStatus: 'authorized'     │                        │
│ │    │   • updatedAt: > 48 hours ago       │                        │
│ │    └─ Auto-confirm and capture           │                        │
│ └─────────────────────────────────────────┘                        │
│                               OR                                     │
│ OPTION C: Guest Order Auto-Complete                                 │
│ ┌─────────────────────────────────────────┐                        │
│ │ Artisan marks guest order 'delivered'    │                        │
│ │    ↓                                     │                        │
│ │ System auto-completes immediately        │                        │
│ │ (guests can't confirm, so trust artisan) │                        │
│ └─────────────────────────────────────────┘                        │
│                               ↓                                      │
│ ─────────────────────────────────────────────────                   │
│ REVENUE RECOGNITION TRIGGER                                         │
│ ─────────────────────────────────────────────────                   │
│                               ↓                                      │
│ walletService.processOrderCompletion()                              │
│    ↓                                                                 │
│ [Backend: WalletService.js:processOrderCompletion()]                │
│    │                                                                 │
│    ├─ Get platform settings                                         │
│    │                                                                 │
│    ├─ Calculate Revenue Components:                                 │
│    │   • orderSubtotal = order.subtotal                             │
│    │   • deliveryFee = order.deliveryFee                            │
│    │   • totalRevenue = subtotal + deliveryFee                      │
│    │                                                                 │
│    ├─ Calculate Fees:                                               │
│    │   • platformFee = totalRevenue × 10% (default)                 │
│    │   • paymentProcessingFee = (totalRevenue × 2.9%) + $0.30      │
│    │   • netEarnings = totalRevenue - platformFee - processingFee  │
│    │                                                                 │
│    ├─ Get Artisan User ID                                           │
│    │   • Find artisan record by order.artisan                       │
│    │   • Get artisan.user (user ID)                                 │
│    │                                                                 │
│    ├─ Credit Artisan Wallet:                                        │
│    │   walletService.addFunds()                                     │
│    │   • Amount: netEarnings                                        │
│    │   • Type: 'order_completion'                                   │
│    │   • Creates transaction record                                 │
│    │   • Updates wallet.balance                                     │
│    │                                                                 │
│    └─ Create Revenue Record:                                        │
│        • Collection: 'revenues'                                     │
│        • Tracks full breakdown                                      │
│        • Links to order and transaction                             │
│                                                                      │
│ ✅ Artisan Wallet Balance Increased                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4: WEEKLY AUTOMATED PAYOUTS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ⏰ Vercel Cron: Every Friday at 9 AM EST                           │
│    ↓                                                                 │
│ GET /api/cron/payouts                                               │
│    ↓                                                                 │
│ [Backend: api/cron/payouts.js]                                      │
│    │                                                                 │
│    ├─ Get platform settings                                         │
│    │   • minimumPayoutAmount (default: $25)                         │
│    │   • payoutFrequency (default: 'weekly')                        │
│    │   • payoutDelay (default: 7 days)                              │
│    │                                                                 │
│    ├─ Find eligible wallets:                                        │
│    │   • payoutSettings.enabled: true                               │
│    │   • payoutSettings.nextPayoutDate ≤ today                      │
│    │   • balance ≥ minimumPayoutAmount                              │
│    │                                                                 │
│    └─ For each eligible wallet:                                     │
│        │                                                             │
│        ├─ Get artisan info                                          │
│        ├─ Verify minimum payout amount                              │
│        │                                                             │
│        ├─ ⚠️ CURRENT: Simulated payout                              │
│        │   • Creates transaction record                             │
│        │   • Sets balance to 0                                      │
│        │   • Updates next payout date                               │
│        │                                                             │
│        └─ ✅ SHOULD DO: Actual Stripe payout                        │
│            • stripe.payouts.create() to Connect account             │
│            • Transfer from Stripe balance → bank account            │
│            • 2-3 business days processing                           │
│                                                                      │
│ Result: Artisan wallet balance zeroed, funds sent to bank           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
                      💰 ARTISAN RECEIVES FUNDS
                         (2-3 business days later)
```

---

## Phase 1: Order Creation & Payment Authorization

### 1.1 Order Creation Trigger

**User Action**: Patron completes checkout in Cart

**Frontend Flow**:
```
Cart.jsx (handleCheckout)
    ↓
orderPaymentService.createPaymentIntent()
    ↓
POST /api/orders/payment-intent
```

### 1.2 Payment Intent Creation

**Backend File**: `backend/routes/orders/index.js`  
**Function**: `createPaymentIntent()` (lines 173-1199)

**Process**:

```javascript
// Step 1: Extract and validate order data
const { items, deliveryAddress, deliveryMethod, pickupTimeWindows } = req.body;

// Step 2: Calculate totals
const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
const deliveryFee = calculateDeliveryFees(); // Based on method and distance
const finalAmount = subtotal + deliveryFee;

// Step 3: Create Stripe PaymentIntent
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(finalAmount * 100), // Convert to cents
  currency: 'cad',
  capture_method: 'manual', // ⭐ KEY: Authorize but don't capture
  customer: stripeCustomerId,
  metadata: {
    orderId: orderId,
    artisanId: artisanId,
    userId: userId
  }
});

// Step 4: Return client secret for frontend to confirm
return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
```

**Key Details**:
- ⭐ `capture_method: 'manual'` - Funds are **authorized but not captured**
- 7-day authorization window (Stripe default)
- Creates PaymentIntent but doesn't take money yet
- Returns `clientSecret` for frontend to confirm

### 1.3 Payment Confirmation

**Frontend File**: `frontend/src/components/StripeOrderPayment.jsx`  
**Function**: `handleSubmit()` (lines 44-185)

**Process**:

```javascript
// Confirm payment on frontend
const paymentResult = await stripe.confirmCardPayment(clientSecret, {
  payment_method: savedCardId || newCardElement
});

if (paymentResult.paymentIntent.status === 'requires_capture') {
  // Payment authorized successfully
  // Call backend to create order
  onPaymentSuccess(paymentResult.paymentIntent);
}
```

**Result**:
- ✅ Payment authorized on patron's card
- ✅ Funds reserved but NOT taken yet
- ✅ Order created with `paymentStatus: 'authorized'` (patrons)
- ⚠️ Order created with `paymentStatus: 'captured'` (guests - immediate capture)

### 1.4 Order Record Creation

**Database**: `orders` collection

**Order Schema** (relevant fields):
```javascript
{
  _id: ObjectId,
  userId: ObjectId, // Patron
  artisan: ObjectId, // Artisan ID
  items: [
    {
      productId: ObjectId,
      name: String,
      price: Number,
      quantity: Number,
      productType: 'ready_to_ship' | 'made_to_order' | 'scheduled_order'
    }
  ],
  totalAmount: Number,
  subtotal: Number,
  deliveryFee: Number,
  
  // Payment tracking
  paymentStatus: 'authorized' | 'captured' | 'paid' | 'failed' | 'refunded',
  paymentMethod: 'stripe',
  paymentIntentId: String, // Stripe PaymentIntent ID
  paymentCapturedAt: Date, // When payment was captured
  
  // Order status
  status: 'pending' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 
          'ready_for_delivery' | 'picked_up' | 'delivered' | 'completed' | 
          'cancelled' | 'declined',
  
  // Delivery details
  deliveryMethod: 'pickup' | 'personalDelivery' | 'professionalDelivery',
  deliveryAddress: Object,
  
  // Confirmation tracking
  receiptConfirmedAt: Date,
  autoConfirmedAt: Date,
  holdExpiresAt: Date, // 7 days from creation
  
  // Guest order flag
  isGuestOrder: Boolean,
  guestInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## Phase 2: Order Fulfillment

### 2.1 Status Updates

**Artisan Actions**: Updates order through dashboard

**Frontend Flow**:
```
DashboardFixed.jsx (handleUpdateStatus)
    ↓
PUT /api/orders/:id/status
    ↓
Backend: updateOrderStatus()
```

**Status Progression**:
```
pending 
  → confirmed (artisan accepts)
  → preparing (artisan making/preparing)
  → ready_for_pickup (pickup orders)
  → ready_for_delivery (delivery orders)
  → picked_up (patron picked up) ⭐ Confirmation window starts
  → delivered (order delivered) ⭐ Confirmation window starts
  → completed (patron confirmed or auto-confirmed)
```

### 2.2 Special Handling

#### Guest Orders
When artisan marks guest order as `delivered`:
```javascript
// In updateOrderStatus() - lines 2157-2220
if (order.isGuestOrder && status === 'delivered') {
  // Auto-complete immediately (guests can't confirm)
  await ordersCollection.updateOne(
    { _id: orderId },
    { $set: { status: 'completed', completedAt: new Date() } }
  );
  
  // Trigger payment capture and revenue recognition
  await capturePaymentAndTransfer();
  await walletService.processOrderCompletion(order, db);
}
```

**Guest Flow**: `delivered` → **auto-completed** → revenue recognition **immediately**

#### Authenticated Patron Orders
When artisan marks patron order as `delivered` or `picked_up`:
```javascript
// Order updated to delivered/picked_up
// 48-hour confirmation window starts
// Payment remains 'authorized' (not captured)
// Awaits patron confirmation or timeout
```

**Patron Flow**: `delivered`/`picked_up` → **awaits confirmation** → completed

### 2.3 Notifications

**Sent At Each Status Change**:
- `order_confirmed` - Artisan accepts order
- `order_preparing` - Artisan starts preparation
- `order_ready_for_pickup` - Ready for patron to pick up
- `order_ready_for_delivery` - Ready for delivery/out for delivery
- `order_completed` - Delivered/picked up (awaiting confirmation)

---

## Phase 3: Order Confirmation & Revenue Recognition

### 3.1 Manual Confirmation by Patron

**Endpoint**: `POST /api/orders/:id/confirm-receipt`  
**Function**: `confirmOrderReceipt()` (lines 4105-4273)

**Process**:

```javascript
// Step 1: Validate
if (order.status !== 'delivered' && order.status !== 'picked_up') {
  return error('Order must be delivered or picked up');
}

if (order.status === 'completed') {
  return error('Already confirmed');
}

// Step 2: Update order to completed
await ordersCollection.updateOne(
  { _id: orderId },
  { 
    $set: { 
      status: 'completed',
      receiptConfirmedAt: new Date(),
      updatedAt: new Date()
    }
  }
);

// Step 3: Process revenue recognition
await walletService.processOrderCompletion(order, db);

// Step 4: Send artisan notification
```

**Triggers**:
- Patron clicks "Confirm Receipt" button in Orders page
- Order status changes: `delivered`/`picked_up` → `completed`
- Revenue recognition initiated

### 3.2 Auto-Confirmation (48 Hours)

**Cron Job**: `backend/api/cron/auto-capture-payments.js`  
**Schedule**: Every hour (Vercel Cron)  
**Vercel Config**: Already configured in `vercel.json`

**Process**:

```javascript
// Step 1: Get platform settings for timing
const paymentSettings = await platformSettingsService.getPaymentSettings();
const autoCaptureHours = paymentSettings.autoCaptureHours || 48;
const autoCaptureTime = new Date(Date.now() - autoCaptureHours * 60 * 60 * 1000);

// Step 2: Find orders ready for auto-capture
const ordersToCapture = await ordersCollection.find({
  status: { $in: ['delivered', 'picked_up', 'completed'] },
  paymentStatus: 'authorized', // Only authorized payments
  updatedAt: { $lte: autoCaptureTime } // Updated more than 48 hours ago
}).toArray();

// Step 3: For each order
for (const order of ordersToCapture) {
  // Calculate fees
  const feeCalculation = await platformSettingsService.calculatePlatformFee(order.totalAmount);
  
  // Capture payment from Stripe
  const paymentIntent = await stripe.paymentIntents.capture(order.paymentIntentId);
  
  // Transfer to artisan (if Stripe Connect setup)
  if (artisan.stripeConnectAccountId) {
    const transfer = await stripe.transfers.create({
      amount: Math.round(artisanAmount * 100),
      currency: 'cad',
      destination: artisan.stripeConnectAccountId
    });
  }
  
  // Update order
  await ordersCollection.updateOne(
    { _id: order._id },
    { 
      $set: { 
        paymentStatus: 'captured',
        autoCaptured: true 
      }
    }
  );
  
  // Process revenue recognition
  await walletService.processOrderCompletion(order, db);
}
```

**Triggers**:
- Runs **every hour** via Vercel Cron
- Checks for orders older than 48 hours
- Auto-captures and completes orders
- Credits artisan wallets

### 3.3 Revenue Recognition Process

**Service**: `backend/services/WalletService.js`  
**Function**: `processOrderCompletion()` (lines 562-696)

**Detailed Process**:

```javascript
async processOrderCompletion(orderData, db) {
  // Step 1: Get platform settings
  const settings = await platformSettingsService.getPlatformSettings();
  
  // Step 2: Calculate revenue components
  const orderSubtotal = orderData.subtotal || orderData.totalAmount || 0;
  const deliveryFee = orderData.deliveryFee || 0;
  const totalRevenue = orderSubtotal + deliveryFee;
  
  // Step 3: Calculate fees
  const platformFeeRate = (settings.platformFeePercentage || 10) / 100; // Default 10%
  const platformFee = totalRevenue * platformFeeRate;
  
  const paymentProcessingFeeRate = (settings.paymentProcessingFee || 2.9) / 100;
  const paymentProcessingFeeFixed = settings.paymentProcessingFeeFixed || 0.30;
  const paymentProcessingFee = (totalRevenue * paymentProcessingFeeRate) + paymentProcessingFeeFixed;
  
  const netEarnings = totalRevenue - platformFee - paymentProcessingFee;
  
  // Step 4: Get artisan user ID
  const artisan = await artisansCollection.findOne({ 
    _id: orderData.artisan 
  });
  const artisanUserId = artisan.user.toString();
  
  // Step 5: Credit artisan wallet
  const walletResult = await this.addFunds(
    artisanUserId,
    netEarnings,
    'order_completion',
    {
      orderId: orderData._id,
      orderNumber: orderData._id.toString().slice(-8),
      revenueBreakdown: {
        subtotal: orderSubtotal,
        deliveryFee: deliveryFee,
        totalRevenue: totalRevenue,
        platformFee: platformFee,
        paymentProcessingFee: paymentProcessingFee,
        netEarnings: netEarnings
      }
    }
  );
  
  // Step 6: Create revenue record
  await db.collection('revenues').insertOne({
    orderId: orderData._id,
    artisanId: orderData.artisan,
    revenue: {
      subtotal: orderSubtotal,
      deliveryFee: deliveryFee,
      totalRevenue: totalRevenue,
      platformFee: platformFee,
      paymentProcessingFee: paymentProcessingFee,
      netEarnings: netEarnings
    },
    fees: {
      platformFeeRate: platformFeeRate,
      platformFeeAmount: platformFee,
      paymentProcessingFeeRate: paymentProcessingFeeRate,
      paymentProcessingFeeAmount: paymentProcessingFee
    },
    transactionId: walletResult.transactionId,
    status: 'completed',
    createdAt: new Date()
  });
  
  return { success: true, data: { netEarnings, transactionId } };
}
```

**Database Changes**:

1. **Wallet Update** (`wallets` collection):
```javascript
{
  userId: ObjectId,
  balance: balance + netEarnings, // Incremented
  updatedAt: new Date()
}
```

2. **Transaction Record** (`wallettransactions` collection):
```javascript
{
  userId: ObjectId,
  type: 'order_revenue',
  amount: netEarnings,
  description: 'Revenue from order #12345678',
  status: 'completed',
  balanceAfter: newBalance,
  metadata: {
    orderId: ObjectId,
    revenueBreakdown: { ... }
  },
  createdAt: new Date()
}
```

3. **Revenue Record** (`revenues` collection):
```javascript
{
  orderId: ObjectId,
  artisanId: ObjectId,
  revenue: {
    subtotal: Number,
    deliveryFee: Number,
    totalRevenue: Number,
    platformFee: Number,
    paymentProcessingFee: Number,
    netEarnings: Number
  },
  fees: {
    platformFeeRate: 0.10,
    platformFeeAmount: Number,
    paymentProcessingFeeRate: 0.029,
    paymentProcessingFeeAmount: Number
  },
  status: 'completed',
  createdAt: Date
}
```

---

## Phase 4: Weekly Automated Payouts

### 4.1 Payout Cron Job

**File**: `backend/api/cron/payouts.js`  
**Schedule**: Every Friday at 9 AM EST (configured in Vercel)  
**Authentication**: Requires `CRON_SECRET` in Authorization header

### 4.2 Payout Eligibility Criteria

**Wallets eligible for payout must have**:
```javascript
{
  'payoutSettings.enabled': true, // Bank account connected
  'payoutSettings.nextPayoutDate': { $lte: today }, // Payout date reached
  balance: { $gte: minimumPayoutAmount } // Minimum $25 (default)
}
```

### 4.3 Payout Process

**Current Implementation** (Simulated):

```javascript
// Step 1: Find eligible wallets
const walletsDueForPayout = await walletsCollection.find(eligibilityCriteria).toArray();

// Step 2: For each wallet
for (const wallet of walletsDueForPayout) {
  // Get artisan info
  const artisan = await artisansCollection.findOne({ _id: wallet.artisanId });
  
  const payoutAmount = wallet.balance;
  
  // ⚠️ CURRENT: Simulated payout (just records transaction)
  const payoutTransaction = {
    artisanId: wallet.artisanId,
    type: 'payout',
    amount: -payoutAmount,
    description: 'Weekly payout - weekly',
    status: 'completed',
    reference: `PAYOUT-${Date.now()}`,
    balanceAfter: 0,
    createdAt: new Date()
  };
  
  await transactionsCollection.insertOne(payoutTransaction);
  
  // Calculate next payout date
  const nextPayoutDate = calculateNextPayoutDate(wallet.payoutSettings.schedule);
  
  // Update wallet
  await walletsCollection.updateOne(
    { _id: wallet._id },
    {
      $set: {
        balance: 0, // Zero out balance
        'payoutSettings.lastPayoutDate': now,
        'payoutSettings.nextPayoutDate': nextPayoutDate,
        'metadata.totalPayouts': (wallet.metadata?.totalPayouts || 0) + payoutAmount
      }
    }
  );
}
```

**What Should Happen** (With Stripe Connect):

```javascript
// ✅ SHOULD BE: Actual Stripe payout
if (artisan.stripeConnectAccountId) {
  const payout = await stripe.payouts.create(
    {
      amount: Math.round(payoutAmount * 100),
      currency: 'cad',
      method: 'standard', // 2-3 business days
      statement_descriptor: 'BAZAAR Earnings'
    },
    {
      stripeAccount: artisan.stripeConnectAccountId // ⭐ Key parameter
    }
  );
  
  // Record payout in transaction
  payoutTransaction.stripePayoutId = payout.id;
}
```

### 4.4 Payout Schedule Calculation

**Weekly Payouts** (Default):
```javascript
// Next Friday at 1 PM
const now = new Date();
const dayOfWeek = now.getDay();
const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
const nextFriday = new Date(now);
nextFriday.setDate(now.getDate() + daysUntilFriday);
nextFriday.setHours(13, 0, 0, 0);
```

**Monthly Payouts**:
```javascript
// First day of next month at 1 PM
const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 13, 0, 0, 0);
```

---

## Key Components & Dependencies

### 1. Backend Services

#### WalletService.js
**Purpose**: Manages wallet balances, transactions, and revenue recognition  
**Key Methods**:
- `getWalletBalance(userId)` - Get/create wallet for user
- `addFunds(userId, amount, method, metadata)` - Add funds to wallet
- `deductFunds(userId, amount, description)` - Deduct funds from wallet
- `processOrderCompletion(orderData, db)` - Revenue recognition on order completion
- `transferFunds(fromUserId, toUserId, amount)` - Transfer between wallets
- `getTransactionHistory(userId, options)` - Get transaction history

**Dependencies**:
- MongoDB `wallets` collection
- MongoDB `wallettransactions` collection
- PlatformSettingsService (for fee calculations)

#### StripeService.js
**Purpose**: Handles Stripe Connect integration  
**Key Methods**:
- `createConnectAccount(artisanData, bankInfo)` - Create Stripe Connect account
- `addBankAccount(accountId, bankInfo)` - Link bank account to Connect
- `createPayout(accountId, amount, currency)` - Create payout to bank
- `getAccountStatus(accountId)` - Check Connect account status
- `createAccountLink(accountId, refreshUrl, returnUrl)` - Onboarding link

**Dependencies**:
- Stripe SDK
- Encryption utilities for bank info

#### PlatformSettingsService.js
**Purpose**: Manages platform-wide settings including fees  
**Key Methods**:
- `getPlatformSettings()` - Get current settings
- `calculatePlatformFee(amount, feeType)` - Calculate fees
- `getPlatformFeeRate(feeType)` - Get fee rate
- `getPaymentSettings()` - Get payment-specific settings
- `syncWalletPayoutSettings(payoutSettings)` - Sync wallet settings

**Fee Configuration**:
```javascript
{
  platformFeePercentage: 10, // 10% platform commission
  paymentProcessingFee: 2.9, // 2.9% Stripe fee
  paymentProcessingFeeFixed: 0.30, // $0.30 per transaction
  payoutSettings: {
    payoutFrequency: 'weekly', // or 'monthly'
    minimumPayoutAmount: 25, // $25 minimum
    payoutDelay: 7 // 7 days delay
  }
}
```

### 2. Frontend Services

#### orderPaymentService.js
**Purpose**: Handle order payment operations  
**Key Methods**:
- `createPaymentIntent(orderData)` - Create Stripe PaymentIntent
- `confirmOrder(orderData)` - Confirm order after payment

#### paymentService.js
**Purpose**: Manage payment methods  
**Key Methods**:
- `getPaymentMethods()` - Get saved payment methods
- `addPaymentMethod(paymentData)` - Add new payment method
- `removePaymentMethod(id)` - Remove payment method
- `setDefaultPaymentMethod(id)` - Set default payment method

#### walletService.js
**Purpose**: Frontend wallet operations  
**Key Methods**:
- `getWalletBalance()` - Get current balance
- `getTransactionHistory()` - Get transaction history
- `topUpWallet(amount)` - Add funds to wallet

### 3. Cron Jobs

#### Auto-Capture Payments
- **File**: `backend/api/cron/auto-capture-payments.js`
- **Schedule**: Every hour
- **Purpose**: Auto-confirm orders after 48 hours
- **Endpoint**: `GET /api/cron/auto-capture-payments`
- **Auth**: `Bearer ${CRON_SECRET}`

#### Weekly Payouts
- **File**: `backend/api/cron/payouts.js`
- **Schedule**: Every Friday at 9 AM EST
- **Purpose**: Transfer funds from wallet to bank
- **Endpoint**: `GET /api/cron/payouts`
- **Auth**: `Bearer ${CRON_SECRET}`

### 4. Webhooks

#### Stripe Webhooks
**File**: `backend/routes/webhooks/stripe.js`  
**Endpoint**: `POST /api/webhooks/stripe`

**Handled Events**:
- `payment_intent.succeeded` - Update order payment status to captured
- `payment_intent.payment_failed` - Mark payment as failed, restore inventory
- `payment_intent.canceled` - Cancel order, restore inventory
- `charge.refunded` - Handle refunds
- `customer.created` - Link Stripe customer to user
- `customer.updated` - Sync customer data
- `payment_method.attached` - Add payment method to user
- `payment_method.detached` - Remove payment method from user

**Webhook Signature Verification**:
```javascript
const event = stripe.webhooks.constructEvent(
  req.body, // Raw body
  sig,
  webhookSecret // STRIPE_WEBHOOK_SECRET env var
);
```

### 5. Database Collections

#### orders
- Stores all order information
- Tracks payment and order status
- Links to artisan and patron

#### wallets
- One per user (artisan)
- Tracks available balance
- Stores payout settings
- Links to Stripe Connect account

#### wallettransactions
- Transaction history for each wallet
- Records all credits and debits
- Links to orders and revenue records

#### revenues
- Revenue breakdown for each completed order
- Tracks fee calculations
- Used for analytics and reporting

#### platformsettings
- Single document with platform configuration
- Fee rates, payout settings, payment settings
- Updated by admins

---

## Fee Structure & Calculations

### Default Fee Configuration

```javascript
{
  platformFeePercentage: 10, // 10% platform commission
  paymentProcessingFee: 2.9, // 2.9% Stripe processing
  paymentProcessingFeeFixed: 0.30, // $0.30 fixed per transaction
  payoutSettings: {
    payoutFrequency: 'weekly',
    minimumPayoutAmount: 25,
    payoutDelay: 7
  }
}
```

### Example Calculation

**Order Total: $100.00**

```
Patron Pays:           $100.00
├─ Product Subtotal:    $90.00
└─ Delivery Fee:        $10.00

Total Revenue:         $100.00

Platform Fees:
├─ Platform Commission: $10.00 (10% of $100)
└─ Stripe Processing:    $3.20 (2.9% of $100 + $0.30)

Artisan Receives:       $86.80 (86.8%)
```

**Breakdown**:
```javascript
totalRevenue = subtotal + deliveryFee = $90 + $10 = $100.00
platformFee = $100.00 × 0.10 = $10.00
stripeFee = ($100.00 × 0.029) + $0.30 = $2.90 + $0.30 = $3.20
netEarnings = $100.00 - $10.00 - $3.20 = $86.80
```

**To Artisan's Wallet**: $86.80  
**Weekly Payout**: $86.80 (if ≥ $25 minimum)  
**To Bank Account**: $86.80 (minus Stripe payout fee ~$0.25)

### Fee Breakdown by Order Component

| Component | Amount | Platform Fee | Stripe Fee | Artisan Gets |
|-----------|--------|--------------|------------|--------------|
| Products | $90.00 | $9.00 (10%) | $2.91 | $78.09 |
| Delivery | $10.00 | $1.00 (10%) | $0.29 | $8.71 |
| **Total** | **$100.00** | **$10.00** | **$3.20** | **$86.80** |

**Note**: Artisan keeps delivery fees after platform commission

---

## Identified Gaps & Issues

### 🔴 CRITICAL GAPS

#### Gap #1: Payment Capture Inconsistency
**Issue**: Different behavior for guest vs authenticated users

**Guest Orders**:
```javascript
paymentStatus: 'captured' // Immediate capture
```

**Patron Orders**:
```javascript
paymentStatus: 'authorized' // Hold, capture later
```

**Problem**: 
- Guests: Funds captured immediately, no escrow period
- Patrons: Funds held for 48 hours, proper escrow
- **Inconsistent buyer experience**

**Risk**: 
- Guest orders don't have fraud protection window
- Artisan gets funds immediately for guest orders
- Could lead to disputes if guest claims non-delivery

**Recommendation**: 
Either:
1. Capture immediately for ALL orders (simpler, faster revenue)
2. Authorize for ALL orders (better fraud protection)

---

#### Gap #2: Stripe Connect Not Fully Operational

**Current State**:
- ✅ Connect account creation implemented
- ✅ Bank account linking implemented
- ✅ Onboarding handlers exist
- ⚠️ Transfer to Connect accounts implemented
- ❌ Actual payouts from Connect → bank NOT fully tested
- ❌ No frontend UI for artisan onboarding

**Files**:
- `backend/services/stripeService.js` - Has all methods
- `backend/routes/profile/stripeConnectHandlers.js` - Endpoints exist
- `backend/api/cron/payouts.js` - Simulates payouts, doesn't execute real ones

**Missing**:
1. Frontend onboarding flow for artisans to connect bank
2. Status page showing Connect account status
3. Real Stripe payout execution in cron job
4. Error handling for failed payouts
5. Notifications for payout events

**Impact**:
- Artisans can't actually receive money to their bank accounts
- Platform accumulates funds but can't distribute them
- Manual intervention required for payouts

---

#### Gap #3: No Escrow/Hold Tracking

**Issue**: When payment is authorized, there's no tracking of held funds

**Missing Fields**:
```javascript
// Should be in order document
{
  paymentHold: {
    authorizedAt: Date,
    expiresAt: Date, // 7 days from authorization
    amount: Number,
    status: 'held' | 'captured' | 'expired' | 'released'
  }
}
```

**Problem**:
- No visibility into held funds
- No alerts when authorization about to expire
- No automated handling of expired authorizations

**Current Behavior**:
- If authorization expires (7 days), payment fails
- Order stuck in limbo
- No automatic cancellation or retry

---

#### Gap #4: Manual Capture for Patrons Not Implemented

**Issue**: The capture endpoint exists but requires manual trigger

**Endpoint**: `POST /api/orders/:id/capture-payment`  
**Status**: ✅ Implemented  
**Usage**: ❌ Not automatically called on order completion

**Current Flow**:
```
Order completed → Revenue recognized → Wallet credited
BUT payment still 'authorized' → Must manually capture
```

**Should Be**:
```
Order completed → Capture payment → Transfer to Connect → Revenue recognized
```

**Missing Integration**:
The `confirmOrderReceipt()` function doesn't call `capturePaymentAndTransfer()` for patron orders. It only processes revenue recognition.

---

### 🟡 MEDIUM PRIORITY GAPS

#### Gap #5: No Refund Process

**Missing**:
- Refund endpoint for patrons
- Partial refund support
- Refund to wallet vs original payment method
- Refund notifications

**Current Workaround**:
Admin must manually refund via Stripe dashboard

---

#### Gap #6: No Payout History UI

**Issue**: Artisans can't see payout history

**Missing Components**:
- Payout history page
- Payout status (pending, completed, failed)
- Bank account info display (masked)
- Failed payout notifications

**Current State**:
- Wallet transactions show balance changes
- But no dedicated payout tracking
- No status updates for bank transfers

---

#### Gap #7: No Failed Payment Recovery

**Issue**: If payment fails, order is marked failed but no recovery flow

**Missing**:
- Retry payment option
- Alternative payment method prompt
- Order restoration after payment fix

**Current Behavior**:
- Payment fails → Order cancelled → Inventory restored
- Patron must start over completely

---

### 🟢 MINOR GAPS

#### Gap #8: No Payment Method Management UI

**Issue**: Patrons can save payment methods but no UI to manage them

**Missing**:
- View saved cards
- Delete saved cards
- Set default payment method
- Update card details

**Backend**: ✅ Endpoints exist in `paymentService.js`  
**Frontend**: ❌ No component to use them

---

#### Gap #9: No Dispute Handling

**Missing**:
- Dispute notification from Stripe
- Dispute resolution workflow
- Evidence submission
- Dispute analytics

**Current**: Would need to handle disputes manually via Stripe dashboard

---

#### Gap #10: Limited Analytics

**Current Analytics**:
- Revenue per order
- Wallet balances
- Transaction history

**Missing**:
- Payment success rate
- Failed payment reasons
- Chargeback rate
- Payout timing metrics
- Cash flow projections

---

## Dependencies & Triggers

### Trigger Map

```
┌─────────────────────────────────────────────────────────────┐
│ TRIGGER                          │ ACTION                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Patron completes checkout     │ → Create PaymentIntent    │
│                                   │   (authorize funds)       │
├─────────────────────────────────────────────────────────────┤
│ 2. Payment authorized            │ → Create order record     │
│                                   │ → Deduct inventory        │
│                                   │ → Send order notification │
├─────────────────────────────────────────────────────────────┤
│ 3. Artisan updates status        │ → Update order status     │
│                                   │ → Send patron notification│
├─────────────────────────────────────────────────────────────┤
│ 4. Artisan marks 'delivered'     │ → Start 48h window        │
│    or 'picked_up'                │ → Notify patron           │
├─────────────────────────────────────────────────────────────┤
│ 5. Patron confirms receipt       │ → Update to 'completed'   │
│    (manual)                      │ → Process revenue         │
│                                   │ → Credit wallet           │
├─────────────────────────────────────────────────────────────┤
│ 6. 48 hours pass without         │ → Auto-capture cron runs  │
│    confirmation                  │ → Capture payment         │
│                                   │ → Transfer to Connect     │
│                                   │ → Process revenue         │
│                                   │ → Credit wallet           │
├─────────────────────────────────────────────────────────────┤
│ 7. Guest order marked            │ → Auto-complete immediate │
│    'delivered'                   │ → Capture payment         │
│                                   │ → Process revenue         │
│                                   │ → Credit wallet           │
├─────────────────────────────────────────────────────────────┤
│ 8. Wallet balance ≥ $25          │ → Eligible for payout     │
│    + nextPayoutDate reached      │                           │
├─────────────────────────────────────────────────────────────┤
│ 9. Friday 9 AM (weekly payout    │ → Payout cron runs        │
│    cron)                         │ → Create Stripe payout    │
│                                   │ → Deduct from wallet      │
│                                   │ → Record transaction      │
│                                   │ → Update next payout date │
├─────────────────────────────────────────────────────────────┤
│ 10. Stripe payout completes      │ → Funds arrive in bank    │
│     (2-3 business days)          │   (2-3 business days)     │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Chain

```
Payment Authorization
    ↓ requires
Stripe PaymentIntent API
    ↓ depends on
STRIPE_SECRET_KEY environment variable
    ↓ triggers
Order Creation
    ↓ triggers
Inventory Deduction
    ↓ triggers
Order Notification to Artisan

Order Fulfillment
    ↓ triggers
Status Updates
    ↓ triggers
Patron Notifications

Order Completion
    ↓ requires
Manual confirmation OR 48-hour timeout
    ↓ triggers
Revenue Recognition (WalletService.processOrderCompletion)
    ↓ requires
Platform Settings (for fee calculation)
    ↓ depends on
MongoDB platformsettings collection
    ↓ triggers
Wallet Credit (WalletService.addFunds)
    ↓ depends on
MongoDB wallets collection
    ↓ creates
Transaction Record (wallettransactions)
    ↓ creates
Revenue Record (revenues)

Weekly Payout
    ↓ requires
Stripe Connect Account (stripeConnectAccountId)
    ↓ depends on
Bank Information (artisan.bankInfo)
    ↓ requires
Wallet Balance ≥ Minimum ($25)
    ↓ requires
nextPayoutDate ≤ today
    ↓ triggers
Stripe Payout Creation
    ↓ depends on
STRIPE_SECRET_KEY + Connect Account
    ↓ triggers
Wallet Balance Deduction
    ↓ creates
Payout Transaction Record
    ↓ results in
Funds in Bank Account (2-3 days)
```

### Critical Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=bazaarmkt

# Authentication
JWT_SECRET=your-jwt-secret

# Cron Jobs
CRON_SECRET=your-cron-secret

# Encryption (for bank info)
ENCRYPTION_KEY=32-character-key

# Frontend URL (for redirects)
FRONTEND_URL=https://bazaarmkt.ca
```

---

## Recommendations

### 🔥 HIGH PRIORITY (Must Fix)

#### 1. Unify Payment Capture Strategy

**Decision Required**: Choose one approach

**Option A: Immediate Capture (Recommended for Simplicity)**
```javascript
// Change for ALL orders (guests + patrons)
const paymentIntent = await stripe.paymentIntents.create({
  capture_method: 'automatic', // Capture immediately
  // ... other params
});

// Benefits:
// ✅ Simpler flow
// ✅ Faster revenue recognition
// ✅ Consistent for all users
// ✅ No 7-day expiry to manage

// Drawbacks:
// ❌ No fraud protection window
// ❌ Harder to handle disputes
// ❌ Funds released before delivery confirmed
```

**Option B: Always Authorize First (Recommended for Security)**
```javascript
// Change for ALL orders (guests + patrons)
const paymentIntent = await stripe.paymentIntents.create({
  capture_method: 'manual', // Always authorize first
  // ... other params
});

// Benefits:
// ✅ Fraud protection window
// ✅ Can cancel before capture
// ✅ Better dispute handling
// ✅ Platform can verify delivery

// Drawbacks:
// ❌ More complex flow
// ❌ 7-day expiry to manage
// ❌ Delayed revenue recognition
```

**Recommended**: **Option B** - Better for marketplace trust and safety

#### 2. Complete Stripe Connect Integration

**Implement Full Flow**:

```javascript
// A. Artisan Onboarding UI (NEW)
// frontend/src/components/StripeConnectOnboarding.jsx

const StripeConnectOnboarding = () => {
  const [status, setStatus] = useState(null);
  
  const handleSetupStripeConnect = async () => {
    // Check if bank info exists
    const bankInfo = await profileService.getBankInfo();
    if (!bankInfo) {
      navigate('/profile?tab=bank');
      toast.error('Please add bank information first');
      return;
    }
    
    // Setup Stripe Connect
    const result = await profileService.setupStripeConnect();
    toast.success('Stripe Connect setup complete!');
  };
  
  return (
    <div className="card p-6">
      <h3>Bank Account Setup</h3>
      {status?.isSetup ? (
        <div>✅ Connected to Stripe</div>
      ) : (
        <button onClick={handleSetupStripeConnect}>
          Connect Bank Account
        </button>
      )}
    </div>
  );
};
```

**B. Update Payout Cron to Use Real Stripe Payouts**:

```javascript
// backend/api/cron/payouts.js (lines 96-150)
// Replace simulation with real payout

// CURRENT (Simulated):
const payoutTransaction = {
  type: 'payout',
  amount: -payoutAmount,
  status: 'completed' // ❌ Not actually completed
};

// SHOULD BE (Real Stripe Payout):
if (!artisan.stripeConnectAccountId) {
  console.log('⚠️ Artisan has no Stripe Connect account, skipping');
  continue; // Skip this artisan
}

// Create actual Stripe payout
const payout = await stripe.payouts.create(
  {
    amount: Math.round(payoutAmount * 100),
    currency: 'cad',
    method: 'standard',
    statement_descriptor: 'BAZAAR Earnings'
  },
  {
    stripeAccount: artisan.stripeConnectAccountId // ⭐ Critical
  }
);

const payoutTransaction = {
  type: 'payout',
  amount: -payoutAmount,
  status: 'pending', // ✅ Pending until Stripe confirms
  stripePayoutId: payout.id,
  payoutExpectedAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
};
```

**C. Add Webhook Handler for Payout Events**:

```javascript
// backend/routes/webhooks/stripe.js
// Add new event handlers

case 'payout.paid':
  await handlePayoutPaid(event.data.object, db);
  break;

case 'payout.failed':
  await handlePayoutFailed(event.data.object, db);
  break;

// Handler functions
const handlePayoutPaid = async (payout, db) => {
  // Update transaction to 'completed'
  await db.collection('wallettransactions').updateOne(
    { stripePayoutId: payout.id },
    { 
      $set: { 
        status: 'completed',
        completedAt: new Date(),
        payoutArrivalDate: new Date(payout.arrival_date * 1000)
      }
    }
  );
  
  // Send notification to artisan
  // "Your payout of $X has been sent to your bank account"
};

const handlePayoutFailed = async (payout, db) => {
  // Update transaction to 'failed'
  // Restore wallet balance
  // Send notification to artisan
  // Alert admin
};
```

---

#### 3. Integrate Payment Capture with Order Confirmation

**Problem**: Payment capture is separate from order confirmation

**Current Code** (confirmOrderReceipt - line 4105):
```javascript
// Only updates status and processes revenue
await ordersCollection.updateOne({ _id: orderId }, {
  $set: { status: 'completed' }
});
await walletService.processOrderCompletion(order, db);
```

**Should Be**:
```javascript
// Step 1: Capture payment if authorized
if (order.paymentStatus === 'authorized') {
  await capturePaymentAndTransfer({
    body: { orderId: order._id },
    db: db
  });
}

// Step 2: Update status
await ordersCollection.updateOne({ _id: orderId }, {
  $set: { status: 'completed' }
});

// Step 3: Process revenue (wallet credit)
await walletService.processOrderCompletion(order, db);
```

**Fix Location**: `backend/routes/orders/index.js` line 4172

---

### 🟡 MEDIUM PRIORITY

#### 4. Add Payment Method Management UI

**Create**: `frontend/src/components/PaymentMethods.jsx`

```javascript
const PaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  useEffect(() => {
    loadPaymentMethods();
  }, []);
  
  const loadPaymentMethods = async () => {
    const methods = await paymentService.getPaymentMethods();
    setPaymentMethods(methods);
  };
  
  const handleDelete = async (methodId) => {
    await paymentService.removePaymentMethod(methodId);
    loadPaymentMethods();
  };
  
  const handleSetDefault = async (methodId) => {
    await paymentService.setDefaultPaymentMethod(methodId);
    loadPaymentMethods();
  };
  
  return (
    <div className="card p-6">
      <h3>Saved Payment Methods</h3>
      {paymentMethods.map(method => (
        <div key={method.id} className="border rounded p-4">
          <div className="flex justify-between">
            <div>
              <p className="font-medium">
                {method.brand} •••• {method.last4}
              </p>
              <p className="text-sm text-gray-500">
                Expires {method.expiryMonth}/{method.expiryYear}
              </p>
              {method.isDefault && (
                <span className="badge">Default</span>
              )}
            </div>
            <div className="flex gap-2">
              {!method.isDefault && (
                <button onClick={() => handleSetDefault(method.id)}>
                  Set as Default
                </button>
              )}
              <button onClick={() => handleDelete(method.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

#### 5. Implement Refund System

**Backend Endpoint**:
```javascript
// POST /api/orders/:id/refund
router.post('/:id/refund', authMiddleware, async (req, res) => {
  const { amount, reason } = req.body;
  const order = await ordersCollection.findOne({ _id: orderId });
  
  // Validate refund request
  if (order.paymentStatus !== 'captured') {
    return res.status(400).json({
      error: 'Can only refund captured payments'
    });
  }
  
  // Create Stripe refund
  const refund = await stripe.refunds.create({
    payment_intent: order.paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined, // Partial or full
    reason: reason || 'requested_by_customer'
  });
  
  // If artisan already received funds, deduct from wallet
  if (order.status === 'completed') {
    await walletService.deductFunds(
      artisan.userId,
      amount || order.artisanAmount,
      `Refund for order #${orderNumber}`
    );
  }
  
  // Update order
  await ordersCollection.updateOne(
    { _id: orderId },
    { 
      $set: { 
        paymentStatus: 'refunded',
        refundedAt: new Date(),
        refundAmount: amount || order.totalAmount,
        refundReason: reason
      }
    }
  );
  
  res.json({ success: true, refund });
});
```

---

### 🟢 NICE TO HAVE

#### 6. Add Payout History & Status Page

**Create**: `frontend/src/components/PayoutHistory.jsx`

```javascript
const PayoutHistory = () => {
  const [payouts, setPayouts] = useState([]);
  const [nextPayoutDate, setNextPayoutDate] = useState(null);
  
  useEffect(() => {
    loadPayoutHistory();
  }, []);
  
  const loadPayoutHistory = async () => {
    // Get wallet transactions of type 'payout'
    const transactions = await walletService.getTransactionHistory({
      type: 'payout'
    });
    setPayouts(transactions);
    
    // Get next payout date
    const wallet = await walletService.getWalletBalance();
    setNextPayoutDate(wallet.payoutSettings?.nextPayoutDate);
  };
  
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3>Next Payout</h3>
        <p>Scheduled for: {formatDate(nextPayoutDate)}</p>
        <p>Estimated amount: ${walletBalance}</p>
      </div>
      
      <div className="card p-6">
        <h3>Payout History</h3>
        {payouts.map(payout => (
          <div key={payout._id} className="border-b py-3">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">
                  {formatDate(payout.createdAt)}
                </p>
                <p className="text-sm text-gray-500">
                  {payout.description}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">
                  ${Math.abs(payout.amount).toFixed(2)}
                </p>
                <p className={`text-sm ${
                  payout.status === 'completed' ? 'text-green-600' :
                  payout.status === 'pending' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {payout.status}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

#### 7. Add Payment Analytics Dashboard

**Metrics to Track**:
- Payment success rate
- Average order value
- Failed payment reasons
- Chargeback rate
- Refund rate
- Average time to confirmation
- Payout success rate
- Revenue by artisan
- Revenue by category
- Cash flow projections

---

## Testing Checklist

### Payment Authorization
- [ ] Create order with test card
- [ ] Verify PaymentIntent created with `capture_method: manual`
- [ ] Check order has `paymentStatus: 'authorized'`
- [ ] Verify funds held (not captured) on test card
- [ ] Test authorization expiry (7 days)

### Order Fulfillment
- [ ] Artisan can update status
- [ ] Status updates trigger notifications
- [ ] Guest orders auto-complete when marked delivered
- [ ] Patron orders await confirmation when marked delivered

### Manual Confirmation
- [ ] Patron can confirm receipt
- [ ] Confirmation triggers revenue recognition
- [ ] Wallet balance increases correctly
- [ ] Transaction record created
- [ ] Revenue record created
- [ ] Artisan receives notification

### Auto-Confirmation
- [ ] Cron job runs every hour
- [ ] Finds orders >48 hours old
- [ ] Auto-captures payment
- [ ] Credits wallet
- [ ] Creates all necessary records

### Stripe Connect
- [ ] Artisan can add bank info
- [ ] Setup Stripe Connect creates account
- [ ] Bank account linked successfully
- [ ] Connect status displayed correctly
- [ ] Payouts enabled after setup

### Weekly Payouts
- [ ] Cron runs every Friday at 9 AM
- [ ] Finds eligible wallets
- [ ] Creates Stripe payouts
- [ ] Deducts from wallet balance
- [ ] Records payout transactions
- [ ] Funds arrive in bank (manual verification)

### Edge Cases
- [ ] Payment authorization expires → Order cancelled
- [ ] Patron tries to confirm already-completed order
- [ ] Payout fails → Wallet balance restored
- [ ] Duplicate capture prevention
- [ ] Network failure handling
- [ ] Concurrent request handling

---

## Implementation Priority

### Phase 1: Critical Fixes (Week 1)
1. ✅ Unify payment capture strategy (choose immediate or manual)
2. ✅ Integrate capture with order confirmation
3. ✅ Test full payment flow end-to-end

### Phase 2: Stripe Connect (Week 2-3)
1. Create artisan onboarding UI
2. Test Connect account creation
3. Update payout cron to use real payouts
4. Add webhook handlers for payout events
5. Test full payout flow

### Phase 3: UI Improvements (Week 4)
1. Payment methods management page
2. Payout history page
3. Bank account status display
4. Better error messaging

### Phase 4: Advanced Features (Week 5+)
1. Refund system
2. Dispute handling
3. Analytics dashboard
4. Failed payment recovery

---

## Success Criteria

✅ System is complete when:

1. **Payment Flow**
   - [ ] All orders use consistent capture method
   - [ ] Authorization tracking is accurate
   - [ ] Expired authorizations handled automatically
   - [ ] Payment webhooks process correctly

2. **Revenue Recognition**
   - [ ] Wallet credited on order completion
   - [ ] Fee calculations are accurate
   - [ ] Transaction records complete
   - [ ] Revenue records tracked

3. **Payouts**
   - [ ] Artisans can connect bank accounts
   - [ ] Stripe Connect accounts created successfully
   - [ ] Weekly payouts execute automatically
   - [ ] Funds arrive in bank accounts
   - [ ] Payout history visible to artisans

4. **User Experience**
   - [ ] Clear payment status messages
   - [ ] Accurate balance display
   - [ ] Transparent fee breakdown
   - [ ] Reliable notifications

---

## Monitoring & Alerts

### Key Metrics to Monitor

```javascript
// Payment Metrics
{
  dailyOrderVolume: Number,
  paymentSuccessRate: Percentage,
  averageOrderValue: Currency,
  failedPaymentCount: Number,
  authorizedButNotCaptured: Number, // Should be small
  expiredAuthorizations: Number // Should be zero
}

// Wallet Metrics
{
  totalWalletBalance: Currency, // Sum of all artisan balances
  pendingPayouts: Currency, // Balance ready for payout
  averageBalance: Currency,
  walletsAboveMinimum: Number // Eligible for payout
}

// Payout Metrics
{
  weeklyPayoutVolume: Currency,
  payoutSuccessRate: Percentage,
  averagePayoutAmount: Currency,
  failedPayoutCount: Number,
  pendingPayouts: Number
}

// Revenue Metrics
{
  platformRevenue: Currency, // Total platform fees collected
  artisanRevenue: Currency, // Total paid to artisans
  stripeFeesTotal: Currency, // Total Stripe fees
  revenueByCategory: Object
}
```

### Critical Alerts

```javascript
// Set up alerts for:
{
  paymentCaptureFailure: {
    threshold: 5, // per hour
    action: 'alert admin + check Stripe status'
  },
  payoutFailure: {
    threshold: 1, // any failure
    action: 'immediate admin alert'
  },
  authorizationExpiry: {
    threshold: 10, // per week
    action: 'review capture timing'
  },
  walletBalanceAnomaly: {
    threshold: 'negative balance',
    action: 'immediate investigation'
  },
  highPendingBalance: {
    threshold: '$10,000+', // pending for >72 hours
    action: 'check confirmation flow'
  }
}
```

---

## Code Files Reference

### Backend Files
- `backend/services/stripeService.js` - Stripe Connect operations
- `backend/services/WalletService.js` - Wallet and revenue management
- `backend/services/platformSettingsService.js` - Fee configuration
- `backend/routes/orders/index.js` - Order and payment endpoints
- `backend/routes/profile/stripeConnectHandlers.js` - Connect onboarding
- `backend/routes/webhooks/stripe.js` - Stripe webhook handlers
- `backend/api/cron/payouts.js` - Weekly payout cron job
- `backend/api/cron/auto-capture-payments.js` - Auto-capture cron job
- `backend/utils/encryption.js` - Bank info encryption

### Frontend Files
- `frontend/src/components/Cart.jsx` - Checkout flow
- `frontend/src/components/StripeOrderPayment.jsx` - Payment UI
- `frontend/src/services/orderPaymentService.js` - Payment service
- `frontend/src/services/paymentService.js` - Payment methods
- `frontend/src/services/walletService.js` - Wallet operations
- `frontend/src/components/WalletDashboard.jsx` - Wallet UI
- `frontend/src/components/WalletTransactions.jsx` - Transaction history

### Documentation
- `docs/payment/STRIPE_PAYMENT_FLOW_REVIEW.md` - Payment flow review
- `docs/payment/PRODUCTION_WALLET_SETUP.md` - Wallet production guide
- `docs/payment/STRIPE_CONNECT_INTEGRATION_COMPLETE.md` - Connect status

---

## Environment Setup

### Required Stripe Configuration

```bash
# Development/Test
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Vercel Cron Configuration

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-capture-payments",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/payouts",
      "schedule": "0 13 * * 5"
    }
  ]
}
```

### Required Environment Variables

```bash
# Core
NODE_ENV=production
JWT_SECRET=<64-char-random-string>
CRON_SECRET=<32-char-random-string>
ENCRYPTION_KEY=<32-char-encryption-key>

# Database
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=bazaarmkt

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend
FRONTEND_URL=https://bazaarmkt.ca
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Summary of Findings

### ✅ What's Working Well

1. **Payment Processing**
   - Stripe integration functional
   - PaymentIntent creation working
   - Payment confirmation working
   - Test mode thoroughly configured

2. **Revenue Recognition**
   - Comprehensive fee calculations
   - Accurate wallet crediting
   - Transaction history tracking
   - Revenue record creation

3. **Wallet System**
   - Balance tracking accurate
   - Transaction records complete
   - Multiple transaction types supported
   - Platform settings integration

4. **Order Management**
   - Clear status progression
   - Proper inventory management
   - Guest and patron flows
   - Notification system

### ⚠️ What Needs Fixing

1. **Critical**
   - Inconsistent capture method (guests vs patrons)
   - Stripe Connect not fully utilized for payouts
   - No escrow/hold tracking
   - Manual capture not integrated with confirmation

2. **Important**
   - No payout history UI
   - No payment method management UI
   - No refund system
   - Limited error recovery

3. **Nice to Have**
   - Dispute handling
   - Advanced analytics
   - Cash flow projections
   - Multi-currency support

---

## Conclusion

The BazaarMKT payment and payout system has a **solid foundation** with most core components implemented. However, there are **critical gaps** that need to be addressed before the system can be considered production-ready for scaled operations:

### Immediate Actions Required:

1. **Decide on capture strategy** - Manual authorization vs immediate capture
2. **Complete Stripe Connect integration** - Make payouts actually work
3. **Integrate capture with confirmation** - Link the disconnected pieces
4. **Build artisan onboarding UI** - Help artisans connect banks
5. **Test end-to-end flow** - Payment → Order → Completion → Payout → Bank

### System Maturity: **75% Complete**

- ✅ Payment acceptance
- ✅ Revenue tracking  
- ✅ Wallet management
- ⚠️ Actual payouts (needs testing)
- ❌ Full UI for payout management
- ❌ Complete error handling

**Estimated Effort to 100%**: 2-3 weeks with testing

---

**Document Version**: 1.0  
**Review Date**: October 14, 2025  
**Next Review**: After implementation of recommendations  
**Owner**: Development Team

