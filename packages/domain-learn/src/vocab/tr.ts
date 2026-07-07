/**
 * Turkish learn vocabulary (the 15 core verbs). Grammar comes from
 * `@lokascript/semantic`'s Turkish profile via the framework bridge;
 * morphology tables and sentence frames stay hand-authored in
 * `../profiles/tr.ts`.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const trVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'ekle', alternatives: ['eklemek'] },
    remove: { primary: 'kaldir', alternatives: ['kaldirmak'] },
    toggle: { primary: 'degistir', alternatives: ['degistirmek'] },
    put: { primary: 'koy', alternatives: ['koymak'] },
    set: { primary: 'ayarla', alternatives: ['ayarlamak'] },
    show: { primary: 'goster', alternatives: ['gostermek'] },
    hide: { primary: 'gizle', alternatives: ['gizlemek'] },
    get: { primary: 'al', alternatives: ['almak'] },
    wait: { primary: 'bekle', alternatives: ['beklemek'] },
    fetch: { primary: 'getir', alternatives: ['getirmek'] },
    send: { primary: 'gonder', alternatives: ['gondermek'] },
    go: { primary: 'git', alternatives: ['gitmek'] },
    increment: { primary: 'artir', alternatives: ['artirmak'] },
    decrement: { primary: 'azalt', alternatives: ['azaltmak'] },
    take: { primary: 'al', alternatives: ['almak'] },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
