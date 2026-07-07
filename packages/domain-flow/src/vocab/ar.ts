/**
 * Arabic FlowScript vocabulary. Grammar (VSO, RTL, Arabic script) comes from
 * `@lokascript/semantic`'s Arabic profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const arVocabulary: DomainVocabulary = {
  keywords: {
    fetch: { primary: 'جلب' },
    poll: { primary: 'استطلع' },
    stream: { primary: 'بث' },
    submit: { primary: 'أرسل' },
    transform: { primary: 'حوّل' },
    enter: { primary: 'ادخل' },
    follow: { primary: 'اتبع' },
    perform: { primary: 'نفّذ' },
    capture: { primary: 'التقط' },
  },
  // Schema marker words (ك/في/كل/إلى/ب/عنصر) + connectives.
  tokenizerKeywords: ['ك', 'في', 'كل', 'إلى', 'ب', 'من', 'عنصر'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
