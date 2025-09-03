# Brevo Email Service Setup Guide

## 🔑 Getting Your Brevo API Key

### Step 1: Access Brevo Dashboard
1. Go to [Brevo Dashboard](https://app.brevo.com/)
2. Sign in to your account
3. Navigate to **Settings** → **API Keys**

### Step 2: Create New API Key
1. Click **"Create a new API key"**
2. Give it a descriptive name (e.g., "Bazaar Market Email Service")
3. **Select these permissions**:
   - ✅ **SMTP API** (for sending emails)
   - ✅ **Contacts API** (for managing contacts)
   - ✅ **Account API** (for testing connection)
4. Click **"Create"**
5. **Copy the API key** (it starts with `xkeys-`)

### Step 3: Configure in Your App

#### Option A: Environment Variable (Recommended)
1. Create a `.env` file in your `frontend` folder:
```bash
# Brevo Email Service
VITE_BREVO_API_KEY=xkeys-your_actual_api_key_here

# Backend API
VITE_API_URL=http://localhost:4000
```

2. **Restart your frontend development server**

#### Option B: Direct Configuration
1. Open `frontend/src/app.jsx`
2. Find this line:
```javascript
initializeNotificationService();
```
3. Replace with:
```javascript
initializeNotificationService('xkeys-your_actual_api_key_here');
```

## 🧪 Testing the Integration

1. **Navigate to**: `/brevo-test`
2. **Run tests in order**:
   - Test Brevo Status
   - Test Brevo Connection ⭐ (This should now PASS)
   - Test Notification Service
   - Test Direct Brevo Email

## 🚨 Troubleshooting

### If you still get 401 errors:
1. **Verify API key format**: Should start with `xkeys-`
2. **Check permissions**: Ensure SMTP API access is enabled
3. **Account status**: Verify your Brevo account is active
4. **IP restrictions**: Check if your IP is whitelisted

### If environment variable doesn't work:
1. **File location**: `.env` must be in the `frontend` folder
2. **Variable name**: Must start with `VITE_`
3. **Server restart**: Frontend dev server must be restarted
4. **File format**: No spaces around `=` sign

## 📧 Expected Results

After proper configuration:
- ✅ All tests should pass
- ✅ Emails will be sent via Brevo
- ✅ Professional email templates
- ✅ Contact management in Brevo
- ✅ Delivery tracking in Brevo dashboard

## 🔒 Security Notes

- **Never commit** your `.env` file to git
- **Never share** your API key publicly
- **Rotate keys** regularly for security
- **Monitor usage** in Brevo dashboard
