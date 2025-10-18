# Wallet Payment Flow - Updated

## Security Enhancement: Immediate Deduction for Artisan Orders

### Problem
Previously, wallet funds were only verified (not deducted) when an order was placed. This allowed artisans to potentially abuse the system by placing multiple orders beyond their wallet balance.

### Solution
Wallet funds are now deducted immediately when an order is placed, preventing over-ordering.

---

## Updated Payment Flow

### 1️⃣ **Order Placement (Buyer - Artisan or Patron)**

**Immediate Actions:**
- ✅ Wallet balance verified
- ✅ **Wallet deducted immediately** from buyer
- ✅ Order created with `paymentStatus: 'paid'`
- ✅ Inventory reduced
- ✅ Notifications sent (buyer + seller)

**Code:**
```javascript
// backend/routes/orders/index.js - walletPaymentAndCreateOrder()
await walletService.deductFunds(
  userId,
  totalAmount,
  `Order payment for #${orderNumber}`,
  { reason: 'order_payment' }
);

paymentStatus: 'paid' // ← Wallet already deducted
```

**Security Benefit:**
- Artisan cannot place more orders than wallet balance allows
- Prevents wallet abuse/over-ordering

---

### 2️⃣ **Order Cancelled (by Patron)**

**Refund Actions:**
- ✅ **Wallet refunded** to buyer
- ✅ Order status → `'cancelled'`
- ✅ Payment status → `'refunded'`
- ✅ Inventory restored
- ✅ Notifications sent

**Code:**
```javascript
// backend/routes/orders/index.js - cancelOrder()
if (order.paymentMethod === 'wallet' && order.paymentStatus === 'paid') {
  await walletService.addFunds(
    decoded.userId,
    order.totalAmount,
    `Refund for cancelled order #${orderNumber}`,
    { reason: 'order_cancelled_by_patron' }
  );
  
  paymentStatus: 'refunded'
}
```

---

### 3️⃣ **Order Declined (by Artisan)**

**Refund Actions:**
- ✅ **Wallet refunded** to buyer
- ✅ Order status → `'declined'`
- ✅ Payment status → `'refunded'`
- ✅ Inventory restored
- ✅ Notifications sent

**Code:**
```javascript
// backend/routes/orders/index.js - updateOrderStatus()
if (status === 'declined' && order.paymentMethod === 'wallet' && order.paymentStatus === 'paid') {
  await walletService.addFunds(
    order.userId.toString(),
    order.totalAmount,
    `Refund for declined order #${orderNumber}`,
    { reason: 'order_declined' }
  );
  
  paymentStatus: 'refunded'
}
```

---

### 4️⃣ **Order Delivered/Picked Up (Seller Payment)**

**Revenue Recognition:**
- ✅ Platform fee calculated (15% default)
- ✅ **Seller wallet credited** with `artisanAmount` (85%)
- ✅ Revenue recorded in `revenues` collection
- ✅ Notifications sent

**Code:**
```javascript
// backend/routes/orders/index.js - updateOrderStatus()
if ((status === 'delivered' || status === 'picked_up') && 
    order.paymentStatus === 'paid') {
  
  // Calculate platform fee
  const { platformFee, artisanAmount } = await platformSettingsService.calculatePlatformFee(
    order.subtotal,
    'order'
  );
  
  // Credit seller's wallet
  await walletService.addFunds(
    artisan.user.toString(),
    artisanAmount,
    'order_completion',
    {
      orderId: order._id,
      platformFee: platformFee,
      artisanAmount: artisanAmount
    }
  );
  
  // Record revenue
  await revenuesCollection.insertOne({
    orderId: order._id,
    artisanId: artisan._id,
    totalAmount: order.totalAmount,
    platformFee: platformFee,
    artisanAmount: artisanAmount,
    status: 'recognized',
    recognizedAt: new Date()
  });
}
```

**Timeline:**
- **Buyer Deduction:** Immediate (order placement)
- **Seller Credit:** Delayed (order delivered/picked_up)
- **Platform Revenue:** Recognized at delivery/pickup

---

## Payment Status States

| Status | Description | Buyer Wallet | Seller Wallet |
|--------|-------------|--------------|---------------|
| `pending` | ❌ **REMOVED** - No longer used for wallet orders | - | - |
| `paid` | ✅ Buyer already paid | Deducted | Not yet credited |
| `refunded` | 💰 Order cancelled/declined | Refunded | Never credited |
| `captured` | ✅ Revenue recognized (delivered/picked_up) | Deducted | Credited |

---

## Benefits

### ✅ Security
- Prevents wallet over-ordering abuse
- Real-time balance enforcement
- Immediate fund reservation

### ✅ User Experience
- Clear wallet deduction at checkout
- Automatic refunds on cancellation/decline
- Transparent platform fee at delivery

### ✅ Business Logic
- Revenue recognized only at delivery (per original requirement)
- Platform fees calculated correctly
- Proper financial audit trail

---

## Testing Checklist

- [x] Place order with wallet → Immediate deduction
- [x] Cancel order → Wallet refunded
- [x] Artisan declines order → Wallet refunded
- [x] Order delivered → Seller wallet credited (minus platform fee)
- [x] Insufficient wallet balance → Order rejected
- [x] Email notifications sent at all stages

---

## Files Modified

1. `backend/routes/orders/index.js`
   - `walletPaymentAndCreateOrder()`: Immediate deduction
   - `updateOrderStatus()`: Refund on decline
   - `cancelOrder()`: Refund on cancel
   - Revenue recognition maintained at delivered/picked_up

---

**Last Updated:** October 18, 2025
**Status:** ✅ Implemented and Tested

