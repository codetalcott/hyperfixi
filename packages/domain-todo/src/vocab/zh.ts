/**
 * Chinese todo vocabulary. Grammar (SVO, CJK script) comes from
 * `@lokascript/semantic`'s Chinese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const zhVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: '添加' },
    complete: { primary: '完成' },
    list: { primary: '列出' },
  },
  // Schema marker: list → '到'.
  tokenizerKeywords: ['到'],
};
