#!/bin/bash

# Quick Database Setup Script
# This helps you set up the production database with one command

echo "🚀 BazaarMKT Database Setup"
echo "==========================="
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production file not found"
    echo ""
    echo "Creating .env.production template..."
    cat > .env.production << 'EOF'
# Replace this with your actual MongoDB Atlas production connection string
MONGODB_URI=mongodb+srv://bazarmkt-prod:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/bazarmkt?retryWrites=true&w=majority
EOF
    echo ""
    echo "✅ Created .env.production file"
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env.production and add your real MongoDB URI"
    echo ""
    echo "Then run this script again:"
    echo "  cd backend && ./scripts/quick-database-setup.sh"
    exit 1
fi

# Check if MONGODB_URI is set
source .env.production
if [[ $MONGODB_URI == *"YOUR_PASSWORD"* ]] || [[ -z "$MONGODB_URI" ]]; then
    echo "❌ MongoDB URI not configured"
    echo ""
    echo "Please edit backend/.env.production and replace with your real MongoDB URI"
    echo ""
    exit 1
fi

echo "✅ Found .env.production with MongoDB URI"
echo ""

# Run the setup script
echo "🔧 Running database setup..."
echo ""

NODE_ENV=production node scripts/complete-database-setup.js

echo ""
echo "✅ Database setup complete!"
echo ""

