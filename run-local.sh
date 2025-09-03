#!/bin/bash

# Run local server with AWS services disabled to prevent costs
echo "🚀 Starting local server with AWS services disabled..."
echo "📊 CloudWatch: DISABLED (no metrics sent to AWS)"
echo "🔍 X-Ray: DISABLED (no tracing data sent to AWS)"
echo "💰 No AWS costs will be incurred"
echo ""

# Set environment variables to disable AWS services
export DISABLE_CLOUDWATCH=true
export DISABLE_XRAY=true
export NODE_ENV=development
export ENVIRONMENT=dev
export SERVICE_NAME=organizer-management-service
export ENABLE_TRING=false

# Run the mock API server
npx ts-node src/mock-api-server.ts
