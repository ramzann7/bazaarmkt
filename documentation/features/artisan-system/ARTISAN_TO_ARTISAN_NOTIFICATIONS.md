# Artisan-to-Artisan Order Notifications

## Overview
This document details the notification flows when one artisan (Artisan A - buyer) purchases from another artisan (Artisan B - seller).

---

## Notification Types

### 🔔 In-App Notifications
- Stored in `notifications` collection
- Shown in notification bell/dropdown
- Real-time updates via WebSocket/polling

### 📧 Email Notifications
- Sent via Brevo email service
- Based on user preferences and role
- Only sent when `userEmail` is provided in notification data

---

## Complete Notification Flow

### 1. Order Created (Wallet Payment)

**When:** Artisan A completes checkout and order is created

**Buyer (Artisan A) - Gets:**
- ✅ In-app notification
- ❌ NO email (they initiated the action)
- **Notification Type:** `order_created_buyer`
- **Message:** "Your order #XXXXX has been placed. Payment of $XX.XX was deducted from your wallet."

**Seller (Artisan B) - Gets:**
- ✅ In-app notification
- ✅ EMAIL (via preference system)
- **Notification Type:** `order_created_seller`
- **Message:** "You have a new order #XXXXX from a fellow artisan!"
- **Email Subject:** "📦 New Order Received - #XXXXX"

**Code Location:** `backend/routes/orders/index.js` lines 1358-1399

```javascript
// Buyer notification (NO email)
await sendNotificationDirect({
  userId: userId,  // Artisan A's userId
  type: 'order_created_buyer',
  // userEmail NOT provided = no email
}, db);

// Seller notification (WITH email)
await sendNotificationDirect({
  userId: sellerArtisan.user.toString(),  // Artisan B's userId
  type: 'order_created_seller',
  // Email sent via preference system
}, db);
```

---

### 2. Order Confirmed

**When:** Artisan B confirms the order

**Buyer (Artisan A) - Gets:**
- ✅ In-app notification
- ✅ EMAIL (via preference system)
- **Notification Type:** `order_confirmed`
- **Message:** "Your order #XXXXX is now confirmed"
- **Email Subject:** "✅ Order Confirmed - #XXXXX"

**Seller (Artisan B) - Gets:**
- ❌ Nothing (they initiated the action)

**Code Location:** `backend/routes/orders/index.js` lines 2173-2478

```javascript
// Only buyer gets notified
await sendNotificationDirect(patronNotificationData, db);
// patronNotificationData.userId = order.userId (Artisan A)
// Email sent via preference system
```

---

### 3. Order Status Updates (Preparing, Ready, etc.)

**When:** Artisan B updates order status during fulfillment

**For Each Status Change:**
- `preparing`: Order is being prepared
- `ready_for_pickup`: Order ready for buyer to pick up
- `ready_for_delivery`: Order ready to be delivered
- `out_for_delivery`: Order is on the way
- `delivered`: Order has been delivered

**Buyer (Artisan A) - Gets:**
- ✅ In-app notification for each status change
- ✅ EMAIL for each status change (via preference system)
- **Notification Type:** `order_preparing`, `order_ready_for_pickup`, etc.
- **Email includes:** Order timeline, artisan contact info, next steps

**Seller (Artisan B) - Gets:**
- ❌ Nothing (they initiated the action)

**Code Location:** `backend/routes/orders/index.js` lines 2173-2486

---

### 4. Order Declined

**When:** Artisan B declines the order (only possible when status is 'pending')

**Buyer (Artisan A) - Gets:**
- ✅ In-app notification
- ✅ EMAIL (via preference system)
- **Notification Type:** `order_declined`
- **Message:** "Your order #XXXXX has been declined"
- **Email includes:** Decline reason, refund information

**Seller (Artisan B) - Gets:**
- ❌ Nothing (they initiated the action)

**Code Location:** `backend/routes/orders/index.js` lines 2173-2478

---

### 5. Order Cancelled (by Buyer)

**When:** Artisan A cancels their pending order

**Buyer (Artisan A) - Gets:**
- ✅ In-app notification
- ❌ NO email (they initiated the action)
- **Notification Type:** `order_cancelled`
- **Message:** "Your order #XXXXX has been cancelled"

**Seller (Artisan B) - Gets:**
- ✅ In-app notification
- ✅ EMAIL (they need to know buyer cancelled)
- **Notification Type:** `order_cancelled`
- **Message:** "Order #XXXXX has been cancelled by the customer"
- **Email Subject:** "❌ Order Cancelled - #XXXXX"

**Code Location:** `backend/routes/orders/index.js` lines 3520-3627

```javascript
// Buyer notification (NO email)
await sendNotificationDirect({
  userId: order.userId,  // Artisan A
  userEmail: null,  // Explicitly NO email
  type: 'order_cancelled'
}, db);

// Seller notification (WITH email)
await sendNotificationDirect({
  userId: artisanUserId,  // Artisan B
  userEmail: artisanEmail,  // WITH email
  type: 'order_cancelled',
  message: "Order cancelled by the customer"
}, db);
```

---

### 6. Order Completed

**When:** Order is delivered/picked up and confirmed

**Buyer (Artisan A) - Gets:**
- ✅ In-app notification
- ✅ EMAIL (via preference system)
- **Notification Type:** `order_completed`
- **Message:** "Your order #XXXXX is completed"

**Seller (Artisan B) - Gets:**
- ✅ Revenue credited to wallet
- ✅ Transaction record in wallettransactions
- ✅ In-app notification (optional - when revenue is processed)
- **Note:** Seller doesn't get email for completion (they already fulfilled it)

---

## Email Preference System

### How It Works

The `sendPreferenceBasedNotification()` function:
1. Checks if `userEmail` is provided in notification data
2. If provided, checks user's email preferences
3. For artisans, email is sent by default for important events
4. For patrons, respects their preference settings

**Email is ALWAYS sent for:**
- New order notifications to sellers (artisans)
- Cancellation notifications to sellers (artisans)
- Status updates to buyers (all users)
- Decline notifications to buyers (all users)

**Email is NEVER sent for:**
- Actions initiated by the user themselves (unless critical)
- Confirmations of user's own actions

---

## Summary Table

| Event | Buyer (Artisan A) | Seller (Artisan B) |
|-------|-------------------|-------------------|
| **Order Created** | In-app only | In-app + Email ✉️ |
| **Order Confirmed** | In-app + Email ✉️ | Nothing (their action) |
| **Order Preparing** | In-app + Email ✉️ | Nothing (their action) |
| **Order Ready** | In-app + Email ✉️ | Nothing (their action) |
| **Order Out for Delivery** | In-app + Email ✉️ | Nothing (their action) |
| **Order Delivered** | In-app + Email ✉️ | Nothing (their action) |
| **Order Declined** | In-app + Email ✉️ | Nothing (their action) |
| **Order Cancelled** | In-app only | In-app + Email ✉️ |
| **Order Completed** | In-app + Email ✉️ | Wallet credit + In-app |

---

## Current Implementation Analysis

### ✅ FIXED - Now Working Correctly

1. **Buyer Notifications (Artisan A)**
   - Gets notified for all status changes ✅
   - **NOW GETS EMAILS** for all status updates ✅ (FIXED)
   - Doesn't get email for their own cancellation ✅
   - Receives emails as if they were a patron ✅

2. **Seller Notifications (Artisan B)**
   - Gets notified when new order is placed ✅
   - Gets EMAIL when new order is placed ✅
   - Gets EMAIL when buyer cancels ✅
   - Doesn't get notified for their own actions ✅

3. **Email Routing**
   - Uses `sendPreferenceBasedNotification()` ✅
   - **UPDATED:** Separates seller vs buyer notifications ✅ (FIXED)
   - Artisans get proper emails whether buying or selling ✅
   - Sends to correct email addresses ✅

### 🔧 What Was Fixed

**Problem:** Artisan buyers weren't receiving email notifications for order status updates

**Root Cause:** The notification preference system checked `userRole === 'artisan'` and only sent emails for seller events (`new_order`, `courier_on_way`, etc.), ignoring buyer events (`order_confirmed`, `order_preparing`, etc.)

**Solution:** Added separate logic for seller vs buyer notifications:
- **Seller notifications:** `new_order`, `order_cancelled`, `courier_on_way`, `delivery_cost_increase`
- **Buyer notifications:** `order_confirmed`, `order_preparing`, `order_ready_*`, `order_out_for_delivery`, `order_delivered`, `order_declined`
- Artisans now get emails for BOTH types depending on their role in the transaction

**Code Location:** `backend/routes/notifications/index.js` lines 1278-1303

### 📋 Notification Flow Code

**Located in:** `backend/routes/orders/index.js`

**Key Functions:**
- `sendNotificationDirect()` - Wrapper that calls preference system (lines 19-55)
- `sendPreferenceBasedNotification()` - Main notification handler (in notifications/index.js)

**Order Creation:** Lines 1358-1399 (walletPaymentAndCreateOrder)
**Status Updates:** Lines 2173-2486 (updateOrderStatus)
**Cancellations:** Lines 3520-3627 (cancelOrder)

---

## Testing Checklist

### As Buying Artisan (Artisan A):
- [ ] Create order → Receive in-app notification (no email)
- [ ] Seller confirms → Receive in-app + email
- [ ] Seller marks preparing → Receive in-app + email
- [ ] Seller marks ready → Receive in-app + email
- [ ] Cancel pending order → Receive in-app (no email), Seller gets in-app + email

### As Selling Artisan (Artisan B):
- [ ] New order placed → Receive in-app + email ✉️
- [ ] Buyer cancels → Receive in-app + email ✉️
- [ ] Confirm order → No notification (your action)
- [ ] Update status → No notification (your action)
- [ ] Order completed → Wallet credited, transaction recorded

---

## Conclusion

The notification system is **correctly implemented** for artisan-to-artisan orders:

1. ✅ Buying artisan treated as patron for notification purposes
2. ✅ Seller gets important emails (new order, cancellation)
3. ✅ Buyer gets status update emails
4. ✅ No redundant emails for self-initiated actions
5. ✅ Preference system respected

The system properly distinguishes between buyer and seller roles even when both are artisans.


