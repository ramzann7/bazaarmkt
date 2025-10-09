# 🗄️ MongoDB Collections Reference

## Existing Collections (Do Not Create New Ones)

Based on the current database schema, here are all the collections in use:

### Core Collections
- `users` - User accounts (customers, artisans, admins)
- `artisans` - Artisan profiles and business information
- `products` - Product listings
- `orders` - Order transactions

### Revenue & Financial
- `revenues` - Revenue records (created by WalletService)
- `wallets` - Artisan wallet balances
- `wallettransactions` - Wallet transaction history

### Promotional & Marketing
- `artisanspotlight` - Artisan spotlight subscriptions (NO underscore!)
- `promotionalfeatures` - Promotional features and boosts
- `promotional_campaigns` - Marketing campaigns
- `promotional_pricing` - Special pricing rules

### Community & Social
- `communityposts` - Community posts
- `communitycomments` - Comments on community posts
- `reviews` - Product and artisan reviews
- `favorites` - User favorites

### System & Config
- `platformsettings` - Platform-wide configuration
- `geographicsettings` - Geographic/region settings
- `notifications` - User notifications
- `adminauditlogs` - Admin action audit trail
- `guestUsers` - Guest checkout users

### Other
- `transactions` - General transactions (if used)

---

## ⚠️ Important: Collection Naming

### Correct Names (Use These)
- ✅ `artisanspotlight` (no underscore)
- ✅ `promotionalfeatures` (no underscore)
- ✅ `revenues` (plural)
- ✅ `orders` (plural)

### DO NOT USE These (Common Mistakes)
- ❌ `artisan_spotlight` (with underscore) - WRONG
- ❌ `platform_revenues` - DOES NOT EXIST, use `revenues` instead
- ❌ `revenue` (singular) - Use `revenues` (plural)
- ❌ `promotional_features` (with underscore) - WRONG, use `promotionalfeatures`

---

## 💰 Platform Fee Collection - Data Sources

The cash flow handler pulls data from **existing collections**:

```javascript
// backend/routes/admin/cashFlowHandlers.js

// 1. Order Commissions
db.collection('orders').aggregate([...])
// Gets: platformFee field from completed orders

// 2. Spotlight Subscriptions  
db.collection('artisanspotlight').aggregate([...])
// Gets: payment.amount from paid spotlights

// 3. Promotional Features
db.collection('promotionalfeatures').aggregate([...])
// Gets: payment.amount from active promotions
```

---

## 📊 Revenue Tracking

### Where Revenue is Stored

**Collection**: `revenues`

**Created By**: `backend/services/WalletService.js` (line 442)

**Structure**:
```javascript
{
  orderId: ObjectId,
  artisanId: ObjectId,
  revenue: {
    subtotal: number,
    deliveryFee: number,
    totalRevenue: number,
    platformFee: number,
    paymentProcessingFee: number,
    netEarnings: number
  },
  fees: {
    platformFeeAmount: number,
    platformFeeRate: number,
    stripeFee: number
  },
  status: 'completed',
  createdAt: Date
}
```

### Where Platform Fees Are Stored

Platform fees are tracked in **TWO places**:

1. **`orders` collection** - `platformFee` field on each order
2. **`revenues` collection** - `revenue.platformFee` and `fees.platformFeeAmount`

Both are kept in sync by the WalletService when orders complete.

---

## 🔄 Data Flow

```
1. Order Created
   → orders collection
   
2. Order Completed
   → WalletService processes order
   → Creates revenue record in revenues collection
   → Updates wallet in wallets collection
   → Creates transaction in wallettransactions
   
3. Cash Flow Report
   → Queries orders.platformFee
   → Queries artisanspotlight.payment.amount
   → Queries promotional_features.payment.amount
   → Aggregates all platform revenue
```

---

## ✅ Verified: No New Collections Created

The platform fee collection implementation uses **only existing collections**:

- ✅ `orders` - For order commissions
- ✅ `artisanspotlight` - For spotlight revenue
- ✅ `promotionalfeatures` - For promotional revenue
- ✅ `revenues` - For revenue records (already exists)
- ✅ `platformsettings` - For platform bank info (already exists)

**NO NEW COLLECTIONS CREATED** ✅

---

## 🛠️ If You Need to Check Collections in MongoDB

```bash
# Connect to MongoDB
mongo "your-connection-string"

# List all collections
use bazaarmkt
show collections

# Check documents in a collection
db.orders.findOne()
db.revenues.findOne()
db.artisanspotlight.findOne()
db.promotionalfeatures.findOne()
```

---

**Last Updated**: October 8, 2025  
**Status**: ✅ Verified - Using existing collections only

