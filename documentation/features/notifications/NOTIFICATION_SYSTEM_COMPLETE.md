# Notification System - Complete Documentation

**Last Updated:** October 17, 2025  
**Status:** ✅ Production Ready

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Notification Channels](#notification-channels)
4. [Email Templates](#email-templates)
5. [Notification Types](#notification-types)
6. [User Personas](#user-personas)
7. [Data Structures](#data-structures)
8. [Preference System](#preference-system)
9. [Frontend Components](#frontend-components)
10. [Backend Implementation](#backend-implementation)
11. [Special Features](#special-features)
12. [File Locations](#file-locations)

---

## Overview

The bazaarMKT notification system is a comprehensive, multi-channel communication platform that keeps users informed about their orders throughout the entire lifecycle. It provides different notification experiences based on user roles (guests, patrons, artisans) and user preferences.

### Key Features
- ✅ Multi-channel delivery (Email, In-App, Toast)
- ✅ Role-based notification logic
- ✅ User preference management
- ✅ Rich HTML email templates
- ✅ Real-time order updates
- ✅ Professional delivery tracking integration
- ✅ Mobile-responsive design

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Order Event Trigger                       │
│           (Order creation, status change, etc.)              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              sendPreferenceBasedNotification()               │
│         (Check user role & preferences)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
┌───────────────────────┐   ┌───────────────────────┐
│   Email Notification  │   │  Platform Notification │
│   (via Brevo API)     │   │  (MongoDB storage)     │
└───────────────────────┘   └───────────────────────┘
            │                           │
            ▼                           ▼
┌───────────────────────┐   ┌───────────────────────┐
│  Guest/Patron Inbox   │   │  In-App Notification  │
│                       │   │  Bell & Toast         │
└───────────────────────┘   └───────────────────────┘
```

---

## Notification Channels

### 1. Email Notifications (Brevo API)
- **Provider:** Brevo (formerly Sendinblue)
- **Sender:** `bazaar@bazaarmkt.ca`
- **Platform Name:** BazaarMkt
- **Template Engine:** Server-side HTML generation
- **Features:**
  - Rich HTML templates with timeline visualization
  - Mobile-responsive design
  - Print-friendly styling
  - Embedded tracking links (Uber Direct)
  - Artisan and customer contact information

### 2. In-App Platform Notifications
- **Storage:** MongoDB `notifications` collection
- **Features:**
  - Notification bell with unread count
  - Persistent across sessions
  - Mark as read/unread
  - Bulk mark all as read
  - Delete individual notifications

### 3. Frontend Toast Notifications
- **Library:** react-hot-toast
- **Features:**
  - Real-time popup alerts
  - Success/error/info variants
  - Auto-dismiss with configurable duration
  - Non-blocking UI

---

## Email Templates

### Template 1: Order Confirmation Email

**Function:** `generateOrderConfirmationHTML()`  
**File:** `/backend/routes/notifications/index.js`

#### Design Features:
- **Header:** Brown/amber gradient with artisan marketplace theme
- **Typography:** Georgia serif font for elegant feel
- **Color Palette:**
  - Primary: `#78350f` (dark brown)
  - Secondary: `#fef3c7` (light amber)
  - Accents: `#92400e`, `#fde68a`

#### Sections:
1. **Header Section**
   - Platform branding "BazaarMkt - Handcrafted with Care"
   - Order number badge
   
2. **Greeting & Context**
   - Personalized recipient name
   - Thank you message with artisan name
   
3. **Order Summary Card**
   - Order number
   - Date (formatted: "Wednesday, October 16, 2025")
   - Artisan name

4. **Order Timeline**
   - Visual progress indicators (numbered circles)
   - Current status highlighted
   - Pickup: 5 steps, Delivery: 6 steps
   - Completed steps show checkmarks

5. **Order Items Table**
   - Product name with handcrafted badge (if applicable)
   - Quantity × Unit price
   - Line item totals
   - Subtotal, delivery fee, total

6. **Pickup/Delivery Information**
   - **Pickup:** Green background (#f0fdf4)
     - Pickup location with full address
     - Pickup time window
     - Artisan contact details
     - Special instructions
   
   - **Delivery:** Amber background (#fef7ed)
     - Delivery address
     - Estimated delivery time
     - Artisan contact details

7. **Next Steps Section**
   - Amber gradient background
   - What happens next message
   - Action required (if any)

8. **Support Section**
   - Contact information
   - Email support link

9. **Footer**
   - Tagline: "Supporting Local Artisans, One Handcrafted Product at a Time"
   - Copyright notice
   - Contact email

#### Mobile Responsive Styles:
```css
@media only screen and (max-width: 600px) {
  .email-container { padding: 10px !important; }
  .header { padding: 20px !important; }
  .content { padding: 15px !important; }
  .product-item { flex-direction: column !important; }
}
```

---

### Template 2: Order Update Email

**Function:** `generateOrderUpdateHTML()`  
**File:** `/backend/routes/notifications/index.js`

#### Dynamic Header Colors:
- **Normal Updates:** Amber gradient (`#f59e0b` → `#d97706`)
- **Cancelled/Declined:** Red gradient (`#dc2626` → `#991b1b`)

#### Sections:
1. **Dynamic Header**
   - Status emoji (📦, ✅, 🚚, ❌)
   - Order number
   - Personalized greeting

2. **Cancellation/Decline Reason** (if applicable)
   - Red background alert box
   - Artisan's reason displayed

3. **Order Timeline**
   - Same as confirmation email
   - Shows current progress

4. **Order Items**
   - Complete product listing
   - Pricing breakdown

5. **Pickup/Delivery Information**
   - **Professional Delivery Special Features:**
     - Live tracking URL button (Uber Direct)
     - ETA in minutes
     - Courier details (name, phone, vehicle)
     - Delivery ID for reference
   
   - **Personal Delivery:**
     - Distance and estimated time
     - Expected arrival time

6. **Customer/Artisan Information**
   - **For Artisan Emails:** Shows customer info
   - **For Customer Emails:** Shows artisan info
   - Special badge for artisan-to-artisan orders ✨

7. **Next Action Guidance**
   - Status-specific messaging
   - What the user should do next

#### Status-Specific Messages:

| Status | Title | Message | Action |
|--------|-------|---------|--------|
| pending | What Happens Next? | Artisan will review and confirm | Waiting for artisan confirmation |
| confirmed | Order Confirmed! | Artisan is preparing your order | Artisan is preparing your order |
| preparing | Being Prepared | Order is currently being prepared | Order in preparation |
| ready_for_pickup | Ready for Pickup! | Your order is ready at [time] | Visit the artisan to collect |
| ready_for_delivery | Ready for Delivery | Will be delivered around [time] | Delivery will be scheduled |
| out_for_delivery | Out for Delivery | Your order is on its way! | Be available to receive |
| picked_up | Order Picked Up | Thank you for your order | Enjoy your purchase! |
| delivered | Order Delivered | Your order has been delivered | Enjoy your purchase! |
| cancelled | Order Cancelled | This order has been cancelled | Contact support if needed |
| declined | Order Declined | Artisan had to decline | Browse other artisans |

---

### Dynamic Subject Lines

**Function:** `generateSubjectLine(status, orderNumber, deliveryMethod)`

| Status | Subject Line |
|--------|--------------|
| pending | 📦 Order Placed - #[orderNumber] |
| confirmed | ✅ Order Confirmed - #[orderNumber] |
| preparing | 👨‍🍳 Order Being Prepared - #[orderNumber] |
| ready_for_pickup | ✨ Ready for Pickup - #[orderNumber] |
| ready_for_delivery | ✨ Ready for Delivery - #[orderNumber] |
| out_for_delivery | 🚚 Out for Delivery - #[orderNumber] |
| picked_up | ✅ Order Picked Up - #[orderNumber] |
| delivered | 📬 Order Delivered - #[orderNumber] |
| completed | ✅ Order Completed - #[orderNumber] |
| cancelled | ❌ Order Cancelled - #[orderNumber] |
| declined | ⚠️ Order Declined - #[orderNumber] |

---

## Notification Types

### Buyer Notifications (Patrons & Guests)

| Type | Trigger | Email | In-App | Data Included |
|------|---------|-------|--------|---------------|
| `order_placed` | Order created | ✅ | ✅ | Full order details, artisan info |
| `order_confirmed` | Artisan accepts | ✅ | ✅ | Updated status, preparation timeline |
| `order_preparing` | Artisan starts work | ✅ | ✅ | Current status, estimated completion |
| `order_ready_for_pickup` | Ready for pickup | ✅ | ✅ | Pickup address, time, artisan contact |
| `order_ready_for_delivery` | Ready for delivery | ✅ | ✅ | Delivery estimate, artisan contact |
| `order_out_for_delivery` | In transit | ✅ | ✅ | Tracking URL, courier info, ETA |
| `order_picked_up` | Customer collected | ✅ | ✅ | Thank you message |
| `order_delivered` | Successfully delivered | ✅ | ✅ | Delivery confirmation, receipt |
| `order_completed` | Order finalized | ✅ | ✅ | Final confirmation |
| `order_declined` | Artisan rejects | ✅ | ✅ | Reason, refund confirmation |
| `order_cancelled` | Order cancelled | ✅ | ✅ | Reason, refund details |
| `delivery_refund` | Delivery cost lower | ✅ | ✅ | Refund amount, explanation |

### Seller Notifications (Artisans)

| Type | Trigger | Email | In-App | Data Included |
|------|---------|-------|--------|---------------|
| `new_order_pending` | New order received | ✅ | ✅ | Complete order, customer info |
| `order_created_seller` | Wallet payment order | ✅ | ✅ | Payment deduction, customer details |
| `order_cancelled` | Buyer cancels | ✅ | ✅ | Cancellation reason, financial impact |
| `delivery_cost_increase` | Uber cost exceeds estimate | ✅ | ✅ | Excess amount, approve/decline option |
| `order_receipt_confirmed` | Customer confirms delivery | ✅ | ❌ | Revenue recognition trigger |
| `courier_on_way` | Uber driver assigned | ✅ | ✅ | Courier details, tracking |

### Artisan-as-Buyer Notifications

When artisans purchase from other artisans:
- Receive **all buyer notifications** (same as patrons)
- **Special badge** in emails showing business name
- Dual notification tracking (as seller + buyer)

---

## User Personas

### 1. Guest Users

**Characteristics:**
- No user account
- Email provided at checkout
- Cannot log in to view order status

**Notification Strategy:**
- ✅ **Email:** Receive ALL status changes
- ❌ **In-App:** None (not logged in)
- ❌ **Preferences:** Cannot customize

**Special Handling:**
```javascript
// Guest orders auto-complete after delivery
if (isGuestOrder && status === 'delivered') {
  // Auto-complete to 'completed' status
  // Release payment to artisan
  // Process revenue recognition
  // Send final confirmation email
}
```

**Email Function:** `sendGuestEmail(guestEmail, guestName, notificationData, db)`

**Order Data Structure:**
```javascript
{
  isGuestOrder: true,
  guestInfo: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string
  },
  userId: null  // No user account
}
```

---

### 2. Registered Patrons (Buyers)

**Characteristics:**
- Have user accounts
- Can log in and view orders
- Access to notification preferences

**Notification Strategy:**
- ✅ **Email:** Key milestones only (reduces inbox clutter)
  - Order placed, confirmed, ready, delivered, declined, cancelled
  - ❌ NOT: preparing, picked_up, completed (in-app only)
- ✅ **In-App:** ALL status changes (notification bell)
- ✅ **Preferences:** Full control via settings

**Email Events (10 types - Key Milestones Only):**
```javascript
const shouldSendEmail = 
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
```

**In-App Events (All):**
```javascript
const shouldSendPush = 
  // All order-related events
  type.startsWith('order_') || 
  type === 'delivery_refund';
```

---

### 3. Artisans (Sellers)

**Characteristics:**
- Business accounts
- Sell products/services
- Need to manage incoming orders

**Notification Strategy (as Seller):**
- ✅ **Email:** New orders + critical updates
  - `new_order_pending` - New order received
  - `order_cancelled` - Customer cancelled
  - `delivery_cost_increase` - Uber cost exceeded
  - `courier_on_way` - Professional delivery started
- ✅ **In-App:** ONLY when ACTION is required (reduced notification noise)
  - `new_order_pending` - Needs to confirm/decline
  - `order_cancelled` - Buyer cancelled (informational)
  - `delivery_cost_increase` - Needs to approve excess cost
  - `order_receipt_confirmed` - Receipt confirmation
- ❌ **No notifications for status updates they perform themselves**

**Important:** Artisans do NOT receive notifications when they update order status (they already know they did it!)

```javascript
// Artisan updates order to "preparing"
// ✅ Customer gets email + in-app notification
// ❌ Artisan does NOT get any notification (they just did it)

// Artisan marks order as "ready_for_pickup"
// ✅ Customer gets email + in-app notification
// ❌ Artisan does NOT get any notification (no action needed)
```

---

### 4. Artisans (Buyers)

**Characteristics:**
- Artisans purchasing from other artisans
- B2B transactions within platform

**Notification Strategy:**
- ✅ **Email:** Key milestones only (same as patrons - reduce inbox clutter)
  - `order_placed` - Initial confirmation ✅
  - `order_created_buyer` - Wallet payment confirmation ✅
  - `order_confirmed` - Artisan accepted ✅
  - `order_preparing` - Being prepared ❌ (in-app only)
  - `order_ready_for_pickup` - Ready for pickup ✅
  - `order_ready_for_delivery` - Ready for delivery ✅
  - `order_out_for_delivery` - In transit ✅
  - `order_picked_up` - Picked up ❌ (in-app only)
  - `order_delivered` - Delivered ✅
  - `order_completed` - Completed ❌ (in-app only)
  - `delivery_refund` - Delivery refund ✅
  - `order_declined` - Declined ✅
  - `order_cancelled` - Cancelled ✅
- ✅ **In-App:** ALL buyer notifications (all 13 types listed above)
- ✅ **Special branding** in emails
- ✅ **Business name** displayed in customer info

**Email Display:**
```javascript
{
  customerInfo: {
    isArtisan: true,
    businessName: "Clay Creations Studio",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah@claycreations.com"
  }
}

// Renders as:
// Business: Clay Creations Studio ✨
// Name: Sarah Johnson
// Email: sarah@claycreations.com
```

---

## Data Structures

### Core Order Data for Notifications

```javascript
const orderData = {
  // Basic Info
  _id: ObjectId,
  orderNumber: string,           // Last 8 chars of _id
  status: string,                // Current order status
  totalAmount: number,
  subtotal: number,
  deliveryFee: number,
  
  // Items
  items: [{
    productId: ObjectId,
    productName: string,
    quantity: number,
    unitPrice: number,
    totalPrice: number,
    productType: 'ready_to_ship' | 'made_to_order'
  }],
  
  // Delivery
  deliveryMethod: 'pickup' | 'personalDelivery' | 'professionalDelivery',
  deliveryAddress: {
    street: string,
    city: string,
    state: string,
    zipCode: string
  },
  deliveryInstructions: string,
  pickupAddress: object | string,
  pickupTime: string,
  estimatedDeliveryTime: string,
  
  // Artisan Info (for customer emails)
  artisanInfo: {
    id: ObjectId,
    name: string,
    email: string,
    phone: string,
    pickupAddress: object,
    pickupInstructions: string
  },
  
  // Customer/Guest Info (for artisan emails)
  patronInfo: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    isArtisan: boolean,           // For B2B orders
    businessName: string           // If isArtisan
  },
  guestInfo: {                     // For guest orders
    firstName: string,
    lastName: string,
    email: string,
    phone: string
  },
  
  // Professional Delivery (Uber Direct)
  deliveryInfo: {
    trackingUrl: string,           // Live tracking link
    dropoffEta: number,            // Minutes
    courier: {
      name: string,
      phone: string,
      vehicle: string
    },
    deliveryId: string,
    formattedDistance: string,     // "2.5 miles"
    formattedEstimatedTime: string, // "15-20 min"
    estimatedArrivalTime: Date
  },
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  isGuestOrder: boolean
};
```

### Notification Data Structure

```javascript
const notificationData = {
  // Core Fields
  type: string,                    // Notification type
  userId: string | null,           // Recipient user ID
  orderId: ObjectId,
  orderNumber: string,
  
  // Message Content
  title: string,                   // "Order Confirmed!"
  message: string,                 // Detailed message
  
  // Order Details
  orderData: { /* full order object */ },
  
  // Status Info
  status: string,                  // New status
  updateType: string,              // Type of update
  updateDetails: {
    newStatus: string,
    previousStatus: string,
    reason: string,                // For decline/cancel
    timestamp: Date
  },
  
  // User Info
  userEmail: string,
  userPhone: string,
  userName: string,
  isGuest: boolean,
  
  // User Info Object (alternative)
  userInfo: {
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    isGuest: boolean
  },
  
  // Timestamps
  timestamp: Date,
  createdAt: Date
};
```

### Platform Notification (MongoDB)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  title: string,
  message: string,
  type: string,
  orderId: ObjectId,
  orderNumber: string,
  status: string,
  updateType: string,
  updateDetails: object,
  isRead: boolean,
  readAt: Date,
  createdAt: Date
}
```

---

## Preference System

### User Preference Structure

```javascript
{
  notificationPreferences: {
    email: {
      marketing: boolean,          // Marketing emails
      orderUpdates: boolean,       // Order status changes
      promotions: boolean,         // Special offers
      security: boolean            // Security alerts
    },
    push: {
      orderUpdates: boolean,       // Order status changes
      promotions: boolean,         // Special offers
      newArtisans: boolean,        // New artisan notifications
      nearbyOffers: boolean        // Location-based deals
    }
  }
}
```

### Preference Checking Logic

**Function:** `checkNotificationPreference(userId, notificationType, channel, db)`

```javascript
// Map notification types to preference categories
const preferenceTypeMap = {
  'order_*': 'orderUpdates',
  'promotion': 'promotions',
  'new_artisan': 'newArtisans',
  'nearby_offer': 'nearbyOffers',
  'marketing': 'marketing',
  'security': 'security'
};

// Check if user wants this notification
const preferences = user.notificationPreferences || defaults;
return preferences[channel]?.[notificationType] === true;
```

### Preference-Based Notification Flow

```javascript
// Function: sendPreferenceBasedNotification(userId, notificationData, db)

1. Get user from database
2. Determine user role (artisan, patron, guest)
3. Map notification type to preference category
4. Determine if seller or buyer notification
5. Apply role-based email logic:
   - Artisans: Send email for seller + buyer events
   - Patrons: Send email for key events only
   - Guests: Send email for ALL events
6. Apply role-based push logic:
   - Artisans: Send push for all order events
   - Patrons: Send push for all order events
   - Guests: No push (not logged in)
7. Send email via Brevo if shouldSendEmail
8. Create platform notification if shouldSendPush
9. Return result { emailSent, pushSent, preferenceType }
```

### Default Preferences

All preferences default to `true` if not explicitly set:

```javascript
const defaultPreferences = {
  email: {
    marketing: true,
    orderUpdates: true,
    promotions: true,
    security: true
  },
  push: {
    orderUpdates: true,
    promotions: true,
    newArtisans: true,
    nearbyOffers: true
  }
};
```

---

## Frontend Components

### 1. Notification Service

**File:** `/frontend/src/services/notificationService.js`

#### Main Functions:

**Order Completion Notification:**
```javascript
sendOrderCompletionNotification(orderData, userInfo)
  -> For guests: sendOrderCompletionEmail()
  -> For patrons: sendPlatformNotification() + conditional email
  -> Checks user preferences
  -> Returns success/error status
```

**Order Update Notification:**
```javascript
sendOrderUpdateNotification(orderData, userInfo, updateType, updateDetails)
  -> Builds notification data structure
  -> Sends via backend API
  -> Handles email + platform notification
```

**Platform Notification:**
```javascript
sendPlatformNotification(notificationData)
  -> Creates in-app notification
  -> POST to /notifications/send
  -> Stores in MongoDB
  -> Triggers notification bell update
```

**Get Preferences:**
```javascript
getNotificationPreferences(userId)
  -> GET /notifications/preferences
  -> Returns user preference object
  -> Used in settings UI
```

---

### 2. Order Notification Service

**File:** `/frontend/src/services/orderNotificationService.js`

#### Polling System:

```javascript
class OrderNotificationService {
  constructor() {
    this.pollInterval = null;
    this.pendingOrders = new Set();
    this.cachedProfile = null;
  }
  
  // Start polling every 30 seconds
  startPolling(pollInterval = 30000) {
    this.pollInterval = setInterval(() => {
      this.checkForNewOrders();
    }, pollInterval);
  }
  
  // Check for new orders based on role
  async checkForNewOrders(isLoginTriggered = false) {
    const profile = await getProfile();
    const userRole = profile.role || profile.userType;
    
    if (['artisan', 'producer', 'food_maker'].includes(userRole)) {
      await this.checkForNewArtisanOrders(isLoginTriggered);
      await this.checkForPurchaseOrderUpdates(isLoginTriggered);
    } else if (userRole === 'patron') {
      await this.checkForOrderUpdates(isLoginTriggered);
    }
  }
  
  // Artisan-specific: Check for new sales orders
  async checkForNewArtisanOrders(isLoginTriggered) {
    const orders = await orderService.getArtisanOrders();
    const pendingOrders = orders.filter(order => 
      ['pending', 'confirmed', 'preparing'].includes(order.status)
    );
    
    // Compare with cached set
    const newOrders = pendingOrders.filter(order => 
      !this.pendingOrders.has(order._id)
    );
    
    if (newOrders.length > 0) {
      // Dispatch event
      window.dispatchEvent(new CustomEvent('newOrdersReceived', {
        detail: { orders: newOrders }
      }));
      
      // Show toast
      toast.success(`${newOrders.length} new order(s) received!`);
    }
    
    // Update cache
    this.pendingOrders = new Set(pendingOrders.map(o => o._id));
  }
}

export const orderNotificationService = new OrderNotificationService();
```

---

### 3. Pending Orders Widget

**File:** `/frontend/src/components/dashboard/PendingOrdersWidget.jsx`

```javascript
export default function PendingOrdersWidget() {
  const [pendingOrders, setPendingOrders] = useState([]);
  
  useEffect(() => {
    loadPendingOrders();
    
    // Listen for new orders
    window.addEventListener('newOrdersReceived', (event) => {
      loadPendingOrders(); // Refresh
    });
    
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingOrders, 30000);
    
    return () => {
      window.removeEventListener('newOrdersReceived');
      clearInterval(interval);
    };
  }, []);
  
  const loadPendingOrders = async () => {
    const orders = await orderService.getArtisanOrders(false);
    const pending = orders.filter(order => 
      ['pending', 'confirmed', 'preparing'].includes(order.status)
    );
    setPendingOrders(pending);
  };
  
  return (
    <div className="widget">
      <h3>Pending Orders ({pendingOrders.length})</h3>
      {pendingOrders.map(order => (
        <OrderItem key={order._id} order={order} />
      ))}
    </div>
  );
}
```

---

### 4. Notification Bell (Navbar)

**File:** `/frontend/src/components/navbar.jsx`

**Features:**
- Shows unread count badge
- Dropdown with recent notifications
- Mark as read functionality
- Navigate to order details

**Event Listeners:**
```javascript
// Listen for cart updates (similar pattern for notifications)
useEffect(() => {
  const handleCartUpdate = (event) => {
    const { userId, count } = event.detail;
    setCartCount(count);
  };
  
  window.addEventListener('cartUpdated', handleCartUpdate);
  
  return () => {
    window.removeEventListener('cartUpdated', handleCartUpdate);
  };
}, [user]);
```

---

### 5. Toast Notifications

**Library:** `react-hot-toast`

**Usage Examples:**
```javascript
// Success
toast.success('Order confirmed!', {
  duration: 4000,
  icon: '✅'
});

// Error
toast.error('Failed to update order', {
  duration: 5000
});

// Custom
toast.custom((t) => (
  <div className={`notification ${t.visible ? 'show' : 'hide'}`}>
    <h4>New Order Received!</h4>
    <p>Order #{orderNumber}</p>
    <button onClick={() => navigate(`/orders/${orderId}`)}>
      View Order
    </button>
  </div>
));
```

---

## Backend Implementation

### 1. Main Notification Route

**File:** `/backend/routes/notifications/index.js`

#### Key Functions:

**Send Brevo Email:**
```javascript
sendBrevoEmail(userId, notificationData, db)
  1. Fetch user from database
  2. Get order details if orderId provided
  3. Fetch artisan details for pickup/delivery info
  4. Build comprehensive orderData object
  5. Generate HTML content based on type
  6. Generate dynamic subject line
  7. Send via Brevo API
  8. Return response
```

**Send Guest Email:**
```javascript
sendGuestEmail(guestEmail, guestName, notificationData, db)
  1. Check for pre-built orderData in notification
  2. If missing, fetch order from database
  3. Fetch artisan details
  4. Build comprehensive orderData
  5. Generate HTML template
  6. Send via Brevo
```

**Send Preference-Based Notification:**
```javascript
sendPreferenceBasedNotification(userId, notificationData, db)
  1. Get user from database
  2. Determine user role (artisan/patron/guest)
  3. Map notification type to preference category
  4. Determine if seller or buyer notification
  5. Apply role-based email logic
  6. Check user preferences
  7. Send email if shouldSendEmail
  8. Create platform notification if shouldSendPush
  9. Return { emailSent, pushSent, preferenceType }
```

#### API Endpoints:

```javascript
GET    /notifications                          // Get user notifications
PUT    /notifications/:id/read                 // Mark as read
PUT    /notifications/read-all                 // Mark all as read
DELETE /notifications/:id                      // Delete notification
POST   /notifications/send                     // Send notification
POST   /notifications/email                    // Send email
POST   /notifications/send-bulk                // Bulk notifications
POST   /notifications/send-preference-based    // Preference-based
POST   /notifications/send-guest-email         // Guest email
GET    /notifications/preferences              // Get preferences
PUT    /notifications/preferences              // Update preferences
```

---

### 2. Orders Integration

**File:** `/backend/routes/orders/index.js`

#### Notification Helper:

```javascript
const sendNotificationDirect = async (notificationData, db) => {
  // Skip guest notifications without userId
  if (!notificationData.userId) {
    console.log('⏭️ Skipping notification for guest/no userId');
    return true;
  }
  
  // Use preference-based notification system
  const result = await sendPreferenceBasedNotification(
    notificationData.userId,
    notificationData,
    db
  );
  
  return true;
};
```

#### Order Creation Notifications:

```javascript
// 1. Notify customer about order placement
await sendNotificationDirect({
  type: 'order_placed',
  userId: userId.toString(),
  orderId: result.insertedId,
  orderNumber: result.insertedId.toString().slice(-8),
  orderData: fullOrderData,
  title: 'Order Placed Successfully',
  message: `Your order #${orderNumber} has been placed`
}, db);

// 2. Notify artisan about new order
await sendNotificationDirect({
  type: 'new_order_pending',
  userId: artisanUserId.toString(),
  orderId: result.insertedId,
  orderNumber: orderNumber,
  orderData: fullOrderData,
  title: 'New Order Received',
  message: `You have a new order #${orderNumber} from ${customerName}`
}, db);
```

#### Status Update Notifications:

```javascript
// Determine notification type from status
let notificationType = 'order_update';

if (finalStatus === 'declined') {
  notificationType = 'order_declined';
} else if (finalStatus === 'confirmed') {
  notificationType = 'order_confirmed';
} else if (finalStatus === 'preparing') {
  notificationType = 'order_preparing';
} else if (finalStatus === 'ready_for_pickup') {
  notificationType = 'order_ready_for_pickup';
} else if (finalStatus === 'ready_for_delivery') {
  notificationType = 'order_ready_for_delivery';
} else if (finalStatus === 'out_for_delivery') {
  notificationType = 'order_out_for_delivery';
} else if (finalStatus === 'delivered' || finalStatus === 'picked_up' || finalStatus === 'completed') {
  notificationType = 'order_completed';
}

// Send to patron/guest
await sendNotificationDirect({
  type: notificationType,
  userId: updatedOrder.userId?.toString(),
  orderId: updatedOrder._id,
  orderData: enhancedOrderData,
  orderNumber: orderNumber,
  title: `Order ${getStatusDisplayText(finalStatus)}`,
  message: statusUpdateMessage
}, db);
```

---

### 3. Uber Direct Integration

**Special Handling for Professional Delivery:**

```javascript
// When status changes to 'ready_for_delivery' + professionalDelivery
if (finalStatus === 'ready_for_delivery' && 
    updatedOrder.deliveryMethod === 'professionalDelivery') {
  
  const uberDirectService = require('../../services/uberDirectService');
  const result = await uberDirectService.processReadyForDelivery(updatedOrder, db);
  
  // Handle cost increase (artisan must approve)
  if (result.action === 'awaiting_artisan_response') {
    await sendNotificationDirect({
      userId: artisan.user,
      type: 'delivery_cost_increase',
      title: 'Delivery Cost Increased',
      message: `Delivery cost increased by $${result.excessAmount}. Please review.`,
      data: {
        orderId: updatedOrder._id,
        excessAmount: result.excessAmount,
        actualFee: result.actualFee
      }
    }, db);
  }
  
  // Handle refund (cost lower than estimated)
  if (result.action === 'refund_processed') {
    await sendNotificationDirect({
      userId: updatedOrder.userId,
      type: 'delivery_refund',
      title: 'Delivery Refund',
      message: `You've been refunded $${result.refundAmount}`,
      data: {
        orderId: updatedOrder._id,
        refundAmount: result.refundAmount
      }
    }, db);
  }
}
```

**Tracking Information in Email:**

When Uber delivery is active, the email includes:
- Live tracking URL button
- ETA countdown (in minutes)
- Courier details (name, phone, vehicle)
- Delivery ID for reference

---

## Special Features

### 1. Guest Order Auto-Completion

```javascript
// After guest order is marked 'delivered', auto-complete it
if (isGuestOrder && updatedOrder.status === 'delivered') {
  await ordersCollection.updateOne(
    { _id: updatedOrder._id },
    { 
      $set: { 
        status: 'completed',
        completedAt: new Date(),
        lastStatusUpdate: {
          status: 'completed',
          autoCompleted: true,
          previousStatus: 'delivered'
        }
      }
    }
  );
  
  // Release payment to artisan
  await capturePaymentAndTransfer({ orderId });
  
  // Process revenue recognition
  await walletService.processOrderCompletion(updatedOrder, db);
  
  // Send final completion email
  await sendNotificationDirect({
    type: 'order_completed',
    // ... guest info
  }, db);
}
```

### 2. Artisan-to-Artisan Special Handling

**Customer Info Display:**
```javascript
// In email template
{
  patronInfo: {
    isArtisan: true,
    businessName: "Clay Creations Studio",
    artisanName: "Clay Creations",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah@claycreations.com"
  }
}

// Renders as:
<p>
  <strong>Business:</strong> Clay Creations Studio ✨
</p>
<p>
  <strong>Name:</strong> Sarah Johnson
</p>
```

### 3. Professional Delivery Tracking

**Email Section:**
```html
<!-- Uber Tracking Section -->
<div style="background: #3b82f6; padding: 15px; border-radius: 8px;">
  <a href="${orderData.deliveryInfo.trackingUrl}" 
     style="background: white; color: #1e40af; padding: 12px 24px;">
    🗺️ Track Your Delivery Live
  </a>
</div>

<div style="background: #bfdbfe; padding: 15px;">
  <p><strong>⏰ Estimated Arrival:</strong> 
     <span style="font-size: 18px;">${orderData.deliveryInfo.dropoffEta} minutes</span>
  </p>
</div>

<div style="background: #eff6ff; padding: 15px;">
  <p><strong>Courier Details:</strong></p>
  <p>👤 <strong>Name:</strong> ${orderData.deliveryInfo.courier.name}</p>
  <p>📱 <strong>Phone:</strong> ${orderData.deliveryInfo.courier.phone}</p>
  <p>🚗 <strong>Vehicle:</strong> ${orderData.deliveryInfo.courier.vehicle}</p>
</div>
```

### 4. Timeline Visualization

**Order Progress Indicator:**

```javascript
const generateOrderTimelineHTML = (currentStatus, deliveryMethod) => {
  const pickupSteps = [
    { id: 'pending', label: 'Order Placed', number: '1' },
    { id: 'confirmed', label: 'Confirmed', number: '2' },
    { id: 'preparing', label: 'Preparing', number: '3' },
    { id: 'ready_for_pickup', label: 'Ready for Pickup', number: '4' },
    { id: 'picked_up', label: 'Picked Up', number: '5' }
  ];
  
  const deliverySteps = [
    { id: 'pending', label: 'Order Placed', number: '1' },
    { id: 'confirmed', label: 'Confirmed', number: '2' },
    { id: 'preparing', label: 'Preparing', number: '3' },
    { id: 'ready_for_delivery', label: 'Ready', number: '4' },
    { id: 'out_for_delivery', label: 'Out for Delivery', number: '5' },
    { id: 'delivered', label: 'Delivered', number: '6' }
  ];
  
  const steps = deliveryMethod === 'pickup' ? pickupSteps : deliverySteps;
  const currentStepIndex = steps.findIndex(step => step.id === currentStatus);
  
  return steps.map((step, index) => {
    const isCompleted = index <= currentStepIndex;
    const icon = isCompleted ? '✓' : step.number;
    const bgColor = isCompleted ? '#10b981' : '#f3f4f6';
    
    return `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="width: 40px; height: 40px; border-radius: 50%; 
                    background: ${bgColor}; display: flex; align-items: center; 
                    justify-content: center;">
          ${icon}
        </div>
        <div>${step.label}</div>
      </div>
    `;
  }).join('');
};
```

### 5. Mobile-Responsive Design

**CSS Media Queries:**
```css
@media only screen and (max-width: 600px) {
  .email-container { 
    padding: 10px !important; 
  }
  
  .header { 
    padding: 20px !important; 
    font-size: 14px !important; 
  }
  
  .header h1 { 
    font-size: 24px !important; 
  }
  
  .content { 
    padding: 15px !important; 
  }
  
  .timeline-step { 
    font-size: 9px !important; 
    max-width: 60px !important; 
  }
  
  .timeline-icon { 
    width: 32px !important; 
    height: 32px !important; 
  }
  
  .product-item { 
    flex-direction: column !important; 
  }
  
  h2 { font-size: 20px !important; }
  h3 { font-size: 16px !important; }
}
```

### 6. Print-Friendly Styling

```css
@media print {
  body { background: white !important; }
  
  .header { 
    background: #f59e0b !important; 
    -webkit-print-color-adjust: exact !important; 
    print-color-adjust: exact !important; 
  }
  
  .no-print { display: none !important; }
  
  a { 
    text-decoration: none !important; 
    color: #000 !important; 
  }
}
```

---

## File Locations

### Backend Files

| File | Purpose |
|------|---------|
| `/backend/routes/notifications/index.js` | Main notification logic, email templates, preference system |
| `/backend/routes/orders/index.js` | Order notification integration, status update triggers |
| `/backend/services/uberDirectService.js` | Professional delivery tracking integration |
| `/backend/middleware/database.js` | Shared database connection for notifications |

### Frontend Files

| File | Purpose |
|------|---------|
| `/frontend/src/services/notificationService.js` | Notification API calls, order completion/update handlers |
| `/frontend/src/services/orderNotificationService.js` | Real-time order polling, new order detection |
| `/frontend/src/services/brevoService.js` | Brevo API integration (frontend alternative) |
| `/frontend/src/components/navbar.jsx` | Notification bell, cart updates, event listeners |
| `/frontend/src/components/dashboard/PendingOrdersWidget.jsx` | Artisan dashboard widget for pending orders |
| `/frontend/src/components/Orders.jsx` | Order management UI |
| `/frontend/src/components/Profile.jsx` | Notification preference settings UI |
| `/frontend/src/components/Account.jsx` | Account settings with notification toggles |

### Configuration Files

| File | Purpose |
|------|---------|
| `/frontend/src/config/brevoConfig.js` | Brevo API configuration, template IDs |
| `/config/environment.example.js` | Environment variable examples |
| `/backend/config/environment.js` | Server-side environment config |

### Documentation Files

| File | Purpose |
|------|---------|
| `/documentation/features/NOTIFICATION_SYSTEM_COMPLETE.md` | This comprehensive guide |
| `/documentation/features/orders/EMAIL_NOTIFICATIONS_COMPLETE.md` | Order-specific email details |
| `/documentation/features/orders/ORDER_DISPLAY_COMPLETE.md` | Order UI documentation |

---

## Environment Variables

### Required Configuration

```bash
# Brevo API Configuration
BREVO_API_KEY=your_brevo_api_key_here

# JWT for authentication
JWT_SECRET=your_jwt_secret

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/bazaarmkt

# Stripe (for payment notifications)
STRIPE_SECRET_KEY=sk_test_...

# Server Configuration
PORT=5001
NODE_ENV=production
```

### Brevo Setup

1. Create account at [Brevo](https://www.brevo.com)
2. Get API key from Settings > SMTP & API > API Keys
3. Add to `.env` file: `BREVO_API_KEY=xkeysib-...`
4. Verify sender email: `bazaar@bazaarmkt.ca`

---

## Testing

### Manual Testing Checklist

#### Guest Order Flow:
- [ ] Guest places order → Receives confirmation email
- [ ] Artisan confirms → Guest receives confirmed email
- [ ] Artisan marks preparing → Guest receives preparing email
- [ ] Artisan marks ready → Guest receives ready email
- [ ] Artisan marks delivered → Guest receives delivered email
- [ ] System auto-completes → Guest receives completed email

#### Patron Order Flow:
- [ ] Patron places order → Receives email + in-app notification
- [ ] Artisan confirms → Patron sees in-app, receives email
- [ ] Check notification preferences work
- [ ] Notification bell shows unread count
- [ ] Mark as read functionality works
- [ ] Delete notification works

#### Artisan Order Flow:
- [ ] New order arrives → Artisan receives email + in-app
- [ ] Artisan updates status → Customer notified, artisan NOT emailed
- [ ] Check pending orders widget shows new orders
- [ ] Toast notification appears for new orders
- [ ] Artisan purchasing from another artisan → Receives buyer emails

#### Professional Delivery:
- [ ] Order marked ready_for_delivery → Uber API called
- [ ] Cost increase → Artisan notified with approval option
- [ ] Cost decrease → Buyer notified with refund
- [ ] Tracking URL included in email
- [ ] Courier details displayed correctly
- [ ] ETA countdown shows in email

### Email Template Testing

```bash
# Test guest order email
POST /notifications/send-guest-email
{
  "guestEmail": "test@example.com",
  "guestName": "Test Customer",
  "notificationData": {
    "type": "order_placed",
    "orderId": "...",
    "orderData": { /* full order */ }
  }
}

# Test registered user email
POST /notifications/send-preference-based
{
  "userId": "...",
  "notificationData": {
    "type": "order_confirmed",
    "orderId": "...",
    "orderData": { /* full order */ }
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. Emails Not Sending

**Problem:** Notifications created but no emails sent

**Solutions:**
- Check `BREVO_API_KEY` is set correctly
- Verify Brevo API key is active
- Check user email is valid
- Look for errors in server logs
- Verify sender email is verified in Brevo

**Debug:**
```bash
# Check environment variable
echo $BREVO_API_KEY

# Test Brevo connection
curl -X GET "https://api.brevo.com/v3/account" \
  -H "api-key: $BREVO_API_KEY"
```

#### 2. Notifications Not Appearing In-App

**Problem:** Emails work but no in-app notifications

**Solutions:**
- Check user is logged in (token valid)
- Verify `userId` in notification data
- Check MongoDB notifications collection
- Ensure frontend is polling (`orderNotificationService.startPolling()`)
- Check browser console for errors

**Debug:**
```javascript
// Check if service is running
console.log('Polling active:', orderNotificationService.pollInterval);

// Check notifications in MongoDB
db.notifications.find({ userId: ObjectId('...') }).sort({ createdAt: -1 })
```

#### 3. Guest Emails Missing Artisan Info

**Problem:** Guest emails don't show artisan contact details

**Solutions:**
- Ensure `orderData.artisanInfo` is built correctly
- Check artisan fulfillment settings are populated
- Verify artisan has pickup address configured
- Use pre-built `orderData` from order creation

**Debug:**
```javascript
// Check orderData structure
console.log('Artisan info:', notificationData.orderData?.artisanInfo);
```

#### 4. Wrong User Receiving Notifications

**Problem:** Notifications going to wrong user

**Solutions:**
- Verify `userId` is correct in notification data
- Check if artisan.user field points to correct user ID
- Ensure order.userId is set correctly
- For artisan-to-artisan orders, verify buyer/seller distinction

**Debug:**
```javascript
// Log all user IDs involved
console.log({
  orderUserId: order.userId,
  artisanUserId: artisan.user,
  notificationUserId: notificationData.userId
});
```

#### 5. Duplicate Notifications

**Problem:** Same notification sent multiple times

**Solutions:**
- Check polling interval isn't too aggressive
- Verify deduplication logic in `checkForNewArtisanOrders()`
- Ensure `pendingOrders` Set is working correctly
- Check for multiple instances of notification service

**Debug:**
```javascript
// Log deduplication
console.log('Pending orders cache:', this.pendingOrders);
console.log('New orders:', newOrders.length);
```

---

## Performance Considerations

### Optimization Strategies

1. **Caching:**
   - User profiles cached in notification service
   - Artisan details fetched once per order
   - Preferences checked once and cached

2. **Database Queries:**
   - Use shared database connections
   - Batch fetch related data (artisan + user)
   - Index on `userId`, `orderId`, `isRead`

3. **Email Rendering:**
   - Pre-build orderData when possible
   - Reuse template functions
   - Minimize database lookups

4. **Frontend Polling:**
   - Configurable interval (default 30s)
   - Stop polling when user logs out
   - Debounce rapid API calls

### Recommended Indexes

```javascript
// MongoDB Indexes for notifications
db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.notifications.createIndex({ userId: 1, isRead: 1 });
db.notifications.createIndex({ orderId: 1 });

// For orders
db.orders.createIndex({ userId: 1, status: 1 });
db.orders.createIndex({ artisan: 1, status: 1 });
```

---

## Future Enhancements

### Planned Features

1. **Push Notifications (Web Push API)**
   - Browser push notifications
   - Service worker integration
   - Notification permission management

2. **SMS Notifications**
   - Critical order updates via SMS
   - Twilio integration
   - Phone number verification

3. **Email Digest**
   - Daily/weekly order summaries
   - Preference to batch notifications
   - Reduced email frequency option

4. **Advanced Filtering**
   - Filter notifications by type
   - Archive old notifications
   - Search notification history

5. **Notification Sounds**
   - Audio alerts for new orders
   - Customizable sound preferences
   - Volume control

6. **Rich Notifications**
   - Action buttons in notifications
   - Quick reply functionality
   - Inline order status updates

---

## API Reference

### POST /notifications/send

Send a platform notification (in-app only).

**Request:**
```javascript
{
  "userId": "507f1f77bcf86cd799439011",
  "title": "Order Update",
  "message": "Your order has been confirmed",
  "type": "order_update",
  "orderId": "507f1f77bcf86cd799439012",
  "orderNumber": "39439012"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "type": "order_update",
    "orderId": "507f1f77bcf86cd799439012"
  }
}
```

---

### POST /notifications/send-preference-based

Send notification based on user preferences (email + in-app).

**Request:**
```javascript
{
  "userId": "507f1f77bcf86cd799439011",
  "notificationData": {
    "type": "order_confirmed",
    "title": "Order Confirmed",
    "message": "Your order has been confirmed",
    "orderId": "507f1f77bcf86cd799439012",
    "orderNumber": "39439012",
    "orderData": { /* full order object */ }
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Notification processed based on user preferences",
  "data": {
    "emailSent": true,
    "pushSent": true,
    "preferenceType": "orderUpdates"
  }
}
```

---

### POST /notifications/send-guest-email

Send email to guest user.

**Request:**
```javascript
{
  "guestEmail": "guest@example.com",
  "guestName": "John Guest",
  "notificationData": {
    "type": "order_placed",
    "orderId": "507f1f77bcf86cd799439012",
    "orderNumber": "39439012",
    "orderData": { /* full order object */ }
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Guest email sent successfully"
}
```

---

### GET /notifications/preferences

Get user notification preferences.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "email": {
      "marketing": true,
      "orderUpdates": true,
      "promotions": true,
      "security": true
    },
    "push": {
      "orderUpdates": true,
      "promotions": true,
      "newArtisans": true,
      "nearbyOffers": true
    }
  }
}
```

---

### PUT /notifications/preferences

Update user notification preferences.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```javascript
{
  "preferences": {
    "email": {
      "marketing": false,
      "orderUpdates": true,
      "promotions": false,
      "security": true
    },
    "push": {
      "orderUpdates": true,
      "promotions": false,
      "newArtisans": true,
      "nearbyOffers": false
    }
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Notification preferences updated successfully",
  "data": { /* updated preferences */ }
}
```

---

## Conclusion

The bazaarMKT notification system is a comprehensive, role-aware communication platform that ensures all users (guests, patrons, artisans) stay informed about their orders. With beautiful email templates, smart preference management, and real-time updates, it provides an excellent user experience throughout the entire order lifecycle.

### Key Takeaways:

✅ **Multi-Channel:** Email, in-app, and toast notifications  
✅ **Role-Based:** Different logic for guests, patrons, and artisans  
✅ **Preference-Driven:** Users control what they receive  
✅ **Rich Content:** Beautiful HTML emails with tracking  
✅ **Real-Time:** Polling and event-driven updates  
✅ **Mobile-First:** Responsive design for all devices  

---

**Document Version:** 1.1  
**Last Updated:** October 17, 2025  
**Maintained By:** BazaarMKT Development Team

