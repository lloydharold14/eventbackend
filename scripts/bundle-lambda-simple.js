const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Creating Simple Lambda Bundles...\n');

// Create directories
const distDir = 'dist/simple';
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Lambda functions to bundle
const lambdaFunctions = [
  {
    entry: 'src/domains/users/handlers/userHandlers.ts',
    outfile: 'dist/simple/userHandlers.js',
    name: 'User Handlers'
  },
  {
    entry: 'src/domains/users/handlers/oauthHandlers.ts',
    outfile: 'dist/simple/oauthHandlers.js',
    name: 'OAuth Handlers'
  },
  {
    entry: 'src/domains/events/handlers/eventHandlers.ts',
    outfile: 'dist/simple/eventHandlers.js',
    name: 'Event Handlers'
  },
  {
    entry: 'src/domains/bookings/handlers/bookingHandlers.ts',
    outfile: 'dist/simple/bookingHandlers.js',
    name: 'Booking Handlers'
  },
  {
    entry: 'src/domains/payments/handlers/paymentHandlers.ts',
    outfile: 'dist/simple/paymentHandlers.js',
    name: 'Payment Handlers'
  },
  {
    entry: 'src/domains/notifications/handlers/notificationHandlers.ts',
    outfile: 'dist/simple/notificationHandlers.js',
    name: 'Notification Handlers'
  },
  {
    entry: 'src/domains/analytics/handlers/analyticsHandlers.ts',
    outfile: 'dist/simple/analyticsHandlers.js',
    name: 'Analytics Handlers'
  },
  {
    entry: 'src/domains/search/handlers/searchHandlers.ts',
    outfile: 'dist/simple/searchHandlers.js',
    name: 'Search Handlers'
  },
  {
    entry: 'src/domains/qr-codes/handlers/qrCodeHandlers.ts',
    outfile: 'dist/simple/qrCodeHandlers.js',
    name: 'QR Code Handlers'
  },
  {
    entry: 'src/domains/validation/handlers/validationHandlers.ts',
    outfile: 'dist/simple/validationHandlers.js',
    name: 'Validation Handlers'
  }
];

// Bundle each Lambda function with all dependencies
lambdaFunctions.forEach(({ entry, outfile, name }) => {
  try {
    console.log(`📦 Bundling ${name}...`);
    
    // Bundle with all dependencies except AWS SDK
    const command = `npx esbuild ${entry} --bundle --platform=node --target=node18 --outfile=${outfile} --external:aws-sdk --external:@aws-sdk/* --minify`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✅ ${name} bundled successfully: ${outfile}\n`);
  } catch (error) {
    console.error(`❌ Failed to bundle ${name}:`, error.message);
  }
});

console.log('🎉 Simple Lambda Bundles creation complete!');
console.log('\n📁 Created files:');
console.log('   - dist/simple/ (All handler files with dependencies bundled)');

console.log('\n💡 Next steps:');
console.log('1. Update CDK stack to use simple bundled files');
console.log('2. Deploy updated Lambda functions');
console.log('3. Test the API endpoints');
