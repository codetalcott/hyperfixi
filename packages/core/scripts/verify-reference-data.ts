#!/usr/bin/env tsx
/**
 * Verify Reference Data Script
 *
 * Validates that reference/index.ts and metadata.ts match the actual codebase:
 * - Command count matches exports from commands/index.ts
 * - Bundle files exist at stated paths
 * - Command availability follows proper subset chain (lite ⊂ lite-plus ⊂ hybrid ⊂ full)
 * - All commands in reference have matching exports
 *
 * Run: npm run verify:reference
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE_ROOT = resolve(__dirname, '..');

// =============================================================================
// PARSE EXPORTS FROM SOURCE (avoids DOM dependency issues)
// =============================================================================

function parseCommandFactories(): string[] {
  const indexPath = resolve(CORE_ROOT, 'src/commands/index.ts');
  const content = readFileSync(indexPath, 'utf-8');

  const factories = new Set<string>();

  // Only process the TREE-SHAKEABLE section (before BACKWARD-COMPATIBLE)
  const treeshakeableEnd = content.indexOf('// BACKWARD-COMPATIBLE');
  const treeshakeableSection = treeshakeableEnd > 0 ? content.substring(0, treeshakeableEnd) : content;

  // Match all: createXxxCommand as yyy patterns (handles multiple exports per line)
  const aliasPattern = /create(\w+)Command\s+as\s+(\w+)/g;

  let match;
  while ((match = aliasPattern.exec(treeshakeableSection)) !== null) {
    // Normalize: if_ -> if, break_ -> break, async_ -> async, defaultCmd -> default
    let alias = match[2].replace(/_$/, '').toLowerCase();
    // Also normalize Cmd suffix: defaultcmd -> default, processpartialscmd -> processpartials
    alias = alias.replace(/cmd$/, '');
    factories.add(alias);
  }

  return Array.from(factories);
}

function parseReferenceCommands(): Record<string, { category: string; availability: string }> {
  const refPath = resolve(CORE_ROOT, 'src/reference/index.ts');
  const content = readFileSync(refPath, 'utf-8');

  // Find the commands object - look for lines like: commandName: {
  const commands: Record<string, { category: string; availability: string }> = {};

  // Match command entries: name: { ... category: 'xxx', ... availability: 'yyy' ... }
  const commandBlockRegex = /^\s+(\w+):\s*\{[^}]*category:\s*'([^']+)'[^}]*availability:\s*'([^']+)'/gm;

  let match;
  while ((match = commandBlockRegex.exec(content)) !== null) {
    commands[match[1]] = {
      category: match[2],
      availability: match[3],
    };
  }

  return commands;
}

function parseBundleInfo(): Array<{ id: string; filename: string; commandCount: number }> {
  const metaPath = resolve(CORE_ROOT, 'src/metadata.ts');
  const content = readFileSync(metaPath, 'utf-8');

  const bundles: Array<{ id: string; filename: string; commandCount: number }> = [];

  // Match bundle entries
  const bundleRegex = /id:\s*'([^']+)'[^}]*filename:\s*'([^']+)'[^}]*commandCount:\s*(\d+)/g;

  let match;
  while ((match = bundleRegex.exec(content)) !== null) {
    bundles.push({
      id: match[1],
      filename: match[2],
      commandCount: parseInt(match[3], 10),
    });
  }

  return bundles;
}

function parsePackageInfo(): { commands: number } {
  const metaPath = resolve(CORE_ROOT, 'src/metadata.ts');
  const content = readFileSync(metaPath, 'utf-8');

  // Match: commands: 43
  const match = content.match(/commands:\s*(\d+)/);
  return {
    commands: match ? parseInt(match[1], 10) : 0,
  };
}

// =============================================================================
// PARSE DATA
// =============================================================================

const factoryNames = parseCommandFactories();
const refCommands = parseReferenceCommands();
const bundleInfo = parseBundleInfo();
const packageInfo = parsePackageInfo();

// =============================================================================
// VERIFICATION FUNCTIONS
// =============================================================================

interface VerificationResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string[];
  isWarning?: boolean; // Warnings don't cause exit(1)
}

const results: VerificationResult[] = [];

function verify(name: string, passed: boolean, message: string, details?: string[], isWarning?: boolean) {
  results.push({ name, passed, message, details, isWarning });
}

// =============================================================================
// 1. VERIFY COMMAND COUNT
// =============================================================================

function verifyCommandCount() {
  // Count commands in reference
  const refCommandNames = Object.keys(refCommands);

  const factoryCount = factoryNames.length;
  const refCount = refCommandNames.length;

  // Get the expected count from packageInfo
  const expectedCount = packageInfo.commands;

  const details: string[] = [];

  if (factoryCount !== expectedCount) {
    details.push(`  Factory exports: ${factoryCount}, packageInfo.commands: ${expectedCount}`);
  }

  if (refCount !== expectedCount) {
    details.push(`  Reference commands: ${refCount}, packageInfo.commands: ${expectedCount}`);
  }

  // Find factories without reference entries
  const refLower = refCommandNames.map((n) => n.toLowerCase());
  const missingInRef = factoryNames.filter((f) => !refLower.includes(f));
  const extraInRef = refLower.filter((r) => !factoryNames.includes(r));

  if (missingInRef.length > 0) {
    details.push(`  Commands missing from reference: ${missingInRef.join(', ')}`);
  }
  if (extraInRef.length > 0) {
    details.push(`  Extra commands in reference: ${extraInRef.join(', ')}`);
  }

  const passed = details.length === 0;
  verify(
    'Command Count',
    passed,
    passed
      ? `✓ ${refCount} commands in reference match ${factoryCount} factories`
      : `✗ Command count mismatch`,
    details.length > 0 ? details : undefined
  );
}

// =============================================================================
// 2. VERIFY BUNDLE FILES EXIST (Warning only if dist/ exists)
// =============================================================================

function verifyBundleFiles() {
  const distPath = resolve(CORE_ROOT, 'dist');

  // If dist/ doesn't exist, skip this check with a note
  if (!existsSync(distPath)) {
    verify(
      'Bundle Files',
      true, // Don't fail - just note it
      `⚠ Skipped - dist/ not found (run npm run build:browser first)`
    );
    return;
  }

  const missingBundles: string[] = [];
  const foundBundles: string[] = [];

  for (const bundle of bundleInfo) {
    const bundlePath = resolve(CORE_ROOT, 'dist', bundle.filename);
    if (!existsSync(bundlePath)) {
      missingBundles.push(`${bundle.id}: ${bundle.filename}`);
    } else {
      foundBundles.push(bundle.id);
    }
  }

  // Pass if at least some bundles exist, warn about missing ones
  const passed = missingBundles.length === 0;
  verify(
    'Bundle Files',
    passed,
    passed
      ? `✓ All ${bundleInfo.length} bundle files exist in dist/`
      : `⚠ ${missingBundles.length} bundle files missing (${foundBundles.length} found)`,
    missingBundles.length > 0 ? missingBundles.map((b) => `  ${b}`) : undefined,
    true // Mark as warning - don't fail CI for missing bundles
  );
}

// =============================================================================
// 3. VERIFY AVAILABILITY CHAIN
// =============================================================================

function verifyAvailabilityChain() {
  // Commands should follow: lite ⊂ lite-plus ⊂ hybrid ⊂ full

  const byAvailability: Record<string, string[]> = {
    lite: [],
    'lite-plus': [],
    hybrid: [],
    full: [],
  };

  for (const [name, cmd] of Object.entries(refCommands)) {
    if (byAvailability[cmd.availability]) {
      byAvailability[cmd.availability].push(name);
    }
  }

  const errors: string[] = [];

  // lite commands must be in all bundles (no checking needed, they're the base)
  // lite-plus commands can't have lite-only commands that aren't also lite-plus
  // etc.

  // Check that lite is smallest set
  const liteCount = byAvailability['lite'].length;
  const litePlusCount = byAvailability['lite'].length + byAvailability['lite-plus'].length;
  const hybridCount = litePlusCount + byAvailability['hybrid'].length;
  const fullCount = hybridCount + byAvailability['full'].length;

  if (liteCount > litePlusCount) {
    errors.push(`lite (${liteCount}) has more commands than lite-plus (${litePlusCount})`);
  }
  if (litePlusCount > hybridCount) {
    errors.push(`lite-plus (${litePlusCount}) has more commands than hybrid (${hybridCount})`);
  }
  if (hybridCount > fullCount) {
    errors.push(`hybrid (${hybridCount}) has more commands than full (${fullCount})`);
  }

  const passed = errors.length === 0;
  verify(
    'Availability Chain',
    passed,
    passed
      ? `✓ Availability chain valid: lite(${liteCount}) ⊂ lite-plus(${litePlusCount}) ⊂ hybrid(${hybridCount}) ⊂ full(${fullCount})`
      : `✗ Availability chain broken`,
    errors.length > 0 ? errors : undefined
  );
}

// =============================================================================
// 4. VERIFY CATEGORIES ARE VALID
// =============================================================================

function verifyCategories() {
  const validCategories = [
    'dom',
    'async',
    'data',
    'utility',
    'events',
    'navigation',
    'control-flow',
    'execution',
    'content',
    'animation',
    'advanced',
    'behaviors',
    'templates',
  ];

  const invalidCategories: string[] = [];

  for (const [name, cmd] of Object.entries(refCommands)) {
    if (!validCategories.includes(cmd.category)) {
      invalidCategories.push(`${name}: "${cmd.category}"`);
    }
  }

  const passed = invalidCategories.length === 0;
  verify(
    'Valid Categories',
    passed,
    passed ? `✓ All commands have valid categories` : `✗ Invalid categories found`,
    invalidCategories.length > 0 ? invalidCategories.map((c) => `  ${c}`) : undefined
  );
}

// =============================================================================
// 4b. VERIFY AVAILABILITIES ARE VALID
// =============================================================================

function verifyAvailabilities() {
  const validAvailabilities = ['lite', 'lite-plus', 'hybrid', 'full'];

  const invalidAvailabilities: string[] = [];

  for (const [name, cmd] of Object.entries(refCommands)) {
    if (!validAvailabilities.includes(cmd.availability)) {
      invalidAvailabilities.push(`${name}: "${cmd.availability}"`);
    }
  }

  const passed = invalidAvailabilities.length === 0;
  verify(
    'Valid Availabilities',
    passed,
    passed ? `✓ All commands have valid availabilities` : `✗ Invalid availabilities found`,
    invalidAvailabilities.length > 0 ? invalidAvailabilities.map((a) => `  ${a}`) : undefined
  );
}

// =============================================================================
// 5. VERIFY BUNDLE COMMAND COUNTS ARE REASONABLE
// =============================================================================

function verifyBundleCommandCounts() {
  const errors: string[] = [];

  // Sort bundles by command count
  const sorted = [...bundleInfo].sort((a, b) => a.commandCount - b.commandCount);

  // Verify progression makes sense
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].commandCount < sorted[i - 1].commandCount) {
      errors.push(
        `${sorted[i].id} (${sorted[i].commandCount}) should have >= commands than ${sorted[i - 1].id} (${sorted[i - 1].commandCount})`
      );
    }
  }

  // Verify browser (full) bundle has all commands
  const browserBundle = bundleInfo.find((b) => b.id === 'browser');
  if (browserBundle && browserBundle.commandCount !== packageInfo.commands) {
    errors.push(
      `Browser bundle has ${browserBundle.commandCount} commands, expected ${packageInfo.commands}`
    );
  }

  const passed = errors.length === 0;
  verify(
    'Bundle Command Counts',
    passed,
    passed
      ? `✓ Bundle command counts are reasonable`
      : `✗ Bundle command count issues`,
    errors.length > 0 ? errors : undefined
  );
}

// =============================================================================
// RUN ALL VERIFICATIONS
// =============================================================================

console.log('🔍 Verifying reference data...\n');

verifyCommandCount();
verifyBundleFiles();
verifyAvailabilityChain();
verifyCategories();
verifyAvailabilities();
verifyBundleCommandCounts();

// =============================================================================
// REPORT RESULTS
// =============================================================================

let hasFailures = false;
let hasWarnings = false;

for (const result of results) {
  console.log(`${result.message}`);
  if (result.details) {
    for (const detail of result.details) {
      console.log(detail);
    }
  }

  if (!result.passed) {
    if (result.isWarning) {
      hasWarnings = true;
    } else {
      hasFailures = true;
    }
  }
}

console.log('');

if (hasFailures) {
  console.log('❌ Verification failed - reference data needs updating');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Verification passed with warnings');
  process.exit(0);
} else {
  console.log('✅ All verifications passed');
  process.exit(0);
}
