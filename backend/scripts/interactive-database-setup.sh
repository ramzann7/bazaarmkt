#!/bin/bash

# Interactive Database Setup
# This script will guide you through setting up the production database

set -e

echo "🚀 BazaarMKT Interactive Database Setup"
echo "========================================"
echo ""

cd "$(dirname "$0")/.."

# Check if .env.production exists
if [ -f ".env.production" ]; then
    echo "✅ Found existing .env.production file"
    echo ""
    read -p "Do you want to use the existing configuration? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        rm .env.production
        echo "🗑️  Removed old .env.production"
    fi
fi

# If no .env.production, create one
if [ ! -f ".env.production" ]; then
    echo ""
    echo "📝 Let's set up your MongoDB connection"
    echo "========================================"
    echo ""
    echo "You need your MongoDB Atlas connection string."
    echo "It looks like:"
    echo "  mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/bazarmkt?retryWrites=true&w=majority"
    echo ""
    echo "Get it from: MongoDB Atlas → Databases → Your Cluster → Connect → Connect your application"
    echo ""
    read -p "Paste your MongoDB URI here: " MONGO_URI
    
    # Validate URI
    if [[ ! $MONGO_URI == mongodb+srv://* ]] && [[ ! $MONGO_URI == mongodb://* ]]; then
        echo ""
        echo "❌ Error: That doesn't look like a valid MongoDB URI"
        echo "It should start with 'mongodb+srv://' or 'mongodb://'"
        exit 1
    fi
    
    # Create .env.production
    echo "MONGODB_URI=$MONGO_URI" > .env.production
    echo ""
    echo "✅ Created .env.production file"
fi

echo ""
echo "🔧 Running database setup..."
echo "This will:"
echo "  1. Connect to your production database"
echo "  2. Create all necessary indexes"
echo "  3. Initialize platform settings"
echo "  4. Verify everything is correct"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel"

echo ""
NODE_ENV=production node scripts/complete-database-setup.js

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Database is ready for production!"
    echo ""
    echo "✅ What was done:"
    echo "   - Created 40+ database indexes for optimal performance"
    echo "   - Initialized platform settings (10% order fee, etc.)"
    echo "   - Verified all collections are properly configured"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Verify in MongoDB Atlas that indexes appear in each collection"
    echo "   2. Continue with Vercel deployment"
    echo ""
else
    echo ""
    echo "❌ Setup failed with exit code $EXIT_CODE"
    echo ""
    echo "Common issues:"
    echo "   - Wrong MongoDB URI"
    echo "   - Network access not configured (allow 0.0.0.0/0)"
    echo "   - Database user doesn't have write permissions"
    echo ""
    echo "Check the error message above for details"
    exit 1
fi

