#!/usr/bin/env node

/**
 * Remove all source map files from the build output
 * This ensures no source maps are deployed to production
 */

const fs = require('fs');
const path = require('path');

function removeSourceMaps(dir) {
  let count = 0;
  
  function walk(directory) {
    try {
      const files = fs.readdirSync(directory);
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        
        try {
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            walk(filePath);
          } else if (file.endsWith('.map')) {
            fs.unlinkSync(filePath);
            count++;
            console.log(`Removed: ${filePath}`);
          }
        } catch (err) {
          // Skip files we can't access
          continue;
        }
      }
    } catch (err) {
      // Skip directories we can't access
      return;
    }
  }
  
  walk(dir);
  return count;
}

const buildDir = path.join(process.cwd(), '.next');

if (!fs.existsSync(buildDir)) {
  console.log('No .next directory found. Skipping source map removal.');
  process.exit(0);
}

console.log('Removing source maps from build output...');
const removed = removeSourceMaps(buildDir);
console.log(`✓ Removed ${removed} source map file(s)`);
