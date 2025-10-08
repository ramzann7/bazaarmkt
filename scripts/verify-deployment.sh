#!/bin/bash

# Verify Deployment Health
# Run this after deploying to check if everything is working

set -e

echo "🔍 BazaarMKT - Deployment Verification"
echo "======================================"
echo ""

# Check if URL is provided
URL=${1:-"https://www.bazaarmkt.ca"}

echo "Testing deployment at: $URL"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing health endpoint..."
HEALTH=$(curl -s "${URL}/api/health" || echo "FAILED")
if [[ $HEALTH == *"OK"* ]]; then
    echo "   ✅ Health check passed"
else
    echo "   ❌ Health check failed"
    echo "   Response: $HEALTH"
fi
echo ""

# Test 2: Frontend loads
echo "2️⃣  Testing frontend..."
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" "${URL}" || echo "000")
if [[ $FRONTEND == "200" ]]; then
    echo "   ✅ Frontend loads (HTTP $FRONTEND)"
else
    echo "   ❌ Frontend failed (HTTP $FRONTEND)"
fi
echo ""

# Test 3: API connectivity
echo "3️⃣  Testing API connectivity..."
API=$(curl -s -o /dev/null -w "%{http_code}" "${URL}/api/products?limit=1" || echo "000")
if [[ $API == "200" ]] || [[ $API == "401" ]]; then
    echo "   ✅ API reachable (HTTP $API)"
else
    echo "   ❌ API not reachable (HTTP $API)"
fi
echo ""

# Test 4: HTTPS redirect (if production)
if [[ $URL == *"bazaarmkt.ca"* ]]; then
    echo "4️⃣  Testing HTTPS redirect..."
    HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "http://www.bazaarmkt.ca" -L || echo "000")
    if [[ $HTTP_REDIRECT == "200" ]]; then
        echo "   ✅ HTTPS redirect working"
    else
        echo "   ⚠️  HTTPS redirect may not be configured (HTTP $HTTP_REDIRECT)"
    fi
    echo ""
fi

# Test 5: Response time
echo "5️⃣  Testing response time..."
START=$(date +%s%3N)
curl -s "${URL}/api/health" > /dev/null
END=$(date +%s%3N)
DURATION=$((END - START))
if [[ $DURATION -lt 2000 ]]; then
    echo "   ✅ Response time: ${DURATION}ms (good)"
elif [[ $DURATION -lt 5000 ]]; then
    echo "   ⚠️  Response time: ${DURATION}ms (acceptable)"
else
    echo "   ❌ Response time: ${DURATION}ms (slow)"
fi
echo ""

# Summary
echo "📊 Verification Summary"
echo "======================="
echo ""
echo "If all tests passed (✅), your deployment is healthy!"
echo ""
echo "Next steps:"
echo "   1. Test in browser: $URL"
echo "   2. Check logs: npx vercel logs --prod --yes"
echo "   3. Test critical user flows"
echo "   4. Monitor for 1 hour"
echo ""

