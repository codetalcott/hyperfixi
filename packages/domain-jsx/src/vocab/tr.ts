/**
 * Turkish JSX vocabulary. Grammar (SOV, Latin script) comes from
 * `@lokascript/semantic`'s Turkish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const trVocabulary: DomainVocabulary = {
  keywords: {
    element: { primary: 'oge' },
    component: { primary: 'bilesen' },
    render: { primary: 'isle' },
    state: { primary: 'durum' },
    effect: { primary: 'etki' },
    fragment: { primary: 'parca' },
  },
  tokenizerKeywords: ['ile', 'e', 'baslangic', 'de', 'iceren', 'donduren', 'ozellik'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
