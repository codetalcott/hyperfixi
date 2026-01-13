/**
 * Token definitions and universal patterns for prism-hyperfixi.
 *
 * These patterns are language-independent and used for all languages.
 */

import type { PrismTokenType } from './types';

/**
 * CSS class names for each token type.
 * These are used for styling in the theme CSS files.
 */
export const TOKEN_CLASSES: Record<PrismTokenType, string> = {
  command: 'hs-command', // Bold, primary color
  modifier: 'hs-modifier', // Secondary color
  event: 'hs-event', // Event color (orange/yellow)
  logical: 'hs-logical', // Logic color (purple)
  temporal: 'hs-temporal', // Time color (cyan)
  value: 'hs-value', // Value color (green)
  attribute: 'hs-attribute', // Attribute color (blue)
  expression: 'hs-expression', // Expression color (magenta)
  selector: 'hs-selector', // CSS selector color (teal)
  string: 'hs-string', // String color (green)
  number: 'hs-number', // Number color (orange)
  comment: 'hs-comment', // Comment color (gray, italic)
  operator: 'hs-operator', // Operator color (red/pink)
  punctuation: 'hs-punctuation', // Punctuation color (gray)
};

/**
 * Universal patterns that apply to all languages.
 * These are matched before language-specific keywords.
 */
export const UNIVERSAL_PATTERNS = {
  /**
   * Hyperscript comments: -- until end of line
   */
  comment: /--.*$/gm,

  /**
   * Strings: single, double, or backtick quoted
   * Handles escaped quotes within strings
   */
  string: /(["'`])(?:\\[\s\S]|(?!\1)[^\\])*\1/g,

  /**
   * Numbers with optional duration suffix
   * Matches: 123, 1.5, 500ms, 2s, 1.5s
   */
  number: /\b\d+(?:\.\d+)?(?:ms|s|m|h)?\b/g,

  /**
   * CSS selectors
   */
  selector: {
    /** ID selectors: #myId, #my-element */
    id: /#[\w-]+/g,

    /** Class selectors: .active, .my-class */
    class: /\.[\w-]+/g,

    /** Attribute selectors: [data-id], [type="submit"] */
    attribute: /\[[\w-]+(?:=[^\]]+)?\]/g,

    /** Element selectors in hyperscript syntax: <button/>, <div.class#id/> */
    element: /<[\w-]+(?:[.#][\w-]+)*\s*\/?>/g,
  },

  /**
   * Operators: comparison, logical, arithmetic
   */
  operator: /===|!==|==|!=|<=|>=|&&|\|\||[<>!+\-*\/=]/g,

  /**
   * Punctuation: parentheses, brackets, etc.
   */
  punctuation: /[(){}[\],;:]/g,
};

/**
 * Languages that use non-Latin scripts.
 * These don't need word boundary matching since characters are unambiguous.
 */
export const NON_LATIN_LANGUAGES = new Set([
  'ja', // Japanese (Hiragana, Katakana, Kanji)
  'ko', // Korean (Hangul)
  'zh', // Chinese (CJK)
  'ar', // Arabic
  'hi', // Hindi (Devanagari)
  'bn', // Bengali
  'th', // Thai
  'ru', // Russian (Cyrillic)
  'uk', // Ukrainian (Cyrillic)
]);

/**
 * RTL (right-to-left) languages.
 * Used for proper text direction in code editors.
 */
export const RTL_LANGUAGES = new Set([
  'ar', // Arabic
  'he', // Hebrew
]);

/**
 * Check if a language uses non-Latin script.
 */
export function isNonLatinLanguage(code: string): boolean {
  return NON_LATIN_LANGUAGES.has(code);
}

/**
 * Get text direction for a language.
 */
export function getTextDirection(code: string): 'ltr' | 'rtl' {
  return RTL_LANGUAGES.has(code) ? 'rtl' : 'ltr';
}
