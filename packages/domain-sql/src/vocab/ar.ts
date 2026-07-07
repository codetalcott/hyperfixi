/**
 * Arabic SQL vocabulary. Grammar (VSO, RTL, Arabic script) comes from
 * `@lokascript/semantic`'s Arabic profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const arVocabulary: DomainVocabulary = {
  keywords: {
    select: { primary: 'اختر' },
    insert: { primary: 'أدخل', alternatives: ['أضف'] },
    update: { primary: 'حدّث', alternatives: ['غيّر'] },
    delete: { primary: 'احذف', alternatives: ['أزل'] },
    get: { primary: 'اجلب' },
  },
  tokenizerKeywords: [
    'من',
    'في',
    'حيث',
    'عيّن',
    'قيم',
    'حد',
    'و',
    'أو',
    'ليس',
    'فارغ',
    'بين',
    'مثل',
    'ضمن',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
