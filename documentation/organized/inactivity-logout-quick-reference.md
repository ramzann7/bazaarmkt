# Inactivity Logout - Quick Reference

## 🚀 Quick Start

The inactivity logout system is **already enabled** in your application. No additional setup required.

## ⚙️ Current Configuration

```javascript
Inactivity Timeout: 5 minutes
Warning Time: 30 seconds before logout
Status: ✅ Active
Environment: All (Development + Production)
```

## 📋 User Experience

### What Users Will See:

1. **Normal Usage** (< 5 minutes activity)
   - ✅ No interruption
   - Timer resets on any interaction

2. **After 4.5 Minutes of Inactivity**
   - ⚠️ Warning toast appears
   - Message: "You will be logged out in 30 seconds due to inactivity. Move your mouse to stay logged in."
   - User can move mouse to cancel

3. **After 5 Minutes of Inactivity**
   - 🔴 Automatic logout
   - Message: "You have been logged out due to inactivity"
   - Redirect to home page
   - Token cleared

## 🔧 How to Modify Settings

### Change Timeout Duration

**File:** `/Users/ramzan/Documents/bazaarMKT/frontend/src/app.jsx`

```javascript
// Current (lines 96-101)
useInactivityLogout({
  enabled: true,
  inactivityTimeout: 5 * 60 * 1000,  // ← Change this number
  warningTime: 30 * 1000,             // ← Change this number
  enableLogging: import.meta.env.MODE === 'development'
});
```

### Common Configurations

**3 Minutes:**
```javascript
inactivityTimeout: 3 * 60 * 1000,
warningTime: 20 * 1000,
```

**10 Minutes:**
```javascript
inactivityTimeout: 10 * 60 * 1000,
warningTime: 60 * 1000,
```

**15 Minutes:**
```javascript
inactivityTimeout: 15 * 60 * 1000,
warningTime: 60 * 1000,
```

### Disable for Development

```javascript
useInactivityLogout({
  enabled: import.meta.env.MODE !== 'development', // Disable in dev
  inactivityTimeout: 5 * 60 * 1000,
  warningTime: 30 * 1000,
});
```

### Different Settings per Environment

```javascript
const isDev = import.meta.env.MODE === 'development';
const isProd = import.meta.env.MODE === 'production';

useInactivityLogout({
  enabled: true,
  inactivityTimeout: isDev ? 15 * 60 * 1000 : 5 * 60 * 1000, // 15min dev, 5min prod
  warningTime: isDev ? 60 * 1000 : 30 * 1000,                // 60s dev, 30s prod
  enableLogging: isDev
});
```

## 🧪 Testing

### Quick Test (2 Minutes)

For testing purposes, temporarily change settings:

```javascript
useInactivityLogout({
  enabled: true,
  inactivityTimeout: 2 * 60 * 1000,  // 2 minutes total
  warningTime: 30 * 1000,             // 30 seconds warning
  enableLogging: true                 // See console logs
});
```

### Test Checklist

- [ ] User logs in successfully
- [ ] Wait 1.5 minutes (no warning)
- [ ] Warning appears at 1.5 minutes
- [ ] Move mouse → warning disappears, timer resets
- [ ] Wait 2 minutes again
- [ ] User is automatically logged out
- [ ] Toast notification appears
- [ ] User redirected to home page

## 📊 Monitoring

### Enable Debug Logging

```javascript
useInactivityLogout({
  enabled: true,
  inactivityTimeout: 5 * 60 * 1000,
  warningTime: 30 * 1000,
  enableLogging: true  // ← Set to true
});
```

### Console Output (when enabled)

```
[InactivityLogout] Inactivity logout enabled { timeout: '300s', warning: '30s', user: 'user@example.com' }
[InactivityLogout] Activity detected - resetting timer
[InactivityLogout] Showing warning - logout in 30 seconds
[InactivityLogout] Activity detected - resetting timer
[InactivityLogout] Auto-logout triggered due to inactivity
[InactivityLogout] Cleaning up inactivity logout
```

## 🔒 Security Notes

### What This Protects Against

✅ Unattended sessions on shared computers
✅ Forgotten logged-in sessions
✅ Reduced session hijacking window

### What This Doesn't Protect

❌ Stolen/leaked tokens (use HTTPS + secure storage)
❌ Malicious browser extensions (client-side limitation)
❌ XSS attacks (implement CSP + input validation)

### Additional Security Measures

1. **Backend JWT Expiration** - Currently tokens expire (check backend config)
2. **HTTPS Only** - Always use HTTPS in production
3. **Secure Token Storage** - Tokens stored in localStorage
4. **Rate Limiting** - Backend has rate limiting enabled

## 🚨 Troubleshooting

### Problem: Users Being Logged Out Too Quickly

**Solution:** Increase `inactivityTimeout` value
```javascript
inactivityTimeout: 10 * 60 * 1000, // 10 minutes instead of 5
```

### Problem: Warning Not Showing

**Check 1:** Verify hook is enabled
```javascript
enabled: true, // Must be true
```

**Check 2:** Verify warning time is reasonable
```javascript
warningTime: 30 * 1000, // At least 10 seconds recommended
```

### Problem: System Not Working at All

**Check 1:** Verify integration in `app.jsx`
- Hook must be called in `AppRoutes` component
- Must be after `useAuth()` call

**Check 2:** Check browser console for errors
- Enable debug logging
- Look for hook initialization messages

**Check 3:** Verify user is authenticated
- System only works for logged-in users
- Check `isAuthenticated` state

### Problem: Multiple Warnings Appearing

**Cause:** Multiple instances of hook
**Solution:** Only call `useInactivityLogout()` once in app

## 📁 File Locations

### Core Implementation
```
/frontend/src/hooks/useInactivityLogout.js
```

### Integration
```
/frontend/src/app.jsx (lines 24, 96-101)
```

### Documentation
```
/documentation/organized/inactivity-logout-system.md (this file)
/documentation/organized/inactivity-logout-quick-reference.md
```

## 🔄 Deployment

### Vercel Compatibility

✅ **Fully Compatible** - No server-side changes required
- Client-side only implementation
- No environment variables needed
- No additional configuration required
- Works with serverless functions

### Deployment Checklist

- [x] Hook implemented in frontend
- [x] Integrated in main app component
- [x] No backend changes needed
- [x] No additional dependencies
- [x] No environment variables required
- [x] Documentation completed

## 💡 Advanced Usage

### Get Remaining Time

```javascript
const { getRemainingTime } = useInactivityLogout();

// Show remaining time to user
setInterval(() => {
  const remaining = getRemainingTime();
  console.log(`${Math.floor(remaining / 1000)}s until logout`);
}, 1000);
```

### Custom Callbacks

```javascript
useInactivityLogout({
  enabled: true,
  inactivityTimeout: 5 * 60 * 1000,
  warningTime: 30 * 1000,
  onWarning: () => {
    console.log('User will be logged out soon');
    // Send analytics event
  },
  onLogout: () => {
    console.log('User logged out due to inactivity');
    // Send analytics event
    // Custom cleanup
  }
});
```

### Manual Timer Reset

```javascript
const { resetTimer } = useInactivityLogout();

// Manually reset on specific events
const handleImportantAction = () => {
  // Do something important
  resetTimer(); // Keep user logged in
};
```

## 📞 Support

For questions or issues:
1. Check troubleshooting section above
2. Review main documentation: `/documentation/organized/inactivity-logout-system.md`
3. Check implementation: `/frontend/src/hooks/useInactivityLogout.js`
4. Contact development team

---

**Last Updated:** October 10, 2025
**Status:** Production Ready ✅

