// Placeholder BookingServiceStack - To be implemented

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface BookingServiceStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  userPool: cognito.IUserPool;
  eventTable: dynamodb.ITable;
}

export class BookingServiceStack extends cdk.Stack {
  public readonly bookingTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: BookingServiceStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const resourcePrefix = `${id}-${environment}`;

    this.bookingTable = new dynamodb.Table(this, 'BookingTable', {
      tableName: `${resourcePrefix}-bookings`,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'eventId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: environment === 'prod',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'EventManagement');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Owner', 'EventTeam');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Service', 'Booking');
  }
}
