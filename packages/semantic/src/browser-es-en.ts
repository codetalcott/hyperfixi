/**
 * Spanish + English Browser Bundle Entry Point
 *
 * A minimal bundle supporting only Spanish (es) and English (en).
 * Uses the registry-based architecture for tree-shaking.
 *
 * @example
 * ```html
 * <script src="hyperfixi-semantic.es-en.global.js"></script>
 * <script>
 *   // Parse Spanish hyperscript
 *   const ast = HyperFixiSemanticEsEn.parse('alternar .activo', 'es');
 *
 *   // Translate Spanish -> English
 *   const en = HyperFixiSemanticEsEn.translate('alternar .activo', 'es', 'en');
 * </script>
 * ```
 */

// =============================================================================
// Register Only ES + EN Languages
// =============================================================================

// Import to register only Spanish and English
import './languages/en';
import './languages/es';

// =============================================================================
// Version
// =============================================================================

export const VERSION = '1.0.0-es-en';

// =============================================================================
// Supported Languages
// =============================================================================

/**
 * Get all supported languages in this bundle.
 */
export function getSupportedLanguages(): string[] {
  return ['en', 'es'];
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
  if (language !== 'en' && language !== 'es') {
    throw new Error(`Language not supported in this bundle: ${language}. Supported: en, es`);
  }
  const stream = tokenizeInternal(input, language);
  return [...stream.tokens];
}

// Re-export individual tokenizers
export { englishTokenizer } from './tokenizers/english';
export { spanishTokenizer } from './tokenizers/spanish';

// =============================================================================
// Patterns (from registry - lazy generation)
// =============================================================================

import { getPatternsForLanguage as getPatternsFromRegistry } from './registry';
import type { LanguagePattern, ActionType } from './types';

/**
 * Get all patterns for a specific language.
 */
export function getPatternsForLanguage(language: string): LanguagePattern[] {
  if (language !== 'en' && language !== 'es') {
    throw new Error(`Language not supported in this bundle: ${language}. Supported: en, es`);
  }
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

export { getProfile } from './registry';
export { englishProfile } from './generators/language-profiles';
export { spanishProfile } from './generators/language-profiles';

// =============================================================================
// Parsing
// =============================================================================

export { parse, canParse } from './parser';
export { parseAny, parseExplicit, isExplicitSyntax } from './explicit';

// =============================================================================
// Translation
// =============================================================================

import {
  translate as translateInternal,
  getAllTranslations as getAllTranslationsInternal,
} from './explicit';

/**
 * Translate hyperscript between Spanish and English.
 */
export function translate(input: string, sourceLang: string, targetLang: string): string {
  if (
    (sourceLang !== 'en' && sourceLang !== 'es') ||
    (targetLang !== 'en' && targetLang !== 'es')
  ) {
    throw new Error('This bundle only supports translation between en and es');
  }
  return translateInternal(input, sourceLang, targetLang);
}

/**
 * Get translations to both languages.
 */
export function getAllTranslations(input: string, sourceLang: string): Record<string, string> {
  if (sourceLang !== 'en' && sourceLang !== 'es') {
    throw new Error(`Language not supported in this bundle: ${sourceLang}. Supported: en, es`);
  }
  const result = getAllTranslationsInternal(input, sourceLang);
  // Filter to only include ES + EN
  return {
    en: result.en,
    es: result.es,
  };
}

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
