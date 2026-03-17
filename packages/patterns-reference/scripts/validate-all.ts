/**
 * Validate All Translations Script
 *
 * Validates all patterns in the database by checking if they parse correctly.
 * Reports any parsing errors and updates the verified_parses flag.
 *
 * Usage: npx tsx scripts/validate-all.ts [--db-path <path>] [--fix] [--verbose]
 *
 * Options:
 *   --db-path <path>  Path to database file (default: ./data/patterns.db)
 *   --fix             Update verified_parses flag in database
 *   --verbose         Show detailed output for each pattern
 */

import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { resolve } from 'path';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_DB_PATH = resolve(__dirname, '../data/patterns.db');

// Parse command line arguments
const args = process.argv.slice(2);
const fix = args.includes('--fix');
const verbose = args.includes('--verbose');
const dbPathIndex = args.indexOf('--db-path');
const dbPath = dbPathIndex >= 0 && args[dbPathIndex + 1] ? args[dbPathIndex + 1] : DEFAULT_DB_PATH;

// =============================================================================
// Types
// =============================================================================

interface Translation {
  id: number;
  code_example_id: string;
  language: string;
  hyperscript: string;
  verified_parses: number;
}

interface ValidationResult {
  translation: Translation;
  valid: boolean;
  error?: string;
}

// =============================================================================
// Validation Logic
// =============================================================================

/**
 * Strip js(...) ... end blocks from hyperscript code.
 * These contain raw JavaScript where quote/bracket balancing rules differ.
 */
function stripJsBlocks(code: string): string {
  // Match js(...) ... end blocks — the js() block ends at a line-start "end" or "    end"
  // Use a simple state machine: find "js(" or "js " at line start, then find matching " end"
  return code.replace(/\bjs\([^)]*\)[\s\S]*?\bend\b/g, 'js_block_stripped');
}

/**
 * Validate a single hyperscript pattern.
 * This is a basic structural validation - full parsing requires the runtime.
 */
function validatePattern(code: string): { valid: boolean; error?: string } {
  // Basic structural validation
  const trimmed = code.trim();

  if (!trimmed) {
    return { valid: false, error: 'Empty code' };
  }

  // Strip js() blocks before checking quotes — JS code has its own quoting rules
  let withoutJs = stripJsBlocks(trimmed);

  // Strip possessive 's (e.g., "source's textContent") — not string delimiters
  withoutJs = withoutJs.replace(/\w's\b/g, 'possessive');

  // Check for unbalanced quotes (outside js blocks and possessives)
  const singleQuotes = (withoutJs.match(/'/g) || []).length;
  const doubleQuotes = (withoutJs.match(/"/g) || []).length;

  if (singleQuotes % 2 !== 0) {
    return { valid: false, error: 'Unbalanced single quotes' };
  }

  if (doubleQuotes % 2 !== 0) {
    return { valid: false, error: 'Unbalanced double quotes' };
  }

  // Check for unbalanced parentheses (on full code — js blocks have balanced parens)
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (const char of trimmed) {
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth--;
    if (char === '{') braceDepth++;
    if (char === '}') braceDepth--;

    if (parenDepth < 0 || bracketDepth < 0 || braceDepth < 0) {
      return { valid: false, error: 'Unbalanced brackets' };
    }
  }

  if (parenDepth !== 0) {
    return { valid: false, error: 'Unbalanced parentheses' };
  }

  if (bracketDepth !== 0) {
    return { valid: false, error: 'Unbalanced square brackets' };
  }

  if (braceDepth !== 0) {
    return { valid: false, error: 'Unbalanced curly braces' };
  }

  // Check for empty event handler
  if (/^on\s+\w+\s*$/.test(trimmed)) {
    return { valid: false, error: 'Event handler has no commands' };
  }

  return { valid: true };
}

// =============================================================================
// Main
// =============================================================================

async function validateAll() {
  console.log('Validating all translations...');
  console.log(`Database path: ${dbPath}`);
  if (fix) {
    console.log('FIX mode - will update database\n');
  } else {
    console.log('Read-only mode - use --fix to update database\n');
  }

  // Check database exists
  if (!existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    console.error('Run: npm run populate');
    process.exit(1);
  }

  const db = new Database(dbPath);

  try {
    // Get all translations
    const translations = db.prepare('SELECT * FROM pattern_translations').all() as Translation[];
    console.log(`Found ${translations.length} translations\n`);

    // Validate each translation
    const results: ValidationResult[] = [];
    let validCount = 0;
    let invalidCount = 0;

    const updateVerified = db.prepare(
      'UPDATE pattern_translations SET verified_parses = ? WHERE id = ?'
    );

    for (const translation of translations) {
      const { valid, error } = validatePattern(translation.hyperscript);

      if (valid) {
        validCount++;
        if (fix && translation.verified_parses !== 1) {
          updateVerified.run(1, translation.id);
        }
      } else {
        invalidCount++;
        results.push({ translation, valid, error });

        if (fix && translation.verified_parses !== 0) {
          updateVerified.run(0, translation.id);
        }

        if (verbose) {
          console.log(`[INVALID] ${translation.language}:${translation.code_example_id}`);
          console.log(`  Code: ${translation.hyperscript}`);
          console.log(`  Error: ${error}\n`);
        }
      }
    }

    // Print summary
    console.log('\nValidation complete!');
    console.log(`  - Valid: ${validCount}`);
    console.log(`  - Invalid: ${invalidCount}`);

    if (invalidCount > 0 && !verbose) {
      console.log('\nInvalid translations:');
      for (const result of results.slice(0, 10)) {
        console.log(
          `  ${result.translation.language}:${result.translation.code_example_id} - ${result.error}`
        );
      }
      if (results.length > 10) {
        console.log(`  ... and ${results.length - 10} more`);
      }
      console.log('\nRun with --verbose to see all errors');
    }

    // Print stats by language
    const byLanguage = db
      .prepare(
        `
      SELECT
        language,
        COUNT(*) as total,
        SUM(verified_parses) as verified
      FROM pattern_translations
      GROUP BY language
      ORDER BY language
    `
      )
      .all() as { language: string; total: number; verified: number }[];

    console.log('\nValidation by language:');
    for (const row of byLanguage) {
      const pct = ((row.verified / row.total) * 100).toFixed(0);
      console.log(`  ${row.language}: ${row.verified}/${row.total} (${pct}%)`);
    }

    // Exit with error if any invalid
    if (invalidCount > 0) {
      process.exit(1);
    }
  } finally {
    db.close();
  }
}

// Run
validateAll().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
