/**
 * Spanish BehaviorSpec vocabulary. Grammar (SVO) comes from
 * `@lokascript/semantic`'s Spanish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const esVocabulary: DomainVocabulary = {
  keywords: {
    test: { primary: 'prueba' },
    given: { primary: 'dado' },
    when: { primary: 'cuando' },
    expect: { primary: 'esperar' },
    after: { primary: 'despues' },
    not: { primary: 'no' },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
