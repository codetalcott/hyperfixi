/**
 * German voice vocabulary (bridge-era language, arc Phase 2). Grammar (SVO,
 * Latin script) comes from `@lokascript/semantic`'s German profile via the
 * framework bridge — one vocab file, no hand-authored profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const deVocabulary: DomainVocabulary = {
  keywords: {
    navigate: { primary: 'navigieren' },
    click: { primary: 'klicken' },
    type: { primary: 'eingeben' },
    scroll: { primary: 'scrollen' },
    read: { primary: 'lesen' },
    zoom: { primary: 'zoomen' },
    select: { primary: 'auswählen' },
    back: { primary: 'zurück' },
    forward: { primary: 'vorwärts' },
    focus: { primary: 'fokussieren' },
    close: { primary: 'schließen' },
    open: { primary: 'öffnen' },
    search: { primary: 'suchen' },
    help: { primary: 'hilfe' },
  },
  // Schema markers (destination→zu/in, quantity→um) + direction/target words.
  tokenizerKeywords: [
    'zu',
    'in',
    'um',
    'hoch',
    'runter',
    'links',
    'rechts',
    'rein',
    'raus',
    'zurücksetzen',
    'tab',
    'dialog',
    'seite',
    'alle',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
