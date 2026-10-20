/**
 * Turkish Grammar
 *
 * SOV word order, case suffixes (agglutinative), space-separated.
 * Features vowel harmony and extensive suffixation.
 */

import type { GrammarProfile } from './types';

export const turkishGrammar = {
  code: 'tr',
  name: 'Turkish',
  nativeName: 'Türkçe',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SOV',
  markingStrategy: 'case-suffix',
  usesSpaces: true,
  verb: {
    position: 'end',
    suffixes: ['mek', 'mak', 'yor', 'di', 'miş'],
    subjectDrop: true,
  },
  // The locative written onto a Turkish word, in the form its harmony gives
  // (`tıklamada`, `değişiklikte`; M2 N4). Code keeps its suffix apart
  // (`keyup da`) until a reviewer picks a code word's harmony (FUSED_FORMS.md
  // Q2); the other case suffixes stay apart on code for the same reason.
  attachedMarkers: { markers: ['da', 'de', 'ta', 'te'] },
  possessive: {
    // Genitive suffix, spaced for tokenization like Turkish's other case
    // markers (i/e/de). i18n renders `#picker ın değer`; the parser matches
    // `ın` as the possessive marker. Vowel-harmony variants (in/un/ün) are not
    // distinguished — the generator emits the `ın` form for all owners.
    marker: 'ın',
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
  },
  roleMarkers: {
    patient: {
      primary: 'i',
      alternatives: ['ı', 'u', 'ü', 'yi', 'yı', 'yu', 'yü', 'ni', 'nı', 'nu', 'nü'],
      position: 'after',
    }, // Accusative (with buffer consonants y/n)
    destination: {
      primary: 'e',
      // Include both dative (e/a) and genitive (ın/in/un/ün) for possessive patterns
      // Genitive is used in "X's Y" patterns: #button ın .active = "#button's .active"
      alternatives: [
        'a',
        'ye',
        'ya',
        'ne',
        'na',
        'de',
        'da',
        'te',
        'ta',
        'ın',
        'in',
        'un',
        'ün',
        'nın',
        'nin',
        'nun',
        'nün',
      ],
      position: 'after',
    }, // Dative/Locative + Genitive (with buffer consonants)
    source: { primary: 'den', alternatives: ['dan', 'ten', 'tan'], position: 'after' }, // Ablative
    // `ile` is the free-standing instrumental the transformer actually emits
    // for with-phrases (`getir method:"POST" body:form ile`); the suffix
    // forms cover hand-written agglutinated variants.
    style: { primary: 'le', alternatives: ['la', 'yle', 'yla', 'ile'], position: 'after' }, // Instrumental
    event: { primary: 'i', alternatives: ['ı', 'u', 'ü'], position: 'after' }, // Event as accusative
  },
} satisfies GrammarProfile;
