#!/bin/bash

# Event Management Platform API Test Script
# Tests all major endpoints to verify deployment

set -e

# Configuration
BASE_URL="https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev"
API_URL="${BASE_URL}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "PASS")
            echo -e "${GREEN}✅ PASS${NC}: $message"
            ((TESTS_PASSED++))
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL${NC}: $message"
            ((TESTS_FAILED++))
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  INFO${NC}: $message"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  WARN${NC}: $message"
            ;;
    esac
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    
    local url="${API_URL}${endpoint}"
    local curl_cmd="curl -s -w '%{http_code}' -o /tmp/response.json"
    
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        curl_cmd="$curl_cmd -X $method -H 'Content-Type: application/json'"
        if [ -n "$data" ]; then
            curl_cmd="$curl_cmd -d '$data'"
        fi
    else
        curl_cmd="$curl_cmd -X $method"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    local response_code=$(eval $curl_cmd)
    
    if [ "$response_code" = "$expected_status" ]; then
        print_status "PASS" "$description (Status: $response_code)"
        if [ -f /tmp/response.json ]; then
            echo "   Response: $(cat /tmp/response.json | head -c 200)..."
        fi
    else
        print_status "FAIL" "$description (Expected: $expected_status, Got: $response_code)"
        if [ -f /tmp/response.json ]; then
            echo "   Error: $(cat /tmp/response.json)"
        fi
    fi
    
    rm -f /tmp/response.json
}

echo -e "${BLUE}🚀 Event Management Platform API Testing${NC}"
echo "=================================================="
echo "Base URL: $API_URL"
echo "Timestamp: $(date)"
echo ""

# Test 1: Health Check
print_status "INFO" "Testing Health Check endpoint..."
test_endpoint "GET" "/health" "200" "Health Check"

# Test 2: API Documentation
print_status "INFO" "Testing API Documentation endpoint..."
test_endpoint "GET" "/docs" "200" "API Documentation"

# Test 3: User Registration
print_status "INFO" "Testing User Registration..."
REGISTER_DATA='{
  "email": "test@example.com",
  "password": "TestPassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "preferences": {
    "language": "en",
    "timezone": "America/New_York",
    "notifications": {
      "email": true,
      "sms": false,
      "push": true
    }
  }
}'
test_endpoint "POST" "/users/register" "201" "User Registration" "$REGISTER_DATA"

# Test 4: User Login
print_status "INFO" "Testing User Login..."
LOGIN_DATA='{
  "email": "test@example.com",
  "password": "TestPassword123!"
}'
test_endpoint "POST" "/users/login" "200" "User Login" "$LOGIN_DATA"

# Test 5: Get Events (Public endpoint)
print_status "INFO" "Testing Get Events endpoint..."
test_endpoint "GET" "/events?page=1&limit=5" "200" "Get Events"

# Test 6: Search Events
print_status "INFO" "Testing Search Events endpoint..."
test_endpoint "GET" "/events/search?query=tech&category=Technology" "200" "Search Events"

# Test 7: Analytics Platform
print_status "INFO" "Testing Analytics Platform endpoint..."
test_endpoint "GET" "/analytics/platform?startDate=2024-12-01&endDate=2024-12-31" "200" "Platform Analytics"

# Test 8: Notifications (should return 401 without auth)
print_status "INFO" "Testing Notifications endpoint (should require auth)..."
test_endpoint "GET" "/notifications" "401" "Notifications (Unauthorized)"

echo ""
echo "=================================================="
echo -e "${BLUE}📊 Test Summary${NC}"
echo "=================================================="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! The API is working correctly.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  Some tests failed. Please check the API implementation.${NC}"
    exit 1
fi
