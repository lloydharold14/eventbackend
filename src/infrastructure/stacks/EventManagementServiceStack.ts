// Placeholder EventManagementServiceStack - To be implemented

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface EventManagementServiceStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  userPool: cognito.IUserPool;
}

export class EventManagementServiceStack extends cdk.Stack {
  public readonly eventTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: EventManagementServiceStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const resourcePrefix = `${id}-${environment}`;

    // Placeholder implementation - will be fully implemented later
    this.eventTable = new dynamodb.Table(this, 'EventTable', {
      tableName: `${resourcePrefix}-events`,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'organizerId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: environment === 'prod',
    });

    // Add GSI for category-based queries
    this.eventTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: {
        name: 'category',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'startDate',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add GSI for location-based queries
    this.eventTable.addGlobalSecondaryIndex({
      indexName: 'LocationIndex',
      partitionKey: {
        name: 'location.city',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'startDate',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add GSI for status-based queries
    this.eventTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'startDate',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'EventManagement');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Owner', 'EventTeam');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Service', 'EventManagement');
  }
}
