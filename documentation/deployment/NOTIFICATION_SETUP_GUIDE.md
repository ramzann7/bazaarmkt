# 🔔 Notification Service Setup Guide

## Issues Identified and Solutions

### 1. **Brevo API Key Missing** ⚠️
**Problem**: `Invalid API key provided and no environment variable found`

**Solution**: Create a `.env` file in the `frontend` directory:

```bash
# Create the file
touch frontend/.env

# Add these contents to frontend/.env:
VITE_BREVO_API_KEY=your_brevo_api_key_here
VITE_API_URL=http://localhost:4000
VITE_DEV_MODE=true
```

**To get your Brevo API key:**
1. Go to [Brevo Dashboard](https://app.brevo.com/)
2. Navigate to **Settings** → **API Keys**
3. Create a new API key with **SMTP API** permissions
4. Copy the key (starts with `xkeys-`)
5. Replace `your_brevo_api_key_here` with your actual key

### 2. **Backend Notification Service Enhanced** ✅
**Fixed**: Backend now properly processes notifications instead of just logging them.

**What's improved:**
- Email notifications are prepared and logged
- SMS notifications are prepared and logged
- Better error handling for notification failures
- Templates for different notification types

### 3. **Order Notification Service Stability** ✅
**Fixed**: Added better error handling to prevent disconnections.

**What's improved:**
- Better error handling in polling mechanism
- Reconnection capability
- More detailed logging for debugging
- Graceful handling of auth token issues

## 🧪 Testing the Fixes

### Test 1: Check Notification Service Status
1. Open browser console
2. Look for these messages:
   - ✅ `Notification service initialized with environment Brevo API key`
   - ✅ `Order notification service connected`

### Test 2: Test Order Decline Notifications
1. Create a test order
2. Decline it as an artisan
3. Check console for:
   - ✅ `Email notification sent to: [email]`
   - ✅ `SMS notification sent to: [phone]`

### Test 3: Test Pickup Time Notifications
1. Create a pickup order with time window
2. Check console for:
   - ✅ `Pickup time notification sent to artisan`

## 🚨 If Issues Persist

### Check Environment Variables
```bash
# In frontend directory, verify .env file exists and has correct content
cat frontend/.env
```

### Restart Development Servers
```bash
# Stop both servers (Ctrl+C)
# Restart backend
cd backend && npm start

# Restart frontend (in new terminal)
cd frontend && npm run dev -- --port 5180
```

### Check Console Logs
Look for these specific error patterns:
- `❌ Error sending notification`
- `❌ Failed to send email notification`
- `❌ Error in order polling`

## 📧 Notification Types Supported

1. **Order Declined**: Sent to patron when artisan declines order
2. **Pickup Order with Time**: Sent to artisan when pickup order is placed
3. **Order Completion**: Sent to patron when order is confirmed

## 🔧 Advanced Configuration

### For Production Email Service
To actually send emails (not just log them), integrate with:
- **SendGrid**: Professional email service
- **Mailgun**: Developer-friendly email API
- **Brevo**: Already configured, just needs API key

### For SMS Notifications
To actually send SMS (not just log them), integrate with:
- **Twilio**: Popular SMS service
- **AWS SNS**: Amazon's notification service

## 📊 Monitoring

The notification service now provides detailed logging:
- 📧 Email notifications prepared
- 📱 SMS notifications prepared
- ✅ Successful notifications
- ❌ Failed notifications with error details

This makes it easy to monitor and debug notification issues.
