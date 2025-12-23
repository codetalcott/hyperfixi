/**
 * Sync Translations to hyperscript-lsp Database
 *
 * This script:
 * 1. Reads code_examples from hyperscript-lsp database
 * 2. Uses semantic parser to generate translations for all 13 languages
 * 3. Stores translations in pattern_translations table
 *
 * Usage: bun run scripts/sync-lsp-translations.ts [--db-path <path>] [--dry-run] [--verbose]
 */

import { Database } from 'bun:sqlite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// MUST import all languages first to register them
import '../src/languages/_all';
// MUST import patterns module to set pattern generator for rendering
import '../src/patterns/index';

// Import semantic parser components
import { canParse, getAllTranslations, getSupportedLanguages } from '../src/parser/semantic-parser';
import { calculateTranslationConfidence } from '../src/utils/confidence-calculator';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default database path (relative to this script)
const DEFAULT_DB_PATH = resolve(__dirname, '../../../../hyperscript-lsp/data/hyperscript.db');

interface CodeExample {
  id: string;
  title: string;
  raw_code: string;
  description: string | null;
}

/**
 * Parse command-line arguments
 */
function parseArgs(): { dbPath: string; dryRun: boolean; verbose: boolean; limit: number } {
  const args = process.argv.slice(2);
  let dbPath = DEFAULT_DB_PATH;
  let dryRun = false;
  let verbose = false;
  let limit = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db-path' && args[i + 1]) {
      dbPath = resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      verbose = true;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { dbPath, dryRun, verbose, limit };
}

/**
 * Get word order for a language
 */
function getWordOrder(language: string): string {
  const wordOrders: Record<string, string> = {
    en: 'SVO',
    es: 'SVO',
    fr: 'SVO',
    de: 'SVO',
    pt: 'SVO',
    id: 'SVO',
    sw: 'SVO',
    zh: 'SVO',
    ja: 'SOV',
    ko: 'SOV',
    tr: 'SOV',
    qu: 'SOV',
    ar: 'VSO',
  };
  return wordOrders[language] || 'SVO';
}

/**
 * Extract first line/command from multi-line code
 */
function extractSimpleCommand(code: string): string | null {
  // For multi-line examples, try the first line that looks like a command
  const lines = code.split('\n').map(l => l.trim()).filter(l => l);

  for (const line of lines) {
    // Skip lines that are HTML comments or just whitespace
    if (line.startsWith('<!--') || line.startsWith('//')) continue;
    // Look for lines that start with hyperscript keywords
    if (/^(on|toggle|put|set|add|remove|show|hide|wait|log|send|fetch|call)\s/i.test(line)) {
      return line;
    }
  }

  // If single line, return it
  if (lines.length === 1) {
    return lines[0];
  }

  return null;
}

/**
 * Main sync function
 */
async function syncTranslations(): Promise<void> {
  const { dbPath, dryRun, verbose, limit } = parseArgs();

  console.log('='.repeat(60));
  console.log('HyperFixi → hyperscript-lsp Translation Sync');
  console.log('='.repeat(60));
  console.log(`Database: ${dbPath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Supported languages: ${getSupportedLanguages().join(', ')}`);
  console.log('');

  // Check database exists
  let db: Database;
  try {
    db = new Database(dbPath);
  } catch (error) {
    console.error(`Error opening database: ${error}`);
    process.exit(1);
  }

  // Get all code examples
  let query = `
    SELECT id, title, raw_code, description
    FROM code_examples
    ORDER BY title
  `;
  if (limit > 0) {
    query += ` LIMIT ${limit}`;
  }

  const examples = db.prepare(query).all() as CodeExample[];

  console.log(`Found ${examples.length} code examples`);
  console.log('');

  // Prepare insert statement
  const insertTranslation = db.prepare(`
    INSERT OR REPLACE INTO pattern_translations (
      code_example_id, language, hyperscript, word_order,
      translation_method, confidence, verified_parses, verified_executes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, datetime('now'), datetime('now'))
  `);

  let totalTranslations = 0;
  let successfulExamples = 0;
  let skippedExamples = 0;

  for (const example of examples) {
    if (verbose) {
      console.log(`\nProcessing: ${example.title}`);
    }

    // Try to extract a simple command from the raw_code
    const simpleCommand = extractSimpleCommand(example.raw_code);

    if (!simpleCommand) {
      if (verbose) {
        console.log('  ⏭ Skipping: no simple command found');
      }
      skippedExamples++;
      continue;
    }

    if (verbose) {
      console.log(`  Code: ${simpleCommand.substring(0, 60)}${simpleCommand.length > 60 ? '...' : ''}`);
    }

    // Check if we can parse it
    if (!canParse(simpleCommand, 'en')) {
      if (verbose) {
        console.log('  ⏭ Skipping: cannot parse as English');
      }
      skippedExamples++;
      continue;
    }

    try {
      // Get all translations
      const translations = getAllTranslations(simpleCommand, 'en');

      if (Object.keys(translations).length === 0) {
        if (verbose) {
          console.log('  ⏭ Skipping: no translations generated');
        }
        skippedExamples++;
        continue;
      }

      successfulExamples++;

      for (const [lang, translated] of Object.entries(translations)) {
        const isOriginal = lang === 'en';

        // Calculate actual confidence for this translation
        let confidence: number;
        if (isOriginal) {
          confidence = 1.0; // Original English is always 1.0
        } else {
          const confidenceResult = calculateTranslationConfidence(translated, lang);
          confidence = confidenceResult.parseSuccess ? confidenceResult.confidence : 0.5;
        }

        if (!dryRun) {
          insertTranslation.run(
            example.id,
            lang,
            translated,
            getWordOrder(lang),
            isOriginal ? 'hand-crafted' : 'auto-generated',
            confidence
          );
        }
        totalTranslations++;

        if (verbose) {
          const display = translated.substring(0, 50) + (translated.length > 50 ? '...' : '');
          const confDisplay = confidence.toFixed(2);
          console.log(`  ✓ ${lang} (${confDisplay}): ${display}`);
        }
      }
    } catch (error) {
      if (verbose) {
        console.log(`  ⚠ Error: ${(error as Error).message}`);
      }
      skippedExamples++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Examples processed: ${examples.length}`);
  console.log(`Successful: ${successfulExamples}`);
  console.log(`Skipped: ${skippedExamples}`);
  console.log(`Total translations: ${totalTranslations}`);

  if (dryRun) {
    console.log('\n(Dry run - no changes written to database)');
  }

  // Show current translation counts
  const counts = db.prepare(`
    SELECT language, COUNT(*) as count
    FROM pattern_translations
    GROUP BY language
    ORDER BY count DESC
  `).all() as { language: string; count: number }[];

  if (counts.length > 0) {
    console.log('\nTranslations by language:');
    for (const { language, count } of counts) {
      console.log(`  ${language}: ${count}`);
    }
  }

  db.close();
}

// Run if executed directly
if (import.meta.main) {
  syncTranslations().catch(console.error);
}
