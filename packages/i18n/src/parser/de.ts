// packages/i18n/src/parser/de.ts

import { de } from '../dictionaries/de';
import { createKeywordProvider } from './create-provider';
import type { KeywordProvider } from './types';

/**
 * German keyword provider for the hyperscript parser.
 *
 * Enables parsing hyperscript written in German:
 * - `bei klick umschalten .active` → parses as `on click toggle .active`
 * - `wenn wahr dann protokollieren "hallo"` → parses as `if true then log "hello"`
 *
 * English keywords are also accepted (mixed mode), so:
 * - `bei click umschalten .active` also works (German `bei` + English `click`)
 *
 * German is a useful test case because:
 * - Compound words (Zusammensetzungen) are common
 * - Different word order in clauses (V2 in main, V-final in subordinate)
 * - Case system (nominative, accusative, dative, genitive)
 *
 * @example
 * ```typescript
 * import { deKeywords } from '@hyperfixi/i18n/parser/de';
 * import { Parser } from '@hyperfixi/core';
 *
 * const parser = new Parser({ keywords: deKeywords });
 * parser.parse('bei klick umschalten .active');
 * ```
 */
export const deKeywords: KeywordProvider = createKeywordProvider(de, 'de', {
  allowEnglishFallback: true,
});

// Re-export for convenience
export { de as deDictionary } from '../dictionaries/de';
