/**
 * Phantom API Detector
 * Catches hallucinated APIs and non-existent package imports
 * 
 * Pattern: VALIDATION × TRUTH × CLARITY × ONE
 * Guardians: YAGNI × JØHN × AEYON
 * 
 * NO DEPENDENCIES - Pure Node.js
 */

const fs = require('fs');
const path = require('path');

// Known packages (expand as needed)
const KNOWN_PACKAGES = new Set([
  'react', 'vue', 'next', 'express', 'fastapi', 'nodemailer',
  'jsonwebtoken', 'bcrypt', 'axios', 'lodash', 'moment',
  'typescript', 'jest', 'mocha', 'chai', 'node', 'fs', 'path'
]);

// Common phantom API patterns
const PHANTOM_APIS = [
  'validateToken', 'sendNotification', 'authenticateUser',
  'processPayment', 'sendEmail', 'validateEmail',
  'getUserData', 'updateProfile', 'deleteAccount'
];

function detectPhantoms(filePath) {
  const issues = [];
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Check for import statements
    const importMatch = line.match(/import\s+.*from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      const source = importMatch[1];
      
      // Check if it's a package import (not relative)
      if (!source.startsWith('.') && !source.startsWith('/')) {
        const packageName = source.split('/')[0].replace('@', '');
        
        if (!KNOWN_PACKAGES.has(packageName)) {
          issues.push({
            file: filePath,
            line: index + 1,
            type: 'non-existent-package',
            message: `Package "${source}" may not exist`,
            suggestion: `Verify: npm search ${packageName}`
          });
        }
      }
    }
    
    // Check for require statements
    const requireMatch = line.match(/require\(['"]([^'"]+)['"]\)/);
    if (requireMatch) {
      const source = requireMatch[1];
      if (!source.startsWith('.') && !source.startsWith('/')) {
        const packageName = source.split('/')[0].replace('@', '');
        if (!KNOWN_PACKAGES.has(packageName)) {
          issues.push({
            file: filePath,
            line: index + 1,
            type: 'non-existent-package',
            message: `Package "${source}" may not exist`,
            suggestion: `Verify: npm search ${packageName}`
          });
        }
      }
    }
    
    // Check for phantom API calls
    PHANTOM_APIS.forEach(api => {
      const regex = new RegExp(`\\b${api}\\s*\\(`, 'g');
      if (regex.test(line)) {
        // Check if it's actually imported/defined
        const hasImport = content.includes(`import.*${api}`) || 
                         content.includes(`const.*${api}`) ||
                         content.includes(`function.*${api}`);
        
        if (!hasImport) {
          issues.push({
            file: filePath,
            line: index + 1,
            type: 'phantom-api',
            message: `Possible phantom API: ${api}`,
            suggestion: 'Verify API exists and is imported correctly'
          });
        }
      }
    });
  });
  
  return issues;
}

function scanDirectory(dirPath) {
  const allIssues = [];
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      const subIssues = scanDirectory(filePath);
      allIssues.push(...subIssues);
    } else if (/\.(ts|js|tsx|jsx)$/.test(file)) {
      try {
        const issues = detectPhantoms(filePath);
        allIssues.push(...issues);
      } catch (error) {
        console.error(`Error scanning ${filePath}:`, error.message);
      }
    }
  }
  
  return allIssues;
}

// CLI usage
if (require.main === module) {
  const targetPath = process.argv[2];
  
  if (!targetPath) {
    console.error('Usage: node phantom-detector.js <path-to-file-or-directory>');
    console.error('Example: node phantom-detector.js src/');
    process.exit(1);
  }
  
  // Check if path exists
  if (!fs.existsSync(targetPath)) {
    console.error(`Error: Path "${targetPath}" does not exist.`);
    process.exit(1);
  }
  
  const stat = fs.statSync(targetPath);
  let issues = [];
  
  try {
    if (stat.isDirectory()) {
      issues = scanDirectory(targetPath);
    } else {
      issues = detectPhantoms(targetPath);
    }
  } catch (error) {
    console.error(`Error scanning ${targetPath}:`, error.message);
    process.exit(1);
  }
  
  if (issues.length > 0) {
    console.log(`Found ${issues.length} potential phantom API issues:\n`);
    issues.forEach(issue => {
      console.log(`${issue.file}:${issue.line}`);
      console.log(`  ${issue.message}`);
      if (issue.suggestion) {
        console.log(`  → ${issue.suggestion}`);
      }
      console.log('');
    });
    process.exit(1);
  } else {
    console.log('✓ No phantom API issues found.');
    process.exit(0);
  }
}

module.exports = { detectPhantoms, scanDirectory };

