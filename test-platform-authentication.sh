#!/bin/bash

# Event Management Platform - Complete Authentication & Testing Script
# Tests the complete platform with proper authentication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}[HEADER]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Configuration
API_BASE_URL="https://a5sma74inf.execute-api.ca-central-1.amazonaws.com/dev"
ACCESS_TOKEN=""
ORGANIZER_ID=""
EVENT_ID=""
TEST_EMAIL="organizer-test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

# Test data
ORGANIZER_DATA='{
  "email": "'$TEST_EMAIL'",
  "password": "'$TEST_PASSWORD'",
  "firstName": "John",
  "lastName": "Organizer",
  "phone": "+1234567890",
  "role": "organizer",
  "acceptTerms": true,
  "marketingConsent": false,
  "businessInfo": {
    "companyName": "Event Productions Inc",
    "businessType": "corporation",
    "taxId": "123456789",
    "address": {
      "street": "123 Business St",
      "city": "Toronto",
      "state": "ON",
      "country": "CA",
      "postalCode": "M5V 3A8"
    }
  }
}'

EVENT_DATA='{
  "title": "Test Music Festival 2024",
  "description": "A test music festival for platform validation",
  "startDate": "2024-07-15T18:00:00Z",
  "endDate": "2024-07-17T23:00:00Z",
  "location": {
    "address": "Exhibition Place",
    "city": "Toronto",
    "province": "ON",
    "country": "Canada",
    "coordinates": {
      "latitude": 43.6305,
      "longitude": -79.4204
    }
  },
  "category": "music",
  "tags": ["music", "festival", "test"],
  "pricing": {
    "baseCurrency": "CAD",
    "ticketTypes": [
      {
        "name": "General Admission",
        "description": "General admission ticket",
        "price": 89.99,
        "currency": "CAD",
        "quantity": 1000,
        "availableFrom": "2024-01-15T00:00:00Z",
        "availableUntil": "2024-07-10T23:59:59Z"
      }
    ]
  },
  "capacity": 1000,
  "isPublished": false
}'

# Function to make API calls
make_api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    local url="${API_BASE_URL}${endpoint}"
    local curl_cmd="curl -s -w '%{http_code}' -o /tmp/response.json"
    
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        curl_cmd="$curl_cmd -X $method -H 'Content-Type: application/json'"
        if [ -n "$ACCESS_TOKEN" ]; then
            curl_cmd="$curl_cmd -H 'Authorization: Bearer $ACCESS_TOKEN'"
        fi
        if [ -n "$data" ]; then
            curl_cmd="$curl_cmd -d '$data'"
        fi
    else
        curl_cmd="$curl_cmd -X $method"
        if [ -n "$ACCESS_TOKEN" ]; then
            curl_cmd="$curl_cmd -H 'Authorization: Bearer $ACCESS_TOKEN'"
        fi
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    local response_code=$(eval $curl_cmd)
    
    if [ "$response_code" = "$expected_status" ]; then
        print_success "$description (Status: $response_code)"
        if [ -f /tmp/response.json ]; then
            local response=$(cat /tmp/response.json)
            echo "   Response: $response"
        fi
        return 0
    else
        print_error "$description (Expected: $expected_status, Got: $response_code)"
        if [ -f /tmp/response.json ]; then
            local response=$(cat /tmp/response.json)
            echo "   Error: $response"
        fi
        return 1
    fi
}

# Function to extract JSON value
extract_json_value() {
    local json=$1
    local key=$2
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

# Function to extract JSON object value
extract_json_object_value() {
    local json=$1
    local key=$2
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

# Test 1: Check API Health
test_api_health() {
    print_step "Testing API Health Check"
    make_api_call "GET" "/health" "" "200" "API Health Check"
}

# Test 2: Organizer Registration
test_organizer_registration() {
    print_step "Testing Organizer Registration"
    if make_api_call "POST" "/users/register" "$ORGANIZER_DATA" "201" "Organizer Registration"; then
        local response=$(cat /tmp/response.json)
        ORGANIZER_ID=$(extract_json_value "$response" "id")
        if [ -n "$ORGANIZER_ID" ]; then
            print_success "Organizer ID: $ORGANIZER_ID"
        fi
        return 0
    else
        return 1
    fi
}

# Test 3: Organizer Login
test_organizer_login() {
    print_step "Testing Organizer Login"
    local login_data='{
        "email": "'$TEST_EMAIL'",
        "password": "'$TEST_PASSWORD'"
    }'
    
    if make_api_call "POST" "/users/login" "$login_data" "200" "Organizer Login"; then
        local response=$(cat /tmp/response.json)
        ACCESS_TOKEN=$(extract_json_value "$response" "accessToken")
        if [ -n "$ACCESS_TOKEN" ]; then
            print_success "Access Token obtained"
            return 0
        else
            print_error "Failed to extract access token"
            return 1
        fi
    else
        return 1
    fi
}

# Test 4: Get Organizer Profile
test_get_profile() {
    print_step "Testing Get Organizer Profile"
    make_api_call "GET" "/users/profile" "" "200" "Get Organizer Profile"
}

# Test 5: Create Event
test_create_event() {
    print_step "Testing Event Creation"
    if make_api_call "POST" "/events" "$EVENT_DATA" "201" "Create Event"; then
        local response=$(cat /tmp/response.json)
        EVENT_ID=$(extract_json_value "$response" "id")
        if [ -n "$EVENT_ID" ]; then
            print_success "Event ID: $EVENT_ID"
        fi
        return 0
    else
        return 1
    fi
}

# Test 6: Get Organizer Events
test_get_organizer_events() {
    print_step "Testing Get Organizer Events"
    make_api_call "GET" "/events/organizer" "" "200" "Get Organizer Events"
}

# Test 7: Get Event Details
test_get_event_details() {
    print_step "Testing Get Event Details"
    make_api_call "GET" "/events/$EVENT_ID" "" "200" "Get Event Details"
}

# Test 8: Publish Event
test_publish_event() {
    print_step "Testing Event Publication"
    local publish_data='{
        "isPublished": true
    }'
    make_api_call "PUT" "/events/$EVENT_ID/publish" "$publish_data" "200" "Publish Event"
}

# Test 9: Get Event Analytics
test_get_event_analytics() {
    print_step "Testing Event Analytics"
    make_api_call "GET" "/events/$EVENT_ID/analytics" "" "200" "Get Event Analytics"
}

# Test 10: Get Organizer Dashboard
test_get_organizer_dashboard() {
    print_step "Testing Organizer Dashboard"
    make_api_call "GET" "/organizer/dashboard" "" "200" "Get Organizer Dashboard"
}

# Test 11: Get Categories
test_get_categories() {
    print_step "Testing Get Categories"
    make_api_call "GET" "/events/categories" "" "200" "Get Event Categories"
}

# Test 12: Search Events
test_search_events() {
    print_step "Testing Event Search"
    make_api_call "GET" "/events/search?query=music&category=music" "" "200" "Search Events"
}

# Test 13: Get Platform Analytics
test_get_platform_analytics() {
    print_step "Testing Platform Analytics"
    make_api_call "GET" "/analytics/platform" "" "200" "Get Platform Analytics"
}

# Test 14: Test Payment Service
test_payment_service() {
    print_step "Testing Payment Service"
    local payment_api="https://rmjz94rovg.execute-api.ca-central-1.amazonaws.com/dev"
    local health_response=$(curl -s -w "%{http_code}" -o /tmp/payment_response.json "$payment_api/health")
    if [ "$health_response" = "200" ]; then
        print_success "Payment Service Health Check (Status: $health_response)"
    else
        print_error "Payment Service Health Check (Expected: 200, Got: $health_response)"
    fi
}

# Test 15: Test Booking Service
test_booking_service() {
    print_step "Testing Booking Service"
    local booking_api="https://bxmcilkslg.execute-api.ca-central-1.amazonaws.com/dev"
    local health_response=$(curl -s -w "%{http_code}" -o /tmp/booking_response.json "$booking_api/health")
    if [ "$health_response" = "200" ]; then
        print_success "Booking Service Health Check (Status: $health_response)"
    else
        print_error "Booking Service Health Check (Expected: 200, Got: $health_response)"
    fi
}

# Test 16: Test Analytics Service
test_analytics_service() {
    print_step "Testing Analytics Service"
    local analytics_api="https://9l0qlqw46a.execute-api.ca-central-1.amazonaws.com/dev"
    local health_response=$(curl -s -w "%{http_code}" -o /tmp/analytics_response.json "$analytics_api/health")
    if [ "$health_response" = "200" ]; then
        print_success "Analytics Service Health Check (Status: $health_response)"
    else
        print_error "Analytics Service Health Check (Expected: 200, Got: $health_response)"
    fi
}

# Main test function
run_all_tests() {
    local start_time=$(date +%s)
    local failed_tests=0
    
    print_header "🚀 Event Management Platform - Complete Authentication & Testing"
    print_status "API Base URL: $API_BASE_URL"
    print_status "Test Email: $TEST_EMAIL"
    print_status "Timestamp: $(date)"
    echo ""
    
    # Test 1: API Health
    if test_api_health; then
        print_success "✓ API Health Check"
    else
        print_error "✗ API Health Check"
        ((failed_tests++))
    fi
    
    # Test 2: Organizer Registration
    if test_organizer_registration; then
        print_success "✓ Organizer Registration"
    else
        print_error "✗ Organizer Registration"
        ((failed_tests++))
    fi
    
    # Test 3: Organizer Login
    if test_organizer_login; then
        print_success "✓ Organizer Login"
    else
        print_error "✗ Organizer Login"
        ((failed_tests++))
    fi
    
    # Test 4: Get Profile
    if test_get_profile; then
        print_success "✓ Get Organizer Profile"
    else
        print_error "✗ Get Organizer Profile"
        ((failed_tests++))
    fi
    
    # Test 5: Create Event
    if test_create_event; then
        print_success "✓ Create Event"
    else
        print_error "✗ Create Event"
        ((failed_tests++))
    fi
    
    # Test 6: Get Organizer Events
    if test_get_organizer_events; then
        print_success "✓ Get Organizer Events"
    else
        print_error "✗ Get Organizer Events"
        ((failed_tests++))
    fi
    
    # Test 7: Get Event Details
    if test_get_event_details; then
        print_success "✓ Get Event Details"
    else
        print_error "✗ Get Event Details"
        ((failed_tests++))
    fi
    
    # Test 8: Publish Event
    if test_publish_event; then
        print_success "✓ Publish Event"
    else
        print_error "✗ Publish Event"
        ((failed_tests++))
    fi
    
    # Test 9: Get Event Analytics
    if test_get_event_analytics; then
        print_success "✓ Get Event Analytics"
    else
        print_error "✗ Get Event Analytics"
        ((failed_tests++))
    fi
    
    # Test 10: Get Organizer Dashboard
    if test_get_organizer_dashboard; then
        print_success "✓ Get Organizer Dashboard"
    else
        print_error "✗ Get Organizer Dashboard"
        ((failed_tests++))
    fi
    
    # Test 11: Get Categories
    if test_get_categories; then
        print_success "✓ Get Categories"
    else
        print_error "✗ Get Categories"
        ((failed_tests++))
    fi
    
    # Test 12: Search Events
    if test_search_events; then
        print_success "✓ Search Events"
    else
        print_error "✗ Search Events"
        ((failed_tests++))
    fi
    
    # Test 13: Get Platform Analytics
    if test_get_platform_analytics; then
        print_success "✓ Get Platform Analytics"
    else
        print_error "✗ Get Platform Analytics"
        ((failed_tests++))
    fi
    
    # Test 14: Payment Service
    if test_payment_service; then
        print_success "✓ Payment Service"
    else
        print_error "✗ Payment Service"
        ((failed_tests++))
    fi
    
    # Test 15: Booking Service
    if test_booking_service; then
        print_success "✓ Booking Service"
    else
        print_error "✗ Booking Service"
        ((failed_tests++))
    fi
    
    # Test 16: Analytics Service
    if test_analytics_service; then
        print_success "✓ Analytics Service"
    else
        print_error "✗ Analytics Service"
        ((failed_tests++))
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    print_header "📊 Testing Summary"
    print_status "Total Duration: ${duration} seconds"
    print_status "Failed Tests: $failed_tests"
    print_status "Organizer ID: $ORGANIZER_ID"
    print_status "Event ID: $EVENT_ID"
    print_status "Test Email: $TEST_EMAIL"
    
    if [ $failed_tests -eq 0 ]; then
        print_success "🎉 All platform tests passed! The Event Management Platform is fully operational."
        print_status "✅ Ready for mobile app testing!"
    else
        print_error "❌ $failed_tests test(s) failed"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    rm -f /tmp/response.json /tmp/payment_response.json /tmp/booking_response.json /tmp/analytics_response.json
}

# Set trap for cleanup
trap cleanup EXIT

# Main function
main() {
    run_all_tests
}

# Run the script
main "$@"
