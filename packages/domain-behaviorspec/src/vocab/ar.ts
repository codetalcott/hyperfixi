/**
 * Arabic BehaviorSpec vocabulary. Grammar (VSO, RTL) comes from
 * `@lokascript/semantic`'s Arabic profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const arVocabulary: DomainVocabulary = {
  keywords: {
    test: { primary: 'اختبار' },
    given: { primary: 'بافتراض' },
    when: { primary: 'عندما' },
    expect: { primary: 'توقع' },
    after: { primary: 'بعد' },
    not: { primary: 'ليس' },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
