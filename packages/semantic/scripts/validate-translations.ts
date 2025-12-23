/**
 * Validate Translations & Update Database
 *
 * Tests all translations in the database and updates verified_parses flag.
 * Also records test results in pattern_tests table.
 *
 * Usage: bun run scripts/validate-translations.ts [--db-path <path>]
 */

import { Database } from 'bun:sqlite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// MUST import all languages to register them
import '../src/languages/_all';
import '../src/patterns/index';

import { canParse, parse, getSupportedLanguages } from '../src/parser/semantic-parser';
import { calculateTranslationConfidence } from '../src/utils/confidence-calculator';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = resolve(__dirname, '../../../../hyperscript-lsp/data/hyperscript.db');

interface TranslationRow {
  id: number;
  code_example_id: string;
  language: string;
  hyperscript: string;
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');

  let dbPath = DEFAULT_DB_PATH;
  const dbIdx = args.indexOf('--db-path');
  if (dbIdx >= 0 && args[dbIdx + 1]) {
    dbPath = resolve(args[dbIdx + 1]);
  }

  console.log('='.repeat(60));
  console.log('Translation Validation');
  console.log('='.repeat(60));
  console.log(`Database: ${dbPath}`);
  console.log(`Languages: ${getSupportedLanguages().join(', ')}`);
  console.log('');

  const db = new Database(dbPath);

  // Get all translations
  const translations = db.prepare(`
    SELECT id, code_example_id, language, hyperscript
    FROM pattern_translations
  `).all() as TranslationRow[];

  console.log(`Testing ${translations.length} translations...`);
  console.log('');

  // Prepare statements
  const updateVerified = db.prepare(`
    UPDATE pattern_translations
    SET verified_parses = ?, confidence = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  const insertTest = db.prepare(`
    INSERT INTO pattern_tests (
      code_example_id, language, test_date, runtime_version,
      parse_success, error_message
    ) VALUES (?, ?, datetime('now'), ?, ?, ?)
  `);

  const runtimeVersion = Bun.version;
  const stats: Record<string, { passed: number; failed: number }> = {};

  // Initialize stats
  for (const lang of getSupportedLanguages()) {
    stats[lang] = { passed: 0, failed: 0 };
  }

  // Test each translation
  let passCount = 0;
  let failCount = 0;

  for (const t of translations) {
    let passed = false;
    let errorMessage: string | null = null;
    let confidence = 0;

    try {
      // Calculate actual confidence using the pattern matcher
      const confidenceResult = calculateTranslationConfidence(t.hyperscript, t.language);
      confidence = confidenceResult.confidence;

      if (confidenceResult.parseSuccess) {
        // Also try full parse to verify
        parse(t.hyperscript, t.language);
        passed = true;
        passCount++;
        stats[t.language].passed++;
      } else {
        errorMessage = confidenceResult.error || 'canParse returned false';
        failCount++;
        stats[t.language].failed++;
      }
    } catch (e) {
      errorMessage = (e as Error).message;
      failCount++;
      stats[t.language].failed++;
    }

    // Update verified status AND confidence
    updateVerified.run(passed ? 1 : 0, confidence, t.id);

    // Record test result
    insertTest.run(
      t.code_example_id,
      t.language,
      runtimeVersion,
      passed ? 1 : 0,
      errorMessage
    );

    if (verbose && !passed) {
      console.log(`❌ [${t.language}] ${t.hyperscript.substring(0, 50)}...`);
      console.log(`   ${errorMessage}`);
    } else if (verbose && passed) {
      console.log(`✓ [${t.language}] (${confidence.toFixed(2)}) ${t.hyperscript.substring(0, 40)}...`);
    }
  }

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Results by Language');
  console.log('='.repeat(60));

  const sortedLangs = Object.entries(stats)
    .sort((a, b) => {
      const rateA = a[1].passed / (a[1].passed + a[1].failed);
      const rateB = b[1].passed / (b[1].passed + b[1].failed);
      return rateB - rateA;
    });

  for (const [lang, s] of sortedLangs) {
    const total = s.passed + s.failed;
    if (total === 0) continue;
    const rate = ((s.passed / total) * 100).toFixed(1);
    const status = s.failed === 0 ? '✅' : (s.passed / total > 0.9 ? '⚠️' : '❌');
    console.log(`${status} ${lang}: ${s.passed}/${total} (${rate}%)`);
  }

  console.log('');
  console.log(`Total: ${passCount}/${passCount + failCount} (${((passCount / (passCount + failCount)) * 100).toFixed(1)}%)`);

  // Query latest test summary
  const testSummary = db.prepare(`
    SELECT
      language,
      SUM(parse_success) as passed,
      COUNT(*) - SUM(parse_success) as failed
    FROM pattern_tests
    WHERE test_date >= datetime('now', '-1 hour')
    GROUP BY language
  `).all();

  console.log('');
  console.log('Test results recorded in pattern_tests table.');

  db.close();
}

main().catch(console.error);
