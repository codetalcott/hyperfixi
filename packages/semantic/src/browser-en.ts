/**
 * English-Only Browser Bundle Entry Point
 *
 * A minimal bundle supporting only English.
 * Uses the registry-based architecture for the smallest possible bundle.
 *
 * @example
 * ```html
 * <script src="hyperfixi-semantic.en.global.js"></script>
 * <script>
 *   // Parse English hyperscript
 *   const ast = HyperFixiSemanticEn.parse('toggle .active on #button', 'en');
 * </script>
 * ```
 */

// =============================================================================
// Register Only English
// =============================================================================

// Import to register only English
import './languages/en';

// =============================================================================
// Version
// =============================================================================

export const VERSION = '1.0.0-en';

// =============================================================================
// Supported Languages
// =============================================================================

/**
 * Get all supported languages in this bundle.
 */
export function getSupportedLanguages(): string[] {
  return ['en'];
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
  if (language !== 'en') {
    throw new Error(`Language not supported in this bundle: ${language}. Supported: en`);
  }
  const stream = tokenizeInternal(input, language);
  return [...stream.tokens];
}

// Re-export English tokenizer
export { englishTokenizer } from './tokenizers/english';

// =============================================================================
// Patterns (from registry - lazy generation)
// =============================================================================

import { getPatternsForLanguage as getPatternsFromRegistry } from './registry';
import type { LanguagePattern, ActionType } from './types';

/**
 * Get all patterns for English.
 */
export function getPatternsForLanguage(language: string): LanguagePattern[] {
  if (language !== 'en') {
    throw new Error(`Language not supported in this bundle: ${language}. Supported: en`);
  }
  return getPatternsFromRegistry(language);
}

/**
 * Get patterns for English and a specific command.
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
// Language Profile (from registry)
// =============================================================================

export { getProfile, tryGetProfile } from './registry';
export { englishProfile } from './generators/profiles/english';

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
