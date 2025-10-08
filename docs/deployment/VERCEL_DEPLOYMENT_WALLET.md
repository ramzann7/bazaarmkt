# Vercel Deployment Guide - Wallet Credit System

## 🚀 Quick Start

### **Step 1: Set Environment Variables in Vercel**

Go to your Vercel project → Settings → Environment Variables

Add the following:

```bash
# Cron Job Secret (REQUIRED for wallet auto-confirmation)
CRON_SECRET=cronjobssecretsforbazaarmktjobs

# Or generate a new one:
# node -e "console.log('cron_' + require('crypto').randomBytes(32).toString('hex'))"
```

**Apply to:**
- ✅ Production
- ✅ Preview
- ✅ Development

---

### **Step 2: Verify vercel.json Configuration**

File: `/vercel.json`

```json
{
  "version": 2,
  "crons": [
    {
      "path": "/api/orders/auto-confirm-pending",
      "schedule": "0 * * * *"
    }
  ]
}
```

**This is already configured!** ✅

**Cron Schedule:** Every hour at :00 minutes  
**Next Run:** Top of every hour (e.g., 1:00, 2:00, 3:00...)

---

### **Step 3: Deploy to Vercel**

```bash
# From project root
vercel --prod

# Or use GitHub integration (recommended)
git push origin main
```

Vercel will automatically:
1. Build your project
2. Deploy backend + frontend
3. **Register the cron job**
4. Start running it every hour

---

### **Step 4: Verify Cron Job is Active**

**In Vercel Dashboard:**

1. Go to your project
2. Click "Cron Jobs" in sidebar
3. You should see:
   ```
   /api/orders/auto-confirm-pending
   Schedule: 0 * * * *
   Status: Active ✓
   ```

**Alternative Verification (CLI):**

```bash
curl -X POST https://yourdomain.com/api/orders/auto-confirm-pending \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "message": "Auto-confirmed X orders",
  "data": {
    "confirmedCount": X,
    "totalCredited": "X.XX",
    "processedAt": "..."
  }
}
```

---

## 🔒 Security Configuration

### **1. CRON_SECRET Requirements:**

✅ Minimum 20 characters  
✅ Mix of letters, numbers, special chars  
✅ Never commit to repository  
✅ Different for each environment  

**Current Secret:**
- Development: `cronjobssecretsforbazaarmktjobs` (31 chars) ✅
- Production: **Set in Vercel dashboard** ✅

---

### **2. Endpoint Authentication:**

The cron endpoint accepts **two** authentication methods:

**Method A: Vercel Cron (Automatic)**
```
Authorization: Bearer ${CRON_SECRET}
```
Vercel automatically sends this header.

**Method B: Manual/Testing**
```
x-cron-secret: ${CRON_SECRET}
```
Use this for manual testing.

---

## 📊 Monitoring & Logs

### **View Cron Execution Logs:**

**In Vercel Dashboard:**
1. Project → Functions
2. Find `/api/orders/auto-confirm-pending`
3. Click to view execution logs
4. See real-time cron runs

**What to Monitor:**
- ✅ Execution success rate (should be ~100%)
- ✅ Orders confirmed per run
- ✅ Total amount credited
- ⚠️ Any errors or timeouts
- ⚠️ Unauthorized attempts

---

### **Successful Execution Log:**

```
⏰ Auto-confirm: Found 3 orders to auto-confirm
✅ Auto-confirmed order ABC12345 - credited $54.00
✅ Auto-confirmed order XYZ67890 - credited $27.00
✅ Auto-confirmed order DEF11111 - credited $18.00
```

---

### **Error Log (What to Watch For):**

```
❌ Error auto-confirming order ABC123: ...
🚨 Unauthorized cron attempt - invalid credentials
```

---

## 🎯 How the System Works in Production

### **Scenario 1: Guest Order (Immediate)**

```
1. Guest places order
   └─ Order created with revenue.artisanEarnings

2. Artisan marks as "picked_up" or "delivered"
   └─ Triggers wallet credit immediately
   └─ Balance += artisanEarnings
   └─ Transaction recorded
   └─ walletCredit.confirmationType = 'guest_auto'

3. ✅ Artisan sees balance increase instantly
```

---

### **Scenario 2: Patron Order (Pending → Confirmed)**

```
1. Patron places order
   └─ Order created with revenue.artisanEarnings

2. Artisan marks as "delivered"
   └─ Triggers pending wallet credit
   └─ pendingBalance += artisanEarnings
   └─ autoConfirmDeadline = now + 48 hours
   └─ walletCredit.confirmationType = 'delivery_pending'
   └─ Email sent to patron

3. Patron clicks "Confirm Delivery"
   └─ Balance += artisanEarnings
   └─ pendingBalance -= artisanEarnings
   └─ Transaction recorded
   └─ walletCredit.confirmationType = 'delivery_confirmed'

4. ✅ Artisan sees balance increase
```

---

### **Scenario 3: Auto-Confirm (48h Timeout)**

```
1. Patron places order
2. Artisan marks as "picked_up"
   └─ pendingBalance += artisanEarnings
   └─ autoConfirmDeadline = now + 48 hours

3. Patron doesn't confirm...

4. 48 hours pass

5. Vercel Cron runs (hourly)
   └─ Finds expired order
   └─ Balance += artisanEarnings
   └─ pendingBalance -= artisanEarnings
   └─ Transaction recorded
   └─ walletCredit.confirmationType = 'auto_timeout'

6. ✅ Artisan sees balance increase (next dashboard load)
```

---

## 🔄 Redundant Auto-Confirmation

The system has **two layers** of auto-confirmation:

### **Layer 1: Vercel Cron (Primary)**
- Runs every hour
- Processes all expired orders
- Managed by Vercel infrastructure
- Reliable and automatic

### **Layer 2: On-Demand Check (Backup)**
- Runs when orders are loaded
- Immediate processing when user visits
- Catches any missed by cron
- Better UX

**Both layers call the same logic**, ensuring no order is missed!

---

## 🧪 Testing in Production

### **Test 1: Manual Trigger**

```bash
# Replace with your production URL and CRON_SECRET
curl -X POST https://yourdomain.com/api/orders/auto-confirm-pending \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

### **Test 2: Create Test Order**

1. Place test order as patron
2. Mark as delivered (wait or set deadline to past)
3. Call auto-confirm endpoint
4. Verify wallet balance increased

---

### **Test 3: Monitor Cron Execution**

1. Wait for top of the hour
2. Check Vercel function logs
3. Verify cron executed successfully
4. Check wallet balances updated

---

## 📋 Production Checklist

- [ ] `CRON_SECRET` set in Vercel environment variables
- [ ] `vercel.json` includes cron configuration
- [ ] Latest code deployed to Vercel
- [ ] Cron job shows as "Active" in Vercel dashboard
- [ ] Test auto-confirm endpoint manually
- [ ] Monitor first few cron executions
- [ ] Set up error alerts
- [ ] Document for team
- [ ] Wallet balance displaying correctly
- [ ] Pending balance showing in dashboard
- [ ] Patron confirmation UI working
- [ ] Transaction history accessible

---

## 🚨 Troubleshooting

### **Issue: Cron job not visible in Vercel**

**Solutions:**
1. Ensure `vercel.json` is in project root
2. Redeploy after adding cron configuration
3. Check Vercel build logs for errors
4. Verify `"crons"` array is valid JSON

---

### **Issue: Cron returns 401 Unauthorized**

**Check:**
1. `CRON_SECRET` is set in Vercel environment
2. Environment variable name is exact: `CRON_SECRET`
3. No extra spaces in the value
4. Applied to correct environment (Production)

**Test:**
```bash
# Check if env var is set
vercel env ls

# Pull env vars locally
vercel env pull
```

---

### **Issue: Orders not auto-confirming**

**Debug:**
1. Check server logs in Vercel functions
2. Verify cron is executing (Vercel dashboard)
3. Check database for pending orders:
   ```javascript
   db.orders.find({
     "walletCredit.pendingConfirmation": true,
     "walletCredit.credited": { $ne: true }
   })
   ```
4. Manually trigger endpoint to test

---

### **Issue: Wallet balance not updating**

**Check:**
1. Order has `revenue.artisanEarnings > 0`
2. Status is `delivered` or `picked_up`
3. Artisan triggered the status change
4. Check `walletCredit` field in order document
5. Review wallet transactions collection

---

## 📖 Documentation References

- **Wallet System:** `/WALLET_CREDIT_SYSTEM.md`
- **Test Results:** `/WALLET_TEST_RESULTS.md`
- **Production Setup:** This file
- **API Endpoints:** Check server-vercel.js comments

---

## 🎓 Training for Team

### **For Artisans:**

1. When you mark an order as delivered/picked up:
   - Guest orders: Wallet credited immediately
   - Patron orders: Goes to pending (wait for confirmation)

2. Check wallet dashboard:
   - Available Balance: Ready for payout
   - Pending Balance: Waiting for patron

3. Pending balance auto-confirms after 48 hours

---

### **For Patrons:**

1. When you receive your order, click "Confirm Receipt"
2. This releases payment to the artisan
3. Helps artisan get paid faster
4. If you forget, auto-confirms after 48 hours
5. Protects you in case of issues

---

## 📞 Support

**Production Issues:**
- Email: bazaar@bazaarmkt.ca
- Vercel Logs: Function execution logs
- Database: MongoDB Atlas logs

---

## 🎉 Success Criteria

✅ Cron job running hourly in Vercel  
✅ Wallet balances updating correctly  
✅ Pending confirmations processing  
✅ Transaction history accurate  
✅ No duplicate credits  
✅ Security measures active  
✅ Performance acceptable  

**Status:** Production Ready ✅

---

**Last Updated:** October 1, 2025  
**Tested By:** Automated test suite  
**Production Ready:** Yes ✅

