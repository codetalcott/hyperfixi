/**
 * Hindi Grammar
 *
 * SOV word order, postpositions (को, में, पर, से, etc.), Devanagari script.
 * Fusional language with verb conjugation patterns.
 */

import type { GrammarProfile } from './types';

export const hindiGrammar = {
  code: 'hi',
  name: 'Hindi',
  nativeName: 'हिन्दी',
  direction: 'ltr',
  script: 'devanagari',
  wordOrder: 'SOV',
  markingStrategy: 'postposition',
  usesSpaces: true,
  // Hindi uses imperative forms for commands in software UI
  defaultVerbForm: 'imperative',
  verb: {
    position: 'end',
    suffixes: ['ें', 'ा', 'ी', 'े', 'ो'],
    subjectDrop: true,
  },
  possessive: {
    marker: 'का',
    markerPosition: 'between',
  },
  roleMarkers: {
    patient: { primary: 'को', position: 'after' },
    // `को` is the accusative/patient marker only — NOT a destination alternative.
    // Listing it here made a `को`-marked patient mis-parse as a destination, the
    // dominant source of phantom `into` commands in hi (precision audit 2026-06-15).
    destination: { primary: 'में', alternatives: ['पर'], position: 'after' },
    source: { primary: 'से', position: 'after' },
    style: { primary: 'से', position: 'after' },
    event: { primary: 'पर', position: 'after' },
  },
  tokenization: {
    particles: ['को', 'में', 'पर', 'से', 'का', 'की', 'के', 'तक', 'ने'],
    boundaryStrategy: 'space',
  },
} satisfies GrammarProfile;
