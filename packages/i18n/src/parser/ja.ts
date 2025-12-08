// packages/i18n/src/parser/ja.ts

import { ja } from '../dictionaries/ja';
import { createKeywordProvider } from './create-provider';
import type { KeywordProvider } from './types';

/**
 * Japanese keyword provider for the hyperscript parser.
 *
 * Enables parsing hyperscript written in Japanese:
 * - `クリック で 切り替え .active` → parses as `on click toggle .active`
 * - `もし 真 それから 記録 "こんにちは"` → parses as `if true then log "hello"`
 *
 * English keywords are also accepted (mixed mode), so:
 * - `click で 切り替え .active` also works (English `click` + Japanese `で`, `切り替え`)
 *
 * Japanese is a useful test case because:
 * - SOV word order (subject-object-verb) vs English SVO
 * - No articles (a, an, the)
 * - Unicode characters (tests tokenizer robustness)
 *
 * @example
 * ```typescript
 * import { jaKeywords } from '@hyperfixi/i18n/parser/ja';
 * import { Parser } from '@hyperfixi/core';
 *
 * const parser = new Parser({ keywords: jaKeywords });
 * parser.parse('クリック で 切り替え .active');
 * ```
 */
export const jaKeywords: KeywordProvider = createKeywordProvider(ja, 'ja', {
  allowEnglishFallback: true,
});

// Re-export for convenience
export { ja as jaDictionary } from '../dictionaries/ja';
