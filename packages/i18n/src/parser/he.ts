// packages/i18n/src/parser/he.ts

import { he } from '../dictionaries/he';
import { createKeywordProvider } from './create-provider';
import type { KeywordProvider } from './types';

/**
 * Hebrew keyword provider for the hyperscript parser.
 *
 * Enables parsing hyperscript written in Hebrew (RTL, SVO):
 * - `ב לחיצה מתג .active` → parses as `on click toggle .active`
 *
 * English keywords are also accepted (mixed mode).
 *
 * @example
 * ```typescript
 * import { heKeywords } from '@lokascript/i18n/parser/he';
 * import { Parser } from '@hyperfixi/core';
 *
 * const parser = new Parser({ keywords: heKeywords });
 * parser.parse('ב לחיצה מתג .active');
 * ```
 */
export const heKeywords: KeywordProvider = createKeywordProvider(he, 'he', {
  allowEnglishFallback: true,
});

// Re-export for convenience
export { he as heDictionary } from '../dictionaries/he';
