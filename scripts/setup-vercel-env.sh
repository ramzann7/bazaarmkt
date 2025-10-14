#!/bin/bash

# Setup Vercel Environment Variables
# Run this script to configure all required environment variables for production

echo "🔧 Setting up Vercel environment variables..."

# Essential Variables
vercel env add MONGODB_URI production
vercel env add NODE_ENV production
vercel env add JWT_SECRET production  
vercel env add JWT_EXPIRES_IN production
vercel env add CRON_SECRET production

# Payment Processing
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production

# Email Services
vercel env add BREVO_API_KEY production
vercel env add ENABLE_EMAIL_NOTIFICATIONS production

# External APIs
vercel env add GOOGLE_MAPS_API_KEY production
vercel env add GEOCODING_API_KEY production

# Security
vercel env add BCRYPT_ROUNDS production
vercel env add SESSION_SECRET production

# Features
vercel env add ENABLE_ANALYTICS production
vercel env add LOG_LEVEL production

echo "✅ Environment variables setup complete!"
echo "📝 Please enter the actual values when prompted."
echo "🚀 After setup, run: vercel --prod to deploy"
