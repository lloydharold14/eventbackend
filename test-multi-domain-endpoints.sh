#!/bin/bash

# Test Multi-Domain Endpoints
echo "🧪 Testing Multi-Domain Endpoints"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -e "\n${BLUE}Testing: ${name}${NC}"
    echo "URL: $url"
    
    # Use Google DNS to avoid local cache issues
    response=$(curl -s -w "%{http_code}" -o /tmp/response_body --connect-timeout 10 --max-time 30 "$url" 2>/dev/null)
    status_code=${response: -3}
    body=$(cat /tmp/response_body)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ SUCCESS: Status $status_code${NC}"
        echo "Response: $body" | head -c 200
        if [ ${#body} -gt 200 ]; then
            echo "..."
        fi
    else
        echo -e "${RED}❌ FAILED: Expected $expected_status, got $status_code${NC}"
        echo "Response: $body"
    fi
    
    rm -f /tmp/response_body
}

# Test all endpoints
echo -e "\n${YELLOW}Testing Main API (Authentication & Core Services)${NC}"
test_endpoint "Health Check" "https://dev-api.event.tkhtech.com/health" "200"

echo -e "\n${YELLOW}Testing Events API${NC}"
test_endpoint "Events List" "https://dev-events.event.tkhtech.com/events" "200"
test_endpoint "Categories" "https://dev-events.event.tkhtech.com/categories" "200"

echo -e "\n${YELLOW}Testing Bookings API${NC}"
test_endpoint "Bookings List" "https://dev-bookings.event.tkhtech.com/bookings" "200"

echo -e "\n${YELLOW}Testing Payments API${NC}"
test_endpoint "Payments Health" "https://dev-payments.event.tkhtech.com/health" "200"

echo -e "\n${YELLOW}Testing QR Codes API${NC}"
test_endpoint "QR Codes List" "https://dev-qr.event.tkhtech.com/qr-codes" "200"

echo -e "\n${YELLOW}Testing Analytics API${NC}"
test_endpoint "Analytics Health" "https://dev-analytics.event.tkhtech.com/analytics/health" "200"

echo -e "\n${GREEN}🎉 Multi-Domain Testing Complete!${NC}"
echo -e "\n${BLUE}Summary of URLs:${NC}"
echo "• Main API: https://dev-api.event.tkhtech.com"
echo "• Events API: https://dev-events.event.tkhtech.com"
echo "• Bookings API: https://dev-bookings.event.tkhtech.com"
echo "• Payments API: https://dev-payments.event.tkhtech.com"
echo "• QR Codes API: https://dev-qr.event.tkhtech.com"
echo "• Analytics API: https://dev-analytics.event.tkhtech.com"

echo -e "\n${YELLOW}Note: If some endpoints fail, it might be due to:${NC}"
echo "• DNS propagation (wait 5-10 minutes)"
echo "• CloudFront cache (wait 1-2 minutes)"
echo "• SSL certificate propagation (wait 2-3 minutes)"
