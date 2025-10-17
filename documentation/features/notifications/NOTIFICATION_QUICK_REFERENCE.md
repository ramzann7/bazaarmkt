# Notification System - Quick Reference Guide

**Quick reference for developers working with the notification system**

---

## Quick Links

- 📚 [Full Documentation](./NOTIFICATION_SYSTEM_COMPLETE.md)
- 📧 [Email Notifications](./orders/EMAIL_NOTIFICATIONS_COMPLETE.md)
- 🔔 [Order Display](./orders/ORDER_DISPLAY_COMPLETE.md)

---

## Notification Types at a Glance

### Buyer/Patron Notifications
- `order_placed` - Initial order confirmation
- `order_confirmed` - Artisan accepted
- `order_preparing` - Being prepared
- `order_ready_for_pickup` - Ready to pickup
- `order_ready_for_delivery` - Ready for delivery
- `order_out_for_delivery` - In transit
- `order_picked_up` - Customer collected
- `order_delivered` - Successfully delivered
- `order_completed` - Order finalized
- `order_declined` - Artisan rejected
- `order_cancelled` - Order cancelled
- `delivery_refund` - Delivery cost refund

### Seller/Artisan Notifications
- `new_order_pending` - New order received
- `order_created_seller` - Wallet payment order
- `order_cancelled` - Buyer cancelled
- `delivery_cost_increase` - Uber cost exceeded
- `order_receipt_confirmed` - Customer confirmed delivery
- `courier_on_way` - Uber driver assigned

---

## Quick Code Snippets

### Send Notification (Backend)

```javascript
const { sendPreferenceBasedNotification } = require('../notifications/index');

await sendPreferenceBasedNotification(userId, {
  type: 'order_confirmed',
  orderId: order._id,
  orderNumber: orderNumber,
  orderData: fullOrderData,
  title: 'Order Confirmed!',
  message: 'Your order has been confirmed',
  status: 'confirmed'
}, db);
```

### Send Guest Email (Backend)

```javascript
const { sendGuestEmail } = require('../notifications/index');

await sendGuestEmail(
  guestEmail,
  guestName,
  {
    type: 'order_placed',
    orderId: order._id,
    orderNumber: orderNumber,
    orderData: fullOrderData
  },
  db
);
```

### Send Notification (Frontend)

```javascript
import { notificationService } from '../services/notificationService';

await notificationService.sendOrderCompletionNotification(
  orderData,
  {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isGuest: false
  }
);
```

### Show Toast Notification

```javascript
import toast from 'react-hot-toast';

// Success
toast.success('Order confirmed!');

// Error
toast.error('Failed to update order');

// Custom
toast.custom((t) => (
  <div className={`${t.visible ? 'animate-enter' : 'animate-leave'}`}>
    <h4>New Order!</h4>
    <p>Order #{orderNumber}</p>
  </div>
));
```

---

## Preference System

**All order notifications respect user preferences!**

Users can control notifications via their preference settings:
- `email.orderUpdates` - Controls email notifications for ALL order types
- `push.orderUpdates` - Controls in-app notifications for ALL order types

**How it works:**
1. System determines notification eligibility based on **role**
2. User **preferences** can override and disable notifications
3. If `email.orderUpdates: false` → No order emails
4. If `push.orderUpdates: false` → No in-app order notifications

---

## Role-Based Email Logic

### Guests
```javascript
// ✅ ALWAYS send email for ALL status changes
shouldSendEmail = true;
```

### Patrons
```javascript
// ✅ EMAIL: Only for key milestones (reduce inbox clutter)
shouldSendEmail = 
  type === 'order_placed' ||           // Initial confirmation
  type === 'order_created_buyer' ||    // Wallet payment confirmation
  type === 'order_confirmed' ||        // Artisan accepted
  // ❌ NOT order_preparing (in-app only)
  type === 'order_ready_for_pickup' || // Ready for pickup
  type === 'order_ready_for_delivery' || // Ready for delivery
  type === 'order_out_for_delivery' || // In transit with tracking
  // ❌ NOT order_picked_up (in-app only)
  type === 'order_delivered' ||        // Successfully delivered
  // ❌ NOT order_completed (in-app only)
  type === 'delivery_refund' ||        // Refund processed
  type === 'order_declined' ||         // Order rejected
  type === 'order_cancelled';          // Order cancelled

// ✅ IN-APP: All order updates (notification bell)
shouldSendPush = all_buyer_notifications;  // All 13 types
```

### Artisans (as sellers)
```javascript
// ✅ EMAIL: Send for new orders and critical updates
shouldSendEmail = 
  type === 'new_order_pending' ||
  type === 'order_cancelled' ||
  type === 'delivery_cost_increase' ||
  type === 'courier_on_way';

// ✅ IN-APP: Only when ACTION is required (reduced noise)
shouldSendPush = 
  type === 'new_order_pending' ||       // Needs to confirm/decline
  type === 'order_cancelled' ||         // Buyer cancelled
  type === 'delivery_cost_increase' ||  // Needs to approve excess cost
  type === 'order_receipt_confirmed';   // Receipt confirmation
```

### Artisans (as buyers)
```javascript
// ✅ EMAIL: Only key milestones (same as patrons - reduce inbox clutter)
shouldSendEmail = 
  type === 'order_placed' ||           // Initial confirmation
  type === 'order_created_buyer' ||    // Wallet payment confirmation
  type === 'order_confirmed' ||        // Artisan accepted
  // ❌ NOT order_preparing (in-app only)
  type === 'order_ready_for_pickup' || // Ready for pickup
  type === 'order_ready_for_delivery' || // Ready for delivery
  type === 'order_out_for_delivery' || // In transit with tracking
  // ❌ NOT order_picked_up (in-app only)
  type === 'order_delivered' ||        // Successfully delivered
  // ❌ NOT order_completed (in-app only)
  type === 'delivery_refund' ||        // Refund processed
  type === 'order_declined' ||         // Order rejected
  type === 'order_cancelled';          // Order cancelled

// ✅ IN-APP: All buyer notifications (13 types)
shouldSendPush = all_buyer_notifications;  // Same as patrons
```

---

## Notification Type Clarifications

### `order_placed` vs `order_created_buyer`

| Type | Payment Method | User Type | When Sent |
|------|---------------|-----------|-----------|
| `order_placed` | Stripe (Card/Payment) | All users | When order created with Stripe payment |
| `order_created_buyer` | Wallet (Balance) | Artisan buyers | When artisan uses wallet balance to pay |

**Key Difference:** They are NOT redundant - they represent different payment flows.

---

## Complete Notification Preference Mapping

All notification types are mapped to preference categories:

| Notification Type | Preference Category | Email Control | Push Control |
|-------------------|-------------------|---------------|--------------|
| `order_placed` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `order_created_buyer` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `order_created_seller` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `new_order_pending` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `order_confirmed` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `order_preparing` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `order_ready_for_pickup` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `order_ready_for_delivery` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `order_out_for_delivery` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `order_picked_up` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `order_delivered` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `order_completed` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `order_cancelled` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `order_declined` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `delivery_refund` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `delivery_cost_increase` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `courier_on_way` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `order_receipt_confirmed` | `orderUpdates` | `email.orderUpdates` | `push.orderUpdates` |
| `promotion`, `seasonal_offer` | `promotions` | `email.promotions` | `push.promotions` |
| `new_artisan`, `artisan_joined` | `newArtisans` | N/A | `push.newArtisans` |
| `nearby_offer`, `local_deal` | `nearbyOffers` | N/A | `push.nearbyOffers` |
| `marketing`, `newsletter` | `marketing` | `email.marketing` | N/A |
| `security`, `account_alert` | `security` | `email.security` | N/A |

**Example User Preferences:**
```json
{
  "notificationPreferences": {
    "email": {
      "marketing": true,      // Marketing emails
      "orderUpdates": true,   // ✅ ALL order emails
      "promotions": true,     // Promotion emails
      "security": true        // Security alerts
    },
    "push": {
      "orderUpdates": false,  // ❌ NO in-app order notifications
      "promotions": false,    // No promotion notifications
      "newArtisans": true,    // New artisan notifications
      "nearbyOffers": false   // No nearby offers
    }
  }
}
```

With the above settings:
- ✅ Will receive **email** for order updates
- ❌ Will NOT receive **in-app** notifications for order updates
- ✅ Will receive in-app notifications for new artisans

---

## Order Data Structure (Minimal Required)

```javascript
const orderData = {
  _id: ObjectId,
  orderNumber: string,
  status: string,
  totalAmount: number,
  items: [{ productName, quantity, unitPrice }],
  deliveryMethod: 'pickup' | 'personalDelivery' | 'professionalDelivery',
  deliveryAddress: { street, city, state, zipCode },
  artisanInfo: {
    name: string,
    email: string,
    phone: string,
    pickupAddress: object
  },
  patronInfo: {
    firstName: string,
    lastName: string,
    email: string
  }
};
```

---

## Common Patterns

### Pattern 1: Order Creation
```javascript
// 1. Create order
const order = await ordersCollection.insertOne(orderData);

// 2. Send to buyer
await sendPreferenceBasedNotification(buyerId, {
  type: 'order_placed',
  orderId: order.insertedId,
  orderData: fullOrderData
}, db);

// 3. Send to seller
await sendPreferenceBasedNotification(sellerId, {
  type: 'new_order_pending',
  orderId: order.insertedId,
  orderData: fullOrderData
}, db);
```

### Pattern 2: Status Update
```javascript
// 1. Update order status
await ordersCollection.updateOne(
  { _id: orderId },
  { $set: { status: newStatus } }
);

// 2. Determine notification type
const notificationType = mapStatusToNotificationType(newStatus);

// 3. Send to buyer (only)
await sendPreferenceBasedNotification(buyerId, {
  type: notificationType,
  orderId: orderId,
  orderData: updatedOrderData
}, db);

// Note: Artisan does NOT get email when they update status
```

### Pattern 3: Guest Order
```javascript
// 1. Create guest order
const order = await ordersCollection.insertOne({
  ...orderData,
  isGuestOrder: true,
  guestInfo: { firstName, lastName, email, phone }
});

// 2. Send to guest
await sendGuestEmail(guestEmail, guestName, {
  type: 'order_placed',
  orderId: order.insertedId,
  orderData: fullOrderData
}, db);

// 3. Send to artisan
await sendPreferenceBasedNotification(artisanId, {
  type: 'new_order_pending',
  orderId: order.insertedId,
  orderData: fullOrderData
}, db);
```

---

## Frontend Event Listeners

### Listen for New Orders (Artisan)
```javascript
useEffect(() => {
  const handleNewOrders = (event) => {
    const { orders } = event.detail;
    toast.success(`${orders.length} new order(s)!`);
  };
  
  window.addEventListener('newOrdersReceived', handleNewOrders);
  
  return () => {
    window.removeEventListener('newOrdersReceived', handleNewOrders);
  };
}, []);
```

### Listen for Cart Updates
```javascript
useEffect(() => {
  const handleCartUpdate = (event) => {
    const { count } = event.detail;
    setCartCount(count);
  };
  
  window.addEventListener('cartUpdated', handleCartUpdate);
  
  return () => {
    window.removeEventListener('cartUpdated', handleCartUpdate);
  };
}, []);
```

---

## API Endpoints Cheat Sheet

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/notifications` | Get user notifications |
| PUT | `/notifications/:id/read` | Mark notification as read |
| PUT | `/notifications/read-all` | Mark all as read |
| DELETE | `/notifications/:id` | Delete notification |
| POST | `/notifications/send` | Send platform notification |
| POST | `/notifications/email` | Send email notification |
| POST | `/notifications/send-preference-based` | Send with preferences |
| POST | `/notifications/send-guest-email` | Send guest email |
| GET | `/notifications/preferences` | Get user preferences |
| PUT | `/notifications/preferences` | Update preferences |

---

## Email Template Functions

| Function | Purpose |
|----------|---------|
| `generateOrderConfirmationHTML()` | Beautiful order confirmation email |
| `generateOrderUpdateHTML()` | Status update email with timeline |
| `generateSubjectLine()` | Dynamic subject with emoji |
| `generateOrderTimelineHTML()` | Visual progress tracker |
| `getNextActionMessage()` | Status-specific user guidance |

---

## Troubleshooting Checklist

**Emails not sending?**
- [ ] Check `BREVO_API_KEY` is set
- [ ] Verify sender email is verified in Brevo
- [ ] Check user has valid email address
- [ ] Look for errors in server logs

**In-app notifications not appearing?**
- [ ] User is logged in (valid token)
- [ ] `userId` is correct in notification
- [ ] Frontend polling is active
- [ ] Check browser console for errors

**Wrong user getting notifications?**
- [ ] Verify `userId` in notification data
- [ ] Check `artisan.user` field
- [ ] Ensure buyer/seller distinction is correct

**Duplicate notifications?**
- [ ] Check polling interval
- [ ] Verify deduplication logic
- [ ] Ensure single notification service instance

---

## Environment Variables

```bash
# Required
BREVO_API_KEY=your_brevo_api_key
JWT_SECRET=your_jwt_secret
MONGODB_URI=mongodb://localhost:27017/bazaarmkt

# Optional (for full features)
STRIPE_SECRET_KEY=sk_test_...
```

---

## File Locations Quick Find

**Backend:**
- Main logic: `/backend/routes/notifications/index.js`
- Order integration: `/backend/routes/orders/index.js`

**Frontend:**
- Notification service: `/frontend/src/services/notificationService.js`
- Order polling: `/frontend/src/services/orderNotificationService.js`
- Pending widget: `/frontend/src/components/dashboard/PendingOrdersWidget.jsx`
- Navbar: `/frontend/src/components/navbar.jsx`

---

## Testing Commands

```bash
# Test Brevo connection
curl -X GET "https://api.brevo.com/v3/account" \
  -H "api-key: $BREVO_API_KEY"

# Test notification endpoint
curl -X POST "http://localhost:5001/api/notifications/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "title": "Test Notification",
    "message": "This is a test",
    "type": "order_update"
  }'
```

---

## Best Practices

1. ✅ Always include full `orderData` object
2. ✅ Build artisan info at order creation (avoid extra DB calls)
3. ✅ Use preference-based notification system
4. ✅ Don't notify artisans when they update status themselves
5. ✅ Artisan sellers: Only in-app notifications when action required
6. ✅ Always send email to guests (no in-app alternative)
7. ✅ Check user role before determining email/push logic
8. ✅ Include tracking URLs for professional delivery
9. ✅ Use descriptive notification types
10. ✅ Handle errors gracefully (don't break order flow)
11. ✅ Log notification attempts for debugging

---

**Last Updated:** October 17, 2025  
**For Full Documentation:** See [NOTIFICATION_SYSTEM_COMPLETE.md](./NOTIFICATION_SYSTEM_COMPLETE.md)

