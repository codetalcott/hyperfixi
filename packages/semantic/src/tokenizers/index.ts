/**
 * Tokenizer Registry
 *
 * Exports all language-specific tokenizers and provides
 * a unified interface for tokenization.
 */

import type { LanguageTokenizer, TokenStream } from '../types';
import { englishTokenizer } from './english';
import { japaneseTokenizer } from './japanese';
import { koreanTokenizer } from './korean';
import { arabicTokenizer } from './arabic';
import { spanishTokenizer } from './spanish';

// =============================================================================
// Tokenizer Registry
// =============================================================================

/**
 * All registered tokenizers by language code.
 */
const tokenizers = new Map<string, LanguageTokenizer>();
tokenizers.set('en', englishTokenizer);
tokenizers.set('ja', japaneseTokenizer);
tokenizers.set('ko', koreanTokenizer);
tokenizers.set('ar', arabicTokenizer);
tokenizers.set('es', spanishTokenizer);

/**
 * Get a tokenizer for the specified language.
 */
export function getTokenizer(language: string): LanguageTokenizer | undefined {
  return tokenizers.get(language);
}

/**
 * Tokenize input in the specified language.
 */
export function tokenize(input: string, language: string): TokenStream {
  const tokenizer = tokenizers.get(language);
  if (!tokenizer) {
    throw new Error(`No tokenizer available for language: ${language}`);
  }
  return tokenizer.tokenize(input);
}

/**
 * Get all supported languages.
 */
export function getSupportedLanguages(): string[] {
  return Array.from(tokenizers.keys());
}

/**
 * Check if a language is supported.
 */
export function isLanguageSupported(language: string): boolean {
  return tokenizers.has(language);
}

/**
 * Register a custom tokenizer.
 */
export function registerTokenizer(tokenizer: LanguageTokenizer): void {
  tokenizers.set(tokenizer.language, tokenizer);
}

// =============================================================================
// Re-exports
// =============================================================================

export { englishTokenizer } from './english';
export { japaneseTokenizer } from './japanese';
export { koreanTokenizer } from './korean';
export { arabicTokenizer } from './arabic';
export { spanishTokenizer } from './spanish';

export {
  BaseTokenizer,
  TokenStreamImpl,
  createToken,
  createPosition,
  extractCssSelector,
  extractStringLiteral,
  extractNumber,
} from './base';
