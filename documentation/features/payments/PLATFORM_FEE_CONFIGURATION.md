# Platform Fee Configuration

**Status**: ✅ VERIFIED - Dynamic Fee Calculation Implemented  
**Last Updated**: October 15, 2025

---

## Overview

The platform fee system is **fully dynamic** and uses the `platformFeePercentage` setting stored in the database, not hardcoded values. This allows administrators to adjust the platform commission without code changes.

---

## How It Works

### 1. Platform Settings Storage

**Collection**: `platformsettings`

```javascript
{
  _id: ObjectId,
  platformFeePercentage: 10, // 10% commission (customizable)
  paymentProcessingFee: 2.9, // 2.9% Stripe fee
  paymentProcessingFeeFixed: 0.30, // $0.30 per transaction
  currency: 'CAD',
  // ... other settings
  updatedAt: Date
}
```

**Default**: 10% if not set

---

### 2. Fee Calculation Service

**File**: `backend/services/platformSettingsService.js`

```javascript
async calculatePlatformFee(amount, feeType = 'order') {
  const settings = await this.getPlatformSettings();
  
  // ✅ Dynamically retrieves from database
  const feeRate = (settings.platformFeePercentage || 10) / 100;
  const platformFee = amount * feeRate;
  
  // Calculate Stripe fees
  const stripeFeeRate = (settings.paymentProcessingFee || 2.9) / 100;
  const stripeFeeFixed = settings.paymentProcessingFeeFixed || 0.30;
  const stripeFee = (amount * stripeFeeRate) + stripeFeeFixed;
  
  // Calculate artisan amount
  const artisanAmount = amount - platformFee - stripeFee;

  return {
    totalAmount: amount,
    platformFee: Math.round(platformFee * 100) / 100,
    stripeFee: Math.round(stripeFee * 100) / 100,
    artisanAmount: Math.round(artisanAmount * 100) / 100,
    feeRate: feeRate,
    feeType: 'percentage'
  };
}
```

---

### 3. Usage in Payment Flow

#### A. Payment Capture & Transfer

**File**: `backend/routes/orders/index.js`

```javascript
// Function: capturePaymentAndTransfer()
// Line: ~3805

const platformSettingsService = new PlatformSettingsService(db);

// ✅ Calls dynamic fee calculation
const feeCalculation = await platformSettingsService.calculatePlatformFee(
  order.totalAmount, 
  'order'
);

const { platformFee, artisanAmount, stripeFee } = feeCalculation;

// Transfer artisan amount to Connect account
const transfer = await stripe.transfers.create({
  amount: Math.round(artisanAmount * 100),
  currency: 'cad',
  destination: artisan.stripeConnectAccountId,
  metadata: {
    orderId: order._id.toString(),
    platformFee: platformFee.toString(),
    totalAmount: order.totalAmount.toString()
  }
});
```

#### B. Auto-Capture Cron Job

**File**: `backend/api/cron/auto-capture-payments.js`

```javascript
// Line: ~133

// ✅ Uses same dynamic calculation
const feeCalculation = await calculatePlatformFee(
  db, 
  order.totalAmount, 
  'order'
);

const { platformFee, artisanAmount } = feeCalculation;
```

#### C. Revenue Recognition

**File**: `backend/services/WalletService.js`

```javascript
// Function: processOrderCompletion()
// Line: ~577

const settings = await platformSettingsService.getPlatformSettings();

// ✅ Retrieves dynamic percentage
const platformFeeRate = (settings.platformFeePercentage || 10) / 100;
const platformFee = totalRevenue * platformFeeRate;

const paymentProcessingFeeRate = (settings.paymentProcessingFee || 2.9) / 100;
const paymentProcessingFeeFixed = settings.paymentProcessingFeeFixed || 0.30;
const paymentProcessingFee = (totalRevenue * paymentProcessingFeeRate) + paymentProcessingFeeFixed;

const netEarnings = totalRevenue - platformFee - paymentProcessingFee;
```

---

## Updating Platform Fee

### Via Database (Recommended)

```javascript
// MongoDB Shell or Admin API
db.platformsettings.updateOne(
  {},
  { 
    $set: { 
      platformFeePercentage: 12, // Change to 12%
      updatedAt: new Date()
    }
  }
);
```

### Via Admin API (Future)

```javascript
// POST /api/admin/settings
{
  "platformFeePercentage": 12
}
```

---

## Fee Calculation Examples

### Example 1: Default 10% Fee

**Order Total**: $100.00

```javascript
// Settings
platformFeePercentage: 10
paymentProcessingFee: 2.9
paymentProcessingFeeFixed: 0.30

// Calculation
totalAmount = $100.00
platformFee = $100.00 × 0.10 = $10.00
stripeFee = ($100.00 × 0.029) + $0.30 = $3.20
artisanAmount = $100.00 - $10.00 - $3.20 = $86.80

// Result
Platform keeps: $10.00 (commission)
Stripe keeps: $3.20 (processing fee)
Artisan receives: $86.80
```

### Example 2: Custom 8% Fee

**Order Total**: $100.00

```javascript
// Settings (updated)
platformFeePercentage: 8  // Changed from 10% to 8%
paymentProcessingFee: 2.9
paymentProcessingFeeFixed: 0.30

// Calculation
totalAmount = $100.00
platformFee = $100.00 × 0.08 = $8.00  // Lower!
stripeFee = ($100.00 × 0.029) + $0.30 = $3.20
artisanAmount = $100.00 - $8.00 - $3.20 = $88.80  // Higher!

// Result
Platform keeps: $8.00 (commission)
Stripe keeps: $3.20 (processing fee)
Artisan receives: $88.80  // Artisan gets more!
```

### Example 3: Custom 15% Fee

**Order Total**: $100.00

```javascript
// Settings (updated)
platformFeePercentage: 15  // Increased to 15%
paymentProcessingFee: 2.9
paymentProcessingFeeFixed: 0.30

// Calculation
totalAmount = $100.00
platformFee = $100.00 × 0.15 = $15.00  // Higher!
stripeFee = ($100.00 × 0.029) + $0.30 = $3.20
artisanAmount = $100.00 - $15.00 - $3.20 = $81.80  // Lower

// Result
Platform keeps: $15.00 (commission)
Stripe keeps: $3.20 (processing fee)
Artisan receives: $81.80  // Artisan gets less
```

---

## Impact of Fee Changes

### Immediate Effects

When you change `platformFeePercentage`:

✅ **Applies to**:
- All new orders placed after the change
- All order confirmations after the change
- All auto-captures after the change
- All wallet credits after the change

❌ **Does NOT apply to**:
- Orders already completed (historical)
- Payments already captured (immutable)
- Revenue already recognized (recorded)

### Example Timeline

```
Day 1 (Monday):
- Fee is 10%
- Order #1 placed: $100 → Artisan gets $86.80

Day 2 (Tuesday):
- Admin changes fee to 12%
- Order #2 placed: $100 → Artisan gets $84.80

Day 3 (Wednesday):
- Order #1 confirmed → Uses 10% (captured before change)
- Order #2 confirmed → Uses 12% (captured after change)
```

---

## Verification

### Check Current Fee

```javascript
// MongoDB Shell
db.platformsettings.findOne({}, { platformFeePercentage: 1 })

// Output:
{
  "_id": ObjectId("..."),
  "platformFeePercentage": 10
}
```

### Test Fee Calculation

```javascript
// Node.js / Backend
const PlatformSettingsService = require('./services/platformSettingsService');
const platformService = new PlatformSettingsService(db);

const result = await platformService.calculatePlatformFee(100, 'order');

console.log(result);
// Output:
// {
//   totalAmount: 100,
//   platformFee: 10,
//   stripeFee: 3.2,
//   artisanAmount: 86.8,
//   feeRate: 0.1,
//   feeType: 'percentage'
// }
```

### Verify in Revenue Records

```javascript
// Check recent revenue records
db.revenues.find({}).sort({ createdAt: -1 }).limit(1)

// Should show:
{
  revenue: {
    totalRevenue: 100,
    platformFee: 10,  // Uses current setting
    paymentProcessingFee: 3.2,
    netEarnings: 86.8
  },
  fees: {
    platformFeeRate: 0.1,  // 10%
    platformFeeAmount: 10
  }
}
```

---

## Fee Configuration Best Practices

### 1. Don't Change Too Frequently
- Confuses artisans if fees keep changing
- Recommend: Review quarterly

### 2. Notify Artisans Before Changes
- Email notification 30 days before
- Show impact on sample order ($100 example)

### 3. Consider Competitive Rates
| Platform | Fee |
|----------|-----|
| Etsy | 6.5% |
| Amazon Handmade | 15% |
| Shopify | 0% (subscription instead) |
| **bazaarMKT** | **10%** (default) |

### 4. Test Before Deploying
```javascript
// Test calculation with new percentage
const testFee = 12; // Testing 12%
const testAmount = 100;

const result = {
  platformFee: testAmount * (testFee / 100),
  stripeFee: (testAmount * 0.029) + 0.30,
  artisanAmount: testAmount - (testAmount * (testFee / 100)) - ((testAmount * 0.029) + 0.30)
};

console.log('With 12% fee:', result);
// Verify artisan amount is reasonable
```

---

## Related Settings

### Other Customizable Fee Settings

```javascript
{
  platformFeePercentage: 10,        // ✅ Customizable
  paymentProcessingFee: 2.9,        // ⚠️ Stripe fee (can't change much)
  paymentProcessingFeeFixed: 0.30,  // ⚠️ Stripe fee (can't change much)
  
  // Payout settings (also customizable)
  payoutSettings: {
    minimumPayoutAmount: 25,        // ✅ Customizable
    payoutFrequency: 'weekly',      // ✅ Customizable
    payoutDelay: 7                  // ✅ Customizable
  }
}
```

---

## Monitoring Fee Impact

### Key Metrics to Track

```javascript
// After fee change, monitor:
{
  // Artisan metrics
  averageArtisanEarningsPerOrder: Number,  // Should change with fee
  artisanRetentionRate: Percentage,        // Watch for drop
  newArtisanSignups: Number,               // May decrease if fee too high
  
  // Platform metrics
  platformRevenuePerOrder: Number,         // Increases with higher fee
  totalPlatformRevenue: Number,            // Overall revenue
  
  // Order metrics
  orderVolume: Number,                     // Watch for drop
  averageOrderValue: Number,               // May change
  orderCancellationRate: Percentage        // Watch for increase
}
```

### Sample MongoDB Aggregation

```javascript
// Calculate average platform fee from recent orders
db.revenues.aggregate([
  { $match: { createdAt: { $gte: new Date('2025-10-01') } } },
  { $group: {
      _id: null,
      avgPlatformFee: { $avg: '$fees.platformFeeAmount' },
      avgArtisanEarnings: { $avg: '$revenue.netEarnings' },
      totalRevenue: { $sum: '$revenue.totalRevenue' },
      totalPlatformFees: { $sum: '$fees.platformFeeAmount' }
    }
  }
])
```

---

## Troubleshooting

### Issue: Fee Calculation Seems Wrong

**Check**:
```javascript
// 1. Verify platform settings
db.platformsettings.findOne({}, { platformFeePercentage: 1 })

// 2. Check recent order
db.orders.findOne(
  { _id: ObjectId('...') },
  { platformFee: 1, totalAmount: 1, artisanAmount: 1 }
)

// 3. Manually calculate
const total = 100;
const feePercent = 10;
const expected = total * (feePercent / 100);
console.log('Expected platform fee:', expected); // Should be 10
```

---

### Issue: Old Orders Using New Fee

**This shouldn't happen** - fees are calculated at capture time.

If it does:
```javascript
// Check order capture date vs settings update date
const order = db.orders.findOne({ _id: ObjectId('...') });
const settings = db.platformsettings.findOne({});

console.log('Order captured at:', order.paymentCapturedAt);
console.log('Settings last updated:', settings.updatedAt);

// Fee used should match settings at capture time
```

---

## Summary

✅ **Platform fee is dynamic** - Retrieved from database, not hardcoded  
✅ **Easy to update** - Change one value in `platformsettings`  
✅ **Applies automatically** - All new orders use current setting  
✅ **Historical integrity** - Old orders keep their original fees  
✅ **Transparent calculation** - Clear breakdown in revenue records  

**Current Implementation**: 
- Default: 10%
- Stored in: `platformsettings.platformFeePercentage`
- Applied by: `PlatformSettingsService.calculatePlatformFee()`
- Used in: Payment capture, auto-capture, revenue recognition

---

## Related Documentation

- [Stripe Payout System](./STRIPE_PAYOUT_SYSTEM.md)
- [Revenue Model](./REVENUE_MODEL.md)
- [Environment Variables](./ENVIRONMENT_VARIABLES.md)

---

**Last Updated**: October 15, 2025  
**Verified**: ✅ Dynamic fee calculation confirmed  
**Maintained By**: Development Team

