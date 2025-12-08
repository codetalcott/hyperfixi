// packages/i18n/src/parser/index.ts

/**
 * Parser integration for multilingual hyperscript.
 *
 * This module provides KeywordProvider implementations that enable
 * the hyperscript parser to understand non-English keywords.
 *
 * @example
 * ```typescript
 * // Spanish
 * import { esKeywords } from '@hyperfixi/i18n/parser';
 * const parser = new Parser({ keywords: esKeywords });
 * parser.parse('en clic alternar .active');
 *
 * // Japanese
 * import { jaKeywords } from '@hyperfixi/i18n/parser';
 * const parser = new Parser({ keywords: jaKeywords });
 * parser.parse('クリック で 切り替え .active');
 *
 * // Custom locale
 * import { createKeywordProvider } from '@hyperfixi/i18n/parser';
 * import { fr } from '@hyperfixi/i18n/dictionaries';
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

// Locale management
export { LocaleManager, detectBrowserLocale } from './locale-manager';
