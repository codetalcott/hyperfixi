/**
 * Type definitions for @lokascript/i18n browser global (window.HyperFixiI18n)
 */

/**
 * NOTE: this file and `i18n-api.ts` both declare `LokaScriptI18nAPI`, with
 * different shapes — `index.d.ts` references this one, `index.ts` exports the
 * other. That divergence predates this change and is untouched here; only the
 * retired transformer surface is removed from both.
 */
export interface LokaScriptI18nAPI {
  // RETIRED 2026-08-28 with `@lokascript/i18n`'s grammar transformer:
  // `translate` and `createTransformer` (plus the `GrammarTransformer` and
  // `TransformerOptions` interfaces they referenced). Translation is
  // `@lokascript/semantic`'s job; in the browser that is `hyperfixi.translate`
  // from the multilingual bundle.

  /**
   * Get supported locales
   */
  supportedLocales: readonly string[];

  /**
   * Get language profile for a locale
   */
  getProfile(locale: string): LanguageProfile | undefined;
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
