# Analysis Tools Enhancement Plan

## Quick Implementation Checklist

### Phase 1: Fix Command Discovery (HIGH PRIORITY)

**File:** `scripts/analysis/comparison/extract-command-metrics.mjs`

**Issue:** Currently only searches `packages/core/src/commands` but commands are now in:

- `packages/core/src/commands-v2/` (43 current implementations, tree-shakeable)
- `packages/core/src/commands/` (legacy, decorator-based)

**Fix:** Update command discovery to find all implementations

```javascript
// Before (line 22-23):
const HYPERFIXI_COMMANDS = join(PROJECT_ROOT, 'packages/core/src/commands');

// After:
const HYPERFIXI_COMMAND_DIRS = [
  join(PROJECT_ROOT, 'packages/core/src/commands-v2/'),
  join(PROJECT_ROOT, 'packages/core/src/commands/'),
].filter(dir => existsSync(dir));

// Then update findCommandFiles to accept array:
async function findAllCommandFiles() {
  const allFiles = [];
  for (const dir of HYPERFIXI_COMMAND_DIRS) {
    allFiles.push(...(await findCommandFiles(dir)));
  }
  // Deduplicate by command name
  const seen = new Set();
  return allFiles.filter(file => {
    const name = extractCommandName(file);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}
```

**Expected Impact:** Ensures analysis captures all 43 commands including recent consolidations

---

### Phase 1b: Add Minified Size Metrics (HIGH PRIORITY)

**New data point:** Current analysis uses source lines, not actual bundle impact

**Addition to extractLokaScriptCommand():**

```javascript
// After existing metrics extraction (line 254):
return {
  name,
  file: relative(PROJECT_ROOT, filePath),
  lines: totalLines,
  parseLines: parseInputLines,
  executeLines,
  // ... existing fields ...

  // NEW: Size metrics
  sourceSize: Buffer.byteLength(content, 'utf-8'),

  // Estimate minified size (rough heuristic)
  estimatedMinified: estimateMinifiedSize(content),

  // Check if uses base class (can be deduplicated)
  extendsBase,
  baseClass,
};

// Helper function
function estimateMinifiedSize(content) {
  // Remove comments, whitespace, shrink names
  let minified = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Block comments
    .replace(/\/\/.*/g, '') // Line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\s*([{}();,:])\s*/g, '$1'); // Remove spaces around syntax

  return minified.length;
}
```

**Expected Impact:** Reveals which commands are actually heavy in production builds

---

### Phase 2: Create Bundle Composition Analyzer

**New File:** `scripts/analysis/comparison/analyze-bundle-composition.mjs`

```javascript
#!/usr/bin/env node
/**
 * Bundle Composition Analyzer
 *
 * Analyzes what contributes to bundle size across components
 *
 * Usage:
 *   node scripts/analysis/comparison/analyze-bundle-composition.mjs
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../../..');
const OUTPUT_DIR = join(PROJECT_ROOT, 'analysis-output/composition');

/**
 * Component definitions with file patterns
 */
const COMPONENTS = {
  runtime: {
    name: 'Runtime & Execution Engine',
    files: ['packages/core/src/runtime/**/*.ts', 'packages/core/src/command-runtime*.ts'],
    description: 'Handles command execution, context management, DOM operations',
  },
  parser: {
    name: 'Parser & Tokenizer',
    files: ['packages/core/src/parser/**/*.ts'],
    description: '~3000 lines, tokenization + AST construction',
  },
  commands: {
    name: 'Command Implementations',
    files: ['packages/core/src/commands-v2/**/*.ts', 'packages/core/src/commands/**/*.ts'],
    description: '43 commands, ranging from 30-100 lines each',
  },
  expressions: {
    name: 'Expression System',
    files: ['packages/core/src/expressions/**/*.ts'],
    description: '6 categories: references, logical, conversion, positional, properties, special',
  },
  features: {
    name: 'Feature Implementations',
    files: ['packages/core/src/features/**/*.ts'],
    description: '9 official _hyperscript features (init, on, behaviors, etc)',
  },
  i18n: {
    name: 'Internationalization',
    files: ['packages/i18n/src/**/*.ts'],
    description: '13 languages with grammar transformation',
  },
  semantic: {
    name: 'Semantic Multilingual Parsing',
    files: ['packages/semantic/src/**/*.ts'],
    description: 'Language-agnostic semantic parsing, 13 language tokenizers',
  },
};

/**
 * Analyze a single component
 */
async function analyzeComponent(component, patterns) {
  const files = [];

  // Find matching files (simplified - in real version use glob)
  for (const pattern of component.files) {
    // Implementation would use glob to find files matching pattern
    // For now, return placeholder
    files.push({
      name: pattern,
      size: 0,
      lines: 0,
    });
  }

  return {
    name: component.name,
    description: component.description,
    fileCount: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    totalLines: files.reduce((sum, f) => sum + f.lines, 0),
    files: files,
  };
}

/**
 * Analyze all bundles
 */
async function analyzeBundles() {
  const bundles = {
    'lokascript-browser.js': {
      path: 'packages/core/dist/lokascript-browser.js',
      includes: ['runtime', 'parser', 'commands', 'expressions', 'features'],
      description: 'Full bundle with parser (everything)',
    },
    'lokascript-multilingual.js': {
      path: 'packages/core/dist/lokascript-multilingual.js',
      includes: ['runtime', 'commands', 'expressions', 'features'],
      excludes: ['parser', 'semantic', 'i18n'],
      description: 'Without parser (no parsing, only runtime execution)',
    },
    'lokascript-semantic.browser.global.js': {
      path: 'packages/semantic/dist/lokascript-semantic.browser.global.js',
      includes: ['semantic'],
      description: 'Semantic parser only (13 languages, no hyperscript commands)',
    },
  };

  const bundleAnalysis = {};

  for (const [name, bundle] of Object.entries(bundles)) {
    const filePath = join(PROJECT_ROOT, bundle.path);
    let size = 0;

    if (existsSync(filePath)) {
      const content = await readFile(filePath);
      size = content.length;
    }

    bundleAnalysis[name] = {
      ...bundle,
      actualSize: size,
      included: bundle.includes,
      excluded: bundle.excludes || [],
    };
  }

  return bundleAnalysis;
}

/**
 * Identify duplicate implementations across commands
 */
async function analyzeCommandDuplication() {
  // This would scan all command files and identify:
  // 1. Similar parseInput patterns
  // 2. Identical helper usage
  // 3. Redundant type definitions
  // 4. Shared execution logic that could be base classes

  return {
    totalCommands: 43,
    estimatedDuplicate: '15-20%',
    consolidationTargets: [
      'DOM manipulation (add, remove, put, toggle, show, hide)',
      'Data operations (set, default, increment, decrement)',
      'Control flow (if, repeat, unless)',
      'Async operations (wait, fetch, call)',
    ],
  };
}

async function main() {
  const jsonOutput = process.argv.includes('--json');

  if (!jsonOutput) {
    console.log('Analyzing bundle composition...\n');
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Analyze each component
  const components = {};
  for (const [key, component] of Object.entries(COMPONENTS)) {
    if (!jsonOutput) {
      console.log(`  Analyzing ${component.name}...`);
    }
    components[key] = await analyzeComponent(component, []);
  }

  // Analyze bundles
  const bundles = await analyzeBundles();

  // Check for duplication
  const duplication = await analyzeCommandDuplication();

  // Generate composition report
  const report = {
    timestamp: new Date().toISOString(),
    components,
    bundles,
    duplication,
  };

  // Save report
  const reportPath = join(OUTPUT_DIR, 'composition-analysis.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  if (jsonOutput) {
    console.log(reportPath);
  } else {
    console.log('\n' + '═'.repeat(80));
    console.log('BUNDLE COMPOSITION ANALYSIS');
    console.log('═'.repeat(80));

    console.log('\nBundles:');
    for (const [name, bundle] of Object.entries(bundles)) {
      console.log(`\n  ${name}`);
      console.log(`    Size: ${(bundle.actualSize / 1024).toFixed(1)} KB`);
      console.log(`    Includes: ${bundle.included.join(', ')}`);
      if (bundle.excluded?.length) {
        console.log(`    Excludes: ${bundle.excluded.join(', ')}`);
      }
    }

    console.log('\n' + '─'.repeat(80));
    console.log('Duplication Analysis:');
    console.log(`  Estimated duplicate code: ${duplication.estimatedDuplicate}`);
    console.log(
      `  Consolidation targets:\n    • ${duplication.consolidationTargets.join('\n    • ')}`
    );

    console.log('\n' + '═'.repeat(80));
    console.log(`Full report: ${reportPath}`);
    console.log('═'.repeat(80) + '\n');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
```

---

### Phase 2b: Update Main Orchestrator

**File:** `scripts/analysis/comparison/compare-implementations.mjs`

Add composition analysis to the report:

```javascript
// After line 232 (running pattern analyzer)
if (!jsonOutput) {
  console.log('  Analyzing bundle composition...');
}
const compositionPath = await runScript(join(__dirname, 'analyze-bundle-composition.mjs'));
const composition = JSON.parse(await readFile(compositionPath, 'utf-8'));

// Update final report to include composition
const report = {
  timestamp: new Date().toISOString(),
  summary,
  metrics,
  patterns,
  composition, // NEW
};
```

---

### Phase 3: Track Optimization Progress

**Update compare-implementations.mjs to show progress:**

```javascript
/**
 * Recent optimizations with verification
 */
const RECENT_OPTIMIZATIONS = [
  {
    id: 'consolidate-5-commands',
    commit: '606a216',
    date: '2025-12-15',
    commands: ['repeat', 'set', 'default', 'make', 'toggle'],
    approach: 'Base class consolidation + helper extraction',
    estimatedSavings: 150,
    verified: false,
  },
  {
    id: 'dom-modification-base',
    commit: '59890e8',
    date: '2025-12-14',
    commands: ['add', 'remove'],
    approach: 'DOMModificationBase extraction',
    estimatedSavings: 60,
    verified: false,
  },
  {
    id: 'control-flow-signal-base',
    commit: '71abe1c',
    date: '2025-12-14',
    commands: ['break', 'continue', 'exit'],
    approach: 'ControlFlowSignalBase extraction',
    estimatedSavings: 45,
    verified: false,
  },
  {
    id: 'visibility-command-base',
    commit: 'e02bae4',
    date: '2025-12-14',
    commands: ['show', 'hide'],
    approach: 'VisibilityCommandBase consolidation',
    estimatedSavings: 30,
    verified: false,
  },
];

function verifyOptimizations(summary, optimizations) {
  // Cross-reference commands in summary with optimization targets
  const verified = [];

  for (const opt of optimizations) {
    const targetCommands = opt.commands;
    const found = summary.commandComparison.matchedCommands.filter(c =>
      targetCommands.includes(c.name)
    );

    verified.push({
      ...opt,
      verified: found.length === targetCommands.length,
      actualSavings: found.reduce((sum, c) => sum + (c.diff?.potentialSavings || 0), 0),
    });
  }

  return verified;
}

// In generateSummary or printReport:
const verifiedOpts = verifyOptimizations(summary, RECENT_OPTIMIZATIONS);

console.log('\n' + '─'.repeat(80));
console.log('✓ RECENT OPTIMIZATIONS VERIFICATION');
console.log('─'.repeat(80));
for (const opt of verifiedOpts) {
  const status = opt.verified ? '✓' : '?';
  console.log(`  ${status} ${opt.approach}`);
  console.log(`    Commands: ${opt.commands.join(', ')}`);
  console.log(`    Estimated: ${opt.estimatedSavings} lines | Actual: ${opt.actualSavings || '?'}`);
}
```

---

## Testing the Enhancements

```bash
# 1. Run updated comparison analysis
node scripts/analysis/comparison/compare-implementations.mjs

# 2. Save snapshot to track progress
node scripts/analysis/comparison/compare-implementations.mjs --snapshot

# 3. View the detailed report
cat analysis-output/comparison/comparison-report.json | jq '.summary'

# 4. View bundle composition
cat analysis-output/composition/composition-analysis.json | jq '.bundles'

# 5. Check if optimizations are being detected
node scripts/analysis/comparison/compare-implementations.mjs | grep -A 5 "VERIFICATION"
```

---

## Integration Points

After Phase 1 updates, these metrics should be automatically tracked:

1. **In CI/CD:** Run analysis after each bundling change
2. **In PR reviews:** Flag if code ratio increases
3. **In comparisons:** Track delta from previous snapshots
4. **In reports:** Show which commands are still bloated

---

## Expected Improvements

| After Phase | Bundle Size | Code Ratio | Tracked | Actionable |
| ----------- | ----------- | ---------- | ------- | ---------- |
| Current     | 664 KB      | 2.97x      | No      | No         |
| Phase 1     | ?           | ?          | Yes     | Yes        |
| Phase 2     | ?           | <2.8x      | Yes     | Yes        |
| Phase 3     | ?           | <2.5x      | Yes     | Yes        |

**Phase 1 will reveal the actual baseline** - the 2.97x ratio may already be better given recent optimizations.
