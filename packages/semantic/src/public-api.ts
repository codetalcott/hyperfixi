/**
 * Public API Surface
 *
 * This file defines the stable public API for @hyperfixi/semantic.
 * All exports here are considered stable and follow semver guarantees:
 * - Major version: Breaking changes to public API
 * - Minor version: New features, backward compatible
 * - Patch version: Bug fixes only
 *
 * Internal modules (tokenizers, generators, patterns) may change without notice.
 *
 * @module @hyperfixi/semantic
 * @version 1.0.0
 */

// =============================================================================
// Core Parsing Functions
// =============================================================================

export {
  /**
   * Parse hyperscript code from any supported language into a SemanticNode.
   * Throws if parsing fails.
   *
   * @param input - The hyperscript code to parse
   * @param language - ISO 639-1 language code (e.g., 'en', 'ja', 'ko')
   * @returns SemanticNode representing the parsed command
   * @throws Error if parsing fails
   *
   * @example
   * const node = parse('toggle .active', 'en');
   * const jaNode = parse('.active を トグル', 'ja');
   */
  parse,

  /**
   * Check if input can be successfully parsed.
   * Returns false instead of throwing on parse failure.
   *
   * @param input - The hyperscript code to check
   * @param language - ISO 639-1 language code
   * @returns true if parseable, false otherwise
   */
  canParse,
} from './parser/semantic-parser';

// =============================================================================
// AST Building
// =============================================================================

export {
  /**
   * Convert a SemanticNode to a runtime-compatible AST.
   * Use this to get AST for execution by the hyperfixi runtime.
   *
   * @param node - The SemanticNode from parse()
   * @returns AST node compatible with hyperfixi runtime
   *
   * @example
   * const semanticNode = parse('toggle .active', 'en');
   * const ast = buildAST(semanticNode);
   * await runtime.execute(ast, context);
   */
  buildAST,

  /**
   * The ASTBuilder class for advanced use cases.
   * Usually you should use buildAST() instead.
   */
  ASTBuilder,
} from './ast-builder';

// =============================================================================
// Translation
// =============================================================================

export {
  /**
   * Translate hyperscript between languages.
   *
   * @param input - Source hyperscript code
   * @param sourceLang - Source language code
   * @param targetLang - Target language code
   * @returns Translated hyperscript in target language
   *
   * @example
   * const japanese = translate('toggle .active', 'en', 'ja');
   * // Returns: '.active を トグル'
   */
  translate,

  /**
   * Get translations for all supported languages.
   *
   * @param input - Source hyperscript code
   * @param sourceLang - Source language code
   * @returns Object mapping language codes to translations
   *
   * @example
   * const all = getAllTranslations('toggle .active', 'en');
   * // Returns: { en: 'toggle .active', ja: '.active を トグル', ... }
   */
  getAllTranslations,
} from './parser/semantic-parser';

// =============================================================================
// Semantic Analyzer
// =============================================================================

export {
  /**
   * Create a semantic analyzer for parsing with confidence scores.
   * Use this when you need to check parse confidence before execution.
   *
   * @returns SemanticAnalyzer instance
   *
   * @example
   * const analyzer = createSemanticAnalyzer();
   * const result = analyzer.analyze('toggle .active', 'en');
   * if (result.confidence >= 0.5) {
   *   const ast = buildAST(result.node);
   * }
   */
  createSemanticAnalyzer,
} from './parser/semantic-parser';

// =============================================================================
// Language Information
// =============================================================================

export {
  /**
   * Get list of supported language codes.
   *
   * @returns Array of ISO 639-1 language codes
   *
   * @example
   * const langs = getSupportedLanguages();
   * // Returns: ['en', 'ja', 'ar', 'es', 'ko', 'zh', 'tr', 'pt', 'fr', 'de', 'id', 'qu', 'sw']
   */
  getSupportedLanguages,
} from './parser/semantic-parser';

// =============================================================================
// Rendering
// =============================================================================

export {
  /**
   * Render a SemanticNode back to hyperscript in a specific language.
   *
   * @param node - The SemanticNode to render
   * @param language - Target language code
   * @returns Hyperscript string in target language
   */
  render,

  /**
   * Render a SemanticNode in explicit syntax format.
   * Explicit syntax is a language-agnostic intermediate representation.
   *
   * @param node - The SemanticNode to render
   * @returns Explicit syntax string
   *
   * @example
   * const explicit = renderExplicit(node);
   * // Returns: '[toggle patient:.active destination:#button]'
   */
  renderExplicit,
} from './parser/semantic-parser';

// =============================================================================
// Tokenization (Advanced)
// =============================================================================

export {
  /**
   * Tokenize input for a specific language.
   * This is a lower-level function for advanced use cases.
   *
   * @param input - The hyperscript code to tokenize
   * @param language - ISO 639-1 language code
   * @returns Tokenization result with tokens array
   */
  tokenize,
} from './parser/semantic-parser';

// =============================================================================
// Explicit Syntax (Advanced)
// =============================================================================

export {
  /**
   * Parse explicit syntax format.
   * Explicit syntax is language-agnostic and unambiguous.
   *
   * @param input - Explicit syntax string
   * @returns SemanticNode
   */
  parseExplicit,

  /**
   * Convert natural language to explicit syntax.
   */
  toExplicit,

  /**
   * Convert explicit syntax to natural language.
   */
  fromExplicit,

  /**
   * Round-trip conversion for testing.
   */
  roundTrip,
} from './parser/semantic-parser';

// =============================================================================
// Types
// =============================================================================

export type {
  // Core semantic types
  ActionType,
  SemanticNode,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  ConditionalSemanticNode,
  CompoundSemanticNode,
  LoopSemanticNode,
  LoopVariant,

  // Value types
  SemanticValue,
  LiteralValue,
  SelectorValue,
  ReferenceValue,
  PropertyPathValue,
  ExpressionValue,

  // Metadata
  SemanticMetadata,
  SourcePosition,
  EventModifiers,
} from './types';

// =============================================================================
// Semantic Role Type
// =============================================================================

export type { SemanticRole } from './types';
