# Final Email Notification Flow

## Date: October 8, 2025

## Confirmed Email Flow

### Event 1: Patron/Guest Places Order

**Status:** `pending`  
**Notification Type:** `order_placed`

**Emails Sent:**
1. ✅ **To Patron/Guest:** "Order Placed Confirmation"
   - Subject: "Order Confirmed - #XXXXX"
   - Contains: Order details, items, total, delivery info
   - Sent to: Patron's email from database OR guest email from order

2. ✅ **To Artisan:** "New Pending Order"
   - Subject: "New Order - #XXXXX"
   - Contains: Order details, customer info, pickup/delivery method
   - Sent to: Artisan user's email from database

---

### Event 2: Artisan Confirms Order

**Status Change:** `pending` → `confirmed`  
**Notification Type:** `order_confirmed`

**Emails Sent:**
1. ✅ **To Patron/Guest:** "Order Confirmed by Artisan"
   - Subject: "Order Confirmed - #XXXXX"
   - Contains: Confirmation message, updated timeline, next steps
   - Sent to: Patron's email from database OR guest email from order

2. ❌ **To Artisan:** NO EMAIL
   - Reason: Artisan already knows they confirmed (they clicked the button)
   - They receive in-app platform notification only

---

### Event 3+: All Other Status Changes

**No changes made to existing flow**

Examples of other statuses:
- `preparing` - Artisan is preparing the order
- `ready_for_pickup` - Order ready for customer pickup
- `ready_for_delivery` - Order ready for delivery
- `out_for_delivery` - Order is being delivered
- `delivered` / `picked_up` - Order received by customer
- `completed` - Customer confirmed receipt
- `declined` - Artisan declined the order
- `cancelled` - Order was cancelled

---

## Implementation Details

### Backend Configuration

**File:** `backend/routes/orders/index.js`

**Allowed Email Statuses (Lines 31):**
```javascript
const patronEmailStatuses = [
  'pending',           // Order placed
  'confirmed',         // Artisan confirmed
  'declined',          // Artisan declined
  'out_for_delivery',  // Out for delivery
  'ready_for_pickup',  // Ready for pickup
  'ready_for_delivery',// Ready for delivery
  'delivered',         // Delivered
  'picked_up',         // Picked up
  'completed'          // Completed
];
```

**Allowed Email Types (Lines 32):**
```javascript
const patronEmailTypes = [
  'order_placed',              // Initial order placement
  'order_completion',          // Order completed
  'order_confirmed',           // Artisan confirmed (TYPE, not status!)
  'order_declined',            // Artisan declined
  'order_ready',               // Order ready
  'order_completed',           // Order completed
  'order_ready_for_pickup',    // Ready for pickup
  'order_ready_for_delivery',  // Ready for delivery
  'order_out_for_delivery'     // Out for delivery
];
```

**Artisan Email Types (Lines 59):**
```javascript
const artisanEmailTypes = [
  'new_order_pending',      // New order placed - ONLY time artisan gets email
  'order_confirmation_sent', // (Not used - removed)
  'order_status_update'      // (Not used for emails)
];
```

---

## Important Notes

### Status vs Type Distinction

**Status** = Database field on order document
- Values: `pending`, `confirmed`, `preparing`, etc.
- Set when order is created or updated

**Type** = Notification classification
- Values: `order_placed`, `order_confirmed`, etc.
- Determines which email template to use
- Maps to status but is not the same thing

**Example:**
```javascript
{
  status: 'confirmed',        // ← This is the ORDER STATUS
  type: 'order_confirmed'     // ← This is the NOTIFICATION TYPE
}
```

### Email Logic Flow

```javascript
// Check if email should be sent
const isAllowed = 
  patronEmailStatuses.includes(notificationData.status) ||  // Status check
  patronEmailTypes.includes(notificationData.type);         // Type check

if (notificationData.userEmail && isAllowed) {
  // Send email via Brevo
}
```

---

## Testing

### Test Case 1: Order Placement
```
Action: Patron places order
Expected Result:
  ✅ Patron email sent (order_placed)
  ✅ Artisan email sent (new_order_pending)
  ✅ Both emails contain correct order details
```

### Test Case 2: Order Confirmation
```
Action: Artisan confirms order
Expected Result:
  ✅ Patron email sent (order_confirmed, status: confirmed)
  ❌ Artisan email NOT sent
  ✅ Artisan sees in-app notification only
```

### Test Case 3: Order Ready
```
Action: Artisan marks order ready
Expected Result:
  ✅ Patron email sent (order_ready_for_pickup/delivery)
  ❌ Artisan email NOT sent
```

---

## Summary

### Patron/Guest Emails
✅ Sent when: Order placed, confirmed, declined, ready, delivered, completed
✅ Not sent when: Preparing (to avoid spam)

### Artisan Emails
✅ Sent when: New order is placed (pending)
❌ Not sent when: They update order status (they already know)

### Configuration
✅ Status 'confirmed' is VALID (it's the actual order status)
✅ Type 'order_confirmed' is VALID (it's the notification type)
✅ Artisan does not receive email when confirming their own orders

---

## Files Changed

1. `backend/routes/orders/index.js`
   - Lines 31-34: Clarified comments about statuses vs types
   - Line 1737-1740: Removed artisan email on order confirmation
   - Kept 'confirmed' in patronEmailStatuses (it's a valid status)
   - Kept 'order_confirmed' in patronEmailTypes (it's a valid type)

**Status: COMPLETE** ✅

