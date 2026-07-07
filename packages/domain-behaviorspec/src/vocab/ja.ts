/**
 * Japanese BehaviorSpec vocabulary. Grammar (SOV) comes from
 * `@lokascript/semantic`'s Japanese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const jaVocabulary: DomainVocabulary = {
  keywords: {
    test: { primary: 'テスト' },
    given: { primary: '前提' },
    when: { primary: '操作' },
    expect: { primary: '期待' },
    after: { primary: '後' },
    not: { primary: '否定' },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
