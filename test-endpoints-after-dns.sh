#!/bin/bash

echo "🧪 Testing Multi-Domain Endpoints After DNS Configuration"
echo "=========================================================="
echo ""

# Test Main API
echo "Testing Main API (Authentication & Core Services)"
echo "URL: https://dev-api.event.tkhtech.com/dev/health"
curl -s -w "Status: %{http_code}\n" https://dev-api.event.tkhtech.com/dev/health
echo ""

# Test Events API
echo "Testing Events API"
echo "URL: https://dev-events.event.tkhtech.com/dev/events"
curl -s -w "Status: %{http_code}\n" https://dev-events.event.tkhtech.com/dev/events
echo ""

# Test Bookings API
echo "Testing Bookings API"
echo "URL: https://dev-bookings.event.tkhtech.com/dev/bookings"
curl -s -w "Status: %{http_code}\n" https://dev-bookings.event.tkhtech.com/dev/bookings
echo ""

# Test Payments API
echo "Testing Payments API"
echo "URL: https://dev-payments.event.tkhtech.com/dev/payments"
curl -s -w "Status: %{http_code}\n" https://dev-payments.event.tkhtech.com/dev/payments
echo ""

# Test QR Codes API
echo "Testing QR Codes API"
echo "URL: https://dev-qr.event.tkhtech.com/dev/qr-codes"
curl -s -w "Status: %{http_code}\n" https://dev-qr.event.tkhtech.com/dev/qr-codes
echo ""

# Test Analytics API
echo "Testing Analytics API"
echo "URL: https://dev-analytics.event.tkhtech.com/dev/analytics/health"
curl -s -w "Status: %{http_code}\n" https://dev-analytics.event.tkhtech.com/dev/analytics/health
echo ""

echo "🎉 Testing Complete!"
echo ""
echo "Summary of URLs:"
echo "• Main API: https://dev-api.event.tkhtech.com"
echo "• Events API: https://dev-events.event.tkhtech.com"
echo "• Bookings API: https://dev-bookings.event.tkhtech.com"
echo "• Payments API: https://dev-payments.event.tkhtech.com"
echo "• QR Codes API: https://dev-qr.event.tkhtech.com"
echo "• Analytics API: https://dev-analytics.event.tkhtech.com"
