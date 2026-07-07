/**
 * German learn vocabulary (the 15 core verbs). Grammar comes from
 * `@lokascript/semantic`'s German profile via the framework bridge;
 * morphology tables and sentence frames stay hand-authored in
 * `../profiles/de.ts`.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const deVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'hinzufügen' },
    remove: { primary: 'entfernen' },
    toggle: { primary: 'umschalten' },
    put: { primary: 'setzen' },
    set: { primary: 'festlegen' },
    show: { primary: 'anzeigen' },
    hide: { primary: 'verbergen' },
    get: { primary: 'abrufen' },
    wait: { primary: 'warten' },
    fetch: { primary: 'abrufen' },
    send: { primary: 'senden' },
    go: { primary: 'gehen' },
    increment: { primary: 'erhöhen' },
    decrement: { primary: 'verringern' },
    take: { primary: 'nehmen' },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
