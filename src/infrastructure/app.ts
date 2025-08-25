#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EventManagementStack } from './stacks/EventManagementStack';
import { UserManagementStack } from './stacks/UserManagementStack';
import { BookingServiceStack } from './stacks/BookingServiceStack';
import { EventManagementServiceStack } from './stacks/EventManagementServiceStack';
import { PaymentServiceStack } from './stacks/PaymentServiceStack';
import { NotificationServiceStack } from './stacks/NotificationServiceStack';
import { SearchServiceStack } from './stacks/SearchServiceStack';
import { AnalyticsServiceStack } from './stacks/AnalyticsServiceStack';
import { getEnvironmentConfig, validateEnvironmentConfig } from './config/environments';

const app = new cdk.App();

// Get environment from context or default to dev
const environment = app.node.tryGetContext('environment') || 'dev';
const region = app.node.tryGetContext('region') || 'ca-central-1';
const account = app.node.tryGetContext('account') || process.env['CDK_DEFAULT_ACCOUNT'];

// Get and validate environment configuration
const envConfig = getEnvironmentConfig(environment);
validateEnvironmentConfig(envConfig);

console.log(`🚀 Deploying Event Management Platform to ${environment} environment`);
console.log(`📍 Region: ${envConfig.region}`);
console.log(`🏗️  Environment: ${envConfig.name}`);
console.log(`💰 Estimated Cost: ${getEstimatedCost(environment)}/month`);

// Common stack props with environment-specific configuration
const commonProps: cdk.StackProps = {
  env: {
    account,
    region: envConfig.region
  },
  tags: {
    Project: 'EventManagement',
    Environment: environment,
    Owner: 'EventTeam',
    ManagedBy: 'CDK',
    CostCenter: 'EventPlatform',
    DataClassification: 'Internal',
    Compliance: getComplianceTags(envConfig)
  }
};

// Main infrastructure stack (shared resources)
const eventManagementStack = new EventManagementStack(app, `EventManagement-${environment}`, {
  ...commonProps,
  environment,
  description: 'Event Management Platform - Shared Infrastructure',
  config: envConfig
});

// User Management Service Stack
const userManagementStack = new UserManagementStack(app, `UserManagement-${environment}`, {
  ...commonProps,
  environment,
  description: 'User Management Service - Authentication and User Management',
  vpc: eventManagementStack.vpc,
  securityGroup: eventManagementStack.securityGroup,
  apiGateway: eventManagementStack.apiGateway,
  config: envConfig
});

// Event Management Service Stack
const eventManagementServiceStack = new EventManagementServiceStack(app, `EventManagementService-${environment}`, {
  ...commonProps,
  environment,
  description: 'Event Management Service - Event CRUD, Categories, and Media Management',
  config: envConfig
});

// Booking Service Stack
const bookingServiceStack = new BookingServiceStack(app, `BookingService-${environment}`, {
  ...commonProps,
  environment,
  description: 'Booking Service - Ticket Reservations and Management',
  config: envConfig
});

// Payment Service Stack
const paymentServiceStack = new PaymentServiceStack(app, `PaymentService-${environment}`, {
  ...commonProps,
  environment,
  description: 'Payment Service - Payment Processing and Stripe Integration',
  vpc: eventManagementStack.vpc,
  securityGroup: eventManagementStack.securityGroup,
  userPool: userManagementStack.userPool,
  bookingTable: bookingServiceStack.bookingTable,
  config: envConfig
});

// Notification Service Stack
const notificationServiceStack = new NotificationServiceStack(app, `NotificationService-${environment}`, {
  ...commonProps,
  environment,
  description: 'Notification Service - Email, SMS, and Push Notifications',
  vpc: eventManagementStack.vpc,
  securityGroup: eventManagementStack.securityGroup,
  userPool: userManagementStack.userPool,
  config: envConfig
});

// Search Service Stack (disabled for dev environment due to OpenSearch limitations)
let searchServiceStack: SearchServiceStack | undefined;
if (environment !== 'dev') {
  searchServiceStack = new SearchServiceStack(app, `SearchService-${environment}`, {
    ...commonProps,
    environment,
    description: 'Search Service - OpenSearch Integration for Event Discovery',
    vpc: eventManagementStack.vpc,
    securityGroup: eventManagementStack.securityGroup,
    userPool: userManagementStack.userPool,
    eventTable: eventManagementServiceStack.eventTable,
    config: envConfig
  });
}

// Analytics Service Stack
const analyticsServiceStack = new AnalyticsServiceStack(app, `AnalyticsService-${environment}`, {
  ...commonProps,
  environment,
  description: 'Analytics Service - Business Intelligence and Reporting',
  vpc: eventManagementStack.vpc,
  securityGroup: eventManagementStack.securityGroup,
  userPool: userManagementStack.userPool,
  eventTable: eventManagementServiceStack.eventTable,
  bookingTable: bookingServiceStack.bookingTable,
  paymentTable: paymentServiceStack.paymentTable,
  userTable: userManagementStack.userTable,
  notificationTable: notificationServiceStack.notificationTable,
  config: envConfig
});

// Stack dependencies
analyticsServiceStack.addDependency(userManagementStack);
analyticsServiceStack.addDependency(eventManagementServiceStack);
analyticsServiceStack.addDependency(bookingServiceStack);
analyticsServiceStack.addDependency(paymentServiceStack);
analyticsServiceStack.addDependency(notificationServiceStack);

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

// Output the OpenSearch domain endpoint (only for non-dev environments)
if (searchServiceStack) {
  new cdk.CfnOutput(searchServiceStack, 'OpenSearchEndpoint', {
    value: searchServiceStack.openSearchDomain.domainEndpoint,
    description: 'OpenSearch Domain Endpoint',
    exportName: `EventManagement-${environment}-OpenSearchEndpoint`
  });
}

// Output the ElastiCache Redis endpoint
new cdk.CfnOutput(eventManagementStack, 'RedisEndpoint', {
  value: eventManagementStack.redisCluster.attrRedisEndpointAddress,
  description: 'ElastiCache Redis Endpoint',
  exportName: `EventManagement-${environment}-RedisEndpoint`
});

// Note: Individual service stacks create their own outputs for table names and API URLs

// Output the Stripe webhook endpoint
new cdk.CfnOutput(paymentServiceStack, 'StripeWebhookEndpoint', {
  value: `${eventManagementStack.apiGateway.url}/webhooks/stripe`,
  description: 'Stripe Webhook Endpoint',
  exportName: `EventManagement-${environment}-StripeWebhookEndpoint`
});

// Output the health check endpoint
new cdk.CfnOutput(eventManagementStack, 'HealthCheckEndpoint', {
  value: `${eventManagementStack.apiGateway.url}/health`,
  description: 'Health Check Endpoint',
  exportName: `EventManagement-${environment}-HealthCheckEndpoint`
});

// Output the monitoring dashboard URL
new cdk.CfnOutput(analyticsServiceStack, 'MonitoringDashboardUrl', {
  value: `https://${envConfig.region}.console.aws.amazon.com/cloudwatch/home?region=${envConfig.region}#dashboards:name=EventManagement-${environment}`,
  description: 'CloudWatch Monitoring Dashboard URL',
  exportName: `EventManagement-${environment}-MonitoringDashboardUrl`
});

// Output the X-Ray tracing URL
new cdk.CfnOutput(eventManagementStack, 'XRayTracingUrl', {
  value: `https://${envConfig.region}.console.aws.amazon.com/xray/home?region=${envConfig.region}#/traces`,
  description: 'X-Ray Tracing URL',
  exportName: `EventManagement-${environment}-XRayTracingUrl`
});

// Output environment-specific information
new cdk.CfnOutput(eventManagementStack, 'EnvironmentInfo', {
  value: JSON.stringify({
    environment: environment,
    region: envConfig.region,
    compliance: envConfig.compliance,
    security: {
      waf: envConfig.security.enableWaf,
      shield: envConfig.security.enableShield,
      guardDuty: envConfig.security.enableGuardDuty,
      cloudTrail: envConfig.security.enableCloudTrail
    },
    monitoring: {
      xray: envConfig.monitoring.enableXRay,
      cloudWatch: envConfig.monitoring.enableCloudWatchLogs,
      customMetrics: envConfig.monitoring.enableCustomMetrics,
      alarms: envConfig.monitoring.enableAlarms
    },
    scaling: {
      autoScaling: envConfig.scaling.autoScaling,
      minCapacity: envConfig.scaling.minCapacity,
      maxCapacity: envConfig.scaling.maxCapacity
    }
  }, null, 2),
  description: 'Environment Configuration Information',
  exportName: `EventManagement-${environment}-EnvironmentInfo`
});

// Output the cost estimation
new cdk.CfnOutput(eventManagementStack, 'EstimatedMonthlyCost', {
  value: getEstimatedCost(environment),
  description: 'Estimated Monthly Cost',
  exportName: `EventManagement-${environment}-EstimatedMonthlyCost`
});

// Output the deployment instructions
new cdk.CfnOutput(eventManagementStack, 'DeploymentInstructions', {
  value: `Deployment completed! Env: ${environment}, Region: ${envConfig.region}. Next: Configure Stripe webhook at ${eventManagementStack.apiGateway.url}/webhooks/stripe, set up env vars, test endpoints. Health: ${eventManagementStack.apiGateway.url}/health. Cost: ${getEstimatedCost(environment)}`,
  description: 'Deployment Instructions',
  exportName: `EventManagement-${environment}-DeploymentInstructions`
});

// Helper functions
function getEstimatedCost(environment: string): string {
  switch (environment) {
    case 'dev':
      return '~$200-400/month';
    case 'staging':
      return '~$500-800/month';
    case 'prod':
      return '~$1000-2000/month';
    default:
      return '~$500-1000/month';
  }
}

function getComplianceTags(envConfig: any): string {
  const compliance = [];
  if (envConfig.compliance.gdprCompliance) compliance.push('GDPR');
  if (envConfig.compliance.pipedaCompliance) compliance.push('PIPEDA');
  if (envConfig.compliance.ccpaCompliance) compliance.push('CCPA');
  if (envConfig.compliance.waemuCompliance) compliance.push('WAEMU');
  
  return compliance.length > 0 ? compliance.join(',') : 'None';
}

app.synth();
