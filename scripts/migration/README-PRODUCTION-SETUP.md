# Production Database Setup Instructions

## Current Issue
The production database setup is failing because the production Atlas cluster either doesn't exist or the connection string is incorrect.

## Step-by-Step Solution

### Step 1: Create Production Atlas Cluster

1. **Log into MongoDB Atlas**: https://cloud.mongodb.com/
2. **Create a new cluster** for production:
   - Click "Build a Database"
   - Choose "M0 Sandbox" (free tier) or higher for production
   - Name it something like "bazaar-prod-cluster"
   - Choose a region close to your users
   - Click "Create"

### Step 2: Set Up Database User

1. **Go to Database Access** in the left sidebar
2. **Add New Database User**:
   - Username: `bazaar-prod-user` (or your preferred name)
   - Password: Generate a secure password
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

### Step 3: Configure Network Access

1. **Go to Network Access** in the left sidebar
2. **Add IP Address**:
   - Click "Add IP Address"
   - Choose "Allow Access from Anywhere" (0.0.0.0/0) for now
   - Or add your specific IP address
   - Click "Confirm"

### Step 4: Get Connection String

1. **Go to Database** in the left sidebar
2. **Click "Connect"** on your production cluster
3. **Choose "Connect your application"**
4. **Copy the connection string** - it should look like:
   ```
   mongodb+srv://bazaar-prod-user:<password>@bazaar-prod-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 5: Update Connection String

1. **Modify the connection string** to include the database name:
   ```
   mongodb+srv://bazaar-prod-user:<password>@bazaar-prod-cluster.xxxxx.mongodb.net/bazaarmkt-prod?retryWrites=true&w=majority
   ```

2. **Set the environment variable**:
   ```bash
   export PRODUCTION_MONGODB_URI="mongodb+srv://bazaar-prod-user:<password>@bazaar-prod-cluster.xxxxx.mongodb.net/bazaarmkt-prod?retryWrites=true&w=majority"
   ```

### Step 6: Run the Setup Script

```bash
cd scripts/migration
node setup-production-only.js
```

## Alternative: Use Same Cluster with Different Database

If you want to use the same Atlas cluster but with a different database name:

1. **Use your existing connection string** but change the database name
2. **Set the environment variable**:
   ```bash
   export PRODUCTION_MONGODB_URI="mongodb+srv://Cluster25123:zNlr0wjo045T5BbV@cluster0.cp9qdcy.mongodb.net/bazaarmkt-prod?retryWrites=true&w=majority"
   ```

3. **Run the setup script**:
   ```bash
   cd scripts/migration
   node setup-production-only.js
   ```

## Verification

After successful setup, run the verification script:

```bash
cd scripts/migration
node verify-production-database.js
```

## Environment Configuration

Once the database is set up, update your production environment:

1. **Copy the production environment template**:
   ```bash
   cp production-env-example.txt .env.production
   ```

2. **Update the MONGODB_URI** in `.env.production`:
   ```bash
   MONGODB_URI=mongodb+srv://bazaar-prod-user:<password>@bazaar-prod-cluster.xxxxx.mongodb.net/bazaarmkt-prod?retryWrites=true&w=majority
   ```

3. **Set other production environment variables** as needed

## Troubleshooting

### Authentication Failed
- Double-check username and password
- Ensure the user has proper permissions
- Verify the connection string format

### Network Access Denied
- Check IP whitelist in Atlas
- Ensure your IP is allowed
- Try "Allow Access from Anywhere" temporarily

### Database Not Found
- The database will be created automatically when first accessed
- Make sure the database name is correct in the connection string

## Next Steps

1. **Test the connection** with MongoDB Compass
2. **Run the setup script** to create collections and indexes
3. **Verify the setup** with the verification script
4. **Update your application** to use the production database
5. **Deploy to production** with the new environment variables

## Security Notes

- Use strong passwords for database users
- Restrict network access to specific IPs in production
- Rotate passwords regularly
- Monitor database access logs
- Use connection string authentication in production

