/**
 * Thai Grammar
 *
 * SVO word order, prepositions, Thai script.
 * Isolating language (like Chinese) with no inflection.
 */

import type { GrammarProfile } from './types';

export const thaiGrammar = {
  code: 'th',
  name: 'Thai',
  nativeName: 'ไทย',
  direction: 'ltr',
  script: 'thai',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: false, // Thai doesn't use spaces between words
  defaultVerbForm: 'base',
  verb: {
    position: 'second',
    subjectDrop: true,
  },
  possessive: {
    marker: 'ของ',
    markerPosition: 'between',
  },
  roleMarkers: {
    patient: { primary: '', position: 'before' }, // Thai is isolating - no case markers
    destination: { primary: 'ใน', alternatives: ['ไปยัง'], position: 'before' },
    source: { primary: 'จาก', position: 'before' },
    style: { primary: 'ด้วย', position: 'before' },
    // No `event` role marker: a command's event argument (`trigger foo` /
    // `send foo`) is an UNMARKED object in Thai, like every other SVO profile
    // (es/zh/id/…). `เมื่อ` is the temporal "when/on" marker and belongs only on
    // the event-HANDLER head — which uses `eventHandler.eventMarker` (below),
    // not this role marker. Carrying it here generated `ทริกเกอร์ เมื่อ {event}`,
    // which never matched the transformer's `ทริกเกอร์ {event}` → trigger/send
    // dropped (th behavior-draggable/removable/resizable/sortable lossy).
  },
  tokenization: {
    boundaryStrategy: 'character', // Character-based like Chinese/Japanese
  },
} satisfies GrammarProfile;
