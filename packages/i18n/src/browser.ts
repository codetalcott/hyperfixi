/**
 * Browser entry point for @hyperfixi/i18n
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
 * import { esKeywords } from '@hyperfixi/i18n';
 * import { Parser } from '@hyperfixi/core';
 *
 * const parser = new Parser(tokens, { keywords: esKeywords });
 * ```
 */

// Types
export type { KeywordProvider, KeywordProviderOptions } from './parser/types';

// Factory functions
export { createKeywordProvider, createEnglishProvider } from './parser/create-provider';
export { ENGLISH_COMMANDS, ENGLISH_KEYWORDS, UNIVERSAL_ENGLISH_KEYWORDS } from './parser/create-provider';

// Locale keyword providers
export { esKeywords, esDictionary } from './parser/es';
export { jaKeywords, jaDictionary } from './parser/ja';
export { frKeywords, frDictionary } from './parser/fr';
export { deKeywords, deDictionary } from './parser/de';
export { arKeywords, arDictionary } from './parser/ar';
export { koKeywords, koDictionary } from './parser/ko';
export { zhKeywords, zhDictionary } from './parser/zh';
export { trKeywords, trDictionary } from './parser/tr';

// Locale management
export { LocaleManager, detectBrowserLocale } from './parser/locale-manager';

// Re-export dictionaries for custom provider creation
export { es } from './dictionaries/es';
export { ja } from './dictionaries/ja';
export { fr } from './dictionaries/fr';
export { de } from './dictionaries/de';
export { ar } from './dictionaries/ar';
export { ko } from './dictionaries/ko';
export { zh } from './dictionaries/zh';
export { tr } from './dictionaries/tr';
