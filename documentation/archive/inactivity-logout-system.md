# Inactivity Logout System

## Overview

The inactivity logout system automatically logs out users after a period of inactivity to enhance security and ensure that user sessions don't remain open indefinitely. This is particularly important for shared devices and public computers.

**Implementation Date:** October 10, 2025
**Status:** ✅ Active
**Compatibility:** Vercel Serverless ✅

---

## Architecture

### Client-Side Implementation

The system is implemented entirely on the client-side using React hooks, making it:
- **Serverless-friendly**: No server-side state required
- **Scalable**: Works seamlessly with Vercel's serverless architecture
- **Efficient**: Minimal overhead, using browser event listeners
- **User-friendly**: Provides warnings before logout

### Key Components

1. **`useInactivityLogout` Hook** (`frontend/src/hooks/useInactivityLogout.js`)
   - Core implementation of inactivity tracking
   - Handles timer management and activity detection
   - Integrates with the authentication context

2. **Integration in App Component** (`frontend/src/app.jsx`)
   - Hook is activated at the app level
   - Applies to all authenticated users
   - Configured with sensible defaults

---

## How It Works

### 1. Activity Detection

The system monitors the following user activities:
- **Mouse movements** (`mousemove`)
- **Mouse clicks** (`mousedown`, `click`)
- **Keyboard input** (`keypress`)
- **Touch events** (`touchstart`) for mobile devices
- **Scrolling** (`scroll`)

### 2. Timer Management

```
User Activity
     ↓
Reset Timer
     ↓
Wait 4.5 minutes (configurable)
     ↓
Show Warning (30 seconds)
     ↓
Final Logout
```

**Default Configuration:**
- **Inactivity Timeout:** 5 minutes
- **Warning Time:** 30 seconds before logout
- **Total Time:** User has 5 minutes from last activity

### 3. Warning System

At **4 minutes 30 seconds** of inactivity:
- 🚨 Warning toast appears
- Message: "You will be logged out in 30 seconds due to inactivity. Move your mouse to stay logged in."
- User can move mouse/interact to reset timer
- Warning automatically dismisses on activity

### 4. Automatic Logout

After **5 minutes** of complete inactivity:
- User is automatically logged out
- Token is removed from localStorage
- All user caches are cleared
- User is redirected to home page
- Toast notification: "You have been logged out due to inactivity"

---

## Configuration

### Default Settings

```javascript
{
  inactivityTimeout: 5 * 60 * 1000,  // 5 minutes
  warningTime: 30 * 1000,            // 30 seconds
  enabled: true,                      // Enabled for all users
  enableLogging: false                // Logging disabled in production
}
```

### Customization

To modify the inactivity timeout, edit `/Users/ramzan/Documents/bazaarMKT/frontend/src/app.jsx`:

```javascript
useInactivityLogout({
  enabled: true,
  inactivityTimeout: 10 * 60 * 1000,  // Change to 10 minutes
  warningTime: 60 * 1000,             // Change to 60 seconds warning
  enableLogging: false
});
```

### Per-Environment Configuration

```javascript
// Development: More lenient timeout + logging
const isDev = import.meta.env.MODE === 'development';
useInactivityLogout({
  enabled: true,
  inactivityTimeout: isDev ? 15 * 60 * 1000 : 5 * 60 * 1000,
  warningTime: 30 * 1000,
  enableLogging: isDev
});
```

---

## Advanced Features

### 1. Throttling

Activity detection is throttled to **1 second intervals** to prevent excessive timer resets and improve performance.

### 2. Conditional Activation

The hook only activates when:
- User is authenticated (`isAuthenticated === true`)
- User object is available
- Hook is enabled via configuration

### 3. Cleanup

Proper cleanup is handled automatically:
- Event listeners are removed on unmount
- Timers are cleared when user logs out
- No memory leaks

### 4. Manual Control

The hook returns utility functions for advanced use cases:

```javascript
const { resetTimer, clearTimers, getRemainingTime } = useInactivityLogout();

// Manually reset the timer
resetTimer();

// Clear all timers
clearTimers();

// Get remaining time in milliseconds
const remaining = getRemainingTime();
console.log(`${Math.floor(remaining / 1000)} seconds remaining`);
```

---

## Integration Guide

### Basic Integration

Already integrated in the main app. No additional setup required.

### Custom Integration (Advanced)

For component-specific inactivity handling:

```javascript
import { useInactivityLogout } from '../hooks/useInactivityLogout';

function SecureComponent() {
  useInactivityLogout({
    enabled: true,
    inactivityTimeout: 2 * 60 * 1000, // 2 minutes for sensitive component
    warningTime: 15 * 1000,
    onLogout: () => {
      console.log('User logged out from secure component');
    },
    onWarning: () => {
      console.log('Warning shown');
    }
  });
  
  return <div>Secure Content</div>;
}
```

---

## Testing

### Manual Testing

1. **Test Basic Functionality:**
   - Log in to the application
   - Leave the browser idle for 4.5 minutes
   - Verify warning toast appears
   - Wait 30 more seconds
   - Verify automatic logout

2. **Test Activity Reset:**
   - Log in to the application
   - Wait 4 minutes
   - Move mouse or interact with page
   - Verify timer resets (no warning appears)

3. **Test Warning Dismissal:**
   - Log in and wait for warning (4.5 minutes)
   - Move mouse when warning appears
   - Verify warning disappears and timer resets

### Automated Testing

```javascript
// test/useInactivityLogout.test.js
import { renderHook } from '@testing-library/react';
import { useInactivityLogout } from '../hooks/useInactivityLogout';

describe('useInactivityLogout', () => {
  it('should reset timer on activity', () => {
    const { result } = renderHook(() => useInactivityLogout({
      inactivityTimeout: 1000,
      warningTime: 500
    }));
    
    // Simulate activity
    window.dispatchEvent(new Event('mousemove'));
    
    const remaining = result.current.getRemainingTime();
    expect(remaining).toBeGreaterThan(900);
  });
});
```

---

## Troubleshooting

### Issue: User Logged Out Too Quickly

**Cause:** Timeout configured too short
**Solution:** Increase `inactivityTimeout` in configuration

```javascript
inactivityTimeout: 10 * 60 * 1000, // Increase to 10 minutes
```

### Issue: Warning Not Appearing

**Cause 1:** Warning time too short
**Solution:** Increase `warningTime`

**Cause 2:** Activity constantly resetting timer
**Solution:** Check if there are any auto-refreshing components

### Issue: System Not Working in Production

**Cause:** Hook not enabled or auth context not available
**Solution:** Verify integration in `app.jsx`

```javascript
// Ensure this exists in AppRoutes component
useInactivityLogout({
  enabled: true, // Must be true
  // ...other config
});
```

### Issue: Performance Problems

**Cause:** Too many event listeners or timer resets
**Solution:** System already throttles to 1 second. If issues persist, increase throttle duration.

---

## Security Considerations

### Threat Mitigation

The inactivity logout system helps mitigate:

1. **Session Hijacking**: Reduces window of opportunity for stolen sessions
2. **Unauthorized Access**: Prevents unauthorized use of unattended sessions
3. **Shared Device Risk**: Protects users on shared/public computers

### Limitations

This is a **client-side implementation** and should not be the only security measure:

1. **JWT Expiration**: Backend JWTs should also have reasonable expiration times
2. **Sensitive Operations**: Critical operations should require re-authentication
3. **Client Bypass**: Sophisticated attackers can bypass client-side checks

### Best Practices

1. **Combine with JWT Expiration**: Set JWT expiration to reasonable values (e.g., 1-24 hours)
2. **Use HTTPS**: Always use HTTPS in production
3. **Monitor Sessions**: Log authentication events for security monitoring
4. **Secure Storage**: Tokens stored in localStorage (consider httpOnly cookies for more security)

---

## Compatibility

### Browser Support

✅ **Chrome/Edge** - Fully supported
✅ **Firefox** - Fully supported
✅ **Safari** - Fully supported
✅ **Mobile Browsers** - Fully supported with touch events

### Framework Compatibility

✅ **React 18+** - Full support
✅ **Vercel Serverless** - No server-side requirements
✅ **React Router** - Works with navigation
✅ **React Hot Toast** - Used for notifications

---

## Performance Impact

### Minimal Overhead

- **Event Listeners:** ~6 event listeners (throttled)
- **Timers:** 1-2 active timers maximum
- **Memory:** Negligible (~1-2 KB)
- **CPU:** Minimal (activity check only on user interaction)

### Optimization Features

1. **Throttling**: Activity checks throttled to 1 second
2. **Passive Listeners**: Event listeners use `{ passive: true }`
3. **Lazy Toast**: Toast library only loads when needed
4. **Proper Cleanup**: No memory leaks, all resources freed

---

## Future Enhancements

### Potential Improvements

1. **Server-Side Validation**
   - Add server-side session tracking
   - Validate token age on sensitive operations
   - Implement sliding session windows

2. **User Preferences**
   - Allow users to customize timeout duration
   - Add "Remember Me" option for longer sessions
   - Per-device session management

3. **Advanced Analytics**
   - Track average session duration
   - Identify patterns of inactivity
   - User engagement metrics

4. **Multi-Tab Support**
   - Sync inactivity across browser tabs
   - Logout from all tabs simultaneously
   - Broadcast channel API for coordination

5. **Idle Detection API**
   - Use browser's Idle Detection API (when widely supported)
   - More accurate idle detection
   - System-level idle detection

---

## Related Documentation

- [Authentication System](/documentation/organized/authentication-system.md)
- [Security Best Practices](/documentation/organized/security-guidelines.md)
- [Frontend Architecture](/documentation/frontend/architecture.md)
- [Vercel Deployment](/documentation/deployment/vercel-configuration.md)

---

## Changelog

### Version 1.0.0 - October 10, 2025
- ✅ Initial implementation
- ✅ Client-side activity tracking
- ✅ Warning system before logout
- ✅ Integration with existing auth system
- ✅ Vercel serverless compatibility
- ✅ Comprehensive documentation

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review related documentation
3. Check implementation in `/frontend/src/hooks/useInactivityLogout.js`
4. Contact development team

---

**Last Updated:** October 10, 2025
**Maintained By:** Development Team
**Status:** Production Ready ✅

