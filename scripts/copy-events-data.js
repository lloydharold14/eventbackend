const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ca-central-1'
});

const docClient = DynamoDBDocumentClient.from(client);

async function copyEventsData() {
  try {
    console.log('🔄 Copying events data from old table to new table...');
    
    // Scan the old table
    const scanResult = await docClient.send(new ScanCommand({
      TableName: 'EventManagement-dev-dev-events'
    }));
    
    console.log(`📊 Found ${scanResult.Items?.length || 0} events to copy`);
    
    if (!scanResult.Items || scanResult.Items.length === 0) {
      console.log('❌ No events found in the old table');
      return;
    }
    
    // Copy each event to the new table
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of scanResult.Items) {
      try {
        await docClient.send(new PutCommand({
          TableName: 'eventmanagementservice-dev-dev-events',
          Item: item
        }));
        successCount++;
        console.log(`✅ Copied event: ${item.title || item.id}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to copy event ${item.id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Copy completed!`);
    console.log(`✅ Successfully copied: ${successCount} events`);
    console.log(`❌ Failed to copy: ${errorCount} events`);
    
  } catch (error) {
    console.error('❌ Error copying events data:', error);
  }
}

if (require.main === module) {
  copyEventsData();
}

module.exports = { copyEventsData };
