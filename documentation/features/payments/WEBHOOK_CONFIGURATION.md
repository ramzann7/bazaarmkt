# Stripe Webhook Configuration Guide

**Status**: ✅ Production Ready  
**Last Updated**: October 15, 2025

---

## Overview

Stripe webhooks are essential for the payout system to function correctly. They notify the application when payout events occur (paid, failed, canceled), allowing the system to update transaction statuses and notify artisans.

---

## Required Environment Variable

### STRIPE_WEBHOOK_SECRET

**Critical**: The webhook system **will not work** without this variable!

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Purpose**:
- Verifies webhook events are from Stripe
- Prevents spoofing and replay attacks
- Ensures data integrity

**Without it**:
- All webhooks will fail signature verification
- Returns 400 error to Stripe
- Payouts remain in "pending" status forever
- Artisans never notified of payout completion

---

## Webhook Endpoint

### Production URL
```
https://bazaarmkt.ca/api/webhooks/stripe
```

### Development URL (with Stripe CLI)
```
http://localhost:3000/api/webhooks/stripe
```

---

## Setting Up Webhooks in Stripe Dashboard

### Step 1: Access Webhook Settings

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** in left sidebar
3. Click **Webhooks** tab
4. Click **+ Add endpoint** button

### Step 2: Configure Endpoint

**Endpoint URL**: `https://bazaarmkt.ca/api/webhooks/stripe`

**Description**: "BazaarMKT Payment & Payout Events"

**Version**: Latest API version (default)

### Step 3: Select Events

Click **+ Select events** and choose:

#### Payment Events
- ✅ `payment_intent.succeeded` - Payment successfully captured
- ✅ `payment_intent.payment_failed` - Payment failed
- ✅ `payment_intent.canceled` - Payment canceled
- ✅ `charge.refunded` - Charge refunded

#### Payout Events (Critical!)
- ✅ `payout.paid` - Payout arrived in bank account ⭐
- ✅ `payout.failed` - Payout failed ⭐
- ✅ `payout.canceled` - Payout was canceled ⭐

#### Customer Events (Optional)
- ⬜ `customer.created` - Customer created
- ⬜ `customer.updated` - Customer updated
- ⬜ `payment_method.attached` - Payment method added
- ⬜ `payment_method.detached` - Payment method removed

### Step 4: Get Signing Secret

After creating the endpoint:

1. Click on the newly created endpoint
2. Scroll to **Signing secret** section
3. Click **Reveal** or **Click to reveal**
4. Copy the secret (starts with `whsec_`)
5. Add to your environment variables:

```bash
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
```

### Step 5: Deploy to Vercel

```bash
# Via Vercel Dashboard
1. Go to project settings
2. Environment Variables
3. Add STRIPE_WEBHOOK_SECRET
4. Value: whsec_...
5. Environment: Production
6. Save

# Via CLI
vercel env add STRIPE_WEBHOOK_SECRET
# Paste value when prompted
# Select: Production
```

### Step 6: Test Webhook

In Stripe Dashboard:

1. Go to Webhooks
2. Click on your endpoint
3. Scroll to **Sent events**
4. Click **Send test webhook**
5. Select event type: `payout.paid`
6. Click **Send test webhook**
7. Check response:
   - ✅ Status: 200 OK
   - ❌ Status: 400/500 = Check logs

---

## Webhook Handler Code

### File Location

`backend/routes/webhooks/stripe.js`

### Signature Verification

```javascript
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('⚠️ STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ 
      success: false, 
      message: 'Webhook secret not configured' 
    });
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body, // Raw body (not parsed JSON)
      sig,
      webhookSecret
    );
    
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).json({ 
      success: false, 
      message: `Webhook Error: ${err.message}` 
    });
  }

  // Process verified event
  // ...
};
```

### Event Handling

```javascript
switch (event.type) {
  case 'payout.paid':
    await handlePayoutPaid(event.data.object, db);
    break;
  
  case 'payout.failed':
    await handlePayoutFailed(event.data.object, db);
    break;
  
  case 'payout.canceled':
    await handlePayoutCanceled(event.data.object, db);
    break;
  
  case 'payment_intent.succeeded':
    await handlePaymentIntentSucceeded(event.data.object, db);
    break;
  
  // ... other events
  
  default:
    console.log(`ℹ️ Unhandled webhook event type: ${event.type}`);
}

// Always return 200 to acknowledge receipt
res.json({ received: true, type: event.type });
```

---

## Testing Webhooks

### Method 1: Stripe CLI (Development)

#### Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
# Download from: https://github.com/stripe/stripe-cli/releases

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/v1.17.0/stripe_1.17.0_linux_x86_64.tar.gz
tar -xvf stripe_1.17.0_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

#### Login to Stripe

```bash
stripe login
# Opens browser to authenticate
# Verify device code matches
```

#### Forward Webhooks to Local Server

```bash
# Start your local server first
npm run dev

# In another terminal, forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Output will show:
# > Ready! Your webhook signing secret is whsec_... (^C to quit)
```

**Copy the webhook secret** and add to your `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Trigger Test Events

```bash
# Trigger payout.paid event
stripe trigger payout.paid

# Trigger payout.failed event
stripe trigger payout.failed

# Trigger payment_intent.succeeded
stripe trigger payment_intent.succeeded
```

#### Watch Events

```bash
# Terminal 1: Server logs
npm run dev

# Terminal 2: Webhook forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Trigger events
stripe trigger payout.paid

# You'll see:
# - Stripe CLI shows event sent
# - Server logs show event received
# - Database updated
```

---

### Method 2: Stripe Dashboard (Production)

#### Send Test Webhook

1. Go to Stripe Dashboard → Webhooks
2. Click your endpoint
3. Scroll to **Send test webhook**
4. Select event: `payout.paid`
5. Click **Send test webhook**
6. Check response:
   - Status: 200 OK ✅
   - Response body: `{"received":true,"type":"payout.paid"}`

#### Verify in Logs

```bash
# Check Vercel logs
vercel logs --follow

# Look for:
# ✅ Webhook signature verified: payout.paid
# ✅ Payout paid: po_xxx
# ✅ Transaction xxx marked as completed
```

---

## Webhook Event Details

### payout.paid

**Triggers**: When payout successfully arrives in artisan's bank account

**Timing**: 2-3 business days after payout created

**Event Object**:
```json
{
  "id": "po_1234567890",
  "object": "payout",
  "amount": 8680,
  "arrival_date": 1697500800,
  "status": "paid",
  "method": "standard",
  "type": "bank_account",
  "currency": "cad"
}
```

**Handler Actions**:
1. Find transaction by `stripePayoutId`
2. Update status to `'completed'`
3. Record `payoutArrivalDate`
4. Send notification: "Your payout has been deposited"

---

### payout.failed

**Triggers**: When payout fails

**Common Reasons**:
- Invalid bank account
- Insufficient funds in Connect account
- Bank account closed
- Routing number incorrect

**Event Object**:
```json
{
  "id": "po_1234567890",
  "object": "payout",
  "status": "failed",
  "failure_code": "account_closed",
  "failure_message": "The bank account has been closed."
}
```

**Handler Actions**:
1. Find transaction by `stripePayoutId`
2. Update status to `'failed'`
3. **Restore wallet balance** (critical!)
4. Create reversal transaction
5. Send high-priority notification with error details

---

### payout.canceled

**Triggers**: When payout is canceled

**Event Object**:
```json
{
  "id": "po_1234567890",
  "object": "payout",
  "status": "canceled"
}
```

**Handler Actions**:
1. Update transaction status to `'canceled'`
2. Restore wallet balance
3. Send notification

---

## Monitoring Webhooks

### Stripe Dashboard

**View Webhook Deliveries**:

1. Go to Webhooks
2. Click your endpoint
3. View **Sent events** tab
4. Check recent deliveries:
   - ✅ Success (200 status)
   - ⚠️ Failed (400/500 status)
   - 🔄 Retry attempts

**Failed Webhooks**:
- Stripe automatically retries failed webhooks
- Up to 3 days of retries
- Exponential backoff
- Can manually retry from dashboard

---

### Vercel Logs

```bash
# Real-time logs
vercel logs --follow

# Filter for webhooks
vercel logs --follow | grep webhook

# Recent errors
vercel logs | grep "❌"
```

**Look for**:
```
✅ Webhook signature verified: payout.paid
✅ Payout paid: po_xxx
✅ Transaction updated for payout po_xxx
✅ Notification sent to user about payout completion
```

---

### Database Monitoring

```javascript
// Check pending payouts
db.wallettransactions.find({
  type: 'payout',
  status: 'pending'
}).sort({ createdAt: -1 });

// Check recent completions
db.wallettransactions.find({
  type: 'payout',
  status: 'completed',
  completedAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) }
});

// Check failures
db.wallettransactions.find({
  type: 'payout',
  status: 'failed'
}).sort({ failedAt: -1 });
```

---

## Troubleshooting

### Issue: Signature Verification Failed

**Error**: `Webhook signature verification failed`

**Causes**:
1. Wrong `STRIPE_WEBHOOK_SECRET`
2. Request body was parsed (should be raw)
3. Header `stripe-signature` missing

**Solutions**:

```javascript
// 1. Verify webhook secret
console.log('Webhook secret:', process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10) + '...');

// 2. Ensure raw body
// In Express, use:
app.post('/api/webhooks/stripe', 
  express.raw({ type: 'application/json' }), // Raw body!
  handleStripeWebhook
);

// 3. Check headers
console.log('Stripe signature:', req.headers['stripe-signature']?.substring(0, 20) + '...');
```

---

### Issue: Webhook Not Received

**Symptoms**: Payouts stay "pending" forever

**Diagnosis**:

```bash
# 1. Check Stripe Dashboard
# Webhooks → Your Endpoint → Sent Events
# Look for recent events and their status

# 2. Check endpoint URL
# Make sure it's: https://bazaarmkt.ca/api/webhooks/stripe
# Not: https://bazaarmkt.ca/api/webhook/stripe (missing 's')

# 3. Test endpoint manually
curl -X POST https://bazaarmkt.ca/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Should return 400 (signature missing) - endpoint is reachable
```

---

### Issue: Database Not Updated

**Symptoms**: Webhook received (200 OK) but transaction not updated

**Diagnosis**:

```bash
# Check Vercel logs for errors
vercel logs --follow

# Look for:
# ❌ Database not available
# ❌ No transaction found for payout: po_xxx
# ❌ Error updating transaction
```

**Common Causes**:
- Database connection issue
- `stripePayoutId` not matching (check transaction record)
- Database write permissions

---

## Security Best Practices

### 1. Always Verify Signatures

```javascript
// ✅ GOOD
const event = stripe.webhooks.constructEvent(
  req.body, sig, webhookSecret
);

// ❌ BAD - Never trust webhook data without verification
if (req.body.type === 'payout.paid') {
  // Attacker could send fake data!
}
```

### 2. Use HTTPS Only

```bash
# ✅ Production
https://bazaarmkt.ca/api/webhooks/stripe

# ❌ Never use HTTP in production
http://bazaarmkt.ca/api/webhooks/stripe
```

### 3. Implement Idempotency

```javascript
// Stripe may send duplicate events
// Handle gracefully:

const transaction = await transactionsCollection.findOne({ 
  stripePayoutId: payout.id 
});

if (transaction.status === 'completed') {
  console.log('Already processed, skipping');
  return; // Don't process twice
}
```

### 4. Rate Limiting

```javascript
// Protect webhook endpoint from abuse
// Already handled by Vercel

// For custom servers:
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Max 100 requests per IP
});

app.post('/api/webhooks/stripe', webhookLimiter, handleWebhook);
```

---

## Quick Reference

### Environment Variable

```bash
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
```

### Required Events

```
✅ payout.paid
✅ payout.failed
✅ payout.canceled
✅ payment_intent.succeeded
✅ payment_intent.payment_failed
```

### Endpoint URL

```
https://bazaarmkt.ca/api/webhooks/stripe
```

### Test Commands

```bash
# Forward webhooks (development)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger payout.paid

# Check logs
vercel logs --follow | grep webhook
```

---

## Related Documentation

- [Environment Variables](./ENVIRONMENT_VARIABLES.md)
- [Stripe Payout System](./STRIPE_PAYOUT_SYSTEM.md)
- [Payment Flow](./PAYMENT_PAYOUT_COMPLETE_FLOW.md)

---

**Last Updated**: October 15, 2025  
**Maintained By**: Development Team  
**Critical**: Without webhooks, payouts won't complete!

