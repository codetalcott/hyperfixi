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
// Register All Languages (Full Browser Bundle)
// =============================================================================

// Import patterns/index to register the pattern generator.
// This enables non-English languages to generate patterns on-demand
// via the patternGenerator fallback in the registry.
import './patterns/index';

// Import each language module directly to ensure side-effect registrations run.
// Each module calls registerLanguage() and registerPatterns() at load time.
// For minimal bundles, use language-specific entry points (e.g., browser-en.ts).

// Priority languages (13 original)
import { englishProfile as _en } from './languages/en';
import { spanishProfile as _es } from './languages/es';
import { japaneseProfile as _ja } from './languages/ja';
import { arabicProfile as _ar } from './languages/ar';
import { koreanProfile as _ko } from './languages/ko';
import { chineseProfile as _zh } from './languages/zh';
import { turkishProfile as _tr } from './languages/tr';
import { portugueseProfile as _pt } from './languages/pt';
import { frenchProfile as _fr } from './languages/fr';
import { germanProfile as _de } from './languages/de';
import { indonesianProfile as _id } from './languages/id';
import { quechuaProfile as _qu } from './languages/qu';
import { swahiliProfile as _sw } from './languages/sw';

// Additional languages (10 more for full bundle)
import { bengaliProfile as _bn } from './languages/bn';
import { hindiProfile as _hi } from './languages/hi';
import { italianProfile as _it } from './languages/it';
import { malayProfile as _ms } from './languages/ms';
import { polishProfile as _pl } from './languages/pl';
import { russianProfile as _ru } from './languages/ru';
import { tagalogProfile as _tl } from './languages/tl';
import { thaiProfile as _th } from './languages/th';
import { ukrainianProfile as _uk } from './languages/uk';
import { vietnameseProfile as _vi } from './languages/vi';

// Export the profiles to force bundler to keep them (prevents tree-shaking)
// Full bundle: 23 languages
export const registeredLanguageProfiles = {
  // Priority languages
  en: _en,
  es: _es,
  ja: _ja,
  ar: _ar,
  ko: _ko,
  zh: _zh,
  tr: _tr,
  pt: _pt,
  fr: _fr,
  de: _de,
  id: _id,
  qu: _qu,
  sw: _sw,
  // Additional languages
  bn: _bn,
  hi: _hi,
  it: _it,
  ms: _ms,
  pl: _pl,
  ru: _ru,
  tl: _tl,
  th: _th,
  uk: _uk,
  vi: _vi,
};

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

export { translate, getAllTranslations, roundTrip, validateTranslation } from './explicit';

// =============================================================================
// Rendering
// =============================================================================

export { render, renderExplicit, toExplicit, fromExplicit } from './explicit';

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
  // Priority language tokenizers (13)
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
  // Additional language tokenizers (10)
  bengaliTokenizer,
  hindiTokenizer,
  italianTokenizer,
  malayTokenizer,
  polishTokenizer,
  russianTokenizer,
  tagalogTokenizer,
  thaiTokenizer,
  ukrainianTokenizer,
  vietnameseTokenizer,
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
  // All 23 language tokenizers
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
  bengaliTokenizer,
  hindiTokenizer,
  italianTokenizer,
  malayTokenizer,
  polishTokenizer,
  russianTokenizer,
  tagalogTokenizer,
  thaiTokenizer,
  ukrainianTokenizer,
  vietnameseTokenizer,
};

// =============================================================================
// Registry (for language profile and pattern access)
// =============================================================================

export {
  getProfile,
  tryGetProfile,
  getRegisteredLanguages,
  getPatternsForLanguage,
  getPatternsForLanguageAndCommand,
} from './registry';

export type {
  LanguageProfile,
  KeywordTranslation,
  RoleMarker,
  PossessiveConfig,
  VerbConfig,
} from './registry';

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
