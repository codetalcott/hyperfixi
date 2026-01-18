#!/usr/bin/env node
/**
 * Parse Failure Analysis Tool
 *
 * Analyzes parse failures to identify patterns and suggest fixes
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { FailureAnalyzer } from '../validators/parse-diagnostics';
import type { TestResults, ParseResult, LanguageCode } from '../types';

interface AnalysisOptions {
  language: LanguageCode | undefined;
  verbose: boolean;
  outputFile: string | undefined;
}

/**
 * Parse command-line arguments
 */
function parseArgs(): AnalysisOptions {
  const args = process.argv.slice(2);
  const options: AnalysisOptions = {
    language: undefined,
    verbose: false,
    outputFile: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--language':
      case '-l': {
        const lang = args[++i];
        if (lang) options.language = lang as LanguageCode;
        break;
      }

      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      case '--output':
      case '-o': {
        const file = args[++i];
        if (file) options.outputFile = file;
        break;
      }

      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Parse Failure Analysis Tool

Analyzes test results to identify failure patterns and suggest improvements.

USAGE:
  npm run analyze-failures [OPTIONS]

OPTIONS:
  -l, --language <code>    Analyze specific language only
  -v, --verbose            Show detailed output
  -o, --output <file>      Write report to file
  -h, --help               Show this help message

EXAMPLES:
  # Analyze all failures
  npm run analyze-failures

  # Analyze Japanese failures with verbose output
  npm run analyze-failures -- --language ja --verbose

  # Generate report file
  npm run analyze-failures -- --output failure-analysis.md
`);
}

/**
 * Load test results
 */
function loadResults(): TestResults | undefined {
  const resultsPath = join(process.cwd(), 'test-results', 'results.json');

  if (!existsSync(resultsPath)) {
    console.error('Error: No test results found at:', resultsPath);
    console.error('Run tests first: npm run test:multilingual -- --full');
    return undefined;
  }

  const data = readFileSync(resultsPath, 'utf-8');
  return JSON.parse(data);
}

/**
 * Extract all parse results from test results
 */
function extractParseResults(
  results: TestResults,
  language: LanguageCode | undefined
): ParseResult[] {
  let allResults: ParseResult[] = [];

  for (const langResult of results.languageResults) {
    if (language && langResult.language !== language) continue;
    allResults = allResults.concat(langResult.parseResults);
  }

  return allResults;
}

/**
 * Generate detailed failure breakdown
 */
function generateDetailedBreakdown(analyzer: FailureAnalyzer, results: ParseResult[]): string {
  const failures = results.filter(r => !r.success);
  const byLanguage = analyzer.analyzeByLanguage(results);

  let output = '\n';
  output += '═══════════════════════════════════════════════════════════════\n';
  output += '  DETAILED FAILURE BREAKDOWN\n';
  output += '═══════════════════════════════════════════════════════════════\n\n';

  const sortedLangs = Object.entries(byLanguage)
    .sort(([, a], [, b]) => b.failures - a.failures)
    .filter(([, data]) => data.failures > 0);

  for (const [lang, data] of sortedLangs) {
    const failRate = ((data.failures / data.totalPatterns) * 100).toFixed(1);
    const passRate = (100 - parseFloat(failRate)).toFixed(1);

    output += `\n${lang.toUpperCase()}\n`;
    output += '─'.repeat(60) + '\n';
    output += `  Status: ${data.failures}/${data.totalPatterns} failures (${failRate}% fail, ${passRate}% pass)\n\n`;

    output += '  Common Error Types:\n';
    const errorCounts: Map<string, number> = new Map();
    const langFailures = failures.filter(f => f.pattern.language === lang);

    for (const failure of langFailures) {
      const err = failure.error || 'Unknown';
      errorCounts.set(err, (errorCounts.get(err) || 0) + 1);
    }

    const sortedErrors = Array.from(errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    for (const [error, count] of sortedErrors) {
      const pct = ((count / data.failures) * 100).toFixed(1);
      output += `    - ${error}: ${count} (${pct}%)\n`;
    }

    output += '\n  Problematic Patterns (first 5):\n';
    data.problematicPatterns.slice(0, 5).forEach((pattern: string, i: number) => {
      output += `    ${i + 1}. "${pattern}"\n`;
    });

    output += '\n';
  }

  return output;
}

/**
 * Generate recommendations
 */
function generateRecommendations(analyzer: FailureAnalyzer, results: ParseResult[]): string {
  const failures = results.filter(r => !r.success);
  const patterns = analyzer.identifyFailurePatterns(failures);
  const byLanguage = analyzer.analyzeByLanguage(results);

  let output = '\n';
  output += '═══════════════════════════════════════════════════════════════\n';
  output += '  RECOMMENDATIONS\n';
  output += '═══════════════════════════════════════════════════════════════\n\n';

  // Language-specific recommendations
  const sovLanguages = ['ja', 'ko', 'tr'];
  const vsoLanguages = ['ar'];
  const sovFailures = sovLanguages.filter(
    lang => byLanguage[lang] && byLanguage[lang].failures > byLanguage[lang].totalPatterns * 0.3
  );
  const vsoFailures = vsoLanguages.filter(
    lang => byLanguage[lang] && byLanguage[lang].failures > byLanguage[lang].totalPatterns * 0.3
  );

  if (sovFailures.length > 0) {
    output +=
      '## SOV Language Issues (' + sovFailures.map(l => l.toUpperCase()).join(', ') + ')\n\n';
    output += '  Priority Actions:\n';
    output += '  1. Improve particle detection and positioning\n';
    output += '  2. Enhance verb conjugation recognition\n';
    output += '  3. Add support for complex clause patterns\n\n';
    output += '  Implementation Files:\n';
    output += '  - packages/semantic/src/tokenizers/ja.ts (Japanese)\n';
    output += '  - packages/semantic/src/tokenizers/ko.ts (Korean)\n';
    output += '  - packages/semantic/src/tokenizers/tr.ts (Turkish)\n';
    output += '  - packages/semantic/src/parser/semantic-parser.ts\n\n';
  }

  if (vsoFailures.length > 0) {
    output +=
      '## VSO Language Issues (' + vsoFailures.map(l => l.toUpperCase()).join(', ') + ')\n\n';
    output += '  Priority Actions:\n';
    output += '  1. Implement verb-first pattern matching\n';
    output += '  2. Enhance preposition handling\n';
    output += '  3. Improve right-to-left text processing\n\n';
    output += '  Implementation Files:\n';
    output += '  - packages/semantic/src/tokenizers/ar.ts\n';
    output += '  - packages/semantic/src/parser/semantic-parser.ts\n\n';
  }

  // Pattern-specific recommendations
  output += '## Common Failure Patterns\n\n';

  if (patterns.multiClause > failures.length * 0.2) {
    output += `  ⚠️ Multi-clause patterns: ${patterns.multiClause} failures\n`;
    output += '    → Improve conjunction handling (それから/then/ثم/그러면)\n';
    output += '    → Better clause separation logic\n\n';
  }

  if (patterns.styleProperties > failures.length * 0.15) {
    output += `  ⚠️ Style property access: ${patterns.styleProperties} failures\n`;
    output += '    → Add *property syntax support across all languages\n';
    output += '    → Validate CSS property name recognition\n\n';
  }

  if (patterns.eventModifiers > failures.length * 0.15) {
    output += `  ⚠️ Event modifiers: ${patterns.eventModifiers} failures\n`;
    output += '    → Improve bracket syntax parsing\n';
    output += '    → Add debounced/throttled keyword support\n\n';
  }

  if (patterns.conditionals > failures.length * 0.15) {
    output += `  ⚠️ Conditionals: ${patterns.conditionals} failures\n`;
    output += '    → Enhance if/else block parsing\n';
    output += '    → Add match/conditional keyword recognition\n\n';
  }

  if (patterns.windowEvents > failures.length * 0.1) {
    output += `  ⚠️ Window events: ${patterns.windowEvents} failures\n`;
    output += '    → Add window/document scope handling\n';
    output += '    → Validate event target resolution\n\n';
  }

  if (patterns.complexSelectors > failures.length * 0.1) {
    output += `  ⚠️ Complex selectors: ${patterns.complexSelectors} failures\n`;
    output += '    → Improve closest/first/parent selector parsing\n';
    output += '    → Add HTML literal syntax support (<div.class/>)\n\n';
  }

  return output;
}

/**
 * Main analysis function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log('Loading test results...');
  const results = loadResults();
  if (!results) {
    process.exit(1);
  }

  console.log('Analyzing failures...\n');
  const parseResults = extractParseResults(results, options.language);
  const analyzer = new FailureAnalyzer();

  // Generate basic report
  const report = analyzer.generateReport(parseResults);

  // Generate detailed breakdown
  const breakdown = generateDetailedBreakdown(analyzer, parseResults);

  // Generate recommendations
  const recommendations = generateRecommendations(analyzer, parseResults);

  // Combine all sections
  const fullReport = report + breakdown + recommendations;

  // Output
  if (options.outputFile) {
    writeFileSync(options.outputFile, fullReport);
    console.log(`Report written to: ${options.outputFile}`);
  } else {
    console.log(fullReport);
  }

  // Summary
  const failures = parseResults.filter(r => !r.success);
  const failRate = ((failures.length / parseResults.length) * 100).toFixed(1);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ANALYSIS COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`  Analyzed: ${parseResults.length} patterns`);
  console.log(`  Failures: ${failures.length} (${failRate}%)`);
  console.log(`  Languages: ${options.language || 'all'}`);
  console.log();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

export { main, parseArgs, showHelp };
