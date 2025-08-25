import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as path from 'path';

export interface PaymentServiceStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  userPool: cognito.IUserPool;
  bookingTable: dynamodb.ITable;
}

export class PaymentServiceStack extends cdk.Stack {
  public readonly paymentTable: dynamodb.Table;
  public readonly paymentLambdaRole: iam.Role;
  public readonly paymentLambdaFunctions: { [key: string]: lambda.Function };

  constructor(scope: Construct, id: string, props: PaymentServiceStackProps) {
    super(scope, id, props);

    const { environment, vpc, securityGroup, userPool, bookingTable } = props;
    const resourcePrefix = `${id.toLowerCase()}-${environment}`;

    // Create API Gateway for Payment Service
    const apiGateway = new apigateway.RestApi(this, 'PaymentServiceAPI', {
      restApiName: `PaymentService-${environment}`,
      description: 'Payment Service API Gateway',
      defaultCorsPreflightOptions: {
        allowOrigins: environment === 'prod' 
          ? ['https://yourdomain.com'] 
          : ['*'],
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

    // Create DynamoDB table for payments with single-table design
    this.paymentTable = new dynamodb.Table(this, 'PaymentTable', {
      tableName: `${resourcePrefix}-payments`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: environment === 'prod',
    });

    // Add GSI for user-based queries
    this.paymentTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI1SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add GSI for booking-based queries
    this.paymentTable.addGlobalSecondaryIndex({
      indexName: 'BookingIndex',
      partitionKey: {
        name: 'GSI2PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI2SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add GSI for status-based queries
    this.paymentTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: {
        name: 'GSI3PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI3SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add GSI for Stripe payment intent queries
    this.paymentTable.addGlobalSecondaryIndex({
      indexName: 'StripeIndex',
      partitionKey: {
        name: 'GSI4PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI4SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Create IAM role for Lambda functions
    this.paymentLambdaRole = new iam.Role(this, 'PaymentLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // Grant DynamoDB permissions
    this.paymentTable.grantReadWriteData(this.paymentLambdaRole);
    bookingTable.grantReadData(this.paymentLambdaRole);

    // Add custom policies for payment service
    this.paymentLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['*'],
    }));

    // Initialize Lambda functions object
    this.paymentLambdaFunctions = {};

    // Create Payment Intent Lambda
    const createPaymentIntentFunction = new lambda.Function(this, 'CreatePaymentIntentFunction', {
      functionName: `${resourcePrefix}-create-payment-intent`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'domains/payments/handlers/paymentHandlers.createPaymentIntent',
      code: lambda.Code.fromAsset('dist'),
      role: this.paymentLambdaRole,
      environment: {
        ENVIRONMENT: environment,
        PAYMENT_TABLE_NAME: this.paymentTable.tableName,
        BOOKING_TABLE_NAME: bookingTable.tableName,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder',
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [securityGroup],
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Confirm Payment Lambda
    const confirmPaymentFunction = new lambda.Function(this, 'ConfirmPaymentFunction', {
      functionName: `${resourcePrefix}-confirm-payment`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'domains/payments/handlers/paymentHandlers.confirmPayment',
      code: lambda.Code.fromAsset('dist'),
      role: this.paymentLambdaRole,
      environment: {
        ENVIRONMENT: environment,
        PAYMENT_TABLE_NAME: this.paymentTable.tableName,
        BOOKING_TABLE_NAME: bookingTable.tableName,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder',
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [securityGroup],
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Get Payment Status Lambda
    const getPaymentStatusFunction = new lambda.Function(this, 'GetPaymentStatusFunction', {
      functionName: `${resourcePrefix}-get-payment-status`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'domains/payments/handlers/paymentHandlers.getPaymentStatus',
      code: lambda.Code.fromAsset('dist'),
      role: this.paymentLambdaRole,
      environment: {
        ENVIRONMENT: environment,
        PAYMENT_TABLE_NAME: this.paymentTable.tableName,
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [securityGroup],
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Process Refund Lambda
    const processRefundFunction = new lambda.Function(this, 'ProcessRefundFunction', {
      functionName: `${resourcePrefix}-process-refund`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'domains/payments/handlers/paymentHandlers.processRefund',
      code: lambda.Code.fromAsset('dist'),
      role: this.paymentLambdaRole,
      environment: {
        ENVIRONMENT: environment,
        PAYMENT_TABLE_NAME: this.paymentTable.tableName,
        BOOKING_TABLE_NAME: bookingTable.tableName,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [securityGroup],
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Stripe Webhook Lambda
    const stripeWebhookFunction = new lambda.Function(this, 'StripeWebhookFunction', {
      functionName: `${resourcePrefix}-stripe-webhook`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'domains/payments/handlers/paymentHandlers.handleStripeWebhook',
      code: lambda.Code.fromAsset('dist'),
      role: this.paymentLambdaRole,
      environment: {
        ENVIRONMENT: environment,
        PAYMENT_TABLE_NAME: this.paymentTable.tableName,
        BOOKING_TABLE_NAME: bookingTable.tableName,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder',
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [securityGroup],
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Get User Payments Lambda
    const getUserPaymentsFunction = new lambda.Function(this, 'GetUserPaymentsFunction', {
      functionName: `${resourcePrefix}-get-user-payments`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'domains/payments/handlers/paymentHandlers.getUserPayments',
      code: lambda.Code.fromAsset('dist'),
      role: this.paymentLambdaRole,
      environment: {
        ENVIRONMENT: environment,
        PAYMENT_TABLE_NAME: this.paymentTable.tableName,
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [securityGroup],
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Health Check Lambda
    const healthCheckFunction = new lambda.Function(this, 'PaymentHealthCheckFunction', {
      functionName: `${resourcePrefix}-health-check`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'domains/payments/handlers/paymentHandlers.healthCheck',
      code: lambda.Code.fromAsset('dist'),
      role: this.paymentLambdaRole,
      environment: {
        ENVIRONMENT: environment,
        PAYMENT_TABLE_NAME: this.paymentTable.tableName,
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [securityGroup],
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Store Lambda functions
    this.paymentLambdaFunctions = {
      createPaymentIntent: createPaymentIntentFunction,
      confirmPayment: confirmPaymentFunction,
      getPaymentStatus: getPaymentStatusFunction,
      processRefund: processRefundFunction,
      stripeWebhook: stripeWebhookFunction,
      getUserPayments: getUserPaymentsFunction,
      healthCheck: healthCheckFunction,
    };

    // API Gateway Resources and Methods
    const paymentsResource = apiGateway.root.addResource('payments');
    const paymentIdResource = paymentsResource.addResource('{paymentId}');
    const webhookResource = apiGateway.root.addResource('webhook');

    // Health Check
    const healthResource = apiGateway.root.addResource('health');
    healthResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckFunction));

    // Create Payment Intent
    paymentsResource.addMethod('POST', new apigateway.LambdaIntegration(createPaymentIntentFunction));

    // Get Payment Status
    paymentIdResource.addMethod('GET', new apigateway.LambdaIntegration(getPaymentStatusFunction));

    // Confirm Payment
    paymentIdResource.addResource('confirm').addMethod('POST', new apigateway.LambdaIntegration(confirmPaymentFunction));

    // Process Refund
    paymentIdResource.addResource('refund').addMethod('POST', new apigateway.LambdaIntegration(processRefundFunction));

    // Get User Payments
    paymentsResource.addResource('user').addResource('{userId}').addMethod('GET', new apigateway.LambdaIntegration(getUserPaymentsFunction));

    // Stripe Webhook
    webhookResource.addMethod('POST', new apigateway.LambdaIntegration(stripeWebhookFunction));

    // Tags
    cdk.Tags.of(this).add('Project', 'EventManagement');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Owner', 'EventTeam');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Service', 'Payment');

    // Outputs
    new cdk.CfnOutput(this, 'PaymentApiUrl', {
      value: `${apiGateway.url}payments`,
      description: 'Payment Service API URL',
      exportName: `${id}-PaymentApiUrl`,
    });

    new cdk.CfnOutput(this, 'PaymentServiceAPIEndpoint', {
      value: apiGateway.url,
      description: 'Payment Service API Gateway Endpoint',
      exportName: `${id}-PaymentServiceAPIEndpoint`,
    });

    new cdk.CfnOutput(this, 'PaymentTableName', {
      value: this.paymentTable.tableName,
      description: 'Payment DynamoDB Table Name',
      exportName: `${id}-PaymentTableName`,
    });
  }
}
