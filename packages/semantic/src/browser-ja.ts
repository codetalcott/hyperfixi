/**
 * Japanese Browser Bundle Entry Point
 *
 * Minimal single-language bundle.
 * Estimated size: ~73 KB (~26 KB gzip)
 *
 * @example
 * ```html
 * <script src="hyperfixi-semantic.ja.global.js"></script>
 * <script>
 *   const ast = HyperFixiSemanticJa.parse('toggle .active', 'ja');
 * </script>
 * ```
 */

// =============================================================================
// Register Languages: ja
// =============================================================================

import './languages/ja';

// =============================================================================
// Version
// =============================================================================

export const VERSION = '1.0.0-ja';

// =============================================================================
// Supported Languages
// =============================================================================

const SUPPORTED_LANGUAGES = ['ja'] as const;

/**
 * Get all supported languages in this bundle.
 */
export function getSupportedLanguages(): string[] {
  return [...SUPPORTED_LANGUAGES];
}

/**
 * Validate that a language is supported by this bundle.
 */
function validateLanguage(language: string): void {
  if (language !== 'ja') {
    throw new Error(
      `Language not supported in this bundle: ${language}. ` +
      `Supported: ja`
    );
  }
}

// =============================================================================
// Tokenizers (from registry)
// =============================================================================

export {
  getTokenizer,
  isLanguageSupported,
} from './registry';

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

// Re-export tokenizers
export { japaneseTokenizer } from './tokenizers/japanese';

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
 * Get patterns for a language and specific command.
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
export { japaneseProfile } from './generators/language-profiles';

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
