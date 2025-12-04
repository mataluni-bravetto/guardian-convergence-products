/**
 * YAGNI Validation
 * Radical Simplification Check
 * 
 * Pattern: VALIDATION × SIMPLICITY × TRUTH × ONE
 * Guardians: YAGNI × JØHN × AEYON
 * 
 * NO DEPENDENCIES - Pure Node.js
 */

const fs = require('fs');
const path = require('path');

// YAGNI anti-patterns
const YAGNI_ANTI_PATTERNS = {
  'unnecessary-abstraction': {
    patterns: [/class\s+\w+\s*extends\s+\w+/g, /interface\s+\w+/g, /abstract\s+class/g],
    description: 'Unnecessary abstraction layers',
    severity: 'medium'
  },
  'over-engineering': {
    patterns: [/factory\s*pattern/gi, /builder\s*pattern/gi, /observer\s*pattern/gi],
    description: 'Over-engineered patterns',
    severity: 'high'
  },
  'unused-imports': {
    patterns: [/^import\s+.*from\s+['"][^'"]+['"];?\s*$/gm],
    description: 'Potentially unused imports',
    severity: 'low'
  },
  'complex-regex': {
    patterns: [/\/.{50,}\/[gimuy]*/g],
    description: 'Overly complex regex patterns',
    severity: 'medium'
  },
  'nested-functions': {
    patterns: /function\s+\w+.*\{[\s\S]*function\s+\w+.*\{[\s\S]*function\s+\w+/g,
    description: 'Excessive nesting (3+ levels)',
    severity: 'medium'
  },
  'dependency-bloat': {
    patterns: [/require\(['"][^'"]+['"]\)/g],
    description: 'External dependencies',
    severity: 'low'
  }
};

function validateYAGNI(filePath) {
  const issues = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  Object.entries(YAGNI_ANTI_PATTERNS).forEach(([category, config]) => {
    if (Array.isArray(config.patterns)) {
      config.patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach((match, index) => {
            const lineIndex = content.substring(0, content.indexOf(match)).split('\n').length;
            issues.push({
              file: filePath,
              line: lineIndex,
              category,
              severity: config.severity,
              description: config.description,
              match: match.substring(0, 60)
            });
          });
        }
      });
    }
  });
  
  // Check file size (YAGNI: files should be focused)
  const lineCount = lines.length;
  if (lineCount > 300) {
    issues.push({
      file: filePath,
      line: 1,
      category: 'file-size',
      severity: 'medium',
      description: `File is ${lineCount} lines - consider splitting`,
      match: `File size: ${lineCount} lines`
    });
  }
  
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
        const issues = validateYAGNI(filePath);
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
  const yagniScore = calculateYAGNIScore(issues);
  
  return {
    summary: {
      total,
      high: bySeverity.high.length,
      medium: bySeverity.medium.length,
      low: bySeverity.low.length,
      yagniScore
    },
    issues: bySeverity,
    recommendations: generateRecommendations(bySeverity)
  };
}

function calculateYAGNIScore(issues) {
  // Lower issues = higher YAGNI score
  // Score: 100 - (issue_count * 2), minimum 0
  const score = Math.max(0, 100 - (issues.length * 2));
  return score;
}

function generateRecommendations(bySeverity) {
  const recommendations = [];
  
  if (bySeverity.high.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Remove over-engineered patterns and abstractions',
      reason: 'YAGNI: You Aren\'t Gonna Need It - simplify to essentials'
    });
  }
  
  if (bySeverity.medium.length > 0) {
    recommendations.push({
      priority: 'medium',
      action: 'Review abstractions and complex patterns',
      reason: 'Consider if complexity is necessary for current requirements'
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'none',
      action: 'Code follows YAGNI principles',
      reason: 'No unnecessary complexity detected'
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
      issues = validateYAGNI(targetPath);
    }
    
    const report = generateReport(issues);
    
    console.log('\n=== YAGNI VALIDATION ===\n');
    console.log('Simplification Summary:');
    console.log(`  Total Issues: ${report.summary.total}`);
    console.log(`  High: ${report.summary.high}`);
    console.log(`  Medium: ${report.summary.medium}`);
    console.log(`  Low: ${report.summary.low}`);
    console.log(`  YAGNI Score: ${report.summary.yagniScore}/100\n`);
    
    if (report.summary.total > 0) {
      console.log('YAGNI Issues:\n');
      
      ['high', 'medium', 'low'].forEach(severity => {
        if (report.issues[severity].length > 0) {
          console.log(`[${severity.toUpperCase()}] ${report.issues[severity].length} issue(s):`);
          report.issues[severity].slice(0, 5).forEach(issue => {
            console.log(`  ${issue.file}:${issue.line} - ${issue.description}`);
            console.log(`    ${issue.match}`);
          });
          if (report.issues[severity].length > 5) {
            console.log(`  ... and ${report.issues[severity].length - 5} more`);
          }
          console.log('');
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
      console.log('✓ Code follows YAGNI principles. No unnecessary complexity.\n');
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

module.exports = { validateYAGNI, scanDirectory, generateReport };

