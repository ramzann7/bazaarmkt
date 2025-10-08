# Stripe Payment Processing Flow - Complete Review & Implementation Plan

## 🎯 Required User Experience

**The desired flow:**
1. **User completes purchase** → Funds are captured but **RETAINED** (held in escrow)
2. **Order delivered/completed** → Buyer confirms receipt
3. **Upon confirmation** → Funds added to artisan's wallet
4. **Weekly payouts** → Funds from wallet transferred to artisan's bank account

---

## 🚨 CRITICAL GAPS IN CURRENT IMPLEMENTATION

### Gap #1: No Stripe Connect Integration
**Current State:**
- `stripeService.js` has Stripe Connect code but **NOT INTEGRATED** into payment flow
- Payments go directly to platform Stripe account
- No artisan-specific Stripe Connect accounts

**Impact:**
❌ Cannot transfer funds to artisan bank accounts
❌ No escrow/hold mechanism
❌ No automated payouts

**Required:**
- Each artisan needs a Stripe Connect account
- Onboarding flow for artisans to connect bank accounts
- Separate transfers to artisan Connect accounts

---

### Gap #2: Payment Capture vs Authorization Confusion
**Current State:**
```javascript
// frontend/src/components/StripeOrderPayment.jsx line 577-580
if (paymentIntent.status === 'requires_capture') {
  paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
}
```

**Issues:**
1. **Immediate Capture**: Payments are captured immediately at checkout
2. **No Escrow**: Funds go to platform immediately, not held
3. **Wrong Flow**: Should authorize, then capture after confirmation

**Current Flow:**
```
User Pays → Stripe Captures → Platform Holds in Wallet → Manual Tracking
```

**Should Be:**
```
User Pays → Stripe Authorizes (7-day hold) → Order Confirmed → Capture → Transfer
```

---

### Gap #3: No Automated Weekly Payouts
**Current State:**
- `WalletService.js` tracks wallet balances
- No payout automation
- No scheduled transfers to bank accounts

**Impact:**
❌ Artisans must manually request payouts
❌ No consistent payout schedule
❌ Poor cash flow management for artisans

---

### Gap #4: Wallet ≠ Actual Funds Transfer
**Current State:**
- Wallet is just a database number
- No connection to real bank transfers
- Artisans see balance but can't access money

**Issue:**
The wallet system tracks earnings but doesn't actually move money to artisans' bank accounts.

---

## ✅ CORRECT STRIPE PAYMENT FLOW

### **Phase 1: Order Placement (Authorization)**

```javascript
// When user places order
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmount * 100, // in cents
  currency: 'cad',
  capture_method: 'manual', // ⭐ KEY: Don't capture yet
  metadata: {
    orderId: orderId,
    artisanId: artisanId
  },
  // Optional: Split payment immediately (alternative approach)
  transfer_data: {
    destination: artisanStripeConnectAccountId,
    amount: artisanAmount * 100 // 85-90% of total
  },
  application_fee_amount: platformFee * 100 // 10-15% platform fee
});
```

**Benefits:**
- ✅ Funds authorized (reserved) but not captured
- ✅ 7-day hold window (Stripe default)
- ✅ Can still cancel if fraud detected
- ✅ Funds available for capture when order confirmed

---

### **Phase 2: Order Delivery (Confirmation Period)**

```
Order Status: delivered/picked_up
Payment Status: authorized (not captured)
Artisan Wallet: Shows "pending" amount
```

**Two confirmation paths:**
1. **Patron confirms receipt** → Immediate capture
2. **48 hours pass** → Auto-confirm → Capture

---

### **Phase 3: Capture & Transfer**

```javascript
// After confirmation
// Step 1: Capture the payment
const captured = await stripe.paymentIntents.capture(paymentIntentId);

// Step 2: Transfer to artisan's Connect account
const transfer = await stripe.transfers.create({
  amount: artisanAmount * 100,
  currency: 'cad',
  destination: artisan.stripeConnectAccountId,
  metadata: {
    orderId: orderId,
    orderNumber: orderNumber
  }
});

// Step 3: Update wallet balance (for tracking)
await walletService.addFunds(artisanUserId, artisanAmount, 'order_completion', {
  orderId: orderId,
  stripeTransferId: transfer.id
});
```

**Result:**
- ✅ Funds captured from buyer
- ✅ Transferred to artisan's Stripe balance
- ✅ Wallet updated for tracking
- ✅ Platform fee automatically deducted

---

### **Phase 4: Weekly Automated Payouts**

```javascript
// Cron job runs every Monday at 2 AM
// File: backend/api/cron/weekly-payouts.js

// For each artisan with Stripe Connect account
const payout = await stripe.payouts.create(
  {
    amount: artisan.walletBalance * 100,
    currency: 'cad',
    method: 'standard', // 2-3 business days
    statement_descriptor: 'BAZAAR Earnings'
  },
  {
    stripeAccount: artisan.stripeConnectAccountId // ⭐ Key parameter
  }
);

// Update wallet balance
await walletService.deductFunds(artisanUserId, artisan.walletBalance, 
  `Weekly payout #${payout.id}`);
```

**Payout Schedule:**
- **Frequency**: Every Monday at 2:00 AM EST
- **Minimum**: $10 CAD (configurable)
- **Method**: Standard (2-3 business days)
- **Fee**: Stripe fee deducted ($0.25 USD per payout)

---

## 🏗️ IMPLEMENTATION ARCHITECTURE

### **1. Stripe Connect Account Setup**

#### Artisan Onboarding Flow:
```
1. Artisan registers on platform
   ↓
2. Complete profile (business info, tax details)
   ↓
3. Click "Connect Bank Account"
   ↓
4. Redirect to Stripe Connect Onboarding
   ↓
5. Complete Stripe identity verification
   ↓
6. Return to platform with accountId
   ↓
7. Save stripeConnectAccountId to artisan profile
   ↓
8. ✅ Ready to receive payouts
```

#### Backend Implementation:
```javascript
// POST /api/artisans/connect-stripe
router.post('/connect-stripe', authMiddleware, async (req, res) => {
  const { artisanId } = req.user;
  
  // Create Connect account
  const account = await stripe.accounts.create({
    type: 'express', // Faster onboarding
    country: 'CA',
    email: artisan.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    business_profile: {
      name: artisan.artisanName,
      product_description: 'Handmade artisan products'
    }
  });
  
  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${FRONTEND_URL}/artisan/connect-stripe/refresh`,
    return_url: `${FRONTEND_URL}/artisan/connect-stripe/success`,
    type: 'account_onboarding'
  });
  
  // Save account ID
  await artisansCollection.updateOne(
    { _id: artisanId },
    { $set: { 
      stripeConnectAccountId: account.id,
      stripeOnboardingStarted: new Date()
    }}
  );
  
  res.json({ onboardingUrl: accountLink.url });
});
```

---

### **2. Payment Intent with Authorization**

#### Update Order Creation:
```javascript
// backend/routes/orders/index.js
// Replace immediate capture with authorization

// Create PaymentIntent with manual capture
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmount * 100,
  currency: 'cad',
  capture_method: 'manual', // ⭐ Don't capture immediately
  metadata: {
    orderId: orderId.toString(),
    artisanId: artisanId.toString(),
    userId: userId.toString()
  },
  description: `Order #${orderNumber}`,
  // Optional: Apply platform fee at payment time
  application_fee_amount: platformFee * 100,
  transfer_data: {
    destination: artisan.stripeConnectAccountId
  }
});

// Save with authorized status
const order = {
  // ... other fields
  paymentStatus: 'authorized', // Not 'captured'
  paymentIntentId: paymentIntent.id,
  stripeConnectAccountId: artisan.stripeConnectAccountId,
  holdExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
};
```

---

### **3. Capture After Confirmation**

#### Update Confirmation Logic:
```javascript
// POST /api/orders/:id/confirm-receipt
router.post('/:id/confirm-receipt', authMiddleware, async (req, res) => {
  const order = await ordersCollection.findOne({ _id: orderId });
  
  // Verify authorization hasn't expired
  if (new Date() > order.holdExpiresAt) {
    return res.status(400).json({
      error: 'Payment authorization expired. Order cancelled.'
    });
  }
  
  // Step 1: Capture the payment
  const paymentIntent = await stripe.paymentIntents.capture(
    order.paymentIntentId
  );
  
  if (paymentIntent.status !== 'succeeded') {
    throw new Error('Payment capture failed');
  }
  
  // Step 2: Transfer to artisan (if not using destination charges)
  let transfer;
  if (!order.transfer_data) {
    const platformFee = order.totalAmount * 0.10; // 10%
    const artisanAmount = order.totalAmount - platformFee;
    
    transfer = await stripe.transfers.create({
      amount: Math.round(artisanAmount * 100),
      currency: 'cad',
      destination: order.stripeConnectAccountId,
      transfer_group: order._id.toString(),
      metadata: {
        orderId: order._id.toString(),
        orderNumber: orderNumber,
        platformFee: platformFee.toFixed(2),
        artisanAmount: artisanAmount.toFixed(2)
      }
    });
  }
  
  // Step 3: Update order status
  await ordersCollection.updateOne(
    { _id: orderId },
    {
      $set: {
        paymentStatus: 'captured',
        paymentCapturedAt: new Date(),
        stripeTransferId: transfer?.id,
        status: 'completed'
      }
    }
  );
  
  // Step 4: Credit wallet (for tracking)
  await walletService.addFunds(artisan.userId, artisanAmount, 'order_completion', {
    orderId: order._id,
    stripeTransferId: transfer?.id,
    platformFee: platformFee
  });
  
  res.json({
    success: true,
    message: 'Payment captured and transferred to artisan',
    data: {
      capturedAmount: order.totalAmount,
      artisanAmount: artisanAmount,
      platformFee: platformFee
    }
  });
});
```

---

### **4. Weekly Automated Payouts**

#### Create Cron Job:
```javascript
// backend/api/cron/weekly-payouts.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // Verify cron secret
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const db = req.app.locals.db;
  const artisansCollection = db.collection('artisans');
  const usersCollection = db.collection('users');
  
  // Find artisans with Stripe Connect accounts and positive wallet balance
  const artisans = await artisansCollection.find({
    stripeConnectAccountId: { $exists: true, $ne: null },
    'user': { $exists: true }
  }).toArray();
  
  const results = [];
  let totalPayouts = 0;
  let totalAmount = 0;
  
  for (const artisan of artisans) {
    try {
      // Get wallet balance
      const user = await usersCollection.findOne({ _id: artisan.user });
      const balance = user?.walletBalance || 0;
      
      // Skip if balance is below minimum ($10)
      if (balance < 10) {
        console.log(`Skipping payout for ${artisan.artisanName}: Balance too low ($${balance})`);
        continue;
      }
      
      // Check Stripe account status
      const account = await stripe.accounts.retrieve(artisan.stripeConnectAccountId);
      
      if (!account.payouts_enabled) {
        console.log(`Skipping payout for ${artisan.artisanName}: Payouts not enabled`);
        results.push({
          artisanId: artisan._id,
          status: 'skipped',
          reason: 'Payouts not enabled on Stripe account'
        });
        continue;
      }
      
      // Create payout
      const payout = await stripe.payouts.create(
        {
          amount: Math.round(balance * 100), // Convert to cents
          currency: 'cad',
          method: 'standard', // 2-3 business days
          statement_descriptor: 'BAZAAR Earnings',
          metadata: {
            artisanId: artisan._id.toString(),
            artisanName: artisan.artisanName,
            payoutDate: new Date().toISOString()
          }
        },
        {
          stripeAccount: artisan.stripeConnectAccountId // ⭐ Critical
        }
      );
      
      // Deduct from wallet
      await usersCollection.updateOne(
        { _id: artisan.user },
        {
          $inc: { walletBalance: -balance },
          $set: { lastPayoutAt: new Date() }
        }
      );
      
      // Create transaction record
      await db.collection('transactions').insertOne({
        userId: artisan.user,
        artisanId: artisan._id,
        type: 'payout',
        amount: -balance,
        description: `Weekly payout to bank account`,
        status: 'completed',
        stripePayoutId: payout.id,
        payoutMethod: 'bank_transfer',
        createdAt: new Date()
      });
      
      totalPayouts++;
      totalAmount += balance;
      
      results.push({
        artisanId: artisan._id,
        artisanName: artisan.artisanName,
        amount: balance,
        stripePayoutId: payout.id,
        status: 'success'
      });
      
      console.log(`✅ Payout successful for ${artisan.artisanName}: $${balance}`);
      
    } catch (error) {
      console.error(`❌ Payout failed for ${artisan.artisanName}:`, error);
      results.push({
        artisanId: artisan._id,
        status: 'failed',
        error: error.message
      });
    }
  }
  
  res.json({
    success: true,
    message: `Processed ${totalPayouts} payouts totaling $${totalAmount.toFixed(2)}`,
    data: {
      totalPayouts,
      totalAmount: totalAmount.toFixed(2),
      results
    }
  });
};
```

#### Configure Vercel Cron:
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/weekly-payouts",
      "schedule": "0 2 * * 1" // Every Monday at 2:00 AM EST
    }
  ]
}
```

---

## 📊 COMPLETE PAYMENT FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER PLACES ORDER                                            │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Create PaymentIntent (capture_method: 'manual')              │
│ ✓ Funds AUTHORIZED (not captured)                              │
│ ✓ 7-day hold starts                                             │
│ ✓ Order status: 'pending'                                       │
│ ✓ Payment status: 'authorized'                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. ARTISAN PREPARES & DELIVERS ORDER                            │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Artisan updates status to 'delivered'/'picked_up'            │
│ ✓ Notification sent to buyer                                    │
│ ✓ Funds still HELD (not captured)                              │
│ ✓ 48-hour confirmation window starts                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. BUYER CONFIRMS RECEIPT                                        │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Buyer clicks "Confirm Receipt" button                        │
│     OR                                                           │
│ ✓ 48 hours pass (auto-confirm)                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. PAYMENT CAPTURED & TRANSFERRED                                │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Capture PaymentIntent (money taken from buyer)               │
│ ✓ Calculate platform fee (10-15%)                              │
│ ✓ Transfer to artisan's Stripe Connect account                 │
│ ✓ Artisan wallet balance updated (tracking)                    │
│ ✓ Order status: 'completed'                                     │
│ ✓ Payment status: 'captured'                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. WEEKLY AUTOMATED PAYOUT                                       │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Cron runs every Monday 2 AM                                   │
│ ✓ Check each artisan's wallet balance                          │
│ ✓ If balance ≥ $10:                                            │
│   - Create Stripe payout to bank account                       │
│   - Deduct from wallet balance                                  │
│   - Create transaction record                                    │
│ ✓ Funds arrive in 2-3 business days                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                     💰 ARTISAN PAID 💰
```

---

## 🔐 SECURITY & COMPLIANCE

### **1. PCI Compliance**
- ✅ Stripe handles all card data
- ✅ Platform never stores card details
- ✅ PCI DSS Level 1 compliant

### **2. Fraud Prevention**
- ✅ 48-hour confirmation window
- ✅ Manual capture prevents instant chargebacks
- ✅ Platform can cancel before capture if fraud detected
- ✅ Stripe Radar for fraud detection

### **3. Dispute Handling**
- ✅ Funds held until delivery confirmed
- ✅ Platform can refund from held funds
- ✅ Clear audit trail
- ✅ Transaction records for all actions

### **4. Tax Compliance (Canada)**
- ✅ Stripe Connect handles 1099 forms (US equivalent)
- ✅ Transaction records for CRA reporting
- ✅ Artisan receives proper tax documentation

---

## 💰 FEE STRUCTURE

### **Platform Fees:**
```
Order Total: $100.00
├─ Stripe Processing Fee: $3.20 (2.9% + $0.30)
├─ Platform Commission: $10.00 (10%)
└─ Artisan Earnings: $86.80 (86.8%)
```

### **Payout Fees:**
```
Weekly Payout: $250.00
├─ Stripe Payout Fee: $0.35 CAD
└─ Artisan Receives: $249.65
```

### **Alternative: Standard Pricing**
```
Platform takes 15% total:
Order Total: $100.00
├─ Platform Commission: $15.00 (covers Stripe fees + platform)
└─ Artisan Earnings: $85.00
```

---

## 🧪 TESTING CHECKLIST

### **1. Stripe Connect Onboarding**
- [ ] Artisan can start onboarding
- [ ] Redirect to Stripe works
- [ ] Account ID saved correctly
- [ ] Return URL works
- [ ] Onboarding completion detected

### **2. Payment Authorization**
- [ ] PaymentIntent created with manual capture
- [ ] Funds held (not captured)
- [ ] Order created with 'authorized' status
- [ ] 7-day expiry set correctly

### **3. Capture After Confirmation**
- [ ] Buyer can confirm receipt
- [ ] Payment captured successfully
- [ ] Transfer to Connect account works
- [ ] Wallet balance updated
- [ ] Auto-confirm after 48 hours works

### **4. Weekly Payouts**
- [ ] Cron job runs on schedule
- [ ] Payouts created for eligible artisans
- [ ] Wallet balance deducted
- [ ] Transaction records created
- [ ] Minimum balance ($10) enforced

### **5. Edge Cases**
- [ ] Authorization expired → Order cancelled
- [ ] Artisan not onboarded → Error message
- [ ] Insufficient Stripe balance → Handled
- [ ] Network failure → Retries
- [ ] Duplicate capture prevented

---

## 📋 IMPLEMENTATION CHECKLIST

### **Phase 1: Stripe Connect Setup (Week 1)**
- [ ] Create artisan onboarding endpoint
- [ ] Build onboarding UI flow
- [ ] Test account creation
- [ ] Handle callback/webhook
- [ ] Save Connect account ID

### **Phase 2: Payment Authorization (Week 2)**
- [ ] Update PaymentIntent creation
- [ ] Change capture_method to 'manual'
- [ ] Update order creation logic
- [ ] Test authorization flow
- [ ] Handle expiry

### **Phase 3: Capture & Transfer (Week 3)**
- [ ] Update confirmation endpoint
- [ ] Implement capture logic
- [ ] Add transfer to Connect account
- [ ] Update wallet service
- [ ] Test end-to-end

### **Phase 4: Automated Payouts (Week 4)**
- [ ] Create cron endpoint
- [ ] Implement payout logic
- [ ] Configure Vercel cron
- [ ] Test payout creation
- [ ] Monitor in production

### **Phase 5: Testing & Refinement (Week 5)**
- [ ] Integration testing
- [ ] Edge case testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Documentation

---

## 🚀 DEPLOYMENT PLAN

### **Step 1: Database Migration**
```javascript
// Add stripeConnectAccountId to existing artisans
db.artisans.updateMany(
  { stripeConnectAccountId: { $exists: false } },
  { $set: { stripeConnectAccountId: null, payoutsEnabled: false } }
);
```

### **Step 2: Feature Flag**
```javascript
const STRIPE_CONNECT_ENABLED = process.env.STRIPE_CONNECT_ENABLED === 'true';

if (STRIPE_CONNECT_ENABLED) {
  // Use new flow
} else {
  // Use old flow
}
```

### **Step 3: Gradual Rollout**
1. Deploy to staging
2. Test with test Stripe accounts
3. Onboard 5-10 pilot artisans
4. Monitor for 1 week
5. Full rollout

### **Step 4: Communication**
- Email all artisans about new payout system
- Update terms of service
- Provide onboarding tutorial
- Offer support during transition

---

## 📊 MONITORING & ALERTS

### **Key Metrics:**
- Successful authorization rate
- Capture success rate
- Payout success rate
- Average time to payout
- Failed transaction rate

### **Alerts:**
- Capture failure
- Payout failure
- Authorization expiry
- Stripe Connect errors
- Webhook failures

---

## 🔗 RESOURCES

### **Stripe Documentation:**
- [Connect Overview](https://stripe.com/docs/connect)
- [Manual Capture](https://stripe.com/docs/payments/capture-later)
- [Transfers](https://stripe.com/docs/connect/charges-transfers)
- [Payouts](https://stripe.com/docs/connect/payouts)

### **Testing:**
- [Test Mode](https://stripe.com/docs/testing)
- [Test Cards](https://stripe.com/docs/testing#cards)
- [Connect Testing](https://stripe.com/docs/connect/testing)

---

## ✅ SUCCESS CRITERIA

This implementation is complete when:
1. ✅ Artisans can onboard with Stripe Connect
2. ✅ Payments are authorized (not captured) at checkout
3. ✅ Funds captured after buyer confirmation
4. ✅ Funds transferred to artisan's Connect account
5. ✅ Weekly automated payouts to bank accounts working
6. ✅ All edge cases handled
7. ✅ Monitoring and alerts in place
8. ✅ Documentation complete

---

**Status:** 🔴 **REQUIRES IMPLEMENTATION**
**Priority:** 🔥 **CRITICAL** - Core business functionality
**Estimated Effort:** 4-5 weeks with testing

---

**Next Steps:**
1. Review this document with team
2. Get stakeholder approval
3. Create Stripe Connect test accounts
4. Begin Phase 1 implementation
5. Set up staging environment


