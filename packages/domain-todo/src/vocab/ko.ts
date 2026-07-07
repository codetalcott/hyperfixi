/**
 * Korean todo vocabulary. Grammar (SOV, particles, Hangul script) comes from
 * `@lokascript/semantic`'s Korean profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const koVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: '추가' },
    complete: { primary: '완료' },
    list: { primary: '목록' },
  },
  // Schema marker particles: item → '를', list → '에'.
  tokenizerKeywords: ['를', '에'],
};
