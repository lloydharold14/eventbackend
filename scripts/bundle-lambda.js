#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Lambda functions to bundle
const lambdaFunctions = [
  {
    entry: 'src/domains/users/handlers/userHandlers.ts',
    outfile: 'dist/bundled/userHandlers.js',
    name: 'User Handlers'
  },
  {
    entry: 'src/domains/users/handlers/oauthHandlers.ts',
    outfile: 'dist/bundled/oauthHandlers.js',
    name: 'OAuth Handlers'
  },
  {
    entry: 'src/domains/events/handlers/eventHandlers.ts',
    outfile: 'dist/bundled/eventHandlers.js',
    name: 'Event Handlers'
  },
  {
    entry: 'src/domains/bookings/handlers/bookingHandlers.ts',
    outfile: 'dist/bundled/bookingHandlers.js',
    name: 'Booking Handlers'
  },
  {
    entry: 'src/domains/payments/handlers/paymentHandlers.ts',
    outfile: 'dist/bundled/paymentHandlers.js',
    name: 'Payment Handlers'
  },
  {
    entry: 'src/domains/notifications/handlers/notificationHandlers.ts',
    outfile: 'dist/bundled/notificationHandlers.js',
    name: 'Notification Handlers'
  },
  {
    entry: 'src/domains/analytics/handlers/analyticsHandlers.ts',
    outfile: 'dist/bundled/analyticsHandlers.js',
    name: 'Analytics Handlers'
  },
  {
    entry: 'src/domains/search/handlers/searchHandlers.ts',
    outfile: 'dist/bundled/searchHandlers.js',
    name: 'Search Handlers'
  }
];

// Create bundled directory
const bundledDir = 'dist/bundled';
if (!fs.existsSync(bundledDir)) {
  fs.mkdirSync(bundledDir, { recursive: true });
}

console.log('🚀 Bundling Lambda functions with dependencies...\n');

// Bundle each Lambda function
lambdaFunctions.forEach(({ entry, outfile, name }) => {
  try {
    console.log(`📦 Bundling ${name}...`);
    
    const command = `npx esbuild ${entry} --bundle --platform=node --target=node18 --outfile=${outfile} --external:aws-sdk --minify`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✅ ${name} bundled successfully: ${outfile}\n`);
  } catch (error) {
    console.error(`❌ Failed to bundle ${name}:`, error.message);
  }
});

console.log('🎉 Lambda bundling complete!');
console.log('\n📁 Bundled files:');
fs.readdirSync(bundledDir).forEach(file => {
  console.log(`   - ${file}`);
});

console.log('\n💡 Next steps:');
console.log('1. Update CDK stack to use bundled files');
console.log('2. Deploy updated Lambda functions');
console.log('3. Test the API endpoints');
