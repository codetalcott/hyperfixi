/**
 * Seed LLM Examples Script
 *
 * Populates the llm_examples table with high-quality few-shot examples
 * for LLM code generation. Examples are generated for all patterns
 * with varied prompts to improve model performance.
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

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dbPathIndex = args.indexOf('--db-path');
const dbPath = dbPathIndex >= 0 && args[dbPathIndex + 1] ? args[dbPathIndex + 1] : DEFAULT_DB_PATH;

// =============================================================================
// Prompt Templates
// =============================================================================

interface PromptTemplate {
  template: string;
  qualityScore: number;
}

// Templates for generating prompts from patterns
const PROMPT_TEMPLATES: Record<string, PromptTemplate[]> = {
  'class-manipulation': [
    { template: '{action} the {class} class on {target}', qualityScore: 0.9 },
    { template: '{action} a class when the user clicks', qualityScore: 0.85 },
    { template: 'Make the {target} {action} {class} on click', qualityScore: 0.8 },
  ],
  'dom-manipulation': [
    { template: '{action} the content of {target}', qualityScore: 0.9 },
    { template: 'When clicked, {action} the text to "{value}"', qualityScore: 0.85 },
    { template: 'Update {target} with new content on click', qualityScore: 0.8 },
  ],
  visibility: [
    { template: '{action} the {target} element', qualityScore: 0.9 },
    { template: 'Make {target} {action} when clicked', qualityScore: 0.85 },
    { template: 'Toggle visibility of {target}', qualityScore: 0.8 },
  ],
  timing: [
    { template: 'Wait {duration} then {action}', qualityScore: 0.9 },
    { template: 'After {duration}, {action} the element', qualityScore: 0.85 },
    { template: 'Delay the {action} by {duration}', qualityScore: 0.8 },
  ],
  animation: [
    { template: 'Animate {property} to {value} over {duration}', qualityScore: 0.9 },
    { template: 'Transition {property} smoothly on click', qualityScore: 0.85 },
    { template: 'Fade out the element then remove it', qualityScore: 0.8 },
  ],
  events: [
    { template: 'Send a {event} event to {target}', qualityScore: 0.9 },
    { template: 'Trigger {event} when the page loads', qualityScore: 0.85 },
    { template: 'Dispatch a custom event to another element', qualityScore: 0.8 },
  ],
  async: [
    { template: 'Fetch data from {url} and display it', qualityScore: 0.9 },
    { template: 'Load data from an API and show in {target}', qualityScore: 0.85 },
    { template: 'Make an HTTP request and update the page', qualityScore: 0.8 },
  ],
  counters: [
    { template: '{action} the counter when clicked', qualityScore: 0.9 },
    { template: 'Increase/decrease {target} on click', qualityScore: 0.85 },
    { template: 'Add/subtract from a number element', qualityScore: 0.8 },
  ],
  debugging: [
    { template: 'Log "{message}" to console', qualityScore: 0.9 },
    { template: 'Print a message when clicked', qualityScore: 0.85 },
    { template: 'Debug by logging to console', qualityScore: 0.8 },
  ],
  navigation: [
    { template: 'Navigate to {url}', qualityScore: 0.9 },
    { template: 'Go to a new page on click', qualityScore: 0.85 },
    { template: 'Change the browser URL', qualityScore: 0.8 },
  ],
  'control-flow': [
    { template: 'If {condition} then {action}', qualityScore: 0.9 },
    { template: 'Only {action} when {condition}', qualityScore: 0.85 },
    { template: 'Conditionally execute based on state', qualityScore: 0.8 },
  ],
  loops: [
    { template: 'Repeat {action} {count} times', qualityScore: 0.9 },
    { template: 'Loop through and {action} each item', qualityScore: 0.85 },
    { template: 'Do something multiple times', qualityScore: 0.8 },
  ],
};

// Fallback templates for unknown features
const DEFAULT_TEMPLATES: PromptTemplate[] = [
  { template: 'When clicked, perform the action', qualityScore: 0.7 },
  { template: 'Execute hyperscript on user interaction', qualityScore: 0.65 },
];

// =============================================================================
// Types
// =============================================================================

interface CodeExample {
  id: string;
  title: string;
  raw_code: string;
  description: string;
  feature: string;
}

interface LLMExample {
  code_example_id: string;
  language: string;
  prompt: string;
  completion: string;
  quality_score: number;
}

// =============================================================================
// Example Generation
// =============================================================================

/**
 * Extract variables from code for template substitution.
 */
function extractVariables(code: string): Record<string, string> {
  const vars: Record<string, string> = {};

  // Extract class name
  const classMatch = code.match(/\.(\w+)/);
  if (classMatch) vars.class = classMatch[1];

  // Extract target
  const targetMatch = code.match(/#(\w+)/);
  if (targetMatch) vars.target = `#${targetMatch[1]}`;

  // Extract duration
  const durationMatch = code.match(/(\d+(?:ms|s|m))/);
  if (durationMatch) vars.duration = durationMatch[1];

  // Extract string value
  const stringMatch = code.match(/"([^"]+)"/);
  if (stringMatch) vars.value = stringMatch[1];

  // Extract URL
  const urlMatch = code.match(/\/\w+(?:\/\w+)*/);
  if (urlMatch) vars.url = urlMatch[0];

  // Detect action
  const actionMatch = code.match(/^\s*(?:on\s+\w+\s+)?(\w+)/);
  if (actionMatch) vars.action = actionMatch[1];

  return vars;
}

/**
 * Generate prompts for a code example.
 */
function generatePrompts(example: CodeExample): LLMExample[] {
  const templates = PROMPT_TEMPLATES[example.feature] || DEFAULT_TEMPLATES;
  const variables = extractVariables(example.raw_code);
  const results: LLMExample[] = [];

  // Always include the description as a prompt
  results.push({
    code_example_id: example.id,
    language: 'en',
    prompt: example.description,
    completion: example.raw_code,
    quality_score: 0.95,
  });

  // Generate prompts from templates
  for (const template of templates) {
    let prompt = template.template;

    // Substitute variables
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    // Skip if template wasn't fully substituted
    if (prompt.includes('{') && prompt.includes('}')) {
      continue;
    }

    // Skip duplicates
    if (results.some(r => r.prompt === prompt)) {
      continue;
    }

    results.push({
      code_example_id: example.id,
      language: 'en',
      prompt,
      completion: example.raw_code,
      quality_score: template.qualityScore,
    });
  }

  // Add title-based prompt if different from description
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

async function seedLLMExamples() {
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
        AVG(quality_score) as avg_quality,
        SUM(usage_count) as total_usage
      FROM llm_examples
    `
      )
      .get() as { total: number; avg_quality: number; total_usage: number };

    console.log('\nLLM Examples stats:');
    console.log(`  - Total examples: ${stats.total}`);
    console.log(`  - Average quality: ${stats.avg_quality?.toFixed(2) || 'N/A'}`);
    console.log(`  - Total usage: ${stats.total_usage || 0}`);

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

// Run
seedLLMExamples().catch(console.error);
