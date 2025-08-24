// Placeholder PaymentServiceStack - To be implemented

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface PaymentServiceStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  userPool: cognito.IUserPool;
  bookingTable: dynamodb.ITable;
}

export class PaymentServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PaymentServiceStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // Tags
    cdk.Tags.of(this).add('Project', 'EventManagement');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Owner', 'EventTeam');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Service', 'Payment');
  }
}
