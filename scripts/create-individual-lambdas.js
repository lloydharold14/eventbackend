const fs = require('fs');
const path = require('path');

// Create directories for each handler type
const handlerTypes = [
  'userHandlers',
  'eventHandlers', 
  'bookingHandlers',
  'paymentHandlers',
  'notificationHandlers',
  'oauthHandlers',
  'searchHandlers',
  'analyticsHandlers',
  'qrCodeHandlers',
  'validationHandlers'
];

const bundledDir = 'dist/bundled';
const individualDir = 'dist/individual';

// Clean and create individual directory
if (fs.existsSync(individualDir)) {
  fs.rmSync(individualDir, { recursive: true });
}
fs.mkdirSync(individualDir, { recursive: true });

// Copy each bundled file to its own directory
handlerTypes.forEach(handlerType => {
  const sourceFile = path.join(bundledDir, `${handlerType}.js`);
  const targetDir = path.join(individualDir, handlerType);
  const targetFile = path.join(targetDir, 'index.js');
  
  if (fs.existsSync(sourceFile)) {
    // Create directory
    fs.mkdirSync(targetDir, { recursive: true });
    
    // Copy the bundled file
    fs.copyFileSync(sourceFile, targetFile);
    
    console.log(`Created ${targetFile} from ${sourceFile}`);
  }
});

console.log('Individual Lambda creation complete! Use dist/individual for CDK deployment.');
