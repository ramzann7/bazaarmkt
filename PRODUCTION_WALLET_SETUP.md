# Production Wallet Credit Setup Guide

## 🚀 Vercel Deployment Configuration

### **1. Environment Variables**

Add these to your Vercel project settings:

```bash
# Required for wallet credit system
CRON_SECRET=<generate-secure-random-string>

# Example: Generate a secure secret
# node -e "console.log('cron_' + require('crypto').randomBytes(32).toString('hex'))"
```

**How to add in Vercel:**
1. Go to project settings
2. Navigate to "Environment Variables"
3. Add `CRON_SECRET` with your secure value
4. Apply to: Production, Preview, and Development
5. Redeploy your application

---

### **2. Vercel Cron Configuration**

Already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/orders/auto-confirm-pending",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Schedule:** Every hour at :00 minutes  
**Endpoint:** POST `/api/orders/auto-confirm-pending`  
**Authentication:** Uses `CRON_SECRET` environment variable

**Vercel will automatically:**
- Call the endpoint every hour
- Send `Authorization: Bearer ${CRON_SECRET}` header
- Handle retries and logging
- Monitor execution time

---

### **3. Backup Auto-Confirmation**

**On-Demand Checks:** Already implemented!

The system automatically checks for expired confirmations when:
- Patrons load their orders (`GET /api/orders`)
- Artisans load their orders (`GET /api/orders/artisan`)

**Benefits:**
- Immediate confirmation when deadline passes
- Doesn't wait for hourly cron
- Better UX for artisans
- Redundant safety net

---

## 🧪 Test Results

### **All Tests Passed ✅**

```
Test 1: Patron Order → Pending Balance
  ✅ $90.00 moved to pending
  ✅ Auto-confirm deadline set (48 hours)

Test 2: Auto-Confirm Expired Order
  ✅ $27.00 credited from expired order
  ✅ Balance increased: $54 → $81
  ✅ Pending decreased: $135 → $108
  ✅ Transaction recorded

Test 3: Cron Endpoint Authentication
  ✅ CRON_SECRET validation working
  ✅ Unauthorized requests blocked
  ✅ Valid requests processed
```

---

## 📊 Production Monitoring

### **Key Metrics:**

1. **Pending Balance Trend**
   ```sql
   db.wallets.aggregate([
     { $group: { 
       _id: null, 
       totalPending: { $sum: "$pendingBalance" } 
     }}
   ])
   ```

2. **Auto-Confirm Success Rate**
   ```sql
   db.wallet_transactions.countDocuments({
     "metadata.confirmedBy": "auto_timeout"
   })
   ```

3. **Average Confirmation Time**
   ```sql
   db.orders.find({
     "walletCredit.credited": true,
     "walletCredit.patronConfirmedAt": { $exists: true }
   })
   ```

---

## 🔒 Security Checklist

- [x] CRON_SECRET environment variable set
- [x] JWT authentication on all endpoints
- [x] Order ownership validation
- [x] Duplicate credit prevention
- [x] Status validation before credit
- [x] Audit trail for all transactions
- [x] Vercel cron authorization

---

## 📈 Wallet Balance Display

### **Artisan Dashboard:**

```
┌──────────────────────────────┐
│ Wallet Balance               │
├──────────────────────────────┤
│ Available: $81.00            │
│ Pending:   $108.00 ⏳        │
│                              │
│ Recent Transactions          │
│ • Order #d496... +$27.00     │
│   (Auto-confirmed)           │
└──────────────────────────────┘
```

---

## 🎯 Confirmation Flows

### **Flow A: Guest Order (Immediate)**
```
1. Guest places order
2. Artisan confirms delivery/pickup
   → ✅ Wallet credited immediately
   → No patron confirmation needed
```

### **Flow B: Patron Manual Confirm**
```
1. Patron places order
2. Artisan marks delivered
   → ⏳ Pending balance increases
3. Patron sees "Confirm Receipt" button
4. Patron clicks confirm
   → ✅ Pending → Available balance
```

### **Flow C: Auto-Confirm (48h)**
```
1. Patron places order
2. Artisan marks picked_up
   → ⏳ Pending balance increases
   → ⏰ 48-hour timer starts
3. Patron doesn't confirm
4. 48 hours pass
5. Vercel cron runs (or patron loads orders)
   → ✅ Auto-confirmed
   → ✅ Pending → Available balance
```

---

## 🚨 Production Alerts

### **Monitor For:**

1. **High Pending Balance**
   - Alert if > $1000 pending for >72 hours
   - May indicate confirmation issues

2. **Failed Auto-Confirms**
   - Check cron execution logs
   - Verify database connectivity

3. **Duplicate Transactions**
   - Should never happen
   - Indicates system issue if found

4. **Unauthorized Cron Attempts**
   - Logged as "🚨 Unauthorized cron attempt"
   - May indicate security issue

---

## 🔧 Troubleshooting

### **Issue: Cron not running on Vercel**

**Check:**
1. Vercel dashboard → Deployments → Cron Jobs
2. Verify `vercel.json` is in root directory
3. Check environment variable `CRON_SECRET` is set
4. Review cron execution logs

**Solution:**
```bash
# Manually trigger from Vercel dashboard
# Or call endpoint with proper auth
curl -X POST https://yourdomain.com/api/orders/auto-confirm-pending \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

### **Issue: Wallet not updating**

**Debug Steps:**
1. Check order has `revenue.artisanEarnings > 0`
2. Verify artisan marked as delivered/picked_up
3. Check `walletCredit` field in order
4. Review server logs for wallet errors
5. Verify database connection

---

## 📝 Environment Variables Checklist

### **Required for Production:**

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=<secure-random-string>

# Wallet Cron Jobs
CRON_SECRET=<secure-random-string>

# Email (Optional but recommended)
BREVO_API_KEY=<your-brevo-key>

# Environment
NODE_ENV=production
```

### **Generate Secure Secrets:**

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate CRON_SECRET
node -e "console.log('cron_' + require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📅 Cron Schedule Options

Current: **Every hour** (`0 * * * *`)

**Alternative Schedules:**

```json
// Every 30 minutes
{ "schedule": "*/30 * * * *" }

// Every 6 hours
{ "schedule": "0 */6 * * *" }

// Every day at midnight
{ "schedule": "0 0 * * *" }

// Every Monday at 9 AM
{ "schedule": "0 9 * * 1" }
```

**Recommendation:** Keep hourly for timely confirmations

---

## 🎉 Production Ready Checklist

- [x] Wallet credit logic implemented
- [x] Fraud prevention active
- [x] Patron confirmation UI added
- [x] Auto-confirm endpoint created
- [x] Vercel cron configured
- [x] On-demand backup checks
- [x] Transaction history logging
- [x] Pending balance tracking
- [x] CRON_SECRET authentication
- [x] Environment variables documented
- [x] Tests passing
- [x] Cleanup scripts ready

---

## 📞 Support

For production wallet issues:
- **Email:** bazaar@bazaarmkt.ca
- **Logs:** Check Vercel function logs
- **Database:** MongoDB Atlas logs

---

**System Status:** ✅ Production Ready  
**Last Tested:** October 1, 2025  
**Test Results:** All Passing ✅

