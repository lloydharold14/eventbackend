import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

export interface SearchServiceStackProps extends cdk.StackProps {
  environment: string;
  config: EnvironmentConfig;
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  userPool: cognito.IUserPool;
  eventTable: dynamodb.ITable;
}

export class SearchServiceStack extends cdk.Stack {
  public readonly openSearchDomain: opensearch.Domain;
  public readonly searchLambdaRole: iam.Role;
  public readonly searchLambdaFunctions: { [key: string]: lambda.Function };

  constructor(scope: Construct, id: string, props: SearchServiceStackProps) {
    super(scope, id, props);

    const { environment, vpc, securityGroup, userPool, eventTable } = props;
    const resourcePrefix = `${id}-${environment}`;

    // OpenSearch Domain - Simplified configuration for dev environment
    if (environment === 'dev') {
      // For development, use a simpler configuration without VPC
      this.openSearchDomain = new opensearch.Domain(this, 'EventSearchDomain', {
        domainName: `${resourcePrefix}-events`,
        version: opensearch.EngineVersion.OPENSEARCH_2_5,
        capacity: {
          dataNodes: 1,
          dataNodeInstanceType: 't3.small.search',
          masterNodes: 0,
          warmNodes: 0
        },
        ebs: {
          volumeSize: 20,
          volumeType: ec2.EbsDeviceVolumeType.GP3,
          iops: 3000,
          throughput: 125
        },
        encryptionAtRest: {
          enabled: true
        },
        nodeToNodeEncryption: true,
        enforceHttps: true,
        tlsSecurityPolicy: opensearch.TLSSecurityPolicy.TLS_1_2,
        logging: {
          slowSearchLogEnabled: true,
          slowIndexLogEnabled: true,
          appLogEnabled: true,
          auditLogEnabled: false,
          slowSearchLogGroup: new logs.LogGroup(this, 'SlowSearchLogs', {
            logGroupName: `/aws/opensearch/${resourcePrefix}-slow-search`,
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY
          }),
          slowIndexLogGroup: new logs.LogGroup(this, 'SlowIndexLogs', {
            logGroupName: `/aws/opensearch/${resourcePrefix}-slow-index`,
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY
          }),
          appLogGroup: new logs.LogGroup(this, 'AppLogs', {
            logGroupName: `/aws/opensearch/${resourcePrefix}-app`,
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY
          })
        },
        accessPolicies: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'es:ESHttp*'
            ],
            principals: [
              new iam.ServicePrincipal('lambda.amazonaws.com')
            ],
            resources: [
              `arn:aws:es:${this.region}:${this.account}:domain/${resourcePrefix}-events/*`
            ]
          })
        ],
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });
    } else {
      // For staging and production, use full configuration with VPC
      this.openSearchDomain = new opensearch.Domain(this, 'EventSearchDomain', {
        domainName: `${resourcePrefix}-events`,
        version: opensearch.EngineVersion.OPENSEARCH_2_5,
        capacity: {
          dataNodes: environment === 'prod' ? 2 : 1,
          dataNodeInstanceType: environment === 'prod' ? 't3.medium.search' : 't3.small.search',
          masterNodes: environment === 'prod' ? 3 : 0,
          masterNodeInstanceType: 't3.small.search',
          warmNodes: 0,
          warmInstanceType: 'ultrawarm1.medium.search'
        },
        zoneAwareness: environment === 'prod' ? {
          enabled: true
        } : {
          enabled: false
        },
      ebs: {
        volumeSize: environment === 'prod' ? 100 : 20,
        volumeType: ec2.EbsDeviceVolumeType.GP3,
        iops: environment === 'prod' ? 3000 : 3000,
        throughput: environment === 'prod' ? 125 : 125
      },
      vpc,
      vpcSubnets: [{
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }],
      securityGroups: [securityGroup],
      encryptionAtRest: {
        enabled: true
      },
              nodeToNodeEncryption: true,
      enforceHttps: true,
      tlsSecurityPolicy: opensearch.TLSSecurityPolicy.TLS_1_2,
      logging: {
        slowSearchLogEnabled: true,
        slowIndexLogEnabled: true,
        appLogEnabled: true,
        auditLogEnabled: environment === 'prod',
        slowSearchLogGroup: new logs.LogGroup(this, 'SlowSearchLogs', {
          logGroupName: `/aws/opensearch/${resourcePrefix}-slow-search`,
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        }),
        slowIndexLogGroup: new logs.LogGroup(this, 'SlowIndexLogs', {
          logGroupName: `/aws/opensearch/${resourcePrefix}-slow-index`,
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        }),
        appLogGroup: new logs.LogGroup(this, 'AppLogs', {
          logGroupName: `/aws/opensearch/${resourcePrefix}-app`,
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        }),
        auditLogGroup: environment === 'prod' ? new logs.LogGroup(this, 'AuditLogs', {
          logGroupName: `/aws/opensearch/${resourcePrefix}-audit`,
          retention: logs.RetentionDays.ONE_YEAR,
          removalPolicy: cdk.RemovalPolicy.RETAIN
        }) : undefined
      },
      accessPolicies: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'es:ESHttp*'
          ],
          principals: [
            new iam.ServicePrincipal('lambda.amazonaws.com')
          ],
          resources: [
            `arn:aws:es:${this.region}:${this.account}:domain/${resourcePrefix}-events/*`
          ]
        })
      ],
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });
    }

    // IAM Role for Lambda functions
    this.searchLambdaRole = new iam.Role(this, 'SearchLambdaRole', {
      roleName: `${resourcePrefix}-search-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ]
    });

    // Add OpenSearch permissions
    this.searchLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'es:ESHttp*'
      ],
      resources: [
        `${this.openSearchDomain.domainArn}/*`
      ]
    }));

    // Add DynamoDB permissions for reading events
    eventTable.grantReadData(this.searchLambdaRole);

    // Add CloudWatch Logs permissions
    this.searchLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['*']
    }));

    // Add X-Ray permissions
    this.searchLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'xray:PutTraceSegments',
        'xray:PutTelemetryRecords'
      ],
      resources: ['*']
    }));

    // Add CloudWatch Metrics permissions
    this.searchLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData'
      ],
      resources: ['*']
    }));

    // Lambda function configurations
    const lambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/bundled'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        NODE_ENV: environment,
        ENVIRONMENT: environment,
        SERVICE_NAME: 'SearchService',
        SERVICE_VERSION: '1.0.0',
        ENABLE_TRACING: 'true',
        ENABLE_METRICS: 'true',
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
        OPENSEARCH_ENDPOINT: this.openSearchDomain.domainEndpoint,
        OPENSEARCH_INDEX_NAME: 'events',
        EVENT_TABLE_NAME: eventTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
        AWS_REGION: this.region
      },
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [securityGroup],
      role: this.searchLambdaRole
    };

    // Lambda Functions
    this.searchLambdaFunctions = {
      searchEvents: new lambda.Function(this, 'SearchEventsFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-search-events`,
        handler: 'search/handlers/searchHandlers.searchEvents'
      }),

      indexEvent: new lambda.Function(this, 'IndexEventFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-index-event`,
        handler: 'search/handlers/searchHandlers.indexEvent'
      }),

      updateEventIndex: new lambda.Function(this, 'UpdateEventIndexFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-update-event-index`,
        handler: 'search/handlers/searchHandlers.updateEventIndex'
      }),

      deleteEventIndex: new lambda.Function(this, 'DeleteEventIndexFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-delete-event-index`,
        handler: 'search/handlers/searchHandlers.deleteEventIndex'
      }),

      bulkIndexEvents: new lambda.Function(this, 'BulkIndexEventsFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-bulk-index-events`,
        handler: 'search/handlers/searchHandlers.bulkIndexEvents',
        timeout: cdk.Duration.seconds(300), // 5 minutes for bulk operations
        memorySize: 2048
      }),

      searchSuggestions: new lambda.Function(this, 'SearchSuggestionsFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-search-suggestions`,
        handler: 'search/handlers/searchHandlers.searchSuggestions'
      }),

      healthCheck: new lambda.Function(this, 'SearchHealthCheckFunction', {
        ...lambdaConfig,
        functionName: `${resourcePrefix}-health-check`,
        handler: 'search/handlers/searchHandlers.healthCheck'
      })
    };

    // Add Cognito permissions for user lookup
    userPool.grant(this.searchLambdaRole, 'cognito-idp:AdminGetUser');

    // Outputs
    new cdk.CfnOutput(this, 'OpenSearchDomainEndpoint', {
      value: this.openSearchDomain.domainEndpoint,
      description: 'OpenSearch domain endpoint'
    });

    new cdk.CfnOutput(this, 'OpenSearchDomainArn', {
      value: this.openSearchDomain.domainArn,
      description: 'OpenSearch domain ARN'
    });

    new cdk.CfnOutput(this, 'OpenSearchIndexName', {
      value: 'events',
      description: 'Default events index name'
    });

    // Tags
    cdk.Tags.of(this).add('Service', 'SearchService');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
