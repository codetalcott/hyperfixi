/**
 * LLM Examples Query Module
 *
 * Queries the llm_examples table from the patterns database for few-shot learning.
 * This module provides database-backed example retrieval for LLM code generation.
 *
 * Note: This module is designed for server-side use. In browser environments,
 * it will gracefully return empty results.
 *
 * @deprecated This module is deprecated. Use `@hyperfixi/patterns-reference` instead.
 *
 * Migration guide:
 * ```typescript
 * // Before (deprecated):
 * import { findRelevantExamples } from './llm-examples-query';
 * const examples = findRelevantExamples('toggle a class');
 *
 * // After (recommended):
 * import { findRelevantExamples } from '@hyperfixi/patterns-reference';
 * const examples = findRelevantExamples('toggle a class');
 *
 * // Or use the async API:
 * import { getLLMExamples } from '@hyperfixi/patterns-reference';
 * const examples = await getLLMExamples('toggle a class');
 * ```
 *
 * This module will be removed in a future version.
 */

export interface LLMExampleRecord {
  id: number;
  prompt: string;
  completion: string;
  language: string;
  qualityScore: number;
}

// Database connection (lazy-loaded)
let db: any = null;
let databaseAvailable = true;

/**
 * Get the database path from environment or default
 */
function getDatabasePath(): string {
  return (
    process.env.LSP_DB_PATH ||
    process.env.HYPERSCRIPT_LSP_DB ||
    // Default relative path from packages/core
    '../../hyperscript-lsp/data/hyperscript.db'
  );
}

/**
 * Initialize the database connection (lazy)
 */
function getDatabase(): any | null {
  if (!databaseAvailable) return null;
  if (db) return db;

  try {
    // Dynamic require to avoid bundling issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3');
    const dbPath = getDatabasePath();
    db = new Database(dbPath, { readonly: true });
    return db;
  } catch (error) {
    // Database not available (browser, missing file, etc.)
    console.warn(
      '[LLM Examples] Database not available:',
      error instanceof Error ? error.message : String(error)
    );
    databaseAvailable = false;
    return null;
  }
}

/**
 * Close the database connection
 *
 * @deprecated Use `closeDatabase` from `@hyperfixi/patterns-reference` instead.
 */
export function closeDatabase(): void {
  if (db) {
    try {
      db.close();
    } catch {
      // Ignore close errors
    }
    db = null;
  }
}

/**
 * Check if the database is available
 *
 * @deprecated Use `isDatabaseAvailable` from `@hyperfixi/patterns-reference` instead.
 */
export function isDatabaseAvailable(): boolean {
  return getDatabase() !== null;
}

/**
 * Extract keywords from a prompt for matching
 */
function extractKeywords(prompt: string): string[] {
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'to',
    'on',
    'in',
    'for',
    'is',
    'it',
    'when',
    'i',
    'want',
    'need',
    'create',
    'make',
    'please',
    'can',
    'you',
    'would',
    'should',
    'like',
    'that',
    'this',
    'with',
    'from',
  ]);

  return prompt
    .toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Find relevant examples for a generation prompt.
 *
 * Uses keyword matching to find examples whose prompts or completions
 * contain similar terms to the input prompt.
 *
 * @deprecated Use `findRelevantExamples` from `@hyperfixi/patterns-reference` instead.
 * @param prompt - The user's request/prompt
 * @param language - Target language code (default: 'en')
 * @param limit - Maximum number of examples to return (default: 5)
 * @returns Array of matching LLM examples, sorted by quality
 */
export function findRelevantExamples(
  prompt: string,
  language: string = 'en',
  limit: number = 5
): LLMExampleRecord[] {
  const database = getDatabase();
  if (!database) return [];

  try {
    const keywords = extractKeywords(prompt);

    if (keywords.length === 0) {
      // Return top-quality examples as fallback
      const stmt = database.prepare(`
        SELECT id, prompt, completion, language, quality_score as qualityScore
        FROM llm_examples
        WHERE language = ?
        ORDER BY quality_score DESC, usage_count DESC
        LIMIT ?
      `);
      return stmt.all(language, limit) as LLMExampleRecord[];
    }

    // Build LIKE clauses for keyword matching
    const likeClauses = keywords.map(() => '(prompt LIKE ? OR completion LIKE ?)').join(' OR ');
    const params = keywords.flatMap(k => [`%${k}%`, `%${k}%`]);

    const stmt = database.prepare(`
      SELECT id, prompt, completion, language, quality_score as qualityScore
      FROM llm_examples
      WHERE language = ? AND (${likeClauses})
      ORDER BY quality_score DESC
      LIMIT ?
    `);

    return stmt.all(language, ...params, limit) as LLMExampleRecord[];
  } catch (error) {
    console.warn(
      '[LLM Examples] Query failed:',
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

/**
 * Get examples by command type (toggle, add, remove, etc.)
 *
 * @deprecated Use `findExamplesByCommand` from `@hyperfixi/patterns-reference` instead.
 */
export function findExamplesByCommand(
  command: string,
  language: string = 'en',
  limit: number = 5
): LLMExampleRecord[] {
  const database = getDatabase();
  if (!database) return [];

  try {
    const stmt = database.prepare(`
      SELECT id, prompt, completion, language, quality_score as qualityScore
      FROM llm_examples
      WHERE language = ? AND completion LIKE ?
      ORDER BY quality_score DESC
      LIMIT ?
    `);

    // Match command at start of completion (after 'on <event>' if present)
    return stmt.all(language, `%${command}%`, limit) as LLMExampleRecord[];
  } catch (error) {
    console.warn(
      '[LLM Examples] Query failed:',
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

/**
 * Increment usage count for retrieved examples.
 * This helps track which examples are most useful over time.
 *
 * @deprecated Use `trackExampleUsage` from `@hyperfixi/patterns-reference` instead.
 */
export function trackExampleUsage(ids: number[]): void {
  const database = getDatabase();
  if (!database || ids.length === 0) return;

  try {
    // Re-open with write access for tracking
    const Database = require('better-sqlite3');
    const dbPath = getDatabasePath();
    const writeDb = new Database(dbPath);

    const stmt = writeDb.prepare(`
      UPDATE llm_examples SET usage_count = usage_count + 1 WHERE id = ?
    `);

    for (const id of ids) {
      stmt.run(id);
    }

    writeDb.close();
  } catch (error) {
    // Silently ignore tracking errors (read-only mode, etc.)
  }
}

/**
 * Build few-shot context for external LLM APIs.
 *
 * Creates a formatted string with example prompt/completion pairs
 * that can be used as context for LLM code generation.
 *
 * @deprecated Use `buildFewShotContext` from `@hyperfixi/patterns-reference` instead.
 * @param prompt - The user's request
 * @param language - Target language code
 * @param numExamples - Number of examples to include
 * @returns Formatted few-shot context string
 */
export function buildFewShotContext(
  prompt: string,
  language: string = 'en',
  numExamples: number = 3
): string {
  const examples = findRelevantExamples(prompt, language, numExamples);

  if (examples.length === 0) {
    return '';
  }

  // Track usage for quality metrics
  trackExampleUsage(examples.map(e => e.id));

  let context = 'Here are some example hyperscript patterns:\n\n';

  for (const ex of examples) {
    context += `Task: ${ex.prompt}\n`;
    context += `Code: ${ex.completion}\n\n`;
  }

  context += `Now generate hyperscript for: ${prompt}\n`;

  return context;
}

/**
 * Get statistics about available LLM examples
 *
 * @deprecated Use `getLLMExampleStats` from `@hyperfixi/patterns-reference` instead.
 */
export function getLLMExampleStats(): {
  total: number;
  byLanguage: Record<string, number>;
  avgQuality: number;
} | null {
  const database = getDatabase();
  if (!database) return null;

  try {
    const totalResult = database.prepare('SELECT COUNT(*) as count FROM llm_examples').get() as {
      count: number;
    };

    const byLangResult = database
      .prepare(
        `
      SELECT language, COUNT(*) as count
      FROM llm_examples
      GROUP BY language
    `
      )
      .all() as { language: string; count: number }[];

    const avgResult = database
      .prepare('SELECT AVG(quality_score) as avg FROM llm_examples')
      .get() as { avg: number };

    const byLanguage: Record<string, number> = {};
    for (const { language, count } of byLangResult) {
      byLanguage[language] = count;
    }

    return {
      total: totalResult.count,
      byLanguage,
      avgQuality: avgResult.avg || 0,
    };
  } catch {
    return null;
  }
}
