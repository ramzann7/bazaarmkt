# Revenue & Wallet - Quick Fix Reference

**Date:** October 2, 2025  
**Purpose:** Quick reference for implementing critical fixes

---

## 🔴 CRITICAL BUG #1: Delivery Fees Not Credited

### Current Code (BROKEN):
```javascript
// backend/server-vercel.js:3755
const earnings = order.revenue?.artisanEarnings || 0;
```

### Fixed Code:
```javascript
const productEarnings = order.revenue?.artisanEarnings || 0;
const deliveryEarnings = order.deliveryFee || 0;
const totalEarnings = productEarnings + deliveryEarnings;
```

### Update Wallet Credit (Line ~3766):
```javascript
// OLD:
$inc: { balance: earnings }

// NEW:
$inc: { 
  balance: totalEarnings,
  'metadata.totalProductRevenue': productEarnings,
  'metadata.totalDeliveryRevenue': deliveryEarnings
}
```

### Update Transaction Record (Line ~3793):
```javascript
// OLD:
amount: earnings,

// NEW:
amount: totalEarnings,
metadata: {
  productEarnings: productEarnings,
  deliveryEarnings: deliveryEarnings,
  deliveryMethod: order.deliveryMethod,
  // ... existing metadata
}
```

---

## 🔴 CRITICAL BUG #2: Delivery Fee Calculation

### Location: Order Creation

**Patron Orders:** Line 2660  
**Guest Orders:** Line 2983

### Current Code (BROKEN):
```javascript
deliveryFee: 0,  // Hardcoded
```

### Fixed Code:
```javascript
// Calculate delivery fee based on method and artisan settings
const calculateDeliveryFee = (deliveryMethod, artisan, orderTotal, distance = 0) => {
  if (deliveryMethod === 'pickup') {
    return 0;
  }
  
  if (deliveryMethod === 'personal_delivery' || deliveryMethod === 'delivery') {
    // Use artisan's delivery fee
    const baseFee = artisan.deliveryOptions?.deliveryFee || 5;
    
    // Check for free delivery threshold
    const freeThreshold = artisan.deliveryOptions?.freeDeliveryThreshold || 0;
    if (freeThreshold > 0 && orderTotal >= freeThreshold) {
      return 0;
    }
    
    return baseFee;
  }
  
  if (deliveryMethod === 'professional_delivery') {
    // Calculate based on distance
    // Base: $5, Additional: $0.50/km after 5km
    const baseFee = 5;
    const additionalKm = Math.max(0, distance - 5);
    return baseFee + (additionalKm * 0.5);
  }
  
  return 0;
};

// Use in order creation:
const deliveryFee = calculateDeliveryFee(
  deliveryMethod, 
  artisan, 
  orderData.totalAmount,
  calculatedDistance
);
```

### Update Revenue Object:
```javascript
revenue: {
  // Product revenue
  grossAmount: orderData.totalAmount,  // Products only
  platformCommission,
  artisanEarnings,
  commissionRate: platformCommissionRate,
  platformFeePercentage: platformSettings.platformFeePercentage,
  
  // Delivery revenue (NEW)
  deliveryFee: deliveryFee,
  deliveryMethod: deliveryMethod,
  deliveryEarnings: deliveryFee,  // 100% to artisan
  deliveryCommission: 0,  // No commission on delivery
  
  // Totals (NEW)
  totalGross: orderData.totalAmount + deliveryFee,
  totalCommission: platformCommission,  // Only on products
  totalArtisanRevenue: artisanEarnings + deliveryFee
}
```

---

## ⚠️ MEDIUM BUG #3: Wallet Transaction Stats

### Location: routes/admin/index.js:152-200

### Current Code:
```javascript
res.json({
  success: true,
  data: {
    transactions,
    count: transactions.length
  }
});
```

### Fixed Code:
```javascript
// Calculate stats from transactions
const stats = {
  totalRevenue: transactions
    .filter(t => t.type === 'revenue')
    .reduce((sum, t) => sum + t.amount, 0),
  
  totalSpent: transactions
    .filter(t => ['purchase', 'fee', 'payout'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0),
  
  totalTransactions: transactions.length,
  
  revenueCount: transactions.filter(t => t.type === 'revenue').length,
  purchaseCount: transactions.filter(t => t.type === 'purchase').length,
  
  averageRevenue: transactions.filter(t => t.type === 'revenue').length > 0
    ? transactions.filter(t => t.type === 'revenue').reduce((sum, t) => sum + t.amount, 0) / 
      transactions.filter(t => t.type === 'revenue').length
    : 0
};

res.json({
  success: true,
  data: {
    transactions,
    count: transactions.length,
    stats  // ✅ Add this!
  }
});
```

---

## ⚠️ MEDIUM BUG #4: Revenue Endpoint Routing

### Create New File: `/backend/routes/revenue/index.js`

```javascript
const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

// GET /api/revenue/artisan/summary
router.get('/artisan/summary', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { period = 'month' } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();

    // Get artisan
    const artisan = await db.collection('artisans').findOne({
      user: new ObjectId(decoded.userId)
    });

    if (!artisan) {
      await client.close();
      return res.status(404).json({ success: false, message: 'Artisan not found' });
    }

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get orders and calculate revenue
    const orders = await db.collection('orders').find({
      artisan: artisan._id,
      createdAt: { $gte: startDate },
      status: { $in: ['confirmed', 'preparing', 'ready', 'delivered', 'picked_up', 'completed'] }
    }).toArray();

    // Calculate revenue breakdown
    const summary = orders.reduce((acc, order) => {
      const productRevenue = order.revenue?.grossAmount || 0;
      const platformCommission = order.revenue?.platformCommission || 0;
      const productEarnings = order.revenue?.artisanEarnings || 0;
      const deliveryFee = order.deliveryFee || 0;
      
      return {
        orderCount: acc.orderCount + 1,
        productGross: acc.productGross + productRevenue,
        deliveryGross: acc.deliveryGross + deliveryFee,
        totalGross: acc.totalGross + productRevenue + deliveryFee,
        platformCommission: acc.platformCommission + platformCommission,
        productEarnings: acc.productEarnings + productEarnings,
        deliveryEarnings: acc.deliveryEarnings + deliveryFee,
        totalEarnings: acc.totalEarnings + productEarnings + deliveryFee
      };
    }, {
      orderCount: 0,
      productGross: 0,
      deliveryGross: 0,
      totalGross: 0,
      platformCommission: 0,
      productEarnings: 0,
      deliveryEarnings: 0,
      totalEarnings: 0
    });

    await client.close();

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        summary,
        commissionRate: 0.10,
        averageOrderValue: summary.orderCount > 0 
          ? summary.totalGross / summary.orderCount 
          : 0
      }
    });
  } catch (error) {
    console.error('Get artisan revenue summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue summary',
      error: error.message
    });
  }
});

// GET /api/revenue/transparency
router.get('/transparency', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        platformCommissionRate: 10,
        artisanEarningsRate: 90,
        deliveryFeePolicy: 'Artisans receive 100% of delivery fees',
        model: {
          products: {
            commission: '10% to platform',
            earnings: '90% to artisan'
          },
          delivery: {
            commission: '0% to platform',
            earnings: '100% to artisan'
          }
        },
        transparency: {
          description: 'We believe in fair compensation for artisans',
          breakdown: 'Platform commission funds development and operations',
          support: 'Delivery fees go directly to artisans without any deduction'
        }
      }
    });
  } catch (error) {
    console.error('Get transparency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transparency info',
      error: error.message
    });
  }
});

module.exports = router;
```

### Mount Router in server-vercel.js:
```javascript
// Add near line 5695
const revenueRoutes = require('./routes/revenue');

// Add near line 5856
app.use('/api/revenue', revenueRoutes);
```

---

## 📦 IMPLEMENTATION CHECKLIST

### Phase 1: Critical Fixes
- [ ] Update wallet credit calculation (add delivery fee)
- [ ] Implement `calculateDeliveryFee()` helper function
- [ ] Add delivery fee to patron order creation
- [ ] Add delivery fee to guest order creation
- [ ] Update revenue object structure
- [ ] Test wallet credits include delivery
- [ ] Verify revenue breakdown correct

### Phase 2: Revenue Endpoints
- [ ] Create `/backend/routes/revenue/index.js`
- [ ] Implement artisan summary endpoint
- [ ] Implement transparency endpoint
- [ ] Mount revenue router
- [ ] Test frontend components load

### Phase 3: Delivery Revenue
- [ ] Create `/backend/routes/delivery-revenue/index.js`
- [ ] Implement summary endpoint
- [ ] Implement trends endpoint
- [ ] Implement performance endpoint
- [ ] Implement analytics endpoint
- [ ] Mount delivery-revenue router
- [ ] Test DeliveryRevenueDashboard

### Phase 4: Wallet Enhancements
- [ ] Add stats to wallet transactions endpoint
- [ ] Implement top-up payment intent endpoint
- [ ] Implement top-up confirm endpoint
- [ ] Implement payout settings endpoint
- [ ] Remove duplicate wallet endpoint

---

## 🧪 TESTING COMMANDS

### Test Wallet Balance
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/admin/wallet/balance
```

### Test Revenue Summary (After Fix)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/revenue/artisan/summary?period=month"
```

### Test Delivery Revenue (After Implementation)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/delivery-revenue/summary?period=month"
```

### Verify Delivery Fee in Order
```bash
# Check recent order has deliveryFee > 0
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/orders/artisan | jq '.data.orders[0].deliveryFee'
```

---

## 📝 CODE SNIPPETS

### Delivery Fee Calculation Helper
```javascript
/**
 * Calculate delivery fee based on method, artisan settings, and distance
 * @param {string} deliveryMethod - 'pickup', 'personal_delivery', 'professional_delivery'
 * @param {Object} artisan - Artisan object with deliveryOptions
 * @param {number} orderTotal - Total order amount (for free delivery threshold)
 * @param {number} distance - Distance in km (for professional delivery)
 * @returns {number} Calculated delivery fee
 */
const calculateDeliveryFee = (deliveryMethod, artisan, orderTotal = 0, distance = 0) => {
  // Pickup = Free
  if (deliveryMethod === 'pickup') {
    return 0;
  }
  
  // Personal delivery
  if (deliveryMethod === 'personal_delivery' || deliveryMethod === 'delivery') {
    const baseFee = artisan.deliveryOptions?.deliveryFee || 5;
    const freeThreshold = artisan.deliveryOptions?.freeDeliveryThreshold || 0;
    
    // Free delivery if order exceeds threshold
    if (freeThreshold > 0 && orderTotal >= freeThreshold) {
      return 0;
    }
    
    return baseFee;
  }
  
  // Professional delivery (distance-based)
  if (deliveryMethod === 'professional_delivery') {
    const baseFee = 5;
    const ratePerKm = 0.50;
    const freeDistance = 5;  // First 5km included in base
    
    const additionalDistance = Math.max(0, distance - freeDistance);
    return baseFee + (additionalDistance * ratePerKm);
  }
  
  return 0;
};
```

---

### Revenue Object Structure
```javascript
// Complete revenue object for orders
revenue: {
  // Product revenue
  grossAmount: productsTotal,
  platformCommission: productsTotal * commissionRate,
  artisanEarnings: productsTotal * (1 - commissionRate),
  commissionRate: commissionRate,
  platformFeePercentage: platformFeePercentage,
  
  // Delivery revenue
  deliveryFee: calculatedDeliveryFee,
  deliveryMethod: deliveryMethod,
  deliveryDistance: distance || 0,
  deliveryEarnings: calculatedDeliveryFee,  // 100% to artisan
  deliveryCommission: 0,  // No commission on delivery
  
  // Totals
  totalGross: productsTotal + calculatedDeliveryFee,
  totalCommission: productsTotal * commissionRate,
  totalArtisanRevenue: (productsTotal * (1 - commissionRate)) + calculatedDeliveryFee,
  
  // Revenue recognition
  isRecognized: false,
  recognizedAt: null,
  recognitionMethod: null  // 'patron_confirmed', 'auto_timeout', 'guest_auto'
}
```

---

## 🔗 ENDPOINT IMPLEMENTATION PRIORITY

### Must Have (Week 1):
1. Fix delivery fee calculation
2. Fix wallet credit to include delivery
3. `GET /api/revenue/artisan/summary`
4. `GET /api/delivery-revenue/summary`

### Should Have (Week 2):
5. `GET /api/delivery-revenue/analytics`
6. `GET /api/revenue/breakdown/:orderId`
7. `GET /api/revenue/transparency`
8. Add stats to wallet transactions

### Nice to Have (Week 3+):
9. Wallet top-up endpoints
10. Payout settings
11. Promotional features
12. Advanced analytics

---

## 📋 QUICK DECISION MATRIX

| Issue | Fix Now? | Can Wait? | Risk if Not Fixed |
|-------|----------|-----------|-------------------|
| Delivery fees $0 | ✅ YES | ❌ | Losing money |
| Delivery not in wallet | ✅ YES | ❌ | Losing money |
| Missing revenue endpoints | ✅ YES | ⚠️ Partial | Frontend broken |
| Missing delivery endpoints | ⚠️ Partial | ✅ | Feature unavailable |
| Wallet top-up missing | ❌ | ✅ YES | Feature unavailable |
| Promotional features | ❌ | ✅ YES | Feature unavailable |

---

## 🎯 RECOMMENDATION

### Start Here:
1. **Fix Bug #1 & #2 today** (4-6 hours)
2. **Create revenue router** (2-3 hours)
3. **Test thoroughly** (1-2 hours)

### This Week:
4. Implement delivery revenue endpoints
5. Add wallet transaction stats
6. Document all changes

### Next Week:
7. Wallet top-up if needed
8. Promotional features if needed
9. Advanced analytics if needed

---

**Document Created:** October 2, 2025  
**Quick Ref Version:** 1.0  
**For Detailed Analysis:** See REVENUE_WALLET_GAP_ANALYSIS.md

