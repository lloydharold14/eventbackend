const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');

// Initialize DynamoDB client
const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'ca-central-1'
});

async function createEventsTable() {
  try {
    console.log('🏗️ Creating Events DynamoDB table...');
    
    const createTableCommand = new CreateTableCommand({
      TableName: 'EventManagement-dev-dev-events',
      AttributeDefinitions: [
        {
          AttributeName: 'PK',
          AttributeType: 'S'
        },
        {
          AttributeName: 'SK',
          AttributeType: 'S'
        },
        {
          AttributeName: 'GSI1PK',
          AttributeType: 'S'
        },
        {
          AttributeName: 'GSI1SK',
          AttributeType: 'S'
        },
        {
          AttributeName: 'GSI2PK',
          AttributeType: 'S'
        },
        {
          AttributeName: 'GSI2SK',
          AttributeType: 'S'
        },
        {
          AttributeName: 'GSI3PK',
          AttributeType: 'S'
        },
        {
          AttributeName: 'GSI3SK',
          AttributeType: 'S'
        }
      ],
      KeySchema: [
        {
          AttributeName: 'PK',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'SK',
          KeyType: 'RANGE'
        }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'GSI1',
          KeySchema: [
            {
              AttributeName: 'GSI1PK',
              KeyType: 'HASH'
            },
            {
              AttributeName: 'GSI1SK',
              KeyType: 'RANGE'
            }
          ],
          Projection: {
            ProjectionType: 'ALL'
          }
        },
        {
          IndexName: 'GSI2',
          KeySchema: [
            {
              AttributeName: 'GSI2PK',
              KeyType: 'HASH'
            },
            {
              AttributeName: 'GSI2SK',
              KeyType: 'RANGE'
            }
          ],
          Projection: {
            ProjectionType: 'ALL'
          }
        },
        {
          IndexName: 'GSI3',
          KeySchema: [
            {
              AttributeName: 'GSI3PK',
              KeyType: 'HASH'
            },
            {
              AttributeName: 'GSI3SK',
              KeyType: 'RANGE'
            }
          ],
          Projection: {
            ProjectionType: 'ALL'
          }
        }
      ],
      BillingMode: 'PAY_PER_REQUEST',
      SSESpecification: {
        SSEEnabled: true
      },
      Tags: [
        {
          Key: 'Environment',
          Value: 'dev'
        },
        {
          Key: 'Owner',
          Value: 'EventPlatform'
        },
        {
          Key: 'Service',
          Value: 'EventManagement'
        }
      ]
    });

    await client.send(createTableCommand);
    console.log('✅ Events table created successfully!');
    console.log('📋 Table Name: EventManagement-dev-dev-events');
    
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️ Events table already exists');
    } else {
      console.error('❌ Error creating events table:', error);
    }
  }
}

// Run the table creation
if (require.main === module) {
  createEventsTable();
}

module.exports = { createEventsTable };
