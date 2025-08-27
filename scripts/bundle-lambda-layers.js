#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Lambda functions to bundle (without dependencies)
const lambdaFunctions = [
  {
    entry: 'src/domains/users/handlers/userHandlers.ts',
    outfile: 'dist/layers/handlers/userHandlers.js',
    name: 'User Handlers'
  },
  {
    entry: 'src/domains/users/handlers/oauthHandlers.ts',
    outfile: 'dist/layers/handlers/oauthHandlers.js',
    name: 'OAuth Handlers'
  },
  {
    entry: 'src/domains/events/handlers/eventHandlers.ts',
    outfile: 'dist/layers/handlers/eventHandlers.js',
    name: 'Event Handlers'
  },
  {
    entry: 'src/domains/bookings/handlers/bookingHandlers.ts',
    outfile: 'dist/layers/handlers/bookingHandlers.js',
    name: 'Booking Handlers'
  },
  {
    entry: 'src/domains/payments/handlers/paymentHandlers.ts',
    outfile: 'dist/layers/handlers/paymentHandlers.js',
    name: 'Payment Handlers'
  },
  {
    entry: 'src/domains/notifications/handlers/notificationHandlers.ts',
    outfile: 'dist/layers/handlers/notificationHandlers.js',
    name: 'Notification Handlers'
  },
  {
    entry: 'src/domains/analytics/handlers/analyticsHandlers.ts',
    outfile: 'dist/layers/handlers/analyticsHandlers.js',
    name: 'Analytics Handlers'
  },
  {
    entry: 'src/domains/search/handlers/searchHandlers.ts',
    outfile: 'dist/layers/handlers/searchHandlers.js',
    name: 'Search Handlers'
  },
  {
    entry: 'src/domains/qr-codes/handlers/qrCodeHandlers.ts',
    outfile: 'dist/layers/handlers/qrCodeHandlers.js',
    name: 'QR Code Handlers'
  },
  {
    entry: 'src/domains/validation/handlers/validationHandlers.ts',
    outfile: 'dist/layers/handlers/validationHandlers.js',
    name: 'Validation Handlers'
  }
];

// Create directories
const layersDir = 'dist/layers';
const handlersDir = 'dist/layers/handlers';
const nodeModulesDir = 'dist/layers/nodejs/node_modules';

if (!fs.existsSync(layersDir)) {
  fs.mkdirSync(layersDir, { recursive: true });
}
if (!fs.existsSync(handlersDir)) {
  fs.mkdirSync(handlersDir, { recursive: true });
}
if (!fs.existsSync(nodeModulesDir)) {
  fs.mkdirSync(nodeModulesDir, { recursive: true });
}

console.log('🚀 Creating Lambda Layers and Handlers...\n');

// Bundle each Lambda function without dependencies
lambdaFunctions.forEach(({ entry, outfile, name }) => {
  try {
    console.log(`📦 Bundling ${name}...`);
    
    // Bundle without dependencies (external:aws-sdk and all node_modules)
    const command = `npx esbuild ${entry} --bundle --platform=node --target=node18 --outfile=${outfile} --external:aws-sdk --external:uuid --external:joi --external:qrcode --external:crypto --external:bcryptjs --external:jsonwebtoken --external:node-cron --external:@aws-sdk/* --minify`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✅ ${name} bundled successfully: ${outfile}\n`);
  } catch (error) {
    console.error(`❌ Failed to bundle ${name}:`, error.message);
  }
});

// Copy essential dependencies to the layer
console.log('📦 Creating Lambda Layer with dependencies...');

const dependencies = [
  'uuid',
  'joi', 
  'qrcode',
  'bcryptjs',
  'jsonwebtoken',
  'jws',
  'safe-buffer',
  'jwa',
  'ecdsa-sig-formatter',
  'buffer-equal-constant-time',
  'lodash.includes',
  'lodash.isboolean',
  'lodash.isinteger',
  'lodash.isnumber',
  'lodash.isplainobject',
  'lodash.isstring',
  'lodash.once',
  'ms',
  'semver',
  '@hapi/hoek'
];

// Copy dependencies from node_modules to the layer
dependencies.forEach(dep => {
  const sourcePath = `node_modules/${dep}`;
  const targetPath = `${nodeModulesDir}/${dep}`;
  
  if (fs.existsSync(sourcePath)) {
    try {
      // Copy the dependency
      execSync(`cp -r ${sourcePath} ${targetPath}`, { stdio: 'inherit' });
      console.log(`✅ Copied ${dep} to layer`);
    } catch (error) {
      console.error(`❌ Failed to copy ${dep}:`, error.message);
    }
  } else {
    console.warn(`⚠️  Dependency ${dep} not found in node_modules`);
  }
});

// Create package.json for the layer
const layerPackageJson = {
  name: 'event-management-lambda-layer',
  version: '1.0.0',
  description: 'Lambda Layer for Event Management Platform dependencies',
  dependencies: {}
};

// Read the main package.json to get dependency versions
const mainPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

dependencies.forEach(dep => {
  if (mainPackageJson.dependencies && mainPackageJson.dependencies[dep]) {
    layerPackageJson.dependencies[dep] = mainPackageJson.dependencies[dep];
  }
});

fs.writeFileSync(`${layersDir}/nodejs/package.json`, JSON.stringify(layerPackageJson, null, 2));

console.log('\n🎉 Lambda Layers and Handlers creation complete!');
console.log('\n📁 Created files:');
console.log('   - dist/layers/nodejs/node_modules/ (Lambda Layer with dependencies)');
console.log('   - dist/layers/handlers/ (Handler files without dependencies)');

console.log('\n💡 Next steps:');
console.log('1. Update CDK stack to use Lambda Layers');
console.log('2. Deploy updated Lambda functions');
console.log('3. Test the API endpoints');
