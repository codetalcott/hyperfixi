/**
 * Type definitions for @hyperfixi/i18n browser global (window.HyperFixiI18n)
 */

export interface HyperFixiI18nAPI {
  /**
   * Translate hyperscript with grammar transformation
   */
  translate(source: string, fromLang: string, toLang: string): string;

  /**
   * Create a grammar transformer instance
   */
  createTransformer(options?: TransformerOptions): GrammarTransformer;

  /**
   * Get supported locales
   */
  supportedLocales: readonly string[];

  /**
   * Get language profile for a locale
   */
  getProfile(locale: string): LanguageProfile | undefined;
}

export interface GrammarTransformer {
  transform(source: string, fromLang: string, toLang: string): string;
  parseStatement(source: string, language: string): ParsedStatement;
  toLocale(statement: ParsedStatement, locale: string): string;
  toEnglish(source: string, locale: string): string;
}

export interface TransformerOptions {
  strict?: boolean;
  preserveWhitespace?: boolean;
}

export interface LanguageProfile {
  locale: string;
  wordOrder: 'SVO' | 'SOV' | 'VSO';
  adpositions: 'prepositions' | 'postpositions' | 'both';
  morphology: 'isolating' | 'agglutinative' | 'fusional';
  markers?: Record<string, string>;
}

export interface ParsedStatement {
  action: string;
  roles: Map<string, ParsedElement>;
  raw: string;
}

export interface ParsedElement {
  role: string;
  value: string;
  type: 'literal' | 'selector' | 'reference';
}
