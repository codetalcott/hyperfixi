/**
 * Sync Translations Script
 *
 * Generates translations for all patterns in all supported languages
 * using grammar transformation for proper word order (SOV/VSO) and
 * dynamic confidence calculation based on actual parsing success.
 *
 * Usage: npx tsx scripts/sync-translations.ts [--db-path <path>] [--dry-run] [--verbose]
 *
 * Options:
 *   --db-path <path>  Path to database file (default: ./data/patterns.db)
 *   --dry-run         Show what would be done without making changes
 *   --verbose         Show detailed translation information
 */

import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  languageProfiles,
  getGeneratorLanguages,
  calculateTranslationConfidence,
  type LanguageProfile,
} from '@hyperfixi/semantic';
import {
  GrammarTransformer,
  getProfile as getGrammarProfile,
} from '@hyperfixi/i18n';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_DB_PATH = resolve(__dirname, '../data/patterns.db');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
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

// Build KEYWORD_TRANSLATIONS from semantic profiles (fallback for non-grammar languages)
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

// GrammarTransformer is created per-language (constructor requires targetLocale)

/**
 * Fallback keyword substitution for languages without grammar transformation.
 */
function keywordSubstitute(code: string, language: string): string {
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
 * Generate a translated version of hyperscript code for a given language.
 * Uses GrammarTransformer for proper word order (SOV/VSO) when available,
 * falls back to keyword substitution for unsupported languages.
 */
function translateHyperscript(code: string, language: string): string {
  if (language === 'en') {
    return code;
  }

  // Check if language has grammar transformation support
  const grammarProfile = getGrammarProfile(language);
  if (grammarProfile) {
    try {
      // Create transformer with correct API: sourceLocale='en', targetLocale=language
      const transformer = new GrammarTransformer('en', language);
      const result = transformer.transform(code);  // Only pass code
      if (verbose) {
        console.log(`  [grammar] ${language}: "${code}" -> "${result}"`);
      }
      return result;
    } catch (error) {
      // Fall back to keyword substitution if transformation fails
      if (verbose) {
        console.log(`  [fallback] ${language}: grammar transform failed (${error}), using keywords`);
      }
      return keywordSubstitute(code, language);
    }
  }

  // Languages without grammar support use keyword substitution
  return keywordSubstitute(code, language);
}

/**
 * Calculate confidence dynamically based on actual parsing success.
 * Uses the semantic parser's pattern matcher to verify the translation parses correctly.
 */
function getConfidence(language: string, translatedCode: string): number {
  // English is always 1.0 (canonical source)
  if (language === 'en') return 1.0;

  try {
    const result = calculateTranslationConfidence(translatedCode, language);
    // Use actual confidence if parsing succeeded, minimum 0.5 otherwise
    const confidence = result.parseSuccess ? result.confidence : 0.5;
    if (verbose) {
      console.log(`  [confidence] ${language}: ${confidence.toFixed(2)} (parse: ${result.parseSuccess})`);
    }
    return confidence;
  } catch (error) {
    if (verbose) {
      console.log(`  [confidence] ${language}: 0.50 (error: ${error})`);
    }
    return 0.5; // Fallback for parse errors
  }
}

// =============================================================================
// Main
// =============================================================================

async function syncTranslations() {
  console.log('Syncing translations with grammar transformation...');
  console.log(`Database path: ${dbPath}`);
  if (dryRun) {
    console.log('DRY RUN - no changes will be made\n');
  }
  if (verbose) {
    console.log('VERBOSE - showing detailed translation info\n');
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
    let grammarUsed = 0;
    let keywordUsed = 0;

    // Generate translations for each example and language
    for (const example of examples) {
      if (verbose) {
        console.log(`\nProcessing: ${example.title}`);
        console.log(`  English: "${example.raw_code}"`);
      }

      for (const [langCode, langInfo] of Object.entries(LANGUAGES)) {
        const translated = translateHyperscript(example.raw_code, langCode);
        const confidence = getConfidence(langCode, translated);
        const verifiedParses = langCode === 'en' ? 1 : 0;

        // Track which method was used
        const hasGrammarProfile = getGrammarProfile(langCode) !== undefined;
        if (langCode !== 'en') {
          if (hasGrammarProfile) {
            grammarUsed++;
          } else {
            keywordUsed++;
          }
        }

        // Determine translation method
        const translationMethod = langCode === 'en'
          ? 'original'
          : hasGrammarProfile
            ? 'grammar-transform'
            : 'keyword-substitute';

        // Check if translation exists
        const existing = checkExists.get(example.id, langCode) as { id: number } | undefined;

        if (existing) {
          if (!dryRun) {
            updateTranslation.run(
              translated,
              langInfo.wordOrder,
              confidence,
              translationMethod,
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
              translationMethod
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
    console.log(`  - Grammar transforms: ${grammarUsed}`);
    console.log(`  - Keyword substitutes: ${keywordUsed}`);

    // Print stats
    const stats = db
      .prepare(
        `
      SELECT language, COUNT(*) as count, AVG(confidence) as avg_confidence
      FROM pattern_translations
      GROUP BY language
      ORDER BY avg_confidence DESC
    `
      )
      .all() as { language: string; count: number; avg_confidence: number }[];

    console.log('\nTranslations by language (sorted by confidence):');
    for (const row of stats) {
      const emoji = row.avg_confidence >= 0.8 ? '✓' : row.avg_confidence >= 0.6 ? '~' : '!';
      console.log(
        `  ${emoji} ${row.language}: ${row.count} patterns (avg confidence: ${row.avg_confidence.toFixed(2)})`
      );
    }

    // Calculate overall average
    const overallAvg = stats.reduce((sum, row) => sum + row.avg_confidence, 0) / stats.length;
    console.log(`\nOverall average confidence: ${overallAvg.toFixed(2)}`);
  } finally {
    db.close();
  }
}

// Run
syncTranslations().catch(console.error);
