import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface MobileServiceStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  userPool: cognito.IUserPool;
  eventTable: dynamodb.ITable;
  bookingTable: dynamodb.ITable;
  paymentTable: dynamodb.ITable;
  userTable: dynamodb.ITable;
  notificationTable: dynamodb.ITable;
  analyticsTable: dynamodb.ITable;
}

export class MobileServiceStack extends cdk.Stack {
  public readonly mobileTable: dynamodb.Table;
  public readonly mobileLambdaRole: iam.Role;
  public readonly mobileLambdaFunctions: { [key: string]: lambda.Function };
  public readonly mobileApiGateway: apigateway.RestApi;
  public readonly pushNotificationTopic: sns.Topic;
  public readonly mobileAnalyticsBucket: s3.Bucket;
  public readonly mobileQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: MobileServiceStackProps) {
    super(scope, id, props);

    const { environment, vpc, securityGroup, userPool, eventTable, bookingTable, paymentTable, userTable, notificationTable, analyticsTable } = props;
    const resourcePrefix = `${id}-${environment}`;

    // DynamoDB Table for Mobile Data
    this.mobileTable = new dynamodb.Table(this, 'MobileTable', {
      tableName: `${resourcePrefix}-mobile`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: environment === 'prod',
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
    });

    // Add GSIs for mobile-specific queries
    this.mobileTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'GSI1SK',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    this.mobileTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: {
        name: 'GSI2PK',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'GSI2SK',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    this.mobileTable.addGlobalSecondaryIndex({
      indexName: 'GSI3',
      partitionKey: {
        name: 'GSI3PK',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'GSI3SK',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // S3 Bucket for Mobile Analytics
    this.mobileAnalyticsBucket = new s3.Bucket(this, 'MobileAnalyticsBucket', {
      bucketName: `${resourcePrefix}-mobile-analytics`,
      versioned: environment === 'prod',
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          id: 'AnalyticsLifecycle',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30)
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90)
            }
          ],
          expiration: cdk.Duration.days(365)
        }
      ]
    });

    // SNS Topic for Push Notifications
    this.pushNotificationTopic = new sns.Topic(this, 'PushNotificationTopic', {
      topicName: `${resourcePrefix}-push-notifications`,
      displayName: 'Mobile Push Notifications',
      fifo: false
    });

    // SQS Queue for Mobile Offline Sync
    this.mobileQueue = new sqs.Queue(this, 'MobileQueue', {
      queueName: `${resourcePrefix}-mobile-sync`,
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(14),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'MobileDLQ', {
          queueName: `${resourcePrefix}-mobile-sync-dlq`,
          retentionPeriod: cdk.Duration.days(14)
        }),
        maxReceiveCount: 3
      }
    });

    // IAM Role for Lambda Functions
    this.mobileLambdaRole = new iam.Role(this, 'MobileLambdaRole', {
      roleName: `${resourcePrefix}-mobile-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ]
    });

    // Add permissions for DynamoDB tables
    this.mobileTable.grantReadWriteData(this.mobileLambdaRole);
    eventTable.grantReadData(this.mobileLambdaRole);
    bookingTable.grantReadData(this.mobileLambdaRole);
    paymentTable.grantReadData(this.mobileLambdaRole);
    userTable.grantReadData(this.mobileLambdaRole);
    notificationTable.grantReadWriteData(this.mobileLambdaRole);
    analyticsTable.grantReadData(this.mobileLambdaRole);

    // Add permissions for S3
    this.mobileAnalyticsBucket.grantReadWrite(this.mobileLambdaRole);

    // Add permissions for SNS
    this.pushNotificationTopic.grantPublish(this.mobileLambdaRole);

    // Add permissions for SQS
    this.mobileQueue.grantSendMessages(this.mobileLambdaRole);
    this.mobileQueue.grantConsumeMessages(this.mobileLambdaRole);

    // Lambda configuration
    const lambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist'),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [securityGroup],
      role: this.mobileLambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        MOBILE_TABLE_NAME: this.mobileTable.tableName,
        EVENT_TABLE_NAME: eventTable.tableName,
        BOOKING_TABLE_NAME: bookingTable.tableName,
        PAYMENT_TABLE_NAME: paymentTable.tableName,
        USER_TABLE_NAME: userTable.tableName,
        NOTIFICATION_TABLE_NAME: notificationTable.tableName,
        ANALYTICS_TABLE_NAME: analyticsTable.tableName,
        MOBILE_ANALYTICS_BUCKET: this.mobileAnalyticsBucket.bucketName,
        PUSH_NOTIFICATION_TOPIC_ARN: this.pushNotificationTopic.topicArn,
        MOBILE_QUEUE_URL: this.mobileQueue.queueUrl,
        ENABLE_TRACING: 'true',
        ENABLE_METRICS: 'true',
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG'
      },
      logRetention: logs.RetentionDays.ONE_MONTH
    };

    // Initialize Lambda functions object
    this.mobileLambdaFunctions = {};

    // Mobile Data Sync Lambda
    this.mobileLambdaFunctions.syncData = new lambda.Function(this, 'MobileSyncDataFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-sync-data`,
      handler: 'domains/mobile/handlers/mobileHandlers.syncData',
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024
    });

    // Register Push Token Lambda
    this.mobileLambdaFunctions.registerPushToken = new lambda.Function(this, 'RegisterPushTokenFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-register-push-token`,
      handler: 'domains/mobile/handlers/mobileHandlers.registerPushToken'
    });

    // Send Push Notification Lambda
    this.mobileLambdaFunctions.sendPushNotification = new lambda.Function(this, 'SendPushNotificationFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-send-push-notification`,
      handler: 'domains/mobile/handlers/mobileHandlers.sendPushNotification'
    });

    // Get Mobile Events Lambda
    this.mobileLambdaFunctions.getMobileEvents = new lambda.Function(this, 'GetMobileEventsFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-mobile-events`,
      handler: 'domains/mobile/handlers/mobileHandlers.getMobileEvents'
    });

    // Get Mobile User Lambda
    this.mobileLambdaFunctions.getMobileUser = new lambda.Function(this, 'GetMobileUserFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-mobile-user`,
      handler: 'domains/mobile/handlers/mobileHandlers.getMobileUser'
    });

    // Get Mobile Bookings Lambda
    this.mobileLambdaFunctions.getMobileBookings = new lambda.Function(this, 'GetMobileBookingsFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-mobile-bookings`,
      handler: 'domains/mobile/handlers/mobileHandlers.getMobileBookings'
    });

    // Get Mobile Payments Lambda
    this.mobileLambdaFunctions.getMobilePayments = new lambda.Function(this, 'GetMobilePaymentsFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-mobile-payments`,
      handler: 'domains/mobile/handlers/mobileHandlers.getMobilePayments'
    });

    // Mobile Search Lambda
    this.mobileLambdaFunctions.searchEventsMobile = new lambda.Function(this, 'SearchEventsMobileFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-search-events-mobile`,
      handler: 'domains/mobile/handlers/mobileHandlers.searchEventsMobile',
      timeout: cdk.Duration.seconds(45)
    });

    // Get Nearby Events Lambda
    this.mobileLambdaFunctions.getNearbyEvents = new lambda.Function(this, 'GetNearbyEventsFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-nearby-events`,
      handler: 'domains/mobile/handlers/mobileHandlers.getNearbyEvents',
      timeout: cdk.Duration.seconds(45)
    });

    // Record Analytics Lambda
    this.mobileLambdaFunctions.recordAnalytics = new lambda.Function(this, 'RecordAnalyticsFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-record-analytics`,
      handler: 'domains/mobile/handlers/mobileHandlers.recordAnalytics',
      timeout: cdk.Duration.seconds(30)
    });

    // Mobile Health Check Lambda
    this.mobileLambdaFunctions.mobileHealthCheck = new lambda.Function(this, 'MobileHealthCheckFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-mobile-health-check`,
      handler: 'domains/mobile/handlers/mobileHandlers.mobileHealthCheck',
      timeout: cdk.Duration.seconds(15)
    });

    // API Gateway
    this.mobileApiGateway = new apigateway.RestApi(this, 'MobileApiGateway', {
      restApiName: `${resourcePrefix}-mobile-api`,
      description: 'Mobile API Gateway for Compose Multiplatform integration',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'Accept-Language',
          'X-User-Currency',
          'X-User-Region',
          'X-User-Timezone',
          'X-Device-ID',
          'X-Platform',
          'X-App-Version'
        ]
      },
      deployOptions: {
        stageName: environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
        metricsEnabled: true
      }
    });

    // Add Cognito Authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'MobileCognitoAuthorizer', {
      cognitoUserPools: [userPool]
    });

    // Create API Gateway resources and methods
    const mobileResource = this.mobileApiGateway.root.addResource('mobile');

    // Sync endpoint
    mobileResource.addResource('sync').addMethod('POST', new apigateway.LambdaIntegration(this.mobileLambdaFunctions.syncData), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // Push notification endpoints
    mobileResource.addResource('push-token').addMethod('POST', new apigateway.LambdaIntegration(this.mobileLambdaFunctions.registerPushToken), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    mobileResource.addResource('push-notification').addMethod('POST', new apigateway.LambdaIntegration(this.mobileLambdaFunctions.sendPushNotification), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // Mobile data endpoints
    mobileResource.addResource('events').addMethod('GET', new apigateway.LambdaIntegration(this.mobileLambdaFunctions.getMobileEvents));

    mobileResource.addResource('user').addMethod('GET', new apigateway.LambdaIntegration(this.mobileLambdaFunctions.getMobileUser), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    mobileResource.addResource('bookings').addMethod('GET', new apigateway.LambdaIntegration(this.mobileLambdaFunctions.getMobileBookings), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    mobileResource.addResource('payments').addMethod('GET', new apigateway.LambdaIntegration(this.mobileLambdaFunctions.getMobilePayments), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // Search and location endpoints
    mobileResource.addResource('search').addMethod('POST', new apigateway.LambdaIntegration(this.mobileLambdaFunctions.searchEventsMobile));

    mobileResource.addResource('nearby').addMethod('POST', new apigateway.LambdaIntegration(this.mobileLambdaFunctions.getNearbyEvents));

    // Analytics endpoint
    mobileResource.addResource('analytics').addMethod('POST', new apigateway.LambdaIntegration(this.mobileLambdaFunctions.recordAnalytics));

    // Health check endpoint
    mobileResource.addResource('health').addMethod('GET', new apigateway.LambdaIntegration(this.mobileLambdaFunctions.mobileHealthCheck));

    // CloudWatch Dashboard for Mobile Service
    const mobileDashboard = new cloudwatch.Dashboard(this, 'MobileDashboard', {
      dashboardName: `${resourcePrefix}-mobile-dashboard`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Mobile API Requests',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/ApiGateway',
                metricName: 'Count',
                dimensionsMap: {
                  ApiName: this.mobileApiGateway.restApiName,
                  Stage: environment
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
              })
            ]
          }),
          new cloudwatch.GraphWidget({
            title: 'Mobile API Latency',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/ApiGateway',
                metricName: 'Latency',
                dimensionsMap: {
                  ApiName: this.mobileApiGateway.restApiName,
                  Stage: environment
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
              })
            ]
          })
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Mobile Lambda Invocations',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Invocations',
                dimensionsMap: {
                  FunctionName: this.mobileLambdaFunctions.syncData.functionName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
              })
            ]
          }),
          new cloudwatch.GraphWidget({
            title: 'Mobile Lambda Errors',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Errors',
                dimensionsMap: {
                  FunctionName: this.mobileLambdaFunctions.syncData.functionName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
              })
            ]
          })
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Push Notifications Sent',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/SNS',
                metricName: 'NumberOfMessagesPublished',
                dimensionsMap: {
                  TopicName: this.pushNotificationTopic.topicName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
              })
            ]
          }),
          new cloudwatch.GraphWidget({
            title: 'Mobile Sync Queue Depth',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/SQS',
                metricName: 'ApproximateNumberOfMessagesVisible',
                dimensionsMap: {
                  QueueName: this.mobileQueue.queueName
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
              })
            ]
          })
        ]
      ]
    });

    // Outputs
    new cdk.CfnOutput(this, 'MobileApiGatewayUrl', {
      value: this.mobileApiGateway.url,
      description: 'Mobile API Gateway URL',
      exportName: `${resourcePrefix}-MobileApiGatewayUrl`
    });

    new cdk.CfnOutput(this, 'MobileTableName', {
      value: this.mobileTable.tableName,
      description: 'Mobile DynamoDB Table Name',
      exportName: `${resourcePrefix}-MobileTableName`
    });

    new cdk.CfnOutput(this, 'PushNotificationTopicArn', {
      value: this.pushNotificationTopic.topicArn,
      description: 'Push Notification SNS Topic ARN',
      exportName: `${resourcePrefix}-PushNotificationTopicArn`
    });

    new cdk.CfnOutput(this, 'MobileAnalyticsBucketName', {
      value: this.mobileAnalyticsBucket.bucketName,
      description: 'Mobile Analytics S3 Bucket Name',
      exportName: `${resourcePrefix}-MobileAnalyticsBucketName`
    });

    new cdk.CfnOutput(this, 'MobileQueueUrl', {
      value: this.mobileQueue.queueUrl,
      description: 'Mobile Sync SQS Queue URL',
      exportName: `${resourcePrefix}-MobileQueueUrl`
    });
  }
}
