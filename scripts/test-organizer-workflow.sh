#!/bin/bash

# Event Management Platform - Organizer Workflow Testing Script
# Tests the complete organizer journey from registration to event management

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
API_BASE_URL=""
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
        "availableUntil": "2024-07-14T23:59:59Z"
      },
      {
        "name": "VIP Pass",
        "description": "VIP access with exclusive benefits",
        "price": 299.99,
        "currency": "CAD",
        "quantity": 100,
        "availableFrom": "2024-01-15T00:00:00Z",
        "availableUntil": "2024-07-14T23:59:59Z"
      }
    ]
  },
  "maxAttendees": 1100,
  "features": ["parking", "food", "drinks"],
  "images": [
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800"
  ],
  "settings": {
    "allowWaitlist": true,
    "requireApproval": false,
    "allowCancellations": true,
    "cancellationPolicy": "Full refund up to 7 days before event",
    "ageRestriction": 18,
    "dressCode": "Casual"
  },
  "compliance": {
    "taxSettings": {
      "CA": {
        "taxRate": 13,
        "taxType": "HST"
      }
    }
  }
}'

# Function to make API calls
make_api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4
    
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd -H '$headers'"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$API_BASE_URL$endpoint'"
    
    local response=$(eval $curl_cmd)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    echo "$body"
    return $http_code
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
    echo "$json" | grep -o "\"$key\":[^,}]*" | cut -d':' -f2- | tr -d '"'
}

# Function to check API health
check_api_health() {
    print_step "Checking API health..."
    
    local response=$(make_api_call "GET" "/health")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "API is healthy"
        echo "Response: $response"
    else
        print_error "API health check failed (HTTP $http_code)"
        echo "Response: $response"
        exit 1
    fi
}

# Function to test organizer registration
test_organizer_registration() {
    print_step "Testing organizer registration..."
    
    local response=$(make_api_call "POST" "/auth/register" "$ORGANIZER_DATA" "Content-Type: application/json")
    local http_code=$?
    
    if [ $http_code -eq 201 ] || [ $http_code -eq 200 ]; then
        print_success "Organizer registration successful"
        echo "Response: $response"
        
        # Extract organizer ID if available
        ORGANIZER_ID=$(extract_json_value "$response" "id")
        if [ -n "$ORGANIZER_ID" ]; then
            print_status "Organizer ID: $ORGANIZER_ID"
        fi
    else
        print_error "Organizer registration failed (HTTP $http_code)"
        echo "Response: $response"
        exit 1
    fi
}

# Function to test organizer login
test_organizer_login() {
    print_step "Testing organizer login..."
    
    local login_data='{
      "email": "'$TEST_EMAIL'",
      "password": "'$TEST_PASSWORD'"
    }'
    
    local response=$(make_api_call "POST" "/auth/login" "$login_data" "Content-Type: application/json")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Organizer login successful"
        echo "Response: $response"
        
        # Extract access token
        ACCESS_TOKEN=$(extract_json_value "$response" "accessToken")
        if [ -n "$ACCESS_TOKEN" ]; then
            print_status "Access token obtained"
        else
            print_warning "Could not extract access token"
        fi
    else
        print_error "Organizer login failed (HTTP $http_code)"
        echo "Response: $response"
        exit 1
    fi
}

# Function to test get organizer profile
test_get_profile() {
    print_step "Testing get organizer profile..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "No access token available"
        return 1
    fi
    
    local response=$(make_api_call "GET" "/users/profile" "" "Authorization: Bearer $ACCESS_TOKEN")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Get profile successful"
        echo "Response: $response"
        
        # Extract organizer ID if not already set
        if [ -z "$ORGANIZER_ID" ]; then
            ORGANIZER_ID=$(extract_json_value "$response" "id")
            if [ -n "$ORGANIZER_ID" ]; then
                print_status "Organizer ID: $ORGANIZER_ID"
            fi
        fi
    else
        print_error "Get profile failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test update organizer profile
test_update_profile() {
    print_step "Testing update organizer profile..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "No access token available"
        return 1
    fi
    
    local update_data='{
      "firstName": "John",
      "lastName": "Organizer",
      "phone": "+1234567890",
      "businessInfo": {
        "companyName": "Event Productions Inc",
        "businessType": "corporation",
        "taxId": "123456789",
        "businessNumber": "BN123456789",
        "address": {
          "street": "123 Business St",
          "city": "Toronto",
          "state": "ON",
          "country": "CA",
          "postalCode": "M5V 3A8"
        }
      },
      "preferences": {
        "language": "en-CA",
        "currency": "CAD",
        "timezone": "America/Toronto",
        "emailNotifications": true,
        "smsNotifications": false,
        "pushNotifications": true,
        "marketingEmails": false
      }
    }'
    
    local response=$(make_api_call "PUT" "/users/profile" "$update_data" "Authorization: Bearer $ACCESS_TOKEN; Content-Type: application/json")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Update profile successful"
        echo "Response: $response"
    else
        print_error "Update profile failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test create event
test_create_event() {
    print_step "Testing create event..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "No access token available"
        return 1
    fi
    
    local response=$(make_api_call "POST" "/events" "$EVENT_DATA" "Authorization: Bearer $ACCESS_TOKEN; Content-Type: application/json")
    local http_code=$?
    
    if [ $http_code -eq 201 ] || [ $http_code -eq 200 ]; then
        print_success "Create event successful"
        echo "Response: $response"
        
        # Extract event ID
        EVENT_ID=$(extract_json_value "$response" "id")
        if [ -n "$EVENT_ID" ]; then
            print_status "Event ID: $EVENT_ID"
        fi
    else
        print_error "Create event failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test get organizer events
test_get_organizer_events() {
    print_step "Testing get organizer events..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "No access token available"
        return 1
    fi
    
    local response=$(make_api_call "GET" "/events/organizer?status=all&page=1&limit=20" "" "Authorization: Bearer $ACCESS_TOKEN")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Get organizer events successful"
        echo "Response: $response"
    else
        print_error "Get organizer events failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test get event details (organizer view)
test_get_event_details() {
    print_step "Testing get event details (organizer view)..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$EVENT_ID" ]; then
        print_error "No access token or event ID available"
        return 1
    fi
    
    local response=$(make_api_call "GET" "/events/$EVENT_ID/organizer" "" "Authorization: Bearer $ACCESS_TOKEN")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Get event details successful"
        echo "Response: $response"
    else
        print_error "Get event details failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test publish event
test_publish_event() {
    print_step "Testing publish event..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$EVENT_ID" ]; then
        print_error "No access token or event ID available"
        return 1
    fi
    
    local response=$(make_api_call "POST" "/events/$EVENT_ID/publish" "" "Authorization: Bearer $ACCESS_TOKEN")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Publish event successful"
        echo "Response: $response"
    else
        print_error "Publish event failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test get event tickets
test_get_event_tickets() {
    print_step "Testing get event tickets..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$EVENT_ID" ]; then
        print_error "No access token or event ID available"
        return 1
    fi
    
    local response=$(make_api_call "GET" "/events/$EVENT_ID/tickets" "" "Authorization: Bearer $ACCESS_TOKEN")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Get event tickets successful"
        echo "Response: $response"
    else
        print_error "Get event tickets failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test get event analytics
test_get_event_analytics() {
    print_step "Testing get event analytics..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$EVENT_ID" ]; then
        print_error "No access token or event ID available"
        return 1
    fi
    
    local response=$(make_api_call "GET" "/events/$EVENT_ID/analytics?period=30d&metrics=views,bookings,revenue" "" "Authorization: Bearer $ACCESS_TOKEN")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Get event analytics successful"
        echo "Response: $response"
    else
        print_error "Get event analytics failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test get organizer dashboard
test_get_organizer_dashboard() {
    print_step "Testing get organizer dashboard..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "No access token available"
        return 1
    fi
    
    local response=$(make_api_call "GET" "/analytics/organizer/dashboard?period=30d" "" "Authorization: Bearer $ACCESS_TOKEN")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Get organizer dashboard successful"
        echo "Response: $response"
    else
        print_error "Get organizer dashboard failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test get revenue summary
test_get_revenue_summary() {
    print_step "Testing get revenue summary..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "No access token available"
        return 1
    fi
    
    local response=$(make_api_call "GET" "/revenue/summary?period=30d&currency=CAD" "" "Authorization: Bearer $ACCESS_TOKEN")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Get revenue summary successful"
        echo "Response: $response"
    else
        print_error "Get revenue summary failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test get event attendees
test_get_event_attendees() {
    print_step "Testing get event attendees..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$EVENT_ID" ]; then
        print_error "No access token or event ID available"
        return 1
    fi
    
    local response=$(make_api_call "GET" "/events/$EVENT_ID/attendees?page=1&limit=50&status=confirmed" "" "Authorization: Bearer $ACCESS_TOKEN")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Get event attendees successful"
        echo "Response: $response"
    else
        print_error "Get event attendees failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test send event notification
test_send_event_notification() {
    print_step "Testing send event notification..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$EVENT_ID" ]; then
        print_error "No access token or event ID available"
        return 1
    fi
    
    local notification_data='{
      "type": "event_update",
      "subject": "Test Event Update",
      "message": "This is a test notification for platform validation",
      "recipients": "all_attendees",
      "channels": ["email"],
      "scheduledFor": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
    }'
    
    local response=$(make_api_call "POST" "/events/$EVENT_ID/notifications" "$notification_data" "Authorization: Bearer $ACCESS_TOKEN; Content-Type: application/json")
    local http_code=$?
    
    if [ $http_code -eq 200 ] || [ $http_code -eq 201 ]; then
        print_success "Send event notification successful"
        echo "Response: $response"
    else
        print_error "Send event notification failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test update event
test_update_event() {
    print_step "Testing update event..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$EVENT_ID" ]; then
        print_error "No access token or event ID available"
        return 1
    fi
    
    local update_data='{
      "title": "Updated Test Music Festival 2024",
      "description": "An updated test music festival for platform validation",
      "settings": {
        "allowWaitlist": true,
        "requireApproval": false,
        "allowCancellations": true,
        "cancellationPolicy": "Full refund up to 7 days before event",
        "ageRestriction": 18,
        "dressCode": "Casual"
      }
    }'
    
    local response=$(make_api_call "PUT" "/events/$EVENT_ID" "$update_data" "Authorization: Bearer $ACCESS_TOKEN; Content-Type: application/json")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Update event successful"
        echo "Response: $response"
    else
        print_error "Update event failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test unpublish event
test_unpublish_event() {
    print_step "Testing unpublish event..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$EVENT_ID" ]; then
        print_error "No access token or event ID available"
        return 1
    fi
    
    local response=$(make_api_call "POST" "/events/$EVENT_ID/unpublish" "" "Authorization: Bearer $ACCESS_TOKEN")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Unpublish event successful"
        echo "Response: $response"
    else
        print_error "Unpublish event failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test duplicate event
test_duplicate_event() {
    print_step "Testing duplicate event..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$EVENT_ID" ]; then
        print_error "No access token or event ID available"
        return 1
    fi
    
    local duplicate_data='{
      "title": "Duplicated Test Music Festival 2025",
      "startDate": "2025-07-15T18:00:00Z",
      "endDate": "2025-07-17T23:00:00Z",
      "copySettings": true,
      "copyPricing": true,
      "copyImages": true
    }'
    
    local response=$(make_api_call "POST" "/events/$EVENT_ID/duplicate" "$duplicate_data" "Authorization: Bearer $ACCESS_TOKEN; Content-Type: application/json")
    local http_code=$?
    
    if [ $http_code -eq 200 ] || [ $http_code -eq 201 ]; then
        print_success "Duplicate event successful"
        echo "Response: $response"
    else
        print_error "Duplicate event failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test get categories
test_get_categories() {
    print_step "Testing get categories..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "No access token available"
        return 1
    fi
    
    local response=$(make_api_call "GET" "/categories" "" "Authorization: Bearer $ACCESS_TOKEN")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Get categories successful"
        echo "Response: $response"
    else
        print_error "Get categories failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to test get mobile app data
test_get_mobile_app_data() {
    print_step "Testing get mobile app data..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$EVENT_ID" ]; then
        print_error "No access token or event ID available"
        return 1
    fi
    
    local response=$(make_api_call "GET" "/events/$EVENT_ID/mobile" "" "Authorization: Bearer $ACCESS_TOKEN")
    local http_code=$?
    
    if [ $http_code -eq 200 ]; then
        print_success "Get mobile app data successful"
        echo "Response: $response"
    else
        print_error "Get mobile app data failed (HTTP $http_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to run all tests
run_all_tests() {
    print_header "Starting Organizer Workflow Testing"
    print_status "API Base URL: $API_BASE_URL"
    print_status "Test Email: $TEST_EMAIL"
    print_status "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    
    local start_time=$(date +%s)
    local failed_tests=0
    
    # Test 1: API Health Check
    if check_api_health; then
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
        print_success "✓ Get Profile"
    else
        print_error "✗ Get Profile"
        ((failed_tests++))
    fi
    
    # Test 5: Update Profile
    if test_update_profile; then
        print_success "✓ Update Profile"
    else
        print_error "✗ Update Profile"
        ((failed_tests++))
    fi
    
    # Test 6: Create Event
    if test_create_event; then
        print_success "✓ Create Event"
    else
        print_error "✗ Create Event"
        ((failed_tests++))
    fi
    
    # Test 7: Get Organizer Events
    if test_get_organizer_events; then
        print_success "✓ Get Organizer Events"
    else
        print_error "✗ Get Organizer Events"
        ((failed_tests++))
    fi
    
    # Test 8: Get Event Details
    if test_get_event_details; then
        print_success "✓ Get Event Details"
    else
        print_error "✗ Get Event Details"
        ((failed_tests++))
    fi
    
    # Test 9: Publish Event
    if test_publish_event; then
        print_success "✓ Publish Event"
    else
        print_error "✗ Publish Event"
        ((failed_tests++))
    fi
    
    # Test 10: Get Event Tickets
    if test_get_event_tickets; then
        print_success "✓ Get Event Tickets"
    else
        print_error "✗ Get Event Tickets"
        ((failed_tests++))
    fi
    
    # Test 11: Get Event Analytics
    if test_get_event_analytics; then
        print_success "✓ Get Event Analytics"
    else
        print_error "✗ Get Event Analytics"
        ((failed_tests++))
    fi
    
    # Test 12: Get Organizer Dashboard
    if test_get_organizer_dashboard; then
        print_success "✓ Get Organizer Dashboard"
    else
        print_error "✗ Get Organizer Dashboard"
        ((failed_tests++))
    fi
    
    # Test 13: Get Revenue Summary
    if test_get_revenue_summary; then
        print_success "✓ Get Revenue Summary"
    else
        print_error "✗ Get Revenue Summary"
        ((failed_tests++))
    fi
    
    # Test 14: Get Event Attendees
    if test_get_event_attendees; then
        print_success "✓ Get Event Attendees"
    else
        print_error "✗ Get Event Attendees"
        ((failed_tests++))
    fi
    
    # Test 15: Send Event Notification
    if test_send_event_notification; then
        print_success "✓ Send Event Notification"
    else
        print_error "✗ Send Event Notification"
        ((failed_tests++))
    fi
    
    # Test 16: Update Event
    if test_update_event; then
        print_success "✓ Update Event"
    else
        print_error "✗ Update Event"
        ((failed_tests++))
    fi
    
    # Test 17: Unpublish Event
    if test_unpublish_event; then
        print_success "✓ Unpublish Event"
    else
        print_error "✗ Unpublish Event"
        ((failed_tests++))
    fi
    
    # Test 18: Duplicate Event
    if test_duplicate_event; then
        print_success "✓ Duplicate Event"
    else
        print_error "✗ Duplicate Event"
        ((failed_tests++))
    fi
    
    # Test 19: Get Categories
    if test_get_categories; then
        print_success "✓ Get Categories"
    else
        print_error "✗ Get Categories"
        ((failed_tests++))
    fi
    
    # Test 20: Get Mobile App Data
    if test_get_mobile_app_data; then
        print_success "✓ Get Mobile App Data"
    else
        print_error "✗ Get Mobile App Data"
        ((failed_tests++))
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    print_header "Testing Summary"
    print_status "Total Duration: ${duration} seconds"
    print_status "Failed Tests: $failed_tests"
    
    if [ $failed_tests -eq 0 ]; then
        print_success "🎉 All organizer workflow tests passed!"
        print_status "Organizer ID: $ORGANIZER_ID"
        print_status "Event ID: $EVENT_ID"
        print_status "Test Email: $TEST_EMAIL"
    else
        print_error "❌ $failed_tests test(s) failed"
        exit 1
    fi
}

# Main function
main() {
    # Check if API base URL is provided
    if [ -z "$API_BASE_URL" ]; then
        print_error "API_BASE_URL is required"
        echo "Usage: API_BASE_URL='https://your-api-url.com' $0"
        exit 1
    fi
    
    # Remove trailing slash from API base URL
    API_BASE_URL=$(echo "$API_BASE_URL" | sed 's/\/$//')
    
    # Run all tests
    run_all_tests
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi



