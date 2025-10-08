# Email Notification Flow - Complete Reference

## Date: October 8, 2025

## Order Status Flow

### Complete Order Lifecycle

```
1. ORDER PLACED (Patron)
   Status: pending
   Type: order_placed
   ↓
2. ARTISAN CONFIRMS
   Status: pending → confirmed  
   Type: order_confirmed
   ↓
3. ARTISAN STARTS PREPARING
   Status: confirmed → preparing
   Type: order_preparing
   ↓
4. ORDER READY
   Status: preparing → ready_for_pickup OR ready_for_delivery
   Type: order_ready_for_pickup OR order_ready_for_delivery
   ↓
5. DELIVERY/PICKUP
   Status: ready_for_pickup → picked_up OR ready_for_delivery → out_for_delivery → delivered
   Type: order_out_for_delivery OR order_completed
   ↓
6. PATRON CONFIRMS RECEIPT
   Status: picked_up/delivered → completed
   Type: order_completed
```

---

## Email Notifications Configuration

### Patron (Customer) Email Notifications

**When Patron RECEIVES emails:**

| Event | Status | Type | Email Sent? |
|-------|--------|------|-------------|
| Order placed | `pending` | `order_placed` | ✅ YES |
| Artisan confirms | `confirmed` | `order_confirmed` | ✅ YES |
| Artisan declines | `declined` | `order_declined` | ✅ YES |
| Ready for pickup | `ready_for_pickup` | `order_ready_for_pickup` | ✅ YES |
| Ready for delivery | `ready_for_delivery` | `order_ready_for_delivery` | ✅ YES |
| Out for delivery | `out_for_delivery` | `order_out_for_delivery` | ✅ YES |
| Delivered | `delivered` | `order_completed` | ✅ YES |
| Picked up | `picked_up` | `order_completed` | ✅ YES |
| Completed | `completed` | `order_completed` | ✅ YES |
| Preparing | `preparing` | `order_preparing` | ⚠️ PLATFORM NOTIFICATION ONLY (no email to avoid spam) |

**Allowed Statuses for Patron Emails:**
```javascript
['pending', 'confirmed', 'declined', 'out_for_delivery', 'ready_for_pickup', 'ready_for_delivery', 'delivered', 'picked_up', 'completed']
```

**Allowed Types for Patron Emails:**
```javascript
['order_placed', 'order_completion', 'order_confirmed', 'order_declined', 'order_ready', 'order_completed', 'order_ready_for_pickup', 'order_ready_for_delivery', 'order_out_for_delivery']
```

### Artisan Email Notifications

**When Artisan RECEIVES emails:**

| Event | Type | Email Sent? |
|-------|------|-------------|
| New order pending | `new_order_pending` | ✅ YES |
| Order confirmed by artisan | `order_confirmation_sent` | ✅ YES (confirmation receipt) |
| Order completed | `order_status_update` | ✅ YES |
| Order delivered/picked up | `order_status_update` | ✅ YES |

**Allowed Types for Artisan Emails:**
```javascript
['new_order_pending', 'order_confirmation_sent', 'order_status_update']
```

---

## Backend Email Configuration

### File: `backend/routes/orders/index.js`

#### Line 31-32: Email Filtering Lists
```javascript
const patronEmailStatuses = [
  'pending',              // Order placed
  'confirmed',            // Artisan confirmed
  'declined',             // Artisan declined
  'out_for_delivery',     // Out for delivery
  'ready_for_pickup',     // Ready for pickup
  'ready_for_delivery',   // Ready for delivery
  'delivered',            // Delivered
  'picked_up',            // Picked up
  'completed'             // Completed
];

const patronEmailTypes = [
  'order_placed',             // Initial order
  'order_completion',         // Order completed
  'order_confirmed',          // Artisan confirmed
  'order_declined',           // Artisan declined
  'order_ready',              // Order ready
  'order_completed',          // Order completed
  'order_ready_for_pickup',   // Ready for pickup
  'order_ready_for_delivery', // Ready for delivery
  'order_out_for_delivery'    // Out for delivery
];
```

#### Line 59-60: Artisan Email Types
```javascript
const artisanEmailTypes = [
  'new_order_pending',         // New order received
  'order_confirmation_sent',   // Artisan confirmed order
  'order_status_update'        // Status updates
];
```

#### Line 34-37: Email Allow Logic
```javascript
const isPatronEmailAllowed = 
  notificationData.userInfo?.isGuest || 
  !notificationData.userId || 
  patronEmailStatuses.includes(notificationData.status) ||
  patronEmailTypes.includes(notificationData.type);
```

---

## Email Flow for Each Event

### 1. Patron Places Order (Status: pending)

**Backend: Lines 790-852**
```javascript
// Fetch patron email from database
const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

const customerNotificationData = {
  type: 'order_placed',          // ← Triggers email
  userId: userId,
  userEmail: user.email,         // ← Email address
  status: 'pending',             // ← In allowed list
  orderData: { ... }
};

await sendNotificationDirect(customerNotificationData, db);
```

**Artisan Also Notified:**
```javascript
const artisanNotificationData = {
  type: 'new_order_pending',     // ← Triggers email to artisan
  userId: artisan.user,
  userEmail: artisanUser.email,  // ← Artisan email
  orderData: { ... }
};

await sendNotificationDirect(artisanNotificationData, db);
```

**Result:**
- ✅ Patron receives: "Order Placed" email
- ✅ Artisan receives: "New Pending Order" email

---

### 2. Artisan Confirms Order (Status: pending → confirmed)

**Backend: Lines 1693-1774**
```javascript
// When artisan updates status to 'confirmed'
const finalStatus = 'confirmed';
const notificationType = 'order_confirmed';  // ← Triggers email

// Get patron email
const patronUserInfo = await usersCollection.findOne({ _id: updatedOrder.userId });

const patronNotificationData = {
  type: 'order_confirmed',       // ← In allowed types
  userId: updatedOrder.userId,
  userEmail: patronUserInfo.email,
  status: 'confirmed',           // ← In allowed statuses
  orderData: { ... }
};

await sendNotificationDirect(patronNotificationData, db);

// Also notify artisan
const artisanNotificationData = {
  type: 'order_confirmation_sent',  // ← Triggers confirmation receipt to artisan
  userId: artisan.user,
  userEmail: artisanUser.email,
  status: 'confirmed',
  orderData: { ... }
};

await sendNotificationDirect(artisanNotificationData, db);
```

**Result:**
- ✅ Patron receives: "Order Confirmed" email
- ✅ Artisan receives: "Order Confirmation Sent" receipt email

---

### 3. Order Ready for Pickup/Delivery

**Backend: Status Update Flow**
```javascript
// When artisan marks ready
const finalStatus = 'ready_for_pickup'; // or 'ready_for_delivery'
const notificationType = 'order_ready_for_pickup'; // or 'order_ready_for_delivery'

const patronNotificationData = {
  type: notificationType,        // ← In allowed types
  status: finalStatus,           // ← In allowed statuses
  userEmail: patronUserInfo.email
};
```

**Result:**
- ✅ Patron receives: "Ready for Pickup/Delivery" email
- ❌ Artisan does NOT receive email (not in artisanEmailTypes)

---

### 4. Order Completed

**Backend: Status Update Flow**
```javascript
// When patron confirms receipt
const finalStatus = 'completed';
const notificationType = 'order_completed';

// Notify patron
const patronNotificationData = {
  type: 'order_completed',       // ← In allowed types
  status: 'completed',           // ← In allowed statuses
  userEmail: patronUserInfo.email
};

// Notify artisan
const artisanNotificationData = {
  type: 'order_status_update',   // ← In artisan allowed types
  status: 'completed',
  userEmail: artisanUser.email
};
```

**Result:**
- ✅ Patron receives: "Order Completed" email
- ✅ Artisan receives: "Order Completed" notification email

---

## Critical Configuration Points

### 1. User Email Must Be Fetched (Lines 801-822)
```javascript
// For authenticated users, fetch their email from database
if (userId && !order.isGuestOrder) {
  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  
  if (user) {
    customerUserInfo = {
      email: user.email,  // ← CRITICAL: Must be set
      // ...
    };
  }
}
```

**Why:** The `userEmail` field is checked to determine if email should be sent.

### 2. Notification Type Must Match (Line 62)
```javascript
if (notificationData.userEmail && notificationData.type && (isPatronEmailAllowed || isArtisanEmail)) {
  // Send email
}
```

**Why:** Email only sent if:
- `userEmail` is present AND
- `type` is in allowed list OR
- Status is in allowed list

### 3. Backend Notification Service (backend/routes/notifications/index.js)

**Lines 1116-1125:**
```javascript
if (userRole === 'artisan') {
  // ARTISANS: Send email for NEW orders and pending orders
  shouldSendEmail = type === 'new_order' || type === 'new_order_pending';
} else if (userRole === 'patron' || userRole === 'customer' || userRole === 'buyer') {
  // PATRONS: Send email for all order status updates
  shouldSendEmail = type === 'order_completion' || type === 'order_placed' || 
                   type === 'order_declined' || type === 'order_confirmed' || 
                   type === 'order_preparing' || type === 'order_ready' || 
                   type === 'order_completed' || type === 'order_update';
}
```

---

## Testing Scenarios

### Scenario 1: Patron Places Order

**Expected Flow:**
1. ✅ Patron pays successfully
2. ✅ Order created with status = 'pending'
3. ✅ Backend fetches patron email from database
4. ✅ Notification sent with type = 'order_placed', userEmail = patron email
5. ✅ Email passes filter (type in allowed list)
6. ✅ Patron receives "Order Placed" email
7. ✅ Artisan receives "New Pending Order" email

**Log Output:**
```
✅ Retrieved user email for notifications: patron@example.com
📧 Email notification check: {
  hasUserEmail: true,
  type: 'order_placed',
  status: 'pending',
  isPatronEmailAllowed: true,
  userEmail: 'patron@example.com'
}
✅ Patron notification sent for order pending
✅ Artisan notification sent for new order
```

### Scenario 2: Artisan Confirms Order

**Expected Flow:**
1. ✅ Artisan clicks "Confirm" button
2. ✅ Status changes: 'pending' → 'confirmed'
3. ✅ Backend fetches patron email from database
4. ✅ Notification sent with type = 'order_confirmed', status = 'confirmed'
5. ✅ Email passes filter (both type and status in allowed lists)
6. ✅ Patron receives "Order Confirmed" email
7. ✅ Artisan receives "Order Confirmation Sent" receipt email

**Log Output:**
```
✅ Retrieved user email for notifications: patron@example.com
✅ Retrieved artisan email for notifications: artisan@example.com
📧 Email notification check: {
  hasUserEmail: true,
  type: 'order_confirmed',
  status: 'confirmed',
  isPatronEmailAllowed: true,
  userEmail: 'patron@example.com'
}
✅ Patron notification sent for order confirmed
✅ Artisan confirmation notification sent for order confirmed
```

---

## Troubleshooting

### Issue: Email Not Sent

**Check These Points:**

1. **User Email Fetched?**
   ```
   Look for log: "✅ Retrieved user email for notifications: xxx@example.com"
   If missing: User fetch failed or user has no email
   ```

2. **Notification Type Allowed?**
   ```
   Check log: "📧 Email notification check: { type: 'xxx', isPatronEmailAllowed: true/false }"
   If false: Type not in allowed list
   ```

3. **BREVO_API_KEY Set?**
   ```
   Look for log: "⚠️ BREVO_API_KEY not configured, skipping email"
   If present: Add API key to .env file
   ```

4. **Email Sent Successfully?**
   ```
   Look for log: "✅ Email sent to user xxx"
   If missing: Check Brevo service logs
   ```

### Common Fixes

**Problem:** `userEmail: undefined`
**Solution:** Ensure user fetch happens before notification (Lines 801-822)

**Problem:** Email filtered out
**Solution:** Add type/status to allowed lists (Lines 31-32)

**Problem:** Artisan not getting email
**Solution:** Add type to artisanEmailTypes (Line 59)

---

## Files Involved

### Backend
1. `backend/routes/orders/index.js`
   - Lines 18-100: sendNotificationDirect function
   - Lines 790-920: Order creation notifications
   - Lines 1668-1778: Order status update notifications

2. `backend/routes/notifications/index.js`
   - Lines 463-586: sendBrevoEmail function
   - Lines 1116-1141: Role-based email logic
   - Lines 321-460: Email HTML templates

### Frontend
1. `frontend/src/services/notificationService.js`
   - Lines 36-116: sendOrderCompletionNotification
   - Lines 119-170: sendOrderUpdateNotification

---

## Summary of Fixes Applied

### ✅ Fix 1: Fetch User Email (Lines 801-822)
**Before:** `userEmail: null` for authenticated users
**After:** Fetches email from database before sending notification

### ✅ Fix 2: Expand Email Filtering (Lines 31-32)
**Before:** Only sent emails for 'confirmed', 'declined', 'out_for_delivery'
**After:** Sends for all important statuses including 'pending' (order placement)

### ✅ Fix 3: Add Artisan Notifications (Lines 1731-1774)
**Before:** Only patron received confirmation emails
**After:** Both patron AND artisan receive emails on confirmation

### ✅ Fix 4: Include All Notification Types (Line 32)
**Before:** Missing some notification types
**After:** All order-related types included

---

## Testing Checklist

### Test 1: Order Placement
- [ ] Patron places order
- [ ] Check patron email inbox → "Order Placed" email
- [ ] Check artisan email inbox → "New Pending Order" email
- [ ] Both emails contain correct order details

### Test 2: Order Confirmation
- [ ] Artisan clicks "Confirm" on pending order
- [ ] Check patron email inbox → "Order Confirmed" email
- [ ] Check artisan email inbox → "Order Confirmation Sent" receipt
- [ ] Both emails show correct status

### Test 3: Order Declined
- [ ] Artisan declines order with reason
- [ ] Check patron email inbox → "Order Declined" email
- [ ] Email includes decline reason

### Test 4: Order Ready
- [ ] Artisan marks order as ready
- [ ] Check patron email inbox → "Ready for Pickup/Delivery" email
- [ ] Email includes pickup time or delivery estimate

### Test 5: Order Completed
- [ ] Patron confirms receipt
- [ ] Check patron email inbox → "Order Completed" email
- [ ] Check artisan email inbox → "Order Completed" notification

---

## Email Content Verification

Each email should include:
- ✅ Order number
- ✅ Order items with quantities and prices
- ✅ Total amount
- ✅ Delivery/pickup information
- ✅ Order timeline/progress tracker
- ✅ Next steps for customer/artisan
- ✅ Support contact information

---

## Status: READY FOR TESTING

All email notification fixes have been applied. The system should now send emails to both patrons and artisans at the appropriate times during the order lifecycle.

