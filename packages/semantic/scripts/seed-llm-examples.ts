/**
 * Seed LLM Examples Table
 *
 * Populates the llm_examples table with high-quality, curated examples
 * from code_examples that are suitable for few-shot learning.
 *
 * Selection criteria:
 * - Simple, single-line patterns (no multi-line or complex behaviors)
 * - High confidence translations (verified_parses = 1, confidence >= 0.7)
 * - Coverage of major commands (toggle, add, remove, set, etc.)
 *
 * Usage: bun run scripts/seed-llm-examples.ts [--db-path <path>] [--dry-run] [--verbose]
 */

import { Database } from 'bun:sqlite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = resolve(__dirname, '../../../../hyperscript-lsp/data/hyperscript.db');

interface TranslationWithExample {
  code_example_id: string;
  title: string;
  description: string | null;
  raw_code: string;
  language: string;
  hyperscript: string;
  confidence: number;
}

interface LLMExampleInsert {
  code_example_id: string;
  language: string;
  prompt: string;
  completion: string;
  quality_score: number;
}

/**
 * Quality criteria for selecting examples
 */
const QUALITY_CRITERIA = {
  minConfidence: 0.7,      // Minimum confidence score
  maxLines: 3,             // Maximum lines in raw_code
  preferredCommands: [     // Prioritize these command types
    'toggle', 'add', 'remove', 'set', 'put', 'show', 'hide',
    'fetch', 'wait', 'log', 'send', 'on'
  ],
};

/**
 * Generate a natural language prompt from example metadata
 */
function generatePrompt(title: string, description: string | null, code: string): string {
  // Prefer description if it's a meaningful sentence
  if (description && description.length > 10 && !description.startsWith('http')) {
    return description;
  }

  // Try to generate from title
  const cleanTitle = title
    .replace(/^(Example|Demo|Test|Sample)\s*:?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanTitle.length > 5) {
    // Make it more prompt-like
    if (!cleanTitle.match(/^(how|what|when|where|create|make|add|toggle|show|hide)/i)) {
      return `Create hyperscript to ${cleanTitle.toLowerCase()}`;
    }
    return cleanTitle;
  }

  // Extract action from code as last resort
  const action = code.match(/^(on\s+\w+\s+)?(toggle|add|remove|set|put|show|hide|fetch)/i)?.[2];
  if (action) {
    return `${action} an element`;
  }

  return title;
}

/**
 * Count lines in code (excluding empty lines)
 */
function countLines(code: string): number {
  return code.split('\n').filter(l => l.trim()).length;
}

/**
 * Extract primary command from hyperscript
 */
function extractCommand(code: string): string | null {
  const match = code.match(/^(on\s+\w+\s+)?(toggle|add|remove|set|put|show|hide|fetch|wait|log|send|call)\b/i);
  return match ? (match[2] || match[1] || '').toLowerCase().trim() : null;
}

/**
 * Main seeding function
 */
async function seedLLMExamples(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');

  let dbPath = DEFAULT_DB_PATH;
  const dbIdx = args.indexOf('--db-path');
  if (dbIdx >= 0 && args[dbIdx + 1]) {
    dbPath = resolve(args[dbIdx + 1]);
  }

  console.log('='.repeat(60));
  console.log('LLM Examples Seeding');
  console.log('='.repeat(60));
  console.log(`Database: ${dbPath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Min confidence: ${QUALITY_CRITERIA.minConfidence}`);
  console.log(`Max lines: ${QUALITY_CRITERIA.maxLines}`);
  console.log('');

  const db = new Database(dbPath);

  // Get high-quality translations with their source examples
  const translations = db.prepare(`
    SELECT
      ce.id as code_example_id,
      ce.title,
      ce.description,
      ce.raw_code,
      pt.language,
      pt.hyperscript,
      pt.confidence
    FROM code_examples ce
    INNER JOIN pattern_translations pt ON ce.id = pt.code_example_id
    WHERE pt.verified_parses = 1
      AND pt.confidence >= ?
    ORDER BY pt.confidence DESC, ce.title
  `).all(QUALITY_CRITERIA.minConfidence) as TranslationWithExample[];

  console.log(`Found ${translations.length} high-quality translations`);

  // Filter by line count
  const simpleTranslations = translations.filter(t => countLines(t.raw_code) <= QUALITY_CRITERIA.maxLines);
  console.log(`After line filter: ${simpleTranslations.length}`);

  // Group by command type to ensure coverage
  const byCommand: Record<string, TranslationWithExample[]> = {};
  for (const t of simpleTranslations) {
    const cmd = extractCommand(t.hyperscript) || 'other';
    if (!byCommand[cmd]) byCommand[cmd] = [];
    byCommand[cmd].push(t);
  }

  console.log('\nBy command type:');
  for (const [cmd, items] of Object.entries(byCommand).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${cmd}: ${items.length}`);
  }

  // Prepare insert statement
  const insertExample = db.prepare(`
    INSERT OR REPLACE INTO llm_examples (
      code_example_id, language, prompt, completion, quality_score, usage_count, created_at
    ) VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
  `);

  // Clear existing examples if not dry run
  if (!dryRun) {
    db.exec('DELETE FROM llm_examples');
    console.log('\nCleared existing llm_examples');
  }

  // Insert examples
  let inserted = 0;
  const examples: LLMExampleInsert[] = [];

  for (const t of simpleTranslations) {
    const prompt = generatePrompt(t.title, t.description, t.raw_code);
    const completion = t.hyperscript;
    const qualityScore = t.confidence;

    examples.push({
      code_example_id: t.code_example_id,
      language: t.language,
      prompt,
      completion,
      quality_score: qualityScore,
    });

    if (!dryRun) {
      insertExample.run(
        t.code_example_id,
        t.language,
        prompt,
        completion,
        qualityScore
      );
    }
    inserted++;

    if (verbose) {
      console.log(`\n[${t.language}] (${qualityScore.toFixed(2)})`);
      console.log(`  Prompt: ${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}`);
      console.log(`  Completion: ${completion.substring(0, 50)}${completion.length > 50 ? '...' : ''}`);
    }
  }

  // Summary statistics
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total examples seeded: ${inserted}`);

  // By language
  const byLang: Record<string, number> = {};
  for (const ex of examples) {
    byLang[ex.language] = (byLang[ex.language] || 0) + 1;
  }
  console.log('\nBy language:');
  for (const [lang, count] of Object.entries(byLang).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${lang}: ${count}`);
  }

  // Verify insertion
  if (!dryRun) {
    const countResult = db.prepare('SELECT COUNT(*) as count FROM llm_examples').get() as { count: number };
    console.log(`\nVerified: ${countResult.count} examples in llm_examples table`);
  } else {
    console.log('\n(Dry run - no changes written to database)');
  }

  // Show sample examples
  console.log('\nSample examples:');
  const samples = examples.slice(0, 5);
  for (const sample of samples) {
    console.log(`\n[${sample.language}]`);
    console.log(`  Prompt: "${sample.prompt}"`);
    console.log(`  Completion: "${sample.completion}"`);
    console.log(`  Quality: ${sample.quality_score.toFixed(2)}`);
  }

  db.close();
}

// Run if executed directly
if (import.meta.main) {
  seedLLMExamples().catch(console.error);
}
