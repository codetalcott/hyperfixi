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
 * ## The manifest is the spine (Arc A step 3)
 *
 * This script used to compare two hand-maintained lists against EACH OTHER —
 * `commands/index.ts`'s factory aliases and `reference/index.ts`'s command
 * entries — plus a count in `metadata.ts`. Two lists agreeing tells you they
 * agree; it does not tell you either is right, and an identical omission in
 * both passed clean.
 *
 * All three are now scored against `commands/manifest.ts`, which is itself
 * gated against the live registry in both directions by
 * `runtime/__tests__/command-manifest-audit.test.ts`. So the chain terminates
 * at what the engine actually executes instead of closing on itself.
 *
 * Importing the manifest is safe here despite the "parse source text to avoid
 * DOM dependency issues" rule the rest of this file follows: every import in
 * `manifest.ts` is `import type`, so it pulls in no runtime code at all.
 *
 * Run: npm run verify:reference
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { COMMAND_MANIFEST, toRegisteredName } from '../src/commands/manifest';
// Imported rather than text-scraped for the same reason as the manifest above:
// `metadata.ts` is pure data with no DOM reach. It has to be imported now —
// step 4.4 made the full-runtime counts DERIVED expressions
// (`FULL_RUNTIME_COMMAND_COUNT`), and the regexes this file used to scrape them
// with (`commandCount:\s*(\d+)`) match only literal digits, so they silently
// skipped exactly the entries the gate most needs to see.
import { bundleInfo, packageInfo } from '../src/metadata';
// The bundle→source pairing lives in one place so this gate and the audit test
// cannot disagree about which file backs which bundle.
import {
  BUNDLES_WITH_COMMAND_LISTS,
  BUNDLES_WITH_FACTORY_LISTS,
  BUNDLES_INHERITING,
} from '../src/compatibility/bundle-sources';

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
  const treeshakeableSection =
    treeshakeableEnd > 0 ? content.substring(0, treeshakeableEnd) : content;

  // Match all: createXxxCommand as yyy patterns (handles multiple exports per line)
  const aliasPattern = /create(\w+)Command\s+as\s+(\w+)/g;

  let match;
  while ((match = aliasPattern.exec(treeshakeableSection)) !== null) {
    // Normalize the export alias to the name the registry dispatches on:
    // if_ -> if, defaultCmd -> default, pushUrl -> push, pseudo -> pseudo-command.
    // Shared with the audit test so the two cannot normalize differently.
    factories.add(toRegisteredName(match[2]));
  }

  return Array.from(factories);
}

function parseReferenceCommands(): Record<string, { category: string; availability: string }> {
  const refPath = resolve(CORE_ROOT, 'src/reference/index.ts');
  const content = readFileSync(refPath, 'utf-8');

  // Find the commands object - look for lines like: commandName: {
  const commands: Record<string, { category: string; availability: string }> = {};

  // Match command entries: name: { ... category: 'xxx', ... availability: 'yyy' ... }
  const commandBlockRegex =
    /^\s+(\w+):\s*\{[^}]*category:\s*'([^']+)'[^}]*availability:\s*'([^']+)'/gm;

  let match;
  while ((match = commandBlockRegex.exec(content)) !== null) {
    commands[match[1]] = {
      category: match[2],
      availability: match[3],
    };
  }

  return commands;
}

// `parseBundleInfo` / `parsePackageInfo` were deleted in step 4.4 — see the
// `metadata` import above. The values now come from the module itself.

// =============================================================================
// PARSE DATA
// =============================================================================

const factoryNames = parseCommandFactories();
const refCommands = parseReferenceCommands();

/** The registry-of-record every list below is scored against. */
const manifestNames = COMMAND_MANIFEST.map(entry => entry.name);
const manifestCommands = new Set(manifestNames);

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

function verify(
  name: string,
  passed: boolean,
  message: string,
  details?: string[],
  isWarning?: boolean
) {
  results.push({ name, passed, message, details, isWarning });
}

// =============================================================================
// 1. VERIFY COMMAND COUNT
// =============================================================================

/** Score `list` against the manifest in both directions. */
function diffAgainstManifest(list: string[]): { missing: string[]; extra: string[] } {
  const present = new Set(list);
  return {
    missing: manifestNames.filter(n => !present.has(n)),
    extra: [...new Set(list)].filter(n => !manifestCommands.has(n)).sort(),
  };
}

function verifyCommandCount() {
  const refCommandNames = Object.keys(refCommands);
  const refNormalized = refCommandNames.map(toRegisteredName);

  const details: string[] = [];

  // The manifest is the spine: every list is scored against IT, not against
  // whichever other list happens to sit next to it. An omission shared by two
  // hand-maintained lists used to pass this check clean.
  if (packageInfo.commands !== manifestNames.length) {
    details.push(
      `  packageInfo.commands: ${packageInfo.commands}, manifest: ${manifestNames.length}`
    );
  }

  const factories = diffAgainstManifest(factoryNames);
  if (factories.missing.length > 0) {
    details.push(`  Manifest commands with no factory export: ${factories.missing.join(', ')}`);
  }
  if (factories.extra.length > 0) {
    details.push(`  Factory exports the manifest does not name: ${factories.extra.join(', ')}`);
  }

  const reference = diffAgainstManifest(refNormalized);
  if (reference.missing.length > 0) {
    details.push(`  Manifest commands missing from reference: ${reference.missing.join(', ')}`);
  }
  if (reference.extra.length > 0) {
    details.push(`  Reference entries the manifest does not name: ${reference.extra.join(', ')}`);
  }

  const passed = details.length === 0;
  verify(
    'Command Count',
    passed,
    passed
      ? `✓ ${manifestNames.length} manifest commands match ${factoryNames.length} factory exports and ${refCommandNames.length} reference entries`
      : `✗ Command set mismatch against commands/manifest.ts`,
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
    missingBundles.length > 0 ? missingBundles.map(b => `  ${b}`) : undefined,
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
    invalidCategories.length > 0 ? invalidCategories.map(c => `  ${c}`) : undefined
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
    invalidAvailabilities.length > 0 ? invalidAvailabilities.map(a => `  ${a}`) : undefined
  );
}

// =============================================================================
// 5. VERIFY BUNDLE COMMAND COUNTS ARE REASONABLE
// =============================================================================

/**
 * Every bundle's advertised commandCount is re-derived from its own source
 * rather than trusted — the pairing lives in `compatibility/bundle-sources.ts`.
 * lite-plus and the two hybrids were stale by 4-5 commands each for months
 * because nothing compared the advertised number to the real list; step 4.4
 * widened the same idea to the rest and caught three more (`minimal` 30→10,
 * `standard` 35→25, `multilingual` 59→52).
 */

/** Count `createXCommand()` calls in a bundle's tree-shakeable runtime list. */
function actualFactoryCount(sourceFile: string): number | null {
  const bundlePath = resolve(__dirname, '../src/compatibility', sourceFile);
  if (!existsSync(bundlePath)) return null;
  const source = readFileSync(bundlePath, 'utf-8');
  const calls = source.match(/^\s+create[A-Za-z0-9]*Command\(\),?$/gm);
  return calls ? new Set(calls.map(c => c.trim())).size : null;
}

/** Count entries in a bundle source's `commands: [ ... ]` array. */
function actualCommandCount(sourceFile: string): number | null {
  const bundlePath = resolve(__dirname, '../src/compatibility', sourceFile);
  if (!existsSync(bundlePath)) return null;
  const source = readFileSync(bundlePath, 'utf-8');
  const block = source.match(/commands:\s*\[([\s\S]*?)\]/);
  if (!block) return null;
  return (block[1].match(/'[^']+'/g) ?? []).length;
}

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
  const browserBundle = bundleInfo.find(b => b.id === 'browser');
  if (browserBundle && browserBundle.commandCount !== packageInfo.commands) {
    errors.push(
      `Browser bundle has ${browserBundle.commandCount} commands, expected ${packageInfo.commands}`
    );
  }

  // Derive, don't trust: compare each list-publishing bundle's advertised count
  // against the commands it actually ships.
  for (const [id, sourceFile] of Object.entries(BUNDLES_WITH_COMMAND_LISTS)) {
    const bundle = bundleInfo.find(b => b.id === id);
    if (!bundle) continue;
    const actual = actualCommandCount(sourceFile);
    if (actual === null) {
      errors.push(`${id}: could not read the commands array from ${sourceFile}`);
    } else if (actual !== bundle.commandCount) {
      errors.push(
        `${id} advertises ${bundle.commandCount} commands but ${sourceFile} ships ${actual}`
      );
    }
  }

  // Same, for the bundles that hand-pick factories without publishing an array.
  for (const [id, sourceFile] of Object.entries(BUNDLES_WITH_FACTORY_LISTS)) {
    const bundle = bundleInfo.find(b => b.id === id);
    if (!bundle) continue;
    const actual = actualFactoryCount(sourceFile);
    if (actual === null) {
      errors.push(`${id}: could not read the factory list from ${sourceFile}`);
    } else if (actual !== bundle.commandCount) {
      errors.push(
        `${id} advertises ${bundle.commandCount} commands but ${sourceFile} registers ${actual}`
      );
    }
  }

  // And the bundles that re-export another bundle wholesale.
  for (const [id, inheritsFrom] of Object.entries(BUNDLES_INHERITING)) {
    const bundle = bundleInfo.find(b => b.id === id);
    const parent = bundleInfo.find(b => b.id === inheritsFrom);
    if (!bundle || !parent) continue;
    if (bundle.commandCount !== parent.commandCount) {
      errors.push(
        `${id} re-exports ${inheritsFrom} but advertises ${bundle.commandCount} vs its ${parent.commandCount}`
      );
    }
  }

  const passed = errors.length === 0;
  verify(
    'Bundle Command Counts',
    passed,
    passed ? `✓ Bundle command counts are reasonable` : `✗ Bundle command count issues`,
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
