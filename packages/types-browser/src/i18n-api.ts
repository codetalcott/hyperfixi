/**
 * Type definitions for HyperFixi i18n/Grammar transformation browser API
 */

/**
 * HyperFixi i18n/Grammar transformation API on window.HyperFixiI18n
 */
export interface HyperFixiI18nAPI {
  /**
   * Transform hyperscript statement from one language word order to another
   *
   * @param statement Parsed hyperscript statement
   * @param fromLocale Source language locale (e.g., 'en')
   * @param toLocale Target language locale (e.g., 'ja')
   * @returns Transformed statement or null
   */
  translate(
    statement: HyperscriptStatement,
    fromLocale: string,
    toLocale: string
  ): HyperscriptStatement | null;

  /**
   * Transform code from English to target locale
   */
  toLocale(code: string, toLocale: string): string | null;

  /**
   * Transform code from any locale to English
   */
  toEnglish(code: string, fromLocale: string): string | null;

  /**
   * Parse hyperscript statement
   */
  parseStatement(code: string): HyperscriptStatement | null;

  /**
   * Get supported locales for grammar transformation
   */
  getSupportedLocales(): string[];

  /**
   * Check if transformation is supported between two locales
   */
  supportsTransform(fromLocale: string, toLocale: string): boolean;

  /**
   * Get language profile information
   */
  getProfile(locale: string): LanguageProfile | null;

  /**
   * Reorder semantic roles based on language word order
   */
  reorderRoles(
    roles: Record<string, any>,
    fromProfile: LanguageProfile,
    toProfile: LanguageProfile
  ): Record<string, any>;

  /**
   * Insert grammatical markers
   */
  insertMarkers(tokens: string[], role: string, profile: LanguageProfile): string[];

  /**
   * Join tokens with language-specific rules
   */
  joinTokens(tokens: string[], profile: LanguageProfile): string;

  /**
   * Transform statement between locales
   */
  transformStatement(
    statement: HyperscriptStatement,
    fromProfile: LanguageProfile,
    toProfile: LanguageProfile
  ): HyperscriptStatement;

  /**
   * Check if direct word mapping exists
   */
  hasDirectMapping(word: string, fromLocale: string, toLocale: string): boolean;

  /**
   * Get direct word mapping
   */
  getDirectMapping(word: string, fromLocale: string, toLocale: string): string | null;

  /**
   * Translate word directly using mapping
   */
  translateWordDirect(word: string, fromLocale: string, toLocale: string): string | null;

  /**
   * Get supported language pairs for direct translation
   */
  getSupportedDirectPairs(): Array<[string, string]>;

  /**
   * Detect browser locale
   */
  detectBrowserLocale(): string;

  /**
   * Grammar transformer class
   */
  GrammarTransformer: any;

  /**
   * Locale manager class
   */
  LocaleManager: any;

  /**
   * Universal patterns for all languages
   */
  UNIVERSAL_PATTERNS: any;

  /**
   * Language family defaults
   */
  LANGUAGE_FAMILY_DEFAULTS: any;

  /**
   * All language profiles
   */
  profiles: Record<string, LanguageProfile>;

  /**
   * Language-specific profiles
   */
  englishProfile: LanguageProfile;
  japaneseProfile: LanguageProfile;
  koreanProfile: LanguageProfile;
  arabicProfile: LanguageProfile;
  spanishProfile: LanguageProfile;
  turkishProfile: LanguageProfile;
  chineseProfile: LanguageProfile;
  portugueseProfile: LanguageProfile;
  frenchProfile: LanguageProfile;
  germanProfile: LanguageProfile;
  indonesianProfile: LanguageProfile;
  quechuaProfile: LanguageProfile;
  swahiliProfile: LanguageProfile;

  /**
   * Language-specific keyword dictionaries
   */
  esDictionary: any;
  jaDictionary: any;
  frDictionary: any;
  deDictionary: any;
  arDictionary: any;
  koDictionary: any;
  zhDictionary: any;
  trDictionary: any;
  idDictionary: any;
  quDictionary: any;
  swDictionary: any;
  ptDictionary: any;

  /**
   * Language-specific keywords
   */
  esKeywords: any;
  jaKeywords: any;
  frKeywords: any;
  deKeywords: any;
  arKeywords: any;
  koKeywords: any;
  zhKeywords: any;
  trKeywords: any;
  idKeywords: any;
  quKeywords: any;
  swKeywords: any;
  ptKeywords: any;

  /**
   * Direct mapping configuration
   */
  directMappings: any;

  /**
   * Grammar transformation examples
   */
  grammarExamples: Array<{
    english: string;
    [locale: string]: string;
  }>;
}

export interface HyperscriptStatement {
  command: string;
  roles: Record<string, any>;
  modifiers?: string[];
  [key: string]: any;
}

export interface LanguageProfile {
  locale: string;
  name: string;
  wordOrder: 'SVO' | 'SOV' | 'VSO' | 'VOS';
  isRTL: boolean;
  family?: string;
  joinTokens?: Record<string, string>;
  [key: string]: any;
}
