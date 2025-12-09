// packages/i18n/src/parser/sw.ts

import { sw } from '../dictionaries/sw';
import { createKeywordProvider } from './create-provider';
import type { KeywordProvider } from './types';

/**
 * Swahili (Kiswahili) keyword provider for the hyperscript parser.
 *
 * Enables parsing hyperscript written in Swahili:
 * - `kwenye bonyeza badilisha .active` → parses as `on click toggle .active`
 * - `kama kweli basi andika "Habari"` → parses as `if true then log "Hello"`
 *
 * Swahili is an SVO Bantu language with:
 * - Agglutinative verb morphology
 * - Noun class system (simplified for hyperscript keywords)
 * - Prepositions (unlike many other African languages)
 * - Subject-verb agreement (not relevant for hyperscript)
 *
 * Swahili is widely spoken in East Africa and serves as a lingua franca
 * for millions of speakers.
 *
 * @example
 * ```typescript
 * import { swKeywords } from '@hyperfixi/i18n/parser/sw';
 * import { Parser } from '@hyperfixi/core';
 *
 * const parser = new Parser({ keywords: swKeywords });
 * parser.parse('kwenye bonyeza badilisha .active');
 * ```
 */
export const swKeywords: KeywordProvider = createKeywordProvider(sw, 'sw', {
  allowEnglishFallback: true,
});

// Re-export for convenience
export { sw as swDictionary } from '../dictionaries/sw';
