/**
 * Lazy Loading Browser Bundle Entry Point
 *
 * A minimal browser bundle that registers NO languages by default.
 * Languages are loaded on-demand using the loadLanguage() function.
 *
 * This is ideal for applications that:
 * - Need to minimize initial bundle size
 * - Load languages based on user locale
 * - Support multiple languages but don't need all upfront
 *
 * @example
 * ```html
 * <script src="hyperfixi-semantic.lazy.global.js"></script>
 * <script>
 *   // Load only the languages you need
 *   await HyperFixiSemanticLazy.loadLanguage('en');
 *   await HyperFixiSemanticLazy.loadLanguage('ja');
 *
 *   // Now parsing works for loaded languages
 *   const ast = HyperFixiSemanticLazy.parse('toggle .active', 'en');
 * </script>
 * ```
 */

// =============================================================================
// Version
// =============================================================================

export const VERSION = '1.0.0-lazy';

// =============================================================================
// Language Loader (Core Feature)
// =============================================================================

export {
  loadLanguage,
  loadLanguages,
  canLoadLanguage,
  getLoadedLanguages,
  getUnloadedLanguages,
  SUPPORTED_LANGUAGES,
  type LoadLanguageOptions,
  type LoadLanguageResult,
  type LanguageModule,
} from './language-loader';

// =============================================================================
// Registry (For checking loaded languages)
// =============================================================================

export {
  getTokenizer,
  isLanguageSupported,
  isLanguageRegistered,
  getRegisteredLanguages,
  getProfile,
  tryGetProfile,
} from './registry';

// =============================================================================
// Tokenizers
// =============================================================================

import type { LanguageToken } from './types';
import { tokenize as tokenizeInternal } from './tokenizers';
import { isLanguageRegistered } from './registry';

/**
 * Tokenize input and return array of tokens.
 * @throws Error if language is not loaded
 */
export function tokenize(input: string, language: string): LanguageToken[] {
  if (!isLanguageRegistered(language)) {
    throw new Error(
      `Language '${language}' is not loaded. ` + `Call loadLanguage('${language}') first.`
    );
  }
  const stream = tokenizeInternal(input, language);
  return [...stream.tokens];
}

// =============================================================================
// Patterns (from registry)
// =============================================================================

import { getPatternsForLanguage as getPatternsFromRegistry } from './registry';
import type { LanguagePattern, ActionType } from './types';

/**
 * Get all patterns for a language.
 * @throws Error if language is not loaded
 */
export function getPatternsForLanguage(language: string): LanguagePattern[] {
  if (!isLanguageRegistered(language)) {
    throw new Error(
      `Language '${language}' is not loaded. ` + `Call loadLanguage('${language}') first.`
    );
  }
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

// =============================================================================
// Pattern Generator Setup
// =============================================================================

// Set up the pattern generator so that lazy-loaded languages work correctly.
// This enables the registry's getPatternsForLanguage to generate patterns
// when a language is loaded.
import { setPatternGenerator } from './registry';
import { buildPatternsForLanguage } from './patterns/builders';
import type { LanguageProfile } from './generators/language-profiles';

function patternGeneratorForProfile(profile: LanguageProfile): LanguagePattern[] {
  return buildPatternsForLanguage(profile.code);
}

setPatternGenerator(patternGeneratorForProfile);
