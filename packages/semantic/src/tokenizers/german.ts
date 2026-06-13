/**
 * German Tokenizer
 *
 * Tokenizes German hyperscript input.
 * German characteristics:
 * - SVO word order (V2 in main clauses, but SVO for our purposes)
 * - Space-separated words
 * - Prepositions
 * - Umlauts (ä, ö, ü) and ß
 * - Compound nouns
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { germanProfile } from '../generators/profiles/german';
import { GermanMorphologicalNormalizer } from './morphology/german-normalizer';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createGermanExtractors } from './extractors/german-keyword';

// =============================================================================
// German Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - Umlaut-free variants for accessibility
 * - Verb conjugation variants (imperatives)
 */
const GERMAN_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'wahr', normalized: 'true' },
  { native: 'falsch', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'undefiniert', normalized: 'undefined' },

  // Positional
  { native: 'erste', normalized: 'first' },
  { native: 'erster', normalized: 'first' },
  { native: 'erstes', normalized: 'first' },
  { native: 'letzte', normalized: 'last' },
  { native: 'letzter', normalized: 'last' },
  { native: 'letztes', normalized: 'last' },
  // 'nächste' means both "next" and "closest"; keyword-map insertion is last-wins,
  // so a second 'closest' entry here would shadow 'next' and break positional
  // expressions (`put X into next .y` — `next` is positional-capable, `closest`
  // is not). The locative `in nächste <form/>` scope guard accepts 'next' too
  // (POSITIONAL_OR_SCOPE_KEYWORDS), so normalizing to 'next' serves both readings.
  { native: 'nächste', normalized: 'next' },
  { native: 'nachste', normalized: 'next' },
  // The de dict emits the unambiguous `nächstgelegene` ("nearest-located") for
  // `closest` (it used to also emit `nächste`, which the line above swallows as
  // `next` — closest was unrecoverable, so closest .X resolved to the wrong
  // element). Distinct word → no shadowing of `next`; closest now round-trips.
  { native: 'nächstgelegene', normalized: 'closest' },
  { native: 'nachstgelegene', normalized: 'closest' },
  { native: 'vorherige', normalized: 'previous' },
  { native: 'eltern', normalized: 'parent' },

  // Events
  { native: 'klick', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'eingabe', normalized: 'input' },
  { native: 'änderung', normalized: 'change' },
  { native: 'anderung', normalized: 'change' },
  { native: 'absenden', normalized: 'submit' },
  { native: 'taste unten', normalized: 'keydown' },
  { native: 'taste oben', normalized: 'keyup' },
  { native: 'maus drüber', normalized: 'mouseover' },
  { native: 'maus druber', normalized: 'mouseover' },
  { native: 'maus weg', normalized: 'mouseout' },
  { native: 'fokus', normalized: 'focus' },
  { native: 'unschärfe', normalized: 'blur' },
  { native: 'unscharfe', normalized: 'blur' },
  { native: 'scrollen', normalized: 'scroll' },

  // Additional references
  { native: 'meine', normalized: 'my' },
  { native: 'meinen', normalized: 'my' },
  { native: 'ergebnis', normalized: 'result' },
  { native: 'ziel', normalized: 'target' },

  // Time units
  { native: 'sekunde', normalized: 's' },
  { native: 'sekunden', normalized: 's' },
  { native: 'millisekunde', normalized: 'ms' },
  { native: 'millisekunden', normalized: 'ms' },
  { native: 'minute', normalized: 'm' },
  { native: 'minuten', normalized: 'm' },
  { native: 'stunde', normalized: 'h' },
  { native: 'stunden', normalized: 'h' },

  // Umlaut-free variants (for user convenience)
  { native: 'hinzufugen', normalized: 'add' },
  { native: 'hinzufgen', normalized: 'add' },
  { native: 'loschen', normalized: 'remove' },
  { native: 'anhangen', normalized: 'append' },
  { native: 'erhohen', normalized: 'increment' },
  { native: 'ubergang', normalized: 'transition' },
  { native: 'auslosen', normalized: 'trigger' },
  { native: 'zuruckgeben', normalized: 'return' },
  { native: 'anschliessend', normalized: 'then' },

  // Verb conjugation variants (imperatives for test cases)
  { native: 'erhöhe', normalized: 'increment' },
  { native: 'erhohe', normalized: 'increment' },
  { native: 'verringere', normalized: 'decrement' },
];

// =============================================================================
// German Tokenizer Implementation
// =============================================================================

export class GermanTokenizer extends BaseTokenizer {
  readonly language = 'de';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.initializeKeywordsFromProfile(germanProfile, GERMAN_EXTRAS);
    this.normalizer = new GermanMorphologicalNormalizer();

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractors(createGermanExtractors()); // German keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(token: string): TokenKind {
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(token)) return 'keyword';
    // Check for event modifiers before CSS selectors
    if (/^\.(once|prevent|stop|debounce|throttle|queue)(\(.*\))?$/.test(token))
      return 'event-modifier';
    if (
      token.startsWith('#') ||
      token.startsWith('.') ||
      token.startsWith('[') ||
      token.startsWith('*') ||
      token.startsWith('<')
    )
      return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    return 'identifier';
  }

  // extractWord() and extractNumber() methods removed
  // Now handled by GermanKeywordExtractor and NumberExtractor (context-aware)
}

export const germanTokenizer = new GermanTokenizer();
