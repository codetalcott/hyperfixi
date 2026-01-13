/**
 * LLM Examples API
 *
 * Provides functions to query and manage LLM examples for few-shot learning.
 */

import { getDatabase } from '../database/connection';
import type { LLMExample, ConnectionOptions } from '../types';

// =============================================================================
// Database Row Types
// =============================================================================

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

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get LLM examples relevant to a prompt.
 * Uses text similarity to find relevant patterns.
 */
export async function getLLMExamples(
  prompt: string,
  language: string = 'en',
  limit: number = 5,
  options?: ConnectionOptions
): Promise<LLMExample[]> {
  const db = getDatabase({ ...options, readonly: true });

  // Extract keywords from prompt
  const keywords = extractKeywords(prompt);

  if (keywords.length === 0) {
    // Return top-quality examples as fallback
    const rows = db
      .prepare(
        `
      SELECT * FROM llm_examples
      WHERE language = ?
      ORDER BY quality_score DESC, usage_count DESC
      LIMIT ?
    `
      )
      .all(language, limit) as LLMExampleRow[];

    // Track usage
    trackUsage(
      db,
      rows.map(r => r.id)
    );

    return rows.map(mapRowToLLMExample);
  }

  // Build LIKE clauses for keyword matching
  const likeClauses = keywords.map(() => '(prompt LIKE ? OR completion LIKE ?)').join(' OR ');
  const params = keywords.flatMap(k => [`%${k}%`, `%${k}%`]);

  const rows = db
    .prepare(
      `
    SELECT * FROM llm_examples
    WHERE language = ? AND (${likeClauses})
    ORDER BY quality_score DESC
    LIMIT ?
  `
    )
    .all(language, ...params, limit) as LLMExampleRow[];

  // Track usage
  trackUsage(
    db,
    rows.map(r => r.id)
  );

  return rows.map(mapRowToLLMExample);
}

/**
 * Get examples by command type.
 */
export async function getExamplesByCommand(
  command: string,
  language: string = 'en',
  limit: number = 5,
  options?: ConnectionOptions
): Promise<LLMExample[]> {
  const db = getDatabase({ ...options, readonly: true });

  const rows = db
    .prepare(
      `
    SELECT * FROM llm_examples
    WHERE language = ? AND completion LIKE ?
    ORDER BY quality_score DESC
    LIMIT ?
  `
    )
    .all(language, `%${command}%`, limit) as LLMExampleRow[];

  return rows.map(mapRowToLLMExample);
}

/**
 * Get high-quality examples (for few-shot prompts).
 */
export async function getHighQualityExamples(
  language: string = 'en',
  minQuality: number = 0.8,
  limit: number = 10,
  options?: ConnectionOptions
): Promise<LLMExample[]> {
  const db = getDatabase({ ...options, readonly: true });

  const rows = db
    .prepare(
      `
    SELECT * FROM llm_examples
    WHERE language = ? AND quality_score >= ?
    ORDER BY quality_score DESC, usage_count DESC
    LIMIT ?
  `
    )
    .all(language, minQuality, limit) as LLMExampleRow[];

  return rows.map(mapRowToLLMExample);
}

/**
 * Get most used examples (popular).
 */
export async function getMostUsedExamples(
  language: string = 'en',
  limit: number = 10,
  options?: ConnectionOptions
): Promise<LLMExample[]> {
  const db = getDatabase({ ...options, readonly: true });

  const rows = db
    .prepare(
      `
    SELECT * FROM llm_examples
    WHERE language = ?
    ORDER BY usage_count DESC, quality_score DESC
    LIMIT ?
  `
    )
    .all(language, limit) as LLMExampleRow[];

  return rows.map(mapRowToLLMExample);
}

/**
 * Build few-shot context for LLM prompting.
 */
export async function buildFewShotContext(
  prompt: string,
  language: string = 'en',
  numExamples: number = 3,
  options?: ConnectionOptions
): Promise<string> {
  const examples = await getLLMExamples(prompt, language, numExamples, options);

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
 * Add a new LLM example.
 */
export async function addLLMExample(
  example: Omit<LLMExample, 'id' | 'usageCount' | 'createdAt'>,
  options?: ConnectionOptions
): Promise<number> {
  const db = getDatabase(options);

  const result = db
    .prepare(
      `
    INSERT INTO llm_examples
      (code_example_id, language, prompt, completion, quality_score, usage_count, created_at)
    VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
  `
    )
    .run(
      example.patternId,
      example.language,
      example.prompt,
      example.completion,
      example.qualityScore
    );

  return result.lastInsertRowid as number;
}

/**
 * Update example quality score.
 */
export async function updateQualityScore(
  id: number,
  qualityScore: number,
  options?: ConnectionOptions
): Promise<void> {
  const db = getDatabase(options);

  db.prepare(
    `
    UPDATE llm_examples SET quality_score = ? WHERE id = ?
  `
  ).run(qualityScore, id);
}

/**
 * Get LLM example statistics.
 */
export async function getLLMStats(options?: ConnectionOptions): Promise<{
  total: number;
  byLanguage: Record<string, number>;
  avgQuality: number;
  totalUsage: number;
}> {
  const db = getDatabase({ ...options, readonly: true });

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

  const usageResult = db.prepare('SELECT SUM(usage_count) as total FROM llm_examples').get() as {
    total: number;
  };

  const byLanguage: Record<string, number> = {};
  for (const { language, count } of byLangResult) {
    byLanguage[language] = count;
  }

  return {
    total: totalResult.count,
    byLanguage,
    avgQuality: avgResult.avg || 0,
    totalUsage: usageResult.total || 0,
  };
}

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
 * Track usage of examples.
 */
function trackUsage(db: any, ids: number[]): void {
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

/**
 * Map database row to LLMExample type.
 */
function mapRowToLLMExample(row: LLMExampleRow): LLMExample {
  return {
    id: row.id,
    patternId: row.code_example_id,
    language: row.language,
    prompt: row.prompt,
    completion: row.completion,
    qualityScore: row.quality_score,
    usageCount: row.usage_count,
    createdAt: new Date(row.created_at),
  };
}
