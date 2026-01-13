/**
 * Spanish-Only Browser Bundle Entry Point
 *
 * The smallest possible bundle for Spanish-speaking developers.
 * Supports only Spanish (es) - no English fallback.
 *
 * @example
 * ```html
 * <script src="hyperfixi-semantic.es.global.js"></script>
 * <script>
 *   // Parse Spanish hyperscript
 *   const ast = HyperFixiSemanticEs.parse('alternar .activo', 'es');
 *
 *   // Tokenize
 *   const tokens = HyperFixiSemanticEs.tokenize('en clic mostrar #mensaje', 'es');
 * </script>
 * ```
 */

// =============================================================================
// Register Only Spanish Language
// =============================================================================

import './languages/es';

// =============================================================================
// Version
// =============================================================================

export const VERSION = '1.0.0-es';

// =============================================================================
// Supported Languages
// =============================================================================

const SUPPORTED_LANGUAGE = 'es' as const;

/**
 * Get all supported languages in this bundle.
 */
export function getSupportedLanguages(): string[] {
  return [SUPPORTED_LANGUAGE];
}

/**
 * Validate that a language is supported by this bundle.
 */
function validateLanguage(language: string): void {
  if (language !== SUPPORTED_LANGUAGE) {
    throw new Error(
      `Idioma no soportado en este paquete: ${language}. ` +
        `Este paquete solo soporta: ${SUPPORTED_LANGUAGE}. ` +
        `(Language not supported: ${language}. This bundle only supports: ${SUPPORTED_LANGUAGE})`
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

// Re-export Spanish tokenizer
export { spanishTokenizer } from './tokenizers/spanish';

// =============================================================================
// Patterns (from registry - lazy generation)
// =============================================================================

import { getPatternsForLanguage as getPatternsFromRegistry } from './registry';
import type { LanguagePattern, ActionType } from './types';

/**
 * Get all patterns for Spanish.
 */
export function getPatternsForLanguage(language: string): LanguagePattern[] {
  validateLanguage(language);
  return getPatternsFromRegistry(language);
}

/**
 * Get patterns for Spanish and a specific command.
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
export { spanishProfile } from './generators/language-profiles';

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
