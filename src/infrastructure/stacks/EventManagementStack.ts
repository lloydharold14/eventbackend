// Main infrastructure stack for shared resources

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as events from 'aws-cdk-lib/aws-events';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { EnvironmentConfig } from '../config/environments';

export interface EventManagementStackProps extends cdk.StackProps {
  environment: string;
  config: EnvironmentConfig;
  userPool: cognito.IUserPool;
}

export class EventManagementStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly securityGroup: ec2.SecurityGroup;
  public readonly apiGateway: apigateway.RestApi;
  public readonly fileStorageBucket: s3.Bucket;
  public readonly cloudFrontDistribution: cloudfront.Distribution;
  public readonly eventBus: events.EventBus;
  public readonly redisCluster: elasticache.CfnCacheCluster;
  public readonly monitoringTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: EventManagementStackProps) {
    super(scope, id, props);

    const { environment, userPool } = props;
    const resourcePrefix = `${id.toLowerCase()}-${environment}`;

    // 1. VPC Configuration
    this.vpc = new ec2.Vpc(this, 'EventManagementVPC', {
      maxAzs: 2,
      natGateways: 1, // Cost optimization for dev environment
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // 2. Security Group
    this.securityGroup = new ec2.SecurityGroup(this, 'EventManagementSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Event Management Platform',
      allowAllOutbound: true,
    });

    // Allow HTTPS inbound
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS inbound'
    );

    // Allow HTTP inbound (for development)
    if (environment === 'dev') {
      this.securityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(80),
        'Allow HTTP inbound (dev only)'
      );
    }

    // 3. API Gateway
    this.apiGateway = new apigateway.RestApi(this, 'EventManagementAPI', {
      restApiName: `${resourcePrefix}-api`,
      description: 'Event Management Platform API',
      defaultCorsPreflightOptions: {
        allowOrigins: environment === 'prod' 
          ? ['https://yourdomain.com'] 
          : ['http://localhost:3000', 'http://localhost:3001'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        allowCredentials: true,
        maxAge: cdk.Duration.seconds(300),
      },
      deployOptions: {
        stageName: environment,
        loggingLevel: apigateway.MethodLoggingLevel.OFF,
        dataTraceEnabled: false,
        metricsEnabled: true,
        tracingEnabled: true,
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL],
    });

    // 4. S3 Bucket for File Storage
    this.fileStorageBucket = new s3.Bucket(this, 'FileStorageBucket', {
      bucketName: `${resourcePrefix}-files-${this.account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          id: 'DeleteIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
        {
          id: 'TransitionToIA',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
    });

    // 5. CloudFront Distribution
    this.cloudFrontDistribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.fileStorageBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(`${this.apiGateway.restApiId}.execute-api.${this.region}.amazonaws.com`),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableLogging: true,
      logBucket: new s3.Bucket(this, 'CloudFrontLogs', {
        bucketName: `${resourcePrefix}-cloudfront-logs-${this.account}`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
        lifecycleRules: [
          {
            id: 'DeleteOldLogs',
            expiration: cdk.Duration.days(90),
          },
        ],
      }),
    });

    // 6. EventBridge Bus
    this.eventBus = new events.EventBus(this, 'EventManagementEventBus', {
      eventBusName: `${resourcePrefix}-event-bus`,
    });

    // 7. ElastiCache Redis Cluster
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis cluster',
      subnetIds: this.vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    this.redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: environment === 'prod' ? 'cache.t3.micro' : 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      cacheSubnetGroupName: redisSubnetGroup.ref,
      vpcSecurityGroupIds: [this.securityGroup.securityGroupId],
      port: 6379,
      preferredMaintenanceWindow: 'sun:05:00-sun:09:00',
      snapshotRetentionLimit: environment === 'prod' ? 7 : 1,
      snapshotWindow: '03:00-05:00',
    });

    // 8. SNS Topic for Monitoring
    this.monitoringTopic = new sns.Topic(this, 'MonitoringTopic', {
      topicName: `${resourcePrefix}-monitoring`,
      displayName: 'Event Management Platform Monitoring',
    });

    // 9. Health Check Lambda
    const healthCheckLambda = new nodejs.NodejsFunction(this, 'HealthCheckLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/health-check.ts'),
      environment: {
        ENVIRONMENT: environment,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.securityGroup],
    });

    // Notification Lambda Functions
    const sendNotificationLambda = new lambda.Function(this, 'SendNotificationLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'notifications/handlers/notificationHandlers.sendNotification',
      code: lambda.Code.fromAsset('dist/bundled'),
      environment: {
        ENVIRONMENT: environment,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.securityGroup],
    });

    const sendBookingConfirmationLambda = new lambda.Function(this, 'SendBookingConfirmationLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'notifications/handlers/notificationHandlers.sendBookingConfirmation',
      code: lambda.Code.fromAsset('dist/bundled'),
      environment: {
        ENVIRONMENT: environment,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.securityGroup],
    });

    const sendBookingCancellationLambda = new lambda.Function(this, 'SendBookingCancellationLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'notifications/handlers/notificationHandlers.sendBookingCancellation',
      code: lambda.Code.fromAsset('dist/bundled'),
      environment: {
        ENVIRONMENT: environment,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.securityGroup],
    });

    const sendPaymentConfirmationLambda = new lambda.Function(this, 'SendPaymentConfirmationLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'notifications/handlers/notificationHandlers.sendPaymentConfirmation',
      code: lambda.Code.fromAsset('dist/bundled'),
      environment: {
        ENVIRONMENT: environment,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.securityGroup],
    });

    const sendPaymentFailedLambda = new lambda.Function(this, 'SendPaymentFailedLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'notifications/handlers/notificationHandlers.sendPaymentFailed',
      code: lambda.Code.fromAsset('dist/bundled'),
      environment: {
        ENVIRONMENT: environment,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.securityGroup],
    });

    const notificationHealthCheckLambda = new lambda.Function(this, 'NotificationHealthCheckLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'notifications/handlers/notificationHandlers.healthCheck',
      code: lambda.Code.fromAsset('dist/bundled'),
      environment: {
        ENVIRONMENT: environment,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.securityGroup],
    });

    // 10. API Gateway Resources and Methods
    
    // Cognito Authorizer for protected endpoints
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'EventManagementCognitoAuthorizer', {
      cognitoUserPools: [userPool]
    });
    
    const healthResource = this.apiGateway.root.addResource('health');
    const healthIntegration = new apigateway.LambdaIntegration(healthCheckLambda);
    healthResource.addMethod('GET', healthIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
      ],
    });

    // Notification endpoints
    const notificationsResource = this.apiGateway.root.addResource('notifications');
    
    // Send notification
    notificationsResource.addMethod('POST', new apigateway.LambdaIntegration(sendNotificationLambda), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Send booking confirmation
    const bookingConfirmationResource = notificationsResource.addResource('booking-confirmation');
    bookingConfirmationResource.addMethod('POST', new apigateway.LambdaIntegration(sendBookingConfirmationLambda), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Send booking cancellation
    const bookingCancellationResource = notificationsResource.addResource('booking-cancellation');
    bookingCancellationResource.addMethod('POST', new apigateway.LambdaIntegration(sendBookingCancellationLambda), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Send payment confirmation
    const paymentConfirmationResource = notificationsResource.addResource('payment-confirmation');
    paymentConfirmationResource.addMethod('POST', new apigateway.LambdaIntegration(sendPaymentConfirmationLambda), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Send payment failed
    const paymentFailedResource = notificationsResource.addResource('payment-failed');
    paymentFailedResource.addMethod('POST', new apigateway.LambdaIntegration(sendPaymentFailedLambda), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Notification health check
    const notificationHealthResource = notificationsResource.addResource('health');
    notificationHealthResource.addMethod('GET', new apigateway.LambdaIntegration(notificationHealthCheckLambda), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Mobile-optimized unified endpoints
    // Events endpoints (public)
    const eventsResource = this.apiGateway.root.addResource('events');
    eventsResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckLambda), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    const eventResource = eventsResource.addResource('{eventId}');
    eventResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckLambda), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Bookings endpoints (protected)
    const bookingsResource = this.apiGateway.root.addResource('bookings');
    const userBookingsResource = bookingsResource.addResource('user');
    userBookingsResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const eventBookingsResource = bookingsResource.addResource('event').addResource('{eventId}');
    eventBookingsResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const bookingStatisticsResource = bookingsResource.addResource('statistics');
    bookingStatisticsResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Payments endpoints (protected)
    const paymentsResource = this.apiGateway.root.addResource('payments');
    const paymentResource = paymentsResource.addResource('{paymentId}');
    paymentResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // QR Codes endpoints (protected)
    const qrCodesResource = this.apiGateway.root.addResource('qr-codes');
    qrCodesResource.addMethod('POST', new apigateway.LambdaIntegration(healthCheckLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Analytics endpoints (protected)
    const analyticsResource = this.apiGateway.root.addResource('analytics');
    const analyticsConfigResource = analyticsResource.addResource('config');
    analyticsConfigResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // 11. CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'EventManagementDashboard', {
      dashboardName: `EventManagement-${environment}`,
    });

    // API Gateway metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests',
        left: [
          this.apiGateway.metricCount({
            period: cdk.Duration.minutes(5),
            statistic: 'Sum',
          }),
        ],
        right: [
          this.apiGateway.metricLatency({
            period: cdk.Duration.minutes(5),
            statistic: 'Average',
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Errors',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '4XXError',
            dimensionsMap: {
              ApiName: this.apiGateway.restApiName,
            },
            period: cdk.Duration.minutes(5),
            statistic: 'Sum',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '5XXError',
            dimensionsMap: {
              ApiName: this.apiGateway.restApiName,
            },
            period: cdk.Duration.minutes(5),
            statistic: 'Sum',
          }),
        ],
      })
    );

    // S3 metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'S3 Operations',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: 'NumberOfObjects',
            dimensionsMap: {
              BucketName: this.fileStorageBucket.bucketName,
            },
            period: cdk.Duration.hours(1),
            statistic: 'Average',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: 'BucketSizeBytes',
            dimensionsMap: {
              BucketName: this.fileStorageBucket.bucketName,
            },
            period: cdk.Duration.hours(1),
            statistic: 'Average',
          }),
        ],
      })
    );

    // CloudFront metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'CloudFront Requests',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'Requests',
            dimensionsMap: {
              DistributionId: this.cloudFrontDistribution.distributionId,
              Region: 'Global',
            },
            period: cdk.Duration.minutes(5),
            statistic: 'Sum',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'TotalErrorRate',
            dimensionsMap: {
              DistributionId: this.cloudFrontDistribution.distributionId,
              Region: 'Global',
            },
            period: cdk.Duration.minutes(5),
            statistic: 'Average',
          }),
        ],
      })
    );

    // 12. CloudWatch Alarms
    const apiGatewayErrorAlarm = new cloudwatch.Alarm(this, 'ApiGatewayErrorAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiName: this.apiGateway.restApiName,
        },
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: 'API Gateway 5XX errors exceeded threshold',
    });

    const apiGatewayLatencyAlarm = new cloudwatch.Alarm(this, 'ApiGatewayLatencyAlarm', {
      metric: this.apiGateway.metricLatency({
        period: cdk.Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 1000, // 1 second
      evaluationPeriods: 3,
      alarmDescription: 'API Gateway latency exceeded threshold',
    });

    // Add alarm actions
    apiGatewayErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.monitoringTopic));
    apiGatewayLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.monitoringTopic));

    // 13. IAM Roles and Policies
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant permissions to Lambda
    this.fileStorageBucket.grantReadWrite(healthCheckLambda);
    this.eventBus.grantPutEventsTo(healthCheckLambda);

    // 14. Tags
    cdk.Tags.of(this).add('Project', 'EventManagement');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Owner', 'EventTeam');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('CostCenter', 'Engineering');
  }
}
