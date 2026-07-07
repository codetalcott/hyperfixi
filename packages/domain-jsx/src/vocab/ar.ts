/**
 * Arabic JSX vocabulary. Grammar (VSO, RTL, Arabic script) comes from
 * `@lokascript/semantic`'s Arabic profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const arVocabulary: DomainVocabulary = {
  keywords: {
    element: { primary: 'عنصر' },
    component: { primary: 'مكوّن' },
    render: { primary: 'ارسم' },
    state: { primary: 'حالة' },
    effect: { primary: 'تأثير' },
    fragment: { primary: 'جزء' },
  },
  tokenizerKeywords: ['مع', 'في', 'ابتدائي', 'عند', 'يحتوي', 'يُرجع'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
