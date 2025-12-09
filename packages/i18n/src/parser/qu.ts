// packages/i18n/src/parser/qu.ts

import { qu } from '../dictionaries/qu';
import { createKeywordProvider } from './create-provider';
import type { KeywordProvider } from './types';

/**
 * Quechua (Runasimi) keyword provider for the hyperscript parser.
 *
 * Enables parsing hyperscript written in Quechua:
 * - `ñitiy-pi yapay #count-ta` → parses as `on click increment #count`
 *
 * Quechua is an SOV language with:
 * - Agglutinative/polysynthetic morphology
 * - Extensive suffix system (case markers: -ta, -man, -pi, -manta, -wan)
 * - Postpositions (unlike Spanish which uses prepositions)
 * - Object-Verb word order
 * - Evidentiality markers (not used in hyperscript)
 *
 * The grammar transformer handles suffix joining via hyphen notation
 * (e.g., "#count-ta" attaches the accusative marker).
 *
 * @example
 * ```typescript
 * import { quKeywords } from '@hyperfixi/i18n/parser/qu';
 * import { Parser } from '@hyperfixi/core';
 *
 * const parser = new Parser({ keywords: quKeywords });
 * parser.parse('ñitiy-pi yapay #count-ta');
 * ```
 */
export const quKeywords: KeywordProvider = createKeywordProvider(qu, 'qu', {
  allowEnglishFallback: true,
});

// Re-export for convenience
export { qu as quDictionary } from '../dictionaries/qu';
