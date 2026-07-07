/**
 * German SQL vocabulary — added via the framework↔semantic bridge: this file
 * is the ONLY German-specific authoring in the domain (grammar comes from
 * `@lokascript/semantic`'s German profile).
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const deVocabulary: DomainVocabulary = {
  keywords: {
    select: { primary: 'auswählen', alternatives: ['wähle'] },
    // 'hinzufügen' mirrors semantic's `add` — the natural-verb alias.
    insert: { primary: 'einfügen', alternatives: ['hinzufügen'] },
    update: { primary: 'aktualisieren', alternatives: ['ändern'] },
    delete: { primary: 'löschen', alternatives: ['entfernen'] },
    get: { primary: 'holen' },
  },
  tokenizerKeywords: [
    'von',
    'in',
    'wo',
    'setzen',
    'werte',
    'limit',
    'und',
    'oder',
    'nicht',
    'null',
    'wahr',
    'falsch',
    'zwischen',
    'wie',
    'ist',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
