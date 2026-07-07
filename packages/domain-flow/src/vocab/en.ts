/**
 * English FlowScript vocabulary. Grammar (SVO, Latin script) comes from
 * `@lokascript/semantic`'s English profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const enVocabulary: DomainVocabulary = {
  keywords: {
    fetch: { primary: 'fetch' },
    poll: { primary: 'poll' },
    stream: { primary: 'stream' },
    submit: { primary: 'submit' },
    transform: { primary: 'transform' },
    enter: { primary: 'enter' },
    follow: { primary: 'follow' },
    perform: { primary: 'perform' },
    capture: { primary: 'capture' },
  },
  // Schema marker words (as/into/every/to/with/item) + connectives.
  tokenizerKeywords: ['as', 'into', 'every', 'to', 'with', 'from', 'item'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
