import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

export interface EventManagementServiceStackProps extends cdk.StackProps {
  environment: string;
  config: EnvironmentConfig;
}

export class EventManagementServiceStack extends cdk.Stack {
  public readonly eventTable: dynamodb.Table;
  public readonly eventLambdaFunctions: { [key: string]: lambda.Function };

  constructor(scope: Construct, id: string, props: EventManagementServiceStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const resourcePrefix = `${id.toLowerCase()}-${environment}`;

    // Create API Gateway for Event Management Service
    const apiGateway = new apigateway.RestApi(this, 'EventManagementServiceAPI', {
      restApiName: `EventManagementService-${environment}`,
      description: 'Event Management Service API Gateway',
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

    // Create DynamoDB table for events with single-table design
    this.eventTable = new dynamodb.Table(this, 'EventTable', {
      tableName: `${resourcePrefix}-events`,
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

    // Add GSI for organizer-based queries
    this.eventTable.addGlobalSecondaryIndex({
      indexName: 'OrganizerIndex',
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

    // Add GSI for category-based queries
    this.eventTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
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

    // Add GSI for organizer events by creation date
    this.eventTable.addGlobalSecondaryIndex({
      indexName: 'OrganizerCreatedIndex',
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

    // Add GSI for slug-based queries
    this.eventTable.addGlobalSecondaryIndex({
      indexName: 'SlugIndex',
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

    // Add GSI for status and date queries
    this.eventTable.addGlobalSecondaryIndex({
      indexName: 'StatusDateIndex',
      partitionKey: {
        name: 'GSI5PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI5SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Create IAM role for Lambda functions
    const eventLambdaRole = new iam.Role(this, 'EventLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: `${resourcePrefix}-event-lambda-role`,
    });

    // Grant DynamoDB permissions
    this.eventTable.grantReadWriteData(eventLambdaRole);

    // Grant CloudWatch Logs permissions
    eventLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    );

    // Common Lambda configuration
    const lambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X,
      role: eventLambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        EVENT_TABLE_NAME: this.eventTable.tableName,
        USER_TABLE_NAME: `${resourcePrefix.replace('eventmanagement', 'usermanagement')}-users`,

        JWT_SECRET: process.env['JWT_SECRET'] || 'default-secret-key',
        JWT_EXPIRES_IN: '1h',
        REFRESH_TOKEN_EXPIRES_IN: '7d',
        NODE_ENV: environment,
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    };

    // Initialize Lambda functions object
    this.eventLambdaFunctions = {};

    // Event CRUD Lambda functions
    this.eventLambdaFunctions.createEvent = new lambda.Function(this, 'CreateEventFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-create-event`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.createEvent',
    });

    this.eventLambdaFunctions.getEventById = new lambda.Function(this, 'GetEventByIdFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-event-by-id`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.getEventById',
    });

    this.eventLambdaFunctions.getEventBySlug = new lambda.Function(this, 'GetEventBySlugFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-event-by-slug`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.getEventBySlug',
    });

    this.eventLambdaFunctions.updateEvent = new lambda.Function(this, 'UpdateEventFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-update-event`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.updateEvent',
    });

    this.eventLambdaFunctions.deleteEvent = new lambda.Function(this, 'DeleteEventFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-delete-event`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.deleteEvent',
    });

    // Event Status Management Lambda functions
    this.eventLambdaFunctions.publishEvent = new lambda.Function(this, 'PublishEventFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-publish-event`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.publishEvent',
    });

    this.eventLambdaFunctions.cancelEvent = new lambda.Function(this, 'CancelEventFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-cancel-event`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.cancelEvent',
    });

    this.eventLambdaFunctions.duplicateEvent = new lambda.Function(this, 'DuplicateEventFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-duplicate-event`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.duplicateEvent',
    });

    // Event Search and Listing Lambda functions
    this.eventLambdaFunctions.searchEvents = new lambda.Function(this, 'SearchEventsFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-search-events`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.searchEvents',
    });

    this.eventLambdaFunctions.getEventsByOrganizer = new lambda.Function(this, 'GetEventsByOrganizerFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-events-by-organizer`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.getEventsByOrganizer',
    });

    this.eventLambdaFunctions.getEventsByCategory = new lambda.Function(this, 'GetEventsByCategoryFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-events-by-category`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.getEventsByCategory',
    });

    // Event Category Lambda functions
    this.eventLambdaFunctions.createCategory = new lambda.Function(this, 'CreateCategoryFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-create-category`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.createCategory',
    });

    this.eventLambdaFunctions.getAllCategories = new lambda.Function(this, 'GetAllCategoriesFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-all-categories`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.getAllCategories',
    });

    // Event Media Lambda functions
    this.eventLambdaFunctions.addEventMedia = new lambda.Function(this, 'AddEventMediaFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-add-event-media`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.addEventMedia',
    });

    this.eventLambdaFunctions.getEventMedia = new lambda.Function(this, 'GetEventMediaFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-event-media`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.getEventMedia',
    });

    this.eventLambdaFunctions.deleteEventMedia = new lambda.Function(this, 'DeleteEventMediaFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-delete-event-media`,
      code: lambda.Code.fromAsset('dist/bundled'),
      handler: 'eventHandlers.deleteEventMedia',
    });

    // Create API Gateway resources and methods
    const eventsResource = apiGateway.root.addResource('events');
    const eventResource = eventsResource.addResource('{eventId}');
    const categoriesResource = apiGateway.root.addResource('categories');
    const mediaResource = eventResource.addResource('media');
    const mediaItemResource = mediaResource.addResource('{mediaId}');

    // Event CRUD endpoints
    eventsResource.addMethod('POST', new apigateway.LambdaIntegration(this.eventLambdaFunctions.createEvent));
    eventsResource.addMethod('GET', new apigateway.LambdaIntegration(this.eventLambdaFunctions.searchEvents));
    
    eventResource.addMethod('GET', new apigateway.LambdaIntegration(this.eventLambdaFunctions.getEventById));
    eventResource.addMethod('PUT', new apigateway.LambdaIntegration(this.eventLambdaFunctions.updateEvent));
    eventResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.eventLambdaFunctions.deleteEvent));

    // Event by slug endpoint
    const eventBySlugResource = eventsResource.addResource('slug').addResource('{slug}');
    eventBySlugResource.addMethod('GET', new apigateway.LambdaIntegration(this.eventLambdaFunctions.getEventBySlug));

    // Event status management endpoints
    eventResource.addResource('publish').addMethod('POST', new apigateway.LambdaIntegration(this.eventLambdaFunctions.publishEvent));
    eventResource.addResource('cancel').addMethod('POST', new apigateway.LambdaIntegration(this.eventLambdaFunctions.cancelEvent));
    eventResource.addResource('duplicate').addMethod('POST', new apigateway.LambdaIntegration(this.eventLambdaFunctions.duplicateEvent));

    // Organizer events endpoint
    const organizerEventsResource = eventsResource.addResource('organizer');
    organizerEventsResource.addMethod('GET', new apigateway.LambdaIntegration(this.eventLambdaFunctions.getEventsByOrganizer));

    // Category events endpoint
    const categoryEventsResource = eventsResource.addResource('category').addResource('{categoryId}');
    categoryEventsResource.addMethod('GET', new apigateway.LambdaIntegration(this.eventLambdaFunctions.getEventsByCategory));

    // Category management endpoints
    categoriesResource.addMethod('POST', new apigateway.LambdaIntegration(this.eventLambdaFunctions.createCategory));
    categoriesResource.addMethod('GET', new apigateway.LambdaIntegration(this.eventLambdaFunctions.getAllCategories));

    // Event media endpoints
    mediaResource.addMethod('POST', new apigateway.LambdaIntegration(this.eventLambdaFunctions.addEventMedia));
    mediaResource.addMethod('GET', new apigateway.LambdaIntegration(this.eventLambdaFunctions.getEventMedia));
    mediaItemResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.eventLambdaFunctions.deleteEventMedia));

    // Create CloudWatch alarms for Lambda functions
    Object.entries(this.eventLambdaFunctions).forEach(([name, func]) => {
      // Duration alarm
      new cdk.aws_cloudwatch.Alarm(this, `${name}DurationAlarm`, {
        metric: func.metricDuration(),
        threshold: 25000, // 25 seconds
        evaluationPeriods: 2,
        alarmDescription: `Event Management ${name} function duration exceeded 25 seconds`,
      });

      // Error alarm
      new cdk.aws_cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
        metric: func.metricErrors(),
        threshold: 1,
        evaluationPeriods: 1,
        alarmDescription: `Event Management ${name} function has errors`,
      });
    });

    // Output the table name
    new cdk.CfnOutput(this, 'EventTableName', {
      value: this.eventTable.tableName,
      description: 'Event Management DynamoDB table name',
      exportName: `${resourcePrefix}-event-table-name`,
    });

    // Output the API Gateway URL
    new cdk.CfnOutput(this, 'EventManagementApiUrl', {
      value: `${apiGateway.url}events`,
      description: 'Event Management API Gateway URL',
      exportName: `${resourcePrefix}-api-url`,
    });
  }
}
