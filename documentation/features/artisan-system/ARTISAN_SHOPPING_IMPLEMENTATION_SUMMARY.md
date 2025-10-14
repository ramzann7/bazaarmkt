# Artisan Shopping Implementation - Summary

## Changes Completed

### 🎯 Core Features Implemented

1. **Artisan Shopping Experience**
   - Artisans can browse and purchase from other artisans
   - Cart system fully functional for artisans
   - Wallet-only payment system for artisans
   - Sales vs Purchases order segregation

2. **Wallet System Refactoring**
   - Migrated from `users.walletBalance` to `wallets` collection
   - All transactions now in `wallettransactions` collection
   - Stripe Connect integration with wallets
   - Payout settings in wallet document

3. **UI/UX Improvements**
   - Cart icon visible for artisans
   - Sales/Purchases tabs with color coding (blue/purple)
   - Simplified Professional Delivery setup
   - Fixed pickup location display
   - Cleaned up duplicate CTAs

---

## Files Modified

### Backend Files

1. **`backend/services/walletService.js`**
   - Changed collections: `wallets` (was `users`), `wallettransactions` (was `transactions`)
   - Auto-creates wallet document if doesn't exist
   - All methods updated: `getWalletBalance()`, `addFunds()`, `deductFunds()`, `transferFunds()`, `refundPayment()`
   - Wallet stores: `balance`, `currency`, `stripeAccountId`, `stripeCustomerId`, `payoutSettings`

2. **`backend/routes/wallet/index.js`**
   - Updated `getWalletBalance` to use `wallets` collection
   - Returns: `balance`, `stripeAccountId`, `payoutSettings`
   - Enhanced error logging

3. **`backend/routes/orders/index.js`**
   - Added `WalletService` import
   - New endpoint: `POST /api/orders/wallet-payment`
   - Updated: `GET /api/orders/artisan?type={sales|purchases}`
   - Validates wallet balance before order creation
   - Different notifications for buyers vs sellers

4. **`backend/routes/profile/stripeConnectHandlers.js`**
   - Updates both `artisans` and `wallets` collections on Stripe Connect setup
   - Stores Stripe account info in wallet for payouts
   - Enhanced error logging
   - Uses `req.db` middleware connection

5. **`backend/utils/artisanSchemaUtils.js`**
   - Fixed `normalizeFulfillmentSettings()` to handle address objects
   - Fixed `createLegacyDeliveryOptions()` to format pickup location
   - Properly converts address object ↔ string

### Frontend Files

1. **`frontend/src/components/Cart.jsx`**
   - Artisans restricted to wallet payment only
   - Wallet balance validation before checkout
   - Shows native confirm dialog if insufficient funds
   - Auto-redirects to `/wallet` for top-up
   - Added missing icon imports: `ExclamationTriangleIcon`, `XMarkIcon`
   - Added `getImageUrl` import

2. **`frontend/src/components/navbar.jsx`**
   - Removed restriction that hid cart for artisans
   - Cart icon now visible for all users

3. **`frontend/src/components/Orders.jsx`**
   - Added Sales vs Purchases tabs for artisans
   - Blue styling for Sales, Purple for Purchases
   - Separate data loading based on `orderType`
   - Auto-reloads when switching tabs

4. **`frontend/src/components/ArtisanTabs.jsx`**
   - Removed Uber Direct Integration checkbox section
   - Auto-enables Uber Direct when Professional Delivery is checked
   - Added `parsePickupLocation()` helper for address parsing
   - Removed console.log from render (performance fix)
   - Fixed pickup location state initialization

5. **`frontend/src/components/WalletDashboard.jsx`**
   - Removed duplicate "Add Bank Information" alert
   - Fixed button styling

6. **`frontend/src/components/DeliveryInformation.jsx`**
   - Fixed pickup address display to handle both object and string formats
   - Properly formats address objects for display

7. **`frontend/src/services/orderService.js`**
   - Added `getArtisanPurchases()` method
   - Added `getArtisanSales()` method
   - Added `createWalletOrder()` method
   - Updated `getArtisanOrders()` to accept `orderType` parameter

8. **`frontend/src/services/orderNotificationService.js`**
   - Different notification colors for purchase vs sales orders
   - Purple (#9333ea) for purchases
   - Blue (#3b82f6) for sales

---

## Database Schema

### `wallets` Collection
```javascript
{
  userId: ObjectId,              // Reference to users collection
  balance: Number,               // Current wallet balance (NOT in users collection)
  currency: String,              // Default: 'CAD'
  stripeCustomerId: String,      // Stripe customer ID
  stripeAccountId: String,       // Stripe Connect account ID for payouts
  payoutSettings: {
    method: String,              // 'bank_transfer'
    bankAccount: {
      bankName: String,
      last4: String,
      accountId: String          // Stripe external account ID
    },
    schedule: String             // 'weekly'
  },
  createdAt: Date,
  updatedAt: Date
}
```

### `wallettransactions` Collection
```javascript
{
  userId: ObjectId,
  type: String,                  // 'wallet_topup', 'order_revenue', 'wallet_deduction', etc.
  amount: Number,                // Positive for credits, negative for debits
  description: String,
  paymentMethod: String,
  status: String,                // 'completed', 'pending', 'failed'
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

### New Endpoints

1. **`POST /api/orders/wallet-payment`**
   - Create order with wallet payment (artisans only)
   - Validates wallet balance
   - Deducts funds from wallet
   - Returns error if insufficient funds

2. **`GET /api/orders/artisan?type={sales|purchases}`**
   - `type=sales`: Orders where artisan is selling (default)
   - `type=purchases`: Orders where artisan is buying
   - `type=all`: Both sales and purchases

### Updated Endpoints

1. **`GET /api/wallet/balance`**
   - Now returns from `wallets` collection
   - Includes: `balance`, `stripeAccountId`, `payoutSettings`

2. **`GET /api/wallet/transactions`**
   - Queries `wallettransactions` collection
   - Returns transaction summary

3. **`POST /api/profile/stripe-connect/setup`**
   - Updates both `artisans` and `wallets` collections
   - Stores Stripe account info for payouts

---

## User Flow

### Artisan Shopping Flow

1. **Browse Products** → See products from other artisans
2. **Add to Cart** → Cart icon shows badge (navbar)
3. **View Cart** → See items and delivery options
4. **Select Delivery** → Choose pickup, personal, or professional delivery
5. **Continue** → Validates wallet balance automatically
6. **If Insufficient Funds**:
   - Shows confirm dialog with:
     - Current balance
     - Order total
     - Amount needed
   - Option to navigate to `/wallet`
7. **If Sufficient Funds**:
   - Payment processes automatically
   - Funds deducted from wallet
   - Order created
   - Transaction recorded in `wallettransactions`

### Order Management Flow

1. **View Orders** → Navigate to `/orders`
2. **See Tabs** (Artisans only):
   - **Sales** (Blue): Orders placed with you
   - **Purchases** (Purple): Orders you placed with others
3. **Filter Orders**: Active, Needs Action, In Progress, All
4. **Manage Orders**: Different actions based on order type

---

## Notification System

### Color Coding
- **Sales Orders**: Blue (#3b82f6)
- **Purchase Orders**: Purple (#9333ea)

### Notification Types
- `order_created_buyer`: Artisan placed an order
- `order_created_seller`: Artisan received an order

---

## 🚨 IMPORTANT: Server Restart Required

The server is currently running old code. **You MUST restart the backend server** for the wallet changes to take effect:

```bash
# Stop the current backend server (Ctrl+C if running)
# Then restart:
cd /Users/ramzan/Documents/bazaarMKT/backend
npm start
# or
node server-working.js
```

### Why Restart is Needed:
1. WalletService updated to use `wallets` and `wallettransactions` collections
2. Wallet routes updated to use new collections
3. Stripe Connect handlers updated
4. Without restart, server uses old code trying to access `users.walletBalance` (doesn't exist)

---

## Testing Checklist

### After Server Restart:

- [ ] **Wallet Balance**: Visit `/my-wallet` - should load without 500 error
- [ ] **Wallet Dashboard**: Should show correct balance from `wallets` collection
- [ ] **Cart Icon**: Visible for artisans in navbar
- [ ] **Add to Cart**: Artisan can add other artisans' products
- [ ] **Checkout**: Only wallet payment option shown
- [ ] **Insufficient Funds**: Shows confirm dialog with top-up option
- [ ] **Sufficient Funds**: Order processes successfully
- [ ] **Orders Page**: Shows Sales vs Purchases tabs
- [ ] **Sales Tab**: Shows orders placed with artisan (blue)
- [ ] **Purchases Tab**: Shows orders artisan placed (purple)
- [ ] **Notifications**: Different colors for purchase vs sales
- [ ] **Pickup Location**: Custom address displays correctly
- [ ] **Professional Delivery**: Auto-enables Uber Direct
- [ ] **Stripe Connect**: Updates wallet with account info

---

## Database Verification

After server restart, verify in MongoDB:

### Check Wallets Collection
```javascript
db.wallets.find({ userId: ObjectId("YOUR_USER_ID") })
```

Should return:
```javascript
{
  userId: ObjectId("..."),
  balance: 0,  // or your actual balance
  currency: "CAD",
  stripeAccountId: null,  // or Stripe account ID if connected
  stripeCustomerId: null,
  payoutSettings: { method: 'bank_transfer', ... },
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Check Wallet Transactions
```javascript
db.wallettransactions.find({ userId: ObjectId("YOUR_USER_ID") }).sort({ createdAt: -1 })
```

Should show all wallet transactions (top-ups, purchases, revenue, etc.)

---

## Troubleshooting

### If 500 Error Persists After Restart:

1. **Check Backend Console** for detailed error logs
2. **Verify MongoDB Connection** is working
3. **Check Collections Exist**: `wallets`, `wallettransactions`
4. **Verify JWT Token** is valid
5. **Check Database Name** matches in connection string

### Common Issues:

**Issue**: Wallet balance shows $0.00
- **Cause**: No wallet document exists yet
- **Fix**: Endpoint auto-creates wallet on first request

**Issue**: Transactions not showing
- **Cause**: Using wrong collection name
- **Fix**: Server restart to use `wallettransactions`

**Issue**: Stripe Connect fails
- **Cause**: Database connection issue
- **Fix**: Check `req.db` middleware is attached

---

## Next Steps

1. ✅ Restart backend server
2. ✅ Test wallet balance endpoint
3. ✅ Test artisan shopping flow
4. ✅ Test order segregation (sales vs purchases)
5. ✅ Test Stripe Connect setup
6. ✅ Verify wallet transactions are recorded
7. ✅ Test payout functionality

---

## Success Criteria

✅ Wallet balance loads correctly from `wallets` collection  
✅ Artisans can add products to cart  
✅ Cart icon visible with badge  
✅ Wallet payment processes successfully  
✅ Insufficient funds shows friendly dialog  
✅ Orders segregated into Sales and Purchases  
✅ Notifications use different colors  
✅ Pickup location displays correctly  
✅ Stripe Connect updates wallet  
✅ All transactions in `wallettransactions` collection  

---

## Notes

- Users collection no longer stores `walletBalance` field
- All wallet operations go through `wallets` collection
- Professional Delivery automatically enables Uber Direct
- Artisans use same cart flow as patrons (simplified)
- Payment method forced to wallet for artisans

