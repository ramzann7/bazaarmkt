#!/bin/bash

# Generate Production Secrets
# Creates secure random secrets for environment variables

echo "🔐 BazaarMKT - Secret Generator"
echo "==============================="
echo ""

echo "Copy these values to your Vercel environment variables:"
echo ""

echo "1. JWT_SECRET (64 characters):"
echo "   ----------------------------------------"
openssl rand -base64 48
echo "   ----------------------------------------"
echo ""

echo "2. CRON_SECRET (64 characters):"
echo "   ----------------------------------------"
openssl rand -hex 32
echo "   ----------------------------------------"
echo ""

echo "3. SESSION_SECRET (optional, 32 characters):"
echo "   ----------------------------------------"
openssl rand -base64 32
echo "   ----------------------------------------"
echo ""

echo "⚠️  IMPORTANT:"
echo "   - Save these values securely"
echo "   - Never commit secrets to git"
echo "   - Use different secrets for each environment"
echo "   - These are cryptographically secure random values"
echo ""

