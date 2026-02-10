// packages/i18n/src/parser/ko.ts

import { ko } from '../dictionaries/ko';
import { createKeywordProvider } from './create-provider';
import type { KeywordProvider } from './types';

/**
 * Korean keyword provider for the hyperscript parser.
 *
 * Enables parsing hyperscript written in Korean:
 * - `에 클릭 토글 .active` → parses as `on click toggle .active`
 * - `만약 참 그러면 로그 "안녕하세요"` → parses as `if true then log "hello"`
 *
 * English keywords are also accepted (mixed mode), so:
 * - `에 click 토글 .active` also works (Korean `에` + English `click`)
 *
 * Korean is a useful test case because:
 * - SOV word order (Subject-Object-Verb)
 * - Hangul script (syllabic blocks)
 * - Agglutinative morphology with particles
 * - Tests parser's Unicode handling with Korean characters
 *
 * @example
 * ```typescript
 * import { koKeywords } from '@lokascript/i18n/parser/ko';
 * import { Parser } from '@hyperfixi/core';
 *
 * const parser = new Parser({ keywords: koKeywords });
 * parser.parse('에 클릭 토글 .active');
 * ```
 */
export const koKeywords: KeywordProvider = createKeywordProvider(ko, 'ko', {
  allowEnglishFallback: true,
});

// Re-export for convenience
export { ko as koDictionary } from '../dictionaries/ko';
