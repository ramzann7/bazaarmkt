# 🗺️ BazaarMKT Deployment Roadmap

## Executive Summary

**Project:** BazaarMKT - Artisan Marketplace Platform  
**Target Deployment:** Vercel (Frontend & Backend Serverless)  
**Target Domain:** www.bazaarmkt.ca  
**Deployment Date:** TBD  
**Status:** Code Review Complete - Ready for Preparation Phase

---

## 📊 Deployment Readiness Score

### Current Status: 75% Ready

| Category | Status | Progress |
|----------|--------|----------|
| **Core Functionality** | ✅ Complete | 100% |
| **Security** | ⚠️ Needs Work | 60% |
| **Performance** | ✅ Good | 85% |
| **Code Quality** | ⚠️ Needs Cleanup | 70% |
| **Documentation** | ✅ Excellent | 95% |
| **Testing** | ⚠️ Manual Only | 65% |
| **Monitoring** | ⚠️ Partial | 50% |
| **Production Config** | ⚠️ Needs Setup | 40% |

**Overall:** Production deployment possible but requires critical fixes first.

---

## 🎯 Three-Phase Deployment Strategy

### Phase 1: Preparation (3-5 days)
**Goal:** Make code production-ready

### Phase 2: Deployment (1 day)  
**Goal:** Deploy to production with zero downtime

### Phase 3: Monitoring (1 week)
**Goal:** Ensure stability and fix issues

---

## 📅 Detailed Timeline

### Week 1: Pre-Deployment Preparation

#### Day 1-2: Code Cleanup
- [ ] Remove/replace 1,113 console.log statements
- [ ] Implement Winston logger
- [ ] Remove or gate debug routes
- [ ] Update CORS configuration
- [ ] Add security headers (Helmet)
- [ ] Sanitize error messages

**Time Estimate:** 8-12 hours  
**Resources Needed:** 1 developer

#### Day 3: Security Hardening
- [ ] Implement rate limiting on auth routes
- [ ] Add HTTPS redirect
- [ ] Authenticate cron jobs
- [ ] Rotate all secrets
- [ ] Switch Stripe to live mode
- [ ] Add Stripe webhook handler

**Time Estimate:** 4-6 hours  
**Resources Needed:** 1 developer

#### Day 4: Database & Services Setup
- [ ] Create production MongoDB cluster
- [ ] Run database initialization scripts
- [ ] Create database indexes
- [ ] Set up Vercel Blob storage
- [ ] Configure Brevo email sender
- [ ] Verify Stripe live account

**Time Estimate:** 4-6 hours  
**Resources Needed:** 1 developer, access to all services

#### Day 5: Testing & Validation
- [ ] Test locally with production environment
- [ ] Complete end-to-end testing
- [ ] Load test critical endpoints
- [ ] Verify all email notifications
- [ ] Test payment flow with Stripe test cards
- [ ] Security audit

**Time Estimate:** 6-8 hours  
**Resources Needed:** 1-2 testers

### Week 2: Deployment & Monitoring

#### Day 6: Deploy to Staging/Preview
- [ ] Create Vercel project
- [ ] Configure environment variables
- [ ] Deploy to preview environment
- [ ] Test preview deployment thoroughly
- [ ] Fix any issues found
- [ ] Get stakeholder approval

**Time Estimate:** 3-4 hours  
**Resources Needed:** 1 developer

#### Day 7: Production Deployment
- [ ] Configure custom domain
- [ ] Deploy to production
- [ ] Verify DNS propagation
- [ ] Test production deployment
- [ ] Monitor for first 4 hours
- [ ] Send launch announcements

**Time Estimate:** 2-3 hours deployment + 4 hours monitoring  
**Resources Needed:** 1-2 developers on standby

#### Days 8-14: Post-Launch Monitoring
- [ ] Monitor error rates hourly (first 24h)
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Fix any critical issues immediately
- [ ] Plan fixes for non-critical issues

**Time Estimate:** 2-3 hours daily  
**Resources Needed:** 1 developer

---

## 🔴 Critical Code Changes (MUST DO)

### 1. CORS Configuration
**File:** `backend/server-working.js` (Lines 49-56)  
**Effort:** 15 minutes  
**Impact:** 🔴 Critical - App won't work without proper CORS

### 2. Security Headers
**File:** `backend/server-working.js` (After line 31)  
**Effort:** 15 minutes  
**Impact:** 🔴 Critical - Security vulnerability without these

### 3. Sanitize Production Errors
**File:** `backend/middleware/errorHandler.js`  
**Effort:** 30 minutes  
**Impact:** 🔴 Critical - Exposes sensitive information

### 4. Authenticate Cron Jobs
**Files:** All files in `backend/api/cron/`  
**Effort:** 15 minutes  
**Impact:** 🔴 Critical - Public endpoints are security risk

### 5. Add Auth Rate Limiting
**File:** `backend/routes/auth/index.js`  
**Effort:** 20 minutes  
**Impact:** 🔴 Critical - Prevents brute force attacks

**Total Effort for Critical Changes:** ~2 hours

---

## 🟡 High Priority Changes (SHOULD DO)

### 6. Implement Winston Logger
**Files:** Create `backend/config/logger.js`, update all backend files  
**Effort:** 3-4 hours  
**Impact:** 🟡 High - Better debugging and monitoring

### 7. Remove Debug Routes
**File:** `frontend/src/app.jsx`  
**Effort:** 10 minutes  
**Impact:** 🟡 High - Reduces bundle size, improves security

### 8. Fix Hardcoded Image URLs
**Files:** Multiple frontend files  
**Effort:** 1 hour  
**Impact:** 🟡 High - Images won't load in production

### 9. Update Frontend Build Config
**File:** `frontend/vite.config.js`  
**Effort:** 15 minutes  
**Impact:** 🟡 High - Better performance

### 10. Implement Vercel Blob
**File:** `backend/services/imageUploadService.js`  
**Effort:** 1-2 hours  
**Impact:** 🟡 High - File storage won't work on Vercel otherwise

**Total Effort for High Priority:** ~6-8 hours

---

## 🟢 Medium Priority Changes (NICE TO HAVE)

### 11. Add Request Logging
**File:** `backend/server-working.js`  
**Effort:** 30 minutes

### 12. Stripe Webhook Handler
**Files:** Create `backend/routes/webhooks/stripe.js`  
**Effort:** 1 hour

### 13. Performance Monitoring
**Files:** Various  
**Effort:** 2 hours

### 14. Database Query Monitoring
**Files:** All routes with queries  
**Effort:** 2-3 hours

**Total Effort for Medium Priority:** ~6 hours

---

## 📋 Environment Variables Needed

### Backend (19 variables)

#### Required (6):
1. `MONGODB_URI` - Database connection
2. `JWT_SECRET` - Auth token signing
3. `NODE_ENV` - Environment flag
4. `STRIPE_SECRET_KEY` - Payment processing
5. `STRIPE_WEBHOOK_SECRET` - Webhook verification
6. `BREVO_API_KEY` - Email notifications

#### Highly Recommended (5):
7. `BLOB_READ_WRITE_TOKEN` - File storage
8. `CRON_SECRET` - Cron job auth
9. `CORS_ORIGIN` - Security
10. `GOOGLE_MAPS_API_KEY` - Geocoding
11. `GEOCODING_API_KEY` - Address lookup

#### Optional (8):
12. `REDIS_URL` - Caching
13. `REDIS_PORT` - Cache port
14. `SENTRY_DSN` - Error tracking
15. `LOG_LEVEL` - Logging detail
16. `RATE_LIMIT_WINDOW_MS` - Rate limit window
17. `RATE_LIMIT_MAX_REQUESTS` - Rate limit max
18. `BCRYPT_ROUNDS` - Password hashing strength
19. `ENABLE_EMAIL_NOTIFICATIONS` - Feature flag

### Frontend (9 variables)

#### Required (4):
1. `VITE_API_URL` - Backend API URL
2. `VITE_BASE_URL` - App base URL
3. `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe public key
4. `VITE_NODE_ENV` - Environment flag

#### Recommended (5):
5. `VITE_UPLOADS_URL` - Upload URL
6. `VITE_VERCEL_BLOB_DOMAIN` - Blob domain
7. `VITE_VERCEL_BLOB_URL` - Blob URL
8. `VITE_GOOGLE_MAPS_API_KEY` - Maps key
9. `VITE_BREVO_API_KEY` - Email key

**Total: 28 environment variables to configure**

---

## 🛠️ Service Setup Requirements

### External Services to Set Up

| Service | Purpose | Cost | Setup Time | Priority |
|---------|---------|------|------------|----------|
| MongoDB Atlas | Database | $57/mo | 30 min | 🔴 Critical |
| Vercel | Hosting | $20/mo | 15 min | 🔴 Critical |
| Stripe | Payments | 2.9% + 30¢ | 45 min | 🔴 Critical |
| Brevo | Email | Free-$25/mo | 30 min | 🔴 Critical |
| Vercel Blob | Storage | $0.15/GB | 15 min | 🟡 High |
| Google Maps | Geocoding | Free-$200/mo | 30 min | 🟡 High |
| Domain Registrar | bazaarmkt.ca | $15/yr | 15 min | 🔴 Critical |
| Sentry | Error Tracking | Free-$29/mo | 30 min | 🟢 Medium |
| Uptime Robot | Monitoring | Free | 15 min | 🟢 Medium |

**Total Setup Time:** 3-4 hours  
**Monthly Cost:** ~$100-150

---

## 📝 Database Preparation

### Collections to Initialize

1. **platformsettings** - Run `initialize-platform-settings.js`
2. **users** - Create admin user manually
3. **All collections** - Create indexes

### Indexes to Create

```javascript
// Run this script in MongoDB Atlas Data Explorer

// Users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ stripeCustomerId: 1 }, { sparse: true });

// Orders
db.orders.createIndex({ userId: 1, createdAt: -1 });
db.orders.createIndex({ artisan: 1, status: 1, createdAt: -1 });
db.orders.createIndex({ paymentIntentId: 1 }, { sparse: true });

// Products
db.products.createIndex({ artisan: 1, status: 1 });
db.products.createIndex({ category: 1, status: 1 });
db.products.createIndex({ status: 1, isFeatured: -1 });
db.products.createIndex({ name: 'text', description: 'text' });

// Artisans
db.artisans.createIndex({ user: 1 }, { unique: true });
db.artisans.createIndex({ isActive: 1, isVerified: 1 });
db.artisans.createIndex({ 'location.coordinates': '2dsphere' });

// Wallets
db.wallets.createIndex({ artisanId: 1 }, { unique: true });

// Notifications
db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
```

**Estimated Index Creation Time:** 5-10 minutes

---

## 🚀 Deployment Steps

### Pre-Flight Checklist

```bash
# 1. All code changes merged to main branch
git checkout main
git pull origin main

# 2. All tests passing
cd backend && npm test
cd ../frontend && npm test

# 3. Build successful locally
cd frontend && npm run build
# Should complete without errors

# 4. Version bumped (optional)
npm version patch
git push --tags
```

### Deployment Sequence

```bash
# Step 1: Install Vercel CLI
npm install -g vercel

# Step 2: Login
vercel login

# Step 3: Link project (first time only)
vercel link

# Step 4: Add environment variables
# (Use VERCEL_ENV_VARIABLES.md as reference)
vercel env add MONGODB_URI production
# ... repeat for all variables

# Step 5: Deploy to preview
vercel

# Step 6: Test preview URL
# Visit: https://bazaarmkt-xxx.vercel.app
# Test all critical features

# Step 7: Deploy to production (only if preview tests pass)
vercel --prod

# Step 8: Configure custom domain
# Vercel Dashboard → Domains → Add bazaarmkt.ca

# Step 9: Verify production
curl https://www.bazaarmkt.ca/api/health
# Should return: {"status":"OK","timestamp":"..."}

# Step 10: Test production
# Complete full user journey on production URL
```

---

## 🔍 Testing Matrix

### Critical User Flows to Test

| Flow | Test in Preview | Test in Production | Status |
|------|----------------|-------------------|--------|
| Homepage loads | ✅ | ✅ | - |
| User registration | ✅ | ✅ | - |
| User login | ✅ | ✅ | - |
| Browse products | ✅ | ✅ | - |
| Add to cart | ✅ | ✅ | - |
| Checkout (guest) | ✅ | ✅ | - |
| Checkout (authenticated) | ✅ | ✅ | - |
| Payment processing | ✅ | ✅ | - |
| Payment method saved | ✅ | ✅ | - |
| Email notification sent | ✅ | ✅ | - |
| Order confirmation page | ✅ | ✅ | - |
| View My Orders | ✅ | ✅ | - |
| Artisan dashboard | ✅ | ✅ | - |
| Artisan confirms order | ✅ | ✅ | - |
| Admin dashboard | ✅ | ✅ | - |
| Admin user management | ✅ | ✅ | - |

---

## 🐛 Known Issues to Fix

### Before Deployment

1. **Console.log statements** - 1,113 instances across backend
   - Impact: Clutters logs, potential performance impact
   - Fix: Replace with Winston logger
   - Priority: 🟡 HIGH
   - Time: 3-4 hours

2. **Debug routes exposed** - 8 test routes in production
   - Impact: Unnecessary code in production bundle
   - Fix: Gate with environment check or remove
   - Priority: 🟡 HIGH
   - Time: 10 minutes

3. **No webhook handler** - Stripe webhooks not implemented
   - Impact: Can't handle async payment events
   - Fix: Create webhook endpoint
   - Priority: 🟢 MEDIUM
   - Time: 1 hour

4. **Local file storage** - Images saved to local filesystem
   - Impact: Won't work on Vercel (serverless)
   - Fix: Implement Vercel Blob
   - Priority: 🟡 HIGH (if uploading images)
   - Time: 1-2 hours

5. **No error tracking** - Errors only in logs
   - Impact: Hard to debug production issues
   - Fix: Integrate Sentry
   - Priority: 🟢 MEDIUM
   - Time: 30 minutes

---

## 📚 Documentation Deliverables

### ✅ Completed Documents

1. **PRODUCTION_DEPLOYMENT_PLAN.md** - Complete deployment strategy
2. **REQUIRED_CODE_CHANGES.md** - Detailed code changes with examples
3. **VERCEL_ENV_VARIABLES.md** - All environment variables explained
4. **DEPLOYMENT_ROADMAP.md** - This document
5. **ADMIN_FUNCTIONALITY_REPORT.md** - Admin features verified
6. **PAYMENT_AND_NOTIFICATION_FIXES.md** - Payment flow documented
7. **FINAL_EMAIL_NOTIFICATION_FLOW.md** - Email system explained

### 📖 How to Use These Documents

**For Deployment:**
1. Start with **DEPLOYMENT_ROADMAP.md** (this document)
2. Follow **PRODUCTION_DEPLOYMENT_PLAN.md** step-by-step
3. Reference **REQUIRED_CODE_CHANGES.md** for code modifications
4. Use **VERCEL_ENV_VARIABLES.md** to configure environment

**For Troubleshooting:**
1. **ADMIN_FUNCTIONALITY_REPORT.md** - Admin issues
2. **PAYMENT_AND_NOTIFICATION_FIXES.md** - Payment/email issues
3. **FINAL_EMAIL_NOTIFICATION_FLOW.md** - Email debugging

---

## 💰 Cost Breakdown

### Monthly Operating Costs

| Service | Tier | Cost | Notes |
|---------|------|------|-------|
| Vercel Pro | Required | $20 | Includes bandwidth, functions |
| MongoDB Atlas M10 | Recommended | $57 | Production-grade performance |
| Stripe | Transaction fee | 2.9% + 30¢ | Only on successful payments |
| Brevo | Free/Starter | $0-25 | 300 emails/day free |
| Vercel Blob | Usage-based | ~$5 | $0.15/GB stored |
| Google Maps | Usage-based | $0-50 | $200 free credit monthly |
| Domain | Annual | $15/yr | ~$1.25/month |
| Sentry | Optional | $0-29 | Free tier available |

**Estimated Monthly Total:** 
- **Minimum:** $77/month (without optional services)
- **Recommended:** $100-150/month (with full monitoring)
- **Variable:** + transaction fees (2.9% + 30¢ per order)

### First Year Projection

**Assuming 100 orders/month @ $30 average:**
- Platform Revenue: 100 × $30 × 10% fee = $300/month
- Stripe Fees: 100 × ($0.87 + $0.30) = $117/month
- Operating Costs: $125/month
- **Net Profit:** ~$58/month or $700/year

**Break-even:** ~25 orders/month

---

## ✅ Go/No-Go Decision Criteria

### ✅ GO - Ready to Deploy When:

- [x] All 🔴 CRITICAL code changes completed
- [ ] All environment variables configured in Vercel
- [ ] Production database set up with indexes
- [ ] Preview deployment tested successfully
- [ ] Stripe switched to live mode and tested
- [ ] Email notifications tested and working
- [ ] Admin access tested and secured
- [ ] Monitoring configured
- [ ] Team trained on deployment and rollback
- [ ] Rollback plan documented and understood

### ❌ NO-GO - Don't Deploy If:

- Any CRITICAL security issue unresolved
- Payment processing not thoroughly tested
- No way to monitor production errors
- No rollback plan
- Database not properly indexed
- Email delivery not verified

---

## 🎓 Team Readiness

### Skills Required

**For Deployment:**
- [x] Vercel platform knowledge
- [x] MongoDB Atlas administration
- [x] Environment variable configuration
- [x] Git workflow
- [ ] DNS configuration (basic)

**For Monitoring:**
- [ ] Log analysis
- [ ] Error debugging
- [ ] Performance optimization
- [ ] Database queries

**For Support:**
- [x] User authentication flow
- [x] Payment processing (Stripe)
- [x] Email system (Brevo)
- [x] Order lifecycle
- [x] Admin functions

### Training Needed

1. **Vercel Dashboard Navigation** (30 minutes)
   - Deployments view
   - Environment variables
   - Logs viewer
   - Domains configuration

2. **MongoDB Atlas Administration** (1 hour)
   - Cluster management
   - Database explorer
   - Performance advisor
   - Backup/restore

3. **Error Response Protocol** (30 minutes)
   - How to check logs
   - How to roll back
   - Who to contact
   - Escalation procedure

---

## 📞 Emergency Contacts

### Service Providers

| Service | Support Channel | Response Time |
|---------|----------------|---------------|
| Vercel | Dashboard chat / support@vercel.com | < 4 hours (Pro plan) |
| MongoDB Atlas | Support chat | < 24 hours |
| Stripe | Dashboard support / support@stripe.com | < 24 hours |
| Brevo | support@brevo.com | < 48 hours |

### Internal Team

| Role | Responsibility | Contact |
|------|---------------|---------|
| Technical Lead | Deployment & critical bugs | [Your contact] |
| Backend Developer | API issues | [Your contact] |
| Frontend Developer | UI issues | [Your contact] |
| DevOps | Infrastructure | [Your contact] |

---

## 🎯 Success Metrics

### Day 1 Targets

- **Uptime:** > 99%
- **Error Rate:** < 2%
- **Avg Response Time:** < 1 second
- **Payment Success Rate:** > 95%
- **Email Delivery Rate:** > 90%

### Week 1 Targets

- **Uptime:** > 99.5%
- **Error Rate:** < 1%
- **Avg Response Time:** < 500ms
- **Payment Success Rate:** > 98%
- **Email Delivery Rate:** > 95%
- **User Registrations:** At least 10
- **Orders Placed:** At least 5

### Month 1 Targets

- **Uptime:** > 99.9%
- **Error Rate:** < 0.5%
- **Avg Response Time:** < 400ms
- **Payment Success Rate:** > 99%
- **Email Delivery Rate:** > 98%
- **Active Users:** 100+
- **Monthly Orders:** 50+

---

## 🔄 Post-Deployment Tasks

### Immediate (Within 1 hour)

- [ ] Verify all features work on production
- [ ] Send test order and verify email
- [ ] Check error logs
- [ ] Verify cron jobs scheduled
- [ ] Test admin dashboard
- [ ] Confirm SSL certificate active

### Day 1

- [ ] Monitor error rate hourly
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Fix critical bugs immediately
- [ ] Update documentation if needed

### Week 1

- [ ] Daily log reviews
- [ ] Performance optimization
- [ ] Fix non-critical bugs
- [ ] User onboarding improvements
- [ ] Content updates

### Month 1

- [ ] Comprehensive security audit
- [ ] Performance tuning
- [ ] Feature additions based on feedback
- [ ] Marketing site updates
- [ ] Analytics review

---

## 🎊 Launch Announcement Plan

### Before Launch

- [ ] Prepare social media posts
- [ ] Create launch email (if mailing list)
- [ ] Update website with launch date
- [ ] Notify existing users (if any)

### Launch Day

- [ ] Post on social media
- [ ] Send launch email
- [ ] Update status page
- [ ] Be available for support

### Post-Launch

- [ ] Share metrics after 24 hours
- [ ] Thank early adopters
- [ ] Address feedback publicly
- [ ] Plan next features

---

## 🏁 Final Recommendations

### Recommended Deployment Approach

**Option A: Soft Launch (Recommended)**
1. Deploy to production
2. Test with internal team
3. Invite 10-20 beta users
4. Collect feedback
5. Fix issues
6. Public launch after 1 week

**Option B: Full Launch**
1. Deploy to production
2. Announce publicly immediately
3. Monitor very closely
4. Fix issues in real-time
5. Higher risk but faster validation

**We recommend Option A** for a smoother launch with lower risk.

### Timeline Recommendation

**Ideal Timeline:**
- **Week 1:** Code cleanup and security fixes
- **Week 2:** Deploy to preview, testing, bug fixes
- **Week 3:** Soft launch to beta users
- **Week 4:** Collect feedback, final fixes
- **Week 5:** Public launch

**Fast-Track Timeline (Higher Risk):**
- **Days 1-2:** Critical fixes only
- **Day 3:** Deploy to preview and test
- **Day 4:** Deploy to production
- **Day 5:** Public launch

---

## 📈 Success Criteria

### Must Achieve

✅ Site loads on custom domain with HTTPS  
✅ Users can register and login  
✅ Orders can be placed and paid  
✅ Emails are delivered  
✅ Admin dashboard accessible  
✅ No critical errors in first 24 hours

### Should Achieve

✅ Response time < 1 second  
✅ Uptime > 99%  
✅ At least 5 successful orders in first week  
✅ Positive user feedback  
✅ No security incidents

### Nice to Achieve

✅ Featured in local business directory  
✅ 50+ users in first month  
✅ 100+ orders in first month  
✅ Local press coverage  
✅ 5-star reviews from early users

---

## 🎬 You Are Here

**Current Status:** ✅ Code Review Complete

**Next Steps:**
1. ✅ Review this deployment roadmap
2. ⏳ Schedule deployment date
3. ⏳ Assign team members to tasks
4. ⏳ Begin Phase 1: Code cleanup
5. ⏳ Set up production services
6. ⏳ Configure environment variables
7. ⏳ Deploy to preview
8. ⏳ Deploy to production
9. ⏳ Monitor and support

**Estimated Time to Production:** 1-2 weeks (depending on resource availability)

---

## 📖 Documentation Index

1. **PRODUCTION_DEPLOYMENT_PLAN.md** - Comprehensive deployment guide
2. **REQUIRED_CODE_CHANGES.md** - Exact code changes needed
3. **VERCEL_ENV_VARIABLES.md** - Environment variables reference
4. **DEPLOYMENT_ROADMAP.md** - This overview document
5. **ADMIN_FUNCTIONALITY_REPORT.md** - Admin features
6. **PAYMENT_AND_NOTIFICATION_FIXES.md** - Payment system
7. **FINAL_EMAIL_NOTIFICATION_FLOW.md** - Email notifications

**Start Here:** Read documents in order listed above.

---

**Status: REVIEW COMPLETE** ✅

**Recommendation:** Proceed with Phase 1 (Code Cleanup) after stakeholder approval.

---

*Prepared by: Development Team*  
*Date: October 8, 2025*  
*Next Review: Before deployment execution*

