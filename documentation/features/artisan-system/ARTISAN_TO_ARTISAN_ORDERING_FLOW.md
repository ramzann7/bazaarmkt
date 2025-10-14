# Artisan-to-Artisan Ordering Flow

## Overview
When an artisan purchases from another artisan, the **buying artisan is treated as a patron/buyer** for that specific transaction. This document outlines the complete flow and permissions.

## Role Definitions

### Buying Artisan (Artisan A)
- **Status**: Acts as BUYER/PATRON for this order
- **Stored in order**: `order.userId` = Artisan A's user ID
- **User role**: `role: 'artisan'` (but buying, not selling)

### Selling Artisan (Artisan B)
- **Status**: Acts as SELLER for this order
- **Stored in order**: `order.artisan` = Artisan B's artisan ID
- **User role**: `role: 'artisan'` (selling)

---

## Complete Order Flow

### 1. Order Creation

**What Happens:**
- Artisan A browses Artisan B's shop and adds items to cart
- Artisan A proceeds to checkout
- Order is created with:
  ```javascript
  {
    userId: artisanA_userId,      // Buying artisan
    artisan: artisanB_artisanId,  // Selling artisan
    status: 'pending',
    paymentMethod: 'wallet' or 'stripe',
    ...
  }
  ```

**Notifications Sent:**
- ✅ Artisan A (buyer): "Order created" notification
- ✅ Artisan B (seller): "New order received" notification with email

---

### 2. Order Status Progression

#### Stage 1: Pending → Confirmed (by Artisan B)
**Who Can Act:** Artisan B (seller) ONLY
**Endpoint:** `PUT /api/orders/:id/status`
**Permission Check:** `order.artisan === userArtisan._id`
**Actions Available:**
- ✅ Confirm order (`status: 'confirmed'`)
- ✅ Decline order (`status: 'declined'`) - only from pending status

**What Artisan A Can Do:**
- ✅ Cancel order (`POST /api/orders/:id/cancel`) - only from pending status
- ✅ View order status
- ❌ Cannot confirm/decline (not their order to fulfill)

---

#### Stage 2: Confirmed → Preparing (by Artisan B)
**Who Can Act:** Artisan B (seller) ONLY
**Actions:**
- Update status to `'preparing'`
- Begin order fulfillment

**What Artisan A Can Do:**
- ✅ View order status
- ❌ Cannot cancel (already confirmed)
- ❌ Cannot modify order status

---

#### Stage 3: Preparing → Ready (by Artisan B)

**For Pickup Orders:**
- Artisan B updates to `'ready_for_pickup'`
- Artisan A gets notification
- **Artisan A Action Required:** Confirm pickup when they collect the order
  - Artisan A calls: `PUT /api/orders/:id/confirm-pickup`
  - This triggers revenue recognition for Artisan B

**For Personal Delivery Orders:**
- Artisan B updates to `'ready_for_delivery'`
- Then updates to `'out_for_delivery'`
- Then `'delivered'` when delivered
- **Artisan A Action Required:** Confirm delivery receipt
  - Artisan A calls: `PUT /api/orders/:id/confirm-delivery`
  - This triggers revenue recognition for Artisan B

**For Professional Delivery (Uber Direct):**
- Artisan B updates to `'ready_for_delivery'`
- System handles professional delivery flow
- Auto-completes based on delivery service confirmation

---

#### Stage 4: Delivered → Completed (automatic or by confirmation)

**Automatic Completion:**
- For pickup: After Artisan A confirms pickup
- For delivery: After Artisan A confirms delivery
- For professional delivery: After Uber confirms delivery

**Revenue Recognition:**
- Triggers when order status reaches `'completed'`
- Artisan B's wallet is credited
- Platform fees are deducted
- Transaction recorded in `wallettransactions` collection

---

## Permission Matrix

| Action | Artisan A (Buyer) | Artisan B (Seller) | Admin |
|--------|-------------------|-------------------|-------|
| **Create Order** | ✅ Yes | ❌ No | ❌ No |
| **View Order** | ✅ Yes (own purchases) | ✅ Yes (own sales) | ✅ Yes (all) |
| **Cancel Order (pending)** | ✅ Yes | ❌ No | ✅ Yes |
| **Confirm Order** | ❌ No | ✅ Yes | ✅ Yes |
| **Decline Order (pending)** | ❌ No | ✅ Yes | ✅ Yes |
| **Update Status (preparing/ready)** | ❌ No | ✅ Yes | ✅ Yes |
| **Confirm Pickup** | ✅ Yes | ❌ No | ✅ Yes |
| **Confirm Delivery** | ✅ Yes | ❌ No | ✅ Yes |
| **Complete Order** | ❌ No | ✅ Yes (after confirmation) | ✅ Yes |

---

## API Endpoints & Permissions

### For Artisan A (Buyer)

#### Cancel Order (before confirmation)
```http
POST /api/orders/:id/cancel
Authorization: Bearer <artisan_a_token>
```
**Permission Check:**
```javascript
order.userId.toString() === decoded.userId
&& order.status === 'pending'
```

#### Confirm Pickup
```http
PUT /api/orders/:id/confirm-pickup
Authorization: Bearer <artisan_a_token>
```
**Permission Check:**
```javascript
order.userId.toString() === decoded.userId
&& order.status === 'ready_for_pickup'
```

#### Confirm Delivery
```http
PUT /api/orders/:id/confirm-delivery
Authorization: Bearer <artisan_a_token>
```
**Permission Check:**
```javascript
order.userId.toString() === decoded.userId
&& order.deliveryMethod === 'personalDelivery'
&& order.status === 'delivered'
```

#### Get Own Orders (as buyer)
```http
GET /api/orders/buyer
Authorization: Bearer <artisan_a_token>
```
Returns all orders where `order.userId === artisan_a_userId`

---

### For Artisan B (Seller)

#### Update Order Status
```http
PUT /api/orders/:id/status
Authorization: Bearer <artisan_b_token>
Body: { status: 'confirmed' | 'preparing' | 'ready_for_pickup' | etc. }
```
**Permission Check:**
```javascript
const userArtisan = await artisansCollection.findOne({ 
  user: decoded.userId 
});
const isArtisan = order.artisan.toString() === userArtisan._id.toString();
// isArtisan must be true
```

#### Get Own Orders (as seller)
```http
GET /api/orders
Authorization: Bearer <artisan_b_token>
```
Returns all orders where `order.artisan === artisan_b_artisanId`

---

## Database Schema for Artisan-to-Artisan Orders

```javascript
{
  _id: ObjectId("..."),
  // Buyer information (Artisan A)
  userId: ObjectId("artisan_a_user_id"),  // References users collection
  user: {
    _id: ObjectId("artisan_a_user_id"),
    firstName: "Artisan A First",
    lastName: "Artisan A Last",
    email: "artisan_a@example.com"
  },
  
  // Seller information (Artisan B)
  artisan: ObjectId("artisan_b_artisan_id"),  // References artisans collection
  artisanData: {
    _id: ObjectId("artisan_b_artisan_id"),
    artisanName: "Artisan B Name",
    businessName: "Artisan B Business",
    user: ObjectId("artisan_b_user_id")
  },
  
  // Order details
  items: [...],
  totalAmount: 150.00,
  status: 'pending',
  paymentMethod: 'wallet',
  
  // Indicates this is NOT a guest order
  isGuestOrder: false,
  
  // Delivery/Pickup details
  deliveryMethod: 'pickup' | 'personalDelivery' | 'professionalDelivery',
  deliveryAddress: {...},  // If applicable
  pickupTimeWindows: {...},  // If pickup
  
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

## Key Implementation Details

### 1. Permission Checks Use Different Fields

**For Buyer Actions (Artisan A):**
```javascript
// Check: Does this order belong to the logged-in user?
const order = await ordersCollection.findOne({
  _id: orderId,
  userId: new ObjectId(decoded.userId)
});
```

**For Seller Actions (Artisan B):**
```javascript
// Check: Is the logged-in user the artisan for this order?
const userArtisan = await artisansCollection.findOne({ 
  user: new ObjectId(decoded.userId) 
});

const isArtisan = order.artisan.toString() === userArtisan._id.toString();
```

### 2. Notification Routing

**Order Created:**
- Artisan A (buyer): Platform notification only
- Artisan B (seller): Platform notification + Email

**Status Updates:**
- Artisan A (buyer): Platform notification only
- Artisan B (seller): Not notified (they made the change)

**Order Cancelled:**
- Artisan A (buyer): Platform notification only
- Artisan B (seller): Platform notification + Email

### 3. Wallet Transactions

**For Wallet Payment (Artisan A buying):**
```javascript
// Deduct from Artisan A's wallet
await walletService.deductFunds(
  artisan_a_userId,
  totalAmount,
  `Purchase - Order #${orderNumber}`
);
```

**For Revenue Recognition (when completed):**
```javascript
// Credit Artisan B's wallet
await walletService.addFunds(
  artisan_b_userId,
  netEarnings,  // After platform fees
  'order_completion',
  { orderId, orderNumber }
);
```

---

## Current Implementation Status

### ✅ Already Implemented Correctly

1. **Order Creation**
   - Artisan A can create orders via cart
   - Order correctly stores buyer (userId) and seller (artisan)
   
2. **Permission Separation**
   - `cancelOrder` endpoint checks `userId` ✅
   - `updateOrderStatus` endpoint checks `artisan` ✅
   - Proper separation between buyer and seller actions
   
3. **Status Management**
   - Artisan B (seller) handles all order fulfillment statuses
   - Artisan A (buyer) can only cancel when pending
   
4. **Wallet Integration**
   - Artisan A pays from their wallet
   - Artisan B receives to their wallet
   - Uses `wallets` and `wallettransactions` collections

### 📋 Recommendations

1. **Add Explicit Documentation in Code**
   - Add comments in `updateOrderStatus` explaining artisan-to-artisan flow
   - Add comments in `cancelOrder` explaining buyer permissions
   
2. **Frontend Clarity**
   - When artisan views orders, clearly separate:
     - "Orders I'm Selling" (where they are the seller)
     - "My Purchases" (where they are the buyer)
   
3. **Confirmation Flow**
   - Ensure artisan buyers can confirm pickup/delivery
   - Add clear UI prompts for required buyer actions

4. **Testing Checklist**
   - Test artisan-to-artisan order creation ✅
   - Test seller can confirm/decline ✅
   - Test buyer can cancel (pending only) ✅
   - Test buyer cannot modify status ✅
   - Test buyer can confirm pickup/delivery ⚠️ (verify)
   - Test revenue recognition triggers correctly ✅

---

## Conclusion

The current implementation **correctly handles** artisan-to-artisan orders by:

1. Storing buyer's `userId` and seller's `artisan` ID separately
2. Using different permission checks for buyer vs seller actions
3. Restricting buyer actions to: cancel (pending), view, and confirm pickup/delivery
4. Giving seller full control over order fulfillment and status updates

The buying artisan is **effectively treated as a patron** with limited permissions, while the selling artisan has full order management capabilities. This is the correct and expected behavior.


