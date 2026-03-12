#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function calculateHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

function checkIntegrity() {
  log('\n🔍 Checking Frontend Integrity...', 'blue');
  log('━'.repeat(60), 'blue');
  
  // Load lock file
  const lockFilePath = path.join(__dirname, '.frontendlock');
  
  if (!fs.existsSync(lockFilePath)) {
    log('❌ Lock file not found!', 'red');
    return 2;
  }
  
  const lockData = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
  
  // Check each protected file
  for (const [filePath, fileInfo] of Object.entries(lockData.protected_files)) {
    log(`\n📄 Checking: ${filePath}`, 'blue');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      log(`   ❌ File not found!`, 'red');
      return 1;
    }
    
    // Calculate current hash
    const currentHash = calculateHash(filePath);
    const expectedHash = fileInfo.sha256;
    
    log(`   Expected: ${expectedHash.substring(0, 16)}...`, 'blue');
    log(`   Current:  ${currentHash.substring(0, 16)}...`, 'blue');
    
    // Compare hashes
    if (currentHash === expectedHash) {
      log(`   ✅ Intact`, 'green');
    } else {
      log(`   ❌ MODIFIED!`, 'red');
      log('\n━'.repeat(60), 'red');
      log(`❌ FAILED - Frontend modified!`, 'red');
      return 1;
    }
  }
  
  // Success
  log('\n' + '━'.repeat(60), 'blue');
  log(`✅ PASSED - Frontend intact`, 'green');
  log('   Frontend is protected and unchanged.', 'green');
  return 0;
}

// Run check
const exitCode = checkIntegrity();
log('');
process.exit(exitCode);