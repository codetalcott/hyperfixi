#!/usr/bin/env npx tsx
/**
 * Expression Type Coverage Analyzer
 *
 * Validates that expression evaluators use the type registry
 * and reports coverage gaps.
 *
 * Part of the napi-rs-inspired patterns implementation.
 *
 * Usage:
 *   npx tsx scripts/analyze-expression-types.ts
 *   npx tsx scripts/analyze-expression-types.ts --verbose   # Detailed output
 *   npx tsx scripts/analyze-expression-types.ts --json      # JSON output
 *   npx tsx scripts/analyze-expression-types.ts --strict    # Exit 1 if coverage < 80%
 */

import * as fs from 'fs';
import * as path from 'path';
import { expressionTypeRegistry } from '../src/expressions/type-registry';

// ============================================================================
// Types
// ============================================================================

interface ExpressionFileAnalysis {
  path: string;
  relativePath: string;
  category: string;
  usesRegistry: boolean;
  registryImports: string[];
  typeChecks: TypeCheckInfo[];
  typeCoercions: TypeCoercionInfo[];
  suggestions: string[];
  linesOfCode: number;
}

interface TypeCheckInfo {
  line: number;
  pattern: string;
  suggestion?: string;
}

interface TypeCoercionInfo {
  line: number;
  pattern: string;
  coercion: string;
}

interface AnalysisReport {
  timestamp: string;
  totalFiles: number;
  filesUsingRegistry: number;
  coveragePercentage: number;
  registryStats: {
    typeCount: number;
    typeNames: string[];
  };
  filesByCategory: Record<string, ExpressionFileAnalysis[]>;
  suggestions: {
    file: string;
    suggestions: string[];
  }[];
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Find all expression implementation files
 */
function findExpressionFiles(baseDir: string): string[] {
  const files: string[] = [];
  const expressionsDir = path.join(baseDir, 'src/expressions');

  if (!fs.existsSync(expressionsDir)) {
    return files;
  }

  // Get all subdirectories (categories)
  const categories = fs.readdirSync(expressionsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const category of categories) {
    const categoryDir = path.join(expressionsDir, category);
    const indexFile = path.join(categoryDir, 'index.ts');

    if (fs.existsSync(indexFile)) {
      files.push(indexFile);
    }

    // Also check for impl directories
    const implDir = path.join(categoryDir, 'impl');
    if (fs.existsSync(implDir)) {
      const implFiles = fs.readdirSync(implDir)
        .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))
        .map(f => path.join(implDir, f));
      files.push(...implFiles);
    }
  }

  return files;
}

/**
 * Analyze a single expression file
 */
function analyzeFile(filePath: string, baseDir: string): ExpressionFileAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(baseDir, filePath);
  const category = relativePath.split(path.sep)[2] || 'unknown'; // src/expressions/<category>/...

  // Check for type registry imports
  const registryImports: string[] = [];
  const registryPatterns = [
    /from ['"].*type-registry['"]/,
    /expressionTypeRegistry/,
    /inferType/,
    /coerce[A-Z]/,
    /getHyperScriptType/,
  ];

  let usesRegistry = false;
  for (const pattern of registryPatterns) {
    if (pattern.test(content)) {
      usesRegistry = true;
      const match = content.match(pattern);
      if (match) {
        registryImports.push(match[0]);
      }
    }
  }

  // Find inline type checks that could use registry
  const typeChecks: TypeCheckInfo[] = [];
  const typeCheckPatterns = [
    { regex: /typeof\s+\w+\s*===?\s*['"]string['"]/g, suggestion: 'Consider using registry.get("String").isType(value)' },
    { regex: /typeof\s+\w+\s*===?\s*['"]number['"]/g, suggestion: 'Consider using registry.get("Number").isType(value)' },
    { regex: /typeof\s+\w+\s*===?\s*['"]boolean['"]/g, suggestion: 'Consider using registry.get("Boolean").isType(value)' },
    { regex: /typeof\s+\w+\s*===?\s*['"]object['"]/g, suggestion: 'Consider using registry.get("Object").isType(value)' },
    { regex: /typeof\s+\w+\s*===?\s*['"]function['"]/g, suggestion: 'Consider using registry.get("Function").isType(value)' },
    { regex: /instanceof\s+Array/g, suggestion: 'Consider using registry.get("Array").isType(value)' },
    { regex: /Array\.isArray\(/g, suggestion: 'Consider using registry.get("Array").isType(value)' },
    { regex: /instanceof\s+Element/g, suggestion: 'Consider using registry.get("Element").isType(value)' },
    { regex: /instanceof\s+HTMLElement/g, suggestion: 'Consider using registry.get("Element").isType(value)' },
    { regex: /instanceof\s+NodeList/g, suggestion: 'Consider using registry.get("NodeList").isType(value)' },
    { regex: /instanceof\s+Date/g, suggestion: 'Consider using registry.get("Date").isType(value)' },
  ];

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    for (const { regex, suggestion } of typeCheckPatterns) {
      regex.lastIndex = 0; // Reset regex state
      const matches = line.match(regex);
      if (matches) {
        for (const match of matches) {
          typeChecks.push({
            line: lineNum + 1,
            pattern: match,
            suggestion,
          });
        }
      }
    }
  }

  // Find type coercions
  const typeCoercions: TypeCoercionInfo[] = [];
  const coercionPatterns = [
    { regex: /Number\(\w+\)/g, coercion: 'Number()' },
    { regex: /String\(\w+\)/g, coercion: 'String()' },
    { regex: /Boolean\(\w+\)/g, coercion: 'Boolean()' },
    { regex: /parseInt\(/g, coercion: 'parseInt()' },
    { regex: /parseFloat\(/g, coercion: 'parseFloat()' },
    { regex: /\.toString\(\)/g, coercion: '.toString()' },
  ];

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    for (const { regex, coercion } of coercionPatterns) {
      regex.lastIndex = 0;
      const matches = line.match(regex);
      if (matches) {
        for (const match of matches) {
          typeCoercions.push({
            line: lineNum + 1,
            pattern: match,
            coercion,
          });
        }
      }
    }
  }

  // Generate suggestions
  const suggestions: string[] = [];

  // Only suggest if there are significant type operations and not using registry
  const significantTypeOps = typeChecks.length + typeCoercions.length;
  if (!usesRegistry && significantTypeOps > 5) {
    suggestions.push(`File has ${significantTypeOps} type operations - consider using type registry for consistency`);
  }

  if (typeChecks.length > 3 && !usesRegistry) {
    suggestions.push(`${typeChecks.length} inline type checks could use registry.inferType()`);
  }

  if (typeCoercions.length > 3 && !usesRegistry) {
    suggestions.push(`${typeCoercions.length} type coercions could use registry.coerce()`);
  }

  return {
    path: filePath,
    relativePath,
    category,
    usesRegistry,
    registryImports: [...new Set(registryImports)],
    typeChecks,
    typeCoercions,
    suggestions,
    linesOfCode: lines.length,
  };
}

/**
 * Generate full analysis report
 */
function generateReport(analyses: ExpressionFileAnalysis[]): AnalysisReport {
  const stats = expressionTypeRegistry.getStats();
  const usingRegistry = analyses.filter(a => a.usesRegistry).length;

  // Group by category
  const filesByCategory: Record<string, ExpressionFileAnalysis[]> = {};
  for (const analysis of analyses) {
    if (!filesByCategory[analysis.category]) {
      filesByCategory[analysis.category] = [];
    }
    filesByCategory[analysis.category].push(analysis);
  }

  // Collect suggestions
  const suggestions = analyses
    .filter(a => a.suggestions.length > 0)
    .map(a => ({
      file: a.relativePath,
      suggestions: a.suggestions,
    }));

  return {
    timestamp: new Date().toISOString(),
    totalFiles: analyses.length,
    filesUsingRegistry: usingRegistry,
    coveragePercentage: analyses.length > 0
      ? Math.round((usingRegistry / analyses.length) * 100)
      : 0,
    registryStats: {
      typeCount: stats.typeCount,
      typeNames: stats.typeNames,
    },
    filesByCategory,
    suggestions,
  };
}

// ============================================================================
// Output Functions
// ============================================================================

function printConsoleReport(report: AnalysisReport, verbose: boolean): void {
  console.log('\n========================================');
  console.log('  Expression Type Coverage Report');
  console.log('========================================\n');

  // Summary
  console.log('--- Summary ---\n');
  console.log(`Files analyzed: ${report.totalFiles}`);
  console.log(`Using type registry: ${report.filesUsingRegistry}`);
  console.log(`Coverage: ${report.coveragePercentage}%`);
  console.log('');

  // Registry stats
  console.log('--- Type Registry ---\n');
  console.log(`Registered types: ${report.registryStats.typeCount}`);
  console.log(`Types: ${report.registryStats.typeNames.join(', ')}`);
  console.log('');

  // Coverage by category
  console.log('--- Coverage by Category ---\n');
  for (const [category, files] of Object.entries(report.filesByCategory)) {
    const using = files.filter(f => f.usesRegistry).length;
    const total = files.length;
    const pct = total > 0 ? Math.round((using / total) * 100) : 0;
    const status = pct >= 80 ? '\x1b[32m✓\x1b[0m' : pct >= 50 ? '\x1b[33m⚠\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`  ${status} ${category}: ${using}/${total} (${pct}%)`);
  }
  console.log('');

  // Suggestions
  if (report.suggestions.length > 0) {
    console.log('--- Suggestions ---\n');
    for (const { file, suggestions } of report.suggestions) {
      console.log(`\x1b[33m${file}\x1b[0m`);
      for (const suggestion of suggestions) {
        console.log(`  - ${suggestion}`);
      }
      console.log('');
    }
  }

  // Verbose: Show file details
  if (verbose) {
    console.log('--- File Details ---\n');
    for (const [category, files] of Object.entries(report.filesByCategory)) {
      console.log(`\x1b[36m${category}\x1b[0m:`);
      for (const file of files) {
        const status = file.usesRegistry ? '\x1b[32m✓\x1b[0m' : '\x1b[90m○\x1b[0m';
        console.log(`  ${status} ${file.relativePath}`);
        if (file.registryImports.length > 0) {
          console.log(`    Imports: ${file.registryImports.join(', ')}`);
        }
        if (file.typeChecks.length > 0) {
          console.log(`    Type checks: ${file.typeChecks.length}`);
        }
        if (file.typeCoercions.length > 0) {
          console.log(`    Coercions: ${file.typeCoercions.length}`);
        }
      }
      console.log('');
    }
  }

  // Final status
  console.log('========================================');
  if (report.coveragePercentage >= 80) {
    console.log(`  \x1b[32m✓ Good coverage: ${report.coveragePercentage}%\x1b[0m`);
  } else if (report.coveragePercentage >= 50) {
    console.log(`  \x1b[33m⚠ Fair coverage: ${report.coveragePercentage}%\x1b[0m`);
  } else {
    console.log(`  \x1b[31m✗ Low coverage: ${report.coveragePercentage}%\x1b[0m`);
  }
  console.log('========================================\n');
}

function printJsonReport(report: AnalysisReport): void {
  // Simplify the report for JSON output
  const output = {
    ...report,
    filesByCategory: Object.fromEntries(
      Object.entries(report.filesByCategory).map(([cat, files]) => [
        cat,
        files.map(f => ({
          path: f.relativePath,
          usesRegistry: f.usesRegistry,
          typeChecks: f.typeChecks.length,
          typeCoercions: f.typeCoercions.length,
          linesOfCode: f.linesOfCode,
        })),
      ])
    ),
  };
  console.log(JSON.stringify(output, null, 2));
}

// ============================================================================
// Main
// ============================================================================

const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const jsonOutput = args.includes('--json');
const strict = args.includes('--strict');

const baseDir = process.cwd();
const files = findExpressionFiles(baseDir);
const analyses = files.map(f => analyzeFile(f, baseDir));
const report = generateReport(analyses);

if (jsonOutput) {
  printJsonReport(report);
} else {
  printConsoleReport(report, verbose);
}

// Exit with error if strict mode and coverage < 80%
if (strict && report.coveragePercentage < 80) {
  console.error(`Coverage ${report.coveragePercentage}% is below 80% threshold`);
  process.exit(1);
}
