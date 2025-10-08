#!/bin/bash

# Deploy to Vercel Preview
# This script deploys to a preview environment for testing before production

set -e

echo "🚀 BazaarMKT - Deploy to Preview"
echo "=================================="
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
    echo "⚠️  Warning: You have uncommitted changes"
    echo ""
    git status --short
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get current branch
BRANCH=$(git branch --show-current)
echo "📌 Current branch: $BRANCH"
echo ""

# Deploy to preview
echo "🚢 Deploying to preview..."
echo ""

npx vercel --yes

echo ""
echo "✅ Preview deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Test the preview URL thoroughly"
echo "   2. Check logs: npx vercel logs --yes"
echo "   3. If all tests pass, deploy to production: ./scripts/deploy-production.sh"
echo ""

