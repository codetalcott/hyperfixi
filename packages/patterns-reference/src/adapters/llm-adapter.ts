/**
 * Unified LLM Adapter
 *
 * This adapter provides a unified interface for LLM example operations,
 * supporting both sync and async access patterns for backward compatibility
 * with packages/core/src/context/llm-examples-query.ts.
 *
 * @module @hyperfixi/patterns-reference/adapters/llm-adapter
 */

import { getDatabase, closeDatabase } from '../database/connection';
import type { LLMExample, ConnectionOptions, EngineCompat } from '../types';
import { exampleCondition } from '../api/engine-filter';
import {
  getLLMExamples,
  getExamplesByCommand,
  getHighQualityExamples,
  getMostUsedExamples,
  buildFewShotContext,
  getLLMStats,
} from '../api/llm';

// =============================================================================
// Sync Interface (Backward Compatibility)
// =============================================================================

/**
 * Legacy record type matching packages/core/src/context/llm-examples-query.ts
 */
export interface LLMExampleRecord {
  id: number;
  prompt: string;
  completion: string;
  language: string;
  qualityScore: number;
  /** The engine(s) verified to run the example's pattern (never null here). */
  engine: EngineCompat | null;
}

/** Every sync example query reads through this join; see api/engine-filter.ts. */
const RECORDS_FROM = `
  SELECT le.id, le.prompt, le.completion, le.language, le.quality_score as qualityScore,
         ce.engine AS engine
  FROM llm_examples le
  JOIN code_examples ce ON ce.id = le.code_example_id`;

/**
 * Database row type for internal use
 */
interface LLMExampleRow {
  id: number;
  code_example_id: string;
  language: string;
  prompt: string;
  completion: string;
  quality_score: number;
  usage_count: number;
  created_at: string;
}

// State for sync operations
let syncDatabaseAvailable = true;

/**
 * Check if the database is available for sync operations.
 */
export function isDatabaseAvailable(): boolean {
  try {
    getDatabase({ readonly: true });
    return true;
  } catch {
    syncDatabaseAvailable = false;
    return false;
  }
}

/**
 * Find relevant examples (sync interface - matches llm-examples-query.ts).
 *
 * This is the synchronous version for backward compatibility.
 * Prefer async getLLMExamples() for new code.
 *
 * @param prompt - The user's request/prompt
 * @param language - Target language code (default: 'en')
 * @param limit - Maximum number of examples to return (default: 5)
 * @param engine - Only examples whose pattern runs on this engine. Examples no
 *   engine runs are never returned, with or without it.
 */
export function findRelevantExamples(
  prompt: string,
  language: string = 'en',
  limit: number = 5,
  engine?: EngineCompat
): LLMExampleRecord[] {
  if (!syncDatabaseAvailable) return [];

  try {
    const db = getDatabase({ readonly: true });
    const runs = exampleCondition('ce.engine', engine);

    // Extract keywords from prompt
    const keywords = extractKeywords(prompt);

    if (keywords.length === 0) {
      // Return top-quality examples as fallback
      const rows = db
        .prepare(
          `${RECORDS_FROM}
        WHERE le.language = ? AND ${runs.sql}
        ORDER BY le.quality_score DESC, le.usage_count DESC
        LIMIT ?
      `
        )
        .all(language, ...runs.params, limit) as LLMExampleRecord[];

      return rows;
    }

    // Build LIKE clauses for keyword matching
    const likeClauses = keywords
      .map(() => '(le.prompt LIKE ? OR le.completion LIKE ?)')
      .join(' OR ');
    const params = keywords.flatMap(k => [`%${k}%`, `%${k}%`]);

    const rows = db
      .prepare(
        `${RECORDS_FROM}
      WHERE le.language = ? AND ${runs.sql} AND (${likeClauses})
      ORDER BY le.quality_score DESC
      LIMIT ?
    `
      )
      .all(language, ...runs.params, ...params, limit) as LLMExampleRecord[];

    return rows;
  } catch (error) {
    console.warn(
      '[LLM Adapter] Query failed:',
      error instanceof Error ? error.message : String(error)
    );
    syncDatabaseAvailable = false;
    return [];
  }
}

/**
 * Find examples by command type (sync interface).
 */
export function findExamplesByCommand(
  command: string,
  language: string = 'en',
  limit: number = 5,
  engine?: EngineCompat
): LLMExampleRecord[] {
  if (!syncDatabaseAvailable) return [];

  try {
    const db = getDatabase({ readonly: true });
    const runs = exampleCondition('ce.engine', engine);

    const rows = db
      .prepare(
        `${RECORDS_FROM}
      WHERE le.language = ? AND ${runs.sql} AND le.completion LIKE ?
      ORDER BY le.quality_score DESC
      LIMIT ?
    `
      )
      .all(language, ...runs.params, `%${command}%`, limit) as LLMExampleRecord[];

    return rows;
  } catch (error) {
    console.warn(
      '[LLM Adapter] Query failed:',
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

/**
 * Build few-shot context (sync interface).
 */
export function buildFewShotContextSync(
  prompt: string,
  language: string = 'en',
  numExamples: number = 3,
  engine?: EngineCompat
): string {
  const examples = findRelevantExamples(prompt, language, numExamples, engine);

  if (examples.length === 0) {
    return '';
  }

  let context = 'Here are some example hyperscript patterns:\n\n';

  for (const ex of examples) {
    context += `Task: ${ex.prompt}\n`;
    context += `Code: ${ex.completion}\n\n`;
  }

  context += `Now generate hyperscript for: ${prompt}\n`;

  return context;
}

/**
 * Track example usage (sync interface).
 *
 * @deprecated The counts go into the installed package's own database file,
 * which every install and every `populate` replaces, and only
 * getMostUsedExamples (deprecated with it) reads them. Nothing calls this.
 */
export function trackExampleUsage(ids: number[]): void {
  if (!syncDatabaseAvailable || ids.length === 0) return;

  try {
    const db = getDatabase();
    trackUsageSync(db, ids);
  } catch {
    // Silently ignore tracking errors
  }
}

/**
 * Get LLM example statistics (sync interface).
 */
export function getLLMExampleStats(): {
  total: number;
  byLanguage: Record<string, number>;
  avgQuality: number;
} | null {
  if (!syncDatabaseAvailable) return null;

  try {
    const db = getDatabase({ readonly: true });

    const totalResult = db.prepare('SELECT COUNT(*) as count FROM llm_examples').get() as {
      count: number;
    };

    const byLangResult = db
      .prepare(
        `
      SELECT language, COUNT(*) as count
      FROM llm_examples
      GROUP BY language
    `
      )
      .all() as { language: string; count: number }[];

    const avgResult = db.prepare('SELECT AVG(quality_score) as avg FROM llm_examples').get() as {
      avg: number;
    };

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

// =============================================================================
// Async Interface Re-exports
// =============================================================================

export {
  // Async versions (preferred for new code)
  getLLMExamples,
  getExamplesByCommand,
  getHighQualityExamples,
  getMostUsedExamples,
  buildFewShotContext,
  getLLMStats,
  // Database management
  closeDatabase,
};

// Re-export types
export type { LLMExample, ConnectionOptions };

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract keywords from a prompt for matching.
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
 * Track usage (sync internal helper).
 */
function trackUsageSync(db: any, ids: number[]): void {
  if (ids.length === 0) return;

  try {
    const stmt = db.prepare(`
      UPDATE llm_examples SET usage_count = usage_count + 1 WHERE id = ?
    `);

    for (const id of ids) {
      stmt.run(id);
    }
  } catch {
    // Silently ignore tracking errors
  }
}

// =============================================================================
// Full-Featured Interface
// =============================================================================

/**
 * Create a unified LLM adapter with both sync and async methods.
 *
 * @example
 * ```typescript
 * import { createLLMAdapter } from '@hyperfixi/patterns-reference/adapters/llm-adapter';
 *
 * const adapter = createLLMAdapter();
 *
 * // Sync (backward compat)
 * const examples = adapter.findRelevantExamples('toggle a class');
 *
 * // Async (preferred)
 * const asyncExamples = await adapter.getLLMExamples('toggle a class');
 *
 * adapter.close();
 * ```
 */
export function createLLMAdapter(options?: ConnectionOptions) {
  // Initialize database connection
  getDatabase(options);

  return {
    // Sync methods (backward compatibility with llm-examples-query.ts)
    findRelevantExamples,
    findExamplesByCommand,
    buildFewShotContextSync,
    trackExampleUsage,
    getLLMExampleStats,
    isDatabaseAvailable,

    // Async methods (preferred for new code)
    getLLMExamples: (prompt: string, language?: string, limit?: number, engine?: EngineCompat) =>
      getLLMExamples(prompt, language, limit, { ...options, engine }),
    getExamplesByCommand: (
      command: string,
      language?: string,
      limit?: number,
      engine?: EngineCompat
    ) => getExamplesByCommand(command, language, limit, { ...options, engine }),
    getHighQualityExamples: (
      language?: string,
      minQuality?: number,
      limit?: number,
      engine?: EngineCompat
    ) => getHighQualityExamples(language, minQuality, limit, { ...options, engine }),
    /** @deprecated See getMostUsedExamples. */
    getMostUsedExamples: (language?: string, limit?: number, engine?: EngineCompat) =>
      getMostUsedExamples(language, limit, { ...options, engine }),
    buildFewShotContext: (
      prompt: string,
      language?: string,
      numExamples?: number,
      engine?: EngineCompat
    ) => buildFewShotContext(prompt, language, numExamples, { ...options, engine }),
    getLLMStats: () => getLLMStats(options),

    // Cleanup
    close: closeDatabase,
  };
}
