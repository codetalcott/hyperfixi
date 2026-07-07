/**
 * English learn vocabulary (the 15 core verbs). Grammar comes from
 * `@lokascript/semantic`'s English profile via the framework bridge;
 * morphology tables and sentence frames stay hand-authored in
 * `../profiles/en.ts`.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const enVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'add' },
    remove: { primary: 'remove' },
    toggle: { primary: 'toggle' },
    put: { primary: 'put' },
    set: { primary: 'set' },
    show: { primary: 'show' },
    hide: { primary: 'hide' },
    get: { primary: 'get' },
    wait: { primary: 'wait' },
    fetch: { primary: 'fetch' },
    send: { primary: 'send' },
    go: { primary: 'go' },
    increment: { primary: 'increment' },
    decrement: { primary: 'decrement' },
    take: { primary: 'take' },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
