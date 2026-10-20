/**
 * Quechua Grammar
 *
 * SOV word order, postpositions (suffixes), polysynthetic/agglutinative.
 * Indigenous language of the Andean region with rich morphology.
 */

import type { GrammarProfile } from './types';

export const quechuaGrammar = {
  code: 'qu',
  name: 'Quechua',
  nativeName: 'Runasimi',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SOV',
  markingStrategy: 'postposition',
  usesSpaces: true,
  verb: {
    position: 'end',
    subjectDrop: true,
  },
  possessive: {
    marker: '-pa', // Genitive suffix
    markerPosition: 'after-object',
  },
  roleMarkers: {
    patient: { primary: 'ta', position: 'after' },
    destination: { primary: 'man', alternatives: ['pa'], position: 'after' },
    source: { primary: 'manta', position: 'after' },
    style: { primary: 'wan', position: 'after' },
    event: { primary: 'pi', position: 'after' }, // Locative: event occurs "at" (pi)
  },
} satisfies GrammarProfile;
