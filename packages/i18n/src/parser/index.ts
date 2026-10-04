// packages/i18n/src/parser/index.ts

/**
 * Parser integration for multilingual hyperscript.
 *
 * This module provides KeywordProvider implementations: each resolves a
 * locale's hyperscript keywords to canonical English and back.
 *
 * @example
 * ```typescript
 * // Spanish
 * import { esKeywords } from '@lokascript/i18n/parser';
 * esKeywords.resolve('alternar'); // 'toggle'
 *
 * // Japanese
 * import { jaKeywords } from '@lokascript/i18n/parser';
 * jaKeywords.resolve('切り替え'); // 'toggle'
 *
 * // Custom locale
 * import { createKeywordProvider } from '@lokascript/i18n/parser';
 * import { fr } from '@lokascript/i18n/dictionaries';
 * const frKeywords = createKeywordProvider(fr, 'fr');
 * ```
 */

// Types
export type { KeywordProvider, KeywordProviderOptions } from './types';

// Factory
export { createKeywordProvider, createEnglishProvider } from './create-provider';
export { ENGLISH_COMMANDS, ENGLISH_KEYWORDS, UNIVERSAL_ENGLISH_KEYWORDS } from './create-provider';

// Locale packs
export { esKeywords, esDictionary } from './es';
export { jaKeywords, jaDictionary } from './ja';
export { frKeywords, frDictionary } from './fr';
export { deKeywords, deDictionary } from './de';
export { arKeywords, arDictionary } from './ar';
export { koKeywords, koDictionary } from './ko';
export { zhKeywords, zhDictionary } from './zh';
export { trKeywords, trDictionary } from './tr';
export { idKeywords, idDictionary } from './id';
export { quKeywords, quDictionary } from './qu';
export { swKeywords, swDictionary } from './sw';
export { ptKeywords, ptDictionary } from './pt';
export { itKeywords, itDictionary } from './it';
export { viKeywords, viDictionary } from './vi';
export { plKeywords, plDictionary } from './pl';
export { ruKeywords, ruDictionary } from './ru';
export { ukKeywords, ukDictionary } from './uk';
export { hiKeywords, hiDictionary } from './hi';
export { bnKeywords, bnDictionary } from './bn';
export { thKeywords, thDictionary } from './th';
export { msKeywords, msDictionary } from './ms';
export { tlKeywords, tlDictionary } from './tl';
export { heKeywords, heDictionary } from './he';

// Locale management
export { LocaleManager, detectBrowserLocale } from './locale-manager';
