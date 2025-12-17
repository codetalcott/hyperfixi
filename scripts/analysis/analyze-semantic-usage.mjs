#!/usr/bin/env node
/**
 * Semantic Usage Analysis Script
 *
 * Scans all HTML examples to determine which semantic constructs are actually used.
 * Parses hyperscript through the semantic layer and generates a usage report.
 *
 * Usage:
 *   node scripts/analyze-semantic-usage.mjs [--json] [--verbose]
 *
 * Output:
 *   - Action frequencies (which commands are used)
 *   - Role frequencies (which semantic roles appear)
 *   - Value type frequencies (selector, literal, reference, etc.)
 *   - Node kind frequencies (command, event-handler, conditional, loop)
 *   - Comparison against all defined actions
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// =============================================================================
// Configuration
// =============================================================================

const EXAMPLES_DIR = join(PROJECT_ROOT, 'examples');
const OUTPUT_FILE = join(PROJECT_ROOT, 'semantic-usage-report.json');

// All defined ActionTypes from packages/semantic/src/types.ts
const ALL_ACTIONS = [
  // Class/Attribute operations
  'toggle', 'add', 'remove',
  // Content operations
  'put', 'append', 'prepend', 'take', 'make', 'clone', 'swap', 'morph',
  // Variable operations
  'set', 'get', 'increment', 'decrement', 'log',
  // Visibility
  'show', 'hide', 'transition',
  // Events
  'on', 'trigger', 'send',
  // DOM focus
  'focus', 'blur',
  // Navigation
  'go',
  // Async
  'wait', 'fetch', 'settle',
  // Animation/Measurement
  'measure',
  // Behavior system
  'install',
  // Control flow
  'if', 'unless', 'else', 'repeat', 'for', 'while', 'continue', 'halt', 'throw', 'call', 'return',
  // Advanced
  'js', 'async', 'tell', 'default', 'init', 'behavior',
  // Meta
  'compound'
];

// All semantic roles (from @hyperfixi/i18n/src/grammar/types)
const ALL_ROLES = [
  'agent', 'patient', 'destination', 'source', 'instrument',
  'beneficiary', 'theme', 'event', 'condition', 'manner',
  'time', 'location', 'purpose', 'amount', 'property'
];

// All value types
const ALL_VALUE_TYPES = ['selector', 'literal', 'reference', 'property-path', 'expression'];

// All node kinds
const ALL_NODE_KINDS = ['command', 'event-handler', 'conditional', 'compound', 'loop'];

// =============================================================================
// Hyperscript Extraction
// =============================================================================

/**
 * Extract hyperscript snippets from HTML content.
 * Looks for _="..." attributes and <script type="text/hyperscript"> blocks.
 */
function extractHyperscript(content, filename) {
  const snippets = [];

  // Extract from _="..." attributes
  const attrRegex = /_="([^"]*)"/g;
  let match;
  while ((match = attrRegex.exec(content)) !== null) {
    if (match[1].trim()) {
      snippets.push({
        code: match[1].trim(),
        source: 'attribute',
        file: filename
      });
    }
  }

  // Extract from <script type="text/hyperscript">
  const scriptRegex = /<script\s+type=["']text\/hyperscript["']>([\s\S]*?)<\/script>/gi;
  while ((match = scriptRegex.exec(content)) !== null) {
    if (match[1].trim()) {
      snippets.push({
        code: match[1].trim(),
        source: 'script-block',
        file: filename
      });
    }
  }

  // Extract from data-hs="..." (alternative attribute)
  const dataHsRegex = /data-hs="([^"]*)"/g;
  while ((match = dataHsRegex.exec(content)) !== null) {
    if (match[1].trim()) {
      snippets.push({
        code: match[1].trim(),
        source: 'data-attribute',
        file: filename
      });
    }
  }

  return snippets;
}

/**
 * Recursively find all HTML files in a directory.
 */
async function findHtmlFiles(dir, files = []) {
  if (!existsSync(dir)) return files;

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and dist
      if (entry.name !== 'node_modules' && entry.name !== 'dist') {
        await findHtmlFiles(fullPath, files);
      }
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

// =============================================================================
// Pattern-Based Analysis (Fallback when semantic parser unavailable)
// =============================================================================

/**
 * Analyze hyperscript code using regex patterns.
 * This is a fallback when the semantic parser can't be loaded.
 */
function analyzeWithPatterns(code) {
  const result = {
    actions: [],
    roles: [],
    valueTypes: [],
    nodeKind: 'command',
    rawPatterns: []
  };

  const normalizedCode = code.toLowerCase();

  // Detect event handlers
  if (/^on\s+\w+/.test(normalizedCode)) {
    result.nodeKind = 'event-handler';
    result.actions.push('on');
  }

  // Detect conditionals
  if (/\bif\s+/.test(normalizedCode)) {
    result.nodeKind = 'conditional';
    result.actions.push('if');
  }
  if (/\bunless\s+/.test(normalizedCode)) {
    result.actions.push('unless');
  }

  // Detect loops
  if (/\brepeat\s+/.test(normalizedCode)) {
    result.nodeKind = 'loop';
    result.actions.push('repeat');
  }
  if (/\bfor\s+\w+\s+in\s+/.test(normalizedCode)) {
    result.nodeKind = 'loop';
    result.actions.push('for');
  }
  if (/\bwhile\s+/.test(normalizedCode)) {
    result.nodeKind = 'loop';
    result.actions.push('while');
  }

  // Detect commands (in order of specificity)
  const commandPatterns = [
    { pattern: /\btoggle\s+/, action: 'toggle' },
    { pattern: /\badd\s+/, action: 'add' },
    { pattern: /\bremove\s+/, action: 'remove' },
    { pattern: /\bput\s+/, action: 'put' },
    { pattern: /\bset\s+/, action: 'set' },
    { pattern: /\bget\s+/, action: 'get' },
    { pattern: /\bshow\s*/, action: 'show' },
    { pattern: /\bhide\s*/, action: 'hide' },
    { pattern: /\bfetch\s+/, action: 'fetch' },
    { pattern: /\bwait\s+/, action: 'wait' },
    { pattern: /\btrigger\s+/, action: 'trigger' },
    { pattern: /\bsend\s+/, action: 'send' },
    { pattern: /\bincrement\s+/, action: 'increment' },
    { pattern: /\bdecrement\s+/, action: 'decrement' },
    { pattern: /\btransition\s+/, action: 'transition' },
    { pattern: /\bmeasure\s*/, action: 'measure' },
    { pattern: /\binstall\s+/, action: 'install' },
    { pattern: /\bhalt\b/, action: 'halt' },
    { pattern: /\bcall\s+/, action: 'call' },
    { pattern: /\blog\s+/, action: 'log' },
    { pattern: /\bgo\s+/, action: 'go' },
    { pattern: /\bfocus\b/, action: 'focus' },
    { pattern: /\bblur\b/, action: 'blur' },
    { pattern: /\bappend\s+/, action: 'append' },
    { pattern: /\bprepend\s+/, action: 'prepend' },
    { pattern: /\bsettle\b/, action: 'settle' },
    { pattern: /\btake\s+/, action: 'take' },
    { pattern: /\bmake\s+/, action: 'make' },
    { pattern: /\bclone\s+/, action: 'clone' },
    { pattern: /\bswap\s+/, action: 'swap' },
    { pattern: /\bmorph\s+/, action: 'morph' },
    { pattern: /\bthrow\s+/, action: 'throw' },
    { pattern: /\breturn\b/, action: 'return' },
    { pattern: /\bcontinue\b/, action: 'continue' },
    { pattern: /\bjs\s*\{/, action: 'js' },
    { pattern: /\basync\s+/, action: 'async' },
    { pattern: /\btell\s+/, action: 'tell' },
    { pattern: /\bdefault\s+/, action: 'default' },
    { pattern: /\binit\b/, action: 'init' },
    { pattern: /\bbehavior\s+/, action: 'behavior' },
    { pattern: /\belse\b/, action: 'else' },
  ];

  for (const { pattern, action } of commandPatterns) {
    if (pattern.test(normalizedCode) && !result.actions.includes(action)) {
      result.actions.push(action);
    }
  }

  // Detect value types
  // ID selectors
  if (/#[\w-]+/.test(code)) {
    result.valueTypes.push('selector');
    result.rawPatterns.push('id-selector');
  }
  // Class selectors
  if (/\.[\w-]+/.test(code) && !/\d+\.\d+/.test(code)) {
    if (!result.valueTypes.includes('selector')) {
      result.valueTypes.push('selector');
    }
    result.rawPatterns.push('class-selector');
  }
  // String literals
  if (/'[^']*'|"[^"]*"|`[^`]*`/.test(code)) {
    result.valueTypes.push('literal');
    result.rawPatterns.push('string-literal');
  }
  // Number literals
  if (/\b\d+(\.\d+)?(s|ms|px|%|em|rem)?\b/.test(code)) {
    if (!result.valueTypes.includes('literal')) {
      result.valueTypes.push('literal');
    }
    result.rawPatterns.push('number-literal');
  }
  // References (me, you, it, etc.)
  if (/\b(me|my|you|your|it|its|result|event|target|body)\b/.test(normalizedCode)) {
    result.valueTypes.push('reference');
  }
  // Property paths (possessive)
  if (/\w+'s\s+\w+|\bmy\s+\w+/.test(normalizedCode)) {
    result.valueTypes.push('property-path');
  }
  // CSS property access with *
  if (/\*[\w-]+/.test(code)) {
    if (!result.valueTypes.includes('property-path')) {
      result.valueTypes.push('property-path');
    }
  }

  // Detect semantic roles from prepositions
  if (/\bon\s+#|\bon\s+\./.test(normalizedCode)) {
    result.roles.push('destination');
  }
  if (/\binto\s+/.test(normalizedCode)) {
    result.roles.push('destination');
  }
  if (/\bfrom\s+/.test(normalizedCode)) {
    result.roles.push('source');
  }
  if (/\bto\s+/.test(normalizedCode)) {
    if (!result.roles.includes('destination')) {
      result.roles.push('destination');
    }
  }
  if (/\bwith\s+/.test(normalizedCode)) {
    result.roles.push('instrument');
  }
  if (/\bfor\s+/.test(normalizedCode)) {
    result.roles.push('beneficiary');
  }
  if (/\bover\s+\d/.test(normalizedCode)) {
    result.roles.push('time');
  }

  // Mark patient role if there's an object
  if (result.actions.length > 0 && result.valueTypes.includes('selector')) {
    result.roles.push('patient');
  }

  // Detect compound statements
  if (/\bthen\s+/.test(normalizedCode)) {
    result.nodeKind = 'compound';
    result.rawPatterns.push('then-chaining');
  }

  return result;
}

// =============================================================================
// Report Generation
// =============================================================================

/**
 * Generate the usage report.
 */
function generateReport(allAnalysis, snippets) {
  // Count frequencies
  const actionCounts = new Map();
  const roleCounts = new Map();
  const valueTypeCounts = new Map();
  const nodeKindCounts = new Map();
  const rawPatternCounts = new Map();
  const fileUsage = new Map();

  for (const { analysis, snippet } of allAnalysis) {
    // Count actions
    for (const action of analysis.actions) {
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
    }

    // Count roles
    for (const role of analysis.roles) {
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    }

    // Count value types
    for (const vt of analysis.valueTypes) {
      valueTypeCounts.set(vt, (valueTypeCounts.get(vt) || 0) + 1);
    }

    // Count node kinds
    nodeKindCounts.set(analysis.nodeKind, (nodeKindCounts.get(analysis.nodeKind) || 0) + 1);

    // Count raw patterns
    for (const rp of analysis.rawPatterns || []) {
      rawPatternCounts.set(rp, (rawPatternCounts.get(rp) || 0) + 1);
    }

    // Track which files use what
    const filename = snippet.file;
    if (!fileUsage.has(filename)) {
      fileUsage.set(filename, { actions: new Set(), snippetCount: 0 });
    }
    fileUsage.get(filename).snippetCount++;
    for (const action of analysis.actions) {
      fileUsage.get(filename).actions.add(action);
    }
  }

  // Sort by frequency
  const sortedActions = [...actionCounts.entries()].sort((a, b) => b[1] - a[1]);
  const sortedRoles = [...roleCounts.entries()].sort((a, b) => b[1] - a[1]);
  const sortedValueTypes = [...valueTypeCounts.entries()].sort((a, b) => b[1] - a[1]);
  const sortedNodeKinds = [...nodeKindCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Find unused actions
  const usedActions = new Set(actionCounts.keys());
  const unusedActions = ALL_ACTIONS.filter(a => !usedActions.has(a));

  // Categorize actions by usage tier
  const totalSnippets = allAnalysis.length;
  const highUsageThreshold = totalSnippets * 0.1;  // Used in >10% of snippets
  const mediumUsageThreshold = totalSnippets * 0.02;  // Used in >2% of snippets

  const tiers = {
    core: [],      // High usage - always include
    standard: [],  // Medium usage - include by default
    extended: [],  // Low usage - could be optional/lazy-loaded
    unused: unusedActions
  };

  for (const [action, count] of sortedActions) {
    if (count >= highUsageThreshold) {
      tiers.core.push(action);
    } else if (count >= mediumUsageThreshold) {
      tiers.standard.push(action);
    } else {
      tiers.extended.push(action);
    }
  }

  return {
    summary: {
      totalFiles: fileUsage.size,
      totalSnippets: snippets.length,
      analyzedSnippets: allAnalysis.length,
      uniqueActionsUsed: usedActions.size,
      totalActionsDefined: ALL_ACTIONS.length,
      coveragePercent: Math.round((usedActions.size / ALL_ACTIONS.length) * 100)
    },
    actions: {
      frequencies: Object.fromEntries(sortedActions),
      tiers,
      unused: unusedActions
    },
    roles: {
      frequencies: Object.fromEntries(sortedRoles),
      unused: ALL_ROLES.filter(r => !roleCounts.has(r))
    },
    valueTypes: {
      frequencies: Object.fromEntries(sortedValueTypes),
      unused: ALL_VALUE_TYPES.filter(vt => !valueTypeCounts.has(vt))
    },
    nodeKinds: {
      frequencies: Object.fromEntries(sortedNodeKinds),
      unused: ALL_NODE_KINDS.filter(nk => !nodeKindCounts.has(nk))
    },
    patterns: {
      frequencies: Object.fromEntries([...rawPatternCounts.entries()].sort((a, b) => b[1] - a[1]))
    },
    files: Object.fromEntries(
      [...fileUsage.entries()].map(([file, data]) => [
        relative(PROJECT_ROOT, file),
        { actions: [...data.actions], snippetCount: data.snippetCount }
      ])
    ),
    recommendations: generateRecommendations(tiers, sortedActions, allAnalysis.length)
  };
}

/**
 * Generate optimization recommendations.
 */
function generateRecommendations(tiers, sortedActions, totalSnippets) {
  const recommendations = [];

  // Core bundle recommendation
  recommendations.push({
    category: 'core-bundle',
    title: 'Minimum Viable Core',
    description: `These ${tiers.core.length} actions cover >10% usage each and should always be included:`,
    actions: tiers.core,
    estimatedCoverage: `~${Math.round((tiers.core.length / ALL_ACTIONS.length) * 100)}% of defined actions`
  });

  // Standard bundle
  if (tiers.standard.length > 0) {
    recommendations.push({
      category: 'standard-bundle',
      title: 'Standard Bundle Additions',
      description: `These ${tiers.standard.length} actions have moderate usage (2-10%) and should be in the standard bundle:`,
      actions: tiers.standard
    });
  }

  // Lazy-loadable
  if (tiers.extended.length > 0) {
    recommendations.push({
      category: 'lazy-loadable',
      title: 'Candidates for Lazy Loading',
      description: `These ${tiers.extended.length} actions have low usage (<2%) and could be lazy-loaded:`,
      actions: tiers.extended
    });
  }

  // Dead code candidates
  if (tiers.unused.length > 0) {
    recommendations.push({
      category: 'dead-code',
      title: 'Potentially Unused Code',
      description: `These ${tiers.unused.length} defined actions were never used in examples (may be needed for other use cases):`,
      actions: tiers.unused
    });
  }

  // Bundle size impact estimate
  const coreOnlyPercent = Math.round((tiers.core.length / ALL_ACTIONS.length) * 100);
  const standardPercent = Math.round(((tiers.core.length + tiers.standard.length) / ALL_ACTIONS.length) * 100);

  recommendations.push({
    category: 'bundle-estimate',
    title: 'Estimated Bundle Impact',
    description: 'If command code is roughly proportional to command count:',
    estimates: {
      coreOnly: `~${coreOnlyPercent}% of command code (${tiers.core.length} commands)`,
      withStandard: `~${standardPercent}% of command code (${tiers.core.length + tiers.standard.length} commands)`,
      potentialSavings: `~${100 - standardPercent}% could be tree-shaken or lazy-loaded`
    }
  });

  return recommendations;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const verbose = args.includes('--verbose');

  console.log('🔍 Semantic Usage Analysis');
  console.log('==========================\n');

  // Find all HTML files
  console.log('📂 Scanning for HTML files...');
  const htmlFiles = await findHtmlFiles(EXAMPLES_DIR);

  // Also scan test dashboard and compatibility test files in packages/core
  const additionalPaths = [
    join(PROJECT_ROOT, 'packages/core/test-dashboard.html'),
    join(PROJECT_ROOT, 'packages/core/compatibility-test.html'),
  ];
  for (const p of additionalPaths) {
    if (existsSync(p)) {
      htmlFiles.push(p);
    }
  }

  console.log(`   Found ${htmlFiles.length} HTML files\n`);

  // Extract hyperscript from all files
  console.log('📝 Extracting hyperscript snippets...');
  const allSnippets = [];
  for (const file of htmlFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      const snippets = extractHyperscript(content, file);
      allSnippets.push(...snippets);
      if (verbose && snippets.length > 0) {
        console.log(`   ${relative(PROJECT_ROOT, file)}: ${snippets.length} snippets`);
      }
    } catch (err) {
      console.warn(`   ⚠️  Could not read ${file}: ${err.message}`);
    }
  }
  console.log(`   Extracted ${allSnippets.length} total snippets\n`);

  // Analyze each snippet
  console.log('🔬 Analyzing snippets...');
  const allAnalysis = [];
  let parseErrors = 0;

  for (const snippet of allSnippets) {
    try {
      const analysis = analyzeWithPatterns(snippet.code);
      if (analysis.actions.length > 0 || analysis.valueTypes.length > 0) {
        allAnalysis.push({ analysis, snippet });
      }
    } catch (err) {
      parseErrors++;
      if (verbose) {
        console.warn(`   ⚠️  Parse error: ${snippet.code.substring(0, 50)}...`);
      }
    }
  }
  console.log(`   Analyzed ${allAnalysis.length} snippets (${parseErrors} parse errors)\n`);

  // Generate report
  console.log('📊 Generating report...\n');
  const report = generateReport(allAnalysis, allSnippets);

  // Output results
  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    // Pretty print summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                         SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`  Files analyzed:        ${report.summary.totalFiles}`);
    console.log(`  Snippets extracted:    ${report.summary.totalSnippets}`);
    console.log(`  Snippets analyzed:     ${report.summary.analyzedSnippets}`);
    console.log(`  Actions used:          ${report.summary.uniqueActionsUsed} / ${report.summary.totalActionsDefined}`);
    console.log(`  Coverage:              ${report.summary.coveragePercent}%\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    ACTION FREQUENCIES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const maxActionLen = Math.max(...Object.keys(report.actions.frequencies).map(a => a.length));
    for (const [action, count] of Object.entries(report.actions.frequencies)) {
      const bar = '█'.repeat(Math.min(50, Math.round(count / 2)));
      console.log(`  ${action.padEnd(maxActionLen)} │ ${String(count).padStart(3)} │ ${bar}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    ACTION TIERS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('  🟢 CORE (high usage, always include):');
    console.log(`     ${report.actions.tiers.core.join(', ') || '(none)'}\n`);

    console.log('  🟡 STANDARD (medium usage, default include):');
    console.log(`     ${report.actions.tiers.standard.join(', ') || '(none)'}\n`);

    console.log('  🟠 EXTENDED (low usage, lazy-loadable):');
    console.log(`     ${report.actions.tiers.extended.join(', ') || '(none)'}\n`);

    console.log('  🔴 UNUSED (never seen in examples):');
    console.log(`     ${report.actions.tiers.unused.join(', ') || '(none)'}\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    VALUE TYPES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const [vt, count] of Object.entries(report.valueTypes.frequencies)) {
      console.log(`  ${vt.padEnd(15)} │ ${count}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    NODE KINDS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const [nk, count] of Object.entries(report.nodeKinds.frequencies)) {
      console.log(`  ${nk.padEnd(15)} │ ${count}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                   RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const rec of report.recommendations) {
      console.log(`  📌 ${rec.title}`);
      console.log(`     ${rec.description}`);
      if (rec.actions) {
        console.log(`     → ${rec.actions.join(', ')}`);
      }
      if (rec.estimates) {
        for (const [key, value] of Object.entries(rec.estimates)) {
          console.log(`     • ${key}: ${value}`);
        }
      }
      console.log('');
    }
  }

  // Save JSON report
  await writeFile(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n💾 Full report saved to: ${relative(PROJECT_ROOT, OUTPUT_FILE)}`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
