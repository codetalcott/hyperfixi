/**
 * English JSX vocabulary — the only thing authored per language.
 * Grammar (word order, script) comes from `@lokascript/semantic`'s English
 * profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const enVocabulary: DomainVocabulary = {
  keywords: {
    element: { primary: 'element' },
    component: { primary: 'component' },
    render: { primary: 'render' },
    state: { primary: 'state' },
    effect: { primary: 'effect' },
    fragment: { primary: 'fragment' },
  },
  // Schema marker words (props→with, children→containing/returning,
  // destination→into, initial→initial, deps→on). The bridge never sees schemas.
  tokenizerKeywords: ['with', 'into', 'initial', 'on', 'containing', 'returning'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
