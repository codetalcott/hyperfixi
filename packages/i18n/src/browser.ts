/**
 * Browser entry point for @lokascript/i18n
 *
 * This module exports only what's needed for browser usage:
 * - Keyword providers for each locale
 * - LocaleManager for runtime locale switching
 * - Factory functions for custom providers
 *
 * Usage with UMD bundle:
 * ```html
 * <script src="hyperfixi-core.min.js"></script>
 * <script src="hyperfixi-i18n.min.js"></script>
 * <script>
 *   // Configure HyperFixi with Spanish keywords
 *   HyperFixi.configure({ keywords: HyperFixiI18n.esKeywords });
 * </script>
 * ```
 *
 * Usage with ES modules:
 * ```typescript
 * import { esKeywords } from '@lokascript/i18n';
 * import { Parser } from '@hyperfixi/core';
 *
 * const parser = new Parser(tokens, { keywords: esKeywords });
 * ```
 */

// Types
export type { KeywordProvider, KeywordProviderOptions } from './parser/types';

// Factory functions
export { createKeywordProvider, createEnglishProvider } from './parser/create-provider';
export {
  ENGLISH_COMMANDS,
  ENGLISH_KEYWORDS,
  UNIVERSAL_ENGLISH_KEYWORDS,
} from './parser/create-provider';

// Locale keyword providers
export { esKeywords, esDictionary } from './parser/es';
export { jaKeywords, jaDictionary } from './parser/ja';
export { frKeywords, frDictionary } from './parser/fr';
export { deKeywords, deDictionary } from './parser/de';
export { arKeywords, arDictionary } from './parser/ar';
export { koKeywords, koDictionary } from './parser/ko';
export { zhKeywords, zhDictionary } from './parser/zh';
export { trKeywords, trDictionary } from './parser/tr';
export { idKeywords, idDictionary } from './parser/id';
export { quKeywords, quDictionary } from './parser/qu';
export { swKeywords, swDictionary } from './parser/sw';
export { ptKeywords, ptDictionary } from './parser/pt';
export { itKeywords, itDictionary } from './parser/it';
export { viKeywords, viDictionary } from './parser/vi';
export { plKeywords, plDictionary } from './parser/pl';
export { ruKeywords, ruDictionary } from './parser/ru';
export { ukKeywords, ukDictionary } from './parser/uk';
export { hiKeywords, hiDictionary } from './parser/hi';
export { bnKeywords, bnDictionary } from './parser/bn';
export { thKeywords, thDictionary } from './parser/th';
export { msKeywords, msDictionary } from './parser/ms';
export { tlKeywords, tlDictionary } from './parser/tl';

// Locale management
export { LocaleManager, detectBrowserLocale } from './parser/locale-manager';

// Re-export dictionaries for custom provider creation
export { en } from './dictionaries/en';
export { es } from './dictionaries/es';
export { ja } from './dictionaries/ja';
export { fr } from './dictionaries/fr';
export { de } from './dictionaries/de';
export { ar } from './dictionaries/ar';
export { ko } from './dictionaries/ko';
export { zh } from './dictionaries/zh';
export { tr } from './dictionaries/tr';
export { id } from './dictionaries/id';
export { qu } from './dictionaries/qu';
export { sw } from './dictionaries/sw';
export { pt } from './dictionaries/pt';
export { it } from './dictionaries/it';
export { vi } from './dictionaries/vi';
export { pl } from './dictionaries/pl';
export { russianDictionary } from './dictionaries/ru';
export { ukrainianDictionary } from './dictionaries/uk';
export { hindiDictionary } from './dictionaries/hi';
export { bn } from './dictionaries/bn';
export { th } from './dictionaries/th';
export { ms } from './dictionaries/ms';
export { tl } from './dictionaries/tl';

// Grammar-aware transformation system (Phase 2)
export {
  // Types (re-exported for browser usage)
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
  // Universal patterns and language family defaults
  UNIVERSAL_PATTERNS,
  LANGUAGE_FAMILY_DEFAULTS,
  // Transformation utilities
  reorderRoles,
  insertMarkers,
  joinTokens,
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
  germanProfile,
  frenchProfile,
  portugueseProfile,
  indonesianProfile,
  quechuaProfile,
  swahiliProfile,
  // Direct language-pair translation
  directMappings,
  hasDirectMapping,
  getDirectMapping,
  translateWordDirect,
  getSupportedDirectPairs,
  // Transformer
  GrammarTransformer,
  parseStatement,
  toLocale,
  toEnglish,
  translate,
  examples as grammarExamples,
} from './grammar';
