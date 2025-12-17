#!/usr/bin/env node
/**
 * Primitive Operations Analysis
 *
 * Analyzes command implementations to identify shared primitive operations.
 * This helps determine consolidation opportunities.
 *
 * Usage:
 *   node scripts/analyze-primitives.mjs
 */

import { readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const COMMANDS_DIR = join(PROJECT_ROOT, 'packages/core/src/commands');
const EXPRESSIONS_DIR = join(PROJECT_ROOT, 'packages/core/src/expressions');

// Primitive operation patterns to detect
const PRIMITIVE_PATTERNS = {
  // Target resolution
  'target-resolution': {
    patterns: [
      /resolveTargets?FromArgs/g,
      /resolveElements?/g,
      /document\.querySelector/g,
      /querySelectorAll/g,
      /closest\s*\(/g,
      /getElementById/g,
    ],
    description: 'CSS selector → Element resolution'
  },

  // Class manipulation
  'class-mutation': {
    patterns: [
      /classList\.add/g,
      /classList\.remove/g,
      /classList\.toggle/g,
      /classList\.contains/g,
      /parseClasses/g,
    ],
    description: 'CSS class add/remove/toggle'
  },

  // Attribute manipulation
  'attribute-mutation': {
    patterns: [
      /setAttribute/g,
      /getAttribute/g,
      /removeAttribute/g,
      /toggleAttribute/g,
      /hasAttribute/g,
      /parseAttribute/g,
      /isAttributeSyntax/g,
    ],
    description: 'Element attribute manipulation'
  },

  // Style manipulation
  'style-mutation': {
    patterns: [
      /style\.\w+\s*=/g,
      /style\.setProperty/g,
      /style\.removeProperty/g,
      /style\.getPropertyValue/g,
      /getComputedStyle/g,
    ],
    description: 'CSS style manipulation'
  },

  // Content insertion
  'content-insertion': {
    patterns: [
      /innerHTML\s*=/g,
      /textContent\s*=/g,
      /innerText\s*=/g,
      /insertAdjacentHTML/g,
      /insertBefore/g,
      /appendChild/g,
      /replaceChild/g,
      /removeChild/g,
    ],
    description: 'DOM content manipulation'
  },

  // Variable operations
  'variable-ops': {
    patterns: [
      /context\.locals/g,
      /context\.globals/g,
      /context\.it\s*=/g,
      /context\.result/g,
      /setTargetValue/g,
      /getCurrentNumericValue/g,
    ],
    description: 'Variable read/write'
  },

  // Event operations
  'event-ops': {
    patterns: [
      /dispatchEvent/g,
      /new\s+CustomEvent/g,
      /new\s+Event/g,
      /preventDefault/g,
      /stopPropagation/g,
      /stopImmediatePropagation/g,
    ],
    description: 'Event dispatch/control'
  },

  // Duration/timing
  'timing': {
    patterns: [
      /parseDuration/g,
      /setTimeout/g,
      /setInterval/g,
      /requestAnimationFrame/g,
      /Promise.*setTimeout/g,
    ],
    description: 'Timing and duration parsing'
  },

  // Element type checking
  'element-check': {
    patterns: [
      /isHTMLElement/g,
      /instanceof\s+HTMLElement/g,
      /instanceof\s+Element/g,
      /tagName\s*===?/g,
      /nodeType\s*===?/g,
    ],
    description: 'Element type validation'
  },

  // Expression evaluation
  'expression-eval': {
    patterns: [
      /evaluator\.evaluate/g,
      /await\s+evaluator/g,
      /ExpressionEvaluator/g,
    ],
    description: 'AST expression evaluation'
  },
};

// Helper imports to track
const HELPER_IMPORTS = [
  'resolveTargetsFromArgs',
  'resolveElement',
  'resolveElements',
  'resolvePossessive',
  'parseClasses',
  'parseAttribute',
  'parseAttributeWithValue',
  'isAttributeSyntax',
  'parseDuration',
  'parseNumericTargetInput',
  'parseVisibilityInput',
  'getCurrentNumericValue',
  'setTargetValue',
  'isHTMLElement',
];

async function findTsFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__' && entry.name !== 'node_modules') {
      files.push(...await findTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function analyzeFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n').length;
  const analysis = {
    file: relative(PROJECT_ROOT, filePath),
    lines,
    primitives: {},
    helpers: [],
    imports: [],
  };

  // Detect primitive operations
  for (const [name, { patterns }] of Object.entries(PRIMITIVE_PATTERNS)) {
    let count = 0;
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) count += matches.length;
    }
    if (count > 0) {
      analysis.primitives[name] = count;
    }
  }

  // Detect helper imports
  for (const helper of HELPER_IMPORTS) {
    const importRegex = new RegExp(`import.*${helper}`, 'g');
    const usageRegex = new RegExp(`\\b${helper}\\b`, 'g');
    if (importRegex.test(content) || usageRegex.test(content)) {
      analysis.helpers.push(helper);
    }
  }

  // Detect imports from helpers/
  const helperImports = content.match(/from\s+['"]\.\.\/helpers\/[^'"]+['"]/g);
  if (helperImports) {
    analysis.imports.push(...helperImports.map(i => i.replace(/from\s+['"]/, '').replace(/['"]$/, '')));
  }

  return analysis;
}

function generatePrimitiveMatrix(commandAnalyses) {
  const matrix = {};
  const allPrimitives = new Set();

  for (const analysis of commandAnalyses) {
    const cmdName = analysis.file.split('/').pop()?.replace('.ts', '') || 'unknown';
    matrix[cmdName] = analysis.primitives;
    Object.keys(analysis.primitives).forEach(p => allPrimitives.add(p));
  }

  return { matrix, primitives: [...allPrimitives] };
}

function findConsolidationOpportunities(matrix) {
  const opportunities = [];

  // Find commands that share the same primitive patterns
  const cmdNames = Object.keys(matrix.matrix);
  const primitiveCmds = {};

  for (const prim of matrix.primitives) {
    primitiveCmds[prim] = cmdNames.filter(cmd => matrix.matrix[cmd][prim] > 0);
  }

  for (const [prim, cmds] of Object.entries(primitiveCmds)) {
    if (cmds.length >= 2) {
      opportunities.push({
        primitive: prim,
        usedBy: cmds,
        description: PRIMITIVE_PATTERNS[prim]?.description || 'Unknown',
        potential: `Shared by ${cmds.length} commands`,
      });
    }
  }

  return opportunities.sort((a, b) => b.usedBy.length - a.usedBy.length);
}

async function main() {
  console.log('═'.repeat(60));
  console.log('          PRIMITIVE OPERATIONS ANALYSIS');
  console.log('═'.repeat(60));

  // Analyze commands
  console.log('\n📦 Analyzing Commands...');
  const commandFiles = await findTsFiles(COMMANDS_DIR);
  const commandAnalyses = [];

  for (const file of commandFiles) {
    // Skip helpers, decorators, index files
    if (file.includes('/helpers/') || file.includes('/decorators/') ||
        file.endsWith('index.ts') || file.includes('__tests__')) {
      continue;
    }
    const analysis = await analyzeFile(file);
    commandAnalyses.push(analysis);
  }

  console.log(`   Analyzed ${commandAnalyses.length} command files\n`);

  // Generate matrix
  const matrix = generatePrimitiveMatrix(commandAnalyses);

  // Print primitive usage table
  console.log('─'.repeat(60));
  console.log('PRIMITIVE USAGE BY COMMAND');
  console.log('─'.repeat(60));

  // Header
  const primAbbrev = {
    'target-resolution': 'TGT',
    'class-mutation': 'CLS',
    'attribute-mutation': 'ATR',
    'style-mutation': 'STY',
    'content-insertion': 'CNT',
    'variable-ops': 'VAR',
    'event-ops': 'EVT',
    'timing': 'TME',
    'element-check': 'CHK',
    'expression-eval': 'EVL',
  };

  console.log('\nLegend:');
  for (const [full, abbr] of Object.entries(primAbbrev)) {
    console.log(`  ${abbr} = ${PRIMITIVE_PATTERNS[full]?.description || full}`);
  }

  console.log('\n' + 'Command'.padEnd(20) + Object.values(primAbbrev).map(a => a.padStart(5)).join(''));
  console.log('─'.repeat(20 + Object.keys(primAbbrev).length * 5));

  // Sort by total primitive usage
  const sortedCmds = Object.entries(matrix.matrix)
    .map(([cmd, prims]) => ({
      cmd,
      prims,
      total: Object.values(prims).reduce((a, b) => a + b, 0)
    }))
    .sort((a, b) => b.total - a.total);

  for (const { cmd, prims, total } of sortedCmds.slice(0, 25)) {
    const row = cmd.padEnd(20);
    const vals = Object.keys(primAbbrev).map(p => {
      const count = prims[p] || 0;
      return (count > 0 ? String(count) : '·').padStart(5);
    }).join('');
    console.log(row + vals + ` │ ${total}`);
  }

  // Find consolidation opportunities
  console.log('\n' + '─'.repeat(60));
  console.log('CONSOLIDATION OPPORTUNITIES');
  console.log('─'.repeat(60));

  const opportunities = findConsolidationOpportunities(matrix);

  for (const opp of opportunities.slice(0, 10)) {
    console.log(`\n📌 ${opp.primitive}`);
    console.log(`   ${opp.description}`);
    console.log(`   Used by: ${opp.usedBy.join(', ')}`);
  }

  // Analyze helper usage
  console.log('\n' + '─'.repeat(60));
  console.log('HELPER FUNCTION USAGE');
  console.log('─'.repeat(60));

  const helperUsage = {};
  for (const analysis of commandAnalyses) {
    for (const helper of analysis.helpers) {
      if (!helperUsage[helper]) helperUsage[helper] = [];
      helperUsage[helper].push(analysis.file.split('/').pop()?.replace('.ts', ''));
    }
  }

  const sortedHelpers = Object.entries(helperUsage)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [helper, cmds] of sortedHelpers) {
    console.log(`\n${helper} (${cmds.length} commands):`);
    console.log(`   ${cmds.slice(0, 8).join(', ')}${cmds.length > 8 ? '...' : ''}`);
  }

  // Summary statistics
  console.log('\n' + '═'.repeat(60));
  console.log('          SUMMARY');
  console.log('═'.repeat(60));

  const totalLines = commandAnalyses.reduce((sum, a) => sum + a.lines, 0);
  const avgPrimitives = commandAnalyses.reduce((sum, a) =>
    sum + Object.keys(a.primitives).length, 0) / commandAnalyses.length;

  console.log(`\n  Total command files: ${commandAnalyses.length}`);
  console.log(`  Total lines: ${totalLines.toLocaleString()}`);
  console.log(`  Avg primitives per command: ${avgPrimitives.toFixed(1)}`);
  console.log(`  Unique primitives: ${matrix.primitives.length}`);
  console.log(`  Shared helpers: ${Object.keys(helperUsage).length}`);

  // Estimate savings
  console.log('\n  ESTIMATED CONSOLIDATION SAVINGS:');

  const primitivesSharedBy3Plus = opportunities.filter(o => o.usedBy.length >= 3);
  console.log(`  • ${primitivesSharedBy3Plus.length} primitives shared by 3+ commands`);
  console.log(`  • If each consolidation saves ~100 lines: ~${primitivesSharedBy3Plus.length * 100} lines`);
  console.log(`  • Estimated total savings: ~${Math.round(totalLines * 0.4)} lines (40%)`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
