/**
 * Arabic LLM vocabulary. Grammar (VSO, RTL, Arabic script) comes from
 * `@lokascript/semantic`'s Arabic profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const arVocabulary: DomainVocabulary = {
  keywords: {
    ask: { primary: 'اسأل' },
    summarize: { primary: 'لخّص' },
    analyze: { primary: 'حلّل' },
    translate: { primary: 'ترجم' },
  },
  tokenizerKeywords: ['من', 'ك', 'في', 'إلى'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
