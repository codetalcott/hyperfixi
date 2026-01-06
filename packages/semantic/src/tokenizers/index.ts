/**
 * Tokenizer Registry
 *
 * Provides a unified interface for tokenization.
 * Delegates to the central registry for language lookups.
 *
 * For tree-shaking, import specific tokenizers directly:
 *   import { englishTokenizer } from './tokenizers/english';
 *
 * To register languages, import the language modules:
 *   import '@hyperfixi/semantic/languages/en';
 */

import type { LanguageTokenizer, TokenStream } from '../types';
import {
  tryGetTokenizer,
  getRegisteredLanguages,
  isLanguageRegistered,
  tokenize as registryTokenize,
  registerTokenizer as registryRegisterTokenizer,
} from '../registry';

// =============================================================================
// Registry Delegation
// =============================================================================

/**
 * Get a tokenizer for the specified language.
 * Returns undefined if language is not registered.
 */
export function getTokenizer(language: string): LanguageTokenizer | undefined {
  return tryGetTokenizer(language);
}

/**
 * Tokenize input in the specified language.
 * @throws Error if language is not registered
 */
export function tokenize(input: string, language: string): TokenStream {
  return registryTokenize(input, language);
}

/**
 * Get all supported languages.
 * Returns only languages that have been registered.
 */
export function getSupportedLanguages(): string[] {
  return getRegisteredLanguages();
}

/**
 * Check if a language is supported.
 */
export function isLanguageSupported(language: string): boolean {
  return isLanguageRegistered(language);
}

/**
 * Register a custom tokenizer.
 * Note: For full language support, use registerLanguage() from registry instead.
 */
export function registerTokenizer(tokenizer: LanguageTokenizer): void {
  registryRegisterTokenizer(tokenizer);
}

// =============================================================================
// Re-exports (tree-shakeable - only included if imported)
// =============================================================================

export { englishTokenizer } from './english';
export { japaneseTokenizer } from './japanese';
export { koreanTokenizer } from './korean';
export { arabicTokenizer } from './arabic';
export { spanishTokenizer } from './spanish';
export { turkishTokenizer } from './turkish';
export { chineseTokenizer } from './chinese';
export { portugueseTokenizer } from './portuguese';
export { frenchTokenizer } from './french';
export { germanTokenizer } from './german';
export { indonesianTokenizer } from './indonesian';
export { quechuaTokenizer } from './quechua';
export { swahiliTokenizer } from './swahili';
export { italianTokenizer } from './italian';
export { vietnameseTokenizer } from './vietnamese';

export {
  BaseTokenizer,
  TokenStreamImpl,
  createToken,
  createPosition,
  extractCssSelector,
  extractStringLiteral,
  extractNumber,
  isUrlStart,
  extractUrl,
} from './base';
