/**
 * Turkish learn vocabulary (the 15 core verbs). Grammar comes from
 * `@lokascript/semantic`'s Turkish profile via the framework bridge;
 * morphology tables and sentence frames stay hand-authored in
 * `../profiles/tr.ts`.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

/**
 * Turkish was authored ASCII-folded — `kaldir` for `kaldır`, `goster` for
 * `göster`. That was never a tokenizer constraint (this package's own Turkish
 * tokenizer lists the correct spellings, and @lokascript/semantic's tr profile
 * has always been correct); it just meant a Turkish learner was shown, and had
 * to type, misspelled Turkish. `primary` is now real Turkish; the folded forms
 * stay as alternatives so anything already written against them still parses.
 */
export const trVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'ekle', alternatives: ['eklemek'] },
    remove: { primary: 'kaldır', alternatives: ['kaldırmak', 'kaldir', 'kaldirmak'] },
    toggle: { primary: 'değiştir', alternatives: ['değiştirmek', 'degistir', 'degistirmek'] },
    put: { primary: 'koy', alternatives: ['koymak'] },
    set: { primary: 'ayarla', alternatives: ['ayarlamak'] },
    show: { primary: 'göster', alternatives: ['göstermek', 'goster', 'gostermek'] },
    hide: { primary: 'gizle', alternatives: ['gizlemek'] },
    get: { primary: 'al', alternatives: ['almak'] },
    wait: { primary: 'bekle', alternatives: ['beklemek'] },
    fetch: { primary: 'getir', alternatives: ['getirmek'] },
    send: { primary: 'gönder', alternatives: ['göndermek', 'gonder', 'gondermek'] },
    go: { primary: 'git', alternatives: ['gitmek'] },
    increment: { primary: 'artır', alternatives: ['artırmak', 'artir', 'artirmak'] },
    decrement: { primary: 'azalt', alternatives: ['azaltmak'] },
    take: { primary: 'al', alternatives: ['almak'] },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
