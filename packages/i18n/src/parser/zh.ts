// packages/i18n/src/parser/zh.ts

import { zh } from '../dictionaries/zh';
import { createKeywordProvider } from './create-provider';
import type { KeywordProvider } from './types';

/**
 * Chinese (Simplified) keyword provider for the hyperscript parser.
 *
 * Enables parsing hyperscript written in Chinese:
 * - `当 点击 切换 .active` → parses as `on click toggle .active`
 * - `如果 真 那么 日志 "你好"` → parses as `if true then log "hello"`
 *
 * English keywords are also accepted (mixed mode), so:
 * - `当 click 切换 .active` also works (Chinese `当` + English `click`)
 *
 * Chinese is a useful test case because:
 * - SVO word order (similar to English)
 * - Logographic script (Chinese characters)
 * - Isolating morphology (minimal inflection)
 * - Tests parser's Unicode handling with CJK characters
 * - Large developer population
 *
 * @example
 * ```typescript
 * import { zhKeywords } from '@lokascript/i18n/parser/zh';
 * import { Parser } from '@hyperfixi/core';
 *
 * const parser = new Parser({ keywords: zhKeywords });
 * parser.parse('当 点击 切换 .active');
 * ```
 */
export const zhKeywords: KeywordProvider = createKeywordProvider(zh, 'zh', {
  allowEnglishFallback: true,
});

// Re-export for convenience
export { zh as zhDictionary } from '../dictionaries/zh';
