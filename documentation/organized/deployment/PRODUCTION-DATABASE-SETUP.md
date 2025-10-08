# Production Database Setup Guide

This guide will help you set up the production MongoDB Atlas database for bazaar without migrating data.

## Prerequisites

1. **MongoDB Atlas Account**: Ensure you have access to your Atlas cluster
2. **Production Cluster**: A separate Atlas cluster for production (recommended)
3. **Network Access**: Your IP address should be whitelisted in Atlas
4. **Database User**: A user with read/write permissions

## Step 1: Set Up Production Database Structure

### Option A: Using the Setup Script (Recommended)

1. **Set Environment Variables**:
   ```bash
   export PRODUCTION_MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/bazaarmkt-prod?retryWrites=true&w=majority"
   ```

2. **Run the Setup Script**:
   ```bash
   cd scripts/migration
   node setup-production-database.js
   ```

This script will:
- Connect to your production Atlas cluster
- Create all essential collections
- Set up proper indexes for optimal performance
- Verify the database structure

### Option B: Manual Setup

If you prefer to set up manually, ensure these collections exist:

**Essential Collections:**
- `users` - User accounts and profiles
- `artisans` - Artisan profiles and business information
- `products` - Product catalog
- `orders` - Order management
- `reviews` - Customer reviews
- `revenues` - Revenue tracking
- `wallets` - Artisan wallets
- `wallettransactions` - Wallet transaction history
- `platformsettings` - Platform configuration
- `geographicsettings` - Geographic restrictions
- `promotionalfeatures` - Promotional campaigns
- `artisanspotlights` - Featured artisans
- `communityposts` - Community posts
- `communitycomments` - Community comments
- `badges` - Achievement badges
- `rewards` - Reward system
- `rewardredemptions` - Reward redemptions
- `adminaudits` - Admin action logs
- `platformexpenses` - Platform expense tracking

## Step 2: Verify Database Setup

Run the verification script to ensure everything is set up correctly:

```bash
cd scripts/migration
node verify-production-database.js
```

This will:
- Test database connectivity
- Verify all collections exist
- Check index configuration
- Test basic operations
- Provide a summary report

## Step 3: Configure Production Environment

1. **Copy the environment template**:
   ```bash
   cp production-env-example.txt .env.production
   ```

2. **Update the production environment file** with your actual values:
   - Database connection string
   - API keys and secrets
   - Service configurations

3. **Key Environment Variables**:
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bazaarmkt-prod?retryWrites=true&w=majority
   NODE_ENV=production
   CORS_ORIGIN=https://bazaar.ca
   ```

## Step 4: Test Production Database

1. **Start the production server**:
   ```bash
   NODE_ENV=production npm start
   ```

2. **Test key endpoints**:
   ```bash
   # Health check
   curl https://your-domain.com/api/health
   
   # Test products endpoint
   curl https://your-domain.com/api/products
   
   # Test artisans endpoint
   curl https://your-domain.com/api/artisans
   ```

## Step 5: Deploy to Production

### Vercel Deployment

1. **Set environment variables in Vercel**:
   - Go to your Vercel project dashboard
   - Navigate to Settings > Environment Variables
   - Add all production environment variables

2. **Deploy**:
   ```bash
   vercel --prod
   ```

### Manual Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   NODE_ENV=production npm start
   ```

## Database Indexes

The setup script automatically creates these important indexes:

### Users Collection
- `email` (unique)
- `phone` (sparse)
- `role`
- `isActive`

### Artisans Collection
- `user` (unique)
- `artisanName`
- `type`
- `isActive`
- `isVerified`
- `address.city`
- `address.lat, address.lng` (geospatial)

### Products Collection
- `artisan`
- `name`
- `category`
- `isActive`
- `price`
- `createdAt`

### Orders Collection
- `patron`
- `artisan`
- `status`
- `orderDate`
- `orderNumber` (unique, sparse)

## Troubleshooting

### Connection Issues

1. **Check IP Whitelist**: Ensure your IP is whitelisted in Atlas
2. **Verify Credentials**: Double-check username and password
3. **Test Connection**: Use MongoDB Compass to test connection

### Missing Collections

If collections are missing after setup:

1. **Re-run setup script**:
   ```bash
   node setup-production-database.js
   ```

2. **Check logs** for any errors during collection creation

### Performance Issues

1. **Check Indexes**: Ensure all indexes are created properly
2. **Monitor Queries**: Use Atlas monitoring to identify slow queries
3. **Optimize Queries**: Review and optimize database queries

## Security Considerations

1. **Database User Permissions**: Use a user with minimal required permissions
2. **Network Security**: Whitelist only necessary IP addresses
3. **Connection String**: Keep connection strings secure and rotate passwords regularly
4. **Environment Variables**: Never commit production secrets to version control

## Monitoring

1. **Atlas Monitoring**: Use MongoDB Atlas built-in monitoring
2. **Application Logs**: Monitor application logs for database errors
3. **Performance Metrics**: Track query performance and response times

## Backup Strategy

1. **Atlas Backups**: Enable automatic backups in Atlas
2. **Point-in-Time Recovery**: Configure point-in-time recovery
3. **Regular Testing**: Test backup restoration procedures

## Support

If you encounter issues:

1. Check the verification script output
2. Review MongoDB Atlas logs
3. Test with MongoDB Compass
4. Check network connectivity and firewall settings

## Next Steps

After successful setup:

1. **Test all application features** with the production database
2. **Monitor performance** and optimize as needed
3. **Set up monitoring and alerting**
4. **Configure backup and disaster recovery**
5. **Document any custom configurations**

---

**Note**: This setup creates an empty production database with the correct structure. No data is migrated from your non-production database. You can populate the production database with test data or real data as needed.

