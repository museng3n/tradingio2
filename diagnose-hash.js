#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');

function calculateHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

console.log('🔍 Frontend Hash Diagnostic\n');

// Read lock file
const lockData = JSON.parse(fs.readFileSync('protection/.frontendlock', 'utf8'));
const expectedHash = lockData.protected_files['frontend/TradingHub-Final-Fixed.html'].sha256;

// Calculate current hash
const currentHash = calculateHash('frontend/TradingHub-Final-Fixed.html');

console.log('Expected Hash:');
console.log(expectedHash);
console.log('\nCurrent Hash:');
console.log(currentHash);
console.log('\nMatch:', expectedHash === currentHash);
console.log('\nExpected length:', expectedHash.length);
console.log('Current length:', currentHash.length);

// Character-by-character comparison
if (expectedHash !== currentHash) {
  console.log('\n❌ Hashes do NOT match!');
  console.log('\nFinding first difference:');
  for (let i = 0; i < Math.max(expectedHash.length, currentHash.length); i++) {
    if (expectedHash[i] !== currentHash[i]) {
      console.log(`Position ${i}: Expected '${expectedHash[i]}' Got '${currentHash[i]}'`);
      console.log(`Expected from ${i}: ${expectedHash.substring(i, i+20)}`);
      console.log(`Current from ${i}: ${currentHash.substring(i, i+20)}`);
      break;
    }
  }
} else {
  console.log('\n✅ Hashes match perfectly!');
}
