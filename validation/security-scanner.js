/**
 * Security Scanner
 * OWASP Top 10 pattern detection
 * 
 * Pattern: VALIDATION × TRUTH × CLARITY × ONE
 * Guardians: YAGNI × JØHN × AEYON
 * 
 * NO DEPENDENCIES - Pure Node.js
 */

const fs = require('fs');
const path = require('path');

// Security patterns
const SQL_INJECTION_PATTERNS = [
  /\$\{.*\}/g,
  /\+.*req\.(params|query|body)/g,
  /`SELECT.*\$\{/g,
  /`INSERT.*\$\{/g,
  /`UPDATE.*\$\{/g,
  /`DELETE.*\$\{/g
];

const XSS_PATTERNS = [
  /innerHTML\s*=\s*.*req\./g,
  /dangerouslySetInnerHTML/g,
  /<div>.*\{.*req\./g,
  /document\.write\(.*req\./g
];

const SECRET_PATTERNS = [
  /['"]sk_live_[a-zA-Z0-9]{20,}['"]/g,
  /['"]sk_test_[a-zA-Z0-9]{20,}['"]/g,
  /['"]AIza[0-9A-Za-z_-]{35}['"]/g,
  /password\s*[:=]\s*['"][^'"]+['"]/g,
  /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/g,
  /secret\s*[:=]\s*['"][^'"]+['"]/g
];

function scanSecurity(filePath) {
  const issues = [];
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // SQL Injection detection
    SQL_INJECTION_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        issues.push({
          file: filePath,
          line: index + 1,
          type: 'sql-injection',
          severity: 'high',
          message: 'Potential SQL injection vulnerability',
          suggestion: 'Use parameterized queries or prepared statements'
        });
      }
    });
    
    // XSS detection
    XSS_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        issues.push({
          file: filePath,
          line: index + 1,
          type: 'xss',
          severity: 'high',
          message: 'Potential XSS vulnerability',
          suggestion: 'Sanitize user input and use React\'s built-in escaping'
        });
      }
    });
    
    // Hardcoded secrets detection
    SECRET_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        issues.push({
          file: filePath,
          line: index + 1,
          type: 'hardcoded-secret',
          severity: 'high',
          message: 'Hardcoded secret detected',
          suggestion: 'Move secrets to environment variables'
        });
      }
    });
    
    // Auth bypass patterns
    if (/if\s*\(.*\)\s*\{?\s*return\s+true/g.test(line) && 
        /req\.(user|auth|session)/g.test(line)) {
      issues.push({
        file: filePath,
        line: index + 1,
        type: 'auth-bypass',
        severity: 'high',
        message: 'Potential authentication bypass',
        suggestion: 'Verify authentication logic is secure'
      });
    }
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
        const issues = scanSecurity(filePath);
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
    console.error('Usage: node security-scanner.js <path-to-file-or-directory>');
    console.error('Example: node security-scanner.js src/');
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
      issues = scanSecurity(targetPath);
    }
  } catch (error) {
    console.error(`Error scanning ${targetPath}:`, error.message);
    process.exit(1);
  }
  
  if (issues.length > 0) {
    console.log(`Found ${issues.length} security issues:\n`);
    issues.forEach(issue => {
      console.log(`[${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}`);
      console.log(`  ${issue.message}`);
      console.log(`  → ${issue.suggestion}`);
      console.log('');
    });
    process.exit(1);
  } else {
    console.log('✓ No security issues found.');
    process.exit(0);
  }
}

module.exports = { scanSecurity, scanDirectory };

