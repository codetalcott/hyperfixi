// packages/i18n/src/parser/ar.ts

import { ar } from '../dictionaries/ar';
import { createKeywordProvider } from './create-provider';
import type { KeywordProvider } from './types';

/**
 * Arabic keyword provider for the hyperscript parser.
 *
 * Enables parsing hyperscript written in Arabic:
 * - `على نقر بدل .active` → parses as `on click toggle .active`
 * - `إذا صحيح ثم سجل "مرحبا"` → parses as `if true then log "hello"`
 *
 * English keywords are also accepted (mixed mode), so:
 * - `على click بدل .active` also works (Arabic `على` + English `click`)
 *
 * Arabic is a crucial test case because:
 * - Right-to-left (RTL) script
 * - Different character set (Unicode Arabic block)
 * - Space-separated words with diacritics
 * - Tests parser's Unicode handling robustly
 *
 * Note: The parser handles RTL text correctly because tokenization
 * is based on whitespace/operator boundaries, not visual direction.
 *
 * @example
 * ```typescript
 * import { arKeywords } from '@lokascript/i18n/parser/ar';
 * import { Parser } from '@hyperfixi/core';
 *
 * const parser = new Parser({ keywords: arKeywords });
 * parser.parse('على نقر بدل .active');
 * ```
 */
export const arKeywords: KeywordProvider = createKeywordProvider(ar, 'ar', {
  allowEnglishFallback: true,
});

// Re-export for convenience
export { ar as arDictionary } from '../dictionaries/ar';
