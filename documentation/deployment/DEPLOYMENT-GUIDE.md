# 🚀 bazaarmkt.ca Deployment Guide

## Overview
This guide will help you deploy bazaarmkt.ca using Vercel for both frontend and backend, with GoDaddy DNS configuration.

## Prerequisites
- GoDaddy account with DNS access
- Vercel account (free tier)
- MongoDB Atlas account (already configured)
- Domain: bazaarmkt.ca

## Step 1: Prepare for Deployment

### 1.1 Environment Variables
Copy the contents of `production-env-example.txt` and prepare your production environment variables.

### 1.2 MongoDB Atlas
Ensure your MongoDB Atlas cluster is configured for production:
- Whitelist `0.0.0.0/0` for Vercel IPs
- Use connection string format: `mongodb+srv://username:password@cluster.mongodb.net/bazaarmkt?retryWrites=true&w=majority`

## Step 2: Vercel Deployment

### 2.1 Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub
3. Import your bazaarMKT repository
4. Vercel will auto-detect the configuration from `vercel.json`

### 2.2 Configure Build Settings
- **Framework Preset**: Other
- **Root Directory**: Leave empty (uses root)
- **Build Command**: `npm run build` (for frontend)
- **Output Directory**: `frontend/dist`
- **Install Command**: `npm install`

### 2.3 Environment Variables
In Vercel dashboard, add these environment variables:

```
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bazaarmkt?retryWrites=true&w=majority

# JWT Secrets (generate secure random strings)
JWT_SECRET=your-super-secure-jwt-secret-for-production
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-for-production

# Email (Brevo)
BREVO_API_KEY=your-brevo-api-key

# Admin Configuration
ADMIN_EMAIL=admin@bazaarmkt.ca

# Stripe (if using)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key

# Node Environment
NODE_ENV=production
PORT=3000

# CORS
CORS_ORIGIN=https://bazaarmkt.ca
```

### 2.4 Deploy
1. Click "Deploy" in Vercel
2. Wait for deployment to complete
3. Note the Vercel URL (e.g., `bazaarmkt-xyz.vercel.app`)

## Step 3: GoDaddy DNS Configuration

### 3.1 Access DNS Management
1. Login to GoDaddy
2. Go to "My Products" → "DNS"
3. Find bazaarmkt.ca and click "Manage"

### 3.2 Configure DNS Records
Add/Update these records:

```
Type: A
Name: @
Value: 76.76.19.61 (Vercel IP)

Type: CNAME  
Name: www
Value: cname.vercel-dns.com

Type: CNAME
Name: api
Value: cname.vercel-dns.com
```

### 3.3 Vercel Domain Configuration
1. In Vercel dashboard, go to "Domains"
2. Add `bazaarmkt.ca` and `www.bazaarmkt.ca`
3. Vercel will provide DNS instructions (follow them)
4. Wait for DNS propagation (up to 48 hours)

## Step 4: SSL Certificate
- Vercel automatically provides SSL certificates
- No additional configuration needed
- HTTPS will be enforced automatically

## Step 5: Testing

### 5.1 Test URLs
- Main site: `https://bazaarmkt.ca`
- API: `https://bazaarmkt.ca/api/health`
- Admin: `https://bazaarmkt.ca/admin`

### 5.2 Health Checks
```bash
# Test API health
curl https://bazaarmkt.ca/api/health

# Test database connection
curl https://bazaarmkt.ca/api/artisans
```

## Step 6: Production Optimizations

### 6.1 Performance
- Vercel automatically handles CDN, caching, and compression
- Images are optimized automatically
- Static assets are served from global CDN

### 6.2 Monitoring
- Vercel provides built-in analytics
- Set up error monitoring (Sentry, etc.)
- Monitor MongoDB Atlas metrics

### 6.3 Security
- Environment variables are secure in Vercel
- HTTPS is enforced
- CORS is configured for production domain

## Step 7: Custom Domain Setup

### 7.1 Vercel Domain Settings
1. In Vercel dashboard → "Domains"
2. Add `bazaarmkt.ca`
3. Follow DNS instructions provided by Vercel

### 7.2 Final DNS Records
```
Type: A
Name: @
Value: [Vercel IP from instructions]

Type: CNAME
Name: www  
Value: [Vercel CNAME from instructions]
```

## Troubleshooting

### Common Issues
1. **DNS not propagating**: Wait up to 48 hours
2. **SSL not working**: Ensure DNS is properly configured
3. **API errors**: Check environment variables in Vercel
4. **Database connection**: Verify MongoDB Atlas whitelist

### Support Resources
- Vercel Documentation: https://vercel.com/docs
- GoDaddy DNS Help: https://www.godaddy.com/help
- MongoDB Atlas: https://docs.atlas.mongodb.com

## Cost Breakdown (Free Tier)
- **Vercel**: Free (100GB bandwidth, 100 serverless functions)
- **MongoDB Atlas**: Free (512MB storage, shared clusters)
- **Domain**: ~$15/year (GoDaddy)
- **Total**: ~$15/year for basic setup

## Scaling Options
When you need to scale:
- **Vercel Pro**: $20/month (unlimited bandwidth, more functions)
- **MongoDB Atlas M10**: $57/month (2GB RAM, dedicated cluster)
- **CDN**: Included with Vercel Pro

## Next Steps
1. Set up monitoring and analytics
2. Configure backup strategies
3. Implement CI/CD pipelines
4. Set up staging environment
5. Plan for scaling as traffic grows
