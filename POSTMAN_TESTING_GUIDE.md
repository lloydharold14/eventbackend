# 🚀 Event Management Platform - Postman Testing Guide

## 📋 Overview

This guide will help you test the Event Management Platform API using Postman. The platform is successfully deployed to the dev environment and ready for testing.

## 🔗 API Endpoints

**Base URL:** `https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev`

**Health Check:** `https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/health`

## 📦 Postman Collection

I've created a comprehensive Postman collection for you: `postman-collection.json`

### How to Import:
1. Open Postman
2. Click "Import" 
3. Select the `postman-collection.json` file
4. The collection will be imported with all endpoints and test data

## 🧪 Testing Strategy

### Phase 1: Basic Infrastructure Testing ✅
- **Health Check** - Verify API is running
- **API Gateway** - Confirm endpoints are accessible

### Phase 2: Core Services Testing (Current Status)
- **User Management** - Registration, login, profile management
- **Event Management** - Create, read, update events
- **Booking System** - Create and manage bookings
- **Payment Processing** - Process payments and refunds
- **Analytics** - View platform analytics
- **Notifications** - Send and manage notifications

## 🔧 Current Status

### ✅ Working Endpoints:
- **Health Check**: `GET /health` - Returns 200 with service status
- **API Gateway**: All endpoints are properly configured

### ⚠️ Known Issues:
- **Lambda Dependencies**: Some Lambda functions need dependency bundling
- **User Registration**: Currently failing due to missing `uuid` module in Lambda bundle

## 🛠️ Quick Fixes Needed

The main issue is that Lambda functions need proper dependency bundling. Here are the options:

### Option 1: Use Lambda Layers (Recommended)
```bash
# Create a Lambda layer with dependencies
npm install --production
zip -r lambda-layer.zip node_modules/
```

### Option 2: Bundle Dependencies with esbuild
```bash
# Install esbuild
npm install --save-dev esbuild

# Bundle the Lambda function
npx esbuild src/domains/users/handlers/userHandlers.ts --bundle --platform=node --target=node18 --outfile=dist/bundled/userHandlers.js
```

### Option 3: Use CDK Lambda Bundling
Update the CDK stack to use proper bundling:
```typescript
code: lambda.Code.fromAsset('src', {
  bundling: {
    image: lambda.Runtime.NODEJS_18_X.bundlingImage,
    command: [
      'bash', '-c',
      'npm install && npx esbuild index.ts --bundle --platform=node --target=node18 --outfile=/asset-output/index.js'
    ],
  },
}),
```

## 📊 Testing Results

### ✅ Successful Tests:
1. **Health Check**: `GET /health`
   - Status: 200 OK
   - Response: Service status and environment info
   - Performance: ~400ms response time

### ❌ Failed Tests:
1. **User Registration**: `POST /auth/register`
   - Status: 502 Bad Gateway
   - Issue: Missing `uuid` dependency in Lambda bundle
   - Fix: Implement proper dependency bundling

## 🎯 Next Steps

### Immediate Actions:
1. **Import Postman Collection**: Use the provided `postman-collection.json`
2. **Test Health Check**: Verify the API is accessible
3. **Fix Lambda Bundling**: Implement proper dependency management

### Testing Workflow:
1. **Start with Health Check**: Always test this first
2. **Test Public Endpoints**: Events listing, search
3. **Test Authentication**: Once Lambda bundling is fixed
4. **Test Full Workflow**: Registration → Login → Create Event → Book → Pay

## 🔍 Manual Testing Commands

### Health Check:
```bash
curl -s 'https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/health' | jq .
```

### API Gateway Resources:
```bash
aws apigateway get-resources --rest-api-id r2nbmrglq6 --region ca-central-1
```

### Lambda Logs:
```bash
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/UserManagement-dev" --region ca-central-1
```

## 📈 Performance Metrics

- **API Gateway**: Regional endpoint in ca-central-1
- **Lambda Functions**: 512MB memory, 30s timeout
- **DynamoDB**: Pay-per-request billing
- **CloudWatch**: Logging and monitoring enabled
- **X-Ray**: Distributed tracing enabled

## 🛡️ Security Features

- **CORS**: Configured for cross-origin requests
- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control
- **Input Validation**: JSON schema validation
- **Rate Limiting**: API Gateway throttling

## 💰 Cost Estimation

- **API Gateway**: ~$3.50/month for 1M requests
- **Lambda**: ~$0.20/month for current usage
- **DynamoDB**: ~$1.00/month for storage and requests
- **CloudWatch**: ~$0.50/month for logs
- **Total**: ~$5-10/month for dev environment

## 🚨 Troubleshooting

### Common Issues:
1. **502 Bad Gateway**: Lambda function error - check CloudWatch logs
2. **403 Forbidden**: API Gateway configuration issue
3. **500 Internal Server Error**: Application logic error
4. **Timeout**: Lambda function taking too long

### Debug Commands:
```bash
# Check Lambda logs
aws logs tail /aws/lambda/UserManagement-dev-dev-register-user --follow --region ca-central-1

# Test API Gateway
aws apigateway test-invoke-method --rest-api-id r2nbmrglq6 --resource-id x2379t --http-method GET --region ca-central-1

# Check CloudFormation status
aws cloudformation describe-stacks --stack-name EventManagement-dev --region ca-central-1
```

## 📞 Support

If you encounter issues:
1. Check CloudWatch logs first
2. Verify API Gateway configuration
3. Test with curl commands
4. Review Lambda function code

---

**🎉 Congratulations!** Your Event Management Platform is successfully deployed and the infrastructure is working correctly. The main remaining task is to fix the Lambda dependency bundling to enable full functionality testing.
