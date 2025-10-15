# Payment Hold Tracking System

**Status**: ✅ IMPLEMENTED  
**Last Updated**: October 15, 2025  
**Gap Fixed**: Gap #3 from Payment & Payout Flow Analysis

---

## Overview

The payment hold tracking system monitors authorized (but not yet captured) payments and automatically handles expired authorizations. This prevents orders from being stuck in limbo when payment authorizations expire after 7 days.

---

## Problem Solved

### Before (Gap #3)

❌ **No visibility into held funds**  
❌ **No tracking of authorization expiration**  
❌ **Orders stuck in limbo when authorizations expired**  
❌ **Manual intervention required to clean up**  

### After (Implemented)

✅ **Full tracking of payment holds**  
✅ **Automatic expiration detection**  
✅ **Automated order cancellation**  
✅ **Inventory restoration**  
✅ **Customer notifications**  

---

## How It Works

### 1. Payment Hold Creation

When an order is created with an authorized payment:

```javascript
// File: backend/routes/orders/index.js (line ~775)

if (paymentStatus === 'authorized') {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  order.paymentHold = {
    status: 'held',
    authorizedAt: now,
    expiresAt: expiresAt,
    amount: totalAmount,
    paymentIntentId: paymentIntentId,
    lastChecked: now
  };
}
```

**Payment Hold Schema**:
```javascript
{
  status: 'held' | 'captured' | 'expired' | 'released',
  authorizedAt: Date,        // When payment was authorized
  expiresAt: Date,          // When authorization expires (7 days)
  amount: Number,           // Amount held
  paymentIntentId: String,  // Stripe PaymentIntent ID
  lastChecked: Date,        // Last time checked by cron
  capturedAt: Date,         // When payment was captured (if captured)
  expiredAt: Date          // When authorization expired (if expired)
}
```

---

### 2. Payment Capture Updates

When payment is captured, the hold status is updated:

```javascript
// File: backend/routes/orders/index.js (line ~3879)

await ordersCollection.updateOne(
  { _id: orderId },
  { 
    $set: { 
      paymentStatus: 'captured',
      'paymentHold.status': 'captured', // Update hold status
      'paymentHold.capturedAt': new Date()
    }
  }
);
```

---

### 3. Expiration Monitoring

**Cron Job**: `backend/api/cron/check-expired-authorizations.js`  
**Schedule**: Every 6 hours  
**Vercel Cron**: `0 */6 * * *` (every 6 hours)

**Process**:

```javascript
1. Find orders with expired holds:
   - paymentHold.status: 'held'
   - paymentHold.expiresAt < now
   - status not in ['completed', 'cancelled']
   - paymentStatus: 'authorized'

2. For each expired order:
   a. Cancel the order
   b. Update paymentHold.status to 'expired'
   c. Restore inventory
   d. Notify customer
   e. Notify artisan

3. Return summary of actions taken
```

---

## Order Lifecycle with Hold Tracking

```
┌─────────────────────────────────────────────────────────────┐
│ DAY 0: ORDER CREATED                                         │
│                                                               │
│ Customer places order                                        │
│   ↓                                                           │
│ Payment authorized (not captured)                            │
│   ↓                                                           │
│ Order created with paymentHold:                              │
│   status: 'held'                                             │
│   authorizedAt: 2025-10-15 10:00:00                         │
│   expiresAt: 2025-10-22 10:00:00 (7 days)                  │
│   amount: $100.00                                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
         ┌────────────────┴────────────────┐
         │                                 │
         ▼                                 ▼
┌─────────────────────┐          ┌─────────────────────┐
│ SCENARIO A:          │          │ SCENARIO B:          │
│ ORDER FULFILLED      │          │ ORDER EXPIRES        │
│                      │          │                      │
│ Day 2: Delivered     │          │ Day 8: No action     │
│   ↓                  │          │   ↓                  │
│ Customer confirms    │          │ Authorization expired│
│   ↓                  │          │   ↓                  │
│ Payment captured     │          │ Cron detects expiry  │
│   ↓                  │          │   ↓                  │
│ paymentHold:         │          │ Order cancelled      │
│   status: 'captured' │          │   ↓                  │
│   capturedAt: Date   │          │ paymentHold:         │
│                      │          │   status: 'expired'  │
│ ✅ Order complete    │          │   expiredAt: Date    │
│                      │          │   ↓                  │
│                      │          │ Inventory restored   │
│                      │          │   ↓                  │
│                      │          │ Customer notified    │
│                      │          │   ↓                  │
│                      │          │ ⚠️ Order cancelled   │
└─────────────────────┘          └─────────────────────┘
```

---

## Expiration Handling

### Automatic Actions

When an authorization expires, the system:

1. **Cancels the Order**:
   ```javascript
   {
     status: 'cancelled',
     cancelReason: 'Payment authorization expired (7 days)',
     cancelledAt: new Date()
   }
   ```

2. **Updates Payment Hold**:
   ```javascript
   {
     'paymentHold.status': 'expired',
     'paymentHold.expiredAt': new Date(),
     'paymentHold.lastChecked': new Date()
   }
   ```

3. **Restores Inventory**:
   - Increases product stock/capacity
   - Decreases soldCount
   - Updates product status if back in stock

4. **Notifies Customer**:
   ```javascript
   {
     type: 'order_cancelled_authorization_expired',
     title: 'Order Cancelled - Payment Expired',
     message: 'Your order was cancelled because the payment authorization expired after 7 days. The payment hold has been released from your card.',
     priority: 'high'
   }
   ```

5. **Notifies Artisan**:
   ```javascript
   {
     type: 'order_cancelled_expired',
     title: 'Order Cancelled - Payment Expired',
     message: 'Order was automatically cancelled due to expired payment authorization.',
     priority: 'medium'
   }
   ```

---

## Cron Job Configuration

### Vercel Cron Setup

**File**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/check-expired-authorizations",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Schedule**: Every 6 hours (0:00, 6:00, 12:00, 18:00 UTC)

**Why 6 hours?**
- Balances timeliness with resource usage
- Catches expirations within reasonable timeframe
- Not too frequent to waste resources
- Not too infrequent to leave orders in limbo

---

## Manual Trigger (Testing)

### Trigger Cron Manually

```bash
curl -X GET https://bazaarmkt.ca/api/cron/check-expired-authorizations \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Expected Response

```json
{
  "success": true,
  "message": "Checked 5 expired authorizations. Cancelled 3 orders.",
  "timestamp": "2025-10-15T10:00:00.000Z",
  "checked": 5,
  "cancelled": 3,
  "errors": null,
  "processedAt": "2025-10-15T10:00:00.000Z"
}
```

---

## Database Queries

### Find Orders with Active Holds

```javascript
db.orders.find({
  'paymentHold.status': 'held',
  'paymentHold.expiresAt': { $exists: true },
  status: { $nin: ['completed', 'cancelled'] }
}).sort({ 'paymentHold.expiresAt': 1 });
```

### Find Expired Orders (Not Yet Processed)

```javascript
db.orders.find({
  'paymentHold.status': 'held',
  'paymentHold.expiresAt': { $lt: new Date() },
  status: { $nin: ['completed', 'cancelled'] }
});
```

### Find Recently Cancelled Due to Expiration

```javascript
db.orders.find({
  'paymentHold.status': 'expired',
  cancelReason: 'Payment authorization expired (7 days)',
  cancelledAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) }
}).sort({ cancelledAt: -1 });
```

### Check Hold Status Distribution

```javascript
db.orders.aggregate([
  { $match: { 'paymentHold': { $exists: true } } },
  { $group: {
      _id: '$paymentHold.status',
      count: { $sum: 1 },
      totalAmount: { $sum: '$paymentHold.amount' }
    }
  }
]);

// Expected output:
// { _id: 'held', count: 15, totalAmount: 1500 }
// { _id: 'captured', count: 245, totalAmount: 24500 }
// { _id: 'expired', count: 8, totalAmount: 850 }
```

---

## Monitoring

### Key Metrics

```javascript
{
  // Active Holds
  activeHoldsCount: Number,      // Orders with status: 'held'
  activeHoldsValue: Number,      // Total $ held
  
  // Expiring Soon (within 24 hours)
  expiringSoonCount: Number,
  expiringSoonValue: Number,
  
  // Expired & Processed
  expiredTodayCount: Number,
  expiredThisWeekCount: Number,
  
  // Averages
  averageTimeToCapture: Number,  // Hours from auth to capture
  averageDaysHeld: Number,       // Days payment is held
  expirationRate: Percentage     // % of orders that expire
}
```

### Alerts

Set up alerts for:

```javascript
{
  highExpirationRate: {
    threshold: '> 5%',
    action: 'Investigate why orders aren\'t being fulfilled'
  },
  
  manyExpiringSoon: {
    threshold: '> 20 orders expiring in 24h',
    action: 'Alert artisans to fulfill orders'
  },
  
  cronJobFailure: {
    threshold: 'Cron hasn\'t run in 12 hours',
    action: 'Check Vercel cron status'
  }
}
```

---

## Customer Communication

### Proactive Warnings (Future Enhancement)

Send reminder notifications before expiration:

**2 Days Before Expiration**:
```
"Your order #12345678 will be cancelled in 2 days if not fulfilled. 
The artisan is working on it!"
```

**1 Day Before Expiration**:
```
"Urgent: Your order #12345678 will be cancelled tomorrow if not fulfilled. 
Contact support if you have questions."
```

**Implementation** (Future):
```javascript
// Add to cron job
const expiringSoon = await ordersCollection.find({
  'paymentHold.status': 'held',
  'paymentHold.expiresAt': { 
    $gte: new Date(Date.now() + 1*24*60*60*1000),
    $lte: new Date(Date.now() + 2*24*60*60*1000)
  }
});

for (const order of expiringSoon) {
  // Send reminder notification
}
```

---

## Testing Checklist

### 1. Hold Creation
- [ ] Create authenticated user order
- [ ] Verify `paymentHold` field exists
- [ ] Verify `expiresAt` is 7 days from now
- [ ] Verify `status` is 'held'

### 2. Hold Capture
- [ ] Fulfill order and confirm
- [ ] Payment captured
- [ ] Verify `paymentHold.status` updated to 'captured'
- [ ] Verify `paymentHold.capturedAt` is set

### 3. Hold Expiration (Simulate)
```javascript
// Manually set expiration to past
db.orders.updateOne(
  { _id: ObjectId('...') },
  { $set: { 
      'paymentHold.expiresAt': new Date(Date.now() - 1000)
    }
  }
);

// Trigger cron
// Verify order cancelled and inventory restored
```

### 4. Guest Orders
- [ ] Create guest order
- [ ] Verify NO `paymentHold` field (guest orders captured immediately)

### 5. Cron Job
- [ ] Manually trigger cron
- [ ] Verify expired orders detected
- [ ] Verify orders cancelled
- [ ] Verify notifications sent
- [ ] Verify inventory restored

---

## Edge Cases

### 1. Order Fulfilled Just Before Expiration

**Scenario**: Order fulfilled at day 6.9, cron runs at day 7.1

**Expected**: Payment captured before expiration, cron finds no expired orders

**Actual**: ✅ Payment capture happens first, hold status = 'captured', cron skips it

---

### 2. Multiple Orders Same Payment Intent

**Not possible** - Each order has unique PaymentIntent

---

### 3. Partial Capture

**Not implemented** - Orders are all-or-nothing

If needed in future, track:
```javascript
{
  paymentHold: {
    originalAmount: 100,
    capturedAmount: 60,
    remainingAmount: 40,
    partialCapture: true
  }
}
```

---

## Troubleshooting

### Issue: Orders Not Being Cancelled

**Diagnosis**:
```bash
# Check cron is running
vercel logs | grep "check-expired-authorizations"

# Manually check for expired orders
db.orders.find({
  'paymentHold.status': 'held',
  'paymentHold.expiresAt': { $lt: new Date() }
});
```

**Solutions**:
- Verify `CRON_SECRET` is set
- Check Vercel cron schedule
- Manually trigger cron

---

### Issue: Hold Status Not Updating on Capture

**Diagnosis**:
```javascript
// Check order after capture
db.orders.findOne(
  { _id: ObjectId('...') },
  { paymentHold: 1, paymentStatus: 1 }
);

// Should show:
// paymentStatus: 'captured'
// paymentHold.status: 'captured'
```

**Solution**: Check capture code includes hold status update

---

## Performance Impact

### Database Queries

**Hold Creation**: +1 field write per order (minimal impact)

**Hold Updates**: Same as existing order updates (no additional load)

**Cron Job**: 
- Runs every 6 hours
- Query scans orders with `paymentHold.status: 'held'` and `expiresAt < now`
- Typically processes 0-5 orders per run
- **Impact**: Negligible

### Indexes Recommended

```javascript
// Add compound index for efficient expired hold queries
db.orders.createIndex({
  'paymentHold.status': 1,
  'paymentHold.expiresAt': 1,
  'status': 1
});

// Add index for active hold monitoring
db.orders.createIndex({
  'paymentHold.status': 1,
  'paymentHold.expiresAt': 1
});
```

---

## Related Documentation

- [Payment & Payout Complete Flow](./PAYMENT_PAYOUT_COMPLETE_FLOW.md)
- [Gap Analysis](./PAYMENT_GAPS_ANALYSIS.md)
- [Stripe Payout System](./STRIPE_PAYOUT_SYSTEM.md)

---

## Summary

✅ **Gap #3 Implemented**: Complete escrow/hold tracking system

**Features**:
- Automatic hold creation for authorized payments
- 7-day expiration tracking
- Automated order cancellation on expiration
- Inventory restoration
- Customer and artisan notifications
- Cron-based monitoring every 6 hours

**Benefits**:
- No more orders stuck in limbo
- Automatic cleanup of expired authorizations
- Clear visibility into held funds
- Improved customer experience
- Reduced manual intervention

---

**Last Updated**: October 15, 2025  
**Status**: ✅ IMPLEMENTED  
**Maintained By**: Development Team

