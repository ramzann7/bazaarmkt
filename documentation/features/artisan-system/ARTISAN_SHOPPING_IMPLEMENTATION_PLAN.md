# Artisan Shopping Feature - Implementation Plan

## Overview
Enable artisans to shop on the platform, purchase products from other artisans, and pay using their wallet balance.

---

## Current State Analysis

### ✅ What Already Works
1. **Cart System**: Artisans CAN already add products to cart
   - Prevention exists: artisans cannot buy their own products
   - Cart service checks artisan ID vs product artisan ID
   - No code changes needed for cart functionality

2. **Wallet System**: Fully functional
   - `WalletService.deductFunds()` exists
   - Supports balance checks
   - Creates transaction records
   - Error handling for insufficient funds

3. **Order Creation**: Existing flow can be reused
   - Backend: `/backend/routes/orders/index.js`
   - Handles payment processing
   - Creates orders in database

### ❌ What Needs to Change
1. **Order Retrieval Logic**: Currently only shows "orders I'm selling"
2. **Payment Method**: Need to add wallet as payment option
3. **Orders Filter**: Need "Purchases" vs "Sales" distinction
4. **Order Display**: Need different UI for purchases vs sales

---

## Database Schema Analysis

### Current Order Schema (No changes needed!)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,        // Buyer's user ID ✅ WORKS FOR ARTISANS
  artisan: ObjectId,       // Seller's artisan ID ✅ ALREADY EXISTS
  items: Array,
  totalAmount: Number,
  status: String,
  deliveryMethod: String,
  deliveryAddress: Object,
  paymentMethod: String,   // ✅ CAN ADD "wallet" here
  paymentStatus: String,
  // ... other fields
}
```

**Key Insight**: 
- `userId` = WHO IS BUYING (patron or artisan)
- `artisan` = WHO IS SELLING
- No schema changes needed! ✅

### Current User Schema (No changes needed!)
```javascript
{
  _id: ObjectId,
  email: String,
  role: String,           // "patron" or "artisan" ✅
  walletBalance: Number,  // ✅ ALREADY EXISTS
  artisan: ObjectId,      // Link to artisan collection ✅
  // ... other fields
}
```

---

## Implementation Plan

### Phase 1: Backend Changes

#### 1.1 Update Order Retrieval Logic
**File**: `backend/routes/orders/index.js`

**Current Logic** (Artisan Orders):
```javascript
// Gets orders WHERE artisan = currentUser.artisanId
// This shows "orders I'm selling"
```

**New Logic Needed**:
```javascript
// Option 1: Get orders WHERE artisan = currentUser.artisanId (SALES)
// Option 2: Get orders WHERE userId = currentUser._id (PURCHASES)
// Add query parameter: ?type=sales or ?type=purchases
```

**Proposed API Endpoints**:
```
GET /api/orders?type=sales       // Orders I'm selling (existing)
GET /api/orders?type=purchases   // Orders I bought (new)
GET /api/orders?type=all         // Both (for overview)
```

#### 1.2 Add Wallet Payment Method
**File**: `backend/routes/orders/index.js` - `confirmPaymentAndCreateOrder()`

**Current Payment Methods**:
- Stripe
- PayPal (if configured)

**Add Wallet Payment**:
```javascript
if (paymentMethod === 'wallet') {
  // 1. Check user's wallet balance
  const walletService = new WalletService(db);
  const walletBalance = await walletService.getWalletBalance(userId);
  
  // 2. Verify sufficient funds
  if (walletBalance.balance < totalAmount) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient wallet balance'
    });
  }
  
  // 3. Deduct funds
  await walletService.deductFunds(
    userId,
    totalAmount,
    `Purchase - Order #${orderId}`,
    { orderId, orderNumber: orderId.slice(-8) }
  );
  
  // 4. Mark payment as completed
  paymentStatus = 'paid';
  paymentIntentId = `wallet_${Date.now()}`;
}
```

#### 1.3 Revenue Distribution (Already Exists!)
The existing wallet credit system will work:
- When order completes → artisan gets revenue
- This already handles artisan-to-artisan purchases
- No changes needed! ✅

---

### Phase 2: Frontend Changes

#### 2.1 Add Wallet Payment Option
**File**: `frontend/src/components/Cart.jsx`

**Add Payment Method Selection**:
```jsx
{/* For Artisans Only */}
{userRole === 'artisan' && walletBalance >= totalAmount && (
  <div className="payment-method-option">
    <input
      type="radio"
      id="wallet"
      name="paymentMethod"
      value="wallet"
      checked={paymentMethod === 'wallet'}
      onChange={() => setPaymentMethod('wallet')}
    />
    <label htmlFor="wallet">
      💰 Pay with Wallet Balance
      <span>Current Balance: ${walletBalance.toFixed(2)}</span>
    </label>
  </div>
)}
```

#### 2.2 Update Orders Page Filters
**File**: `frontend/src/components/Orders.jsx`

**Current Artisan Filters**:
- Active Orders
- Needs Action
- In Progress
- All Orders

**Add New Filter**:
```jsx
{userRole === 'artisan' && (
  <>
    <button onClick={() => setOrderType('sales')}>
      📦 Sales (Orders I'm Selling)
    </button>
    <button onClick={() => setOrderType('purchases')}>
      🛍️ Purchases (Orders I Bought)
    </button>
  </>
)}
```

#### 2.3 Dual Order Display Logic
```jsx
const loadOrders = async () => {
  if (userRole === 'artisan') {
    if (orderType === 'sales') {
      // Load orders where I'm the seller
      const salesOrders = await orderService.getArtisanOrders();
    } else if (orderType === 'purchases') {
      // Load orders where I'm the buyer
      const purchaseOrders = await orderService.getUserOrders();
    }
  } else {
    // Patrons only see their purchases
    const orders = await orderService.getUserOrders();
  }
};
```

#### 2.4 Order Card Display
**Different UI based on order type**:

**Sales Orders** (I'm selling):
- Show buyer information
- Show order actions: Confirm, Prepare, Mark Ready, etc.
- Display "Order from [Buyer Name]"

**Purchase Orders** (I bought):
- Show seller information  
- Show patron actions: Confirm Receipt, Cancel
- Display "Order from [Artisan Name]"
- Behaves like patron orders

---

### Phase 3: Order Service Updates

#### 3.1 Add Purchase Orders Endpoint
**File**: `frontend/src/services/orderService.js`

```javascript
// New method
getArtisanPurchases: async () => {
  const response = await orderApi.get('/orders?type=purchases');
  return response.data;
},

// Existing method (rename for clarity)
getArtisanSales: async () => {
  const response = await orderApi.get('/orders?type=sales');
  return response.data;
},
```

---

## Database Fields Summary

### ✅ No New Fields Needed!

**Existing fields that enable artisan shopping**:
1. `orders.userId` - Buyer (can be patron OR artisan)
2. `orders.artisan` - Seller (artisan collection reference)
3. `orders.paymentMethod` - Can add "wallet" as a value
4. `users.walletBalance` - Already exists
5. `users.role` - Already distinguishes "artisan" vs "patron"
6. `users.artisan` - Links user to artisan profile

**Query Logic**:
```javascript
// Artisan Sales: Orders where I'm selling
db.orders.find({ artisan: currentArtisanId })

// Artisan Purchases: Orders where I'm buying
db.orders.find({ userId: currentUserId })
```

---

## User Experience Flow

### Artisan Shopping Journey

1. **Browse Products**
   - Artisan logs in
   - Views product catalog
   - Cannot see their own products in results ✅ (already works)

2. **Add to Cart**
   - Clicks "Add to Cart"
   - System checks: is this my product? ✅ (already works)
   - If not mine → add to cart
   - If mine → show error ✅ (already works)

3. **Checkout**
   - Views cart
   - Fills delivery information
   - Selects payment method:
     - Credit Card (Stripe)
     - **💰 Wallet** (NEW - if sufficient balance)

4. **Payment with Wallet**
   - Selects wallet payment
   - Shows current balance
   - Shows amount to be deducted
   - Confirms purchase
   - Wallet balance reduced immediately
   - Order created with `paymentMethod: "wallet"`

5. **View Orders**
   - Goes to Orders page
   - Sees TWO tabs:
     - **📦 Sales**: Orders customers placed with me
     - **🛍️ Purchases**: Orders I placed with other artisans
   - Sales orders: show artisan actions (Confirm, Prepare, etc.)
   - Purchase orders: show patron actions (Confirm Receipt, Cancel)

6. **Track Purchase**
   - Purchase order behaves exactly like patron order
   - Can cancel if still pending
   - Must confirm receipt when delivered
   - Triggers wallet credit to selling artisan on completion

---

## Security Considerations

### 1. Prevent Self-Purchase
✅ Already implemented in `cartService.js` lines 168-196

### 2. Wallet Balance Validation
```javascript
// Backend validation
if (paymentMethod === 'wallet') {
  const balance = await walletService.getWalletBalance(userId);
  if (balance < totalAmount) {
    throw new Error('Insufficient funds');
  }
}
```

### 3. Role-Based Access
```javascript
// Only artisans can use wallet payment
if (paymentMethod === 'wallet' && userRole !== 'artisan') {
  throw new Error('Wallet payment only available for artisans');
}
```

### 4. Transaction Integrity
- Use database transactions for wallet deduction + order creation
- Rollback if either step fails
- Prevent race conditions with wallet balance

---

## Testing Checklist

### Backend Tests
- [ ] Artisan can retrieve purchase orders
- [ ] Artisan can retrieve sales orders  
- [ ] Wallet payment validation (sufficient funds)
- [ ] Wallet payment validation (insufficient funds)
- [ ] Wallet balance deduction on order creation
- [ ] Transaction record created for wallet payment
- [ ] Prevent wallet payment for non-artisans
- [ ] Revenue credit to seller on order completion

### Frontend Tests
- [ ] Wallet payment option shows for artisans
- [ ] Wallet balance displays correctly
- [ ] Insufficient balance disables wallet option
- [ ] Sales/Purchases filter works
- [ ] Sales orders show correct UI (seller view)
- [ ] Purchase orders show correct UI (buyer view)
- [ ] Order actions appropriate for each type
- [ ] Cannot add own products to cart

### Integration Tests
- [ ] End-to-end artisan purchase flow
- [ ] Wallet deduction + order creation atomic
- [ ] Both artisans see their respective views
- [ ] Wallet credit to seller on completion
- [ ] Email notifications sent to both parties

---

## Migration/Deployment Notes

### No Database Migration Needed! ✅
- All required fields already exist
- Just need to add "wallet" as a payment method value
- Existing orders remain unchanged

### Deployment Steps
1. Deploy backend changes (order retrieval logic)
2. Deploy frontend changes (wallet payment UI)
3. Test with staging data
4. Deploy to production
5. Monitor wallet transactions

---

## Summary

### What Makes This Simple:
1. ✅ **No database schema changes**
2. ✅ **Cart system already works for artisans**
3. ✅ **Wallet system already exists**
4. ✅ **Order schema supports artisan buyers**
5. ✅ **Self-purchase prevention already implemented**

### What Needs Implementation:
1. ❌ Order query logic (sales vs purchases)
2. ❌ Wallet payment method in checkout
3. ❌ Frontend: Sales/Purchases filter
4. ❌ Frontend: Different UI for purchase orders
5. ❌ Frontend: Wallet balance display

### Estimated Effort:
- **Backend**: 4-6 hours
- **Frontend**: 6-8 hours
- **Testing**: 3-4 hours
- **Total**: ~15 hours

---

## Questions for Review

1. **Should wallet payment be ONLY for artisans, or also for patrons?**
   - Recommendation: Artisans only (they have revenue to spend)

2. **Should artisans see a combined view or always separate Sales/Purchases?**
   - Recommendation: Separate tabs with ability to see "All"

3. **Should there be a minimum wallet balance requirement?**
   - Recommendation: No minimum, just must cover order total

4. **Should failed wallet payments retry automatically?**
   - Recommendation: No auto-retry, user must reinitiate

5. **Do we need additional fields for better tracking?**
   - Current assessment: No, existing fields sufficient
   - **REVIEW THIS SECTION** - any fields you want to add?


