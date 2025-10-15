# Payment System Environment Variables

**Status**: ✅ Production Ready  
**Last Updated**: October 15, 2025

---

## Overview

This document lists all environment variables required for the payment and payout system to function correctly.

---

## Required Environment Variables

### Stripe Configuration

#### STRIPE_SECRET_KEY
**Required**: ✅ Yes  
**Type**: String  
**Purpose**: Stripe API secret key for server-side operations

**Format**:
- Test mode: `sk_test_51...`
- Live mode: `sk_live_51...`

**Where to get it**:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → API Keys
3. Copy "Secret key"

**Usage**: 
- Creating PaymentIntents
- Capturing payments
- Creating transfers
- Creating payouts
- Managing Connect accounts

**Example**:
```bash
STRIPE_SECRET_KEY=sk_test_51XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# Replace with your actual Stripe test secret key from https://dashboard.stripe.com/test/apikeys
```

---

#### STRIPE_PUBLISHABLE_KEY
**Required**: ✅ Yes (Frontend)  
**Type**: String  
**Purpose**: Stripe API publishable key for client-side Stripe.js

**Format**:
- Test mode: `pk_test_51...`
- Live mode: `pk_live_51...`

**Where to get it**:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → API Keys
3. Copy "Publishable key"

**Usage**:
- Frontend payment form
- Confirming PaymentIntents
- Stripe Elements integration

**Example**:
```bash
# Frontend .env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51ABCDEFabcdefGHIJKLghijklMNOPQRmnopqrSTUVWXYZstuvwxyz1234567890
```

---

#### STRIPE_WEBHOOK_SECRET
**Required**: ✅ Yes  
**Type**: String  
**Purpose**: Webhook signing secret for verifying webhook events from Stripe

**Format**: `whsec_...`

**Where to get it**:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → Webhooks
3. Click "Add endpoint"
4. Enter URL: `https://bazaarmkt.ca/api/webhooks/stripe`
5. Select events (see below)
6. Copy "Signing secret"

**Required Events**:
```
✅ payout.paid
✅ payout.failed
✅ payout.canceled
✅ payment_intent.succeeded
✅ payment_intent.payment_failed
✅ payment_intent.canceled
✅ charge.refunded
```

**Usage**:
- Verifying webhook signature
- Preventing webhook spoofing
- Ensuring events are from Stripe

**Example**:
```bash
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
```

**Critical**: Without this, webhooks will fail signature verification!

---

### Database Configuration

#### MONGODB_URI
**Required**: ✅ Yes  
**Type**: String (Connection String)  
**Purpose**: MongoDB Atlas connection string

**Format**: `mongodb+srv://username:password@cluster.mongodb.net/`

**Where to get it**:
1. MongoDB Atlas Dashboard
2. Click "Connect"
3. Choose "Connect your application"
4. Copy connection string
5. Replace `<password>` with actual password

**Usage**:
- Database connection
- All data persistence
- Wallet transactions
- Payout records

**Example**:
```bash
MONGODB_URI=mongodb+srv://bazaaruser:SecurePass123@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
```

---

#### MONGODB_DB_NAME
**Required**: ✅ Yes  
**Type**: String  
**Purpose**: Database name to use

**Default**: `bazaarmkt`

**Usage**:
- Specifying which database to use
- Separating test/staging/production data

**Example**:
```bash
MONGODB_DB_NAME=bazaarmkt
```

---

### Cron Job Authentication

#### CRON_SECRET
**Required**: ✅ Yes  
**Type**: String  
**Purpose**: Secret key for authenticating cron job requests

**Format**: Any secure random string (32+ characters recommended)

**How to generate**:
```bash
# Option 1: OpenSSL
openssl rand -hex 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Online generator
# https://www.random.org/strings/
```

**Usage**:
- Protecting `/api/cron/payouts` endpoint
- Preventing unauthorized payout triggers
- Vercel Cron authentication

**Example**:
```bash
CRON_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**Vercel Configuration**:
```bash
# Set in Vercel Dashboard
# Settings → Environment Variables → Add

# Or via Vercel CLI
vercel env add CRON_SECRET
```

---

### Encryption

#### ENCRYPTION_KEY
**Required**: ✅ Yes  
**Type**: String  
**Purpose**: Encryption key for bank information (AES-256)

**Format**: Exactly 32 characters (256 bits)

**How to generate**:
```bash
# Option 1: OpenSSL
openssl rand -hex 16  # Generates 32-character hex string

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**Usage**:
- Encrypting bank account numbers
- Encrypting routing numbers
- Securing sensitive artisan data

**Example**:
```bash
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
# Must be EXACTLY 32 characters!
```

**⚠️ Critical Security Notes**:
- Never commit this to version control
- Use different keys for dev/staging/production
- Store securely (Vercel environment variables)
- If lost, bank info cannot be decrypted

---

### Application Configuration

#### JWT_SECRET
**Required**: ✅ Yes  
**Type**: String  
**Purpose**: Secret key for signing JWT tokens

**Format**: Any secure random string (64+ characters recommended)

**How to generate**:
```bash
openssl rand -hex 32
```

**Usage**:
- User authentication
- Session management
- API authorization

**Example**:
```bash
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random-64-chars-minimum
```

---

#### FRONTEND_URL
**Required**: ✅ Yes  
**Type**: String (URL)  
**Purpose**: Frontend application URL for CORS and redirects

**Format**: `https://domain.com` (no trailing slash)

**Usage**:
- CORS configuration
- Stripe Connect redirect URLs
- Email links
- Payment confirmation redirects

**Example**:
```bash
# Production
FRONTEND_URL=https://bazaarmkt.ca

# Development
FRONTEND_URL=http://localhost:5173
```

---

#### NODE_ENV
**Required**: Recommended  
**Type**: String  
**Purpose**: Application environment

**Valid Values**:
- `development`
- `staging`
- `production`

**Usage**:
- Conditional behavior
- Error verbosity
- Logging levels
- Feature flags

**Example**:
```bash
NODE_ENV=production
```

---

## Environment-Specific Configuration

### Development (.env.local)

```bash
# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_test...

# Database (Development)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=bazaarmkt_dev

# Security
JWT_SECRET=dev-jwt-secret-change-in-production
CRON_SECRET=dev-cron-secret
ENCRYPTION_KEY=dev12345678901234567890123456789

# Application
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

### Production (Vercel)

```bash
# Stripe (Live Mode)
STRIPE_SECRET_KEY=sk_live_51...
STRIPE_PUBLISHABLE_KEY=pk_live_51...
STRIPE_WEBHOOK_SECRET=whsec_live...

# Database (Production)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB_NAME=bazaarmkt

# Security (Generate unique for production!)
JWT_SECRET=<64-char-random-string>
CRON_SECRET=<32-char-random-string>
ENCRYPTION_KEY=<32-char-random-string>

# Application
NODE_ENV=production
FRONTEND_URL=https://bazaarmkt.ca
```

---

## Setting Environment Variables

### Local Development

```bash
# Create .env file in backend directory
cd backend
nano .env

# Add variables
STRIPE_SECRET_KEY=sk_test_...
MONGODB_URI=mongodb://localhost:27017
# ... etc

# Load in application
# Using dotenv package (already configured)
require('dotenv').config();
```

---

### Vercel Deployment

#### Via Dashboard
1. Go to [Vercel Dashboard](https://vercel.com)
2. Select project
3. Settings → Environment Variables
4. Add each variable:
   - Name: `STRIPE_SECRET_KEY`
   - Value: `sk_live_...`
   - Environment: Production ✅
   - Click "Save"

#### Via CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Add environment variable
vercel env add STRIPE_SECRET_KEY
# Enter value when prompted
# Select: Production

# Or add multiple from file
vercel env pull .env.production
```

---

## Verification Checklist

Use this checklist to verify all required variables are set:

### Backend

```bash
# Check if all required variables are set
node -e "
const required = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'CRON_SECRET',
  'ENCRYPTION_KEY',
  'JWT_SECRET',
  'FRONTEND_URL'
];

required.forEach(key => {
  if (!process.env[key]) {
    console.error('❌ Missing:', key);
  } else {
    console.log('✅ Set:', key);
  }
});
"
```

### Frontend

```bash
# Check frontend variables
node -e "
const required = [
  'VITE_STRIPE_PUBLISHABLE_KEY'
];

required.forEach(key => {
  if (!process.env[key]) {
    console.error('❌ Missing:', key);
  } else {
    console.log('✅ Set:', key);
  }
});
"
```

---

## Common Issues

### Webhook Signature Verification Failed

**Cause**: `STRIPE_WEBHOOK_SECRET` is incorrect or not set

**Solution**:
```bash
# Get new webhook secret
1. Go to Stripe Dashboard → Webhooks
2. Click on your endpoint
3. Click "Reveal" on Signing secret
4. Update STRIPE_WEBHOOK_SECRET
5. Restart application
```

---

### Cron Job Unauthorized

**Cause**: `CRON_SECRET` mismatch between Vercel and application

**Solution**:
```bash
# Verify CRON_SECRET is set in Vercel
vercel env ls

# Update if needed
vercel env rm CRON_SECRET
vercel env add CRON_SECRET
```

---

### Cannot Decrypt Bank Info

**Cause**: `ENCRYPTION_KEY` changed or not set

**Solution**:
```bash
# ⚠️ WARNING: Cannot recover old data if key is lost!

# If in development, generate new key:
openssl rand -hex 16

# If in production and key is lost:
# - Artisans must re-enter bank information
# - Old encrypted data cannot be recovered
```

---

### Stripe API Error: Invalid API Key

**Cause**: Wrong `STRIPE_SECRET_KEY` or test/live mode mismatch

**Solution**:
```bash
# Verify key format
echo $STRIPE_SECRET_KEY | grep -E '^sk_(test|live)_'

# Test mode uses test keys
# Live mode uses live keys
# Don't mix them!
```

---

## Security Best Practices

### 1. Never Commit Secrets
```bash
# Add to .gitignore
.env
.env.local
.env.production
*.pem
*.key
```

### 2. Rotate Keys Regularly
```bash
# Recommended schedule:
# - ENCRYPTION_KEY: Never (data loss if changed)
# - JWT_SECRET: Every 6 months
# - CRON_SECRET: Every 6 months
# - Stripe keys: Only if compromised
```

### 3. Use Different Keys Per Environment
```bash
# Development
ENCRYPTION_KEY=dev12345678901234567890123456789

# Staging
ENCRYPTION_KEY=stg12345678901234567890123456789

# Production
ENCRYPTION_KEY=prd12345678901234567890123456789
```

### 4. Restrict Access
```bash
# Vercel: Limit who can view environment variables
# Team Settings → Members → Role: Viewer (can't see secrets)
```

---

## Quick Reference

### Minimum Required for Payment System

```bash
# These 8 variables are absolutely required
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=bazaarmkt
CRON_SECRET=<random-32-chars>
ENCRYPTION_KEY=<random-32-chars>
JWT_SECRET=<random-64-chars>
FRONTEND_URL=https://bazaarmkt.ca
```

### Test Mode vs Live Mode

```bash
# Test Mode (Development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... # From test mode webhook

# Live Mode (Production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... # From live mode webhook
```

---

## Related Documentation

- [Stripe Payout System](./STRIPE_PAYOUT_SYSTEM.md)
- [Webhook Configuration](./WEBHOOK_CONFIGURATION.md)
- [Security Guide](../../security/SECURITY_GUIDE.md)

---

**Last Updated**: October 15, 2025  
**Maintained By**: Development Team  
**Security Contact**: dev-team@bazaarmkt.ca

