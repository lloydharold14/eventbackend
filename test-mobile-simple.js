const https = require('https');

const BASE_URL = 'r2nbmrglq6.execute-api.ca-central-1.amazonaws.com';

function makeRequest(path, method, data, userAgent) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: `/dev${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testMobileOptimization() {
  console.log('🧪 Testing Mobile vs Web API Optimization\n');

  try {
    // Test data
    const testUser = {
      email: 'mobile-test2@example.com',
      password: 'TestPassword123!',
      firstName: 'Mobile',
      lastName: 'Test',
      username: 'mobiletest2',
      acceptTerms: true
    };

    // Register a new user
    console.log('📝 Registering test user...');
    const registerResponse = await makeRequest(
      '/auth/register',
      'POST',
      testUser,
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
    );

    console.log('✅ Registration Status:', registerResponse.status);
    console.log('📋 Registration Response:', JSON.stringify(registerResponse.data, null, 2));
    console.log('');

    // For now, let's just test the registration response to see if mobile optimization is working
    // The registration response should show mobile optimization in the user object
    
    if (registerResponse.data.success) {
      const user = registerResponse.data.data?.user;
      console.log('🔍 Checking for DynamoDB fields in registration response...');
      
      const hasDynamoFields = user && (
        user.PK || user.SK || user.GSI1PK || 
        user.GSI1SK || user.GSI2PK || user.GSI3PK
      );
      
      console.log('📋 User fields:', Object.keys(user || {}).join(', '));
      console.log('🔍 Has DynamoDB fields:', hasDynamoFields ? '❌ YES (BAD)' : '✅ NO (GOOD)');
      console.log('📊 Response size:', JSON.stringify(registerResponse.data).length, 'characters');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMobileOptimization();
