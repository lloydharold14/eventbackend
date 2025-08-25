import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

export interface BookingServiceStackProps extends cdk.StackProps {
  environment: string;
  config: EnvironmentConfig;
}

export class BookingServiceStack extends cdk.Stack {
  public readonly bookingTable: dynamodb.Table;
  public readonly bookingLambdaFunctions: { [key: string]: lambda.Function };

  constructor(scope: Construct, id: string, props: BookingServiceStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // Create API Gateway for Booking Service
    const apiGateway = new apigateway.RestApi(this, 'BookingServiceAPI', {
      restApiName: `BookingService-${environment}`,
      description: 'Booking Service API Gateway',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token']
      }
    });

    // DynamoDB Table for Bookings
    this.bookingTable = new dynamodb.Table(this, 'BookingTable', {
      tableName: `EventPlatform-Bookings-${environment}`,
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
      timeToLiveAttribute: 'ttl'
    });

    // Global Secondary Indexes
    this.bookingTable.addGlobalSecondaryIndex({
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

    this.bookingTable.addGlobalSecondaryIndex({
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

    this.bookingTable.addGlobalSecondaryIndex({
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

    // Lambda Configuration
    const lambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'bookings/handlers/bookingHandlers.handlerName',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: environment,
        BOOKING_TABLE_NAME: this.bookingTable.tableName,
        JWT_SECRET: process.env.JWT_SECRET || 'your-jwt-secret',
        JWT_EXPIRES_IN: '1h',
        REFRESH_TOKEN_EXPIRES_IN: '7d'
      },
      logRetention: logs.RetentionDays.ONE_WEEK
    };

    // Lambda Functions
    this.bookingLambdaFunctions = {
      createBooking: new lambda.Function(this, 'CreateBookingFunction', {
        ...lambdaConfig,
        handler: 'bookings/handlers/bookingHandlers.createBooking',
        functionName: `booking-create-${environment}`,
        description: 'Create a new booking'
      }),

      getBookingById: new lambda.Function(this, 'GetBookingByIdFunction', {
        ...lambdaConfig,
        handler: 'bookings/handlers/bookingHandlers.getBookingById',
        functionName: `booking-get-${environment}`,
        description: 'Get booking by ID'
      }),

      updateBooking: new lambda.Function(this, 'UpdateBookingFunction', {
        ...lambdaConfig,
        handler: 'bookings/handlers/bookingHandlers.updateBooking',
        functionName: `booking-update-${environment}`,
        description: 'Update booking'
      }),

      cancelBooking: new lambda.Function(this, 'CancelBookingFunction', {
        ...lambdaConfig,
        handler: 'bookings/handlers/bookingHandlers.cancelBooking',
        functionName: `booking-cancel-${environment}`,
        description: 'Cancel booking'
      }),

      getBookingsByUser: new lambda.Function(this, 'GetBookingsByUserFunction', {
        ...lambdaConfig,
        handler: 'bookings/handlers/bookingHandlers.getBookingsByUser',
        functionName: `booking-user-${environment}`,
        description: 'Get bookings by user'
      }),

      getBookingsByEvent: new lambda.Function(this, 'GetBookingsByEventFunction', {
        ...lambdaConfig,
        handler: 'bookings/handlers/bookingHandlers.getBookingsByEvent',
        functionName: `booking-event-${environment}`,
        description: 'Get bookings by event'
      }),

      getBookingsByOrganizer: new lambda.Function(this, 'GetBookingsByOrganizerFunction', {
        ...lambdaConfig,
        handler: 'bookings/handlers/bookingHandlers.getBookingsByOrganizer',
        functionName: `booking-organizer-${environment}`,
        description: 'Get bookings by organizer'
      }),

      getBookingStatistics: new lambda.Function(this, 'GetBookingStatisticsFunction', {
        ...lambdaConfig,
        handler: 'bookings/handlers/bookingHandlers.getBookingStatistics',
        functionName: `booking-stats-${environment}`,
        description: 'Get booking statistics'
      }),

      getEventCapacity: new lambda.Function(this, 'GetEventCapacityFunction', {
        ...lambdaConfig,
        handler: 'bookings/handlers/bookingHandlers.getEventCapacity',
        functionName: `booking-capacity-${environment}`,
        description: 'Get event capacity'
      }),

      generateBookingConfirmation: new lambda.Function(this, 'GenerateBookingConfirmationFunction', {
        ...lambdaConfig,
        handler: 'bookings/handlers/bookingHandlers.generateBookingConfirmation',
        functionName: `booking-confirmation-${environment}`,
        description: 'Generate booking confirmation'
      }),

      healthCheck: new lambda.Function(this, 'BookingHealthCheckFunction', {
        ...lambdaConfig,
        handler: 'bookings/handlers/bookingHandlers.healthCheck',
        functionName: `booking-health-${environment}`,
        description: 'Booking service health check'
      })
    };

    // Grant DynamoDB permissions to all Lambda functions
    Object.values(this.bookingLambdaFunctions).forEach(func => {
      this.bookingTable.grantReadWriteData(func);
    });

    // API Gateway Resources and Methods
    const bookingsResource = apiGateway.root.addResource('bookings');
    
    // POST /bookings - Create booking
    bookingsResource.addMethod('POST', new apigateway.LambdaIntegration(this.bookingLambdaFunctions.createBooking));

    // GET /bookings/user - Get user bookings
    const userBookingsResource = bookingsResource.addResource('user');
    userBookingsResource.addMethod('GET', new apigateway.LambdaIntegration(this.bookingLambdaFunctions.getBookingsByUser));

    // GET /bookings/event/{eventId} - Get event bookings
    const eventBookingsResource = bookingsResource.addResource('event').addResource('{eventId}');
    eventBookingsResource.addMethod('GET', new apigateway.LambdaIntegration(this.bookingLambdaFunctions.getBookingsByEvent));

    // GET /bookings/organizer/{organizerId} - Get organizer bookings
    const organizerBookingsResource = bookingsResource.addResource('organizer').addResource('{organizerId}');
    organizerBookingsResource.addMethod('GET', new apigateway.LambdaIntegration(this.bookingLambdaFunctions.getBookingsByOrganizer));

    // GET /bookings/statistics - Get booking statistics
    const statisticsResource = bookingsResource.addResource('statistics');
    statisticsResource.addMethod('GET', new apigateway.LambdaIntegration(this.bookingLambdaFunctions.getBookingStatistics));

    // GET /bookings/capacity/{eventId} - Get event capacity
    const capacityResource = bookingsResource.addResource('capacity').addResource('{eventId}');
    capacityResource.addMethod('GET', new apigateway.LambdaIntegration(this.bookingLambdaFunctions.getEventCapacity));

    // Individual booking operations
    const bookingResource = bookingsResource.addResource('{bookingId}');
    
    // GET /bookings/{bookingId} - Get booking by ID
    bookingResource.addMethod('GET', new apigateway.LambdaIntegration(this.bookingLambdaFunctions.getBookingById));
    
    // PUT /bookings/{bookingId} - Update booking
    bookingResource.addMethod('PUT', new apigateway.LambdaIntegration(this.bookingLambdaFunctions.updateBooking));
    
    // DELETE /bookings/{bookingId} - Cancel booking
    bookingResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.bookingLambdaFunctions.cancelBooking));

    // GET /bookings/{bookingId}/confirmation - Generate booking confirmation
    const confirmationResource = bookingResource.addResource('confirmation');
    confirmationResource.addMethod('GET', new apigateway.LambdaIntegration(this.bookingLambdaFunctions.generateBookingConfirmation));

    // Health check endpoint - now on its own API Gateway
    const healthResource = apiGateway.root.addResource('health');
    healthResource.addMethod('GET', new apigateway.LambdaIntegration(this.bookingLambdaFunctions.healthCheck));

    // CloudWatch Outputs
    new cdk.CfnOutput(this, 'BookingTableName', {
      value: this.bookingTable.tableName,
      description: 'Booking DynamoDB table name',
      exportName: `${id}-BookingTableName`
    });

    new cdk.CfnOutput(this, 'BookingServiceApiUrl', {
      value: apiGateway.url,
      description: 'Booking Service API Gateway URL',
      exportName: `${id}-BookingApiUrl`
    });

    new cdk.CfnOutput(this, 'BookingServiceApiId', {
      value: apiGateway.restApiId,
      description: 'Booking Service API Gateway ID',
      exportName: `${id}-BookingApiId`
    });

    // Add tags
    cdk.Tags.of(this).add('Service', 'Booking');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Owner', 'EventPlatform');
  }
}
