#!/usr/bin/env node

/**
 * Frontend Integrity Checker
 * 
 * This script verifies that the frontend file has not been modified.
 * Run this regularly during development to ensure frontend protection.
 * 
 * Usage:
 *   node check-frontend-integrity.js
 * 
 * Exit codes:
 *   0 - Frontend intact
 *   1 - Frontend modified (VIOLATION!)
 *   2 - Missing files
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Colors for terminal output
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

function checkFrontendIntegrity() {
  log('\n🔍 Checking Frontend Integrity...', 'blue');
  log('━'.repeat(60), 'blue');
  
  // Load lock file
  const lockFilePath = path.join(__dirname, '.frontendlock');
  
  if (!fs.existsSync(lockFilePath)) {
    log('⚠️  Lock file not found!', 'yellow');
    log('   Creating .frontendlock file...', 'yellow');
    return 2;
  }
  
  const lockData = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
  let violations = [];
  let checks = 0;
  
  // Check each protected file
  for (const [filePath, fileInfo] of Object.entries(lockData.protected_files)) {
    checks++;
    log(`\n📄 Checking: ${filePath}`, 'blue');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      log(`   ❌ File not found!`, 'red');
      violations.push({
        file: filePath,
        issue: 'File deleted or moved'
      });
      continue;
    }
    
    // Calculate current hash
    const currentHash = calculateHash(filePath);
    const expectedHash = fileInfo.sha256;
    
    log(`   Expected: ${expectedHash.substring(0, 16)}...`, 'blue');
    log(`   Current:  ${currentHash.substring(0, 16)}...`, 'blue');
    
    // Compare hashes
    if (currentHash !== expectedHash) {
      log(`   ❌ MODIFIED! (VIOLATION DETECTED)`, 'red');
      violations.push({
        file: filePath,
        issue: 'File content modified',
        expected: expectedHash,
        current: currentHash
      });
    } else {
      log(`   ✅ Intact`, 'green');
    }
    
    // Check file size
    const stats = fs.statSync(filePath);
    const currentSize = stats.size;
    const expectedSize = fileInfo.size_bytes;
    
    if (currentSize !== expectedSize) {
      log(`   ⚠️  Size mismatch (expected: ${expectedSize}, got: ${currentSize})`, 'yellow');
    }
  }
  
  // Report results
  log('\n' + '━'.repeat(60), 'blue');
  
  if (violations.length === 0) {
    log(`✅ PASSED - All ${checks} files intact`, 'green');
    log('   Frontend is protected and unchanged.', 'green');
    return 0;
  } else {
    log(`❌ FAILED - ${violations.length} violation(s) detected!`, 'red');
    log('\n⚠️  FRONTEND PROTECTION VIOLATED!', 'red');
    log('━'.repeat(60), 'red');
    
    violations.forEach((v, i) => {
      log(`\n${i + 1}. ${v.file}`, 'red');
      log(`   Issue: ${v.issue}`, 'red');
    });
    
    log('\n⚠️  ACTION REQUIRED:', 'red');
    log('   1. Restore frontend from backup', 'yellow');
    log('   2. Do NOT modify frontend during backend development', 'yellow');
    log('   3. Frontend is REFERENCE ONLY', 'yellow');
    log('   4. Build backend to serve existing frontend', 'yellow');
    
    return 1;
  }
}

// Run check
const exitCode = checkFrontendIntegrity();
log(''); // Empty line
process.exit(exitCode);
