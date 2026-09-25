/**
 * Seed LLM Examples Script
 *
 * Populates the llm_examples table with few-shot examples for LLM code
 * generation: for every pattern, its description and its title as prompts,
 * each paired with the pattern's code.
 *
 * It also used to fill regex templates per category ("{action} the {class} class
 * on {target}") — 327 of 663 rows, and 275 of those shared their prompt with
 * DIFFERENT code: "When clicked, perform the action" alone had 87 completions.
 * A prompt that stands for 87 programs teaches a model nothing about what it
 * asks for, and each template's quality score was a per-template constant, so
 * ranking could not tell them apart. Descriptions and titles are specific; no
 * two different programs share one.
 *
 * Usage: npx tsx scripts/seed-llm-examples.ts [--db-path <path>] [--dry-run]
 *
 * Options:
 *   --db-path <path>  Path to database file (default: ./data/patterns.db)
 *   --dry-run         Show what would be done without making changes
 */

import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { resolve } from 'path';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_DB_PATH = resolve(__dirname, '../data/patterns.db');

// =============================================================================
// Types
// =============================================================================

export interface CodeExample {
  id: string;
  title: string;
  raw_code: string;
  description: string;
  feature: string;
}

export interface LLMExample {
  code_example_id: string;
  language: string;
  prompt: string;
  completion: string;
  quality_score: number;
}

// =============================================================================
// Example Generation
// =============================================================================

/** The prompts for one pattern: its description, then its title if that differs. */
export function generatePrompts(example: CodeExample): LLMExample[] {
  const results: LLMExample[] = [
    {
      code_example_id: example.id,
      language: 'en',
      prompt: example.description,
      completion: example.raw_code,
      quality_score: 0.95,
    },
  ];

  if (example.title !== example.description) {
    results.push({
      code_example_id: example.id,
      language: 'en',
      prompt: example.title,
      completion: example.raw_code,
      quality_score: 0.85,
    });
  }

  return results;
}

// =============================================================================
// Main
// =============================================================================

async function seedLLMExamples(dbPath: string, dryRun: boolean) {
  console.log('Seeding LLM examples...');
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
      'SELECT id FROM llm_examples WHERE code_example_id = ? AND prompt = ?'
    );
    const insertExample = db.prepare(`
      INSERT INTO llm_examples (code_example_id, language, prompt, completion, quality_score)
      VALUES (?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    let skipped = 0;

    // Generate LLM examples for each code example
    for (const example of examples) {
      const prompts = generatePrompts(example);

      for (const llmExample of prompts) {
        // Check if example exists
        const existing = checkExists.get(llmExample.code_example_id, llmExample.prompt);

        if (existing) {
          skipped++;
          continue;
        }

        if (!dryRun) {
          insertExample.run(
            llmExample.code_example_id,
            llmExample.language,
            llmExample.prompt,
            llmExample.completion,
            llmExample.quality_score
          );
        }
        inserted++;

        if (dryRun) {
          console.log(`  [${example.id}] "${llmExample.prompt}" → ${llmExample.completion}`);
        }
      }
    }

    // Print summary
    console.log('\nSeed complete!');
    console.log(`  - Inserted: ${inserted}`);
    console.log(`  - Skipped (existing): ${skipped}`);

    // Print stats
    const stats = db
      .prepare(
        `
      SELECT
        COUNT(*) as total,
        AVG(quality_score) as avg_quality
      FROM llm_examples
    `
      )
      .get() as { total: number; avg_quality: number };

    console.log('\nLLM Examples stats:');
    console.log(`  - Total examples: ${stats.total}`);
    console.log(`  - Average quality: ${stats.avg_quality?.toFixed(2) || 'N/A'}`);

    // Print by feature
    const byFeature = db
      .prepare(
        `
      SELECT ce.feature, COUNT(*) as count
      FROM llm_examples le
      JOIN code_examples ce ON le.code_example_id = ce.id
      GROUP BY ce.feature
      ORDER BY count DESC
    `
      )
      .all() as { feature: string; count: number }[];

    console.log('\nExamples by feature:');
    for (const row of byFeature) {
      console.log(`  ${row.feature}: ${row.count}`);
    }
  } finally {
    db.close();
  }
}

// Run only when executed (`tsx scripts/seed-llm-examples.ts`), not when imported
// for generatePrompts by a test.
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  const args = process.argv.slice(2);
  const dbPathIndex = args.indexOf('--db-path');
  const dbPath =
    dbPathIndex >= 0 && args[dbPathIndex + 1] ? args[dbPathIndex + 1] : DEFAULT_DB_PATH;
  seedLLMExamples(dbPath, args.includes('--dry-run')).catch(console.error);
}
