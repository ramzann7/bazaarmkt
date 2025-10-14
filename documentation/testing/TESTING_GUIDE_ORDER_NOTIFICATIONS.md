# Testing Guide: Order & Notification System

**Created:** September 30, 2025  
**Purpose:** Manual testing guide for all notification and order fixes

---

## 🧪 Pre-Testing Setup

### 1. Ensure Backend is Running
```bash
cd /Users/ramzan/Documents/bazaarMKT/backend
npm run dev
```

**Expected Output:**
```
Server running on port 4000
Health check: http://localhost:4000/api/health
```

### 2. Verify Brevo Configuration
Check that Brevo API key is set:
```bash
grep BREVO_API_KEY backend/.env
```

Should show: `BREVO_API_KEY=xkeysib-...`

### 3. Check Email Inbox
You'll need access to these emails to verify:
- `ramzan.7@hotmail.com` (artisan email)
- Any test guest email you use

---

## 🎫 Test 1: Guest Order Notifications

### Objective
Verify that guest users receive emails for ALL order status changes.

### Steps

**1.1 Create Guest Order**
- Go to bazaar website
- Add products to cart
- Checkout as guest (use test email)
- Complete checkout

**Expected Result:**
- ✅ Order created successfully
- ✅ Email received: "Order Confirmed!" with beautiful template
- ✅ Backend logs: `✅ Guest order confirmation email sent to [email]`

**1.2 Update Order Status (as Artisan)**
- Login as artisan: `ramzan.7@hotmail.com`
- Go to Orders page
- Find the test guest order
- Change status: `pending → confirmed`

**Expected Result:**
- ✅ Status updated in UI
- ✅ Email received: "Order Status Update" 
- ✅ Backend logs: `✅ Guest email sent successfully to [email]`

**1.3 Continue Status Changes**
Try these status changes:
- `confirmed → preparing`
- `preparing → ready_for_pickup` OR `ready_for_delivery`
- `ready → delivered`

**Expected Result:**
- ✅ Email received for EACH status change
- ✅ Each email shows old status → new status
- ✅ Professional HTML template used

---

## 👤 Test 2: Patron Order Notifications

### Objective
Verify patrons receive email ONLY for confirmation, then in-app only for updates.

### Steps

**2.1 Create Patron Order**
- Logout if logged in as artisan
- Login or register as a patron (NOT artisan)
- Add products to cart
- Checkout and complete order

**Expected Result:**
- ✅ Order created successfully
- ✅ **Email received**: "Order Confirmed!" 
- ✅ In-app notification appears
- ✅ Backend logs: `✅ Patron order confirmation sent (email + in-app)`

**2.2 Update Order Status (as Artisan)**
- Logout, login as artisan
- Find the patron's order
- Change status: `pending → confirmed`

**Expected Result:**
- ✅ Status updated
- ❌ **NO email sent to patron**
- ✅ Backend logs: `⏭️ Skipping email for user XXX (patron, type=order_update)`
- 🔔 In-app notification created

**2.3 Check In-App Notifications (as Patron)**
- Logout, login as the patron
- Click notifications bell icon
- Should see order status update

**Expected Result:**
- ✅ Notification appears in notification center
- ✅ Shows order number and status change
- ✅ Clicking it navigates to order details

---

## 🏪 Test 3: Artisan Order Notifications

### Objective
Verify artisans receive email for NEW orders, then in-app only for updates.

### Steps

**3.1 Create Order (triggers artisan email)**
- Place order as guest OR patron
- Order should be for artisan's products

**Expected Result:**
- ✅ **Artisan receives email**: "New Order Received!"
- ✅ Email shows order number and amount
- ✅ Backend logs: `✅ Artisan email sent for new order [orderId]`

**3.2 Check Artisan Dashboard**
- Login as artisan
- Go to Dashboard or Orders page
- Should see new order badge/notification

**Expected Result:**
- ✅ New order appears in list
- ✅ Priority highlighting (if urgent)
- ✅ Order details complete

**3.3 Artisan Updates Own Order**
- As artisan, update any order status
- Check notifications

**Expected Result:**
- ✅ Status updated successfully
- ❌ **NO email sent to artisan**
- ✅ Backend logs: `⏭️ Skipping email for user XXX (artisan, type=order_update)`

---

## 🔧 Test 4: Profile Updates

### Objective
Verify profile endpoints work for both patrons and artisans.

### Steps

**4.1 Patron Profile Update**
- Login as patron
- Go to Profile → Personal Info
- Update name or phone
- Save changes

**Expected Result:**
- ✅ Profile updated successfully
- ✅ Changes persisted after page refresh
- ✅ No errors in console

**4.2 Artisan Profile Update**
- Login as artisan
- Go to Profile → Overview tab
- Update artisan name or description
- Save changes

**Expected Result:**
- ✅ Artisan profile updated
- ✅ Changes visible immediately
- ✅ No errors in console

**4.3 Artisan Operations Update**
- Go to Profile → Operations tab
- Update business hours or delivery options
- Save changes

**Expected Result:**
- ✅ Operations updated
- ✅ Data persisted correctly
- ✅ Backend logs: `✅ Operations updated successfully`

---

## 🔔 Test 5: Notification Preferences

### Objective
Verify notification preferences are saved and respected.

### Steps

**5.1 View Preferences**
- Login as patron or artisan
- Go to Profile → Notifications tab
- Should see email and push preferences

**Expected Result:**
- ✅ Preferences loaded correctly
- ✅ All toggles functional
- ✅ No loading errors

**5.2 Update Preferences**
- Toggle off "Order Updates" in email notifications
- Save changes
- Verify saved

**Expected Result:**
- ✅ Preferences saved
- ✅ Success message shown
- ✅ Toggles reflect saved state after refresh

**5.3 Test Preference Enforcement**
- For artisans: Preferences are IGNORED for new orders (always email)
- For patrons: Preferences are IGNORED for order confirmation (always email)
- For both: Preferences respected for other notification types

**Expected Result:**
- ✅ Critical notifications always sent
- ✅ Optional notifications respect preferences

---

## 📊 Backend Logs to Monitor

### Successful Flow Logs

When everything works, you should see:

```
✅ Permission granted: artisan
📧 Artisan notification: type=new_order, sendEmail=true
✅ Email sent to user 68bfa0ec38427321e62b55e6 (artisan): New Order Received!
🔔 Platform notification sent to user 68bfa0ec38427321e62b55e6: New Order Received!
```

### Error Logs to Watch For

```
❌ Failed to send email to user XXX: [error details]
❌ Permission denied: User is neither the artisan nor the order owner
❌ Brevo API error: [details]
```

---

## 🐛 Troubleshooting

### Issue: No emails received

**Check:**
1. BREVO_API_KEY is set in backend/.env
2. Backend server restarted after changes
3. Check spam/junk folder
4. Check backend logs for Brevo errors

**Fix:**
```bash
# Verify Brevo key
grep BREVO_API_KEY backend/.env

# Restart server
cd backend && pkill -9 -f "node.*server-vercel" && npm run dev
```

### Issue: 403 Forbidden when updating orders

**Check:**
1. User is logged in as artisan
2. Order belongs to that artisan
3. Backend logs show permission check details

**Fix:**
- Check console logs for `🔍 Order status update permission check`
- Verify `isArtisan: true` in logs
- Verify `artisanIdToCompare` matches `orderArtisanId`

### Issue: In-app notifications not showing

**Check:**
1. Notification preferences enabled for push
2. Notifications collection has entries
3. Frontend fetching notifications

**Fix:**
```javascript
// In browser console
localStorage.getItem('token')  // Should return valid token
```

---

## ✅ Success Criteria

All tests pass when:

- [ ] Guest receives confirmation email
- [ ] Guest receives status update emails
- [ ] Patron receives confirmation email only
- [ ] Patron sees in-app notifications for updates
- [ ] Artisan receives new order email
- [ ] Artisan sees in-app notifications
- [ ] No 403 errors when artisan updates orders
- [ ] All emails use beautiful HTML templates
- [ ] No errors in backend console
- [ ] Notification preferences work

---

## 📝 Test Results Template

Use this to document your test results:

```
Date: [DATE]
Tester: [NAME]

Test 1: Guest Notifications
- Order creation email: [ ] Pass [ ] Fail
- Status update emails: [ ] Pass [ ] Fail
- Notes: 

Test 2: Patron Notifications  
- Confirmation email: [ ] Pass [ ] Fail
- In-app updates only: [ ] Pass [ ] Fail
- Notes:

Test 3: Artisan Notifications
- New order email: [ ] Pass [ ] Fail
- In-app updates: [ ] Pass [ ] Fail
- Notes:

Test 4: Profile Updates
- Patron profile: [ ] Pass [ ] Fail
- Artisan profile: [ ] Pass [ ] Fail
- Notes:

Test 5: Notification Preferences
- Load preferences: [ ] Pass [ ] Fail
- Save preferences: [ ] Pass [ ] Fail
- Notes:

Overall Status: [ ] All Pass [ ] Some Failures
```

---

**Ready for Testing!** 🚀
