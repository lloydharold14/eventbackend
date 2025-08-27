import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { EnvironmentConfig } from '../config/environments';

export interface UserManagementStackProps extends cdk.StackProps {
  environment: string;
  config: EnvironmentConfig;
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  apiGateway: apigateway.RestApi;
}

export class UserManagementStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userTable: dynamodb.Table;
  public readonly userLambdaRole: iam.Role;
  public readonly userLambdaFunctions: { [key: string]: lambda.Function };

  constructor(scope: Construct, id: string, props: UserManagementStackProps) {
    super(scope, id, props);

    const { environment, vpc, securityGroup, apiGateway } = props;
    const resourcePrefix = `${id}-${environment}`;

    // Placeholder implementation - will be fully implemented later
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${resourcePrefix}-user-pool`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `${resourcePrefix}-client`,
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls: environment === 'prod' 
          ? ['https://yourdomain.com/callback'] 
          : ['http://localhost:3000/callback'],
      },
    });

    // Create DynamoDB table with proper structure for user management
    this.userTable = new dynamodb.Table(this, 'UserTable', {
      tableName: `${resourcePrefix}-users`,
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

    // Add GSI for email lookups
    this.userTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
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

    // Add GSI for username lookups
    this.userTable.addGlobalSecondaryIndex({
      indexName: 'UsernameIndex',
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

    // Add GSI for role-based queries
    this.userTable.addGlobalSecondaryIndex({
      indexName: 'RoleIndex',
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

    // Create IAM role for Lambda functions
    this.userLambdaRole = new iam.Role(this, 'UserLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: `${resourcePrefix}-lambda-role`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB permissions
    this.userTable.grantReadWriteData(this.userLambdaRole);

    // Grant SES permissions for email verification
    this.userLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ses:SendEmail',
        'ses:SendRawEmail',
        'ses:VerifyEmailIdentity',
        'ses:GetSendQuota',
        'ses:GetSendStatistics'
      ],
      resources: ['*']
    }));

    // Grant SNS permissions for SMS verification
    this.userLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sns:Publish',
        'sns:GetSMSAttributes',
        'sns:SetSMSAttributes'
      ],
      resources: ['*']
    }));

    // Create Lambda functions for user management
    this.userLambdaFunctions = {};

    // Common Lambda configuration
    const lambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      role: this.userLambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,

        JWT_SECRET: process.env['JWT_SECRET'] || 'default-secret-key',
        JWT_EXPIRES_IN: '1h',
        REFRESH_TOKEN_EXPIRES_IN: '7d',
        NODE_ENV: environment,
        // OAuth provider credentials
        GOOGLE_CLIENT_ID: process.env['GOOGLE_CLIENT_ID'] || '',
        GOOGLE_CLIENT_SECRET: process.env['GOOGLE_CLIENT_SECRET'] || '',
        FACEBOOK_CLIENT_ID: process.env['FACEBOOK_CLIENT_ID'] || '',
        FACEBOOK_CLIENT_SECRET: process.env['FACEBOOK_CLIENT_SECRET'] || '',
        APPLE_CLIENT_ID: process.env['APPLE_CLIENT_ID'] || '',
        APPLE_CLIENT_SECRET: process.env['APPLE_CLIENT_SECRET'] || '',
        MICROSOFT_CLIENT_ID: process.env['MICROSOFT_CLIENT_ID'] || '',
        MICROSOFT_CLIENT_SECRET: process.env['MICROSOFT_CLIENT_SECRET'] || '',
        GITHUB_CLIENT_ID: process.env['GITHUB_CLIENT_ID'] || '',
        GITHUB_CLIENT_SECRET: process.env['GITHUB_CLIENT_SECRET'] || '',
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    };

    // Authentication Lambda functions
    // Using simple bundled files instead of Lambda Layers

    this.userLambdaFunctions.registerUser = new lambda.Function(this, 'RegisterUserFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-register-user`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.registerUser'
    });

    this.userLambdaFunctions.loginUser = new lambda.Function(this, 'LoginUserFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-login-user`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.loginUser'
    });

    this.userLambdaFunctions.refreshToken = new lambda.Function(this, 'RefreshTokenFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-refresh-token`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.refreshToken'
    });

    this.userLambdaFunctions.changePassword = new lambda.Function(this, 'ChangePasswordFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-change-password`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.changePassword'
    });

    this.userLambdaFunctions.resetPassword = new lambda.Function(this, 'ResetPasswordFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-reset-password`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.resetPassword'
    });

    this.userLambdaFunctions.confirmPasswordReset = new lambda.Function(this, 'ConfirmPasswordResetFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-confirm-password-reset`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.confirmPasswordReset'
    });

    // User profile Lambda functions
    this.userLambdaFunctions.getUserProfile = new lambda.Function(this, 'GetUserProfileFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-user-profile`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.getUserProfile'
    });

    this.userLambdaFunctions.updateUserProfile = new lambda.Function(this, 'UpdateUserProfileFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-update-user-profile`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.updateUserProfile'
    });

    this.userLambdaFunctions.getUserById = new lambda.Function(this, 'GetUserByIdFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-user-by-id`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.getUserById'
    });



    // Admin Lambda functions
    this.userLambdaFunctions.listUsers = new lambda.Function(this, 'ListUsersFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-list-users`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.listUsers'
    });

    this.userLambdaFunctions.deleteUser = new lambda.Function(this, 'DeleteUserFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-delete-user`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.deleteUser'
    });

    this.userLambdaFunctions.changeUserRole = new lambda.Function(this, 'ChangeUserRoleFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-change-user-role`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.changeUserRole'
    });

    this.userLambdaFunctions.getUserStats = new lambda.Function(this, 'GetUserStatsFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-user-stats`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.getUserStats'
    });

    // OAuth Lambda functions
    this.userLambdaFunctions.oauthLogin = new lambda.Function(this, 'OAuthLoginFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-oauth-login`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'oauthHandlers.oauthLogin'
    });

    this.userLambdaFunctions.linkOAuthAccount = new lambda.Function(this, 'LinkOAuthAccountFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-link-oauth-account`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'oauthHandlers.linkOAuthAccount'
    });

    this.userLambdaFunctions.unlinkOAuthAccount = new lambda.Function(this, 'UnlinkOAuthAccountFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-unlink-oauth-account`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'oauthHandlers.unlinkOAuthAccount'
    });

    this.userLambdaFunctions.getLinkedOAuthAccounts = new lambda.Function(this, 'GetLinkedOAuthAccountsFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-linked-oauth-accounts`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'oauthHandlers.getLinkedOAuthAccounts'
    });

    this.userLambdaFunctions.getOAuthAuthorizationUrl = new lambda.Function(this, 'GetOAuthAuthorizationUrlFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-get-oauth-authorization-url`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'oauthHandlers.getOAuthAuthorizationUrl'
    });

    // Verification Lambda functions
    this.userLambdaFunctions.verifyEmail = new lambda.Function(this, 'VerifyEmailFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-verify-email`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.verifyEmail'
    });

    this.userLambdaFunctions.verifySMS = new lambda.Function(this, 'VerifySMSFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-verify-sms`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.verifySMS'
    });

    this.userLambdaFunctions.resendEmailVerification = new lambda.Function(this, 'ResendEmailVerificationFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-resend-email-verification`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.resendEmailVerification'
    });

    this.userLambdaFunctions.sendSMSVerification = new lambda.Function(this, 'SendSMSVerificationFunction', {
      ...lambdaConfig,
      functionName: `${resourcePrefix}-send-sms-verification`,
      code: lambda.Code.fromAsset('dist/simple'),
      handler: 'userHandlers.sendSMSVerification'
    });



    // Create API Gateway resources and methods
    const usersResource = apiGateway.root.addResource('users');
    const authResource = apiGateway.root.addResource('auth');
    const adminResource = apiGateway.root.addResource('admin');

    // Authentication endpoints
    authResource.addResource('register').addMethod('POST', new apigateway.LambdaIntegration(this.userLambdaFunctions.registerUser));
    authResource.addResource('login').addMethod('POST', new apigateway.LambdaIntegration(this.userLambdaFunctions.loginUser));
    authResource.addResource('refresh').addMethod('POST', new apigateway.LambdaIntegration(this.userLambdaFunctions.refreshToken));
    authResource.addResource('change-password').addMethod('POST', new apigateway.LambdaIntegration(this.userLambdaFunctions.changePassword));
    authResource.addResource('reset-password').addMethod('POST', new apigateway.LambdaIntegration(this.userLambdaFunctions.resetPassword));
    authResource.addResource('confirm-reset').addMethod('POST', new apigateway.LambdaIntegration(this.userLambdaFunctions.confirmPasswordReset));

    // OAuth endpoints
    const authOAuthResource = authResource.addResource('oauth');
    authOAuthResource.addResource('login').addMethod('POST', new apigateway.LambdaIntegration(this.userLambdaFunctions.oauthLogin));
    authOAuthResource.addResource('authorization-url').addMethod('GET', new apigateway.LambdaIntegration(this.userLambdaFunctions.getOAuthAuthorizationUrl));
    
    const usersOAuthResource = usersResource.addResource('oauth');
    usersOAuthResource.addResource('link').addMethod('POST', new apigateway.LambdaIntegration(this.userLambdaFunctions.linkOAuthAccount));
    usersOAuthResource.addResource('unlink').addMethod('POST', new apigateway.LambdaIntegration(this.userLambdaFunctions.unlinkOAuthAccount));
    usersOAuthResource.addResource('accounts').addMethod('GET', new apigateway.LambdaIntegration(this.userLambdaFunctions.getLinkedOAuthAccounts));

    // User profile endpoints
    const profileResource = usersResource.addResource('profile');
    profileResource.addMethod('GET', new apigateway.LambdaIntegration(this.userLambdaFunctions.getUserProfile));
    profileResource.addMethod('PUT', new apigateway.LambdaIntegration(this.userLambdaFunctions.updateUserProfile));
    usersResource.addResource('{userId}').addMethod('GET', new apigateway.LambdaIntegration(this.userLambdaFunctions.getUserById));

    // Verification endpoints
    authResource.addResource('verify-email').addMethod('POST', new apigateway.LambdaIntegration(this.userLambdaFunctions.verifyEmail));
    authResource.addResource('verify-sms').addMethod('POST', new apigateway.LambdaIntegration(this.userLambdaFunctions.verifySMS));
    authResource.addResource('resend-email-verification').addResource('{userId}').addMethod('POST', new apigateway.LambdaIntegration(this.userLambdaFunctions.resendEmailVerification));
    authResource.addResource('send-sms-verification').addResource('{userId}').addMethod('POST', new apigateway.LambdaIntegration(this.userLambdaFunctions.sendSMSVerification));

    // Admin endpoints
    const adminUsersResource = adminResource.addResource('users');
    adminUsersResource.addMethod('GET', new apigateway.LambdaIntegration(this.userLambdaFunctions.listUsers));
    
    const adminUserResource = adminUsersResource.addResource('{userId}');
    adminUserResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.userLambdaFunctions.deleteUser));
    adminUserResource.addResource('role').addMethod('PUT', new apigateway.LambdaIntegration(this.userLambdaFunctions.changeUserRole));
    
    adminResource.addResource('stats').addMethod('GET', new apigateway.LambdaIntegration(this.userLambdaFunctions.getUserStats));

    // Create CloudWatch alarms for Lambda functions
    Object.entries(this.userLambdaFunctions).forEach(([name, func]) => {
      // Duration alarm
      new cloudwatch.Alarm(this, `${name}DurationAlarm`, {
        metric: func.metricDuration(),
        threshold: 25000, // 25 seconds
        evaluationPeriods: 2,
        alarmDescription: `Lambda function ${name} is taking too long to execute`,
      });

      // Error alarm
      new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
        metric: func.metricErrors(),
        threshold: 1,
        evaluationPeriods: 1,
        alarmDescription: `Lambda function ${name} is experiencing errors`,
      });
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'EventManagement');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Owner', 'EventTeam');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Service', 'UserManagement');
  }
}
