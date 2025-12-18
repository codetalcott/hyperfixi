#!/usr/bin/env node
/**
 * Extract Command Metrics
 *
 * Extracts detailed metrics from command implementations in both:
 * - Original _hyperscript (single file, inline patterns)
 * - HyperFixi (TypeScript class-based patterns)
 *
 * Usage:
 *   node scripts/analysis/comparison/extract-command-metrics.mjs
 *   node scripts/analysis/comparison/extract-command-metrics.mjs --json
 */

import { readFile, readdir, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../../..');

// Try multiple locations for original _hyperscript
const ORIGINAL_PATHS = [
  '/Users/williamtalcott/projects/3rd-party-clones/_hyperscript/src/_hyperscript.js',
  '/Users/williamtalcott/projects/_hyperscript/src/_hyperscript.js',
];
let ORIGINAL_PATH = ORIGINAL_PATHS.find(path => existsSync(path)) || ORIGINAL_PATHS[0];

// Support both v1 and v2 command layouts
const HYPERFIXI_COMMAND_DIRS = [
  join(PROJECT_ROOT, 'packages/core/src/commands-v2/'),
  join(PROJECT_ROOT, 'packages/core/src/commands/'),
].filter(dir => existsSync(dir));

const OUTPUT_DIR = join(PROJECT_ROOT, 'analysis-output/comparison');

// Command name mapping (HyperFixi name -> original name if different)
const COMMAND_ALIASES = {
  'increment': 'increment',
  'decrement': 'increment', // Same in original
  'numeric-modify': 'increment',
};

/**
 * Extract command blocks from original _hyperscript
 */
async function extractOriginalCommands(content) {
  const commands = {};

  // Match parser.addCommand("name", function...) blocks
  const addCommandRegex = /parser\.addCommand\(\s*["'](\w+)["']\s*,\s*function\s*\([^)]*\)\s*\{/g;

  let match;
  const positions = [];

  while ((match = addCommandRegex.exec(content)) !== null) {
    positions.push({
      name: match[1],
      start: match.index,
      headerEnd: match.index + match[0].length
    });
  }

  // Find the end of each command by matching braces
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const nextStart = positions[i + 1]?.start || content.length;

    // Find the closing of the addCommand call
    let depth = 1;
    let endPos = pos.headerEnd;

    for (let j = pos.headerEnd; j < nextStart && depth > 0; j++) {
      if (content[j] === '{') depth++;
      else if (content[j] === '}') depth--;
      if (depth === 0) {
        // Find the closing );
        const closingMatch = content.slice(j, j + 10).match(/\}\s*\)/);
        if (closingMatch) {
          endPos = j + closingMatch[0].length;
        } else {
          endPos = j + 1;
        }
        break;
      }
    }

    const commandContent = content.slice(pos.start, endPos);
    const lines = commandContent.split('\n');

    // Analyze structure
    const hasArgs = /args\s*:\s*\[/.test(commandContent);
    const hasOp = /op\s*:\s*function/.test(commandContent);
    const hasExecute = /execute\s*:\s*function/.test(commandContent);
    const returnBlocks = (commandContent.match(/return\s*\{/g) || []).length;

    // Count parse vs execute lines (rough estimate)
    const opMatch = commandContent.match(/op\s*:\s*function[^{]*\{/);
    let parseLines = lines.length;
    let executeLines = 0;

    if (opMatch) {
      const opStart = commandContent.indexOf(opMatch[0]);
      const beforeOp = commandContent.slice(0, opStart).split('\n').length;
      parseLines = beforeOp;
      executeLines = lines.length - beforeOp;
    }

    // Detect shared function usage
    const sharedFunctions = [];
    if (/runtime\.implicitLoop/.test(commandContent)) sharedFunctions.push('implicitLoop');
    if (/runtime\.nullCheck/.test(commandContent)) sharedFunctions.push('nullCheck');
    if (/runtime\.findNext/.test(commandContent)) sharedFunctions.push('findNext');
    if (/runtime\.forEach/.test(commandContent)) sharedFunctions.push('forEach');
    if (/runtime\.unifiedExec/.test(commandContent)) sharedFunctions.push('unifiedExec');
    if (/runtime\.unifiedEval/.test(commandContent)) sharedFunctions.push('unifiedEval');

    commands[pos.name] = {
      lines: lines.length,
      parseLines,
      executeLines,
      hasArgs,
      hasOp,
      hasExecute,
      returnBlocks,
      sharedFunctions,
      boilerplateRatio: 0.1, // Original has minimal boilerplate
      startLine: content.slice(0, pos.start).split('\n').length,
    };
  }

  return commands;
}

/**
 * Estimate minified size of content
 */
function estimateMinifiedSize(content) {
  // Remove comments, whitespace, and estimate minified output
  let minified = content
    .replace(/\/\*[\s\S]*?\*\//g, '')        // Remove block comments
    .replace(/\/\/.*/g, '')                  // Remove line comments
    .replace(/\s+/g, ' ')                    // Collapse whitespace
    .replace(/\s*([{}();,:])\s*/g, '$1');    // Remove spaces around symbols

  return minified.length;
}

/**
 * Extract metrics from a HyperFixi command file
 */
async function extractHyperFixiCommand(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const totalLines = lines.length;

  // Extract command name from decorator or class name
  const commandMatch = content.match(/@command\(\s*\{\s*name:\s*['"](\w+)['"]/);
  const classMatch = content.match(/export\s+class\s+(\w+)/);
  const name = commandMatch?.[1] || classMatch?.[1]?.replace(/Command$/, '').toLowerCase() || 'unknown';

  // Count different sections
  let importLines = 0;
  let typeLines = 0;
  let decoratorLines = 0;
  let parseInputLines = 0;
  let executeLines = 0;
  let validateLines = 0;
  let otherLines = 0;

  let currentSection = 'imports';
  let braceDepth = 0;
  let inMethod = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track imports
    if (trimmed.startsWith('import ')) {
      importLines++;
      continue;
    }

    // Track type definitions
    if (/^(export\s+)?(type|interface)\s+/.test(trimmed)) {
      currentSection = 'types';
    }

    if (currentSection === 'types') {
      typeLines++;
      if (trimmed === ';' || (trimmed.endsWith(';') && !trimmed.includes('{'))) {
        currentSection = 'other';
      }
      continue;
    }

    // Track decorators
    if (trimmed.startsWith('@meta(') || trimmed.startsWith('@command(')) {
      currentSection = 'decorator';
    }

    if (currentSection === 'decorator') {
      decoratorLines++;
      if (trimmed.startsWith('@command(') || (trimmed === '})' && !inMethod)) {
        currentSection = 'other';
      }
      continue;
    }

    // Track methods
    if (/async\s+parseInput\s*\(/.test(trimmed) || /parseInput\s*\(/.test(trimmed)) {
      inMethod = 'parseInput';
      braceDepth = 0;
    } else if (/async\s+execute\s*\(/.test(trimmed) || /execute\s*\(/.test(trimmed)) {
      inMethod = 'execute';
      braceDepth = 0;
    } else if (/validate\s*\(/.test(trimmed)) {
      inMethod = 'validate';
      braceDepth = 0;
    }

    // Count braces to track method boundaries
    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;

    if (inMethod === 'parseInput') {
      parseInputLines++;
    } else if (inMethod === 'execute') {
      executeLines++;
    } else if (inMethod === 'validate') {
      validateLines++;
    } else {
      otherLines++;
    }

    if (braceDepth <= 0 && inMethod) {
      inMethod = null;
    }
  }

  // Detect helper usage
  const helperCalls = [];
  const helpers = [
    'batchAddClasses', 'batchRemoveClasses', 'batchSetAttribute',
    'batchSetStyles', 'resolveTargets', 'parseAttributeWithValue',
    'parseClassNames', 'parseDuration', 'setTargetValue'
  ];

  for (const helper of helpers) {
    if (content.includes(helper)) {
      helperCalls.push(helper);
    }
  }

  // Check if extends base class
  const extendsBase = /extends\s+\w+Base/.test(content);
  const baseClass = content.match(/extends\s+(\w+)/)?.[1] || null;

  // Calculate boilerplate ratio
  const boilerplate = importLines + typeLines + decoratorLines + validateLines;
  const boilerplateRatio = boilerplate / totalLines;

  // Calculate minified size
  const sourceBytes = Buffer.byteLength(content, 'utf-8');
  const estimatedMinifiedBytes = estimateMinifiedSize(content);
  const compressionRatio = Math.round((estimatedMinifiedBytes / sourceBytes) * 100) / 100;

  return {
    name,
    file: relative(PROJECT_ROOT, filePath),
    lines: totalLines,
    parseLines: parseInputLines,
    executeLines,
    typeLines,
    decoratorLines,
    importLines,
    validateLines,
    otherLines,
    boilerplateRatio: Math.round(boilerplateRatio * 100) / 100,
    helperCalls,
    extendsBase,
    baseClass,
    sourceBytes,
    estimatedMinifiedBytes,
    compressionRatio,
  };
}

/**
 * Find all TypeScript command files
 */
async function findCommandFiles(dir) {
  const files = [];
  if (!existsSync(dir)) return files;

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !['helpers', 'decorators', '__tests__', 'node_modules'].includes(entry.name)) {
      files.push(...await findCommandFiles(fullPath));
    } else if (entry.name.endsWith('.ts') &&
               !entry.name.endsWith('.test.ts') &&
               !entry.name.endsWith('.d.ts') &&
               !entry.name.startsWith('index')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Find all command files across v1 and v2 directories
 */
async function findAllCommandFiles() {
  const allFiles = [];
  const seenCommands = new Set();

  for (const dir of HYPERFIXI_COMMAND_DIRS) {
    const files = await findCommandFiles(dir);

    for (const file of files) {
      // Extract command name from file content
      try {
        const content = await readFile(file, 'utf-8');
        const nameMatch = content.match(/@command\(\s*\{\s*name:\s*['"](\w+)['"]/);
        const className = file.match(/\/(\w+)\./);
        const name = nameMatch?.[1] ||
                     className?.[1]?.replace(/Command$/, '').toLowerCase() ||
                     'unknown';

        // Prefer v2 implementations (more recent, first in dir list)
        if (!seenCommands.has(name)) {
          allFiles.push(file);
          seenCommands.add(name);
        }
      } catch (err) {
        // Skip files we can't parse
      }
    }
  }

  return allFiles;
}

/**
 * Calculate comparison metrics between original and HyperFixi
 */
function calculateComparison(original, hyperfixi) {
  const comparison = [];

  // Get all unique command names
  const allCommands = new Set([
    ...Object.keys(original),
    ...hyperfixi.map(h => h.name)
  ]);

  for (const name of allCommands) {
    const orig = original[name];
    const hf = hyperfixi.find(h => h.name === name || COMMAND_ALIASES[h.name] === name);

    comparison.push({
      name,
      original: orig ? {
        lines: orig.lines,
        parseLines: orig.parseLines,
        executeLines: orig.executeLines,
        boilerplateRatio: orig.boilerplateRatio,
        sharedFunctions: orig.sharedFunctions,
      } : null,
      hyperfixi: hf ? {
        lines: hf.lines,
        parseLines: hf.parseLines,
        executeLines: hf.executeLines,
        typeLines: hf.typeLines,
        boilerplateRatio: hf.boilerplateRatio,
        helperCalls: hf.helperCalls,
        extendsBase: hf.extendsBase,
      } : null,
      diff: orig && hf ? {
        linesDiff: hf.lines - orig.lines,
        ratio: Math.round((hf.lines / orig.lines) * 100) / 100,
        potentialSavings: Math.max(0, hf.lines - orig.lines - 20), // Allow 20 lines for type safety
      } : null,
    });
  }

  return comparison.sort((a, b) => {
    // Sort by potential savings descending
    const aSavings = a.diff?.potentialSavings || 0;
    const bSavings = b.diff?.potentialSavings || 0;
    return bSavings - aSavings;
  });
}

/**
 * Print metrics table
 */
function printMetricsTable(comparison) {
  console.log('\n' + '═'.repeat(100));
  console.log('  COMMAND METRICS COMPARISON: Original _hyperscript vs HyperFixi');
  console.log('═'.repeat(100));

  console.log('\n' + 'Command'.padEnd(15) +
    'Orig'.padStart(6) +
    'HF'.padStart(6) +
    'Diff'.padStart(7) +
    'Ratio'.padStart(7) +
    'Parse'.padStart(7) +
    'Exec'.padStart(6) +
    'Types'.padStart(7) +
    'Boiler%'.padStart(8) +
    'Potential'.padStart(10)
  );
  console.log('─'.repeat(100));

  let totalOriginal = 0;
  let totalHyperfixi = 0;
  let totalPotential = 0;
  let matchedCount = 0;

  for (const cmd of comparison) {
    if (!cmd.original || !cmd.hyperfixi) continue;

    matchedCount++;
    totalOriginal += cmd.original.lines;
    totalHyperfixi += cmd.hyperfixi.lines;
    totalPotential += cmd.diff?.potentialSavings || 0;

    const row = cmd.name.padEnd(15) +
      String(cmd.original.lines).padStart(6) +
      String(cmd.hyperfixi.lines).padStart(6) +
      (cmd.diff.linesDiff > 0 ? '+' : '') + String(cmd.diff.linesDiff).padStart(6) +
      (cmd.diff.ratio + 'x').padStart(7) +
      String(cmd.hyperfixi.parseLines).padStart(7) +
      String(cmd.hyperfixi.executeLines).padStart(6) +
      String(cmd.hyperfixi.typeLines).padStart(7) +
      (Math.round(cmd.hyperfixi.boilerplateRatio * 100) + '%').padStart(8) +
      ('~' + cmd.diff.potentialSavings).padStart(10);

    console.log(row);
  }

  console.log('─'.repeat(100));
  console.log('TOTALS'.padEnd(15) +
    String(totalOriginal).padStart(6) +
    String(totalHyperfixi).padStart(6) +
    ('+' + (totalHyperfixi - totalOriginal)).padStart(7) +
    ((totalHyperfixi / totalOriginal).toFixed(1) + 'x').padStart(7) +
    ''.padStart(7) +
    ''.padStart(6) +
    ''.padStart(7) +
    ''.padStart(8) +
    ('~' + totalPotential).padStart(10)
  );

  // Summary
  console.log('\n' + '─'.repeat(100));
  console.log('SUMMARY');
  console.log('─'.repeat(100));
  console.log(`  Matched commands: ${matchedCount}`);
  console.log(`  Original total: ${totalOriginal} lines`);
  console.log(`  HyperFixi total: ${totalHyperfixi} lines`);
  console.log(`  Overhead: ${totalHyperfixi - totalOriginal} lines (${((totalHyperfixi / totalOriginal - 1) * 100).toFixed(0)}%)`);
  console.log(`  Potential savings: ~${totalPotential} lines`);
  console.log(`  (Savings account for ~20 lines type safety overhead per command)`);
}

/**
 * Print HyperFixi-only commands
 */
function printHyperFixiOnly(hyperfixi, originalNames) {
  const hfOnly = hyperfixi.filter(h => !originalNames.has(h.name));

  if (hfOnly.length === 0) return;

  console.log('\n' + '─'.repeat(100));
  console.log('HYPERFIXI-ONLY COMMANDS (no original equivalent)');
  console.log('─'.repeat(100));

  for (const cmd of hfOnly.slice(0, 15)) {
    console.log(`  ${cmd.name.padEnd(20)} ${String(cmd.lines).padStart(4)} lines  ${cmd.file}`);
  }

  if (hfOnly.length > 15) {
    console.log(`  ... and ${hfOnly.length - 15} more`);
  }
}

async function main() {
  const jsonOutput = process.argv.includes('--json');

  if (!jsonOutput) {
    console.log('Extracting command metrics from both codebases...\n');
  }

  // Extract original _hyperscript commands
  if (!existsSync(ORIGINAL_PATH)) {
    console.error(`Original _hyperscript not found at: ${ORIGINAL_PATH}`);
    console.error('Please clone _hyperscript to that location first.');
    process.exit(1);
  }

  const originalContent = await readFile(ORIGINAL_PATH, 'utf-8');
  const originalCommands = await extractOriginalCommands(originalContent);

  if (!jsonOutput) {
    console.log(`Found ${Object.keys(originalCommands).length} commands in original _hyperscript`);
  }

  // Extract HyperFixi commands from all directories
  const commandFiles = await findAllCommandFiles();
  const hyperfixiCommands = [];

  for (const file of commandFiles) {
    try {
      const metrics = await extractHyperFixiCommand(file);
      hyperfixiCommands.push(metrics);
    } catch (err) {
      if (!jsonOutput) {
        console.warn(`  Warning: Could not analyze ${file}: ${err.message}`);
      }
    }
  }

  if (!jsonOutput) {
    console.log(`Found ${hyperfixiCommands.length} command files in HyperFixi`);
    console.log(`  Searched in: ${HYPERFIXI_COMMAND_DIRS.join(', ')}`);
  }

  // Calculate comparison
  const comparison = calculateComparison(originalCommands, hyperfixiCommands);

  // Output
  if (jsonOutput) {
    const output = {
      timestamp: new Date().toISOString(),
      original: {
        path: ORIGINAL_PATH,
        commands: originalCommands,
        totalCommands: Object.keys(originalCommands).length,
      },
      hyperfixi: {
        paths: HYPERFIXI_COMMAND_DIRS,
        commands: hyperfixiCommands,
        totalCommands: hyperfixiCommands.length,
      },
      comparison,
    };

    // Ensure output directory exists
    await mkdir(OUTPUT_DIR, { recursive: true });
    const outputPath = join(OUTPUT_DIR, 'command-metrics.json');
    await writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(outputPath);
  } else {
    printMetricsTable(comparison);
    printHyperFixiOnly(hyperfixiCommands, new Set(Object.keys(originalCommands)));
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
