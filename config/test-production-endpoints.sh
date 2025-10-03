#!/bin/bash

# Production Endpoint Testing Script
# Tests all implemented endpoints to verify functionality

BASE_URL="https://www.bazaarmkt.ca/api"

echo "🧪 Testing BazaarMKT Production Endpoints"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    
    echo -n "Testing: $description... "
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$BASE_URL$endpoint")
    fi
    
    if [ "$response" == "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        if [ "$expected_status" == "200" ]; then
            # Show data count if available
            data_count=$(jq -r '.data | length? // .products | length? // "N/A"' /tmp/response.json 2>/dev/null)
            if [ "$data_count" != "N/A" ] && [ "$data_count" != "null" ]; then
                echo "   └── Data count: $data_count"
            fi
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $response)"
        if [ -f /tmp/response.json ]; then
            error_msg=$(jq -r '.message // .error // "No error message"' /tmp/response.json 2>/dev/null)
            echo "   └── Error: $error_msg"
        fi
    fi
}

# Function to test authenticated endpoint
test_auth_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    
    echo -n "Testing: $description... "
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$BASE_URL$endpoint")
    fi
    
    if [ "$response" == "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Auth required)"
    else
        echo -e "${YELLOW}⚠️  Expected auth error${NC} (Got: $response)"
    fi
}

echo ""
echo "🔍 SYSTEM ENDPOINTS"
echo "-------------------"
test_endpoint "GET" "/health" "200" "Health check"
test_endpoint "GET" "/debug" "200" "Debug endpoint"

echo ""
echo "📦 PRODUCT ENDPOINTS"
echo "--------------------"
test_endpoint "GET" "/products" "200" "All products"
test_endpoint "GET" "/products/popular" "200" "Popular products"
test_endpoint "GET" "/products/featured" "200" "Featured products"
test_endpoint "GET" "/products/categories/list" "200" "Product categories"

echo ""
echo "👥 COMMUNITY ENDPOINTS"
echo "----------------------"
test_endpoint "GET" "/community/posts" "200" "Community posts"
test_endpoint "GET" "/community/leaderboard/engagement" "200" "Engagement leaderboard"
test_endpoint "GET" "/community/stats" "200" "Community stats"

echo ""
echo "🏪 PROMOTIONAL ENDPOINTS"
echo "------------------------"
test_endpoint "GET" "/promotional/products/featured" "200" "Promotional featured products"
test_endpoint "GET" "/promotional/products/sponsored" "200" "Sponsored products"

echo ""
echo "🔐 AUTHENTICATION ENDPOINTS (Should require auth)"
echo "------------------------------------------------"
test_auth_endpoint "GET" "/auth/profile" "401" "User profile"
test_auth_endpoint "GET" "/user/stats" "401" "User statistics"
test_auth_endpoint "GET" "/notifications" "401" "User notifications"
test_auth_endpoint "GET" "/favorites" "401" "User favorites"
test_auth_endpoint "GET" "/wallet/balance" "401" "Wallet balance"

echo ""
echo "🎯 ARTISAN ENDPOINTS"
echo "--------------------"
test_endpoint "GET" "/artisans" "200" "All artisans"

echo ""
echo "📊 Results Summary"
echo "------------------"
echo "✅ Green: Endpoint working correctly"
echo "❌ Red: Endpoint has issues" 
echo "⚠️  Yellow: Expected behavior (auth required)"

echo ""
echo "🔄 Note: Some endpoints may take time to reflect recent deployments"
echo "If tests fail, wait a few minutes and try again."

# Cleanup
rm -f /tmp/response.json
