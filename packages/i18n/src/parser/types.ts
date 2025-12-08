// packages/i18n/src/parser/types.ts

/**
 * KeywordProvider interface for locale-aware parsing.
 *
 * This interface allows the parser to resolve non-English keywords
 * to their canonical English equivalents, enabling multilingual
 * hyperscript syntax.
 *
 * @example
 * ```typescript
 * import { esKeywords } from '@hyperfixi/i18n/parser/es';
 * const parser = new Parser({ keywords: esKeywords });
 * parser.parse('en clic alternar .active'); // Works!
 * ```
 */
export interface KeywordProvider {
  /** The locale code for this provider (e.g., 'es', 'ja') */
  readonly locale: string;

  /**
   * Resolve a token to its canonical (English) keyword.
   * Returns undefined if the token is not a recognized keyword.
   *
   * @example
   * esKeywords.resolve('alternar') // 'toggle'
   * esKeywords.resolve('en')       // 'on'
   * esKeywords.resolve('unknown')  // undefined
   */
  resolve(token: string): string | undefined;

  /**
   * Check if the token is a command in this locale.
   * Includes both locale keywords and English fallbacks.
   */
  isCommand(token: string): boolean;

  /**
   * Check if the token is a keyword (non-command) in this locale.
   * Includes modifiers, logical operators, events, etc.
   */
  isKeyword(token: string): boolean;

  /**
   * Check if the token is an event name in this locale.
   */
  isEvent(token: string): boolean;

  /**
   * Check if the token is a modifier/preposition in this locale.
   */
  isModifier(token: string): boolean;

  /**
   * Check if the token is a logical operator in this locale.
   */
  isLogical(token: string): boolean;

  /**
   * Check if the token is a value keyword (me, it, true, etc.) in this locale.
   */
  isValue(token: string): boolean;

  /**
   * Get all command names in this locale (for completions).
   */
  getCommands(): string[];

  /**
   * Get all keywords in this locale (for completions).
   */
  getKeywords(): string[];

  /**
   * Get the locale keyword for an English canonical keyword.
   * Useful for error messages and IDE completions in native language.
   *
   * @example
   * esKeywords.toLocale('toggle') // 'alternar'
   */
  toLocale(englishKeyword: string): string | undefined;
}

/**
 * Options for creating a keyword provider.
 */
export interface KeywordProviderOptions {
  /**
   * When true, English keywords are always accepted alongside locale keywords.
   * This allows mixing: "en click alternar .active"
   * @default true
   */
  allowEnglishFallback?: boolean;

  /**
   * Categories to include. If not specified, all categories are included.
   */
  categories?: Array<'commands' | 'modifiers' | 'events' | 'logical' | 'temporal' | 'values' | 'attributes'>;
}
