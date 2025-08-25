#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EventManagementStack } from './stacks/EventManagementStack';
import { UserManagementStack } from './stacks/UserManagementStack';
import { BookingServiceStack } from './stacks/BookingServiceStack';
import { EventManagementServiceStack } from './stacks/EventManagementServiceStack';
import { PaymentServiceStack } from './stacks/PaymentServiceStack';
import { NotificationServiceStack } from './stacks/NotificationServiceStack';
// import { SearchServiceStack } from './stacks/SearchServiceStack';
// import { AnalyticsServiceStack } from './stacks/AnalyticsServiceStack';

const app = new cdk.App();

// Environment configuration
const environment = app.node.tryGetContext('environment') || 'dev';
const region = app.node.tryGetContext('region') || 'ca-central-1';
const account = app.node.tryGetContext('account') || process.env['CDK_DEFAULT_ACCOUNT'];

// Common stack props
const commonProps: cdk.StackProps = {
  env: {
    account,
    region
  },
  tags: {
    Project: 'EventManagement',
    Environment: environment,
    Owner: 'EventTeam',
    ManagedBy: 'CDK'
  }
};

// Main infrastructure stack (shared resources)
const eventManagementStack = new EventManagementStack(app, `EventManagement-${environment}`, {
  ...commonProps,
  environment,
  description: 'Event Management Platform - Shared Infrastructure'
});

  // User Management Service Stack
  const userManagementStack = new UserManagementStack(app, `UserManagement-${environment}`, {
    ...commonProps,
    environment,
    description: 'User Management Service - Authentication and User Management',
    vpc: eventManagementStack.vpc,
    securityGroup: eventManagementStack.securityGroup,
    apiGateway: eventManagementStack.apiGateway
  });

  // Event Management Service Stack
  const eventManagementServiceStack = new EventManagementServiceStack(app, `EventManagementService-${environment}`, {
    ...commonProps,
    environment,
    description: 'Event Management Service - Event CRUD, Categories, and Media Management'
  });

// Booking Service Stack
const bookingServiceStack = new BookingServiceStack(app, `BookingService-${environment}`, {
  ...commonProps,
  environment,
  description: 'Booking Service - Ticket Reservations and Management'
});

// Payment Service Stack
const paymentServiceStack = new PaymentServiceStack(app, `PaymentService-${environment}`, {
  ...commonProps,
  environment,
  description: 'Payment Service - Payment Processing and Stripe Integration',
  vpc: eventManagementStack.vpc,
  securityGroup: eventManagementStack.securityGroup,
  userPool: userManagementStack.userPool,
  bookingTable: bookingServiceStack.bookingTable
});

// Notification Service Stack
const notificationServiceStack = new NotificationServiceStack(app, `NotificationService-${environment}`, {
  ...commonProps,
  environment,
  description: 'Notification Service - Email, SMS, and Push Notifications',
  vpc: eventManagementStack.vpc,
  securityGroup: eventManagementStack.securityGroup,
  userPool: userManagementStack.userPool
});

// Search Service Stack - TODO: Implement full functionality
// const searchServiceStack = new SearchServiceStack(app, `SearchService-${environment}`, {
//   ...commonProps,
//   environment,
//   description: 'Search Service - Event Discovery and Search',
//   vpc: eventManagementStack.vpc,
//   securityGroup: eventManagementStack.securityGroup,
//   userPool: userManagementStack.userPool,
//   eventTable: eventManagementServiceStack.eventTable
// });

// Analytics Service Stack - TODO: Implement full functionality
// const analyticsServiceStack = new AnalyticsServiceStack(app, `AnalyticsService-${environment}`, {
//   ...commonProps,
//   environment,
//   description: 'Analytics Service - Business Intelligence and Reporting',
//   vpc: eventManagementStack.vpc,
//   securityGroup: eventManagementStack.securityGroup,
//   userPool: userManagementStack.userPool
// });

// Stack dependencies - TODO: Add back when circular dependencies are resolved
// eventManagementServiceStack.addDependency(userManagementStack);
// TODO: Uncomment when other services are implemented
// bookingServiceStack.addDependency(eventManagementServiceStack);
// paymentServiceStack.addDependency(bookingServiceStack);
// notificationServiceStack.addDependency(userManagementStack);
// searchServiceStack.addDependency(eventManagementServiceStack);
// analyticsServiceStack.addDependency(userManagementStack);

// Output the API Gateway URL
new cdk.CfnOutput(eventManagementStack, 'ApiGatewayUrl', {
  value: eventManagementStack.apiGateway.url,
  description: 'API Gateway URL',
  exportName: `EventManagement-${environment}-ApiGatewayUrl`
});

// Output the Cognito User Pool ID
new cdk.CfnOutput(userManagementStack, 'UserPoolId', {
  value: userManagementStack.userPool.userPoolId,
  description: 'Cognito User Pool ID',
  exportName: `EventManagement-${environment}-UserPoolId`
});

// Output the Cognito User Pool Client ID
new cdk.CfnOutput(userManagementStack, 'UserPoolClientId', {
  value: userManagementStack.userPoolClient.userPoolClientId,
  description: 'Cognito User Pool Client ID',
  exportName: `EventManagement-${environment}-UserPoolClientId`
});

// Output the S3 bucket name for file uploads
new cdk.CfnOutput(eventManagementStack, 'FileStorageBucketOutput', {
  value: eventManagementStack.fileStorageBucket.bucketName,
  description: 'S3 Bucket for file storage',
  exportName: `EventManagement-${environment}-FileStorageBucket`
});

// Output the CloudFront distribution URL
new cdk.CfnOutput(eventManagementStack, 'CloudFrontUrl', {
  value: eventManagementStack.cloudFrontDistribution.distributionDomainName,
  description: 'CloudFront Distribution URL',
  exportName: `EventManagement-${environment}-CloudFrontUrl`
});

// Output the EventBridge bus ARN
new cdk.CfnOutput(eventManagementStack, 'EventBusArn', {
  value: eventManagementStack.eventBus.eventBusArn,
  description: 'EventBridge Bus ARN',
  exportName: `EventManagement-${environment}-EventBusArn`
});

// Output the OpenSearch domain endpoint - TODO: Uncomment when SearchService is implemented
// new cdk.CfnOutput(searchServiceStack, 'OpenSearchEndpoint', {
//   value: searchServiceStack.openSearchDomain.domainEndpoint,
//   description: 'OpenSearch Domain Endpoint',
//   exportName: `EventManagement-${environment}-OpenSearchEndpoint`
// });

// Output the ElastiCache Redis endpoint
new cdk.CfnOutput(eventManagementStack, 'RedisEndpoint', {
  value: eventManagementStack.redisCluster.attrRedisEndpointAddress,
  description: 'ElastiCache Redis Endpoint',
  exportName: `EventManagement-${environment}-RedisEndpoint`
});

// Output the DynamoDB table names - TODO: Uncomment when BookingService is implemented
// new cdk.CfnOutput(bookingServiceStack, 'BookingTableName', {
//   value: bookingServiceStack.bookingTable.tableName,
//   description: 'Booking Service DynamoDB Table Name',
//   exportName: `EventManagement-${environment}-BookingTableName`
// });

new cdk.CfnOutput(userManagementStack, 'UserTableName', {
  value: userManagementStack.userTable.tableName,
  description: 'User Management DynamoDB Table Name',
  exportName: `EventManagement-${environment}-UserTableName`
});

// Output the Stripe webhook endpoint - TODO: Uncomment when PaymentService is implemented
// new cdk.CfnOutput(paymentServiceStack, 'StripeWebhookEndpoint', {
//   value: `${eventManagementStack.apiGateway.url}/webhooks/stripe`,
//   description: 'Stripe Webhook Endpoint',
//   exportName: `EventManagement-${environment}-StripeWebhookEndpoint`
// });

// Output the health check endpoint
new cdk.CfnOutput(eventManagementStack, 'HealthCheckEndpoint', {
  value: `${eventManagementStack.apiGateway.url}/health`,
  description: 'Health Check Endpoint',
  exportName: `EventManagement-${environment}-HealthCheckEndpoint`
});

// Output the monitoring dashboard URL - TODO: Uncomment when AnalyticsService is implemented
// new cdk.CfnOutput(analyticsServiceStack, 'MonitoringDashboardUrl', {
//   value: `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=EventManagement-${environment}`,
//   description: 'CloudWatch Monitoring Dashboard URL',
//   exportName: `EventManagement-${environment}-MonitoringDashboardUrl`
// });

// Output the X-Ray tracing URL
new cdk.CfnOutput(eventManagementStack, 'XRayTracingUrl', {
  value: `https://${region}.console.aws.amazon.com/xray/home?region=${region}#/traces`,
  description: 'X-Ray Tracing URL',
  exportName: `EventManagement-${environment}-XRayTracingUrl`
});

// Output the cost estimation
new cdk.CfnOutput(eventManagementStack, 'EstimatedMonthlyCost', {
  value: '~$500-1000/month (varies by usage)',
  description: 'Estimated Monthly Cost',
  exportName: `EventManagement-${environment}-EstimatedMonthlyCost`
});

// Output the deployment instructions
new cdk.CfnOutput(eventManagementStack, 'DeploymentInstructions', {
  value: `
    Deployment completed successfully!
    
    Next steps:
    1. Configure Stripe webhook endpoint: ${eventManagementStack.apiGateway.url}/webhooks/stripe
    2. Set up environment variables in AWS Systems Manager Parameter Store
    3. Configure custom domain in API Gateway (optional)
    4. Set up monitoring alerts in CloudWatch
    5. Configure backup and disaster recovery procedures
    
    API Documentation: ${eventManagementStack.apiGateway.url}/docs
    Health Check: ${eventManagementStack.apiGateway.url}/health
    Monitoring Dashboard: https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=EventManagement-${environment}
  `,
  description: 'Deployment Instructions',
  exportName: `EventManagement-${environment}-DeploymentInstructions`
});

app.synth();
