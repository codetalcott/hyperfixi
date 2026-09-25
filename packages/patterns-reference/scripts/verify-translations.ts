/**
 * Verify Translations Script
 *
 * Re-measures `verified_parses` for every stored row — English included — with
 * the same function sync-translations writes it with (src/sync/verify-parses.ts),
 * and writes the result. Useful after rebuilding @lokascript/semantic without
 * re-syncing; a full `npm run populate` already leaves the flag measured.
 *
 * Usage: npx tsx scripts/verify-translations.ts [--verbose]
 */

import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { verifyParses } from '../src/sync/verify-parses';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_DB_PATH = resolve(__dirname, '../data/patterns.db');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

// =============================================================================
// Types
// =============================================================================

interface Translation {
  id: number;
  language: string;
  hyperscript: string;
  translatable: number;
}

// =============================================================================
// Main
// =============================================================================

async function verifyTranslations() {
  console.log('Verifying translations with semantic parser...\n');

  if (!existsSync(DEFAULT_DB_PATH)) {
    console.error(`Database not found: ${DEFAULT_DB_PATH}`);
    console.error('Run: npx tsx scripts/sync-translations.ts first');
    process.exit(1);
  }

  const db = new Database(DEFAULT_DB_PATH);

  try {
    // Every row, English included: English is measured too, not assumed.
    const translations = db.prepare(`
      SELECT pt.id, pt.language, pt.hyperscript, ce.translatable
      FROM pattern_translations pt
      JOIN code_examples ce ON ce.id = pt.code_example_id
    `).all() as Translation[];

    console.log(`Found ${translations.length} translations to verify\n`);

    const updateStmt = db.prepare(`
      UPDATE pattern_translations
      SET verified_parses = ?
      WHERE id = ?
    `);

    let verified = 0;
    let failed = 0;
    const byLanguage: Record<string, { verified: number; failed: number }> = {};

    for (const t of translations) {
      // Initialize language stats
      if (!byLanguage[t.language]) {
        byLanguage[t.language] = { verified: 0, failed: 0 };
      }

      try {
        const success = verifyParses(t.hyperscript, t.language, t.translatable !== 0);
        updateStmt.run(success ? 1 : 0, t.id);

        if (success) {
          verified++;
          byLanguage[t.language].verified++;
          if (verbose) {
            console.log(`  ✓ [${t.language}] ${t.hyperscript}`);
          }
        } else {
          failed++;
          byLanguage[t.language].failed++;
          if (verbose) {
            console.log(`  ✗ [${t.language}] ${t.hyperscript}`);
          }
        }
      } catch (error) {
        updateStmt.run(0, t.id);
        failed++;
        byLanguage[t.language].failed++;
        if (verbose) {
          console.log(`  ✗ [${t.language}] ${t.hyperscript} (error: ${error})`);
        }
      }
    }

    // Print summary
    console.log('\nVerification complete!');
    console.log(`  Total: ${translations.length}`);
    console.log(`  Verified: ${verified} (${((verified / translations.length) * 100).toFixed(1)}%)`);
    console.log(`  Failed: ${failed}`);

    // Print by language
    console.log('\nBy language:');
    const sortedLangs = Object.entries(byLanguage).sort(
      ([, a], [, b]) => (b.verified / (b.verified + b.failed)) - (a.verified / (a.verified + a.failed))
    );

    for (const [lang, stats] of sortedLangs) {
      const total = stats.verified + stats.failed;
      const pct = ((stats.verified / total) * 100).toFixed(0);
      const emoji = parseInt(pct) >= 80 ? '✓' : parseInt(pct) >= 50 ? '~' : '!';
      console.log(`  ${emoji} ${lang}: ${stats.verified}/${total} (${pct}%)`);
    }

    // Query updated stats
    const updatedStats = db.prepare(`
      SELECT language,
             COUNT(*) as total,
             SUM(verified_parses) as verified
      FROM pattern_translations
      GROUP BY language
      ORDER BY verified DESC
    `).all() as { language: string; total: number; verified: number }[];

    console.log('\nDatabase verified counts:');
    for (const row of updatedStats) {
      console.log(`  ${row.language}: ${row.verified}/${row.total} verified`);
    }

  } finally {
    db.close();
  }
}

// Run
verifyTranslations().catch(console.error);
