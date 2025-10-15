# Payment Flow - Quick Reference Guide

**Date**: October 14, 2025  
**Purpose**: Quick lookup for payment and payout flow  
**Audience**: Developers, Support, Stakeholders

---

## 🎯 One-Page Flow Overview

```
PATRON CHECKOUT
    ↓
💳 PAYMENT AUTHORIZED
    (Stripe PaymentIntent with capture_method: 'manual')
    Funds: HELD on patron's card (not taken yet)
    Order: paymentStatus='authorized'
    ↓
📦 ARTISAN FULFILLS ORDER
    Status: pending → confirmed → preparing → ready
    ↓
🚚 DELIVERY/PICKUP
    Status: delivered or picked_up
    ↓
    ┌─────────────────────┬─────────────────────┐
    │ GUEST ORDERS        │ PATRON ORDERS       │
    ├─────────────────────┼─────────────────────┤
    │ Auto-complete       │ Awaits confirmation │
    │ immediately         │ (48 hours)          │
    │ ↓                   │ ↓                   │
    │ Revenue recognized  │ Manual confirm OR   │
    │ immediately         │ Auto-confirm        │
    └─────────────────────┴─────────────────────┘
    ↓
✅ ORDER COMPLETED
    Triggers: walletService.processOrderCompletion()
    ↓
💰 REVENUE RECOGNITION
    Order: $100
    ├─ Platform Fee:    $10.00 (10%)
    ├─ Stripe Fee:       $3.20 (2.9% + $0.30)
    └─ Artisan Gets:    $86.80
    ↓
💼 WALLET CREDITED
    artisan.wallet.balance += $86.80
    Transaction recorded in wallettransactions
    Revenue recorded in revenues collection
    ↓
⏰ FRIDAY 9 AM (Weekly Payout Cron)
    ↓
🏦 PAYOUT TO BANK
    If balance ≥ $25:
    ├─ Create Stripe payout
    ├─ Transfer to bank account
    ├─ Deduct from wallet
    └─ Record transaction
    ↓
💵 FUNDS IN BANK (2-3 business days later)
```

---

## 📊 Key Metrics

### Timing
- **Authorization Window**: 7 days (Stripe limit)
- **Confirmation Window**: 48 hours (configurable)
- **Payout Frequency**: Weekly (every Friday)
- **Payout Processing**: 2-3 business days
- **Total Order → Bank**: 5-10 days average

### Money Flow
```
$100 Order Total
├─ Patron pays:      $100.00
├─ Platform keeps:    $10.00 (10% commission)
├─ Stripe takes:       $3.20 (2.9% + $0.30)
└─ Artisan receives: $86.80 (to wallet)
    ↓
    Weekly payout:   $86.80 (to bank)
    Stripe fee:       -$0.25 (payout fee)
    ↓
    Artisan gets:    $86.55 (in bank account)
```

---

## 🔑 Key Files

### Backend Core
```
backend/
├── services/
│   ├── WalletService.js                 ⭐ Revenue recognition
│   ├── stripeService.js                 ⭐ Stripe Connect
│   └── platformSettingsService.js       ⭐ Fee calculations
├── routes/
│   └── orders/index.js                  ⭐ Order & payment endpoints
└── api/cron/
    ├── auto-capture-payments.js         ⭐ 48-hour auto-confirm
    └── payouts.js                       ⭐ Weekly payouts
```

### Frontend Core
```
frontend/src/
├── components/
│   ├── Cart.jsx                         ⭐ Checkout
│   ├── StripeOrderPayment.jsx           ⭐ Payment UI
│   └── WalletDashboard.jsx              ⭐ Wallet display
└── services/
    ├── orderPaymentService.js           ⭐ Payment service
    └── walletService.js                 ⭐ Wallet service
```

---

## 🚀 Critical Endpoints

### Payment Endpoints
```
POST   /api/orders/payment-intent         Create PaymentIntent
POST   /api/orders/create                 Create order after payment
POST   /api/orders/:id/capture-payment    Capture authorized payment
POST   /api/orders/:id/confirm-receipt    Patron confirms delivery
```

### Wallet Endpoints
```
GET    /api/wallet/balance                Get wallet balance
GET    /api/wallet/transactions           Get transaction history
POST   /api/wallet/topup                  Add funds to wallet
```

### Payout Endpoints
```
POST   /api/profile/stripe-connect/setup  Setup Stripe Connect
GET    /api/profile/stripe-connect/status Get Connect status
GET    /api/cron/payouts                  Weekly payout cron (internal)
```

### Webhook Endpoints
```
POST   /api/webhooks/stripe               Stripe webhook events
```

---

## 🎨 Database Schema Quick Reference

### orders
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // Patron
  artisan: ObjectId,          // Artisan ID
  totalAmount: 100.00,
  subtotal: 90.00,
  deliveryFee: 10.00,
  
  status: 'completed',        // Order status
  paymentStatus: 'authorized',// Payment status
  paymentIntentId: 'pi_...',  // Stripe ID
  
  createdAt: Date,
  updatedAt: Date
}
```

### wallets
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // Artisan's user ID
  balance: 86.80,             // Available balance
  currency: 'CAD',
  
  stripeAccountId: 'acct_...',// Stripe Connect ID
  payoutSettings: {
    enabled: true,
    schedule: 'weekly',
    minimumPayout: 25,
    nextPayoutDate: Date
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### wallettransactions
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  type: 'order_revenue',      // Transaction type
  amount: 86.80,              // Amount (+ or -)
  description: 'Revenue from order #12345678',
  status: 'completed',
  balanceAfter: 86.80,        // Balance after transaction
  
  metadata: {
    orderId: ObjectId,
    revenueBreakdown: { ... }
  },
  
  createdAt: Date
}
```

### revenues
```javascript
{
  _id: ObjectId,
  orderId: ObjectId,
  artisanId: ObjectId,
  
  revenue: {
    subtotal: 90.00,
    deliveryFee: 10.00,
    totalRevenue: 100.00,
    platformFee: 10.00,
    paymentProcessingFee: 3.20,
    netEarnings: 86.80
  },
  
  status: 'completed',
  createdAt: Date
}
```

---

## 🔐 Required Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
MONGODB_URI=mongodb+srv://...

# Auth
JWT_SECRET=<64-char-string>
CRON_SECRET=<32-char-string>

# Encryption
ENCRYPTION_KEY=<32-char-string>

# Frontend
FRONTEND_URL=https://bazaarmkt.ca
```

---

## ⚡ Quick Commands

### Check Wallet Balance (MongoDB)
```javascript
db.wallets.findOne({ userId: ObjectId('...') })
```

### Find Pending Payouts
```javascript
db.wallets.find({
  'payoutSettings.enabled': true,
  balance: { $gte: 25 }
})
```

### Check Order Payment Status
```javascript
db.orders.find({ paymentStatus: 'authorized' }).count()
```

### Get Revenue for Order
```javascript
db.revenues.findOne({ orderId: ObjectId('...') })
```

### Manual Trigger Payout Cron
```bash
curl -X GET "https://bazaarmkt.ca/api/cron/payouts" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Manual Trigger Auto-Capture Cron
```bash
curl -X GET "https://bazaarmkt.ca/api/cron/auto-capture-payments" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

## 🚨 Common Issues & Solutions

### Issue: "Payment authorization expired"

**Cause**: PaymentIntent not captured within 7 days  
**Fix**: Run auto-capture cron or manually capture via admin  
**Prevention**: Ensure auto-capture cron runs hourly

---

### Issue: "Artisan balance not updating"

**Cause**: Order not marked as 'completed'  
**Check**: 
1. Order status is 'delivered' or 'picked_up'?
2. Patron confirmed receipt?
3. 48 hours passed for auto-confirm?
4. Check logs for `processOrderCompletion` errors

**Fix**: Manually trigger revenue recognition or check cron logs

---

### Issue: "Payout didn't execute"

**Cause**: Multiple possible causes  
**Check**:
1. Wallet balance ≥ $25?
2. `payoutSettings.enabled = true`?
3. `nextPayoutDate` reached?
4. Stripe Connect account ID exists?
5. Cron job ran? (check Vercel logs)

**Fix**: 
- Check Vercel cron execution logs
- Verify Stripe Connect status
- Manually trigger payout cron

---

### Issue: "Negative wallet balance"

**Cause**: Refund processed but wallet already paid out  
**Fix**: Admin must resolve manually  
**Prevention**: Check balance before refund, alert if insufficient

---

## 📞 Support Checklist

When artisan reports payment issue:

1. **Check Order Status**
   ```javascript
   db.orders.findOne({ _id: ObjectId('...') })
   ```
   - What is `status`?
   - What is `paymentStatus`?
   - Is `receiptConfirmedAt` or `completedAt` set?

2. **Check Wallet Balance**
   ```javascript
   db.wallets.findOne({ userId: ObjectId('...') })
   ```
   - Current balance?
   - Payout settings enabled?
   - Next payout date?

3. **Check Transactions**
   ```javascript
   db.wallettransactions.find({ 
     userId: ObjectId('...') 
   }).sort({ createdAt: -1 }).limit(10)
   ```
   - Recent transactions?
   - Any failed transactions?
   - Balance history?

4. **Check Revenue Records**
   ```javascript
   db.revenues.find({ 
     artisanId: ObjectId('...') 
   }).sort({ createdAt: -1 })
   ```
   - Order revenue recorded?
   - Fee calculations correct?

5. **Check Stripe Connect**
   ```javascript
   db.artisans.findOne({ user: ObjectId('...') })
   ```
   - Has `stripeConnectAccountId`?
   - Status active?
   - Bank account connected?

---

## 🎓 For New Developers

### Understanding the System in 5 Minutes

1. **Payments use Stripe** - Industry standard, secure, PCI compliant

2. **Two-phase capture** - Authorize first, capture later (for patrons)
   - Why? Fraud protection, can cancel before funds taken

3. **Wallet is internal** - Just tracks earnings, not actual money
   - Real money moves: Patron card → Stripe → Artisan bank

4. **Revenue recognition on completion** - Not on payment
   - Why? Order might be cancelled, refunded, or disputed

5. **Weekly payouts** - Not immediate
   - Why? Batch processing reduces fees, predictable cash flow

6. **Fees are transparent** - Platform 10%, Stripe 2.9% + $0.30
   - Artisan sees breakdown in revenue dashboard

---

## 🔗 Related Documentation

- `PAYMENT_PAYOUT_COMPLETE_FLOW.md` - Comprehensive flow documentation
- `PAYMENT_GAPS_ANALYSIS.md` - Detailed gap analysis
- `STRIPE_PAYMENT_FLOW_REVIEW.md` - Original payment review
- `STRIPE_CONNECT_INTEGRATION_COMPLETE.md` - Connect integration status
- `PRODUCTION_WALLET_SETUP.md` - Production deployment guide

---

## 📝 Quick Status Check

Run this to check system health:

```javascript
// In MongoDB shell
const checkSystemHealth = async () => {
  const ordersWithAuthorizedPayment = await db.orders.countDocuments({
    paymentStatus: 'authorized'
  });
  
  const walletsEligibleForPayout = await db.wallets.countDocuments({
    balance: { $gte: 25 },
    'payoutSettings.enabled': true
  });
  
  const totalWalletBalance = await db.wallets.aggregate([
    { $group: { _id: null, total: { $sum: '$balance' } } }
  ]);
  
  const completedOrdersToday = await db.orders.countDocuments({
    status: 'completed',
    completedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
  });
  
  return {
    ordersWithAuthorizedPayment,      // Should be low
    walletsEligibleForPayout,         // Artisans ready for payout
    totalWalletBalance: totalWalletBalance[0]?.total || 0, // Platform liability
    completedOrdersToday              // Daily completions
  };
};

checkSystemHealth();
```

**Healthy System**:
- Authorized payments: < 50 (most should be captured)
- Total wallet balance: Matches expected revenue
- Completed orders today: > 0 (platform is active)
- No stuck orders (status = delivered for >72 hours)

---

## 🎯 Critical Paths

### Path 1: Guest Order (Fast Track)
```
Checkout → Payment Captured → Order Created → Delivered → Auto-Complete → Wallet Credit
Timeline: Same day completion possible
```

### Path 2: Patron Order (Standard)
```
Checkout → Payment Authorized → Order Created → Delivered → Awaits Confirm → Wallet Credit
Timeline: 2-3 days average (with confirmation)
```

### Path 3: Payout (Weekly)
```
Wallet ≥ $25 → Friday Cron → Stripe Payout → Bank Transfer → Funds Arrive
Timeline: Friday + 2-3 business days = following Tuesday/Wednesday
```

---

## 📈 Expected Volumes

### For a Medium-Sized Platform (100 active artisans, 1000 orders/month)

**Daily**:
- Orders created: ~35
- Orders completed: ~30
- Revenue recognized: ~$2,500
- Wallet credits: ~$2,200 (after fees)

**Weekly**:
- Payouts processed: ~80-90 (not all artisans have ≥$25)
- Total payout volume: ~$8,000-10,000
- Platform revenue: ~$1,000

**Monthly**:
- Total GMV: ~$100,000
- Platform revenue: ~$10,000
- Stripe fees: ~$3,000
- Artisan earnings: ~$87,000

---

## ⚠️ Red Flags to Monitor

1. **Authorized payments increasing** → Capture cron not working
2. **Wallet balance growing rapidly** → Payouts not executing
3. **High failed payment rate** → Check Stripe status/cards
4. **Long time to completion** → Check confirmation flow
5. **Negative wallet balances** → Data integrity issue
6. **Stuck orders (delivered >72h)** → Auto-confirm not working

---

## ✅ Health Check Commands

### Daily Checks
```bash
# Check for stuck authorized payments
curl "https://bazaarmkt.ca/api/admin/health/authorized-payments"

# Check wallet balances total
curl "https://bazaarmkt.ca/api/admin/health/wallet-totals"

# Check pending payouts
curl "https://bazaarmkt.ca/api/admin/health/pending-payouts"
```

### Weekly Checks (After Payout Run)
```bash
# Verify payout execution
curl "https://bazaarmkt.ca/api/admin/payouts/last-run-status"

# Check failed payouts
curl "https://bazaarmkt.ca/api/admin/payouts/failed"
```

---

## 🛠️ Developer Commands

### Test Payment Flow
```javascript
// In browser console
const testPayment = async () => {
  // 1. Create test order
  const order = await orderPaymentService.createPaymentIntent({
    items: [{ productId: '...', quantity: 1, price: 10 }],
    deliveryMethod: 'pickup'
  });
  
  console.log('Order created:', order);
  
  // 2. Complete payment with test card
  // 4242 4242 4242 4242, any future date, any CVC
  
  // 3. Check order status
  const orderStatus = await orderService.getOrderById(order.orderId);
  console.log('Payment status:', orderStatus.paymentStatus);
  
  return order;
};
```

### Test Revenue Recognition
```javascript
// Backend script
const testRevenue = async (orderId) => {
  const db = await connectDB();
  const WalletService = require('./services/WalletService');
  const walletService = new WalletService(db);
  
  const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
  
  const result = await walletService.processOrderCompletion(order, db);
  console.log('Revenue processed:', result.data);
};
```

### Manually Trigger Payouts
```javascript
// For testing only
const manualPayout = async (artisanId) => {
  const wallet = await db.collection('wallets').findOne({ 
    artisanId: new ObjectId(artisanId) 
  });
  
  // Run payout logic
  // (Copy from payouts.js)
};
```

---

## 📋 Pre-Launch Checklist

### Configuration
- [ ] Stripe keys configured (live mode)
- [ ] Webhook endpoint registered with Stripe
- [ ] Webhook secret set in env vars
- [ ] Cron jobs configured in vercel.json
- [ ] CRON_SECRET set and secure
- [ ] Platform settings initialized
- [ ] Fee percentages verified

### Testing
- [ ] Complete order → payment → wallet flow tested
- [ ] Guest orders auto-complete correctly
- [ ] Patron orders require confirmation
- [ ] 48-hour auto-confirm works
- [ ] Revenue calculations accurate
- [ ] Wallet balances update correctly
- [ ] Payouts execute successfully
- [ ] Funds arrive in test bank account

### UI
- [ ] Payment status visible to patrons
- [ ] Wallet balance visible to artisans
- [ ] Payout schedule displayed
- [ ] Bank account status shown
- [ ] Transaction history accessible

### Monitoring
- [ ] Error logging configured
- [ ] Alerts for failed payments set up
- [ ] Alerts for failed payouts set up
- [ ] Daily health check script ready
- [ ] Admin dashboard shows key metrics

---

## 🎯 Success Criteria

### System is Production-Ready When:

✅ **Payment Processing**
- [ ] 98%+ payment success rate
- [ ] Average payment processing time < 5 seconds
- [ ] Failed payments handled gracefully
- [ ] Consistent flow for all user types

✅ **Order Completion**
- [ ] 95%+ orders complete within 48 hours
- [ ] Auto-confirm works reliably
- [ ] Manual confirm UI is intuitive
- [ ] Revenue recognized within 5 minutes of completion

✅ **Wallet Management**
- [ ] Balances accurate (matches revenue records)
- [ ] Transactions recorded for all operations
- [ ] No negative balances
- [ ] UI shows real-time balance

✅ **Payouts**
- [ ] 95%+ payout success rate
- [ ] Payouts execute every Friday
- [ ] Funds arrive within 3 business days
- [ ] Failed payouts are retried
- [ ] Artisans receive notifications

✅ **User Experience**
- [ ] Artisans can connect bank accounts easily
- [ ] Payment status is clear to patrons
- [ ] Payout schedule is transparent
- [ ] Error messages are helpful

---

## 🚀 Quick Start for New Developers

### 1. Set Up Local Environment
```bash
# Clone repo
git clone <repo-url>

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Set up environment variables
cp .env.example .env
# Fill in Stripe test keys

# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev
```

### 2. Create Test Order
```bash
# Use Stripe test card: 4242 4242 4242 4242
# Any future expiry, any CVC
# Complete checkout
```

### 3. Check Database
```javascript
// Connect to MongoDB
mongosh "mongodb+srv://..."

// Check order created
db.orders.find().limit(1).pretty()

// Check payment status
db.orders.findOne({ paymentStatus: 'authorized' })
```

### 4. Test Revenue Recognition
```javascript
// Mark order as delivered (as artisan)
// Then confirm receipt (as patron)
// Check wallet balance increased
db.wallets.findOne({ userId: ObjectId('...') })
```

### 5. Test Payout (Simulated)
```bash
# Trigger payout cron manually
curl -X GET "http://localhost:5000/api/cron/payouts" \
  -H "Authorization: Bearer test-secret"

# Check wallet balance zeroed
db.wallets.findOne({ userId: ObjectId('...') })

# Check transaction created
db.wallettransactions.find({ type: 'payout' })
```

---

## 📚 Learning Resources

### Stripe Documentation
- [Payment Intents](https://stripe.com/docs/payments/payment-intents)
- [Manual Capture](https://stripe.com/docs/payments/capture-later)
- [Stripe Connect](https://stripe.com/docs/connect)
- [Transfers](https://stripe.com/docs/connect/charges-transfers)
- [Payouts](https://stripe.com/docs/connect/payouts)

### Internal Documentation
- `/docs/payment/` - All payment documentation
- `/documentation/features/payments/` - This directory
- Codebase comments in service files

---

## 🎊 Current Status Summary

| Component | Status | Production Ready |
|-----------|--------|------------------|
| Payment Processing | ✅ Working | ⚠️ Needs consistency fix |
| Revenue Recognition | ✅ Working | ✅ Yes |
| Wallet Management | ✅ Working | ✅ Yes |
| Stripe Connect Setup | ✅ Implemented | ⚠️ Needs UI |
| Automated Payouts | ⚠️ Simulated | ❌ Needs real Stripe |
| Fee Calculations | ✅ Working | ✅ Yes |
| Order Confirmation | ✅ Working | ✅ Yes |
| Webhooks | ✅ Partial | ⚠️ Needs payout events |

**Overall**: 75% Complete, 6-8 weeks to 100%

---

**Last Updated**: October 14, 2025  
**Next Review**: After Sprint 1 completion  
**Maintained By**: Development Team

