# Email Notifications - Trigger Debugging Guide

## ✅ CONFIRMED: Email System Works!

**Test Result:** Email successfully sent via Brevo API
**Message ID:** 202510101620.64395010226@smtp-relay.mailin.fr
**Status:** Working ✅

## 🔴 The Real Problem

Emails work when tested directly, but **aren't being triggered** when orders are placed/updated.

This means the issue is in the **order → notification → email flow**, not the email service itself.

---

## Debugging Strategy

### Step 1: Add Debug Logging to Order Routes

Let's add detailed logging to see what's happening when orders are placed.

**File:** `/backend/routes/orders/index.js`

Find the section around **line 64-114** where emails are sent and add these logs:

```javascript
// Around line 64 in the sendNotificationDirect function
const sendNotificationDirect = async (notificationData, db) => {
  try {
    // ADD THIS LOG:
    console.log('🔍 DEBUG: sendNotificationDirect called');
    console.log('  Type:', notificationData.type);
    console.log('  User Email:', notificationData.userEmail);
    console.log('  User ID:', notificationData.userId);
    console.log('  Is Guest:', notificationData.userInfo?.isGuest);
    
    // Send platform notification
    const sendReq = {
      body: notificationData,
      db: db
    };
    
    const sendRes = {
      json: (data) => console.log('✅ Notification response:', data),
      status: (code) => ({ json: (data) => console.log(`❌ Notification error (${code}):`, data) })
    };

    await sendNotification(sendReq, sendRes);
    
    // ADD THIS LOG:
    console.log('🔍 DEBUG: Checking if email should be sent...');
    console.log('  Has userEmail:', !!notificationData.userEmail);
    console.log('  Has type:', !!notificationData.type);
    console.log('  Status:', notificationData.status);
    
    // Send email notification if user has email and it's an order status update
    // ... existing email logic
```

**Then around line 29-114, add more detailed logging:**

```javascript
// Around line 29
console.log('📧 Email notification check:', {
  hasUserEmail: !!notificationData.userEmail,
  userEmail: notificationData.userEmail,  // ADD THIS
  notificationType: notificationData.type,  // ADD THIS
  orderStatus: notificationData.status,  // ADD THIS
  isGuest: notificationData.userInfo?.isGuest
});
```

### Step 2: Test Order Placement with Logging

1. **Start backend with logging:**
   ```bash
   cd /Users/ramzan/Documents/bazaarMKT/backend
   npm run dev
   ```

2. **In another terminal, monitor logs:**
   ```bash
   cd /Users/ramzan/Documents/bazaarMKT/backend
   tail -f logs/combined.log
   ```

3. **Place a test order** and watch the console output

4. **Look for these specific log messages:**
   ```
   🔍 DEBUG: sendNotificationDirect called
   📧 Email notification check: {...}
   📧 Sending email notification for status update
   ✅ Email notification sent to: customer@email.com
   ```

---

## Common Issues & Solutions

### Issue 1: No Email Logs Appearing

**Symptom:** You don't see any `📧 Email notification check` logs

**Cause:** `sendNotificationDirect` function is not being called

**Solution:** Check if order is being created successfully. Look for these logs:
```bash
✅ Customer order placement notification sent
✅ Artisan notification sent
```

If you don't see these, the notification function isn't being called at all.

**Debug:** Add this log right after order creation (around line 850):
```javascript
console.log('🔍 DEBUG: Order created, about to send notifications');
console.log('  Order ID:', result.insertedId);
console.log('  Customer User Info:', customerUserInfo);
console.log('  Customer Email:', customerUserInfo.email);
```

---

### Issue 2: Email Logs Appear But Email Not Sent

**Symptom:** You see `📧 Email notification check` but not `✅ Email notification sent`

**Cause:** Email conditions not met OR error being caught silently

**Check:** Look at the email notification check output:
```javascript
{
  hasUserEmail: true/false,  // Must be true
  isPatronEmailAllowed: true/false,  // Must be true
  isArtisanEmail: true/false,  // Must be true for artisans
  userEmail: 'actual@email.com'  // Must not be null
}
```

**Solution:** 

1. If `hasUserEmail: false`:
   - User doesn't have email in database
   - Fix: Add email to user account

2. If `isPatronEmailAllowed: false`:
   - Order status doesn't match allowed statuses
   - Check order status matches: pending, confirmed, declined, etc.

3. If `isArtisanEmail: false` for artisan:
   - Notification type doesn't match artisan types
   - Should be: new_order_pending, order_confirmation_sent, etc.

---

### Issue 3: Error Caught Silently

**Symptom:** Logs show "Sending email" but then silence

**Cause:** Error in sendEmailNotification function being caught

**Check:** Look for `❌ Error sending email notification:` in logs

**Solution:** The error message will tell you exactly what's wrong

---

## Quick Diagnostic Commands

### Check User Has Email

```bash
cd /Users/ramzan/Documents/bazaarMKT/backend
node -e "
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function checkUser(userIdOrEmail) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  let query = {};
  if (userIdOrEmail.includes('@')) {
    query = { email: userIdOrEmail };
  } else {
    query = { _id: new ObjectId(userIdOrEmail) };
  }
  
  const user = await db.collection('users').findOne(query);
  
  if (user) {
    console.log('✅ User found:');
    console.log('  Name:', user.firstName, user.lastName);
    console.log('  Email:', user.email || '❌ NO EMAIL');
    console.log('  Role:', user.role || user.userType);
    console.log('  ID:', user._id);
  } else {
    console.log('❌ User not found');
  }
  
  await client.close();
}

// Usage: Replace with actual user ID or email
checkUser('ramzan0104@gmail.com');
"
```

### Check Recent Orders

```bash
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkOrders() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const orders = await db.collection('orders')
    .find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
    
  console.log('Recent orders:');
  orders.forEach((o, i) => {
    console.log(\`\\n\${i + 1}. Order \${o._id}:\`);
    console.log(\`   Status: \${o.status}\`);
    console.log(\`   Is Guest: \${o.isGuestOrder}\`);
    console.log(\`   Customer ID: \${o.customer}\`);
    console.log(\`   Guest Email: \${o.guestInfo?.email || 'N/A'}\`);
    console.log(\`   Created: \${new Date(o.createdAt).toLocaleString()}\`);
  });
  
  await client.close();
}

checkOrders();
"
```

### Check Notifications Collection

```bash
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkNotifications() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const notifications = await db.collection('notifications')
    .find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
    
  console.log('Recent notifications:', notifications.length);
  notifications.forEach((n, i) => {
    console.log(\`\\n\${i + 1}. Notification \${n._id}:\`);
    console.log(\`   Type: \${n.type}\`);
    console.log(\`   Title: \${n.title}\`);
    console.log(\`   User ID: \${n.userId}\`);
    console.log(\`   Order ID: \${n.orderId}\`);
    console.log(\`   Created: \${new Date(n.createdAt).toLocaleString()}\`);
  });
  
  await client.close();
}

checkNotifications();
"
```

---

## Step-by-Step Testing Process

### 1. Verify User Email Exists

```bash
# Check your test user has email
node -e "..." # Use command above with your email
```

**Expected:** User found with email

**If no email:** Add email to user in database or create new user with email

---

### 2. Place Test Order with Logging

1. **Start backend:**
   ```bash
   cd /Users/ramzan/Documents/bazaarMKT/backend
   npm run dev
   ```

2. **Place order via frontend**

3. **Watch console for:**
   ```
   🔍 DEBUG: sendNotificationDirect called
   📧 Email notification check: { hasUserEmail: true, ... }
   📧 Sending email notification for status update
   ✅ Email notification sent to: customer@email.com
   ```

---

### 3. Check What's Missing

**If you see:**
- ❌ No notification logs → Notification not being called
- ❌ `hasUserEmail: false` → User email not set
- ❌ `isPatronEmailAllowed: false` → Status not matching
- ❌ Error message → Check error details

---

## Most Likely Issues

Based on code analysis, the most common issues are:

### 1. User Email Not Being Retrieved

**Problem:** `customerUserInfo.email` is null/undefined

**Location:** `/backend/routes/orders/index.js` around line 820-850

**Check:** 
```javascript
console.log('🔍 Customer User Info:', customerUserInfo);
console.log('🔍 Customer Email:', customerUserInfo.email);
```

**Fix:** Ensure user account has email set

---

### 2. Order Status Not Matching Allowed Statuses

**Problem:** Order status is something other than expected values

**Location:** Line 32-34 in orders/index.js

**Check:**
```javascript
console.log('🔍 Order Status:', notificationData.status);
console.log('🔍 Is Patron Email Allowed:', isPatronEmailAllowed);
```

**Fix:** Ensure order status is one of:
- pending, confirmed, declined, ready_for_pickup, ready_for_delivery, out_for_delivery, delivered, picked_up, completed

---

### 3. Notification Type Not Set

**Problem:** `notificationData.type` is undefined or wrong

**Location:** Line 860-880 in orders/index.js

**Check:**
```javascript
console.log('🔍 Notification Type:', notificationData.type);
```

**Fix:** Ensure notification type is set correctly:
- For patrons: order_placed, order_confirmed, order_declined, etc.
- For artisans: new_order_pending

---

### 4. Error in Email Sending

**Problem:** Exception thrown in sendEmailNotification

**Location:** Line 110-114 in orders/index.js

**Check:** Look for:
```
❌ Error sending email notification: [error message]
```

**Fix:** Error message will indicate specific issue

---

## Enhanced Debug Logging Patch

Add this comprehensive logging to `/backend/routes/orders/index.js`:

```javascript
// Around line 870 (after order creation, before sending notifications)
console.log('━'.repeat(60));
console.log('🔍 ORDER NOTIFICATION DEBUG');
console.log('━'.repeat(60));
console.log('Order ID:', result.insertedId);
console.log('Customer User Info:', JSON.stringify(customerUserInfo, null, 2));
console.log('Customer Email:', customerUserInfo.email);
console.log('Order Status:', order.status);
console.log('Is Guest Order:', order.isGuestOrder);
console.log('━'.repeat(60));

// Then continue with existing notification code...
const customerNotificationData = {
  type: 'order_placed',
  // ... rest
};

console.log('🔍 Customer Notification Data:', JSON.stringify(customerNotificationData, null, 2));

await sendNotificationDirect(customerNotificationData, db);
```

---

## Next Steps

1. **Add the debug logging** to orders/index.js (around lines mentioned)

2. **Restart backend server:**
   ```bash
   cd /Users/ramzan/Documents/bazaarMKT/backend
   npm run dev
   ```

3. **Place a test order**

4. **Share the console output** - specifically look for:
   - The `🔍 ORDER NOTIFICATION DEBUG` section
   - The `📧 Email notification check` logs
   - Any `❌ Error` messages

5. **Based on the output**, we can pinpoint exactly why emails aren't being sent

---

## Quick Test Script

Create this file to simulate order notification:

**File:** `/backend/test-order-notification.js`

```javascript
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function testOrderNotification() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  // Get a test user
  const user = await db.collection('users').findOne({ 
    email: 'ramzan0104@gmail.com' // Your test email
  });
  
  if (!user) {
    console.error('❌ User not found');
    await client.close();
    return;
  }
  
  console.log('✅ User found:', user.firstName, user.lastName);
  console.log('   Email:', user.email);
  
  // Simulate order notification
  const { sendNotification, sendEmailNotification } = require('./routes/notifications/index');
  
  const notificationData = {
    type: 'order_placed',
    userId: user._id,
    userEmail: user.email,
    title: 'Test Order Placed',
    message: 'This is a test order notification',
    orderNumber: 'TEST123',
    orderId: new ObjectId(),
    status: 'pending',
    userInfo: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isGuest: false
    }
  };
  
  console.log('\n🔍 Sending test notification...');
  console.log('Notification Data:', JSON.stringify(notificationData, null, 2));
  
  // Send email
  const emailReq = {
    body: {
      to: user.email,
      subject: 'Test Order Notification',
      template: 'order_completion',
      data: {
        userName: user.firstName,
        orderNumber: 'TEST123',
        status: 'pending',
        userId: user._id,
        orderId: notificationData.orderId,
        totalAmount: 50.00,
        items: [{ productName: 'Test Product', quantity: 1, unitPrice: 50.00 }],
        deliveryMethod: 'pickup'
      }
    },
    db: db
  };
  
  const emailRes = {
    json: (data) => {
      console.log('\n✅ Email Response:', data);
      client.close();
    },
    status: (code) => ({ 
      json: (data) => {
        console.error('\n❌ Email Error ('+code+'):', data);
        client.close();
      }
    })
  };
  
  await sendEmailNotification(emailReq, emailRes);
}

testOrderNotification();
```

**Run:**
```bash
cd /Users/ramzan/Documents/bazaarMKT/backend
node test-order-notification.js
```

This will test the notification → email flow directly.

---

**Status:** Email system working ✅ | Investigating notification triggers 🔍
**Next Action:** Add debug logging and place test order
**Expected Time:** 10-15 minutes to identify issue

---

**Last Updated:** October 10, 2025

