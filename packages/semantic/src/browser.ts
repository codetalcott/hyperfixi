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

export {
  parse,
  parseAny,
  parseExplicit,
  canParse,
  isExplicitSyntax,
} from './explicit';

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
// Tokenizers (for advanced usage)
// =============================================================================

export {
  tokenize,
  getTokenizer,
  isLanguageSupported,
  englishTokenizer,
  japaneseTokenizer,
  arabicTokenizer,
  spanishTokenizer,
} from './tokenizers';

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
