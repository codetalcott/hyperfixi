/**
 * East Asian Languages Browser Bundle Entry Point
 *
 * A regional bundle supporting CJK languages:
 * - Japanese (ja) - SOV, particles, no spaces
 * - Chinese (zh) - SVO, isolating, no spaces
 * - Korean (ko) - SOV, particles, agglutinative
 *
 * Complex morphology, distinct writing systems.
 * Estimated size: ~130 KB
 *
 * @example
 * ```html
 * <script src="hyperfixi-semantic.east-asian.global.js"></script>
 * <script>
 *   // Parse Japanese hyperscript
 *   const ast = LokaScriptSemanticEastAsian.parse('.active を 切り替え', 'ja');
 * </script>
 * ```
 */

// =============================================================================
// Register East Asian Languages
// =============================================================================

import './languages/ja';
import './languages/zh';
import './languages/ko';

// =============================================================================
// Version
// =============================================================================

export const VERSION = '1.0.0-east-asian';

// =============================================================================
// Supported Languages
// =============================================================================

const SUPPORTED_LANGUAGES = ['ja', 'zh', 'ko'] as const;

/**
 * Get all supported languages in this bundle.
 */
export function getSupportedLanguages(): string[] {
  return [...SUPPORTED_LANGUAGES];
}

function validateLanguage(language: string): void {
  if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(language)) {
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
export { japaneseTokenizer } from './tokenizers/japanese';
export { chineseTokenizer } from './tokenizers/chinese';
export { koreanTokenizer } from './tokenizers/korean';

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
export { japaneseProfile } from './generators/profiles/japanese';
export { chineseProfile } from './generators/profiles/chinese';
export { koreanProfile } from './generators/profiles/korean';

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
