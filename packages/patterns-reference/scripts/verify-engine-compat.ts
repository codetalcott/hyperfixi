/**
 * Verify Engine Compatibility Script
 *
 * Determines whether each pattern works in standard _hyperscript, lokascript only,
 * or both engines. Uses semantic parsing + extension detection heuristics.
 *
 * Strategy:
 *   1. canParse(code, 'en') via @lokascript/semantic
 *   2. Scan for lokascript-only extension syntax
 *   3. Parses + no extensions → "both"
 *      Parses + extensions   → "lokascript"
 *      Doesn't parse         → null (needs manual review)
 *
 * Usage:
 *   npx tsx scripts/verify-engine-compat.ts [--dry-run] [--verbose] [--force]
 *
 * Options:
 *   --dry-run   Report what would change without updating the database
 *   --verbose   Print per-pattern details
 *   --force     Re-verify patterns that already have an engine value
 */

import Database from 'better-sqlite3';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { canParse } from '@lokascript/semantic';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_DB_PATH = resolve(__dirname, '../data/patterns.db');
const EXTENSIONS_PATH = resolve(__dirname, '../data/hyperfixi-extensions.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
const force = args.includes('--force');

// =============================================================================
// Types
// =============================================================================

interface PatternRow {
  id: string;
  title: string;
  raw_code: string;
  feature: string | null;
  engine: string | null;
}

interface ExtensionMatch {
  extensionId: string;
  extensionName: string;
  matchedText: string;
}

type EngineResult = 'hyperscript' | 'lokascript' | 'both' | null;

// =============================================================================
// Extension Detection
// =============================================================================

/**
 * Detect lokascript-only extension syntax in hyperscript code.
 *
 * Heuristics derived from data/hyperfixi-extensions.json:
 *   - Possessive dot notation: my.property, its.property, your.property
 *   - Optional chaining: my?.property, its?.property, your?.property
 *   - Enhanced type conversion: as FormData, as JSON, as Object, as Date
 */
function detectExtensions(code: string): ExtensionMatch[] {
  const matches: ExtensionMatch[] = [];

  // Possessive dot notation: my.prop, its.prop, your.prop
  // Standard _hyperscript uses space: "my property" not "my.property"
  const dotNotationRegex = /\b(my|its|your)\.(\w)/g;
  let match: RegExpExecArray | null;
  while ((match = dotNotationRegex.exec(code)) !== null) {
    matches.push({
      extensionId: 'possessive-dot-notation',
      extensionName: 'Possessive Dot Notation',
      matchedText: match[0],
    });
  }

  // Optional chaining: my?.prop, its?.prop, your?.prop
  const optionalChainingRegex = /\b(my|its|your)\?\.\w/g;
  while ((match = optionalChainingRegex.exec(code)) !== null) {
    matches.push({
      extensionId: 'possessive-dot-notation',
      extensionName: 'Optional Chaining (Possessive)',
      matchedText: match[0],
    });
  }

  // Enhanced type conversion: as FormData, as JSON, as Object, as Date
  // Standard _hyperscript supports: as String, as Int, as Float, as Number, as Array
  const typeConversionRegex = /\bas\s+(FormData|JSON|Object|Date)\b/g;
  while ((match = typeConversionRegex.exec(code)) !== null) {
    matches.push({
      extensionId: 'enhanced-type-conversion',
      extensionName: 'Enhanced Type Conversion',
      matchedText: match[0],
    });
  }

  return matches;
}

// =============================================================================
// Main
// =============================================================================

async function verifyEngineCompat() {
  const modeLabel = dryRun ? ' (DRY RUN)' : '';
  console.log(`Verifying engine compatibility${modeLabel}...\n`);

  if (!existsSync(DEFAULT_DB_PATH)) {
    console.error(`Database not found: ${DEFAULT_DB_PATH}`);
    console.error('Run: npm run db:init first');
    process.exit(1);
  }

  // Load extensions metadata (informational only - heuristics are hardcoded above)
  if (existsSync(EXTENSIONS_PATH)) {
    const extensions = JSON.parse(readFileSync(EXTENSIONS_PATH, 'utf-8'));
    console.log(`Extensions catalog: ${extensions.extensions.length} known extensions`);
    console.log(`Tested against: ${extensions.compatibilityNotes?.testedAgainst || 'unknown'}\n`);
  }

  const db = new Database(DEFAULT_DB_PATH);

  try {
    // Query patterns
    const query = force
      ? `SELECT id, title, raw_code, feature, engine FROM code_examples ORDER BY title`
      : `SELECT id, title, raw_code, feature, engine FROM code_examples WHERE engine IS NULL ORDER BY title`;

    const patterns = db.prepare(query).all() as PatternRow[];

    // Count already-set patterns
    const alreadySet = db.prepare(
      `SELECT engine, COUNT(*) as count FROM code_examples WHERE engine IS NOT NULL GROUP BY engine`
    ).all() as { engine: string; count: number }[];

    if (alreadySet.length > 0) {
      console.log('Already classified:');
      for (const row of alreadySet) {
        console.log(`  ${row.engine}: ${row.count} patterns`);
      }
      console.log();
    }

    console.log(`Checking ${patterns.length} pattern${patterns.length === 1 ? '' : 's'}${force ? ' (--force: including already-classified)' : ''}...\n`);

    if (patterns.length === 0) {
      console.log('Nothing to verify. Use --force to re-check all patterns.');
      return;
    }

    const updateStmt = dryRun
      ? null
      : db.prepare(`UPDATE code_examples SET engine = ? WHERE id = ?`);

    // Stats
    let countBoth = 0;
    let countLokascript = 0;
    let countNull = 0;
    let countChanged = 0;
    const extensionsFound: Record<string, string[]> = {};

    for (const p of patterns) {
      let result: EngineResult;
      let extensions: ExtensionMatch[] = [];
      let parseSuccess = false;

      // Step 1: Try parsing with lokascript semantic parser
      try {
        parseSuccess = canParse(p.raw_code, 'en');
      } catch {
        parseSuccess = false;
      }

      if (!parseSuccess) {
        // Pattern doesn't parse — leave as null
        result = null;
        countNull++;

        if (verbose) {
          console.log(`  ? [${p.id}] "${p.title}" — does not parse, skipping`);
        }
      } else {
        // Step 2: Check for lokascript-only extensions
        extensions = detectExtensions(p.raw_code);

        if (extensions.length > 0) {
          result = 'lokascript';
          countLokascript++;

          // Track which extensions were found
          for (const ext of extensions) {
            if (!extensionsFound[ext.extensionId]) {
              extensionsFound[ext.extensionId] = [];
            }
            extensionsFound[ext.extensionId].push(p.id);
          }

          if (verbose) {
            const extNames = [...new Set(extensions.map(e => e.extensionName))].join(', ');
            console.log(`  ◆ [${p.id}] "${p.title}" → lokascript (${extNames})`);
          }
        } else {
          result = 'both';
          countBoth++;

          if (verbose) {
            console.log(`  ✓ [${p.id}] "${p.title}" → both`);
          }
        }
      }

      // Step 3: Update database
      const changed = result !== p.engine;
      if (changed) {
        countChanged++;
        if (updateStmt && result !== null) {
          updateStmt.run(result, p.id);
        } else if (updateStmt && result === null) {
          // Keep as null — don't update
        }
      }
    }

    // Print summary
    console.log(`\nVerification complete!${modeLabel}`);
    console.log(`  Checked:    ${patterns.length}`);
    console.log(`  Both:       ${countBoth}`);
    console.log(`  LokaScript: ${countLokascript}`);
    console.log(`  Unparsed:   ${countNull}`);
    console.log(`  Changed:    ${countChanged}`);

    if (Object.keys(extensionsFound).length > 0) {
      console.log('\nExtensions detected:');
      for (const [extId, patternIds] of Object.entries(extensionsFound)) {
        console.log(`  ${extId}: ${patternIds.length} pattern(s)`);
        if (verbose) {
          for (const pid of patternIds) {
            console.log(`    - ${pid}`);
          }
        }
      }
    }

    if (countNull > 0) {
      console.log(`\n⚠  ${countNull} pattern(s) did not parse and need manual review.`);

      if (verbose) {
        const unparsed = patterns.filter(p => {
          try { return !canParse(p.raw_code, 'en'); } catch { return true; }
        });
        for (const p of unparsed) {
          console.log(`  - ${p.id}: ${p.raw_code.slice(0, 80)}${p.raw_code.length > 80 ? '...' : ''}`);
        }
      }
    }

    // Final database state
    if (!dryRun) {
      const finalStats = db.prepare(
        `SELECT engine, COUNT(*) as count FROM code_examples GROUP BY engine ORDER BY engine`
      ).all() as { engine: string | null; count: number }[];

      console.log('\nFinal database state:');
      for (const row of finalStats) {
        console.log(`  ${row.engine ?? 'null (unverified)'}: ${row.count}`);
      }
    }

  } finally {
    db.close();
  }
}

// Run
verifyEngineCompat().catch(console.error);
