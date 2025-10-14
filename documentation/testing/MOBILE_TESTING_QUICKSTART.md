# Mobile Testing Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Option 1: Network Testing (Recommended for Real Devices)

#### Step 1: Install ngrok
```bash
# Mac
brew install ngrok

# Or download from https://ngrok.com/download
```

#### Step 2: Start Development Server
```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd frontend
npm run dev
```

#### Step 3: Create Mobile-Accessible URL
```bash
# Terminal 3: Create ngrok tunnel
ngrok http 5180
```

You'll see output like:
```
Forwarding  https://xxxx-xx-xx-xx-xx.ngrok-free.app -> http://localhost:5180
```

#### Step 4: Test on Mobile
1. Open the ngrok URL on your mobile device
2. Accept any security warnings (ngrok is safe)
3. Test the mobile experience!

### Option 2: Local Network Testing (Same WiFi Only)

#### Step 1: Get Your Local IP
```bash
# Mac
ipconfig getifaddr en0

# You'll get something like: 192.168.1.x
```

#### Step 2: Start Server (Already configured!)
```bash
cd frontend
npm run dev
```

The server is now accessible at: `http://YOUR_IP:5180`

#### Step 3: Test on Mobile
1. Ensure mobile device is on **same WiFi network**
2. Navigate to: `http://YOUR_IP:5180` (replace YOUR_IP with your actual IP)
3. Test away!

## 📱 What to Test

### Phase 1 Mobile Features
1. **Bottom Tab Navigation** (only visible on mobile screens)
   - Home, Search, Cart, Profile, More tabs
   - Cart badge shows item count
   - Active tab highlighted
   
2. **Touch Targets**
   - All buttons minimum 44px height
   - Easy to tap without mistakes
   
3. **Search Bar**
   - Properly sized for mobile
   - Keyboard doesn't block input
   - Search suggestions work

## 🔍 Browser DevTools Testing (No Setup Required)

1. Open Chrome
2. Press `Cmd+Option+I` (Mac) or `F12` (Windows)
3. Click device toggle icon (or `Cmd+Shift+M`)
4. Select device: **iPhone 12/13/14** (390 × 844)
5. Refresh page and test!

## 🐛 Remote Debugging

### iOS Safari
1. iPhone: Settings > Safari > Advanced > Web Inspector (ON)
2. Connect iPhone to Mac via USB
3. Mac Safari: Develop > [Your iPhone] > [Page]
4. Full DevTools on desktop for mobile page!

### Android Chrome
1. Android: Settings > Developer Options > USB Debugging (ON)
2. Connect to computer via USB
3. Desktop Chrome: Visit `chrome://inspect`
4. Select your device and page
5. Full DevTools available!

## 🎯 Testing Checklist

- [ ] Bottom navigation displays and works
- [ ] All buttons are easily tappable
- [ ] Search bar is accessible
- [ ] Cart badge shows correct count
- [ ] Page loads quickly (< 3 seconds)
- [ ] No horizontal scrolling
- [ ] Text is readable without zooming

## 🆘 Troubleshooting

### Can't access from mobile?
- **Check WiFi**: Both devices on same network?
- **Check firewall**: May need to allow port 5180
- **Use ngrok**: Works regardless of network

### ngrok URL not working?
- **Free tier limit**: May need to wait or upgrade
- **Try local IP**: Use Option 2 instead

### Page looks broken?
- **Clear cache**: Hard refresh on mobile (hold reload button)
- **Check console**: Use remote debugging to see errors

## 📊 Performance Testing

```bash
# Run Lighthouse mobile audit
npx lighthouse https://YOUR_NGROK_URL --form-factor=mobile --view
```

## 🎉 Success!

Once you can access the site on your mobile device, you're ready to test Phase 1 mobile enhancements!

For detailed testing procedures, see:
- `/documentation/testing/MOBILE_TESTING_STRATEGY.md`
- `/documentation/features/mobile/MOBILE_IMPLEMENTATION_CHECKLIST.md`

---

**Need help?** Check the full documentation or create an issue in the repo.
