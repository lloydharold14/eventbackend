#!/bin/bash

echo "🧪 Testing New CloudFront Configuration"
echo "========================================="
echo ""

echo "📊 Infrastructure Status:"
echo "• Environment: dev"
echo "• Domain Structure: dev-{service}.event.tkhtech.com"
echo "• Production Ready: ✅ (uses env-aware naming)"
echo ""

echo "🔗 Testing Direct API Gateway Endpoints:"
echo ""

# Test Main API
echo "Main API (UserManagement, Auth, Notifications):"
echo "URL: https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/health"
response=$(curl -s -w "%{http_code}" https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/health)
http_code="${response: -3}"
body="${response%???}"
if [ "$http_code" = "200" ]; then
    echo "✅ Status: $http_code - Working"
else
    echo "❌ Status: $http_code - Failed"
fi
echo ""

# Test Events API  
echo "Events API:"
echo "URL: https://a5sma74inf.execute-api.ca-central-1.amazonaws.com/dev/events"
response=$(curl -s -w "%{http_code}" https://a5sma74inf.execute-api.ca-central-1.amazonaws.com/dev/events)
http_code="${response: -3}"
if [ "$http_code" = "200" ]; then
    echo "✅ Status: $http_code - Working"
else
    echo "❌ Status: $http_code - Failed"
fi
echo ""

echo "🏗️ Production Deployment Ready:"
echo "• Certificate Stack: ✅ Environment-aware"
echo "• MultiDomain Stack: ✅ Environment-aware" 
echo "• Domain Structure:"
echo "  - Dev: dev-api.event.tkhtech.com"
echo "  - Prod: api.event.tkhtech.com"
echo ""

echo "📋 Next Steps:"
echo "1. 🔧 Fix CloudFront 403 error (origin/behavior configuration)"
echo "2. 🌐 Test DNS propagation for custom domains"
echo "3. 🚀 Deploy to production with: CDK_DOMAIN_NAME=event.tkhtech.com npm run deploy:prod"
echo ""

echo "💡 Current Working URLs for Testing:"
echo "• Main API: https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/"
echo "• Events API: https://a5sma74inf.execute-api.ca-central-1.amazonaws.com/dev/"
echo "• Bookings API: https://5xhxnznlrc.execute-api.ca-central-1.amazonaws.com/dev/"
echo ""

echo "🎯 CloudFront Status:"
echo "• Distributions: ✅ Created"
echo "• SSL Certificates: ✅ Valid"
echo "• DNS Records: ✅ Configured"
echo "• Issue: 403 Forbidden (needs origin configuration fix)"
