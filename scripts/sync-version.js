#!/usr/bin/env node

/**
 * Syncs the version number from package.json to README.md
 * This ensures the README always displays the current version
 */

const fs = require('fs');
const path = require('path');

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Read README.md
const readmePath = path.join(__dirname, '..', 'README.md');
const readmeContent = fs.readFileSync(readmePath, 'utf8');

// Replace version in README
// Matches: **Version:** X.X.X
const versionRegex = /(\*\*Version:\*\*\s+)\d+\.\d+\.\d+/;
const updatedContent = readmeContent.replace(versionRegex, `$1${version}`);

// Check if version was found and updated
if (readmeContent === updatedContent) {
  console.log('⚠️  Version pattern not found in README.md or already up to date');
  process.exit(0);
}

// Write updated README
fs.writeFileSync(readmePath, updatedContent, 'utf8');
console.log(`✅ Updated README.md version to ${version}`);
