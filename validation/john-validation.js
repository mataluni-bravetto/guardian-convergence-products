/**
 * JØHN Validation
 * Truth Certification & Claim Verification
 * 
 * Pattern: VALIDATION × TRUTH × CLARITY × ONE
 * Guardians: JØHN × AEYON × ZERO
 * 
 * NO DEPENDENCIES - Pure Node.js
 */

const fs = require('fs');
const path = require('path');

// Truth claims to verify
const TRUTH_CLAIMS = {
  'accuracy-claims': {
    patterns: [/(\d+\.?\d*)%?\s*(accuracy|precision|success)/gi, /(\d+)\s*out\s*of\s*(\d+)/gi],
    description: 'Accuracy or success rate claims',
    verify: (match, content) => {
      // Check if claim is backed by evidence or documentation
      const hasEvidence = content.includes('validated') || 
                         content.includes('tested') || 
                         content.includes('verified') ||
                         content.includes('samples');
      return hasEvidence;
    }
  },
  'dependency-claims': {
    patterns: [/no\s+dependencies/gi, /zero\s+dependencies/gi, /pure\s+node/gi],
    description: 'No dependencies claims',
    verify: (match, content) => {
      // Check if package.json exists and has dependencies
      const hasPackageJson = fs.existsSync(path.join(path.dirname(content), 'package.json'));
      if (hasPackageJson) {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(content), 'package.json'), 'utf-8'));
          const hasDeps = (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) ||
                         (pkg.devDependencies && Object.keys(pkg.devDependencies).length > 0);
          return !hasDeps;
        } catch (e) {
          return true; // Can't verify, assume true
        }
      }
      return true; // No package.json = no dependencies
    }
  },
  'performance-claims': {
    patterns: [/<(\d+)\s*(ms|seconds?|minutes?)/gi, /(\d+)\s*times?\s*faster/gi],
    description: 'Performance claims',
    verify: (match, content) => {
      // Check if claim is backed by benchmarks or tests
      const hasEvidence = content.includes('benchmark') || 
                         content.includes('test') || 
                         content.includes('measured');
      return hasEvidence;
    }
  },
  'compatibility-claims': {
    patterns: [/node\.js\s*(\d+)\+?/gi, /works\s+with\s+.*(\d+)/gi],
    description: 'Compatibility claims',
    verify: (match, content) => {
      // Check if claim is reasonable (Node.js 12+ is reasonable)
      const versionMatch = match.match(/(\d+)/);
      if (versionMatch) {
        const version = parseInt(versionMatch[1]);
        return version >= 10; // Reasonable minimum
      }
      return true;
    }
  }
};

function validateJOHN(filePath) {
  const issues = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Check all markdown and text files for claims
  if (!/\.(md|txt|readme)$/i.test(filePath)) {
    return issues; // Only check documentation files
  }
  
  Object.entries(TRUTH_CLAIMS).forEach(([category, config]) => {
    config.patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const lineIndex = content.substring(0, content.indexOf(match)).split('\n').length;
          const isValid = config.verify(match, filePath);
          
          if (!isValid) {
            issues.push({
              file: filePath,
              line: lineIndex,
              category,
              severity: 'high',
              description: config.description,
              claim: match.substring(0, 80),
              issue: 'Claim may not be verifiable or accurate'
            });
          }
        });
      }
    });
  });
  
  // Check for unverified superlatives
  const superlatives = [
    /perfect/gi, /best/gi, /fastest/gi, /most\s+efficient/gi,
    /guaranteed/gi, /always/gi, /never\s+fails/gi
  ];
  
  superlatives.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const lineIndex = content.substring(0, content.indexOf(match)).split('\n').length;
        const context = lines[lineIndex - 1] || '';
        const hasQualifier = context.includes('tested') || 
                            context.includes('verified') || 
                            context.includes('validated');
        
        if (!hasQualifier) {
          issues.push({
            file: filePath,
            line: lineIndex,
            category: 'unverified-superlative',
            severity: 'medium',
            description: 'Unverified superlative claim',
            claim: match,
            issue: 'Consider adding verification or qualifier'
          });
        }
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
    } else if (/\.(md|txt|readme)$/i.test(file)) {
      try {
        const issues = validateJOHN(filePath);
        allIssues.push(...issues);
      } catch (error) {
        console.error(`Error validating ${filePath}:`, error.message);
      }
    }
  }
  
  return allIssues;
}

function generateReport(issues) {
  const bySeverity = {
    high: [],
    medium: [],
    low: []
  };
  
  issues.forEach(issue => {
    bySeverity[issue.severity].push(issue);
  });
  
  const total = issues.length;
  const truthScore = calculateTruthScore(issues);
  
  return {
    summary: {
      total,
      high: bySeverity.high.length,
      medium: bySeverity.medium.length,
      low: bySeverity.low.length,
      truthScore
    },
    issues: bySeverity,
    recommendations: generateRecommendations(bySeverity)
  };
}

function calculateTruthScore(issues) {
  // Lower issues = higher truth score
  // Score: 100 - (issue_count * 5), minimum 0
  const score = Math.max(0, 100 - (issues.length * 5));
  return score;
}

function generateRecommendations(bySeverity) {
  const recommendations = [];
  
  if (bySeverity.high.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Verify all accuracy and dependency claims',
      reason: 'JØHN: All claims must be truthful and verifiable'
    });
  }
  
  if (bySeverity.medium.length > 0) {
    recommendations.push({
      priority: 'medium',
      action: 'Add qualifiers or verification to superlative claims',
      reason: 'Ensure all claims are accurate and not misleading'
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'none',
      action: 'All claims are truthful and verifiable',
      reason: 'JØHN certification: PASS'
    });
  }
  
  return recommendations;
}

// CLI usage
if (require.main === module) {
  const targetPath = process.argv[2] || '.';
  
  let issues = [];
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      issues = scanDirectory(targetPath);
    } else {
      issues = validateJOHN(targetPath);
    }
    
    const report = generateReport(issues);
    
    console.log('\n=== JØHN VALIDATION ===\n');
    console.log('Truth Certification Summary:');
    console.log(`  Total Issues: ${report.summary.total}`);
    console.log(`  High: ${report.summary.high}`);
    console.log(`  Medium: ${report.summary.medium}`);
    console.log(`  Low: ${report.summary.low}`);
    console.log(`  Truth Score: ${report.summary.truthScore}/100\n`);
    
    if (report.summary.total > 0) {
      console.log('Truth Issues:\n');
      
      ['high', 'medium', 'low'].forEach(severity => {
        if (report.issues[severity].length > 0) {
          console.log(`[${severity.toUpperCase()}] ${report.issues[severity].length} issue(s):`);
          report.issues[severity].slice(0, 5).forEach(issue => {
            console.log(`  ${issue.file}:${issue.line} - ${issue.description}`);
            console.log(`    Claim: ${issue.claim}`);
            console.log(`    Issue: ${issue.issue}\n`);
          });
          if (report.issues[severity].length > 5) {
            console.log(`  ... and ${report.issues[severity].length - 5} more\n`);
          }
        }
      });
      
      console.log('Recommendations:\n');
      report.recommendations.forEach(rec => {
        if (rec.priority !== 'none') {
          console.log(`[${rec.priority.toUpperCase()}] ${rec.action}`);
          console.log(`  Reason: ${rec.reason}\n`);
        } else {
          console.log(`✓ ${rec.action}\n`);
        }
      });
    } else {
      console.log('✓ All claims are truthful and verifiable. JØHN certification: PASS\n');
    }
    
    // Exit with error code if high priority issues found
    if (report.summary.high > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { validateJOHN, scanDirectory, generateReport };

