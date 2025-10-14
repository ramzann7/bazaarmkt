# Email Notifications - Testing & Verification Guide

## Quick Test: Run This Now

Since your BREVO_API_KEY is configured, let's test if it's actually working:

```bash
cd /Users/ramzan/Documents/bazaarMKT/backend
node test-email.js YOUR_EMAIL@example.com
```

Replace `YOUR_EMAIL@example.com` with your actual email address.

---

## What This Test Does

1. ✅ Verifies BREVO_API_KEY is loaded
2. ✅ Tests connection to Brevo API  
3. ✅ Sends a real test email
4. ✅ Shows detailed error messages if it fails
5. ✅ Confirms email templates work

---

## Expected Results

### If Email System is Working:

```
🔍 Testing Brevo Email Integration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Configuration Check:
  ✓ API Key Set: true
  ✓ API Key Preview: ***Z8v8
  ✓ API URL: https://api.brevo.com/v3
  ✓ Recipient: your@email.com

📧 Sending test email...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ SUCCESS! Email sent successfully!

Response from Brevo:
  Message ID: <some-id>
  Status: 201

📬 Check your inbox: your@email.com
   (Also check spam/junk folder)

✅ Email notification system is WORKING!
```

**Action:** Check your email inbox (and spam folder)

---

### If You Get 401 Unauthorized:

```
❌ 401 Unauthorized - Invalid API Key
```

**Cause:** API key is invalid, expired, or incorrect

**Solution:**
1. Log in to https://app.brevo.com/
2. Go to **SMTP & API** → **API Keys**
3. Regenerate your API key
4. Update `/backend/.env`:
   ```
   BREVO_API_KEY=xkeysib-new-key-here
   ```
5. Restart backend server
6. Run test again

---

### If You Get 403 Forbidden:

```
❌ 403 Forbidden - Permission Issue
```

**Cause:** Sender email not verified OR account suspended

**Solution:**
1. Log in to https://app.brevo.com/
2. Go to **Senders & IPs** → **Senders**
3. Verify **bazaar@bazaarmkt.ca** is in the list and verified
4. If not, add and verify it
5. Check **Account** for any warnings

---

### If You Get Network Error:

```
❌ Network Error - No response from Brevo
```

**Cause:** No internet OR firewall blocking

**Solution:**
1. Check internet connection
2. Try accessing https://api.brevo.com/ in browser
3. Check firewall settings
4. Check Brevo status: https://status.brevo.com/

---

## If Test Succeeds But Orders Don't Send Emails

This means the **Brevo integration works**, but the **notification triggers are not firing**.

### Check Backend Logs

When placing an order, you should see:

```
📧 Email notification check: { hasUserEmail: true, ... }
📧 Sending email notification for status update
✅ Email notification sent to: customer@email.com
```

If you DON'T see these messages, the notification code isn't being executed.

### Common Causes:

#### 1. **User Email Not in Database**

Check user has email:
```bash
cd /Users/ramzan/Documents/bazaarMKT/backend
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkUser() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  // Check last 5 users
  const users = await db.collection('users')
    .find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
    
  console.log('Recent users:');
  users.forEach(u => {
    console.log(\`  \${u.firstName} \${u.lastName}:\`);
    console.log(\`    Email: \${u.email || '❌ NO EMAIL'}\`);
    console.log(\`    ID: \${u._id}\`);
  });
  
  await client.close();
}

checkUser();
"
```

#### 2. **Order Status Not Matching**

Emails only sent for these statuses:

**Patrons:**
- `pending` - Order placed
- `confirmed` - Artisan confirmed
- `declined` - Artisan declined
- `ready_for_pickup` - Ready to pick up
- `ready_for_delivery` - Ready for delivery
- `out_for_delivery` - Being delivered
- `delivered` - Delivered
- `picked_up` - Picked up
- `completed` - Completed

**Artisans:**
- `new_order_pending` - New order received

Check order status:
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
  orders.forEach(o => {
    console.log(\`  Order \${o._id}:\`);
    console.log(\`    Status: \${o.status}\`);
    console.log(\`    Guest: \${o.isGuestOrder}\`);
    console.log(\`    Customer: \${o.customer || 'N/A'}\`);
  });
  
  await client.close();
}

checkOrders();
"
```

#### 3. **Notification Function Not Being Called**

Add debug logging to `/backend/routes/orders/index.js`:

Find line ~75 where `sendEmailNotification` is called, add:
```javascript
console.log('🔍 DEBUG: About to send email notification');
console.log('  User Email:', notificationData.userEmail);
console.log('  Notification Type:', notificationData.type);
console.log('  Status:', notificationData.status);
```

#### 4. **Error Being Caught Silently**

Check for error logs:
```bash
# Watch backend logs while placing order
cd /Users/ramzan/Documents/bazaarMKT/backend
npm run dev

# In another terminal, place test order
# Watch for any ❌ error messages
```

---

## Step-by-Step Debugging Process

### Step 1: Test Brevo API (This Test)

```bash
cd /Users/ramzan/Documents/bazaarMKT/backend
node test-email.js your@email.com
```

**Expected:** ✅ Email received in inbox

**If fails:** Fix Brevo API key/configuration first

---

### Step 2: Check Backend is Running

```bash
cd /Users/ramzan/Documents/bazaarMKT/backend
npm run dev
```

**Expected:** Server starts, shows MongoDB connected

---

### Step 3: Place Test Order

1. Open frontend: http://localhost:5173
2. Log in as patron
3. Place an order
4. Watch backend console logs

**Expected logs:**
```
📧 Email notification check: {...}
📧 Sending email notification...
✅ Email notification sent to: customer@email.com
```

**If you see these:** Email should arrive in inbox

**If you DON'T see these:** Notification not being triggered

---

### Step 4: Check User Has Email

```bash
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const user = await db.collection('users').findOne({ email: 'YOUR_TEST_USER_EMAIL' });
  console.log('User:', user ? 'Found' : 'Not found');
  if (user) {
    console.log('Email:', user.email);
  }
  
  await client.close();
}
check();
"
```

---

### Step 5: Enable Maximum Logging

Add to `/backend/routes/notifications/index.js` line ~463:

```javascript
const sendBrevoEmail = async (userId, notificationData, db) => {
  console.log('🔍 sendBrevoEmail called');
  console.log('  User ID:', userId);
  console.log('  Notification Type:', notificationData.type);
  console.log('  Order ID:', notificationData.orderId);
  
  if (!BREVO_API_KEY) {
    console.warn('⚠️ BREVO_API_KEY not configured, skipping email');
    return;
  }
  
  console.log('✅ BREVO_API_KEY is set, proceeding...');
  
  // ... rest of function
```

---

## Quick Checklist

- [ ] 1. Brevo API key is in `/backend/.env`
- [ ] 2. Test email script sends successfully
- [ ] 3. Backend server is running
- [ ] 4. User account has email address
- [ ] 5. Order placed with correct status
- [ ] 6. Backend logs show email notification messages
- [ ] 7. No error messages in backend logs
- [ ] 8. Email received in inbox (check spam)

---

## Common Solutions

### Solution 1: API Key Invalid

```bash
# Get new API key from Brevo
# Update .env:
BREVO_API_KEY=xkeysib-new-key

# Restart server
```

### Solution 2: User Missing Email

```bash
# Add email to user in database
# Or re-register user with email
```

### Solution 3: Notification Not Triggering

```javascript
// Add debug logs to:
// /backend/routes/orders/index.js
// Around line 75 where notifications are sent
```

### Solution 4: Email in Spam

- Check spam/junk folder
- Add `bazaar@bazaarmkt.ca` to contacts
- Mark as "Not Spam"

---

## Next Steps

1. **Run test email script NOW:**
   ```bash
   cd /Users/ramzan/Documents/bazaarMKT/backend
   node test-email.js your@email.com
   ```

2. **Share the output** - This will tell us exactly what's wrong

3. **Based on results**, we'll know whether to:
   - Fix Brevo API configuration (if test fails)
   - Fix notification triggers (if test succeeds)

---

**Status:** Ready to test
**Action Required:** Run `node test-email.js your@email.com`
**Time Required:** 30 seconds

---

**Last Updated:** October 10, 2025

