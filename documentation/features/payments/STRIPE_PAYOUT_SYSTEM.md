# Stripe Connect Payout System

**Status**: ✅ Production Ready  
**Last Updated**: October 15, 2025  
**Version**: 2.0

---

## Overview

The Stripe Connect payout system enables artisans to receive weekly automated payouts directly to their bank accounts. This system integrates with Stripe Connect to handle the complete flow from customer payment to artisan bank deposit.

---

## Architecture

### Money Flow

```
Customer Payment ($100)
    ↓
Platform Stripe Account
    ↓
Payment Capture & Fee Calculation
    ↓
Transfer to Artisan Connect Account ($86.80)
    ↓
Credit Artisan Wallet ($86.80)
    ↓
Weekly Payout Cron (Every Friday)
    ↓
Payout from Connect Account to Bank
    ↓
Artisan Bank Account (+$86.80) [2-3 days]
```

### Fee Structure

For a $100 order:
- **Platform Fee**: $10.00 (10%)
- **Stripe Processing Fee**: $3.20 (2.9% + $0.30)
- **Artisan Receives**: $86.80 (86.8%)

---

## Components

### 1. Stripe Connect Account Setup

**File**: `backend/routes/profile/stripeConnectHandlers.js`

Artisans must connect their bank account through Stripe Connect:

```javascript
// Endpoint: POST /api/profile/stripe-connect/setup
// Creates Connect account and links bank information

const setupStripeConnect = async (req, res) => {
  // 1. Verify artisan has bank info saved
  // 2. Create Stripe Connect account
  // 3. Link bank account to Connect account
  // 4. Update artisan with stripeConnectAccountId
  // 5. Enable payout settings in wallet
};
```

**Result**: Artisan has `stripeConnectAccountId` and `payoutSettings.enabled: true`

---

### 2. Payment Capture & Transfer

**File**: `backend/routes/orders/index.js`

When an order is completed:

```javascript
// Function: capturePaymentAndTransfer()
// Triggered by: Order confirmation (manual or auto-48hr)

1. Capture authorized payment
2. Calculate fees using platform settings
3. Transfer artisan amount to Connect account
4. Update order with payment status
5. Credit artisan wallet
```

**Key Code**:
```javascript
// Capture payment
const paymentIntent = await stripe.paymentIntents.capture(order.paymentIntentId);

// Transfer to Connect account
const transfer = await stripe.transfers.create({
  amount: Math.round(artisanAmount * 100),
  currency: 'cad',
  destination: artisan.stripeConnectAccountId,
  metadata: {
    orderId: order._id.toString(),
    platformFee: platformFee.toString()
  }
});
```

---

### 3. Weekly Payout Cron Job

**File**: `backend/api/cron/payouts.js`

**Schedule**: Every Friday at 9 AM EST (1 PM UTC)

**Process**:

```javascript
1. Find eligible wallets:
   - payoutSettings.enabled: true
   - balance >= minimumPayoutAmount ($25 default)
   - nextPayoutDate <= today
   - stripeConnectAccountId exists

2. For each wallet:
   a. Verify Connect account status
   b. Check payouts_enabled === true
   c. Create Stripe payout
   d. Create transaction record (status: 'pending')
   e. Zero out wallet balance
   f. Update next payout date

3. Return results summary
```

**Critical Code**:
```javascript
// Create real Stripe payout
const payout = await stripeService.createPayout(
  artisan.stripeConnectAccountId,
  payoutAmount,
  'cad',
  { metadata }
);

// Transaction with payout ID
const payoutTransaction = {
  type: 'payout',
  amount: -payoutAmount,
  status: 'pending', // Until webhook confirms
  stripePayoutId: payout.id,
  // ...
};
```

---

### 4. Payout Webhook Handlers

**File**: `backend/routes/webhooks/stripe.js`

Handles payout status updates from Stripe:

#### A. payout.paid
Triggered when payout successfully arrives in bank account (2-3 days after initiation)

```javascript
const handlePayoutPaid = async (payout, db) => {
  // 1. Find transaction by stripePayoutId
  // 2. Update status to 'completed'
  // 3. Record arrival date
  // 4. Send notification to artisan
};
```

#### B. payout.failed
Triggered when payout fails (invalid bank info, insufficient funds, etc.)

```javascript
const handlePayoutFailed = async (payout, db) => {
  // 1. Find transaction by stripePayoutId
  // 2. Update status to 'failed'
  // 3. RESTORE wallet balance (add money back)
  // 4. Create reversal transaction
  // 5. Send high-priority notification
};
```

#### C. payout.canceled
Triggered when payout is canceled

```javascript
const handlePayoutCanceled = async (payout, db) => {
  // 1. Update status to 'canceled'
  // 2. Restore wallet balance
  // 3. Notify artisan
};
```

---

## Database Schema

### Wallets Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  artisanId: ObjectId,
  balance: Number,
  currency: 'CAD',
  stripeAccountId: String, // Connect account ID
  
  payoutSettings: {
    enabled: Boolean,
    method: 'bank_transfer',
    bankAccount: {
      bankName: String,
      last4: String,
      accountId: String // External account ID
    },
    schedule: 'weekly', // or 'monthly'
    minimumPayout: Number, // Default: 25
    payoutDelay: Number, // Default: 7 days
    lastPayoutDate: Date,
    nextPayoutDate: Date
  },
  
  metadata: {
    totalEarnings: Number,
    totalPayouts: Number,
    lastPayoutId: String // Last Stripe payout ID
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### Wallet Transactions Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  artisanId: ObjectId,
  type: 'order_revenue' | 'payout' | 'payout_reversal',
  amount: Number, // Positive for credit, negative for debit
  description: String,
  status: 'pending' | 'completed' | 'failed' | 'canceled',
  
  // Payout-specific fields
  stripePayoutId: String, // Stripe payout ID (po_xxx)
  balanceAfter: Number,
  reference: String, // PAYOUT-timestamp
  
  // Dates
  createdAt: Date,
  completedAt: Date,
  failedAt: Date,
  payoutArrivalDate: Date,
  
  metadata: {
    payoutDate: Date,
    schedule: String,
    originalBalance: Number,
    stripeAccount: String,
    expectedArrival: Date,
    payoutMethod: String,
    payoutStatus: 'paid' | 'failed' | 'canceled',
    failureReason: String,
    failureCode: String
  }
}
```

---

## API Endpoints

### Stripe Connect Setup

```
POST /api/profile/stripe-connect/setup
Authorization: Bearer <token>

Creates Stripe Connect account for artisan using saved bank info.

Response:
{
  success: true,
  message: "Stripe Connect account created successfully",
  data: {
    accountId: "acct_xxx",
    externalAccountId: "ba_xxx",
    bankName: "TD Bank",
    last4: "1234",
    status: "active"
  }
}
```

### Get Connect Status

```
GET /api/profile/stripe-connect/status
Authorization: Bearer <token>

Gets current Stripe Connect setup status.

Response:
{
  success: true,
  data: {
    isSetup: true,
    accountId: "acct_xxx",
    payoutsEnabled: true,
    chargesEnabled: true,
    status: "active",
    setupAt: "2025-10-15T12:00:00Z"
  }
}
```

### Trigger Payout (Cron)

```
GET /api/cron/payouts
Authorization: Bearer <CRON_SECRET>

Processes weekly payouts for all eligible wallets.

Response:
{
  success: true,
  processed: 15,
  errors: 0,
  total: 15,
  results: [
    {
      artisanId: "xxx",
      artisanName: "John's Pottery",
      amount: 150.50,
      stripePayoutId: "po_xxx",
      expectedArrival: "2025-10-18T12:00:00Z",
      status: "success"
    }
  ]
}
```

---

## Webhook Events

### Configuration

Stripe sends webhook events to: `https://bazaarmkt.ca/api/webhooks/stripe`

**Required Events**:
- `payout.paid` - Payout arrived in bank account
- `payout.failed` - Payout failed
- `payout.canceled` - Payout was canceled
- `payment_intent.succeeded` - Payment captured
- `payment_intent.payment_failed` - Payment failed

### Event Processing

```javascript
// Webhook signature verification
const event = stripe.webhooks.constructEvent(
  req.body,
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET
);

// Event handling
switch (event.type) {
  case 'payout.paid':
    await handlePayoutPaid(event.data.object, db);
    break;
  // ...
}
```

---

## Testing

### Test Mode Setup

1. **Use Test Keys**:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

2. **Create Test Connect Account**:
   - Add bank info in artisan profile
   - Click "Setup Stripe Connect"
   - Uses test routing numbers automatically

3. **Test Webhooks with Stripe CLI**:
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe
   
   # Login
   stripe login
   
   # Forward webhooks to local server
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   
   # Trigger test events
   stripe trigger payout.paid
   stripe trigger payout.failed
   ```

### Manual Payout Trigger

```bash
# Trigger payout cron manually (for testing)
curl -X GET https://your-domain.com/api/cron/payouts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Monitoring

### Key Metrics

Track these metrics in production:

```javascript
{
  // Payout Health
  payoutSuccessRate: Number,      // % of successful payouts
  weeklyPayoutVolume: Number,     // Total $ paid weekly
  averagePayoutAmount: Number,    // Average payout size
  failedPayoutCount: Number,      // Failed payouts this week
  
  // Wallet Health
  totalWalletBalance: Number,     // Sum of all balances
  walletsEligible: Number,        // Ready for next payout
  
  // Performance
  payoutProcessingTime: Number,   // Time to process all payouts
  webhookDeliveryRate: Number,    // % of webhooks delivered
  pendingPayoutAge: Number        // Days since oldest pending
}
```

### Alerts

Set up alerts for:

- **Payout Failure**: Any payout fails
- **Webhook Failure**: Webhook not received within 1 hour
- **High Pending**: Payouts pending > 5 days
- **Balance Anomaly**: Any negative wallet balance

---

## Troubleshooting

### Payout Skipped - No Connect Account

**Symptom**: Artisan has balance but no payout created

**Diagnosis**:
```javascript
// Check in database
db.artisans.findOne({ _id: artisanId });
// Look for: stripeConnectAccountId: null or undefined
```

**Solution**: Artisan must setup Stripe Connect in profile

---

### Payout Skipped - Payouts Not Enabled

**Symptom**: Error "Payouts not enabled for account"

**Diagnosis**:
```javascript
// Check account status
const account = await stripe.accounts.retrieve(stripeConnectAccountId);
console.log(account.payouts_enabled); // false
console.log(account.requirements); // What's missing
```

**Solution**: 
- Complete Stripe verification requirements
- May need additional business information
- Check Stripe Dashboard for pending requirements

---

### Payout Failed - Invalid Bank Account

**Symptom**: Webhook `payout.failed` with "invalid_account" error

**Diagnosis**:
```javascript
// Check transaction record
db.wallettransactions.findOne({ stripePayoutId: 'po_xxx' });
// Look for: failureReason, failureCode
```

**Solution**:
- Wallet balance automatically restored
- Artisan must update bank information
- Re-setup Stripe Connect
- Next payout will retry

---

### Webhook Not Received

**Symptom**: Payout created but status stays "pending"

**Diagnosis**:
1. Check Stripe Dashboard → Webhooks
2. Look for failed webhook deliveries
3. Check Vercel logs for webhook endpoint errors

**Solution**:
- Verify webhook endpoint URL is correct
- Check `STRIPE_WEBHOOK_SECRET` is set correctly
- Ensure endpoint returns 200 status
- Re-send webhook from Stripe Dashboard if needed

---

## Security Considerations

### Webhook Signature Verification

Always verify webhook signatures to prevent spoofing:

```javascript
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### Cron Job Authentication

Protect cron endpoints with secret:

```javascript
const cronSecret = process.env.CRON_SECRET;
if (req.headers.authorization !== `Bearer ${cronSecret}`) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Bank Information Encryption

Bank details are encrypted at rest:

```javascript
const { encryptBankInfo, decryptBankInfo } = require('../utils/encryption');

// Save
const encrypted = encryptBankInfo(bankInfo);
await artisansCollection.updateOne(
  { _id: artisanId },
  { $set: { bankInfo: encrypted } }
);

// Retrieve
const decrypted = decryptBankInfo(artisan.bankInfo);
```

---

## Related Documentation

- [Payment & Payout Complete Flow](./PAYMENT_PAYOUT_COMPLETE_FLOW.md)
- [Payment Gaps Analysis](./PAYMENT_GAPS_ANALYSIS.md)
- [Environment Variables](./ENVIRONMENT_VARIABLES.md)
- [Stripe Connect Setup Guide](./STRIPE_CONNECT_SETUP.md)

---

**Last Updated**: October 15, 2025  
**Maintained By**: Development Team  
**Questions**: See troubleshooting section or contact dev team

