// packages/i18n/src/parser/tr.ts

import { tr } from '../dictionaries/tr';
import { createKeywordProvider } from './create-provider';
import type { KeywordProvider } from './types';

/**
 * Turkish keyword provider for the hyperscript parser.
 *
 * Enables parsing hyperscript written in Turkish:
 * - `üzerinde tıklama değiştir .active` → parses as `on click toggle .active`
 * - `eğer doğru ise kaydet "merhaba"` → parses as `if true then log "hello"`
 *
 * English keywords are also accepted (mixed mode), so:
 * - `üzerinde click değiştir .active` also works (Turkish `üzerinde` + English `click`)
 *
 * Turkish is a useful test case because:
 * - SOV word order (Subject-Object-Verb)
 * - Agglutinative morphology with suffixes
 * - Vowel harmony rules
 * - Latin script with special characters (ı, ğ, ş, ç, ö, ü)
 * - Tests parser's handling of extended Latin characters
 *
 * @example
 * ```typescript
 * import { trKeywords } from '@hyperfixi/i18n/parser/tr';
 * import { Parser } from '@hyperfixi/core';
 *
 * const parser = new Parser({ keywords: trKeywords });
 * parser.parse('üzerinde tıklama değiştir .active');
 * ```
 */
export const trKeywords: KeywordProvider = createKeywordProvider(tr, 'tr', {
  allowEnglishFallback: true,
});

// Re-export for convenience
export { tr as trDictionary } from '../dictionaries/tr';
