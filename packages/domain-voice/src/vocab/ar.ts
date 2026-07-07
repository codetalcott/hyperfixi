/**
 * Arabic voice vocabulary. Grammar (VSO, RTL, Arabic script) comes from
 * `@lokascript/semantic`'s Arabic profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const arVocabulary: DomainVocabulary = {
  keywords: {
    navigate: { primary: 'انتقل' },
    click: { primary: 'انقر' },
    type: { primary: 'اكتب' },
    scroll: { primary: 'تمرير' },
    read: { primary: 'اقرأ' },
    zoom: { primary: 'تكبير' },
    select: { primary: 'اختر' },
    back: { primary: 'رجوع' },
    forward: { primary: 'تقدم' },
    focus: { primary: 'ركز' },
    close: { primary: 'أغلق' },
    open: { primary: 'افتح' },
    search: { primary: 'ابحث' },
    help: { primary: 'مساعدة' },
  },
  tokenizerKeywords: [
    'إلى',
    'على',
    'في',
    'عن',
    'ب',
    'أعلى',
    'أسفل',
    'يسار',
    'يمين',
    'الكل',
    'الصفحة',
    'الحوار',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
