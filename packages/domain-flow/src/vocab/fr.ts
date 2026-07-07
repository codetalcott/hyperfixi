/**
 * French FlowScript vocabulary. Grammar (SVO, Latin script) comes from
 * `@lokascript/semantic`'s French profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const frVocabulary: DomainVocabulary = {
  keywords: {
    fetch: { primary: 'récupérer' },
    poll: { primary: 'interroger' },
    stream: { primary: 'diffuser' },
    submit: { primary: 'soumettre' },
    transform: { primary: 'transformer' },
    enter: { primary: 'entrer' },
    follow: { primary: 'suivre' },
    perform: { primary: 'exécuter' },
    capture: { primary: 'capturer' },
  },
  // Schema marker words (comme/dans/chaque/vers/avec/élément) + connectives.
  tokenizerKeywords: ['comme', 'dans', 'chaque', 'vers', 'avec', 'de', 'élément'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
