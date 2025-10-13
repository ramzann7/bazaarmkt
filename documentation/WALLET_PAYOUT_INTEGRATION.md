# Wallet & Payout System Integration

## Overview
Complete integration of wallet system with Stripe Connect and platform-wide payout settings.

---

## Architecture

### Collections

#### `wallets` Collection
```javascript
{
  userId: ObjectId,              // Reference to users collection
  balance: Number,               // Current available balance
  currency: String,              // From platform settings (default: 'CAD')
  stripeAccountId: String,       // Stripe Connect account ID for payouts
  stripeCustomerId: String,      // Stripe customer ID
  payoutSettings: {
    enabled: Boolean,            // True when bank account connected
    method: String,              // 'bank_transfer'
    bankAccount: {
      bankName: String,
      last4: String,
      accountId: String          // Stripe external account ID
    },
    schedule: String,            // From platform settings: 'weekly' or 'monthly'
    minimumPayout: Number,       // From platform settings (default: 25)
    payoutDelay: Number,         // From platform settings (default: 7 days)
    lastPayoutDate: Date,
    nextPayoutDate: Date,
    customized: Boolean          // If true, don't sync with platform settings
  },
  metadata: {
    totalEarnings: Number,
    totalSpent: Number,
    totalPayouts: Number,
    platformFees: Number
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### `wallettransactions` Collection
```javascript
{
  userId: ObjectId,              // Reference to users collection
  type: String,                  // 'wallet_topup', 'order_revenue', 'wallet_deduction', 'payout', etc.
  amount: Number,                // Positive for credits, negative for debits
  description: String,
  paymentMethod: String,
  status: String,                // 'completed', 'pending', 'failed'
  reference: String,             // Stripe payout ID or transaction reference
  metadata: Object,              // Additional transaction data
  createdAt: Date,
  updatedAt: Date
}
```

---

## Platform Settings Integration

### Payout Settings (in `platformsettings` collection)
```javascript
{
  payoutSettings: {
    minimumPayoutAmount: 25,     // Minimum balance required for payout
    payoutFrequency: 'weekly',   // 'weekly' or 'monthly'
    payoutDelay: 7               // Days to delay payout (default: 7)
  }
}
```

### How Settings Propagate

1. **Wallet Creation**:
   - New wallets inherit platform payout settings
   - Gets current `minimumPayoutAmount`, `payoutFrequency`, `payoutDelay`

2. **Platform Settings Update**:
   - When admin updates payout settings
   - Automatically syncs to all wallets
   - Only updates wallets without `customized: true` flag

3. **Stripe Connect Setup**:
   - Enables payouts (`payoutSettings.enabled: true`)
   - Stores bank account info
   - Calculates next payout date based on platform schedule
   - Uses platform minimum payout amount

---

## Payout Processing Flow

### Automated Payout Process

1. **Scheduled Job Runs** (weekly on Fridays or monthly on 1st)
   ```javascript
   // Admin endpoint: POST /api/admin/process-payouts
   ```

2. **Find Eligible Wallets**:
   - `isActive: true`
   - `payoutSettings.enabled: true`
   - `nextPayoutDate <= today`
   - `balance >= minimumPayout`

3. **Process Each Wallet**:
   ```
   a. Verify Stripe Connect account exists
   b. Create Stripe payout via Connect API
   c. Record transaction in wallettransactions
   d. Deduct balance (only if payout successful)
   e. Calculate next payout date
   f. Update wallet metadata (totalPayouts)
   ```

4. **Payout Statuses**:
   - `completed`: Stripe payout successful, balance deducted
   - `failed`: Stripe payout failed, balance NOT deducted
   - `pending_stripe_setup`: No Stripe account, manual payout needed

---

## Stripe Connect Integration

### Setup Flow

1. **Artisan Adds Bank Info** (Profile → Payment tab)
   ```javascript
   - Saves encrypted bank info to artisans.bankInfo
   ```

2. **Artisan Clicks "Setup Stripe Connect"**
   ```javascript
   POST /api/profile/stripe-connect/setup
   
   Steps:
   - Decrypt bank info
   - Create Stripe Connect account
   - Add external bank account to Connect account
   - Update artisans collection with Connect IDs
   - Update/create wallets collection with:
     * stripeAccountId
     * payoutSettings.enabled = true
     * payoutSettings (from platform settings)
     * nextPayoutDate (calculated)
   ```

3. **Wallet Updated**:
   ```javascript
   {
     stripeAccountId: "acct_...",
     payoutSettings: {
       enabled: true,
       bankAccount: { bankName, last4, accountId },
       schedule: "weekly",        // From platform
       minimumPayout: 25,         // From platform
       nextPayoutDate: "2025-10-17T13:00:00Z"
     }
   }
   ```

---

## Auto-Sync Features

### 1. Wallet Creation
✅ New wallets automatically get platform payout settings
✅ Inherits: `schedule`, `minimumPayout`, `payoutDelay`, `currency`

### 2. Stripe Connect Setup
✅ Enables payouts when bank connected
✅ Uses platform settings for payout configuration
✅ Calculates next payout date based on platform schedule

### 3. Platform Settings Update
✅ When admin changes payout settings
✅ All wallets automatically sync (unless customized)
✅ Updates: `schedule`, `minimumPayout`, `payoutDelay`

**Example:**
```javascript
// Admin updates platform settings:
PUT /api/admin/platform-settings
{
  payoutSettings: {
    minimumPayoutAmount: 50,      // Changed from 25
    payoutFrequency: 'monthly',   // Changed from weekly
    payoutDelay: 3                // Changed from 7
  }
}

// Result:
// - Platform settings updated
// - All wallets with customized≠true updated
// - Console: "✅ Synced 45 wallets with new payout settings"
```

---

## Payout Execution

### Weekly Payouts (Default)
- **Schedule**: Every Friday at 1:00 PM
- **Minimum**: $25 (or platform setting)
- **Delay**: 7 days after earning (or platform setting)

### Monthly Payouts
- **Schedule**: 1st of each month at 1:00 PM
- **Minimum**: $25 (or platform setting)
- **Delay**: Days configured in platform settings

### Payout Process via Stripe
```javascript
// For each eligible wallet:
stripe.payouts.create(
  {
    amount: Math.round(balance * 100), // Cents
    currency: 'cad',
    description: 'Weekly payout - Artisan Name',
    metadata: { userId, artisanId, walletId }
  },
  { stripeAccount: wallet.stripeAccountId }
)

// Transaction recorded with:
- userId (not artisanId)
- type: 'payout'
- amount: -balance (negative)
- status: 'completed', 'failed', or 'pending_stripe_setup'
- reference: Stripe payout ID
```

---

## Migration from Legacy System

### Auto-Migration
The system automatically handles legacy wallets:

1. **Old Format**: `{ artisanId: ObjectId, ... }`
2. **New Format**: `{ userId: ObjectId, ... }`

**Migration Process**:
```javascript
// When wallet balance is requested:
1. Try to find by userId (new format)
2. If not found, find by artisanId (legacy)
3. If found with artisanId, migrate to userId
4. If not found at all, create new wallet
```

**Console Output**:
```
🔄 Migrating wallet from artisanId to userId format for user: 68eb28ef...
✅ Wallet migrated successfully
```

---

## Testing Checklist

### Wallet Creation
- [ ] Visit `/my-wallet` as artisan
- [ ] Wallet auto-created with platform payout settings
- [ ] Check MongoDB: wallet has userId field
- [ ] Balance shows $0.00
- [ ] Payout settings match platform settings

### Stripe Connect
- [ ] Add bank information in Profile
- [ ] Click "Setup Stripe Connect"
- [ ] Success message appears
- [ ] Check wallet in MongoDB:
  - [ ] `stripeAccountId` populated
  - [ ] `payoutSettings.enabled: true`
  - [ ] `payoutSettings.bankAccount` has bank info
  - [ ] `nextPayoutDate` calculated correctly

### Payout Processing
- [ ] Add funds to wallet (via order completion)
- [ ] Run payout process (when scheduled)
- [ ] Stripe payout created
- [ ] Transaction recorded in `wallettransactions`
- [ ] Wallet balance deducted to $0
- [ ] `metadata.totalPayouts` updated
- [ ] Next payout date calculated

### Platform Settings Sync
- [ ] Admin updates payout settings
- [ ] All wallets synced automatically
- [ ] Console shows: "Synced X wallets"
- [ ] Wallets with `customized: true` NOT updated

---

## API Endpoints

### Wallet Endpoints
- `GET /api/wallet/balance` - Get wallet balance (auto-creates if missing)
- `GET /api/wallet/transactions` - Get transaction history
- `GET /api/wallet/analytics` - Get wallet analytics

### Stripe Connect Endpoints
- `POST /api/profile/stripe-connect/setup` - Setup Stripe Connect
- `GET /api/profile/stripe-connect/status` - Get Connect status

### Admin Endpoints
- `POST /api/admin/process-payouts` - Manually trigger payout processing
- `PUT /api/admin/platform-settings` - Update platform settings (auto-syncs wallets)

---

## Security & Validation

### Bank Information
✅ Encrypted in `artisans.bankInfo`
✅ Only decrypted for Stripe Connect setup
✅ Never returned to frontend

### Stripe Account Validation
✅ Verifies account status before payout
✅ Checks `payouts_enabled` and `charges_enabled`
✅ Validates external account exists

### Payout Validation
✅ Checks minimum balance requirement
✅ Verifies wallet is active
✅ Validates payout settings enabled
✅ Only deducts balance if Stripe payout succeeds

---

## Success Criteria

✅ Wallets use `userId` field (not `artisanId`)
✅ All transactions in `wallettransactions` collection
✅ Platform settings control payout behavior
✅ Stripe Connect updates wallet automatically
✅ Payouts process through Stripe Connect API
✅ Failed payouts don't deduct balance
✅ Next payout date calculated from platform schedule
✅ Settings sync propagates to all wallets
✅ Legacy wallets migrated automatically
✅ Database indexes optimized (userId unique, artisanId sparse)

---

## Troubleshooting

### Wallet Not Created
**Symptom**: 500 error on `/api/wallet/balance`
**Cause**: Database index conflict or server not restarted
**Fix**: Run index fix script, restart server

### Stripe Connect Fails
**Symptom**: 500 error on setup
**Cause**: Missing Stripe credentials or invalid bank info
**Fix**: Check `.env` has `STRIPE_SECRET_KEY`, verify bank info format

### Payout Not Processing
**Symptom**: Balance stays same after payout date
**Cause**: Payout not enabled, below minimum, or Stripe error
**Fix**: Check `payoutSettings.enabled`, verify balance >= minimum, check Stripe logs

### Settings Not Syncing
**Symptom**: Wallets don't update when platform settings change
**Cause**: Wallets marked as `customized: true`
**Fix**: This is intentional - customized wallets keep their settings

---

## Database Commands

### Check Wallet
```javascript
db.wallets.findOne({ userId: ObjectId("USER_ID") })
```

### Check Transactions
```javascript
db.wallettransactions.find({ 
  userId: ObjectId("USER_ID"),
  type: 'payout'
}).sort({ createdAt: -1 })
```

### Force Sync All Wallets
```javascript
db.wallets.updateMany(
  { 
    isActive: true,
    'payoutSettings.customized': { $ne: true }
  },
  {
    $set: {
      'payoutSettings.schedule': 'weekly',
      'payoutSettings.minimumPayout': 25,
      'payoutSettings.payoutDelay': 7
    }
  }
)
```

---

## Next Steps

1. ✅ Restart backend server (if not already done)
2. ✅ Test wallet creation
3. ✅ Test Stripe Connect setup
4. ✅ Verify platform settings sync
5. ✅ Test payout processing
6. ✅ Monitor transaction records

