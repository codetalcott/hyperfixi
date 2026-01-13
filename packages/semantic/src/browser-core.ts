/**
 * Core Browser Bundle Entry Point (No Languages)
 *
 * A minimal browser bundle that includes only the parsing infrastructure.
 * Languages must be loaded via URL or pre-loaded modules.
 *
 * This is ideal for:
 * - CDN-based language loading
 * - Applications that load languages dynamically from external sources
 * - Minimizing initial bundle size
 *
 * @example
 * ```html
 * <script src="hyperfixi-semantic-core.global.js"></script>
 * <script src="lang/en.global.js"></script> <!-- Self-registering -->
 * <script>
 *   const ast = HyperFixiSemanticCore.parse('toggle .active', 'en');
 * </script>
 * ```
 *
 * @example
 * ```html
 * <script src="hyperfixi-semantic-core.global.js"></script>
 * <script>
 *   // Load from URL
 *   await HyperFixiSemanticCore.loadLanguageFromUrl('ja', '/lang/ja.global.js');
 *   const ast = HyperFixiSemanticCore.parse('トグル .active', 'ja');
 * </script>
 * ```
 */

// =============================================================================
// Version
// =============================================================================

export const VERSION = '1.0.0-core';

// =============================================================================
// Registry (Core)
// =============================================================================

export {
  registerLanguage,
  registerPatterns,
  getTokenizer,
  isLanguageSupported,
  isLanguageRegistered,
  getRegisteredLanguages,
  getProfile,
  tryGetProfile,
  getPatternsForLanguage,
  setPatternGenerator,
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
      `Language '${language}' is not loaded. ` + `Load it via script tag or loadLanguageFromUrl().`
    );
  }
  const stream = tokenizeInternal(input, language);
  return [...stream.tokens];
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
// URL-Based Language Loading
// =============================================================================

import {
  registerLanguage as regLang,
  registerPatterns as regPatterns,
  type LanguageProfile,
} from './registry';
import type { LanguageTokenizer, LanguagePattern } from './types';

// Re-export for language module registration
export type { LanguagePattern };

/**
 * A language module that can be registered.
 */
export interface LanguageModule {
  tokenizer: LanguageTokenizer;
  profile: LanguageProfile;
  patterns?: LanguagePattern[];
  buildPatterns?: () => LanguagePattern[];
}

/**
 * Load a language from a URL.
 *
 * The URL should point to a JavaScript file that:
 * - Either self-registers the language (recommended for IIFE bundles)
 * - Or exports a LanguageModule object
 *
 * @example
 * ```typescript
 * // Load self-registering bundle
 * await loadLanguageFromUrl('ja', '/lang/ja.global.js');
 *
 * // Load from CDN
 * await loadLanguageFromUrl('ko', 'https://cdn.example.com/semantic/lang/ko.js');
 * ```
 */
export async function loadLanguageFromUrl(
  code: string,
  url: string
): Promise<{ loaded: boolean; error?: string }> {
  try {
    // Fetch the script
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();

    // Execute the script (self-registering bundles will register themselves)
    const script = document.createElement('script');
    script.textContent = text;
    document.head.appendChild(script);
    document.head.removeChild(script);

    // Check if it registered
    if (isLanguageRegistered(code)) {
      return { loaded: true };
    }

    return {
      loaded: false,
      error: `Script loaded but language '${code}' was not registered`,
    };
  } catch (error) {
    return {
      loaded: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Register a pre-loaded language module.
 */
export function registerLanguageModule(code: string, module: LanguageModule): void {
  regLang(code, module.tokenizer, module.profile);

  if (module.patterns) {
    regPatterns(code, module.patterns);
  } else if (module.buildPatterns) {
    regPatterns(code, module.buildPatterns());
  }
}

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
// Pattern Generator (Optional)
// =============================================================================
// Note: This core bundle does NOT include the pattern generator by default.
// Language bundles (e.g., browser-en.en.global.js) register their own patterns.
// If you need dynamic pattern generation, import buildPatternsForLanguage from
// the full bundle or use setPatternGenerator() to provide your own generator.
