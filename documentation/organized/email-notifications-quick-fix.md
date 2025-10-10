# Email Notifications - Quick Action Checklist

## 🚨 IMMEDIATE FIX REQUIRED

**Issue:** Email notifications are not being sent
**Root Cause:** Missing `BREVO_API_KEY` environment variable
**Time to Fix:** 5-10 minutes

---

## ✅ Step-by-Step Fix

### Step 1: Get Your Brevo API Key (2 minutes)

**If you have a Brevo account:**

1. Go to https://app.brevo.com/
2. Log in
3. Click **SMTP & API** in left menu
4. Click **API Keys** tab
5. Copy your existing API key OR click **Generate a new API key**
6. Format looks like: `xkeysib-abc123xyz456...`

**If you DON'T have a Brevo account:**

1. Go to https://www.brevo.com/
2. Click **Sign Up Free**
3. Complete registration (free tier: 300 emails/day)
4. Verify your email
5. Go to **SMTP & API** → **API Keys**
6. Click **Generate a new API key**
7. Copy the key

---

### Step 2: Configure Backend - Local Development (1 minute)

1. **Open backend `.env` file:**
   ```bash
   cd /Users/ramzan/Documents/bazaarMKT/backend
   nano .env
   # OR
   code .env
   ```

2. **Add this line** (replace with your actual key):
   ```bash
   BREVO_API_KEY=xkeysib-your-actual-api-key-here
   ```

3. **Save the file** (Ctrl+S or Cmd+S)

4. **Restart backend server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

---

### Step 3: Configure Vercel - Production (3 minutes)

**Method A: Via Vercel Dashboard (Recommended)**

1. Go to https://vercel.com/dashboard
2. Click on your project (**bazaarMKT**)
3. Go to **Settings** tab
4. Click **Environment Variables** in left menu
5. Click **Add New**
6. Fill in:
   - **Key:** `BREVO_API_KEY`
   - **Value:** `xkeysib-your-actual-api-key-here`
   - **Environments:** ✅ Production (check this)
7. Click **Save**
8. Go to **Deployments** tab
9. Find latest deployment
10. Click **...** (three dots) → **Redeploy**

**Method B: Via Vercel CLI**

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Add environment variable
vercel env add BREVO_API_KEY production

# When prompted, paste your API key:
xkeysib-your-actual-api-key-here

# Redeploy
vercel --prod
```

---

### Step 4: Verify It's Working (2 minutes)

#### Local Testing

1. **Check backend logs when server starts:**
   ```
   ✅ Server is running on port 4000
   ✅ Connected to MongoDB
   ```

2. **Place a test order**

3. **Look for these log messages:**
   ```
   📧 Sending email notification for status update
   ✅ Email notification sent to: customer@example.com
   ✅ Brevo email sent using comprehensive template
   ```

4. **Check email inbox** (and spam folder)

#### Production Testing

1. **After redeployment completes** (2-3 minutes)

2. **Visit your production site**

3. **Place a test order**

4. **Check email inbox**

5. **Check Vercel logs** (optional):
   - Go to Vercel dashboard
   - Click **Deployments** → Latest deployment
   - Click **View Function Logs**
   - Look for email sending logs

---

## 🔍 Verification Checklist

### Before Testing
- [ ] Brevo API key obtained
- [ ] Backend `.env` file updated
- [ ] Backend server restarted
- [ ] Vercel environment variable added
- [ ] Vercel redeployment completed

### After Testing
- [ ] Test order placed successfully
- [ ] Backend logs show "✅ Email notification sent"
- [ ] Email received in inbox
- [ ] Email template looks correct
- [ ] All order details shown correctly

---

## ⚠️ Common Issues & Quick Fixes

### Issue 1: Still seeing "⚠️ BREVO_API_KEY not configured"

**Fix:**
1. Double-check `.env` file has the line with no typos
2. Ensure no spaces before `BREVO_API_KEY`
3. Restart backend server completely
4. Check you're editing the right `.env` file (`/backend/.env`)

### Issue 2: API key format error

**Fix:**
- Key must start with `xkeysib-`
- Copy entire key (usually 40+ characters)
- No spaces before or after the key
- No quotes around the key in `.env` file

### Issue 3: Emails not arriving

**Check:**
1. **Spam folder** - Check spam/junk first
2. **Brevo dashboard** - Go to https://app.brevo.com/ → Statistics
3. **API key permissions** - Ensure key has "Transactional emails" permission
4. **Daily limit** - Free tier: 300 emails/day

### Issue 4: Vercel deployment fails

**Fix:**
1. Check environment variable name is exactly: `BREVO_API_KEY`
2. Check value has no extra quotes or spaces
3. Ensure "Production" environment is checked
4. Try redeploying again

---

## 📝 Configuration Summary

### Required Environment Variables

| Variable | Location | Example | Status |
|----------|----------|---------|--------|
| `BREVO_API_KEY` | Backend `.env` | `xkeysib-abc123...` | ⚠️ Missing |
| `BREVO_API_KEY` | Vercel Production | `xkeysib-abc123...` | ⚠️ Missing |

### Optional Variables

| Variable | Location | Example | Required? |
|----------|----------|---------|-----------|
| `VITE_BREVO_API_KEY` | Frontend `.env` | `xkeysib-abc123...` | ❌ No (optional) |
| `ENABLE_EMAIL_NOTIFICATIONS` | Backend `.env` | `true` | ❌ No (defaults to true) |

---

## 🎯 Expected Results

### After Configuration

**Patrons (Customers) receive emails for:**
- ✅ Order placed
- ✅ Order confirmed
- ✅ Order ready (pickup/delivery)
- ✅ Order out for delivery
- ✅ Order delivered/picked up
- ✅ Order declined (with reason)

**Artisans receive emails for:**
- ✅ New order pending
- ✅ Order confirmation sent

**Email Features:**
- ✅ Beautiful HTML templates
- ✅ Order timeline visualization
- ✅ Complete order details
- ✅ Pickup/delivery information
- ✅ Next action guidance
- ✅ Mobile-responsive design

---

## 🔗 Quick Links

- **Brevo Dashboard:** https://app.brevo.com/
- **Brevo API Docs:** https://developers.brevo.com/
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Full Documentation:** `/documentation/organized/email-notifications-troubleshooting.md`

---

## 💡 Pro Tips

1. **Test in Development First**
   - Configure local `.env` before production
   - Test thoroughly locally
   - Then deploy to production

2. **Save Your API Key Securely**
   - Store in password manager
   - Don't commit to git
   - Rotate every 90 days

3. **Monitor Email Delivery**
   - Check Brevo dashboard daily
   - Watch for bounce rates
   - Monitor daily sending limits

4. **Keep Sender Email Verified**
   - Verify `bazaar@bazaarmkt.ca` in Brevo
   - Add SPF/DKIM records for better delivery
   - Reduces spam classification

---

## 🆘 Need Help?

### Still Not Working After Following Steps?

1. **Check Logs:**
   ```bash
   cd /Users/ramzan/Documents/bazaarMKT/backend
   npm run dev
   # Look for errors or warnings
   ```

2. **Test API Key Manually:**
   ```bash
   curl -X POST \
     https://api.brevo.com/v3/smtp/email \
     -H "api-key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "sender":{"email":"bazaar@bazaarmkt.ca","name":"bazaar"},
       "to":[{"email":"YOUR_EMAIL"}],
       "subject":"Test Email",
       "htmlContent":"<p>Test from Brevo</p>"
     }'
   ```

3. **Review Full Documentation:**
   - `/documentation/organized/email-notifications-troubleshooting.md`

4. **Check Brevo Account Status:**
   - Log in to Brevo dashboard
   - Check for any account warnings
   - Verify daily limit not exceeded

---

## ✅ Success Indicators

You'll know it's working when you see:

1. **In Backend Logs:**
   ```
   📧 Sending email notification for status update
   ✅ Email notification sent to: customer@example.com
   ✅ Brevo email sent using comprehensive template
   ```

2. **In Email Inbox:**
   - Professional HTML email received
   - Contains order timeline
   - Shows all order details
   - Has bazaar branding

3. **In Brevo Dashboard:**
   - Email count increases
   - Delivery rate shows 100%
   - No bounces or errors

---

## 📊 Current Status

- ❌ **Backend `.env` configured:** No
- ❌ **Vercel environment variable set:** No
- ❌ **Email notifications working:** No
- ⏱️ **Estimated fix time:** 5-10 minutes
- 🎯 **Priority:** High - Critical for customer communication

---

**Quick Start Command:**
```bash
# 1. Edit .env
cd /Users/ramzan/Documents/bazaarMKT/backend
nano .env
# Add: BREVO_API_KEY=xkeysib-your-key

# 2. Restart server
npm run dev

# 3. Test
# Place order and check email
```

---

**Last Updated:** October 10, 2025
**Status:** Ready for Implementation
**Action Required:** Configure BREVO_API_KEY now

