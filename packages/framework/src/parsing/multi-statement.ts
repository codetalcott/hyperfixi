/**
 * Multi-statement parser for domain DSLs.
 *
 * Provides generic mechanics for parsing multi-line/multi-statement DSL input:
 * - Statement splitting (line-based or delimiter-based)
 * - Keyword classification (SVO start / SOV end detection)
 * - Block accumulation (grouping lines into blocks)
 * - Error collection with line numbers
 *
 * Domains provide the semantics (what keywords mean, preprocessing, hierarchy).
 * The framework provides the mechanics.
 */

import type { SemanticNode } from '../core/types';
import type { MultilingualDSL } from '../api/create-dsl';

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Word order affects keyword detection position.
 */
export type WordOrderHint = 'SVO' | 'SOV' | 'VSO';

/**
 * How to split input into individual statements.
 */
export interface SplitConfig {
  /**
   * Split mode:
   * - 'line': split on newlines (for indentation-based DSLs)
   * - 'delimiter': split on language-specific delimiters
   */
  readonly mode: 'line' | 'delimiter';

  /**
   * Language-specific delimiter patterns (used when mode='delimiter').
   * Key is language code, value is regex pattern.
   * Example: { en: /,\s*|\n\s*‍/, ja: /、|。|\n\s*‍/ }
   */
  readonly delimiters?: Readonly<Record<string, RegExp>>;

  /**
   * Default delimiter when language not in delimiters map.
   */
  readonly defaultDelimiter?: RegExp;

  /**
   * Whether to trim each statement after splitting.
   * Default: true
   */
  readonly trim?: boolean;

  /**
   * Comment prefixes to strip. Lines starting with these are skipped.
   * Default: ['--', '//']
   */
  readonly commentPrefixes?: readonly string[];
}

/**
 * A keyword category with its translations.
 * Maps language code to array of keyword variants.
 */
export type KeywordMap = Readonly<Record<string, readonly string[]>>;

/**
 * Configuration for keyword classification.
 */
export interface KeywordConfig {
  /**
   * Named keyword categories with their per-language translations.
   * Example: { test: { en: ['test'], ja: ['テスト'], es: ['prueba'] } }
   */
  readonly categories: Readonly<Record<string, KeywordMap>>;

  /**
   * Word order hint per language (affects where keywords are detected).
   * Default for unlisted languages: 'SVO'
   */
  readonly wordOrders?: Readonly<Record<string, WordOrderHint>>;
}

/**
 * Configuration for continuation resolution (e.g., BDD's "and" keyword).
 */
export interface ContinuationConfig {
  /**
   * The keyword(s) that signal continuation, per language.
   * Example: { en: ['and'], es: ['y'], ja: ['かつ'], ar: ['و'] }
   */
  readonly keywords: KeywordMap;

  /**
   * How to resolve continuation: re-prefix with previous step's keyword.
   * The function receives (content after 'and', previous step's category, language)
   * and returns the re-prefixed string for re-parsing.
   *
   * Default: `(content, prevCategory, language, categoryKeywords) =>
   *   categoryKeywords[prevCategory]?.[language]?.[0] + ' ' + content`
   */
  readonly resolve?: (
    content: string,
    prevCategory: string,
    language: string,
    categoryKeywords: Record<string, KeywordMap>
  ) => string;
}

/**
 * A parsed statement with its line context.
 */
export interface ParsedStatement {
  /** The parsed semantic node */
  readonly node: SemanticNode;
  /** Original source line/text */
  readonly source: string;
  /** Line number (1-based) in original input */
  readonly line: number;
  /** Detected keyword category (e.g., 'test', 'given', 'when') */
  readonly category?: string;
  /** Indentation level (number of leading spaces, 0-based) */
  readonly indent: number;
}

/**
 * A parse error with location information.
 */
export interface StatementError {
  /** Error message */
  readonly message: string;
  /** Line number (1-based) in original input */
  readonly line: number;
  /** Original source line/text */
  readonly source: string;
  /** Error code for programmatic handling */
  readonly code?: 'parse-error' | 'unexpected-line' | 'continuation-error';
}

/**
 * Result of multi-statement parsing.
 */
export interface MultiStatementResult {
  /** Successfully parsed statements */
  readonly statements: readonly ParsedStatement[];
  /** Errors encountered during parsing */
  readonly errors: readonly StatementError[];
}

/**
 * Preprocessor function called before each statement is parsed.
 * Returns the modified string to parse, or null to skip the line.
 */
export type StatementPreprocessor = (
  line: string,
  category: string | undefined,
  language: string,
  context: PreprocessorContext
) => string | null;

/**
 * Context available to preprocessors.
 */
export interface PreprocessorContext {
  /** The previous parsed statement, if any */
  readonly previous?: ParsedStatement;
  /** Line number (1-based) */
  readonly lineNumber: number;
  /** Indentation level */
  readonly indent: number;
}

/**
 * Full configuration for multi-statement parser.
 */
export interface MultiStatementConfig {
  /** How to split input into statements */
  readonly split: SplitConfig;
  /** Keyword classification (optional — if omitted, no category detection) */
  readonly keywords?: KeywordConfig;
  /** Continuation resolution (optional — e.g., BDD 'and') */
  readonly continuation?: ContinuationConfig;
  /** Statement preprocessor (optional — for article stripping, expect-prepending, etc.) */
  readonly preprocessor?: StatementPreprocessor;
}

// =============================================================================
// Multi-Statement Parser
// =============================================================================

/**
 * A reusable multi-statement parser.
 * Created via `createMultiStatementParser()`.
 */
export interface MultiStatementParser {
  /**
   * Parse multi-statement input into an array of parsed statements.
   */
  parse(input: string, language: string): MultiStatementResult;
}

/**
 * Create a multi-statement parser that wraps a `MultilingualDSL` instance.
 *
 * The parser handles splitting, keyword detection, continuation resolution,
 * preprocessing, and error collection. It delegates single-statement parsing
 * to the provided DSL's `parse()` method.
 *
 * @example
 * ```typescript
 * const parser = createMultiStatementParser(myDSL, {
 *   split: { mode: 'line', commentPrefixes: ['--', '//'] },
 *   keywords: {
 *     categories: {
 *       given: { en: ['given'], ja: ['前提'], es: ['dado'] },
 *       when: { en: ['when'], ja: ['もし'], es: ['cuando'] },
 *       then: { en: ['then'], ja: ['ならば'], es: ['entonces'] },
 *     },
 *     wordOrders: { ja: 'SOV', ar: 'VSO' },
 *   },
 *   continuation: {
 *     keywords: { en: ['and'], es: ['y'], ja: ['かつ'] },
 *   },
 * });
 *
 * const result = parser.parse(`
 *   given #login is visible
 *   when click on #submit
 *   then #dashboard appears
 * `, 'en');
 * ```
 */
export function createMultiStatementParser(
  dsl: MultilingualDSL,
  config: MultiStatementConfig
): MultiStatementParser {
  return new MultiStatementParserImpl(dsl, config);
}

// =============================================================================
// Implementation
// =============================================================================

class MultiStatementParserImpl implements MultiStatementParser {
  constructor(
    private readonly dsl: MultilingualDSL,
    private readonly config: MultiStatementConfig
  ) {}

  parse(input: string, language: string): MultiStatementResult {
    const rawStatements = this.splitStatements(input, language);
    const statements: ParsedStatement[] = [];
    const errors: StatementError[] = [];
    let previous: ParsedStatement | undefined;

    for (const raw of rawStatements) {
      // Detect keyword category
      const category = this.classifyLine(raw.text, language);

      // Handle continuation (e.g., 'and')
      let textToParse = raw.text;
      if (this.config.continuation) {
        const resolved = this.resolveContinuation(raw.text, language, previous?.category);
        if (resolved !== null) {
          textToParse = resolved;
        }
      }

      // Run preprocessor
      if (this.config.preprocessor) {
        const processed = this.config.preprocessor(textToParse, category, language, {
          ...(previous != null && { previous }),
          lineNumber: raw.line,
          indent: raw.indent,
        });
        if (processed === null) continue; // skip line
        textToParse = processed;
      }

      // Parse with DSL
      try {
        const node = this.dsl.parse(textToParse, language);
        const stmt: ParsedStatement = {
          node,
          source: raw.text,
          line: raw.line,
          ...(category != null && { category }),
          indent: raw.indent,
        };
        statements.push(stmt);
        previous = stmt;
      } catch (err) {
        errors.push({
          message: err instanceof Error ? err.message : String(err),
          line: raw.line,
          source: raw.text,
          code: 'parse-error',
        });
      }
    }

    return { statements, errors };
  }

  /**
   * Split input into raw statement lines with metadata.
   */
  private splitStatements(
    input: string,
    language: string
  ): Array<{ text: string; line: number; indent: number }> {
    const { mode, trim = true, commentPrefixes = ['--', '//'] } = this.config.split;

    if (mode === 'delimiter') {
      return this.splitByDelimiter(input, language, trim, commentPrefixes);
    }

    // Line-based splitting
    const lines = input.split('\n');
    const result: Array<{ text: string; line: number; indent: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const indent = raw.length - raw.trimStart().length;
      const text = trim ? raw.trim() : raw;

      // Skip empty lines
      if (!text) continue;

      // Skip comments
      if (commentPrefixes.some(p => text.startsWith(p))) continue;

      result.push({ text, line: i + 1, indent });
    }

    return result;
  }

  /**
   * Split by language-specific delimiters.
   */
  private splitByDelimiter(
    input: string,
    language: string,
    trim: boolean,
    commentPrefixes: readonly string[]
  ): Array<{ text: string; line: number; indent: number }> {
    const delimiter =
      this.config.split.delimiters?.[language] ??
      this.config.split.defaultDelimiter ??
      /,\s*|\n\s*/;

    const parts = input.split(delimiter);
    const result: Array<{ text: string; line: number; indent: number }> = [];

    for (let i = 0; i < parts.length; i++) {
      const raw = parts[i];
      const text = trim ? raw.trim() : raw;

      if (!text) continue;
      if (commentPrefixes.some(p => text.startsWith(p))) continue;

      result.push({ text, line: i + 1, indent: 0 });
    }

    return result;
  }

  /**
   * Classify a line by its keyword category.
   * Returns the category name or undefined if no match.
   */
  private classifyLine(line: string, language: string): string | undefined {
    if (!this.config.keywords) return undefined;

    const lower = line.toLowerCase();
    const wordOrder = this.config.keywords.wordOrders?.[language] ?? 'SVO';

    for (const [category, keywordMap] of Object.entries(this.config.keywords.categories)) {
      const keywords = keywordMap[language] ?? keywordMap['en'] ?? [];
      for (const kw of keywords) {
        const kwLower = kw.toLowerCase();
        if (wordOrder === 'SOV') {
          // SOV: check end of line first, then start
          if (lower.endsWith(kwLower) || lower.startsWith(kwLower)) {
            return category;
          }
        } else {
          // SVO/VSO: check start of line
          if (lower.startsWith(kwLower)) {
            return category;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Resolve continuation keywords (e.g., 'and' → re-prefix with previous step type).
   * Returns the resolved string, or null if not a continuation.
   */
  private resolveContinuation(
    text: string,
    language: string,
    prevCategory: string | undefined
  ): string | null {
    if (!this.config.continuation || !prevCategory) return null;

    const contKeywords =
      this.config.continuation.keywords[language] ?? this.config.continuation.keywords['en'] ?? [];

    const lower = text.toLowerCase();
    for (const kw of contKeywords) {
      const kwLower = kw.toLowerCase();
      if (lower.startsWith(kwLower)) {
        const content = text.slice(kw.length).trim();
        if (!content) return null;

        if (this.config.continuation.resolve) {
          return this.config.continuation.resolve(
            content,
            prevCategory,
            language,
            this.config.keywords?.categories ?? {}
          );
        }

        // Default: prepend previous category's keyword
        const prevKeywords =
          this.config.keywords?.categories[prevCategory]?.[language] ??
          this.config.keywords?.categories[prevCategory]?.['en'];
        if (prevKeywords?.[0]) {
          return prevKeywords[0] + ' ' + content;
        }

        return null;
      }
    }

    return null;
  }
}

// =============================================================================
// Block Accumulator (for grouped/nested structures)
// =============================================================================

/**
 * A block of accumulated statements, grouped by a block-opening keyword.
 */
export interface StatementBlock<TMeta = unknown> {
  /** Block type (e.g., 'test', 'feature', 'scenario') */
  readonly type: string;
  /** Block name, if any (e.g., test name from quotes) */
  readonly name?: string;
  /** Statements within this block */
  readonly statements: readonly ParsedStatement[];
  /** Child blocks (for nested structures) */
  readonly children: readonly StatementBlock<TMeta>[];
  /** Starting line number */
  readonly line: number;
  /** Indentation level of the block opener */
  readonly indent: number;
  /** Domain-specific metadata */
  readonly meta?: TMeta;
}

/**
 * Configuration for block accumulation.
 */
export interface BlockConfig {
  /**
   * Block-opening keyword categories.
   * Statements classified in these categories start new blocks.
   */
  readonly blockTypes: readonly string[];

  /**
   * How to determine block nesting:
   * - 'indent': indentation-based (deeper indent = child block)
   * - 'flat': all blocks at same level (no nesting)
   */
  readonly nesting: 'indent' | 'flat';

  /**
   * Extract block name from statement text.
   * Default: extracts quoted string after keyword (e.g., test "Login" → "Login")
   */
  readonly extractName?: (text: string, category: string) => string | undefined;
}

/**
 * Result of block accumulation.
 */
export interface BlockResult<TMeta = unknown> {
  /** Top-level blocks */
  readonly blocks: readonly StatementBlock<TMeta>[];
  /** Statements not inside any block */
  readonly orphans: readonly ParsedStatement[];
}

/**
 * Accumulate parsed statements into blocks based on keyword categories.
 *
 * This groups statements into hierarchical blocks based on block-opening keywords
 * and indentation levels. Useful for test/feature/scenario structures.
 *
 * @example
 * ```typescript
 * const result = accumulateBlocks(statements, {
 *   blockTypes: ['test', 'feature', 'setup'],
 *   nesting: 'indent',
 *   extractName: (text, category) => {
 *     const match = text.match(/"([^"]+)"/);
 *     return match?.[1];
 *   },
 * });
 * ```
 */
export function accumulateBlocks<TMeta = unknown>(
  statements: readonly ParsedStatement[],
  config: BlockConfig
): BlockResult<TMeta> {
  if (config.nesting === 'flat') {
    return accumulateFlat(statements, config);
  }
  return accumulateIndented(statements, config);
}

function accumulateFlat<TMeta>(
  statements: readonly ParsedStatement[],
  config: BlockConfig
): BlockResult<TMeta> {
  const blocks: StatementBlock<TMeta>[] = [];
  const orphans: ParsedStatement[] = [];
  let current: {
    type: string;
    name?: string;
    stmts: ParsedStatement[];
    line: number;
    indent: number;
  } | null = null;

  const flush = () => {
    if (current) {
      blocks.push({
        type: current.type,
        ...(current.name != null && { name: current.name }),
        statements: current.stmts,
        children: [],
        line: current.line,
        indent: current.indent,
      });
      current = null;
    }
  };

  for (const stmt of statements) {
    if (stmt.category && config.blockTypes.includes(stmt.category)) {
      flush();
      const name = config.extractName?.(stmt.source, stmt.category);
      current = {
        type: stmt.category,
        ...(name != null && { name }),
        stmts: [stmt],
        line: stmt.line,
        indent: stmt.indent,
      };
    } else if (current) {
      current.stmts.push(stmt);
    } else {
      orphans.push(stmt);
    }
  }

  flush();
  return { blocks, orphans };
}

function accumulateIndented<TMeta>(
  statements: readonly ParsedStatement[],
  config: BlockConfig
): BlockResult<TMeta> {
  const rootBlocks: StatementBlock<TMeta>[] = [];
  const orphans: ParsedStatement[] = [];

  // Stack of open blocks with their indent level
  const stack: Array<{
    type: string;
    name?: string;
    stmts: ParsedStatement[];
    children: StatementBlock<TMeta>[];
    line: number;
    indent: number;
  }> = [];

  const flushTo = (targetIndent: number) => {
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top.indent >= targetIndent) {
        stack.pop();
        const block: StatementBlock<TMeta> = {
          type: top.type,
          ...(top.name != null && { name: top.name }),
          statements: top.stmts,
          children: top.children,
          line: top.line,
          indent: top.indent,
        };
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(block);
        } else {
          rootBlocks.push(block);
        }
      } else {
        break;
      }
    }
  };

  for (const stmt of statements) {
    if (stmt.category && config.blockTypes.includes(stmt.category)) {
      // Flush blocks at same or deeper indent
      flushTo(stmt.indent);
      const name = config.extractName?.(stmt.source, stmt.category);
      stack.push({
        type: stmt.category,
        ...(name != null && { name }),
        stmts: [stmt],
        children: [],
        line: stmt.line,
        indent: stmt.indent,
      });
    } else if (stack.length > 0) {
      stack[stack.length - 1].stmts.push(stmt);
    } else {
      orphans.push(stmt);
    }
  }

  // Flush remaining
  flushTo(-1);

  return { blocks: rootBlocks, orphans };
}
