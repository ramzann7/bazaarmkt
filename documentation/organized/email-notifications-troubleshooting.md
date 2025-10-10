# Email Notifications Troubleshooting Guide

## Issue: Email Notifications Not Being Triggered

**Status:** 🔴 Investigation Complete - Multiple Issues Identified
**Date:** October 10, 2025

---

## Executive Summary

The email notification system is properly implemented but **not configured**. The root cause is **missing BREVO_API_KEY environment variable**. When this key is not set, the system silently fails with warning messages but doesn't actually send emails.

---

## System Architecture

### Email Service Provider: Brevo (formerly Sendinblue)

The application uses **Brevo API** for sending transactional emails (order confirmations, status updates, etc.).

### Key Components

1. **Backend Notification Service** (`/backend/routes/notifications/index.js`)
   - Handles email template generation
   - Sends emails via Brevo API
   - Manages notification preferences

2. **Frontend Brevo Service** (`/frontend/src/services/brevoService.js`)
   - Client-side email sending (rarely used)
   - Manages API key configuration
   
3. **Order Routes** (`/backend/routes/orders/index.js`)
   - Triggers email notifications on order events
   - Calls backend notification service

---

## Root Cause Analysis

### Primary Issue: Missing BREVO_API_KEY

**Location:** Backend environment variables

**Evidence from Code:**

```javascript
// backend/routes/notifications/index.js:12
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Line 464-466
if (!BREVO_API_KEY) {
  console.warn('⚠️ BREVO_API_KEY not configured, skipping email');
  return;
}
```

**What Happens:**
1. Order is placed/updated
2. System attempts to send email notification
3. Checks for `BREVO_API_KEY`
4. If missing: Logs warning and returns early
5. **Email is never sent**

### Secondary Issues Identified

1. **Silent Failures**
   - System logs warnings but doesn't throw errors
   - Users receive in-app notifications but no emails
   - No alerts to administrators

2. **Environment Variable Not Set**
   - `BREVO_API_KEY` not configured in Vercel (production)
   - Not configured in local `.env` file (development)

3. **No Fallback Mechanism**
   - No alternative email service configured
   - No retry logic
   - No queue system

---

## How Email Notifications Should Work

### Workflow

```
[Order Event] 
    ↓
[Backend Route Handler]
    ↓
[Send Notification Function]
    ↓
[Check BREVO_API_KEY] ← ⚠️ FAILS HERE if not set
    ↓
[Generate HTML Email Template]
    ↓
[Send via Brevo API]
    ↓
[User Receives Email]
```

### Trigger Points

Emails are sent on these events:

**For Patrons (Customers):**
- Order placed (`pending`)
- Order confirmed (`confirmed`)
- Order declined (`declined`)
- Ready for pickup (`ready_for_pickup`)
- Ready for delivery (`ready_for_delivery`)
- Out for delivery (`out_for_delivery`)
- Delivered/Picked up (`delivered`, `picked_up`)
- Completed (`completed`)

**For Artisans:**
- New order received (`new_order_pending`)
- Order confirmation sent (`order_confirmation_sent`)

### Code References

**Order Email Trigger** (`backend/routes/orders/index.js:15`)
```javascript
const { sendNotification, sendEmailNotification } = require('../notifications/index');

// Lines 29-114: Email notification logic
// Checks user role, status, and sends appropriate emails
```

**Email Sending Function** (`backend/routes/notifications/index.js:463-589`)
```javascript
const sendBrevoEmail = async (userId, notificationData, db) => {
  if (!BREVO_API_KEY) {
    console.warn('⚠️ BREVO_API_KEY not configured, skipping email');
    return; // ← Email never sent
  }
  // ... email sending logic
}
```

---

## Solution Implementation

### Step 1: Get Brevo API Key

#### Option A: If You Have a Brevo Account

1. Log in to [Brevo Dashboard](https://app.brevo.com)
2. Navigate to **SMTP & API** → **API Keys**
3. Create a new API key or copy existing key
4. Format: `xkeysib-XXXXXXXXXXXXX`

#### Option B: Create New Brevo Account

1. Go to [Brevo.com](https://www.brevo.com)
2. Sign up for free account (free tier includes 300 emails/day)
3. Verify your email address
4. Navigate to **SMTP & API** → **API Keys**
5. Create new API key
6. Copy the key (format: `xkeysib-XXXXXXXXXXXXX`)

### Step 2: Configure Backend (Required)

#### For Local Development

**File:** `/backend/.env`

```bash
# Add this line (replace with your actual key)
BREVO_API_KEY=xkeysib-your-actual-api-key-here
ENABLE_EMAIL_NOTIFICATIONS=true
```

**Verification:**
```bash
cd /Users/ramzan/Documents/bazaarMKT/backend
grep BREVO_API_KEY .env
# Should show: BREVO_API_KEY=xkeysib-...
```

#### For Vercel Production

**Method 1: Via Vercel Dashboard**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `bazaarMKT`
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name:** `BREVO_API_KEY`
   - **Value:** `xkeysib-your-actual-api-key-here`
   - **Environment:** Production (+ Preview if needed)
5. Click **Save**
6. **Redeploy** your application

**Method 2: Via Vercel CLI**

```bash
vercel env add BREVO_API_KEY production
# Paste your API key when prompted: xkeysib-your-actual-api-key-here
```

### Step 3: Configure Frontend (Optional)

**File:** `/frontend/.env`

```bash
# Optional - for client-side email features
VITE_BREVO_API_KEY=xkeysib-your-actual-api-key-here
```

**Note:** Frontend configuration is optional. Backend handles all order notification emails.

### Step 4: Restart Services

#### Local Development
```bash
# Stop backend server (Ctrl+C)
# Restart backend
cd /Users/ramzan/Documents/bazaarMKT/backend
npm run dev
```

#### Production (Vercel)
After adding environment variable:
1. Trigger new deployment OR
2. Go to **Deployments** tab and redeploy latest

### Step 5: Verify Configuration

#### Check Backend Logs

When server starts, look for:
```
✅ Server is running
✅ Database connected
🔍 Checking BREVO_API_KEY...
```

If key is missing:
```
⚠️ BREVO_API_KEY not configured, skipping email
```

#### Test Email Notification

1. Place a test order
2. Check backend logs for:
   ```
   📧 Sending email notification for status update
   ✅ Email notification sent to: customer@example.com
   ```

3. Check customer email inbox (including spam folder)

---

## Detailed Configuration Guide

### Backend Environment Variables

**Required Variables:**

| Variable | Description | Example | Where Used |
|----------|-------------|---------|------------|
| `BREVO_API_KEY` | Brevo API key for sending emails | `xkeysib-abc123...` | `backend/routes/notifications/index.js` |
| `ENABLE_EMAIL_NOTIFICATIONS` | Enable/disable emails | `true` | Backend config |

### Email Templates

The system has beautiful HTML email templates:

1. **Order Confirmation** (`generateOrderConfirmationHTML`)
   - Sent when order is placed
   - Includes order timeline
   - Shows pickup/delivery info

2. **Order Update** (`generateOrderUpdateHTML`)
   - Sent on status changes
   - Dynamic timeline progress
   - Next action guidance

3. **Order Decline** (special template)
   - Sent when artisan declines
   - Includes decline reason
   - Red color scheme

### Email Notification Logic

**Code:** `backend/routes/orders/index.js:29-114`

```javascript
// Patron email allowed statuses
const patronEmailStatuses = [
  'pending', 'confirmed', 'declined', 
  'out_for_delivery', 'ready_for_pickup', 
  'ready_for_delivery', 'delivered', 
  'picked_up', 'completed'
];

// Artisan email types
const artisanEmailTypes = [
  'new_order_pending', 
  'order_confirmation_sent', 
  'order_status_update'
];

// Email is sent if:
if (notificationData.userEmail && notificationData.type && 
    (isPatronEmailAllowed || isArtisanEmail)) {
  await sendEmailNotification(emailReq, emailRes);
}
```

---

## Testing Checklist

### Pre-Test Setup

- [ ] BREVO_API_KEY configured in backend
- [ ] Backend server restarted
- [ ] Vercel environment variable set (for production)
- [ ] Application redeployed (for production)

### Test Scenarios

#### Test 1: Order Placement Email

1. **Action:** Place new order as patron
2. **Expected:** 
   - ✅ Order confirmation email received
   - ✅ Subject: "📦 Order Placed - #ABC123"
   - ✅ Email contains order details and timeline

3. **Check Logs:**
   ```
   📧 Sending email notification for status update
   📧 Email notification check: { hasUserEmail: true, isPatronEmailAllowed: true }
   ✅ Email notification sent to: customer@example.com
   ```

#### Test 2: Order Confirmation Email (Artisan confirms)

1. **Action:** Artisan confirms pending order
2. **Expected:** 
   - ✅ Patron receives "Order Confirmed" email
   - ✅ Subject: "✅ Order Confirmed - #ABC123"
   - ✅ Timeline shows "Confirmed" step highlighted

#### Test 3: Order Decline Email

1. **Action:** Artisan declines order with reason
2. **Expected:** 
   - ✅ Patron receives "Order Declined" email
   - ✅ Subject: "⚠️ Order Declined - #ABC123"
   - ✅ Email shows decline reason
   - ✅ Red color scheme

#### Test 4: New Order Email (Artisan notification)

1. **Action:** Patron places order with artisan
2. **Expected:** 
   - ✅ Artisan receives "New Order" email
   - ✅ Subject: "📦 Order Placed - #ABC123"
   - ✅ Email contains customer and order details

#### Test 5: Guest Order Email

1. **Action:** Guest (not logged in) places order
2. **Expected:** 
   - ✅ Guest receives email at provided email address
   - ✅ Email template same as registered users

### Verification Commands

```bash
# Check if BREVO_API_KEY is set (backend)
cd /Users/ramzan/Documents/bazaarMKT/backend
grep BREVO_API_KEY .env

# Check backend logs for email sending
# Look for these patterns:
# ⚠️ BREVO_API_KEY not configured  ← BAD
# ✅ Email notification sent  ← GOOD
```

---

## Common Issues and Solutions

### Issue 1: "⚠️ BREVO_API_KEY not configured"

**Symptom:** This warning appears in logs

**Cause:** Environment variable not set

**Solution:**
1. Add `BREVO_API_KEY` to `.env` file (backend)
2. Restart backend server
3. For production: Add to Vercel and redeploy

### Issue 2: Emails Not Reaching Inbox

**Possible Causes:**
1. **API Key Invalid**
   - Verify key format: `xkeysib-...`
   - Check key is active in Brevo dashboard
   
2. **Email in Spam**
   - Check spam/junk folder
   - Add `bazaar@bazaarmkt.ca` to contacts
   
3. **Sender Not Verified**
   - Verify sender domain in Brevo
   - Use verified sender email

4. **Brevo Account Suspended**
   - Check Brevo dashboard for account status
   - Verify daily sending limit not exceeded

### Issue 3: Some Emails Send, Others Don't

**Cause:** User notification preferences

**Solution:**
Check user's notification preferences:
```javascript
// backend/routes/notifications/index.js:1040-1079
// Checks if user has enabled email notifications
```

User can disable certain types of emails in their profile settings.

### Issue 4: 401 Unauthorized from Brevo API

**Cause:** Invalid API key

**Solution:**
1. Log in to Brevo dashboard
2. Verify API key is active
3. Regenerate new API key if needed
4. Update environment variable
5. Restart/redeploy

### Issue 5: 403 Forbidden from Brevo API

**Cause:** 
- Sender email not verified
- Account suspended
- API key permissions

**Solution:**
1. Verify sender email in Brevo dashboard
2. Check account status
3. Ensure API key has transactional email permissions

---

## Monitoring and Debugging

### Enable Debug Logging

**Temporary Debug Mode:**

Add to backend code (`backend/routes/notifications/index.js:13`):
```javascript
const BREVO_API_KEY = process.env.BREVO_API_KEY;
console.log('🔍 BREVO_API_KEY configured:', !!BREVO_API_KEY);
console.log('🔍 API Key preview:', BREVO_API_KEY ? `***${BREVO_API_KEY.slice(-4)}` : 'Not set');
```

### Log Patterns to Watch

**Successful Email:**
```
📧 Sending email notification for status update
✅ Email notification sent to: customer@example.com
✅ Brevo email sent using comprehensive template to: customer@example.com
```

**Failed Email:**
```
⚠️ BREVO_API_KEY not configured, skipping email
❌ Error sending email notification: [error message]
```

### Brevo Dashboard Monitoring

1. Log in to [Brevo Dashboard](https://app.brevo.com)
2. Go to **Statistics** → **Email**
3. Check:
   - Emails sent today
   - Delivery rate
   - Bounce rate
   - Failed deliveries

---

## Alternative Solutions

### If Brevo Doesn't Work

#### Option 1: Use Nodemailer with SMTP

**Install:**
```bash
cd /Users/ramzan/Documents/bazaarMKT/backend
npm install nodemailer
```

**Configure** (`backend/routes/notifications/index.js`):
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Replace sendBrevoEmail with:
const sendSMTPEmail = async (userId, notificationData, db) => {
  // ... get user email
  
  await transporter.sendMail({
    from: 'bazaar@bazaarmkt.ca',
    to: user.email,
    subject: dynamicSubject,
    html: htmlContent
  });
};
```

**Environment Variables:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Option 2: Use SendGrid

**Install:**
```bash
npm install @sendgrid/mail
```

**Configure:**
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendSendGridEmail = async (userId, notificationData, db) => {
  await sgMail.send({
    to: user.email,
    from: 'bazaar@bazaarmkt.ca',
    subject: dynamicSubject,
    html: htmlContent
  });
};
```

#### Option 3: Use AWS SES

**Install:**
```bash
npm install @aws-sdk/client-ses
```

---

## Security Considerations

### API Key Protection

1. **Never Commit API Keys**
   - ✅ `.env` files are in `.gitignore`
   - ❌ Never commit API keys to git
   
2. **Use Environment Variables**
   - ✅ Store keys in `.env` files
   - ✅ Use Vercel environment variables for production
   
3. **Rotate Keys Periodically**
   - Regenerate API keys every 90 days
   - Update environment variables after rotation

### Email Security

1. **SPF Records**
   - Configure SPF records for your domain
   - Helps prevent emails marked as spam

2. **DKIM Signing**
   - Enable DKIM in Brevo dashboard
   - Authenticates email sender

3. **DMARC Policy**
   - Set up DMARC for your domain
   - Protects against email spoofing

---

## Quick Fix Checklist

### Immediate Actions

- [ ] 1. Get Brevo API key from dashboard
- [ ] 2. Add `BREVO_API_KEY` to backend `.env` file
- [ ] 3. Restart backend server
- [ ] 4. Test with order placement
- [ ] 5. Verify email received

### Production Deployment

- [ ] 1. Log in to Vercel dashboard
- [ ] 2. Add `BREVO_API_KEY` environment variable
- [ ] 3. Redeploy application
- [ ] 4. Test in production
- [ ] 5. Monitor Brevo dashboard for delivery

### Optional Frontend Configuration

- [ ] 1. Add `VITE_BREVO_API_KEY` to frontend `.env`
- [ ] 2. Restart frontend dev server
- [ ] 3. Test client-side features (if any)

---

## Support Resources

### Brevo Documentation
- [API Documentation](https://developers.brevo.com/)
- [Transactional Email Guide](https://help.brevo.com/hc/en-us/sections/360007039820-Transactional-Email)
- [API Key Management](https://help.brevo.com/hc/en-us/articles/360016050420-Generate-an-API-key)

### Internal Documentation
- Email Flow: `/docs/features/EMAIL_NOTIFICATION_FLOW.md`
- Notification Setup: `/documentation/organized/deployment/NOTIFICATION_SETUP_GUIDE.md`
- Brevo Setup: `/documentation/organized/deployment/BREVO_SETUP.md`

### Contact
- Brevo Support: support@brevo.com
- Development Team: [Your team contact]

---

## Summary

**Problem:** Email notifications not being sent
**Root Cause:** `BREVO_API_KEY` environment variable not configured
**Solution:** Add API key to environment variables and restart/redeploy
**Priority:** 🔴 High - Affects customer communication
**Effort:** ⚡ Low - 5-10 minutes to fix

**Next Steps:**
1. Get Brevo API key
2. Configure backend environment variable
3. Restart backend server
4. Add to Vercel for production
5. Test email delivery

---

**Document Version:** 1.0.0
**Last Updated:** October 10, 2025
**Status:** Ready for Implementation

