/**
 * ZERO Forensic Analysis
 * Risk-Bounding & Epistemic Control
 * 
 * Pattern: VALIDATION × RISK × TRUTH × ONE
 * Guardians: ZERO × JØHN × AEYON
 * 
 * NO DEPENDENCIES - Pure Node.js
 */

const fs = require('fs');
const path = require('path');

// Risk categories
const RISK_CATEGORIES = {
  'file-operations': {
    patterns: [/fs\.readFileSync/g, /fs\.writeFileSync/g, /fs\.unlinkSync/g],
    severity: 'medium',
    description: 'Synchronous file operations may block event loop'
  },
  'error-handling': {
    patterns: [/try\s*\{/g, /catch\s*\(/g, /throw\s+/g],
    severity: 'low',
    description: 'Error handling patterns'
  },
  'path-traversal': {
    patterns: [/\.\.\//g, /\.\.\\/g, /path\.join.*\.\./g],
    severity: 'high',
    description: 'Potential path traversal vulnerability'
  },
  'eval-danger': {
    patterns: [/eval\(/g, /Function\(/g, /new Function\(/g],
    severity: 'critical',
    description: 'Code execution vulnerability'
  },
  'unsafe-regex': {
    patterns: [/\/.*\+.*\/g/g, /\/.*\*.*\/g/g],
    severity: 'medium',
    description: 'Potential ReDoS vulnerability'
  },
  'hardcoded-secrets': {
    patterns: [/password\s*[:=]\s*['"][^'"]+['"]/g, /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/g],
    severity: 'high',
    description: 'Hardcoded secrets detected'
  },
  'dependency-risk': {
    patterns: [/require\(['"][^'"]+['"]\)/g, /import\s+.*from\s+['"][^'"]+['"]/g],
    severity: 'low',
    description: 'External dependency usage'
  }
};

function analyzeRisk(filePath) {
  const risks = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    Object.entries(RISK_CATEGORIES).forEach(([category, config]) => {
      config.patterns.forEach(pattern => {
        if (pattern.test(line)) {
          // Check if it's a safe usage (e.g., in comments or safe context)
          const isComment = line.trim().startsWith('//') || line.trim().startsWith('*');
          const isString = /['"].*eval.*['"]/.test(line);
          
          if (!isComment && !isString) {
            risks.push({
              file: filePath,
              line: index + 1,
              category,
              severity: config.severity,
              description: config.description,
              code: line.trim()
            });
          }
        }
      });
    });
  });
  
  return risks;
}

function scanDirectory(dirPath) {
  const allRisks = [];
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      const subRisks = scanDirectory(filePath);
      allRisks.push(...subRisks);
    } else if (/\.(ts|js|tsx|jsx)$/.test(file)) {
      try {
        const risks = analyzeRisk(filePath);
        allRisks.push(...risks);
      } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error.message);
      }
    }
  }
  
  return allRisks;
}

function generateReport(risks) {
  const bySeverity = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };
  
  risks.forEach(risk => {
    bySeverity[risk.severity].push(risk);
  });
  
  const total = risks.length;
  const critical = bySeverity.critical.length;
  const high = bySeverity.high.length;
  const medium = bySeverity.medium.length;
  const low = bySeverity.low.length;
  
  return {
    summary: {
      total,
      critical,
      high,
      medium,
      low,
      riskScore: calculateRiskScore(bySeverity)
    },
    risks: bySeverity,
    recommendations: generateRecommendations(bySeverity)
  };
}

function calculateRiskScore(bySeverity) {
  const weights = { critical: 10, high: 5, medium: 2, low: 1 };
  const score = Object.entries(bySeverity).reduce((sum, [severity, risks]) => {
    return sum + (risks.length * weights[severity]);
  }, 0);
  
  // Normalize to 0-100 scale (assuming max reasonable risk)
  return Math.min(100, score);
}

function generateRecommendations(bySeverity) {
  const recommendations = [];
  
  if (bySeverity.critical.length > 0) {
    recommendations.push({
      priority: 'critical',
      action: 'Remove all eval() and Function() constructors',
      reason: 'Code execution vulnerabilities pose critical security risk'
    });
  }
  
  if (bySeverity.high.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Review path operations and hardcoded secrets',
      reason: 'Path traversal and secrets exposure pose high security risk'
    });
  }
  
  if (bySeverity.medium.length > 0) {
    recommendations.push({
      priority: 'medium',
      action: 'Consider async file operations and regex optimization',
      reason: 'Performance and scalability improvements possible'
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'none',
      action: 'No critical risks detected',
      reason: 'Risk profile is acceptable for production'
    });
  }
  
  return recommendations;
}

// CLI usage
if (require.main === module) {
  const targetPath = process.argv[2] || '.';
  
  let risks = [];
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      risks = scanDirectory(targetPath);
    } else {
      risks = analyzeRisk(targetPath);
    }
    
    const report = generateReport(risks);
    
    console.log('\n=== ZERO FORENSIC ANALYSIS ===\n');
    console.log('Risk Summary:');
    console.log(`  Total Risks: ${report.summary.total}`);
    console.log(`  Critical: ${report.summary.critical}`);
    console.log(`  High: ${report.summary.high}`);
    console.log(`  Medium: ${report.summary.medium}`);
    console.log(`  Low: ${report.summary.low}`);
    console.log(`  Risk Score: ${report.summary.riskScore}/100\n`);
    
    if (report.summary.total > 0) {
      console.log('Risk Details:\n');
      
      ['critical', 'high', 'medium', 'low'].forEach(severity => {
        if (report.risks[severity].length > 0) {
          console.log(`[${severity.toUpperCase()}] ${report.risks[severity].length} issues:`);
          report.risks[severity].slice(0, 5).forEach(risk => {
            console.log(`  ${risk.file}:${risk.line} - ${risk.description}`);
            console.log(`    ${risk.code.substring(0, 60)}...`);
          });
          if (report.risks[severity].length > 5) {
            console.log(`  ... and ${report.risks[severity].length - 5} more`);
          }
          console.log('');
        }
      });
      
      console.log('Recommendations:\n');
      report.recommendations.forEach(rec => {
        console.log(`[${rec.priority.toUpperCase()}] ${rec.action}`);
        console.log(`  Reason: ${rec.reason}\n`);
      });
    } else {
      console.log('✓ No risks detected. Risk profile is acceptable.\n');
    }
    
    // Exit with error code if critical or high risks found
    if (report.summary.critical > 0 || report.summary.high > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { analyzeRisk, scanDirectory, generateReport };

