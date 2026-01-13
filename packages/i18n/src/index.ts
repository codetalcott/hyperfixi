// packages/i18n/src/index.ts

// =============================================================================
// Type Exports
// =============================================================================

export type {
  DictionaryCategory,
  Dictionary,
  I18nConfig,
  TranslationOptions,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  LocaleMetadata,
  TranslationContext,
  TokenType,
  Token,
  TranslationResult,
} from './types';

export {
  DICTIONARY_CATEGORIES,
  isDictionaryCategory,
  getDictionaryCategory,
  forEachCategory,
  findInDictionary,
  translateFromEnglish,
} from './types';

// =============================================================================
// Translator Exports
// =============================================================================

export { HyperscriptTranslator } from './translator';

// =============================================================================
// Dictionary Exports
// =============================================================================

export {
  dictionaries,
  en,
  es,
  ko,
  zh,
  fr,
  de,
  ja,
  ar,
  tr,
  id,
  qu,
  sw,
  pt,
  supportedLocales,
  isLocaleSupported,
  getDictionary,
} from './dictionaries';

// =============================================================================
// Parser Integration Exports
// =============================================================================

export type { KeywordProvider, KeywordProviderOptions } from './parser';

export {
  createKeywordProvider,
  createEnglishProvider,
  ENGLISH_COMMANDS,
  ENGLISH_KEYWORDS,
  UNIVERSAL_ENGLISH_KEYWORDS,
  // Locale packs
  esKeywords,
  esDictionary,
  jaKeywords,
  jaDictionary,
  frKeywords,
  frDictionary,
  deKeywords,
  deDictionary,
  arKeywords,
  arDictionary,
  koKeywords,
  koDictionary,
  zhKeywords,
  zhDictionary,
  trKeywords,
  trDictionary,
  idKeywords,
  idDictionary,
  quKeywords,
  quDictionary,
  swKeywords,
  swDictionary,
  ptKeywords,
  ptDictionary,
  // Locale management
  LocaleManager,
  detectBrowserLocale,
} from './parser';

// Re-export key utilities
export { detectLocale, getBrowserLocales, isRTL } from './utils/locale';
export { tokenize } from './utils/tokenizer';
export { validate } from './validators';

// Plugin exports
export { hyperscriptI18nVitePlugin } from './plugins/vite';
export { HyperscriptI18nWebpackPlugin } from './plugins/webpack';

// SSR integration
export { SSRLocaleManager, createExpressI18nMiddleware, withI18n } from './ssr-integration';
export type { SSRLocaleContext, SSRLocaleOptions } from './ssr-integration';

// Pluralization
export {
  pluralRules,
  getPlural,
  PluralAwareTranslator,
  pluralTimeExpressions,
} from './pluralization';
export type { PluralRule, PluralForms } from './pluralization';

// Formatting
export {
  NumberFormatter,
  DateFormatter,
  LocaleFormatter,
  getFormatter,
  formatForLocale,
} from './formatting';
export type {
  NumberFormatOptions,
  DateFormatOptions,
  RelativeTimeFormatOptions,
} from './formatting';

// Runtime i18n
export { RuntimeI18nManager, initializeI18n, getI18n, runtimeI18n } from './runtime';
export type { RuntimeI18nOptions } from './runtime';

// Create and export default translator instance
import { HyperscriptTranslator } from './translator';
export const defaultTranslator = new HyperscriptTranslator({ locale: 'en' });

// Create and export default runtime instance for browser usage
import { RuntimeI18nManager } from './runtime';
export const defaultRuntime = new RuntimeI18nManager({ locale: 'en' });

// Enhanced I18n Implementation (following enhanced pattern)
export {
  TypedI18nContextImplementation,
  createI18nContext,
  createEnhancedI18n,
  enhancedI18nImplementation,
  EnhancedI18nInputSchema,
  EnhancedI18nOutputSchema,
} from './enhanced-i18n';
export type { EnhancedI18nInput, EnhancedI18nOutput } from './enhanced-i18n';

// Grammar-aware transformation system (Phase 2)
export {
  // Types
  type SemanticRole,
  type WordOrder,
  type AdpositionType,
  type MorphologyType,
  type GrammaticalMarker,
  type LanguageProfile,
  type GrammarRule,
  type PatternMatcher,
  type PatternTransform,
  type ParsedStatement,
  type ParsedElement,
  UNIVERSAL_PATTERNS,
  LANGUAGE_FAMILY_DEFAULTS,
  reorderRoles,
  insertMarkers,
  transformStatement,
  // Profiles
  profiles,
  getProfile,
  getSupportedLocales,
  englishProfile,
  japaneseProfile,
  koreanProfile,
  chineseProfile,
  arabicProfile,
  turkishProfile,
  spanishProfile,
  indonesianProfile,
  quechuaProfile,
  swahiliProfile,
  // Transformer
  GrammarTransformer,
  parseStatement,
  toLocale,
  toEnglish,
  translate,
  examples as grammarExamples,
} from './grammar';
