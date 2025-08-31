const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: 'ca-central-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function activateUser(email) {
  const params = {
    TableName: 'UserManagement-dev-dev-users',
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'GSI1PK = :email',
    ExpressionAttributeValues: {
      ':email': `EMAIL#${email.toLowerCase()}`
    }
  };

  try {
    const result = await dynamodb.query(params).promise();
    if (!result.Items || result.Items.length === 0) {
      console.log('❌ User not found with that email address');
      return;
    }

    const user = result.Items[0];
    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Name:', user.firstName, user.lastName);
    console.log('   Email:', user.email);
    console.log('   Current Status:', user.status);
    console.log('   Email Verified:', user.emailVerified);

    // Update user to active status
    const updateParams = {
      TableName: 'UserManagement-dev-dev-users',
      Key: {
        PK: `USER#${user.id}`,
        SK: `USER#${user.id}`
      },
      UpdateExpression: 'SET #status = :status, #emailVerified = :emailVerified, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#emailVerified': 'emailVerified',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':status': 'active',
        ':emailVerified': true,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const updateResult = await dynamodb.update(updateParams).promise();
    
    console.log('\n🎉 User activated successfully!');
    console.log('   New Status:', updateResult.Attributes.status);
    console.log('   Email Verified:', updateResult.Attributes.emailVerified);
    console.log('\n📱 The user can now log in to the mobile app!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: node activate-user.js <email>');
    console.log('Example: node activate-user.js tkhtechinc@gmail.com');
    process.exit(1);
  }

  console.log(`🔍 Activating user with email: ${email}`);
  await activateUser(email);
}

main();
