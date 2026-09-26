/**
 * Pattern Queries API
 *
 * Provides functions to query patterns from the database.
 */

import { getDatabase } from '../database/connection';
import { hyperscriptBodies } from '../sync/markup-attributes';
import { runsOn } from './engine-filter';
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
  translatable: number;
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
    SELECT id, title, raw_code, description, feature, engine, translatable, created_at
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
    SELECT id, title, raw_code, description, feature, engine, translatable, created_at
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
    SELECT id, title, raw_code, description, feature, engine, translatable, created_at
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
 * The `engine` search option as SQL: omitted → no filter (a catalog lists
 * every pattern, with its verdict); otherwise the patterns that run on it.
 * (It used to be declared on SearchOptions and silently ignored.)
 */
function engineFilter(searchOptions: SearchOptions): { sql: string; params: string[] } {
  return searchOptions.engine === undefined
    ? { sql: '1 = 1', params: [] }
    : runsOn('engine', searchOptions.engine);
}

type Condition = { sql: string; params: string[] };

/**
 * The `language` search option as a predicate: the pattern has a translation in
 * that language that parses (`verified_parses`, measured at sync), or it carries
 * no hyperscript at all — markup the runtime reads as it is, the same in every
 * language (sse/ws wiring, a static component template). Such a row can never
 * "verify", so a parse-only rule would drop it from every language.
 */
function usableIn(
  db: ReturnType<typeof getDatabase>,
  language: string
): (pattern: Pattern) => boolean {
  const rows = db
    .prepare(
      'SELECT code_example_id AS id FROM pattern_translations WHERE language = ? AND verified_parses = 1'
    )
    .all(language) as Array<{ id: string }>;
  const verified = new Set(rows.map(row => row.id));
  return pattern => verified.has(pattern.id) || hyperscriptBodies(pattern.rawCode).length === 0;
}

/**
 * The patterns matching `match` and every search option, one page of them.
 *
 * `category`, `difficulty` and `language` used to be declared on SearchOptions
 * and silently ignored. `difficulty` is inferred from the code and `language`
 * reads the markup, so those two filter in JS — and paging runs after them, so a
 * page is always a page of MATCHING patterns (the table is a few hundred rows).
 */
function queryPatterns(
  searchOptions: SearchOptions,
  defaultLimit: number,
  connOptions: ConnectionOptions | undefined,
  match: Condition = { sql: '1 = 1', params: [] }
): Pattern[] {
  const db = getDatabase({ ...connOptions, readonly: true });
  const { limit = defaultLimit, offset = 0, category, difficulty, language } = searchOptions;
  const runs = engineFilter(searchOptions);
  const inCategory: Condition =
    category === undefined
      ? { sql: '1 = 1', params: [] }
      : { sql: 'feature = ?', params: [category] };

  const rows = db
    .prepare(
      `
    SELECT id, title, raw_code, description, feature, engine, translatable, created_at
    FROM code_examples
    WHERE (${match.sql}) AND ${runs.sql} AND ${inCategory.sql}
    ORDER BY title
  `
    )
    .all(...match.params, ...runs.params, ...inCategory.params) as CodeExampleRow[];

  const inLanguage = language === undefined ? null : usableIn(db, language);
  return rows
    .map(mapRowToPattern)
    .filter(pattern => difficulty === undefined || pattern.difficulty === difficulty)
    .filter(pattern => inLanguage === null || inLanguage(pattern))
    .slice(offset, offset + limit);
}

/**
 * Search patterns by text query: title, code or description — and, when a
 * `language` is named, that language's translation, so a query in the language
 * finds a pattern by its own code there.
 */
export async function searchPatterns(
  query: string,
  searchOptions: SearchOptions = {},
  connOptions?: ConnectionOptions
): Promise<Pattern[]> {
  const like = `%${query}%`;
  const inTranslation: Condition =
    searchOptions.language === undefined
      ? { sql: '', params: [] }
      : {
          sql: ' OR id IN (SELECT code_example_id FROM pattern_translations WHERE language = ? AND hyperscript LIKE ?)',
          params: [searchOptions.language, like],
        };
  return queryPatterns(searchOptions, 50, connOptions, {
    sql: `title LIKE ? OR raw_code LIKE ? OR description LIKE ?${inTranslation.sql}`,
    params: [like, like, like, ...inTranslation.params],
  });
}

/**
 * Get all patterns.
 */
export async function getAllPatterns(
  searchOptions: SearchOptions = {},
  connOptions?: ConnectionOptions
): Promise<Pattern[]> {
  return queryPatterns(searchOptions, 1000, connOptions);
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

/**
 * Get behavior definition patterns.
 *
 * Returns installable behavior definitions (behavior Name(params) ... end)
 * that can be compiled and registered with a LokaScript runtime. The
 * 'behavior' category also holds usage examples (`install Draggable`,
 * `tell #modal …`), so filter to actual definitions by source shape.
 */
export async function getBehaviorPatterns(options?: ConnectionOptions): Promise<Pattern[]> {
  const patterns = await getPatternsByCategory('behavior', options);
  return patterns.filter(p => /^\s*behavior\s/.test(p.rawCode));
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
    translatable: row.translatable !== 0,
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
