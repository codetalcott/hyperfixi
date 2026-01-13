/**
 * Language Documentation API
 *
 * Provides functions to query hyperscript language documentation:
 * commands, expressions, keywords, features, and special symbols.
 */

import { getDatabase } from '../database/connection';
import type {
  Command,
  Expression,
  ExpressionOperator,
  Keyword,
  Feature,
  SpecialSymbol,
  LanguageElement,
  LanguageElementType,
  LanguageDocsStats,
  ConnectionOptions,
} from '../types';

// =============================================================================
// Database Row Types
// =============================================================================

interface CommandRow {
  id: string;
  name: string;
  description: string | null;
  syntax: string | null;
  purpose: string | null;
  implicit_target: string | null;
  implicit_result_target: string | null;
  is_blocking: number;
  has_body: number;
  created_at: string;
  updated_at: string;
}

interface ExpressionRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  evaluates_to_type: string | null;
  precedence: number | null;
  associativity: string | null;
  created_at: string;
  updated_at: string;
}

interface KeywordRow {
  id: string;
  name: string;
  description: string | null;
  context_of_use: string | null;
  is_optional: number;
  created_at: string;
  updated_at: string;
}

interface FeatureRow {
  id: string;
  name: string;
  description: string | null;
  syntax: string | null;
  trigger: string | null;
  structure_description: string | null;
  scope_impact: string | null;
  created_at: string;
  updated_at: string;
}

interface SpecialSymbolRow {
  id: string;
  name: string;
  symbol: string;
  symbol_type: string;
  description: string | null;
  typical_value: string | null;
  scope_implications: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Row Mappers
// =============================================================================

function mapCommand(row: CommandRow): Command {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    syntax: row.syntax,
    purpose: row.purpose,
    implicitTarget: row.implicit_target,
    implicitResultTarget: row.implicit_result_target,
    isBlocking: row.is_blocking === 1,
    hasBody: row.has_body === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapExpression(row: ExpressionRow, operators: string[] = []): Expression {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    evaluatesToType: row.evaluates_to_type,
    precedence: row.precedence,
    associativity: row.associativity,
    operators,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapKeyword(row: KeywordRow): Keyword {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    contextOfUse: row.context_of_use,
    isOptional: row.is_optional === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapFeature(row: FeatureRow): Feature {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    syntax: row.syntax,
    trigger: row.trigger,
    structureDescription: row.structure_description,
    scopeImpact: row.scope_impact,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapSpecialSymbol(row: SpecialSymbolRow): SpecialSymbol {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    symbolType: row.symbol_type,
    description: row.description,
    typicalValue: row.typical_value,
    scopeImplications: row.scope_implications,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// =============================================================================
// Command Functions
// =============================================================================

/**
 * Get a command by name.
 */
export async function getCommandByName(
  name: string,
  options?: ConnectionOptions
): Promise<Command | null> {
  const db = getDatabase({ ...options, readonly: true });

  const row = db.prepare('SELECT * FROM commands WHERE LOWER(name) = LOWER(?)').get(name) as
    | CommandRow
    | undefined;

  return row ? mapCommand(row) : null;
}

/**
 * Get all commands.
 */
export async function getAllCommands(options?: ConnectionOptions): Promise<Command[]> {
  const db = getDatabase({ ...options, readonly: true });

  const rows = db.prepare('SELECT * FROM commands ORDER BY name').all() as CommandRow[];

  return rows.map(mapCommand);
}

/**
 * Search commands by name or description.
 */
export async function searchCommands(
  query: string,
  options?: ConnectionOptions
): Promise<Command[]> {
  const db = getDatabase({ ...options, readonly: true });

  const pattern = `%${query}%`;
  const rows = db
    .prepare(
      `SELECT * FROM commands
       WHERE LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)
       ORDER BY name`
    )
    .all(pattern, pattern) as CommandRow[];

  return rows.map(mapCommand);
}

// =============================================================================
// Expression Functions
// =============================================================================

/**
 * Get an expression by name.
 */
export async function getExpressionByName(
  name: string,
  options?: ConnectionOptions
): Promise<Expression | null> {
  const db = getDatabase({ ...options, readonly: true });

  const row = db.prepare('SELECT * FROM expressions WHERE LOWER(name) = LOWER(?)').get(name) as
    | ExpressionRow
    | undefined;

  if (!row) return null;

  // Get operators for this expression
  const operators = db
    .prepare('SELECT operator FROM expression_operators WHERE expression_id = ?')
    .all(row.id) as { operator: string }[];

  return mapExpression(
    row,
    operators.map(o => o.operator)
  );
}

/**
 * Get all expressions.
 */
export async function getAllExpressions(options?: ConnectionOptions): Promise<Expression[]> {
  const db = getDatabase({ ...options, readonly: true });

  const rows = db.prepare('SELECT * FROM expressions ORDER BY name').all() as ExpressionRow[];

  // Get all operators in one query
  const allOperators = db
    .prepare('SELECT expression_id, operator FROM expression_operators')
    .all() as { expression_id: string; operator: string }[];

  // Group by expression_id
  const operatorMap = new Map<string, string[]>();
  for (const op of allOperators) {
    const ops = operatorMap.get(op.expression_id) || [];
    ops.push(op.operator);
    operatorMap.set(op.expression_id, ops);
  }

  return rows.map(row => mapExpression(row, operatorMap.get(row.id) || []));
}

/**
 * Get expressions by category.
 */
export async function getExpressionsByCategory(
  category: string,
  options?: ConnectionOptions
): Promise<Expression[]> {
  const db = getDatabase({ ...options, readonly: true });

  const rows = db
    .prepare('SELECT * FROM expressions WHERE LOWER(category) = LOWER(?) ORDER BY name')
    .all(category) as ExpressionRow[];

  // Get operators
  const ids = rows.map(r => r.id);
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  const allOperators = db
    .prepare(
      `SELECT expression_id, operator FROM expression_operators WHERE expression_id IN (${placeholders})`
    )
    .all(...ids) as { expression_id: string; operator: string }[];

  const operatorMap = new Map<string, string[]>();
  for (const op of allOperators) {
    const ops = operatorMap.get(op.expression_id) || [];
    ops.push(op.operator);
    operatorMap.set(op.expression_id, ops);
  }

  return rows.map(row => mapExpression(row, operatorMap.get(row.id) || []));
}

// =============================================================================
// Keyword Functions
// =============================================================================

/**
 * Get a keyword by name.
 */
export async function getKeywordByName(
  name: string,
  options?: ConnectionOptions
): Promise<Keyword | null> {
  const db = getDatabase({ ...options, readonly: true });

  const row = db.prepare('SELECT * FROM keywords WHERE LOWER(name) = LOWER(?)').get(name) as
    | KeywordRow
    | undefined;

  return row ? mapKeyword(row) : null;
}

/**
 * Get all keywords.
 */
export async function getAllKeywords(options?: ConnectionOptions): Promise<Keyword[]> {
  const db = getDatabase({ ...options, readonly: true });

  const rows = db.prepare('SELECT * FROM keywords ORDER BY name').all() as KeywordRow[];

  return rows.map(mapKeyword);
}

// =============================================================================
// Feature Functions
// =============================================================================

/**
 * Get a feature by name.
 */
export async function getFeatureByName(
  name: string,
  options?: ConnectionOptions
): Promise<Feature | null> {
  const db = getDatabase({ ...options, readonly: true });

  const row = db.prepare('SELECT * FROM features WHERE LOWER(name) = LOWER(?)').get(name) as
    | FeatureRow
    | undefined;

  return row ? mapFeature(row) : null;
}

/**
 * Get all features.
 */
export async function getAllFeatures(options?: ConnectionOptions): Promise<Feature[]> {
  const db = getDatabase({ ...options, readonly: true });

  const rows = db.prepare('SELECT * FROM features ORDER BY name').all() as FeatureRow[];

  return rows.map(mapFeature);
}

// =============================================================================
// Special Symbol Functions
// =============================================================================

/**
 * Get a special symbol by name.
 */
export async function getSpecialSymbolByName(
  name: string,
  options?: ConnectionOptions
): Promise<SpecialSymbol | null> {
  const db = getDatabase({ ...options, readonly: true });

  const row = db
    .prepare(
      'SELECT * FROM special_symbols WHERE LOWER(name) = LOWER(?) OR LOWER(symbol) = LOWER(?)'
    )
    .get(name, name) as SpecialSymbolRow | undefined;

  return row ? mapSpecialSymbol(row) : null;
}

/**
 * Get all special symbols.
 */
export async function getAllSpecialSymbols(options?: ConnectionOptions): Promise<SpecialSymbol[]> {
  const db = getDatabase({ ...options, readonly: true });

  const rows = db
    .prepare('SELECT * FROM special_symbols ORDER BY name')
    .all() as SpecialSymbolRow[];

  return rows.map(mapSpecialSymbol);
}

// =============================================================================
// Unified Search
// =============================================================================

/**
 * Search across all language elements.
 */
export async function searchLanguageElements(
  query: string,
  types?: LanguageElementType[],
  options?: ConnectionOptions
): Promise<LanguageElement[]> {
  const results: LanguageElement[] = [];
  const searchTypes = types || ['command', 'expression', 'keyword', 'feature', 'special_symbol'];

  if (searchTypes.includes('command')) {
    const commands = await searchCommands(query, options);
    results.push(...commands.map(c => ({ type: 'command' as const, element: c })));
  }

  if (searchTypes.includes('expression')) {
    const db = getDatabase({ ...options, readonly: true });
    const pattern = `%${query}%`;
    const rows = db
      .prepare(
        `SELECT * FROM expressions
         WHERE LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(category) LIKE LOWER(?)
         ORDER BY name`
      )
      .all(pattern, pattern, pattern) as ExpressionRow[];

    // Get operators
    const ids = rows.map(r => r.id);
    const operatorMap = new Map<string, string[]>();
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const ops = db
        .prepare(
          `SELECT expression_id, operator FROM expression_operators WHERE expression_id IN (${placeholders})`
        )
        .all(...ids) as { expression_id: string; operator: string }[];
      for (const op of ops) {
        const arr = operatorMap.get(op.expression_id) || [];
        arr.push(op.operator);
        operatorMap.set(op.expression_id, arr);
      }
    }

    results.push(
      ...rows.map(row => ({
        type: 'expression' as const,
        element: mapExpression(row, operatorMap.get(row.id) || []),
      }))
    );
  }

  if (searchTypes.includes('keyword')) {
    const db = getDatabase({ ...options, readonly: true });
    const pattern = `%${query}%`;
    const rows = db
      .prepare(
        `SELECT * FROM keywords
         WHERE LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)
         ORDER BY name`
      )
      .all(pattern, pattern) as KeywordRow[];
    results.push(...rows.map(row => ({ type: 'keyword' as const, element: mapKeyword(row) })));
  }

  if (searchTypes.includes('feature')) {
    const db = getDatabase({ ...options, readonly: true });
    const pattern = `%${query}%`;
    const rows = db
      .prepare(
        `SELECT * FROM features
         WHERE LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)
         ORDER BY name`
      )
      .all(pattern, pattern) as FeatureRow[];
    results.push(...rows.map(row => ({ type: 'feature' as const, element: mapFeature(row) })));
  }

  if (searchTypes.includes('special_symbol')) {
    const db = getDatabase({ ...options, readonly: true });
    const pattern = `%${query}%`;
    const rows = db
      .prepare(
        `SELECT * FROM special_symbols
         WHERE LOWER(name) LIKE LOWER(?) OR LOWER(symbol) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)
         ORDER BY name`
      )
      .all(pattern, pattern, pattern) as SpecialSymbolRow[];
    results.push(
      ...rows.map(row => ({ type: 'special_symbol' as const, element: mapSpecialSymbol(row) }))
    );
  }

  return results;
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get language documentation statistics.
 */
export async function getLanguageDocsStats(
  options?: ConnectionOptions
): Promise<LanguageDocsStats> {
  const db = getDatabase({ ...options, readonly: true });

  const getCount = (table: string): number => {
    try {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as {
        count: number;
      };
      return result.count;
    } catch {
      return 0;
    }
  };

  return {
    commands: getCount('commands'),
    expressions: getCount('expressions'),
    keywords: getCount('keywords'),
    features: getCount('features'),
    specialSymbols: getCount('special_symbols'),
    expressionOperators: getCount('expression_operators'),
  };
}
