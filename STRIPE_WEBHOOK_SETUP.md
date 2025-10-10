# Stripe Webhook Setup Guide

## Overview

Stripe webhooks have been implemented to automatically handle payment events and sync data with your application.

---

## Webhook Endpoint

**Local Development**: `http://localhost:4000/api/webhooks/stripe`  
**Production**: `https://bazaarmkt.ca/api/webhooks/stripe`

---

## Events Handled

The webhook automatically processes these Stripe events:

### Payment Events
1. ✅ **`payment_intent.succeeded`** - Payment successfully captured
   - Updates order `paymentStatus` to 'captured'
   - Records `capturedAt` timestamp
   - Records `amountCaptured`

2. ✅ **`payment_intent.payment_failed`** - Payment failed
   - Updates order `paymentStatus` to 'failed'
   - Records failure reason
   - **Restores product inventory**
   
3. ✅ **`payment_intent.canceled`** - Payment canceled
   - Updates order `paymentStatus` to 'canceled'
   - Updates order `status` to 'cancelled'
   - **Restores product inventory**

4. ✅ **`charge.refunded`** - Payment refunded
   - Updates order `paymentStatus` to 'refunded'
   - Records `refundedAt` and `refundAmount`

### Customer Events
5. ✅ **`customer.created`** - New Stripe customer
   - Links `stripeCustomerId` to user account by email

6. ✅ **`customer.updated`** - Customer info changed
   - Syncs customer data with user account

### Payment Method Events
7. ✅ **`payment_method.attached`** - Card added
   - Adds payment method to user's `paymentMethods` array
   - Stores card details (brand, last4, expiry)

8. ✅ **`payment_method.detached`** - Card removed
   - Removes payment method from user's account

---

## Setup Instructions

### Step 1: Configure Webhook in Stripe Dashboard

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/webhooks
2. **Click "Add endpoint"**
3. **Enter webhook URL**:
   - **Development**: `http://localhost:4000/api/webhooks/stripe` (using Stripe CLI)
   - **Production**: `https://bazaarmkt.ca/api/webhooks/stripe`

4. **Select events to listen for**:
   ```
   payment_intent.succeeded
   payment_intent.payment_failed
   payment_intent.canceled
   charge.refunded
   customer.created
   customer.updated
   payment_method.attached
   payment_method.detached
   ```

5. **Copy the signing secret** (starts with `whsec_...`)

### Step 2: Add Webhook Secret to Environment

**Local Development** (`backend/.env`):
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret_here
```

**Production** (Vercel Dashboard):
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add: `STRIPE_WEBHOOK_SECRET` = `whsec_your_production_webhook_secret`
4. Scope: Production (and Preview if needed)

### Step 3: Test Webhooks Locally (Optional)

Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
```

Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

Trigger test events:
```bash
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
```

---

## Implementation Details

### File Structure
```
backend/
├── routes/
│   └── webhooks/
│       └── stripe.js       # Webhook handlers
└── server-working.js       # Webhook route registration
```

### Webhook Security
- ✅ Signature verification using `stripe.webhooks.constructEvent()`
- ✅ Raw body parser for webhook route
- ✅ Rejects requests with invalid signatures
- ✅ Logs all webhook events

### Inventory Management
When payment fails or is canceled:
1. Finds the order by `paymentIntentId`
2. Restores inventory for all items:
   - **ready_to_ship**: Restores `stock` and `availableQuantity`
   - **made_to_order**: Restores `remainingCapacity`
   - **scheduled_order**: Restores `availableQuantity`
3. Reduces `soldCount` back
4. Logs all restoration actions

### Response Format
**Success**:
```json
{
  "received": true,
  "type": "payment_intent.succeeded"
}
```

**Error**:
```json
{
  "success": false,
  "message": "Webhook Error: ..."
}
```

---

## Monitoring & Logs

### Backend Terminal Logs
```
✅ Webhook signature verified: payment_intent.succeeded
✅ Payment succeeded: pi_xxxxx
✅ Order 68e7fd80ce8d2b5511354aca payment status updated to captured
```

```
❌ Payment failed: pi_xxxxx
❌ Order 68e7fd80ce8d2b5511354aca payment marked as failed
🔄 Restoring inventory for order: 68e7fd80ce8d2b5511354aca
✅ Restored inventory for product Organic Apples: +2
```

### Stripe Dashboard
- View webhook delivery status
- See event logs and retry history
- Check response codes

---

## Production Deployment

### Vercel Configuration
The webhook is automatically available in Vercel since:
1. ✅ Route is registered in `server-working.js`
2. ✅ `api/index.js` exports the Express app
3. ✅ `vercel.json` routes `/api/*` to serverless function

### After Deployment
1. Get your production URL from Vercel
2. Update Stripe webhook URL to: `https://your-domain.com/api/webhooks/stripe`
3. Replace development webhook secret with production secret
4. Test with a real payment

---

## Testing Checklist

### Local Testing
- [ ] Start backend: `cd backend && npm start`
- [ ] Start Stripe CLI: `stripe listen --forward-to localhost:4000/api/webhooks/stripe`
- [ ] Trigger test event: `stripe trigger payment_intent.succeeded`
- [ ] Check backend logs for webhook processing
- [ ] Verify database updates

### Production Testing
- [ ] Webhook URL added to Stripe dashboard
- [ ] Webhook secret added to Vercel env vars
- [ ] Create test order in production
- [ ] Complete payment
- [ ] Check Stripe dashboard for webhook delivery
- [ ] Verify order status updated
- [ ] Test failed payment scenario
- [ ] Verify inventory restoration

---

## Troubleshooting

### "Webhook signature verification failed"
- ✅ Check `STRIPE_WEBHOOK_SECRET` is correct
- ✅ Ensure you're using the secret for the right environment (dev vs prod)
- ✅ Verify webhook is sending to correct URL

### "No order found for payment intent"
- ✅ Check `paymentIntentId` is saved when order is created
- ✅ Verify MongoDB connection is active
- ✅ Check order was created successfully

### "Inventory not restored on failure"
- ✅ Check product exists in database
- ✅ Verify `productType` matches inventory fields
- ✅ Check backend logs for restoration messages

### Webhook not received
- ✅ Check firewall/network settings
- ✅ Verify URL is publicly accessible (production)
- ✅ Check Stripe dashboard for delivery attempts
- ✅ Ensure webhook endpoint is registered correctly

---

## Security Best Practices

1. ✅ **Always verify webhook signatures** - Implemented
2. ✅ **Use HTTPS in production** - Vercel provides
3. ✅ **Validate event data** - Implemented
4. ✅ **Log all webhook events** - Implemented
5. ✅ **Handle idempotency** - Stripe handles retries
6. ✅ **Return 200 quickly** - Event processing is fast

---

## Environment Variables Required

```bash
# Backend .env
STRIPE_SECRET_KEY=sk_test_xxxxx (or sk_live_xxxxx for production)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Vercel Environment Variables (Production)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx (production webhook secret)
```

---

## Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)

---

*Webhook implementation completed: October 10, 2025*  
*Endpoint: `/api/webhooks/stripe`*  
*Status: Ready for production*

