/**
 * Priority Languages Browser Bundle Entry Point
 *
 * A comprehensive bundle supporting all 11 priority languages:
 * - Western: English (en), Spanish (es), Portuguese (pt), French (fr), German (de)
 * - East Asian: Japanese (ja), Chinese (zh), Korean (ko)
 * - Other: Arabic (ar), Turkish (tr), Indonesian (id)
 *
 * Excludes proof-of-concept languages (Swahili, Quechua).
 * Estimated size: ~280 KB
 *
 * @example
 * ```html
 * <script src="hyperfixi-semantic.priority.global.js"></script>
 * <script>
 *   // Parse Arabic hyperscript
 *   const ast = HyperFixiSemanticPriority.parse('بدّل .active', 'ar');
 * </script>
 * ```
 */

// =============================================================================
// Register Priority Languages
// =============================================================================

// Western languages (SVO/V2)
import './languages/en';
import './languages/es';
import './languages/pt';
import './languages/fr';
import './languages/de';

// East Asian languages
import './languages/ja';
import './languages/zh';
import './languages/ko';

// Other priority languages
import './languages/ar';
import './languages/tr';
import './languages/id';

// =============================================================================
// Version
// =============================================================================

export const VERSION = '1.0.0-priority';

// =============================================================================
// Supported Languages
// =============================================================================

const SUPPORTED_LANGUAGES = [
  'en',
  'es',
  'pt',
  'fr',
  'de', // Western
  'ja',
  'zh',
  'ko', // East Asian
  'ar',
  'tr',
  'id', // Other
] as const;

/**
 * Get all supported languages in this bundle.
 */
export function getSupportedLanguages(): string[] {
  return [...SUPPORTED_LANGUAGES];
}

function validateLanguage(language: string): void {
  if (!SUPPORTED_LANGUAGES.includes(language as any)) {
    throw new Error(
      `Language not supported in this bundle: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`
    );
  }
}

// =============================================================================
// Tokenizers (from registry)
// =============================================================================

export { getTokenizer, isLanguageSupported } from './registry';

import type { LanguageToken } from './types';
import { tokenize as tokenizeInternal } from './tokenizers';

/**
 * Tokenize input and return array of tokens (browser-friendly wrapper).
 */
export function tokenize(input: string, language: string): LanguageToken[] {
  validateLanguage(language);
  const stream = tokenizeInternal(input, language);
  return [...stream.tokens];
}

// Re-export language tokenizers
export { englishTokenizer } from './tokenizers/english';
export { spanishTokenizer } from './tokenizers/spanish';
export { portugueseTokenizer } from './tokenizers/portuguese';
export { frenchTokenizer } from './tokenizers/french';
export { germanTokenizer } from './tokenizers/german';
export { japaneseTokenizer } from './tokenizers/japanese';
export { chineseTokenizer } from './tokenizers/chinese';
export { koreanTokenizer } from './tokenizers/korean';
export { arabicTokenizer } from './tokenizers/arabic';
export { turkishTokenizer } from './tokenizers/turkish';
export { indonesianTokenizer } from './tokenizers/indonesian';

// =============================================================================
// Patterns (from registry - lazy generation)
// =============================================================================

import { getPatternsForLanguage as getPatternsFromRegistry } from './registry';
import type { LanguagePattern, ActionType } from './types';

/**
 * Get all patterns for a language.
 */
export function getPatternsForLanguage(language: string): LanguagePattern[] {
  validateLanguage(language);
  return getPatternsFromRegistry(language);
}

/**
 * Get patterns for a specific language and command.
 */
export function getPatternsForLanguageAndCommand(
  language: string,
  command: ActionType
): LanguagePattern[] {
  return getPatternsForLanguage(language)
    .filter(p => p.command === command)
    .sort((a, b) => b.priority - a.priority);
}

// =============================================================================
// Language Profiles (from registry)
// =============================================================================

export { getProfile, tryGetProfile } from './registry';
export { englishProfile } from './generators/profiles/english';
export { spanishProfile } from './generators/profiles/spanish';
export { portugueseProfile } from './generators/profiles/portuguese';
export { frenchProfile } from './generators/profiles/french';
export { germanProfile } from './generators/profiles/german';
export { japaneseProfile } from './generators/profiles/japanese';
export { chineseProfile } from './generators/profiles/chinese';
export { koreanProfile } from './generators/profiles/korean';
export { arabicProfile } from './generators/profiles/arabic';
export { turkishProfile } from './generators/profiles/turkish';
export { indonesianProfile } from './generators/profiles/indonesian';

// =============================================================================
// Parsing
// =============================================================================

export { parse, canParse } from './parser';
export { parseAny, parseExplicit, isExplicitSyntax } from './explicit';

// =============================================================================
// Rendering
// =============================================================================

export { render, renderExplicit, toExplicit, fromExplicit } from './explicit';

// =============================================================================
// AST Builder
// =============================================================================

export { buildAST, ASTBuilder, getCommandMapper, registerCommandMapper } from './ast-builder';

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
// Type Helpers
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
// Types
// =============================================================================

export type {
  ActionType,
  SemanticRole,
  SemanticValue,
  SemanticNode,
  LanguageToken,
  TokenStream,
} from './types';
