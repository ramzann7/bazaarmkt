# Wallet Credit System - Complete Documentation

## 🎯 Overview

The wallet credit system automatically credits artisans when orders are completed, with built-in fraud prevention and patron confirmation requirements.

---

## 📊 System Architecture

### **Two-Tier Confirmation System:**

1. **Guest Orders** → Immediate credit (no confirmation needed)
2. **Registered Patron Orders** → Requires confirmation or 48-hour auto-confirm

---

## 🔄 Wallet Credit Flow

### **Flow 1: Guest Orders (Immediate Credit)**

```
Order Placed (Guest)
     ↓
Artisan Confirms Delivery/Pickup
     ↓
✅ Wallet Credited Immediately
     ↓
Transaction Recorded
```

**Why immediate?**
- Guest can't log in to confirm
- Artisan confirmation is sufficient
- Lower fraud risk (one-time customers)

---

### **Flow 2: Registered Patron Orders (Confirmation Required)**

```
Order Placed (Registered Patron)
     ↓
Artisan Marks as Delivered/Picked Up
     ↓
⏳ Pending Balance (Patron notification sent)
     ↓
┌─────────────────────────────────────┐
│ Patron Confirms Receipt             │
│        OR                           │
│ 48 Hours Pass (Auto-confirm)        │
└─────────────────────────────────────┘
     ↓
✅ Wallet Credited
     ↓
Transaction Recorded
```

**Why confirmation?**
- Fraud prevention
- Dispute resolution
- Quality assurance
- Fair to both parties

---

## 🛡️ Fraud Prevention Features

### **1. Order Ownership Verification**
```javascript
// Only order owner can confirm
if (order.userId.toString() !== userId) {
  return 403 Forbidden
}
```

### **2. Status Validation**
```javascript
// Only valid for delivered/picked_up orders
const validStatuses = ['delivered', 'picked_up', 'ready_for_pickup', 'out_for_delivery'];
```

### **3. Duplicate Prevention**
```javascript
// Can't confirm twice
if (order.walletCredit?.patronConfirmedAt) {
  return 400 "Already confirmed"
}
```

### **4. Pending Credit Check**
```javascript
// Must have pending credit
if (!order.walletCredit?.pendingConfirmation) {
  return 400 "No pending credit"
}
```

### **5. Artisan Confirmation First**
```javascript
// Only credits when artisan initiates delivery/pickup status
if (isArtisan && status === 'delivered') {
  // Trigger wallet credit flow
}
```

---

## ⏰ Auto-Confirmation System

### **Method 1: Vercel Cron (Primary)**

**Configuration:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/orders/auto-confirm-pending",
      "schedule": "0 * * * *"  // Every hour
    }
  ]
}
```

**Endpoint:** `POST /api/orders/auto-confirm-pending`
- Protected by `CRON_SECRET` environment variable
- Runs hourly on Vercel
- Processes all expired pending confirmations

---

### **Method 2: On-Demand Auto-Confirm (Backup)**

**Triggers on:**
- `GET /api/orders` (patron loads their orders)
- `GET /api/orders/artisan` (artisan loads their orders)

**Benefits:**
- Immediate confirmation when deadline passes
- Doesn't rely solely on cron timing
- Better user experience
- Redundant safety net

---

## 💾 Database Schema

### **Order Document (orders collection)**

```javascript
{
  _id: ObjectId,
  // ... other order fields ...
  
  revenue: {
    grossAmount: 60.00,
    platformCommission: 6.00,        // 10%
    artisanEarnings: 54.00,          // 90%
    commissionRate: 0.10
  },
  
  walletCredit: {
    // Pending state (waiting for confirmation)
    pendingConfirmation: true,
    amount: 54.00,
    artisanConfirmedAt: ISODate("2025-10-01T14:30:00Z"),
    autoConfirmDeadline: ISODate("2025-10-03T14:30:00Z"), // +48h
    confirmationType: 'pickup_pending', // or 'delivery_pending'
    
    // After confirmation
    credited: true,
    patronConfirmedAt: ISODate("2025-10-01T16:00:00Z"), // or null if auto
    creditedAt: ISODate("2025-10-01T16:00:00Z"),
    confirmationType: 'pickup_confirmed' // or 'auto_timeout', 'guest_auto'
  }
}
```

---

### **Wallet Document (wallets collection)**

```javascript
{
  _id: ObjectId,
  artisanId: ObjectId("artisan123"),
  balance: 250.00,              // Available for withdrawal
  pendingBalance: 54.00,        // Awaiting patron confirmation
  currency: 'CAD',
  isActive: true,
  createdAt: ISODate,
  updatedAt: ISODate
}
```

---

### **Wallet Transaction Document (wallet_transactions collection)**

```javascript
{
  _id: ObjectId,
  walletId: ObjectId("wallet123"),
  artisanId: ObjectId("artisan123"),
  type: 'revenue',              // 'revenue', 'payout', 'refund', 'fee'
  amount: 54.00,
  orderId: ObjectId("order123"),
  orderNumber: "ABC12345",
  description: "Order #ABC12345 completed (Patron confirmed)",
  status: 'completed',
  metadata: {
    isGuestOrder: false,
    deliveryMethod: 'pickup',
    grossAmount: 60.00,
    platformCommission: 6.00,
    confirmedBy: 'patron',      // 'patron', 'auto_timeout', 'guest_auto'
    confirmedAt: ISODate
  },
  createdAt: ISODate
}
```

---

## 🎨 UI Components

### **1. Patron Order Confirmation (Orders.jsx)**

**Location:** Order Details Modal → Action Buttons

**When Shown:**
- Order status: `delivered` or `picked_up`
- No prior confirmation: `!order.walletCredit?.patronConfirmedAt`
- User role: `patron`

**Features:**
- 🟡 **Amber alert box** with pulsing animation
- ⏰ **Countdown timer** showing hours until auto-confirm
- ✅ **Confirm button** with immediate feedback
- 💬 **Clear messaging** ("Confirm pickup" vs "Confirm delivery")

**Visual:**
```
┌────────────────────────────────────────┐
│ ⚠️  Confirmation Required              │
│                                        │
│ Have you picked up your order?         │
│ Please confirm once received.          │
│                                        │
│ Auto-confirms in 46 hours if not       │
│ confirmed                              │
│                                        │
│ [✅ Confirm Pickup]                    │
└────────────────────────────────────────┘
```

---

### **2. Wallet Balance Card (WalletCard.jsx)**

**Shows:**
- 💰 **Available Balance** (green, ready for payout)
- ⏳ **Pending Balance** (amber, awaiting confirmation)

**Visual:**
```
┌──────────────────────────┐
│ Wallet                   │
├──────────────────────────┤
│ Available Balance        │
│ $250.00 ● Active         │
│                          │
│ 🕒 $54.00 pending        │
├──────────────────────────┤
│ This Month  │ Pending    │
│ 12 txns     │ $54.00     │
└──────────────────────────┘
```

---

### **3. Order Cards - Confirmation Badge**

**Shown on order list:**
- Pulsing amber badge
- "Confirmation Needed"
- Pickup/Delivery specific text

**Visual:**
```
┌────────────────────────────┐
│ Order #ABC123              │
│ ⏳ [PULSING AMBER BADGE]   │
│    Confirmation Needed     │
│    Confirm pickup          │
└────────────────────────────┘
```

---

## 🔐 Security Measures

### **1. Authentication**
- All endpoints require valid JWT token
- User/artisan role verification
- Order ownership validation

### **2. Authorization**
- Patrons can only confirm their own orders
- Artisans can only trigger credit for their orders
- Cron endpoint requires secret key

### **3. Idempotency**
- Can't confirm same order twice
- Can't credit wallet twice
- Transaction records prevent duplicates

### **4. State Validation**
- Order must be in valid status
- Must have pending confirmation
- Must have valid revenue calculation

### **5. Audit Trail**
- All transactions logged
- Confirmation type tracked
- Timestamps for all actions

---

## 📡 API Endpoints

### **1. Patron Confirms Order**

```http
POST /api/orders/:id/confirm-receipt
Authorization: Bearer <patron_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Order receipt confirmed successfully",
  "data": {
    "orderId": "...",
    "creditedAmount": 54.00,
    "confirmedAt": "2025-10-01T16:00:00Z"
  }
}
```

---

### **2. Auto-Confirm Pending Orders (Cron)**

```http
POST /api/orders/auto-confirm-pending
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-confirmed 3 orders",
  "data": {
    "confirmedCount": 3,
    "totalCredited": "162.00",
    "processedAt": "2025-10-01T16:00:00Z"
  }
}
```

---

### **3. Get Wallet Balance**

```http
GET /api/admin/wallet/balance
Authorization: Bearer <artisan_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 250.00,
    "pendingBalance": 54.00,
    "currency": "CAD",
    "lastUpdated": "2025-10-01T16:00:00Z"
  }
}
```

---

## 📝 Transaction Types

| Type | Direction | Description | Confirmation |
|------|-----------|-------------|--------------|
| `revenue` | Credit (+) | Order earnings | Required |
| `payout` | Debit (-) | Withdrawal to bank | N/A |
| `refund` | Debit (-) | Order refund | N/A |
| `fee` | Debit (-) | Platform/service fee | N/A |
| `spotlight_purchase` | Debit (-) | Spotlight subscription | Immediate |

---

## ⚙️ Configuration

### **Environment Variables**

```bash
# Required for cron job security
CRON_SECRET=your-secure-random-string-here

# MongoDB connection
MONGODB_URI=mongodb+srv://...

# JWT for authentication
JWT_SECRET=your-jwt-secret
```

### **Platform Commission Rate**

Located in order creation endpoints:
```javascript
const platformCommissionRate = 0.10; // 10%
```

**Calculation:**
- Gross Amount: $60.00
- Platform Commission (10%): $6.00
- Artisan Earnings (90%): $54.00

---

## 🧪 Testing Wallet Credit

### **Test 1: Guest Order (Immediate Credit)**

1. Place guest order
2. Artisan marks as picked_up/delivered
3. ✅ Wallet credited immediately
4. Check: `walletCredit.confirmationType === 'guest_auto'`

---

### **Test 2: Patron Order (Manual Confirmation)**

1. Place order as registered patron
2. Artisan marks as delivered
3. ⏳ Pending balance increases
4. Patron confirms receipt
5. ✅ Pending → Available balance
6. Check: `walletCredit.confirmationType === 'pickup_confirmed'`

---

### **Test 3: Auto-Confirm (48h Timeout)**

1. Place order as registered patron
2. Artisan marks as picked_up
3. ⏳ Pending balance increases
4. Wait 48 hours (or run cron manually)
5. ✅ Auto-confirmed, wallet credited
6. Check: `walletCredit.confirmationType === 'auto_timeout'`

---

## 🔧 Manual Testing Commands

### **Run Auto-Confirm Manually (Local Development)**

```bash
# Set environment variable
export CRON_SECRET=your-secret-here

# Trigger auto-confirm
curl -X POST http://localhost:4000/api/orders/auto-confirm-pending \
  -H "x-cron-secret: your-secret-here"
```

---

### **Check Wallet Balance**

```bash
curl -X GET http://localhost:4000/api/admin/wallet/balance \
  -H "Authorization: Bearer <artisan_token>"
```

---

### **Confirm Order as Patron**

```bash
curl -X POST http://localhost:4000/api/orders/<order_id>/confirm-receipt \
  -H "Authorization: Bearer <patron_token>"
```

---

## 📈 Monitoring

### **Key Metrics to Track:**

1. **Auto-confirm success rate**
   - How many orders auto-confirm vs manual confirm
   
2. **Average confirmation time**
   - How quickly patrons confirm

3. **Pending balance trends**
   - High pending balance indicates issues

4. **Transaction failure rate**
   - Should be near 0%

### **Logs to Monitor:**

```
✅ Wallet credited $54.00 for guest order
⏳ Wallet credit pending patron confirmation - $54.00
✅ Auto-confirmed order ABC12345 - credited $54.00
💰 Patron confirmed order 123... - processing wallet credit
```

---

## 🚨 Troubleshooting

### **Issue: Wallet not credited for completed orders**

**Check:**
1. Order has `revenue.artisanEarnings > 0`
2. Status is `delivered` or `picked_up`
3. Artisan initiated the status change (not patron)
4. Check `walletCredit` field in order document

---

### **Issue: Pending balance stuck**

**Possible Causes:**
1. Patron hasn't confirmed
2. Auto-confirm deadline not reached
3. Cron job not running

**Solution:**
```bash
# Manually trigger auto-confirm
curl -X POST .../auto-confirm-pending -H "x-cron-secret: ..."
```

---

### **Issue: Duplicate credits**

**Prevention:**
- `walletCredit.credited` flag prevents duplicates
- Transaction records checked before insertion
- Idempotent operations

---

## 🎁 Benefits

### **For Artisans:**
✅ Automatic earnings tracking  
✅ Clear pending vs available balance  
✅ Transaction history for accounting  
✅ Protection from chargebacks  
✅ Guaranteed payment after confirmation  

### **For Patrons:**
✅ Fraud protection  
✅ Dispute window  
✅ Quality assurance incentive  
✅ Simple confirmation process  
✅ Auto-confirm if forgotten  

### **For Platform:**
✅ Reduced disputes  
✅ Transaction audit trail  
✅ Fair marketplace  
✅ Fraud prevention  
✅ Scalable system  

---

## 🔄 Maintenance

### **Daily:**
- Monitor auto-confirm logs
- Check for failed transactions

### **Weekly:**
- Review pending balance trends
- Audit wallet transactions

### **Monthly:**
- Reconcile total earnings vs transactions
- Review fraud prevention effectiveness

---

## 📞 Support

For wallet-related issues, customers can contact:
**bazaar@bazaarmkt.ca**

---

## 🚀 Future Enhancements

- [ ] Automated payouts to bank accounts
- [ ] Dynamic commission rates
- [ ] Multi-currency support
- [ ] Wallet top-up for patrons
- [ ] Referral bonuses
- [ ] Loyalty rewards

---

**Last Updated:** October 1, 2025  
**System Version:** 2.0  
**Status:** Production Ready ✅

