/**
 * Browser Bundle Entry Point
 *
 * This file exports the public API for browser usage via the
 * HyperFixiSemantic global object.
 *
 * @example
 * ```html
 * <script src="hyperfixi-semantic.browser.js"></script>
 * <script>
 *   const result = HyperFixiSemantic.parse('toggle .active on #button', 'en');
 *   const japanese = HyperFixiSemantic.translate(
 *     'toggle .active on #button',
 *     'en',
 *     'ja'
 *   );
 * </script>
 * ```
 */

// =============================================================================
// Core API
// =============================================================================

export {
  // Version
  VERSION,
  // Supported languages
  getSupportedLanguages,
} from './index';

// =============================================================================
// Parsing
// =============================================================================

// Core parsing functions from the parser module
export { parse, canParse } from './parser';

// Explicit mode parsing and utilities
export { parseAny, parseExplicit, isExplicitSyntax } from './explicit';

// =============================================================================
// Translation
// =============================================================================

export {
  translate,
  getAllTranslations,
  roundTrip,
  validateTranslation,
} from './explicit';

// =============================================================================
// Rendering
// =============================================================================

export {
  render,
  renderExplicit,
  toExplicit,
  fromExplicit,
} from './explicit';

// =============================================================================
// Semantic Analyzer (for core parser integration)
// =============================================================================

export {
  createSemanticAnalyzer,
  SemanticAnalyzerImpl,
  shouldUseSemanticResult,
  DEFAULT_CONFIDENCE_THRESHOLD,
  HIGH_CONFIDENCE_THRESHOLD,
} from './core-bridge';

export type { SemanticAnalyzer, SemanticAnalysisResult } from './core-bridge';

// =============================================================================
// AST Builder (direct semantic-to-AST conversion)
// =============================================================================

export { buildAST, ASTBuilder, getCommandMapper, registerCommandMapper } from './ast-builder';

// =============================================================================
// Tokenizers (for advanced usage)
// =============================================================================

// Import from tokenizers module
import {
  tokenize as tokenizeInternal,
  getTokenizer,
  isLanguageSupported,
  englishTokenizer,
  japaneseTokenizer,
  koreanTokenizer,
  arabicTokenizer,
  spanishTokenizer,
  turkishTokenizer,
  chineseTokenizer,
  portugueseTokenizer,
  frenchTokenizer,
  germanTokenizer,
  indonesianTokenizer,
  quechuaTokenizer,
  swahiliTokenizer,
} from './tokenizers';

import type { LanguageToken } from './types';

/**
 * Tokenize input and return array of tokens (browser-friendly wrapper).
 *
 * @param input The input string to tokenize
 * @param language The language code
 * @returns Array of language tokens
 */
export function tokenize(input: string, language: string): LanguageToken[] {
  const stream = tokenizeInternal(input, language);
  return [...stream.tokens];
}

// Re-export other tokenizer utilities
export {
  getTokenizer,
  isLanguageSupported,
  // All 13 language tokenizers
  englishTokenizer,
  japaneseTokenizer,
  koreanTokenizer,
  arabicTokenizer,
  spanishTokenizer,
  turkishTokenizer,
  chineseTokenizer,
  portugueseTokenizer,
  frenchTokenizer,
  germanTokenizer,
  indonesianTokenizer,
  quechuaTokenizer,
  swahiliTokenizer,
};

// =============================================================================
// Type Helpers (for constructing semantic nodes)
// =============================================================================

export {
  createSelector,
  createLiteral,
  createReference,
  createPropertyPath,
  createCommandNode,
  createEventHandler,
} from './types';

// =============================================================================
// Types (re-exported for TypeScript users)
// =============================================================================

export type {
  ActionType,
  SemanticRole,
  SemanticValue,
  SemanticNode,
  LanguageToken,
  TokenStream,
} from './types';
