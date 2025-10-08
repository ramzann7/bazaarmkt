#!/bin/bash

# Deploy to Vercel Production
# This script deploys to production - USE WITH CAUTION

set -e

echo "🚀 BazaarMKT - Deploy to Production"
echo "====================================="
echo ""

# Change to project root
cd "$(dirname "$0")/.."

# Check if we're logged in to Vercel
if ! npx vercel whoami &>/dev/null; then
    echo "❌ Not logged in to Vercel"
    echo "Please run: npx vercel login"
    exit 1
fi

echo "✅ Logged in to Vercel"
echo ""

# Check git status
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ Error: You have uncommitted changes"
    echo ""
    git status --short
    echo ""
    echo "Please commit or stash your changes before deploying to production"
    exit 1
fi

# Get current branch
BRANCH=$(git branch --show-current)
echo "📌 Current branch: $BRANCH"
echo ""

# Warning prompt
echo "⚠️  WARNING: You are about to deploy to PRODUCTION"
echo ""
echo "This will:"
echo "  - Deploy to www.bazaarmkt.ca"
echo "  - Use production database"
echo "  - Process real payments"
echo "  - Send real emails to customers"
echo ""

read -p "Are you sure you want to continue? (type 'yes' to confirm) " -r
echo
if [[ ! $REPLY == "yes" ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "🚢 Deploying to production..."
echo ""

# Deploy to production
npx vercel --prod --yes

echo ""
echo "✅ Production deployment complete!"
echo ""
echo "📋 Important next steps:"
echo "   1. Check health: curl https://www.bazaarmkt.ca/api/health"
echo "   2. Test website: https://www.bazaarmkt.ca"
echo "   3. Monitor logs: npx vercel logs --prod --follow --yes"
echo "   4. Test critical flows:"
echo "      - User registration"
echo "      - User login"
echo "      - Place test order"
echo "      - Check admin dashboard"
echo ""
echo "📊 Monitor for at least 1 hour for any errors"
echo ""

