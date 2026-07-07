/**
 * French JSX vocabulary. Grammar (SVO, Latin script) comes from
 * `@lokascript/semantic`'s French profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const frVocabulary: DomainVocabulary = {
  keywords: {
    element: { primary: 'element' },
    component: { primary: 'composant' },
    render: { primary: 'afficher' },
    state: { primary: 'etat' },
    effect: { primary: 'effet' },
    fragment: { primary: 'fragment' },
  },
  tokenizerKeywords: ['avec', 'dans', 'initial', 'sur', 'contenant', 'retournant', 'proprietes'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
