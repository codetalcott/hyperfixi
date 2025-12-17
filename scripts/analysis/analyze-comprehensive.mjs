#!/usr/bin/env node
/**
 * Comprehensive Codebase Analysis Script
 *
 * Three-part analysis:
 * 1. Official hyperscript test suite patterns (what's tested upstream)
 * 2. Command manifest with file sizes (implementation cost)
 * 3. Expression category tree-shaking analysis (what expressions pair with what commands)
 *
 * Usage:
 *   node scripts/analyze-comprehensive.mjs [--json] [--verbose]
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, relative, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// =============================================================================
// Configuration
// =============================================================================

const EXAMPLES_DIR = join(PROJECT_ROOT, 'examples');
const COMMANDS_DIR = join(PROJECT_ROOT, 'packages/core/src/commands');
const EXPRESSIONS_DIR = join(PROJECT_ROOT, 'packages/core/src/expressions');
const OFFICIAL_TEST_DIR = '/Users/williamtalcott/projects/_hyperscript/www/test/0.9.14/test';
const OUTPUT_FILE = join(PROJECT_ROOT, 'comprehensive-analysis-report.json');

// All defined ActionTypes
const ALL_ACTIONS = [
  'toggle', 'add', 'remove', 'put', 'append', 'prepend', 'take', 'make', 'clone', 'swap', 'morph',
  'set', 'get', 'increment', 'decrement', 'log',
  'show', 'hide', 'transition',
  'on', 'trigger', 'send',
  'focus', 'blur', 'go',
  'wait', 'fetch', 'settle',
  'measure', 'install',
  'if', 'unless', 'else', 'repeat', 'for', 'while', 'continue', 'halt', 'throw', 'call', 'return',
  'js', 'async', 'tell', 'default', 'init', 'behavior', 'compound'
];

// Expression categories
const EXPRESSION_CATEGORIES = [
  'string', 'references', 'logical', 'object', 'symbol', 'form', 'possessive',
  'array', 'conversion', 'not', 'properties', 'time', 'positional', 'some',
  'as', 'comparison', 'mathematical', 'property', 'special', 'advanced', 'in', 'function-calls'
];

// =============================================================================
// Part 1: Official Hyperscript Test Suite Analysis
// =============================================================================

/**
 * Extract hyperscript patterns from official test files.
 */
function extractOfficialPatterns(content, filename) {
  const patterns = [];

  // Pattern 1: make("...", { _: "..." }) - common in JS tests
  const makePattern = /make\s*\(\s*["']([^"']+)["']\s*,\s*\{[^}]*_\s*:\s*["']([^"']+)["']/g;
  let match;
  while ((match = makePattern.exec(content)) !== null) {
    patterns.push({ code: match[2], source: 'make-call', file: filename });
  }

  // Pattern 2: _: "..." in object literals
  const objPattern = /_\s*:\s*["']([^"']+)["']/g;
  while ((match = objPattern.exec(content)) !== null) {
    patterns.push({ code: match[1], source: 'object-literal', file: filename });
  }

  // Pattern 3: _="..." in HTML strings within JS
  const attrPattern = /_=["']([^"']+)["']/g;
  while ((match = attrPattern.exec(content)) !== null) {
    patterns.push({ code: match[1], source: 'html-attr', file: filename });
  }

  // Pattern 4: hyperscript code in describe/it blocks (often as string args)
  const stringPattern = /["'`]on\s+\w+[^"'`]*["'`]/g;
  while ((match = stringPattern.exec(content)) !== null) {
    const code = match[0].slice(1, -1); // Remove quotes
    if (code.length > 5 && code.length < 500) {
      patterns.push({ code, source: 'test-string', file: filename });
    }
  }

  return patterns;
}

async function analyzeOfficialTestSuite() {
  console.log('\n📚 Part 1: Official Hyperscript Test Suite Analysis');
  console.log('─'.repeat(60));

  if (!existsSync(OFFICIAL_TEST_DIR)) {
    console.log('   ⚠️  Official test directory not found. Skipping.');
    return null;
  }

  const results = {
    files: [],
    patterns: [],
    actionFrequencies: new Map(),
    expressionFrequencies: new Map(),
    featuresByFile: new Map()
  };

  // Find all test files
  async function findTestFiles(dir, files = []) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await findTestFiles(fullPath, files);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.html')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const testFiles = await findTestFiles(OFFICIAL_TEST_DIR);
  console.log(`   Found ${testFiles.length} official test files`);

  for (const file of testFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      const patterns = extractOfficialPatterns(content, file);
      results.patterns.push(...patterns);
      results.files.push(relative(OFFICIAL_TEST_DIR, file));

      // Track features by file
      const fileActions = new Set();
      for (const pattern of patterns) {
        const actions = detectActions(pattern.code);
        for (const action of actions) {
          fileActions.add(action);
          results.actionFrequencies.set(action, (results.actionFrequencies.get(action) || 0) + 1);
        }
        const exprs = detectExpressions(pattern.code);
        for (const expr of exprs) {
          results.expressionFrequencies.set(expr, (results.expressionFrequencies.get(expr) || 0) + 1);
        }
      }
      results.featuresByFile.set(relative(OFFICIAL_TEST_DIR, file), [...fileActions]);
    } catch (err) {
      // Skip files that can't be read
    }
  }

  console.log(`   Extracted ${results.patterns.length} hyperscript patterns`);
  console.log(`   Found ${results.actionFrequencies.size} unique actions tested`);

  return {
    totalFiles: results.files.length,
    totalPatterns: results.patterns.length,
    actionFrequencies: Object.fromEntries([...results.actionFrequencies.entries()].sort((a, b) => b[1] - a[1])),
    expressionFrequencies: Object.fromEntries([...results.expressionFrequencies.entries()].sort((a, b) => b[1] - a[1])),
    featuresByFile: Object.fromEntries(results.featuresByFile)
  };
}

// =============================================================================
// Part 2: Command Manifest with File Sizes
// =============================================================================

/**
 * Map commands to their implementation files and calculate sizes.
 */
async function buildCommandManifest() {
  console.log('\n📦 Part 2: Command Manifest with File Sizes');
  console.log('─'.repeat(60));

  const manifest = {
    commands: {},
    helpers: {},
    totalLines: 0,
    totalBytes: 0,
    byCategory: {}
  };

  // Map action names to file patterns
  const actionFileMap = {
    toggle: 'dom/toggle.ts',
    add: 'dom/add.ts',
    remove: 'dom/remove.ts',
    put: 'dom/put.ts',
    show: 'dom/show.ts',
    hide: 'dom/hide.ts',
    swap: 'dom/swap.ts',
    make: 'dom/make.ts',
    set: 'data/set.ts',
    get: 'data/get.ts',
    increment: 'data/increment.ts',
    decrement: 'data/decrement.ts',
    default: 'data/default.ts',
    bind: 'data/bind.ts',
    persist: 'data/persist.ts',
    wait: 'async/wait.ts',
    fetch: 'async/fetch.ts',
    if: 'control-flow/if.ts',
    unless: 'control-flow/unless.ts',
    repeat: 'control-flow/repeat.ts',
    halt: 'control-flow/halt.ts',
    return: 'control-flow/return.ts',
    throw: 'control-flow/throw.ts',
    continue: 'control-flow/continue.ts',
    break: 'control-flow/break.ts',
    exit: 'control-flow/exit.ts',
    trigger: 'events/trigger.ts',
    send: 'events/send.ts',
    call: 'execution/call.ts',
    go: 'navigation/go.ts',
    log: 'utility/log.ts',
    tell: 'utility/tell.ts',
    beep: 'utility/beep.ts',
    copy: 'utility/copy.ts',
    pick: 'utility/pick.ts',
    transition: 'animation/transition.ts',
    measure: 'animation/measure.ts',
    settle: 'animation/settle.ts',
    take: 'animation/take.ts',
    install: 'behaviors/install.ts',
    append: 'content/append.ts',
    js: 'advanced/js.ts',
    async: 'advanced/async.ts',
    render: 'templates/render.ts',
  };

  // Read each command file
  for (const [action, relPath] of Object.entries(actionFileMap)) {
    const fullPath = join(COMMANDS_DIR, relPath);
    if (existsSync(fullPath)) {
      try {
        const content = await readFile(fullPath, 'utf-8');
        const stats = await stat(fullPath);
        const lines = content.split('\n').length;
        const category = relPath.split('/')[0];

        manifest.commands[action] = {
          file: relPath,
          lines,
          bytes: stats.size,
          category
        };

        manifest.totalLines += lines;
        manifest.totalBytes += stats.size;

        if (!manifest.byCategory[category]) {
          manifest.byCategory[category] = { lines: 0, bytes: 0, commands: [] };
        }
        manifest.byCategory[category].lines += lines;
        manifest.byCategory[category].bytes += stats.size;
        manifest.byCategory[category].commands.push(action);
      } catch (err) {
        // Skip files that can't be read
      }
    }
  }

  // Read helper files
  const helperFiles = await readdir(join(COMMANDS_DIR, 'helpers'));
  for (const file of helperFiles) {
    if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      const fullPath = join(COMMANDS_DIR, 'helpers', file);
      try {
        const content = await readFile(fullPath, 'utf-8');
        const stats = await stat(fullPath);
        const lines = content.split('\n').length;

        manifest.helpers[file] = {
          lines,
          bytes: stats.size
        };

        manifest.totalLines += lines;
        manifest.totalBytes += stats.size;
      } catch (err) {
        // Skip
      }
    }
  }

  console.log(`   Mapped ${Object.keys(manifest.commands).length} commands`);
  console.log(`   Found ${Object.keys(manifest.helpers).length} helper files`);
  console.log(`   Total: ${manifest.totalLines.toLocaleString()} lines, ${(manifest.totalBytes / 1024).toFixed(1)} KB`);

  return manifest;
}

// =============================================================================
// Part 3: Expression Tree-Shaking Analysis
// =============================================================================

/**
 * Detect which expression categories are used in code.
 */
function detectExpressions(code) {
  const found = new Set();
  const lowerCode = code.toLowerCase();

  // String expressions
  if (/['"`]/.test(code)) found.add('string');

  // Reference expressions (me, you, it, etc.)
  if (/\b(me|my|you|your|it|its|result|event|target|body|document|window)\b/i.test(code)) {
    found.add('references');
  }

  // Logical expressions (and, or, not)
  if (/\b(and|or|not)\b/i.test(lowerCode)) found.add('logical');

  // Object expressions ({...})
  if (/\{[^}]+\}/.test(code)) found.add('object');

  // Symbol expressions (:symbol)
  if (/:\w+/.test(code) && !/https?:/.test(code)) found.add('symbol');

  // Form expressions (my value, closest form)
  if (/\b(form|input|value|checked|selected)\b/i.test(code)) found.add('form');

  // Possessive expressions (element's property)
  if (/\w+'s\s+\w+/i.test(code)) found.add('possessive');

  // Array expressions ([...], first, last)
  if (/\[[^\]]*\]|\b(first|last|random)\b/i.test(code)) found.add('array');

  // Conversion expressions (as string, as number)
  if (/\bas\s+\w+/i.test(code)) found.add('conversion');

  // Not expressions
  if (/\bnot?\s+/i.test(lowerCode)) found.add('not');

  // Property access expressions (.property, [index])
  if (/\.\w+|\[\d+\]/.test(code)) found.add('properties');

  // Time expressions (100ms, 2s, 1m)
  if (/\d+(ms|s|m|h)\b/i.test(code)) found.add('time');

  // Positional expressions (first, last, nth)
  if (/\b(first|last|nth|next|previous)\b/i.test(code)) found.add('positional');

  // Some expressions (some of, any of)
  if (/\b(some|any|every|all)\s+(of)?\b/i.test(code)) found.add('some');

  // As expressions (convert types)
  if (/\bas\s+(string|number|int|float|json|html|array)\b/i.test(code)) found.add('as');

  // Comparison expressions (<, >, ==, is, contains)
  if (/[<>=!]+|(\bis\b|\bcontains\b|\bmatches\b|\bexists\b)/i.test(code)) found.add('comparison');

  // Mathematical expressions (+, -, *, /, %)
  if (/[\+\-\*\/%]/.test(code)) found.add('mathematical');

  // Special expressions (CSS selectors, literals)
  if (/#[\w-]+|\.[\w-]+/.test(code)) found.add('special');

  // Advanced expressions (template literals, spread)
  if (/`[^`]*`|\.\.\./i.test(code)) found.add('advanced');

  // In expressions (in, of)
  if (/\b(in|of)\b/i.test(code)) found.add('in');

  // Function calls
  if (/\w+\([^)]*\)/.test(code)) found.add('function-calls');

  return [...found];
}

/**
 * Detect which actions are used in code.
 */
function detectActions(code) {
  const found = new Set();
  const lowerCode = code.toLowerCase();

  const actionPatterns = [
    { pattern: /\bon\s+\w+/, action: 'on' },
    { pattern: /\btoggle\s+/, action: 'toggle' },
    { pattern: /\badd\s+/, action: 'add' },
    { pattern: /\bremove\s+/, action: 'remove' },
    { pattern: /\bput\s+/, action: 'put' },
    { pattern: /\bset\s+/, action: 'set' },
    { pattern: /\bget\s+/, action: 'get' },
    { pattern: /\bshow\b/, action: 'show' },
    { pattern: /\bhide\b/, action: 'hide' },
    { pattern: /\bfetch\s+/, action: 'fetch' },
    { pattern: /\bwait\s+/, action: 'wait' },
    { pattern: /\btrigger\s+/, action: 'trigger' },
    { pattern: /\bsend\s+/, action: 'send' },
    { pattern: /\bincrement\s+/, action: 'increment' },
    { pattern: /\bdecrement\s+/, action: 'decrement' },
    { pattern: /\btransition\s+/, action: 'transition' },
    { pattern: /\bmeasure\b/, action: 'measure' },
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
    { pattern: /\bif\s+/, action: 'if' },
    { pattern: /\bunless\s+/, action: 'unless' },
    { pattern: /\belse\b/, action: 'else' },
    { pattern: /\brepeat\s+/, action: 'repeat' },
    { pattern: /\bfor\s+\w+\s+in\s+/, action: 'for' },
    { pattern: /\bwhile\s+/, action: 'while' },
    { pattern: /\bjs\s*\{/, action: 'js' },
    { pattern: /\basync\s+/, action: 'async' },
    { pattern: /\btell\s+/, action: 'tell' },
    { pattern: /\bdefault\s+/, action: 'default' },
    { pattern: /\binit\b/, action: 'init' },
    { pattern: /\bbehavior\s+/, action: 'behavior' },
  ];

  for (const { pattern, action } of actionPatterns) {
    if (pattern.test(lowerCode)) {
      found.add(action);
    }
  }

  return [...found];
}

/**
 * Analyze expression usage patterns.
 */
async function analyzeExpressionUsage() {
  console.log('\n🌳 Part 3: Expression Tree-Shaking Analysis');
  console.log('─'.repeat(60));

  const results = {
    expressionSizes: {},
    expressionFrequencies: {},
    commandExpressionMatrix: {},
    expressionTiers: { core: [], standard: [], extended: [], unused: [] },
    recommendations: []
  };

  // Get expression file sizes
  for (const expr of EXPRESSION_CATEGORIES) {
    const indexPath = join(EXPRESSIONS_DIR, expr, 'index.ts');
    if (existsSync(indexPath)) {
      try {
        const content = await readFile(indexPath, 'utf-8');
        const stats = await stat(indexPath);
        results.expressionSizes[expr] = {
          lines: content.split('\n').length,
          bytes: stats.size
        };
      } catch (err) {
        // Skip
      }
    }
  }

  // Analyze example files for command-expression correlations
  async function findHtmlFiles(dir, files = []) {
    if (!existsSync(dir)) return files;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        await findHtmlFiles(fullPath, files);
      } else if (entry.name.endsWith('.html')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const htmlFiles = await findHtmlFiles(EXAMPLES_DIR);
  const cooccurrences = {}; // command -> expression -> count

  for (const file of htmlFiles) {
    try {
      const content = await readFile(file, 'utf-8');

      // Extract hyperscript
      const attrRegex = /_="([^"]*)"/g;
      let match;
      while ((match = attrRegex.exec(content)) !== null) {
        const code = match[1];
        const actions = detectActions(code);
        const exprs = detectExpressions(code);

        // Count expression usage
        for (const expr of exprs) {
          results.expressionFrequencies[expr] = (results.expressionFrequencies[expr] || 0) + 1;
        }

        // Build command-expression matrix
        for (const action of actions) {
          if (!cooccurrences[action]) cooccurrences[action] = {};
          for (const expr of exprs) {
            cooccurrences[action][expr] = (cooccurrences[action][expr] || 0) + 1;
          }
        }
      }
    } catch (err) {
      // Skip
    }
  }

  results.commandExpressionMatrix = cooccurrences;

  // Calculate expression tiers
  const totalExprUsage = Object.values(results.expressionFrequencies).reduce((a, b) => a + b, 0);
  const sortedExprs = Object.entries(results.expressionFrequencies).sort((a, b) => b[1] - a[1]);

  for (const [expr, count] of sortedExprs) {
    const percent = (count / totalExprUsage) * 100;
    if (percent > 10) {
      results.expressionTiers.core.push(expr);
    } else if (percent > 2) {
      results.expressionTiers.standard.push(expr);
    } else {
      results.expressionTiers.extended.push(expr);
    }
  }

  // Find unused expressions
  for (const expr of EXPRESSION_CATEGORIES) {
    if (!results.expressionFrequencies[expr]) {
      results.expressionTiers.unused.push(expr);
    }
  }

  console.log(`   Analyzed ${htmlFiles.length} HTML files`);
  console.log(`   Expression categories used: ${Object.keys(results.expressionFrequencies).length}/${EXPRESSION_CATEGORIES.length}`);

  // Generate recommendations
  const coreSize = results.expressionTiers.core.reduce((sum, e) =>
    sum + (results.expressionSizes[e]?.lines || 0), 0);
  const totalSize = Object.values(results.expressionSizes).reduce((sum, s) => sum + s.lines, 0);

  results.recommendations.push({
    title: 'Core Expression Bundle',
    description: `${results.expressionTiers.core.length} expression categories cover >10% of usage`,
    categories: results.expressionTiers.core,
    estimatedSize: `${coreSize} lines (~${Math.round((coreSize / totalSize) * 100)}% of total)`
  });

  if (results.expressionTiers.extended.length > 0) {
    results.recommendations.push({
      title: 'Lazy-Loadable Expressions',
      description: `${results.expressionTiers.extended.length} categories have <2% usage`,
      categories: results.expressionTiers.extended
    });
  }

  return results;
}

// =============================================================================
// Combined Analysis
// =============================================================================

async function runFullAnalysis() {
  console.log('═'.repeat(60));
  console.log('          COMPREHENSIVE HYPERFIXI ANALYSIS');
  console.log('═'.repeat(60));

  const report = {
    timestamp: new Date().toISOString(),
    officialTests: null,
    commandManifest: null,
    expressionAnalysis: null,
    combinedRecommendations: []
  };

  // Part 1: Official test suite
  report.officialTests = await analyzeOfficialTestSuite();

  // Part 2: Command manifest
  report.commandManifest = await buildCommandManifest();

  // Part 3: Expression analysis
  report.expressionAnalysis = await analyzeExpressionUsage();

  // Generate combined recommendations
  console.log('\n' + '═'.repeat(60));
  console.log('          COMBINED RECOMMENDATIONS');
  console.log('═'.repeat(60));

  // Load the previous semantic usage report if available
  let semanticReport = null;
  const semanticReportPath = join(PROJECT_ROOT, 'semantic-usage-report.json');
  if (existsSync(semanticReportPath)) {
    try {
      semanticReport = JSON.parse(await readFile(semanticReportPath, 'utf-8'));
    } catch (e) {
      // Skip
    }
  }

  // Cross-reference: commands used in examples vs tested officially
  if (report.officialTests && semanticReport) {
    const testedActions = new Set(Object.keys(report.officialTests.actionFrequencies));
    const usedActions = new Set(Object.keys(semanticReport.actions.frequencies));

    const testedButNotUsed = [...testedActions].filter(a => !usedActions.has(a));
    const usedButNotTested = [...usedActions].filter(a => !testedActions.has(a));

    report.combinedRecommendations.push({
      category: 'coverage-gaps',
      title: 'Test vs Usage Coverage Gaps',
      testedButNotUsed: {
        description: 'Commands tested in official suite but not used in our examples',
        actions: testedButNotUsed
      },
      usedButNotTested: {
        description: 'Commands used in our examples but not seen in official tests',
        actions: usedButNotTested
      }
    });
  }

  // Calculate optimal bundle sizes
  if (report.commandManifest && semanticReport) {
    const coreCmds = semanticReport.actions.tiers.core || [];
    const standardCmds = semanticReport.actions.tiers.standard || [];

    let coreLines = 0, coreBytes = 0;
    let standardLines = 0, standardBytes = 0;

    for (const cmd of coreCmds) {
      if (report.commandManifest.commands[cmd]) {
        coreLines += report.commandManifest.commands[cmd].lines;
        coreBytes += report.commandManifest.commands[cmd].bytes;
      }
    }

    for (const cmd of standardCmds) {
      if (report.commandManifest.commands[cmd]) {
        standardLines += report.commandManifest.commands[cmd].lines;
        standardBytes += report.commandManifest.commands[cmd].bytes;
      }
    }

    report.combinedRecommendations.push({
      category: 'bundle-optimization',
      title: 'Command Bundle Optimization',
      coreBundle: {
        commands: coreCmds,
        lines: coreLines,
        bytes: coreBytes,
        kbSize: (coreBytes / 1024).toFixed(1)
      },
      standardBundle: {
        commands: [...coreCmds, ...standardCmds],
        lines: coreLines + standardLines,
        bytes: coreBytes + standardBytes,
        kbSize: ((coreBytes + standardBytes) / 1024).toFixed(1)
      },
      fullBundle: {
        lines: report.commandManifest.totalLines,
        bytes: report.commandManifest.totalBytes,
        kbSize: (report.commandManifest.totalBytes / 1024).toFixed(1)
      },
      potentialSavings: {
        vsCore: `${Math.round((1 - coreBytes / report.commandManifest.totalBytes) * 100)}%`,
        vsStandard: `${Math.round((1 - (coreBytes + standardBytes) / report.commandManifest.totalBytes) * 100)}%`
      }
    });
  }

  // Expression-command pairing recommendations
  if (report.expressionAnalysis) {
    const matrix = report.expressionAnalysis.commandExpressionMatrix;
    const commonPairs = [];

    for (const [cmd, exprs] of Object.entries(matrix)) {
      const sortedExprs = Object.entries(exprs).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (sortedExprs.length > 0) {
        commonPairs.push({
          command: cmd,
          topExpressions: sortedExprs.map(([e, c]) => ({ expression: e, count: c }))
        });
      }
    }

    report.combinedRecommendations.push({
      category: 'expression-dependencies',
      title: 'Command-Expression Dependencies',
      description: 'Which expressions are most commonly used with each command',
      pairs: commonPairs.slice(0, 15) // Top 15
    });
  }

  // Print summary
  console.log('\n📊 Bundle Size Summary:');
  if (report.combinedRecommendations.find(r => r.category === 'bundle-optimization')) {
    const opt = report.combinedRecommendations.find(r => r.category === 'bundle-optimization');
    console.log(`   Core bundle:     ${opt.coreBundle.kbSize} KB (${opt.coreBundle.commands.length} commands)`);
    console.log(`   Standard bundle: ${opt.standardBundle.kbSize} KB (${opt.standardBundle.commands.length} commands)`);
    console.log(`   Full bundle:     ${opt.fullBundle.kbSize} KB (all commands)`);
    console.log(`   Potential savings: ${opt.potentialSavings.vsCore} (core) / ${opt.potentialSavings.vsStandard} (standard)`);
  }

  // Save report
  await writeFile(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n💾 Full report saved to: ${relative(PROJECT_ROOT, OUTPUT_FILE)}`);

  return report;
}

// =============================================================================
// Pretty Print Functions
// =============================================================================

function printOfficialTestSummary(data) {
  if (!data) return;

  console.log('\n📚 OFFICIAL TEST SUITE SUMMARY');
  console.log('─'.repeat(50));
  console.log(`   Files analyzed: ${data.totalFiles}`);
  console.log(`   Patterns found: ${data.totalPatterns}`);
  console.log('\n   Top 15 actions tested:');

  const actions = Object.entries(data.actionFrequencies).slice(0, 15);
  for (const [action, count] of actions) {
    const bar = '█'.repeat(Math.min(30, Math.round(count / 5)));
    console.log(`   ${action.padEnd(12)} │ ${String(count).padStart(4)} │ ${bar}`);
  }
}

function printCommandManifest(data) {
  console.log('\n📦 COMMAND MANIFEST');
  console.log('─'.repeat(50));
  console.log(`   Total commands: ${Object.keys(data.commands).length}`);
  console.log(`   Total lines:    ${data.totalLines.toLocaleString()}`);
  console.log(`   Total size:     ${(data.totalBytes / 1024).toFixed(1)} KB`);

  console.log('\n   By category:');
  const categories = Object.entries(data.byCategory).sort((a, b) => b[1].lines - a[1].lines);
  for (const [cat, info] of categories) {
    console.log(`   ${cat.padEnd(15)} │ ${String(info.lines).padStart(5)} lines │ ${info.commands.join(', ')}`);
  }

  console.log('\n   Largest commands:');
  const sorted = Object.entries(data.commands).sort((a, b) => b[1].lines - a[1].lines).slice(0, 10);
  for (const [cmd, info] of sorted) {
    console.log(`   ${cmd.padEnd(12)} │ ${String(info.lines).padStart(4)} lines │ ${info.category}`);
  }
}

function printExpressionAnalysis(data) {
  console.log('\n🌳 EXPRESSION ANALYSIS');
  console.log('─'.repeat(50));

  console.log('\n   Expression usage frequency:');
  const sorted = Object.entries(data.expressionFrequencies).sort((a, b) => b[1] - a[1]);
  for (const [expr, count] of sorted.slice(0, 15)) {
    const bar = '█'.repeat(Math.min(25, Math.round(count / 3)));
    console.log(`   ${expr.padEnd(15)} │ ${String(count).padStart(3)} │ ${bar}`);
  }

  console.log('\n   Expression tiers:');
  console.log(`   🟢 Core:     ${data.expressionTiers.core.join(', ')}`);
  console.log(`   🟡 Standard: ${data.expressionTiers.standard.join(', ')}`);
  console.log(`   🟠 Extended: ${data.expressionTiers.extended.join(', ')}`);
  if (data.expressionTiers.unused.length > 0) {
    console.log(`   🔴 Unused:   ${data.expressionTiers.unused.join(', ')}`);
  }

  console.log('\n   Expression sizes (lines):');
  const bySizeEntries = Object.entries(data.expressionSizes).sort((a, b) => b[1].lines - a[1].lines);
  for (const [expr, size] of bySizeEntries.slice(0, 10)) {
    const tier = data.expressionTiers.core.includes(expr) ? '🟢' :
                 data.expressionTiers.standard.includes(expr) ? '🟡' :
                 data.expressionTiers.extended.includes(expr) ? '🟠' : '🔴';
    console.log(`   ${tier} ${expr.padEnd(15)} │ ${String(size.lines).padStart(4)} lines`);
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const verbose = args.includes('--verbose');

  try {
    const report = await runFullAnalysis();

    if (!jsonOutput) {
      printOfficialTestSummary(report.officialTests);
      printCommandManifest(report.commandManifest);
      printExpressionAnalysis(report.expressionAnalysis);

      // Print final recommendations
      console.log('\n' + '═'.repeat(60));
      console.log('          FINAL RECOMMENDATIONS');
      console.log('═'.repeat(60));

      for (const rec of report.combinedRecommendations) {
        console.log(`\n📌 ${rec.title}`);
        if (rec.description) console.log(`   ${rec.description}`);

        if (rec.testedButNotUsed) {
          console.log(`\n   Commands tested but unused in examples:`);
          console.log(`   → ${rec.testedButNotUsed.actions.join(', ') || '(none)'}`);
        }
        if (rec.usedButNotTested) {
          console.log(`\n   Commands used but not in official tests:`);
          console.log(`   → ${rec.usedButNotTested.actions.join(', ') || '(none)'}`);
        }
        if (rec.pairs) {
          console.log('\n   Top command-expression pairs:');
          for (const pair of rec.pairs.slice(0, 8)) {
            const exprs = pair.topExpressions.map(e => `${e.expression}(${e.count})`).join(', ');
            console.log(`   ${pair.command.padEnd(12)} → ${exprs}`);
          }
        }
      }
    } else {
      console.log(JSON.stringify(report, null, 2));
    }

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
