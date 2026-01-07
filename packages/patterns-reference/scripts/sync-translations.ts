/**
 * Sync Translations Script
 *
 * Generates translations for all patterns in all supported languages
 * using the @hyperfixi/semantic language profiles.
 *
 * Languages are automatically derived from @hyperfixi/semantic, so adding
 * new languages to the semantic package will automatically include them here.
 *
 * Usage: npx tsx scripts/sync-translations.ts [--db-path <path>] [--dry-run]
 *
 * Options:
 *   --db-path <path>  Path to database file (default: ./data/patterns.db)
 *   --dry-run         Show what would be done without making changes
 */

import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  languageProfiles,
  getGeneratorLanguages,
  type LanguageProfile,
} from '@hyperfixi/semantic';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_DB_PATH = resolve(__dirname, '../data/patterns.db');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dbPathIndex = args.indexOf('--db-path');
const dbPath = dbPathIndex >= 0 && args[dbPathIndex + 1] ? args[dbPathIndex + 1] : DEFAULT_DB_PATH;

// =============================================================================
// Derive language data from @hyperfixi/semantic profiles
// =============================================================================

// Build LANGUAGES from semantic profiles
const LANGUAGES: Record<string, { name: string; wordOrder: string }> = Object.fromEntries(
  Object.entries(languageProfiles).map(([code, profile]: [string, LanguageProfile]) => [
    code,
    { name: profile.name, wordOrder: profile.wordOrder },
  ])
);

// Build KEYWORD_TRANSLATIONS from semantic profiles
// Extract primary keyword for each command/keyword in the profile
const KEYWORD_TRANSLATIONS: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(languageProfiles).map(([code, profile]: [string, LanguageProfile]) => {
    const keywords: Record<string, string> = {};

    // Extract keywords from profile.keywords
    for (const [key, value] of Object.entries(profile.keywords)) {
      keywords[key] = value.primary;
    }

    // Also extract reference translations (me, it, you, etc.)
    if (profile.references) {
      for (const [key, value] of Object.entries(profile.references)) {
        if (typeof value === 'string') {
          keywords[key] = value;
        }
      }
    }

    return [code, keywords];
  })
);

console.log(`Loaded ${getGeneratorLanguages().length} languages from @hyperfixi/semantic`);

// =============================================================================
// Translation Logic
// =============================================================================

interface CodeExample {
  id: string;
  title: string;
  raw_code: string;
  description: string;
  feature: string;
}

/**
 * Generate a translated version of hyperscript code for a given language.
 * This is a simplified translation that replaces keywords.
 */
function translateHyperscript(code: string, language: string): string {
  if (language === 'en') {
    return code;
  }

  const translations = KEYWORD_TRANSLATIONS[language];
  if (!translations) {
    return code;
  }

  let translated = code;

  // Sort keywords by length (longest first) to avoid partial replacements
  const sortedKeywords = Object.entries(KEYWORD_TRANSLATIONS.en).sort(
    ([a], [b]) => b.length - a.length
  );

  for (const [enKeyword, _] of sortedKeywords) {
    const targetKeyword = translations[enKeyword];
    if (targetKeyword && targetKeyword !== enKeyword) {
      // Use word boundary regex for safe replacement
      const regex = new RegExp(`\\b${enKeyword}\\b`, 'gi');
      translated = translated.replace(regex, targetKeyword);
    }
  }

  return translated;
}

/**
 * Determine confidence level for a translation.
 */
function getConfidence(language: string): number {
  // English is always 1.0 (canonical)
  if (language === 'en') return 1.0;

  // Well-tested languages get higher confidence
  if (['es', 'ja', 'ko', 'zh', 'ar'].includes(language)) return 0.85;

  // Other languages are auto-generated
  return 0.7;
}

// =============================================================================
// Main
// =============================================================================

async function syncTranslations() {
  console.log('Syncing translations...');
  console.log(`Database path: ${dbPath}`);
  if (dryRun) {
    console.log('DRY RUN - no changes will be made\n');
  }

  // Check database exists
  if (!existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    console.error('Run: npx tsx scripts/init-db.ts --force');
    process.exit(1);
  }

  const db = new Database(dbPath);

  try {
    // Get all code examples
    const examples = db.prepare('SELECT * FROM code_examples').all() as CodeExample[];
    console.log(`Found ${examples.length} code examples\n`);

    // Prepare statements
    const checkExists = db.prepare(
      'SELECT id FROM pattern_translations WHERE code_example_id = ? AND language = ?'
    );
    const insertTranslation = db.prepare(`
      INSERT INTO pattern_translations (code_example_id, language, hyperscript, word_order, confidence, verified_parses, translation_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const updateTranslation = db.prepare(`
      UPDATE pattern_translations
      SET hyperscript = ?, word_order = ?, confidence = ?, translation_method = ?, updated_at = CURRENT_TIMESTAMP
      WHERE code_example_id = ? AND language = ?
    `);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // Generate translations for each example and language
    for (const example of examples) {
      for (const [langCode, langInfo] of Object.entries(LANGUAGES)) {
        const translated = translateHyperscript(example.raw_code, langCode);
        const confidence = getConfidence(langCode);
        const verifiedParses = langCode === 'en' ? 1 : 0;

        // Check if translation exists
        const existing = checkExists.get(example.id, langCode) as { id: number } | undefined;

        if (existing) {
          if (!dryRun) {
            updateTranslation.run(
              translated,
              langInfo.wordOrder,
              confidence,
              'auto-generated',
              example.id,
              langCode
            );
          }
          updated++;
        } else {
          if (!dryRun) {
            insertTranslation.run(
              example.id,
              langCode,
              translated,
              langInfo.wordOrder,
              confidence,
              verifiedParses,
              'auto-generated'
            );
          }
          inserted++;
        }
      }
    }

    // Print summary
    console.log('\nSync complete!');
    console.log(`  - Inserted: ${inserted}`);
    console.log(`  - Updated: ${updated}`);
    console.log(`  - Skipped: ${skipped}`);

    // Print stats
    const stats = db
      .prepare(
        `
      SELECT language, COUNT(*) as count, AVG(confidence) as avg_confidence
      FROM pattern_translations
      GROUP BY language
      ORDER BY language
    `
      )
      .all() as { language: string; count: number; avg_confidence: number }[];

    console.log('\nTranslations by language:');
    for (const row of stats) {
      console.log(
        `  ${row.language}: ${row.count} patterns (avg confidence: ${row.avg_confidence.toFixed(2)})`
      );
    }
  } finally {
    db.close();
  }
}

// Run
syncTranslations().catch(console.error);
