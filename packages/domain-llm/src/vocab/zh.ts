/**
 * Chinese LLM vocabulary. Grammar (SVO, CJK script) comes from
 * `@lokascript/semantic`'s Chinese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const zhVocabulary: DomainVocabulary = {
  keywords: {
    ask: { primary: '提问' },
    summarize: { primary: '总结' },
    analyze: { primary: '分析' },
    translate: { primary: '翻译' },
  },
  tokenizerKeywords: ['从', '以', '用', '到'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
