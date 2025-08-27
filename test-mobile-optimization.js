const https = require('https');

const BASE_URL = 'r2nbmrglq6.execute-api.ca-central-1.amazonaws.com';

function makeRequest(path, method, data, userAgent, additionalHeaders = {}) {
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
        'Content-Length': Buffer.byteLength(postData),
        ...additionalHeaders
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
    // Test user credentials
    const testUser = {
      email: 'tvigninou1@gmail.com',
      password: 'Campus2020$'
    };

    // Test 1: Mobile request (iPhone)
    console.log('📱 Testing Mobile Request (iPhone)...');
    const mobileResponse = await makeRequest(
      '/auth/login',
      'POST',
      testUser,
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    );

    console.log('✅ Mobile Response Status:', mobileResponse.status);
    console.log('📊 Mobile Response Size:', JSON.stringify(mobileResponse.data).length, 'characters');
    
    // Check if DynamoDB fields are present
    const mobileUser = mobileResponse.data.data?.user;
    const hasDynamoFields = mobileUser && (
      mobileUser.PK || mobileUser.SK || mobileUser.GSI1PK || 
      mobileUser.GSI1SK || mobileUser.GSI2PK || mobileUser.GSI3PK
    );
    
    console.log('🔍 Mobile Response has DynamoDB fields:', hasDynamoFields ? '❌ YES (BAD)' : '✅ NO (GOOD)');
    console.log('📋 Mobile User fields:', Object.keys(mobileUser || {}).join(', '));
    console.log('');

    // Test 2: Web request
    console.log('💻 Testing Web Request...');
    const webResponse = await makeRequest(
      '/auth/login',
      'POST',
      testUser,
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    console.log('✅ Web Response Status:', webResponse.status);
    console.log('📊 Web Response Size:', JSON.stringify(webResponse.data).length, 'characters');
    
    // Check if DynamoDB fields are present
    const webUser = webResponse.data.data?.user;
    const webHasDynamoFields = webUser && (
      webUser.PK || webUser.SK || webUser.GSI1PK || 
      webUser.GSI1SK || webUser.GSI2PK || webUser.GSI3PK
    );
    
    console.log('🔍 Web Response has DynamoDB fields:', webHasDynamoFields ? '✅ YES (EXPECTED)' : '❌ NO (UNEXPECTED)');
    console.log('📋 Web User fields:', Object.keys(webUser || {}).join(', '));
    console.log('');

    // Test 3: Postman mobile request
    console.log('📱 Testing Postman Mobile Request...');
    const postmanMobileResponse = await makeRequest(
      '/auth/login',
      'POST',
      testUser,
      'PostmanRuntime/7.32.3 Mobile/15E148'
    );

    console.log('✅ Postman Mobile Response Status:', postmanMobileResponse.status);
    console.log('📊 Postman Mobile Response Size:', JSON.stringify(postmanMobileResponse.data).length, 'characters');
    
    const postmanUser = postmanMobileResponse.data.data?.user;
    const postmanHasDynamoFields = postmanUser && (
      postmanUser.PK || postmanUser.SK || postmanUser.GSI1PK || 
      postmanUser.GSI1SK || postmanUser.GSI2PK || postmanUser.GSI3PK
    );
    
    console.log('🔍 Postman Mobile has DynamoDB fields:', postmanHasDynamoFields ? '❌ YES (BAD)' : '✅ NO (GOOD)');
    console.log('📋 Postman Mobile User fields:', Object.keys(postmanUser || {}).join(', '));
    console.log('');

    // Test 4: Mobile app User-Agent (common patterns)
    console.log('📱 Testing Mobile App User-Agent...');
    const mobileAppResponse = await makeRequest(
      '/auth/login',
      'POST',
      testUser,
      'EventsMobileApp/1.0 (Android; API 30; Build/1.0.0)'
    );

    console.log('✅ Mobile App Response Status:', mobileAppResponse.status);
    console.log('📊 Mobile App Response Size:', JSON.stringify(mobileAppResponse.data).length, 'characters');
    
    const mobileAppUser = mobileAppResponse.data.data?.user;
    const mobileAppHasDynamoFields = mobileAppUser && (
      mobileAppUser.PK || mobileAppUser.SK || mobileAppUser.GSI1PK || 
      mobileAppUser.GSI1SK || mobileAppUser.GSI2PK || mobileAppUser.GSI3PK
    );
    
    console.log('🔍 Mobile App has DynamoDB fields:', mobileAppHasDynamoFields ? '❌ YES (BAD)' : '✅ NO (GOOD)');
    console.log('📋 Mobile App User fields:', Object.keys(mobileAppUser || {}).join(', '));
    console.log('');

    // Test 5: React Native User-Agent
    console.log('📱 Testing React Native User-Agent...');
    const reactNativeResponse = await makeRequest(
      '/auth/login',
      'POST',
      testUser,
      'ReactNative/0.70.0 (Android; API 30; Build/1.0.0)'
    );

    console.log('✅ React Native Response Status:', reactNativeResponse.status);
    console.log('📊 React Native Response Size:', JSON.stringify(reactNativeResponse.data).length, 'characters');
    
    const reactNativeUser = reactNativeResponse.data.data?.user;
    const reactNativeHasDynamoFields = reactNativeUser && (
      reactNativeUser.PK || reactNativeUser.SK || reactNativeUser.GSI1PK || 
      reactNativeUser.GSI1SK || reactNativeUser.GSI2PK || reactNativeUser.GSI3PK
    );
    
    console.log('🔍 React Native has DynamoDB fields:', reactNativeHasDynamoFields ? '❌ YES (BAD)' : '✅ NO (GOOD)');
    console.log('📋 React Native User fields:', Object.keys(reactNativeUser || {}).join(', '));
    console.log('');

    // Test 6: Test with X-Platform header (mobile app might send this)
    console.log('📱 Testing with X-Platform: mobile header...');
    const xPlatformResponse = await makeRequest(
      '/auth/login',
      'POST',
      testUser,
      'SomeApp/1.0',
      { 'X-Platform': 'mobile' }
    );

    console.log('✅ X-Platform Response Status:', xPlatformResponse.status);
    console.log('📊 X-Platform Response Size:', JSON.stringify(xPlatformResponse.data).length, 'characters');
    
    const xPlatformUser = xPlatformResponse.data.data?.user;
    const xPlatformHasDynamoFields = xPlatformUser && (
      xPlatformUser.PK || xPlatformUser.SK || xPlatformUser.GSI1PK || 
      xPlatformUser.GSI1SK || xPlatformUser.GSI2PK || xPlatformUser.GSI3PK
    );
    
    console.log('🔍 X-Platform has DynamoDB fields:', xPlatformHasDynamoFields ? '❌ YES (BAD)' : '✅ NO (GOOD)');
    console.log('📋 X-Platform User fields:', Object.keys(xPlatformUser || {}).join(', '));
    console.log('');

    // Test 7: Test with X-Client-Type header (mobile app might send this)
    console.log('📱 Testing with X-Client-Type: mobile header...');
    const xClientTypeResponse = await makeRequest(
      '/auth/login',
      'POST',
      testUser,
      'SomeApp/1.0',
      { 'X-Client-Type': 'mobile' }
    );

    console.log('✅ X-Client-Type Response Status:', xClientTypeResponse.status);
    console.log('📊 X-Client-Type Response Size:', JSON.stringify(xClientTypeResponse.data).length, 'characters');
    
    const xClientTypeUser = xClientTypeResponse.data.data?.user;
    const xClientTypeHasDynamoFields = xClientTypeUser && (
      xClientTypeUser.PK || xClientTypeUser.SK || xClientTypeUser.GSI1PK || 
      xClientTypeUser.GSI1SK || xClientTypeUser.GSI2PK || xClientTypeUser.GSI3PK
    );
    
    console.log('🔍 X-Client-Type has DynamoDB fields:', xClientTypeHasDynamoFields ? '❌ YES (BAD)' : '✅ NO (GOOD)');
    console.log('📋 X-Client-Type User fields:', Object.keys(xClientTypeUser || {}).join(', '));
    console.log('');

    // Summary
    console.log('📈 SUMMARY:');
    console.log('Mobile Response Size:', JSON.stringify(mobileResponse.data).length, 'characters');
    console.log('Web Response Size:', JSON.stringify(webResponse.data).length, 'characters');
    console.log('Size Reduction:', Math.round(((JSON.stringify(webResponse.data).length - JSON.stringify(mobileResponse.data).length) / JSON.stringify(webResponse.data).length) * 100), '%');
    
    if (!hasDynamoFields && webHasDynamoFields) {
      console.log('✅ Mobile optimization is working correctly!');
    } else {
      console.log('❌ Mobile optimization needs fixing');
    }

    console.log('\n🔧 DEBUGGING INFO:');
    console.log('To help debug your mobile app, please check:');
    console.log('1. What User-Agent your mobile app is sending');
    console.log('2. If your app sends X-Platform or X-Client-Type headers');
    console.log('3. The CloudWatch logs for the login function to see the detection logic');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMobileOptimization();
