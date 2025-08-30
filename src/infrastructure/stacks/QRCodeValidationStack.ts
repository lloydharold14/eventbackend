import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class QRCodeValidationStack extends cdk.Stack {
  public readonly apiGateway: apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // QR Code Table
    const qrCodeTable = new dynamodb.Table(this, 'QRCodeTable', {
      tableName: `${this.stackName}-QRCodeTable`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'TTL',
      pointInTimeRecovery: true
    });

    // Add GSI for QR Code ID lookups
    qrCodeTable.addGlobalSecondaryIndex({
      indexName: 'QRCodeIdIndex',
      partitionKey: { name: 'qrCodeId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Validation Log Table
    const validationLogTable = new dynamodb.Table(this, 'ValidationLogTable', {
      tableName: `${this.stackName}-ValidationLogTable`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'TTL',
      pointInTimeRecovery: true
    });

    // Add GSI for validation queries
    validationLogTable.addGlobalSecondaryIndex({
      indexName: 'EventValidationIndex',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'validationTime', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    validationLogTable.addGlobalSecondaryIndex({
      indexName: 'ValidatorIndex',
      partitionKey: { name: 'validatorId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'validationTime', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // S3 Bucket for QR Code Images
    const qrCodeBucket = new s3.Bucket(this, 'QRCodeImageBucket', {
      bucketName: `${this.stackName.toLowerCase()}-qr-code-images-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*']
        }
      ]
    });

    // CloudFront Distribution for QR Code Images
    const qrCodeDistribution = new cloudfront.Distribution(this, 'QRCodeDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(qrCodeBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN
      },
      additionalBehaviors: {
        '/qr-codes/*': {
          origin: new origins.S3Origin(qrCodeBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN
        }
      }
    });

    // IAM Role for QR Code and Validation Lambda Functions
    const qrCodeValidationRole = new iam.Role(this, 'QRCodeValidationLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    // Add DynamoDB permissions
    qrCodeTable.grantReadWriteData(qrCodeValidationRole);
    validationLogTable.grantReadWriteData(qrCodeValidationRole);

    // Add S3 permissions for QR code images
    qrCodeBucket.grantReadWrite(qrCodeValidationRole);

    // Add CloudWatch permissions for metrics
    qrCodeValidationRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
        'cloudwatch:GetMetricData',
        'cloudwatch:GetMetricStatistics'
      ],
      resources: ['*']
    }));

    // QR Code Lambda Functions
    const generateQRCodeFunction = new lambda.Function(this, 'GenerateQRCodeFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'qrCodeHandlers.generateQRCode',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName,
        QR_CODE_SECRET_KEY: process.env.QR_CODE_SECRET_KEY || 'default-secret-key',
        QR_CODE_EXPIRY_HOURS: '24',
        QR_CODE_IMAGE_SIZE: '300',
        QR_CODE_ERROR_CORRECTION_LEVEL: 'H',
        API_BASE_URL: process.env.API_BASE_URL || 'https://api.eventplatform.com'
      },
      role: qrCodeValidationRole
    });

    const getQRCodeFunction = new lambda.Function(this, 'GetQRCodeFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'qrCodeHandlers.getQRCode',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName
      },
      role: qrCodeValidationRole
    });

    const regenerateQRCodeFunction = new lambda.Function(this, 'RegenerateQRCodeFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'qrCodeHandlers.regenerateQRCode',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName,
        QR_CODE_SECRET_KEY: process.env.QR_CODE_SECRET_KEY || 'default-secret-key',
        API_BASE_URL: process.env.API_BASE_URL || 'https://api.eventplatform.com'
      },
      role: qrCodeValidationRole
    });

    const revokeQRCodeFunction = new lambda.Function(this, 'RevokeQRCodeFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'qrCodeHandlers.revokeQRCode',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName
      },
      role: qrCodeValidationRole
    });

    const getBookingQRCodesFunction = new lambda.Function(this, 'GetBookingQRCodesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'qrCodeHandlers.getBookingQRCodes',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName
      },
      role: qrCodeValidationRole
    });

    const getEventQRCodesFunction = new lambda.Function(this, 'GetEventQRCodesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'qrCodeHandlers.getEventQRCodes',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName
      },
      role: qrCodeValidationRole
    });

    const batchGenerateQRCodesFunction = new lambda.Function(this, 'BatchGenerateQRCodesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'qrCodeHandlers.batchGenerateQRCodes',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName,
        QR_CODE_SECRET_KEY: process.env.QR_CODE_SECRET_KEY || 'default-secret-key',
        API_BASE_URL: process.env.API_BASE_URL || 'https://api.eventplatform.com'
      },
      role: qrCodeValidationRole
    });

    // Validation Lambda Functions
    const validateQRCodeFunction = new lambda.Function(this, 'ValidateQRCodeFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'validationHandlers.validateQRCode',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName,
        QR_CODE_SECRET_KEY: process.env.QR_CODE_SECRET_KEY || 'default-secret-key'
      },
      role: qrCodeValidationRole
    });

    const checkInAttendeeFunction = new lambda.Function(this, 'CheckInAttendeeFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'validationHandlers.checkInAttendee',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName,
        QR_CODE_SECRET_KEY: process.env.QR_CODE_SECRET_KEY || 'default-secret-key'
      },
      role: qrCodeValidationRole
    });

    const checkOutAttendeeFunction = new lambda.Function(this, 'CheckOutAttendeeFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'validationHandlers.checkOutAttendee',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName,
        QR_CODE_SECRET_KEY: process.env.QR_CODE_SECRET_KEY || 'default-secret-key'
      },
      role: qrCodeValidationRole
    });

    const getValidationHistoryFunction = new lambda.Function(this, 'GetValidationHistoryFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'validationHandlers.getValidationHistory',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName
      },
      role: qrCodeValidationRole
    });

    const batchValidateFunction = new lambda.Function(this, 'BatchValidateFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'validationHandlers.batchValidate',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName,
        QR_CODE_SECRET_KEY: process.env.QR_CODE_SECRET_KEY || 'default-secret-key'
      },
      role: qrCodeValidationRole
    });

    const getEventValidationStatisticsFunction = new lambda.Function(this, 'GetEventValidationStatisticsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'validationHandlers.getEventValidationStatistics',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName
      },
      role: qrCodeValidationRole
    });

    const offlineValidateFunction = new lambda.Function(this, 'OfflineValidateFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'validationHandlers.offlineValidate',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName,
        QR_CODE_SECRET_KEY: process.env.QR_CODE_SECRET_KEY || 'default-secret-key'
      },
      role: qrCodeValidationRole
    });

    const getValidationMetricsFunction = new lambda.Function(this, 'GetValidationMetricsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'validationHandlers.getValidationMetrics',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        QR_CODE_TABLE_NAME: qrCodeTable.tableName,
        VALIDATION_LOG_TABLE_NAME: validationLogTable.tableName
      },
      role: qrCodeValidationRole
    });

    // API Gateway
    this.apiGateway = new apigateway.RestApi(this, 'QRCodeValidationAPI', {
      restApiName: `${this.stackName}-QRCodeValidationAPI`,
      description: 'QR Code Generation and Attendee Validation API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Correlation-ID']
      }
    });

    // QR Code Resources
    const qrCodes = this.apiGateway.root.addResource('qr-codes');
    
    // Generate QR code
    qrCodes.addMethod('POST', new apigateway.LambdaIntegration(generateQRCodeFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    // Batch generate QR codes
    qrCodes.addMethod('PUT', new apigateway.LambdaIntegration(batchGenerateQRCodesFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    // Get QR codes for event
    const eventQRCodes = qrCodes.addResource('event').addResource('{eventId}');
    eventQRCodes.addMethod('GET', new apigateway.LambdaIntegration(getEventQRCodesFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    // Get QR codes for booking
    const bookingQRCodes = qrCodes.addResource('booking').addResource('{bookingId}');
    bookingQRCodes.addMethod('GET', new apigateway.LambdaIntegration(getBookingQRCodesFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    // Individual QR code operations
    const qrCode = qrCodes.addResource('{qrCodeId}');
    qrCode.addMethod('GET', new apigateway.LambdaIntegration(getQRCodeFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    qrCode.addMethod('DELETE', new apigateway.LambdaIntegration(revokeQRCodeFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    // Regenerate QR code
    const regenerate = qrCode.addResource('regenerate');
    regenerate.addMethod('POST', new apigateway.LambdaIntegration(regenerateQRCodeFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Validation Resources
    const validation = this.apiGateway.root.addResource('validation');
    
    // Validate QR code
    validation.addMethod('POST', new apigateway.LambdaIntegration(validateQRCodeFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    // Check-in attendee
    const checkIn = validation.addResource('check-in');
    checkIn.addMethod('POST', new apigateway.LambdaIntegration(checkInAttendeeFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    // Check-out attendee
    const checkOut = validation.addResource('check-out');
    checkOut.addMethod('POST', new apigateway.LambdaIntegration(checkOutAttendeeFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    // Batch validation
    const batchValidate = validation.addResource('batch-validate');
    batchValidate.addMethod('POST', new apigateway.LambdaIntegration(batchValidateFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    // Offline validation
    const offlineValidate = validation.addResource('offline-validate');
    offlineValidate.addMethod('POST', new apigateway.LambdaIntegration(offlineValidateFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    // Get validation history
    const validationHistory = validation.addResource('history').addResource('{qrCodeId}');
    validationHistory.addMethod('GET', new apigateway.LambdaIntegration(getValidationHistoryFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    // Get event validation statistics
    const eventStats = validation.addResource('event').addResource('{eventId}').addResource('stats');
    eventStats.addMethod('GET', new apigateway.LambdaIntegration(getEventValidationStatisticsFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    // Get validation metrics
    const metrics = validation.addResource('metrics');
    metrics.addMethod('GET', new apigateway.LambdaIntegration(getValidationMetricsFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Outputs
    new cdk.CfnOutput(this, 'QRCodeValidationAPIUrl', {
      value: this.apiGateway.url,
      description: 'QR Code Validation API URL'
    });

    new cdk.CfnOutput(this, 'QRCodeImageDistributionUrl', {
      value: qrCodeDistribution.distributionDomainName,
      description: 'CloudFront Distribution URL for QR Code Images'
    });

    new cdk.CfnOutput(this, 'QRCodeTableName', {
      value: qrCodeTable.tableName,
      description: 'QR Code DynamoDB Table Name'
    });

    new cdk.CfnOutput(this, 'ValidationLogTableName', {
      value: validationLogTable.tableName,
      description: 'Validation Log DynamoDB Table Name'
    });
  }
}
