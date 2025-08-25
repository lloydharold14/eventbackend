import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface NotificationServiceStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  userPool: cognito.IUserPool;
}

export class NotificationServiceStack extends cdk.Stack {
  public readonly notificationTable: dynamodb.Table;
  public readonly notificationLambdaRole: iam.Role;
  public readonly notificationLambdaFunctions: { [key: string]: lambda.Function };
  public readonly sesIdentity: ses.EmailIdentity;
  public readonly notificationTopic: sns.Topic;
  public readonly notificationQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: NotificationServiceStackProps) {
    super(scope, id, props);

    const { environment, vpc, securityGroup, userPool } = props;
    const resourcePrefix = `${id}-${environment}`;

    // DynamoDB Table for Notifications
    this.notificationTable = new dynamodb.Table(this, 'NotificationTable', {
      tableName: `${resourcePrefix}-notifications`,
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
      timeToLiveAttribute: 'expiresAt',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
    });

    // Global Secondary Indexes
    this.notificationTable.addGlobalSecondaryIndex({
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

    this.notificationTable.addGlobalSecondaryIndex({
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

               // SES Email Identity - Temporarily disabled due to SES service issues
           // TODO: Re-enable when SES service is stable or use verified domain
           // this.sesIdentity = new ses.EmailIdentity(this, 'NotificationEmailIdentity', {
           //   identity: ses.Identity.email('notifications@example.com')
           // });
           this.sesIdentity = null as any; // Temporary workaround

    // SNS Topic for notifications
    this.notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: `${resourcePrefix}-notifications`,
      displayName: 'Event Platform Notifications',
      fifo: false
    });

    // SQS Queue for notification processing
    this.notificationQueue = new sqs.Queue(this, 'NotificationQueue', {
      queueName: `${resourcePrefix}-notifications`,
      visibilityTimeout: cdk.Duration.seconds(30),
      retentionPeriod: cdk.Duration.days(14),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'NotificationDLQ', {
          queueName: `${resourcePrefix}-notifications-dlq`,
          retentionPeriod: cdk.Duration.days(14)
        }),
        maxReceiveCount: 3
      }
    });

    // IAM Role for Lambda functions
    this.notificationLambdaRole = new iam.Role(this, 'NotificationLambdaRole', {
      roleName: `${resourcePrefix}-notification-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ]
    });

    // Add DynamoDB permissions
    this.notificationTable.grantReadWriteData(this.notificationLambdaRole);

               // Add SES permissions (commented out until SES is re-enabled)
           // this.notificationLambdaRole.addToPolicy(new iam.PolicyStatement({
           //   effect: iam.Effect.ALLOW,
           //   actions: [
           //     'ses:SendEmail',
           //     'ses:SendRawEmail',
           //     'ses:SendTemplatedEmail',
           //     'ses:GetSendQuota',
           //     'ses:GetSendStatistics'
           //   ],
           //   resources: ['*']
           // }));

    // Add SNS permissions
    this.notificationTopic.grantPublish(this.notificationLambdaRole);

    // Add SQS permissions
    this.notificationQueue.grantSendMessages(this.notificationLambdaRole);
    this.notificationQueue.grantConsumeMessages(this.notificationLambdaRole);

    // Lambda function configurations
    const lambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
                   environment: {
               NODE_ENV: environment,
               ENVIRONMENT: environment,
               SERVICE_NAME: 'NotificationService',
               SERVICE_VERSION: '1.0.0',
               ENABLE_TRACING: 'true',
               ENABLE_METRICS: 'true',
               LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
               NOTIFICATION_TABLE_NAME: this.notificationTable.tableName,
               SES_IDENTITY_ARN: 'disabled', // Temporarily disabled
               SNS_TOPIC_ARN: this.notificationTopic.topicArn,
               SQS_QUEUE_URL: this.notificationQueue.queueUrl,
               USER_POOL_ID: userPool.userPoolId
             },
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [securityGroup],
      role: this.notificationLambdaRole
    };

    // Lambda Functions
    this.notificationLambdaFunctions = {
      sendNotification: new lambda.Function(this, 'SendNotificationFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-send-notification`,
        handler: 'domains/notifications/handlers/notificationHandlers.sendNotification'
      }),

      sendBookingConfirmation: new lambda.Function(this, 'SendBookingConfirmationFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-send-booking-confirmation`,
        handler: 'domains/notifications/handlers/notificationHandlers.sendBookingConfirmation'
      }),

      sendBookingCancellation: new lambda.Function(this, 'SendBookingCancellationFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-send-booking-cancellation`,
        handler: 'domains/notifications/handlers/notificationHandlers.sendBookingCancellation'
      }),

      sendPaymentConfirmation: new lambda.Function(this, 'SendPaymentConfirmationFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-send-payment-confirmation`,
        handler: 'domains/notifications/handlers/notificationHandlers.sendPaymentConfirmation'
      }),

      sendPaymentFailed: new lambda.Function(this, 'SendPaymentFailedFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-send-payment-failed`,
        handler: 'domains/notifications/handlers/notificationHandlers.sendPaymentFailed'
      }),

      healthCheck: new lambda.Function(this, 'NotificationHealthCheckFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-health-check`,
        handler: 'domains/notifications/handlers/notificationHandlers.healthCheck'
      })
    };

    // Add CloudWatch Logs permissions
    this.notificationLambdaFunctions.sendNotification.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['*']
    }));

    // Add X-Ray permissions
    this.notificationLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'xray:PutTraceSegments',
        'xray:PutTelemetryRecords'
      ],
      resources: ['*']
    }));

    // Add CloudWatch Metrics permissions
    this.notificationLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData'
      ],
      resources: ['*']
    }));

    // Add Cognito permissions for user lookup
    userPool.grant(this.notificationLambdaRole, 'cognito-idp:AdminGetUser');

    // Outputs
    new cdk.CfnOutput(this, 'NotificationTableName', {
      value: this.notificationTable.tableName,
      description: 'Notification DynamoDB table name'
    });

    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: this.notificationTopic.topicArn,
      description: 'Notification SNS topic ARN'
    });

    new cdk.CfnOutput(this, 'NotificationQueueUrl', {
      value: this.notificationQueue.queueUrl,
      description: 'Notification SQS queue URL'
    });

               new cdk.CfnOutput(this, 'SESIdentityEmail', {
             value: 'disabled', // Temporarily disabled
             description: 'SES email identity ARN (disabled)'
           });

    // Tags
    cdk.Tags.of(this).add('Service', 'NotificationService');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
