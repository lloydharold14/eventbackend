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
  'analyticsHandlers'
];

const bundledDir = 'dist/bundled';
const reorganizedDir = 'dist/reorganized';

// Clean and create reorganized directory
if (fs.existsSync(reorganizedDir)) {
  fs.rmSync(reorganizedDir, { recursive: true });
}
fs.mkdirSync(reorganizedDir, { recursive: true });

// Copy each bundled file to its own directory
handlerTypes.forEach(handlerType => {
  const sourceFile = path.join(bundledDir, `${handlerType}.js`);
  const targetDir = path.join(reorganizedDir, handlerType);
  const targetFile = path.join(targetDir, 'index.js');
  
  if (fs.existsSync(sourceFile)) {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(sourceFile, targetFile);
    console.log(`Created ${targetDir}/index.js from ${sourceFile}`);
  }
});

console.log('Reorganization complete! Use dist/reorganized for CDK deployment.');
