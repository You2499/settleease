#!/usr/bin/env node

/**
 * Security verification script for SettleEase
 * Checks for common security issues before deployment
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let hasErrors = false;
let hasWarnings = false;

function error(message) {
  console.error(`${RED}✗ ERROR: ${message}${RESET}`);
  hasErrors = true;
}

function warning(message) {
  console.warn(`${YELLOW}⚠ WARNING: ${message}${RESET}`);
  hasWarnings = true;
}

function success(message) {
  console.log(`${GREEN}✓ ${message}${RESET}`);
}

function checkFile(filePath, shouldExist = true) {
  const exists = fs.existsSync(filePath);
  if (shouldExist && !exists) {
    error(`Missing file: ${filePath}`);
    return false;
  }
  if (!shouldExist && exists) {
    error(`File should not exist: ${filePath}`);
    return false;
  }
  return true;
}

function checkFileContent(filePath, pattern, shouldMatch = true, errorMsg) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = pattern.test(content);
  
  if (shouldMatch && !matches) {
    error(errorMsg || `Pattern not found in ${filePath}`);
    return false;
  }
  
  if (!shouldMatch && matches) {
    error(errorMsg || `Pattern should not exist in ${filePath}`);
    return false;
  }
  
  return true;
}

function checkSourceMaps() {
  console.log('\n📦 Checking for source maps...');
  
  const nextDir = path.join(process.cwd(), '.next');
  if (!fs.existsSync(nextDir)) {
    warning('.next directory not found. Run a build first.');
    return;
  }
  
  let mapCount = 0;
  
  function walk(dir) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            walk(filePath);
          } else if (file.endsWith('.map')) {
            mapCount++;
            error(`Source map found: ${filePath}`);
          }
        } catch (err) {
          continue;
        }
      }
    } catch (err) {
      return;
    }
  }
  
  walk(nextDir);
  
  if (mapCount === 0) {
    success('No source maps found in build output');
  } else {
    error(`Found ${mapCount} source map file(s). Run: node scripts/remove-source-maps.js`);
  }
}

function checkEnvironmentVariables() {
  console.log('\n🔐 Checking environment variables...');
  
  const envLocal = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocal)) {
    const content = fs.readFileSync(envLocal, 'utf8');
    
    // Check for sensitive keys that should not be in .env.local
    const sensitivePatterns = [
      { pattern: /CONVEX_DEPLOY_KEY=(?!your_convex_deploy_key_here)/, name: 'CONVEX_DEPLOY_KEY' },
      { pattern: /GEMINI_API_KEY=(?!your_gemini_api_key_here)/, name: 'GEMINI_API_KEY' },
      { pattern: /-----BEGIN PRIVATE KEY-----/, name: 'Private Key' },
    ];
    
    for (const { pattern, name } of sensitivePatterns) {
      if (pattern.test(content)) {
        warning(`${name} found in .env.local - ensure this file is not committed`);
      }
    }
    
    success('Environment variable file checked');
  }
}

function checkGitIgnore() {
  console.log('\n📝 Checking .gitignore...');
  
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (!checkFile(gitignorePath)) {
    return;
  }
  
  const content = fs.readFileSync(gitignorePath, 'utf8');
  const requiredPatterns = [
    { pattern: /\.map/, name: 'Source maps (*.map)' },
    { pattern: /\.env\.local/, name: 'Local environment files' },
    { pattern: /\.next/, name: 'Next.js build directory' },
    { pattern: /node_modules/, name: 'Node modules' },
    { pattern: /\.pem/, name: 'Private key files (*.pem)' },
  ];
  
  for (const { pattern, name } of requiredPatterns) {
    if (pattern.test(content)) {
      success(`${name} is ignored`);
    } else {
      error(`${name} is not in .gitignore`);
    }
  }
}

function checkNextConfig() {
  console.log('\n⚙️  Checking Next.js configuration...');
  
  const configPath = path.join(process.cwd(), 'next.config.ts');
  if (!checkFile(configPath)) {
    return;
  }
  
  const content = fs.readFileSync(configPath, 'utf8');
  
  if (content.includes('productionBrowserSourceMaps: false')) {
    success('Production source maps are disabled');
  } else {
    error('Production source maps are not explicitly disabled');
  }
  
  if (content.includes('Strict-Transport-Security')) {
    success('Security headers are configured');
  } else {
    warning('Security headers may not be configured');
  }
}

function checkDependencies() {
  console.log('\n📚 Checking dependencies...');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!checkFile(packagePath)) {
    return;
  }
  
  console.log('Run "npm audit" to check for known vulnerabilities');
  success('package.json found');
}

function checkCommittedSecrets() {
  console.log('\n🔍 Checking for committed secrets...');
  
  const sensitiveFiles = [
    '.env.local',
    '.env.production',
    '.convex-jwt-private-key.pem',
  ];
  
  for (const file of sensitiveFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      warning(`Sensitive file exists: ${file} - ensure it's in .gitignore`);
    }
  }
  
  success('Sensitive file check complete');
}

// Run all checks
console.log('🔒 SettleEase Security Check\n');
console.log('═'.repeat(50));

checkNextConfig();
checkGitIgnore();
checkSourceMaps();
checkEnvironmentVariables();
checkDependencies();
checkCommittedSecrets();

console.log('\n' + '═'.repeat(50));

if (hasErrors) {
  console.log(`\n${RED}❌ Security check failed with errors${RESET}`);
  process.exit(1);
} else if (hasWarnings) {
  console.log(`\n${YELLOW}⚠️  Security check passed with warnings${RESET}`);
  process.exit(0);
} else {
  console.log(`\n${GREEN}✅ All security checks passed${RESET}`);
  process.exit(0);
}
