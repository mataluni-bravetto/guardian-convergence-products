/**
 * ALRAX Forensic Analysis
 * Variance Analysis & Pattern Consistency
 * 
 * Pattern: VALIDATION × VARIANCE × TRUTH × ONE
 * Guardians: ALRAX × JØHN × AEYON
 * 
 * NO DEPENDENCIES - Pure Node.js
 */

const fs = require('fs');
const path = require('path');

// Consistency patterns to check
const CONSISTENCY_CHECKS = {
  'error-handling': {
    patterns: {
      'try-catch': /try\s*\{[\s\S]*?\}\s*catch/g,
      'error-messages': /console\.(error|log)\(['"].*error['"]/gi,
      'exit-codes': /process\.exit\(\d+\)/g
    },
    description: 'Error handling consistency'
  },
  'file-operations': {
    patterns: {
      'readFile': /fs\.readFileSync/g,
      'writeFile': /fs\.writeFileSync/g,
      'stat': /fs\.statSync/g
    },
    description: 'File operation patterns'
  },
  'code-style': {
    patterns: {
      'arrow-functions': /const\s+\w+\s*=\s*\([^)]*\)\s*=>/g,
      'function-declarations': /function\s+\w+\s*\(/g,
      'module-exports': /module\.exports\s*=/g,
      'require-statements': /require\(['"][^'"]+['"]\)/g
    },
    description: 'Code style consistency'
  },
  'documentation': {
    patterns: {
      'comments': /\/\/.*/g,
      'jsdoc': /\/\*\*[\s\S]*?\*\//g,
      'headers': /\/\*\*[\s\S]{0,200}Pattern:/g
    },
    description: 'Documentation patterns'
  }
};

function analyzeVariance(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const variances = [];
  
  Object.entries(CONSISTENCY_CHECKS).forEach(([category, config]) => {
    const foundPatterns = {};
    
    Object.entries(config.patterns).forEach(([patternName, pattern]) => {
      const matches = content.match(pattern);
      if (matches) {
        foundPatterns[patternName] = matches.length;
      } else {
        foundPatterns[patternName] = 0;
      }
    });
    
    // Check for variance (multiple patterns used when one should be consistent)
    const patternCounts = Object.values(foundPatterns).filter(count => count > 0);
    if (patternCounts.length > 1) {
      variances.push({
        file: filePath,
        category,
        description: config.description,
        patterns: foundPatterns,
        variance: patternCounts.length,
        recommendation: `Standardize on one pattern for ${config.description}`
      });
    }
  });
  
  return variances;
}

function scanDirectory(dirPath) {
  const allVariances = [];
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      const subVariances = scanDirectory(filePath);
      allVariances.push(...subVariances);
    } else if (/\.(ts|js|tsx|jsx)$/.test(file)) {
      try {
        const variances = analyzeVariance(filePath);
        allVariances.push(...variances);
      } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error.message);
      }
    }
  }
  
  return allVariances;
}

function calculateConsistencyScore(variances) {
  // Lower variance = higher consistency
  // Score: 100 - (variance_count * 10), minimum 0
  const score = Math.max(0, 100 - (variances.length * 10));
  return score;
}

function generateReport(variances) {
  const byCategory = {};
  
  variances.forEach(variance => {
    if (!byCategory[variance.category]) {
      byCategory[variance.category] = [];
    }
    byCategory[variance.category].push(variance);
  });
  
  const consistencyScore = calculateConsistencyScore(variances);
  
  return {
    summary: {
      totalVariances: variances.length,
      categories: Object.keys(byCategory).length,
      consistencyScore
    },
    variances: byCategory,
    recommendations: generateRecommendations(variances)
  };
}

function generateRecommendations(variances) {
  const recommendations = [];
  const categoryCounts = {};
  
  variances.forEach(v => {
    categoryCounts[v.category] = (categoryCounts[v.category] || 0) + 1;
  });
  
  Object.entries(categoryCounts).forEach(([category, count]) => {
    recommendations.push({
      category,
      count,
      action: `Standardize ${category} patterns across all files`,
      priority: count > 2 ? 'high' : 'medium'
    });
  });
  
  if (recommendations.length === 0) {
    recommendations.push({
      category: 'none',
      count: 0,
      action: 'No variance issues detected',
      priority: 'none'
    });
  }
  
  return recommendations;
}

// CLI usage
if (require.main === module) {
  const targetPath = process.argv[2] || '.';
  
  let variances = [];
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      variances = scanDirectory(targetPath);
    } else {
      variances = analyzeVariance(targetPath);
    }
    
    const report = generateReport(variances);
    
    console.log('\n=== ALRAX FORENSIC ANALYSIS ===\n');
    console.log('Variance Summary:');
    console.log(`  Total Variances: ${report.summary.totalVariances}`);
    console.log(`  Categories Affected: ${report.summary.categories}`);
    console.log(`  Consistency Score: ${report.summary.consistencyScore}/100\n`);
    
    if (report.summary.totalVariances > 0) {
      console.log('Variance Details:\n');
      
      Object.entries(report.variances).forEach(([category, vars]) => {
        console.log(`[${category.toUpperCase()}] ${vars.length} variance(s):`);
        vars.forEach(v => {
          console.log(`  ${v.file}`);
          console.log(`    ${v.description}`);
          console.log(`    Patterns found: ${Object.entries(v.patterns).map(([p, c]) => `${p}(${c})`).join(', ')}`);
          console.log(`    → ${v.recommendation}\n`);
        });
      });
      
      console.log('Recommendations:\n');
      report.recommendations.forEach(rec => {
        if (rec.priority !== 'none') {
          console.log(`[${rec.priority.toUpperCase()}] ${rec.action}`);
          console.log(`  Affected: ${rec.count} file(s)\n`);
        } else {
          console.log(`✓ ${rec.action}\n`);
        }
      });
    } else {
      console.log('✓ No variance issues detected. Code is consistent.\n');
    }
    
    // Exit with error code if high priority variances found
    const highPriorityVars = report.recommendations.filter(r => r.priority === 'high').length;
    if (highPriorityVars > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { analyzeVariance, scanDirectory, generateReport };

