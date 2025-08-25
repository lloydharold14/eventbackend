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
import { Construct } from 'constructs';

export interface AnalyticsServiceStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  userPool: cognito.IUserPool;
  eventTable: dynamodb.ITable;
  bookingTable: dynamodb.ITable;
  paymentTable: dynamodb.ITable;
  userTable: dynamodb.ITable;
  notificationTable: dynamodb.ITable;
}

export class AnalyticsServiceStack extends cdk.Stack {
  public readonly analyticsTable: dynamodb.Table;
  public readonly analyticsLambdaRole: iam.Role;
  public readonly analyticsLambdaFunctions: { [key: string]: lambda.Function };
  public readonly analyticsApiGateway: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: AnalyticsServiceStackProps) {
    super(scope, id, props);

    const { environment, vpc, securityGroup, userPool, eventTable, bookingTable, paymentTable, userTable, notificationTable } = props;
    const resourcePrefix = `${id}-${environment}`;

    // DynamoDB Table for Analytics
    this.analyticsTable = new dynamodb.Table(this, 'AnalyticsTable', {
      tableName: `${resourcePrefix}-analytics`,
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

    // Global Secondary Indexes
    this.analyticsTable.addGlobalSecondaryIndex({
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

    this.analyticsTable.addGlobalSecondaryIndex({
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

    this.analyticsTable.addGlobalSecondaryIndex({
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

    // S3 Bucket for Analytics Exports
    const analyticsExportBucket = new s3.Bucket(this, 'AnalyticsExportBucket', {
      bucketName: `${resourcePrefix}-analytics-exports`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          id: 'DeleteOldExports',
          enabled: true,
          expiration: cdk.Duration.days(30),
          prefix: 'exports/'
        }
      ]
    });

    // IAM Role for Lambda functions
    this.analyticsLambdaRole = new iam.Role(this, 'AnalyticsLambdaRole', {
      roleName: `${resourcePrefix}-analytics-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ]
    });

    // Add DynamoDB permissions
    this.analyticsTable.grantReadWriteData(this.analyticsLambdaRole);
    eventTable.grantReadData(this.analyticsLambdaRole);
    bookingTable.grantReadData(this.analyticsLambdaRole);
    paymentTable.grantReadData(this.analyticsLambdaRole);
    userTable.grantReadData(this.analyticsLambdaRole);
    notificationTable.grantReadData(this.analyticsLambdaRole);

    // Add S3 permissions for exports
    analyticsExportBucket.grantReadWrite(this.analyticsLambdaRole);

    // Add CloudWatch Logs permissions
    this.analyticsLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['*']
    }));

    // Add X-Ray permissions
    this.analyticsLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'xray:PutTraceSegments',
        'xray:PutTelemetryRecords'
      ],
      resources: ['*']
    }));

    // Add CloudWatch Metrics permissions
    this.analyticsLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData'
      ],
      resources: ['*']
    }));

    // Add Cognito permissions for user lookup
    userPool.grant(this.analyticsLambdaRole, 'cognito-idp:AdminGetUser');

    // Lambda function configurations
    const lambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        NODE_ENV: environment,
        ENVIRONMENT: environment,
        SERVICE_NAME: 'AnalyticsService',
        SERVICE_VERSION: '1.0.0',
        ENABLE_TRACING: 'true',
        ENABLE_METRICS: 'true',
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
        ANALYTICS_TABLE_NAME: this.analyticsTable.tableName,
        EVENT_TABLE_NAME: eventTable.tableName,
        BOOKING_TABLE_NAME: bookingTable.tableName,
        PAYMENT_TABLE_NAME: paymentTable.tableName,
        USER_TABLE_NAME: userTable.tableName,
        NOTIFICATION_TABLE_NAME: notificationTable.tableName,
        ANALYTICS_EXPORT_BUCKET: analyticsExportBucket.bucketName,
        USER_POOL_ID: userPool.userPoolId,
        AWS_REGION: this.region
      },
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [securityGroup],
      role: this.analyticsLambdaRole
    };

    // Lambda Functions
    this.analyticsLambdaFunctions = {
      generateAnalytics: new lambda.Function(this, 'GenerateAnalyticsFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-generate-analytics`,
        handler: 'domains/analytics/handlers/analyticsHandlers.generateAnalytics',
        timeout: cdk.Duration.seconds(60)
      }),

      generateDashboard: new lambda.Function(this, 'GenerateDashboardFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-generate-dashboard`,
        handler: 'domains/analytics/handlers/analyticsHandlers.generateDashboard',
        timeout: cdk.Duration.seconds(60)
      }),

      generateReport: new lambda.Function(this, 'GenerateReportFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-generate-report`,
        handler: 'domains/analytics/handlers/analyticsHandlers.generateReport',
        timeout: cdk.Duration.seconds(120), // Longer timeout for report generation
        memorySize: 2048
      }),

      getRealTimeMetrics: new lambda.Function(this, 'GetRealTimeMetricsFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-real-time-metrics`,
        handler: 'domains/analytics/handlers/analyticsHandlers.getRealTimeMetrics',
        timeout: cdk.Duration.seconds(30)
      }),

      exportAnalytics: new lambda.Function(this, 'ExportAnalyticsFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-export-analytics`,
        handler: 'domains/analytics/handlers/analyticsHandlers.exportAnalytics',
        timeout: cdk.Duration.seconds(120), // Longer timeout for exports
        memorySize: 2048
      }),

      getHealthStatus: new lambda.Function(this, 'GetHealthStatusFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-health-status`,
        handler: 'domains/analytics/handlers/analyticsHandlers.getHealthStatus',
        timeout: cdk.Duration.seconds(30)
      }),

      getAnalyticsConfig: new lambda.Function(this, 'GetAnalyticsConfigFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-analytics-config`,
        handler: 'domains/analytics/handlers/analyticsHandlers.getAnalyticsConfig',
        timeout: cdk.Duration.seconds(30)
      })
    };

    // API Gateway
    this.analyticsApiGateway = new apigateway.RestApi(this, 'AnalyticsApiGateway', {
      restApiName: `${resourcePrefix}-analytics-api`,
      description: 'Analytics Service API Gateway',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent'
        ]
      },
      deployOptions: {
        stageName: environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
        metricsEnabled: true,
        tracingEnabled: environment !== 'prod'
      }
    });

    // Cognito Authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'AnalyticsCognitoAuthorizer', {
      cognitoUserPools: [userPool]
    });

    // API Resources and Methods
    const analyticsResource = this.analyticsApiGateway.root.addResource('analytics');
    
    // Generate Analytics
    const generateAnalyticsResource = analyticsResource.addResource('generate');
    generateAnalyticsResource.addMethod('POST', new apigateway.LambdaIntegration(this.analyticsLambdaFunctions.generateAnalytics), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // Generate Dashboard
    const dashboardResource = analyticsResource.addResource('dashboard');
    dashboardResource.addMethod('POST', new apigateway.LambdaIntegration(this.analyticsLambdaFunctions.generateDashboard), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // Generate Report
    const reportResource = analyticsResource.addResource('report');
    reportResource.addMethod('POST', new apigateway.LambdaIntegration(this.analyticsLambdaFunctions.generateReport), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // Real-time Metrics
    const realtimeResource = analyticsResource.addResource('realtime');
    realtimeResource.addMethod('GET', new apigateway.LambdaIntegration(this.analyticsLambdaFunctions.getRealTimeMetrics), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // Export Analytics
    const exportResource = analyticsResource.addResource('export');
    exportResource.addMethod('POST', new apigateway.LambdaIntegration(this.analyticsLambdaFunctions.exportAnalytics), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // Health Status
    const healthResource = analyticsResource.addResource('health');
    healthResource.addMethod('GET', new apigateway.LambdaIntegration(this.analyticsLambdaFunctions.getHealthStatus), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // Analytics Config
    const configResource = analyticsResource.addResource('config');
    configResource.addMethod('GET', new apigateway.LambdaIntegration(this.analyticsLambdaFunctions.getAnalyticsConfig), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // CloudWatch Dashboard
    const analyticsDashboard = new cloudwatch.Dashboard(this, 'AnalyticsDashboard', {
      dashboardName: `${resourcePrefix}-analytics-dashboard`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Analytics API Performance',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/ApiGateway',
                metricName: 'Count',
                dimensionsMap: {
                  ApiName: this.analyticsApiGateway.restApiName,
                  Stage: environment
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
              })
            ],
            right: [
              new cloudwatch.Metric({
                namespace: 'AWS/ApiGateway',
                metricName: 'Latency',
                dimensionsMap: {
                  ApiName: this.analyticsApiGateway.restApiName,
                  Stage: environment
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
              })
            ]
          }),
          new cloudwatch.GraphWidget({
            title: 'Analytics Lambda Performance',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Invocations',
                dimensionsMap: {
                  FunctionName: this.analyticsLambdaFunctions.generateAnalytics.functionName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
              })
            ],
            right: [
              new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Duration',
                dimensionsMap: {
                  FunctionName: this.analyticsLambdaFunctions.generateAnalytics.functionName
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
              })
            ]
          })
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Analytics DynamoDB Performance',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/DynamoDB',
                metricName: 'ConsumedReadCapacityUnits',
                dimensionsMap: {
                  TableName: this.analyticsTable.tableName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
              })
            ],
            right: [
              new cloudwatch.Metric({
                namespace: 'AWS/DynamoDB',
                metricName: 'ConsumedWriteCapacityUnits',
                dimensionsMap: {
                  TableName: this.analyticsTable.tableName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
              })
            ]
          }),
          new cloudwatch.GraphWidget({
            title: 'Analytics Export Storage',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/S3',
                metricName: 'NumberOfObjects',
                dimensionsMap: {
                  BucketName: analyticsExportBucket.bucketName
                },
                statistic: 'Average',
                period: cdk.Duration.hours(1)
              })
            ],
            right: [
              new cloudwatch.Metric({
                namespace: 'AWS/S3',
                metricName: 'BucketSizeBytes',
                dimensionsMap: {
                  BucketName: analyticsExportBucket.bucketName
                },
                statistic: 'Average',
                period: cdk.Duration.hours(1)
              })
            ]
          })
        ]
      ]
    });

    // Outputs
    new cdk.CfnOutput(this, 'AnalyticsApiGatewayUrl', {
      value: this.analyticsApiGateway.url,
      description: 'Analytics Service API Gateway URL'
    });

    new cdk.CfnOutput(this, 'AnalyticsTableName', {
      value: this.analyticsTable.tableName,
      description: 'Analytics DynamoDB Table Name'
    });

    new cdk.CfnOutput(this, 'AnalyticsExportBucketName', {
      value: analyticsExportBucket.bucketName,
      description: 'Analytics Export S3 Bucket Name'
    });

    new cdk.CfnOutput(this, 'AnalyticsDashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${analyticsDashboard.dashboardName}`,
      description: 'Analytics CloudWatch Dashboard URL'
    });

    // Tags
    cdk.Tags.of(this).add('Service', 'AnalyticsService');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
