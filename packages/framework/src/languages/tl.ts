/**
 * Tagalog Grammar
 *
 * VSO word order, prepositions, space-separated.
 */

import type { GrammarProfile } from './types';

export const tagalogGrammar = {
  code: 'tl',
  name: 'Tagalog',
  nativeName: 'Tagalog',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'VSO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  defaultVerbForm: 'base',
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  possessive: {
    marker: 'ng', // Linker used in possessive constructions
    markerPosition: 'between',
  },
  roleMarkers: {
    // `bago` (before) / `matapos` (after) are positional destination markers for
    // `put X before/after Y`, mirroring how Arabic lists قبل/بعد as destination
    // alternatives. Without them the generated put pattern can't match a
    // before/after target.
    destination: { primary: 'sa', alternatives: ['bago', 'matapos'], position: 'before' }, // "to/into"
    source: { primary: 'mula_sa', position: 'before' }, // "from"
    patient: { primary: '', position: 'before' },
    style: { primary: 'nang', position: 'before' }, // manner marker
  },
} satisfies GrammarProfile;
