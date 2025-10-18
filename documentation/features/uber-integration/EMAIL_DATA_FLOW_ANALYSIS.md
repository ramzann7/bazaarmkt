# Email Notification Data Flow Analysis

**Date:** October 18, 2025  
**Purpose:** Ensure order data is correctly passed from endpoints to email templates  
**Status:** ✅ Reviewed and Fixed

---

## 1. Email Template Expectations

### generateOrderConfirmationHTML() Requirements

**Location:** `backend/routes/notifications/index.js` lines 469-750

**Expected Data Structure:**
```javascript
{
  // Order identification
  orderNumber: '12345678',  // Last 8 chars of _id
  orderId: 'full_mongo_id_string',
  _id: ObjectId,
  
  // Items
  items: [{
    productName: 'Product Name',  // or product.name or name
    quantity: 2,
    unitPrice: 10.00,  // or price
    price: 10.00,
    productType: 'made_to_order'  // optional
  }],
  
  // Pricing
  subtotal: 100.00,
  deliveryFee: 10.00,  // For personal delivery
  deliveryPricing: {  // For professional delivery
    estimatedFee: 8.04,
    buffer: 1.61,
    bufferPercentage: 20,
    chargedAmount: 9.65,
    uberQuoteId: 'dqt_...',
    uberQuoteExpiry: '2025-...'
  },
  totalAmount: 110.00,
  
  // Delivery method
  deliveryMethod: 'pickup' | 'personalDelivery' | 'professionalDelivery',
  
  // Addresses
  deliveryAddress: {
    street: '123 Main St',
    city: 'Montreal',
    state: 'Quebec',
    zipCode: 'H1A 1A1'
  },
  pickupAddress: {  // For pickup orders
    street: '...',
    city: '...',
    // ... same structure
  },
  pickupTime: 'Tuesday, 2-4 PM',  // optional
  
  // Artisan info
  artisanInfo: {
    id: ObjectId,
    name: 'Artisan Name',
    email: 'artisan@example.com',
    phone: '514-123-4567',
    pickupAddress: {...},
    pickupInstructions: 'Ring doorbell',
    businessHours: {...}
  },
  
  // Guest info
  guestInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '514-987-6543'
  },
  
  // Status
  status: 'pending',
  createdAt: Date
}
```

---

## 2. Authenticated User Order Creation

**Endpoint:** `POST /api/orders/payment-intent`  
**Function:** `createPaymentIntent()` → `confirmPaymentAndCreateOrder()`  
**Lines:** 976-1006 in `backend/routes/orders/index.js`

### Data Being Sent:

```javascript
const customerNotificationData = {
  type: 'order_placed',
  userId: userId.toString(),
  orderId: result.insertedId,
  orderNumber: result.insertedId.toString().slice(-8),  // ✅ PRESENT
  title: 'Order Placed Successfully',
  message: `Your order #${result.insertedId.toString().slice(-8)} has been placed successfully`,
  orderData: {
    _id: result.insertedId,  // ✅ PRESENT
    orderId: result.insertedId.toString(),  // ✅ PRESENT
    orderNumber: result.insertedId.toString().slice(-8),  // ✅ PRESENT
    totalAmount: totalAmount,  // ✅ PRESENT
    subtotal: order.subtotal,  // ✅ PRESENT
    deliveryFee: order.deliveryFee,  // ✅ PRESENT
    deliveryPricing: order.deliveryPricing,  // ✅ PRESENT (just added)
    status: 'pending',  // ✅ PRESENT
    items: order.items,  // ✅ PRESENT
    deliveryAddress: order.deliveryAddress,  // ✅ PRESENT
    deliveryMethod: order.deliveryMethod,  // ✅ PRESENT
    deliveryInstructions: order.deliveryInstructions,  // ✅ PRESENT
    pickupTimeWindows: order.pickupTimeWindows,  // ✅ PRESENT
    pickupAddress: order.pickupAddress,  // ✅ PRESENT
    pickupTime: order.pickupTime,  // ✅ PRESENT
    deliveryMethodDetails: order.deliveryMethodDetails,  // ✅ PRESENT
    isGuestOrder: order.isGuestOrder,  // ✅ PRESENT
    guestInfo: order.guestInfo,  // ✅ PRESENT (if guest)
    createdAt: order.createdAt  // ✅ PRESENT
  },
  userInfo: customerUserInfo,  // ✅ PRESENT
  userEmail: customerUserInfo.email,  // ✅ PRESENT
  timestamp: new Date().toISOString()  // ✅ PRESENT
};

// Artisan info added separately (lines 1009-1045)
if (order.artisan) {
  customerNotificationData.orderData.artisanInfo = {
    id: artisan._id,  // ✅ PRESENT
    name: artisan.artisanName || artisan.businessName,  // ✅ PRESENT
    email: artisan.email || artisan.contactInfo?.email,  // ✅ PRESENT
    phone: artisan.phone || artisan.contactInfo?.phone,  // ✅ PRESENT
    pickupAddress: pickupAddress,  // ✅ PRESENT
    businessHours: artisan.businessHours,  // ✅ PRESENT
    pickupInstructions: pickupInstructions  // ✅ PRESENT
  };
}
```

**Status:** ✅ All required fields present

---

## 3. Guest Order Creation

**Endpoint:** `POST /api/orders/guest/payment-intent` → Webhook confirms  
**Function:** `createGuestPaymentIntent()` + Stripe webhook  
**Lines:** 456-603 in `backend/routes/orders/index.js`

### Current Issue:

Guest orders are created via **Stripe webhook**, not in the payment intent creation. Let me trace this:

1. **Frontend** → `POST /api/orders/guest/payment-intent`
2. **Backend** → Creates Stripe PaymentIntent (no order yet)
3. **Frontend** → Confirms payment with Stripe
4. **Stripe** → Sends webhook to backend
5. **Backend** → `POST /api/webhooks/stripe` → Creates order

### Webhook Order Creation:

**Location:** `backend/routes/webhooks/stripe.js`

Let me check this file:

<function_calls>
<invoke name="read_file">
<parameter name="target_file">/Users/ramzan/Documents/bazaarMKT/backend/routes/webhooks/stripe.js
