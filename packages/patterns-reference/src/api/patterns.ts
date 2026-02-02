/**
 * Pattern Queries API
 *
 * Provides functions to query patterns from the database.
 */

import { getDatabase } from '../database/connection';
import type {
  Pattern,
  SearchOptions,
  PatternStats,
  ConnectionOptions,
  EngineCompat,
} from '../types';

// =============================================================================
// Database Row Types
// =============================================================================

interface CodeExampleRow {
  id: string;
  title: string;
  raw_code: string;
  description: string | null;
  feature: string | null;
  engine: string | null;
  source_url: string | null;
  created_at: string;
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get a pattern by ID.
 */
export async function getPatternById(
  id: string,
  options?: ConnectionOptions
): Promise<Pattern | null> {
  const db = getDatabase({ ...options, readonly: true });
  const row = db
    .prepare(
      `
    SELECT id, title, raw_code, description, feature, engine, created_at
    FROM code_examples
    WHERE id = ?
  `
    )
    .get(id) as CodeExampleRow | undefined;

  return row ? mapRowToPattern(row) : null;
}

/**
 * Get patterns by category (feature in hyperscript-lsp schema).
 */
export async function getPatternsByCategory(
  category: string,
  options?: ConnectionOptions
): Promise<Pattern[]> {
  const db = getDatabase({ ...options, readonly: true });
  const rows = db
    .prepare(
      `
    SELECT id, title, raw_code, description, feature, engine, created_at
    FROM code_examples
    WHERE feature = ?
    ORDER BY title
  `
    )
    .all(category) as CodeExampleRow[];

  return rows.map(mapRowToPattern);
}

/**
 * Get patterns by command (extracted from raw_code).
 */
export async function getPatternsByCommand(
  command: string,
  options?: ConnectionOptions
): Promise<Pattern[]> {
  const db = getDatabase({ ...options, readonly: true });
  // Use word boundary regex in SQLite
  const rows = db
    .prepare(
      `
    SELECT id, title, raw_code, description, feature, engine, created_at
    FROM code_examples
    WHERE raw_code LIKE ?
    ORDER BY title
  `
    )
    .all(`%${command}%`) as CodeExampleRow[];

  // Filter more precisely in JS (SQLite LIKE is case-insensitive and broad)
  return rows
    .filter(row => new RegExp(`\\b${command}\\b`, 'i').test(row.raw_code))
    .map(mapRowToPattern);
}

/**
 * Search patterns by text query.
 */
export async function searchPatterns(
  query: string,
  searchOptions: SearchOptions = {},
  connOptions?: ConnectionOptions
): Promise<Pattern[]> {
  const db = getDatabase({ ...connOptions, readonly: true });
  const { limit = 50, offset = 0 } = searchOptions;

  const rows = db
    .prepare(
      `
    SELECT id, title, raw_code, description, feature, engine, created_at
    FROM code_examples
    WHERE title LIKE ? OR raw_code LIKE ? OR description LIKE ?
    ORDER BY title
    LIMIT ? OFFSET ?
  `
    )
    .all(`%${query}%`, `%${query}%`, `%${query}%`, limit, offset) as CodeExampleRow[];

  return rows.map(mapRowToPattern);
}

/**
 * Get all patterns.
 */
export async function getAllPatterns(
  searchOptions: SearchOptions = {},
  connOptions?: ConnectionOptions
): Promise<Pattern[]> {
  const db = getDatabase({ ...connOptions, readonly: true });
  const { limit = 1000, offset = 0 } = searchOptions;

  const rows = db
    .prepare(
      `
    SELECT id, title, raw_code, description, feature, engine, created_at
    FROM code_examples
    ORDER BY title
    LIMIT ? OFFSET ?
  `
    )
    .all(limit, offset) as CodeExampleRow[];

  return rows.map(mapRowToPattern);
}

/**
 * Get pattern statistics.
 */
export async function getPatternStats(connOptions?: ConnectionOptions): Promise<PatternStats> {
  const db = getDatabase({ ...connOptions, readonly: true });

  // Total patterns
  const patternCount = db.prepare('SELECT COUNT(*) as count FROM code_examples').get() as {
    count: number;
  };

  // Total translations
  const translationCount = db
    .prepare('SELECT COUNT(*) as count FROM pattern_translations')
    .get() as {
    count: number;
  };

  // By language
  const byLangRows = db
    .prepare(
      `
    SELECT
      language,
      COUNT(*) as count,
      SUM(verified_parses) as verified_count
    FROM pattern_translations
    GROUP BY language
  `
    )
    .all() as { language: string; count: number; verified_count: number }[];

  const byLanguage: Record<string, { count: number; verifiedCount: number }> = {};
  for (const row of byLangRows) {
    byLanguage[row.language] = {
      count: row.count,
      verifiedCount: row.verified_count,
    };
  }

  // By category
  const byCatRows = db
    .prepare(
      `
    SELECT feature, COUNT(*) as count
    FROM code_examples
    WHERE feature IS NOT NULL
    GROUP BY feature
  `
    )
    .all() as { feature: string; count: number }[];

  const byCategory: Record<string, number> = {};
  for (const row of byCatRows) {
    byCategory[row.feature] = row.count;
  }

  // Average confidence
  const avgConfResult = db
    .prepare('SELECT AVG(confidence) as avg FROM pattern_translations WHERE confidence > 0')
    .get() as { avg: number };

  return {
    totalPatterns: patternCount.count,
    totalTranslations: translationCount.count,
    byLanguage,
    byCategory,
    avgConfidence: avgConfResult.avg || 0,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map database row to Pattern type.
 */
function mapRowToPattern(row: CodeExampleRow): Pattern {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    rawCode: row.raw_code,
    category: row.feature,
    primaryCommand: extractPrimaryCommand(row.raw_code),
    tags: extractTags(row.raw_code),
    difficulty: inferDifficulty(row.raw_code),
    engine: (row.engine as EngineCompat) || null,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Extract primary command from hyperscript code.
 */
function extractPrimaryCommand(code: string): string | null {
  const match = code.match(/^(on|toggle|put|set|add|remove|show|hide|wait|log|send|fetch|call)\b/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Extract tags from code.
 */
function extractTags(code: string): string[] {
  const tags: string[] = [];
  if (code.includes('.')) tags.push('class');
  if (code.includes('#')) tags.push('id');
  if (code.includes('on ')) tags.push('event');
  if (code.includes('fetch')) tags.push('async');
  if (code.includes('wait')) tags.push('timing');
  return tags;
}

/**
 * Infer difficulty from code complexity.
 */
function inferDifficulty(code: string): 'beginner' | 'intermediate' | 'advanced' {
  const lines = code.split('\n').filter(l => l.trim()).length;
  if (lines === 1 && !code.includes('then')) return 'beginner';
  if (lines <= 3) return 'intermediate';
  return 'advanced';
}
