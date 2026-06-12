/**
 * Hebrew Tokenizer
 *
 * Tokenizes Hebrew hyperscript input.
 * Hebrew is challenging because:
 * - Right-to-left (RTL) text direction
 * - Prefix prepositions that attach to words (ב, ל, מ, כ, ה, ו, ש)
 * - Optional vowel points (nikkud) typically omitted in modern text
 * - CSS selectors are LTR islands within RTL text
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { hebrewProfile } from '../generators/profiles/he';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createHebrewExtractors } from './extractors/hebrew-keyword';
import { createHebrewProcliticExtractor } from './extractors/hebrew-proclitic';
import { AsciiIdentifierExtractor } from './extractors/ascii-identifier';

// =============================================================================
// Hebrew Prepositions (used in classifyToken)
// =============================================================================

/**
 * Hebrew prepositions (standalone).
 * Note: Prefix prepositions (ב, ל, מ, etc.) are handled by HebrewProcliticExtractor.
 */
const PREPOSITIONS = new Set([
  'על', // al (on, upon)
  'את', // et (direct object marker)
  'אל', // el (to, toward)
  'מן', // min (from)
  'עם', // im (with)
  'בתוך', // betoch (inside)
  'מתוך', // mitoch (from inside)
  'ליד', // leyad (next to)
  'אחרי', // acharey (after)
  'לפני', // lifney (before)
  'בין', // beyn (between)
  'עד', // ad (until)
  'של', // shel (of - possessive)
]);

// =============================================================================
// Hebrew Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Time units (שנייה, דקה, שעה with suffixes)
 * - Reference alternatives (היא, הוא, את)
 *
 * All other keywords (positional, events, commands, logical operators,
 * multi-word phrases) are now in the profile.
 */
const HEBREW_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'אמת', normalized: 'true' },
  { native: 'שקר', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'ריק', normalized: 'null' },
  { native: 'לא מוגדר', normalized: 'undefined' },

  // Positional
  { native: 'ראשון', normalized: 'first' },
  { native: 'אחרון', normalized: 'last' },
  { native: 'הבא', normalized: 'next' },
  { native: 'הקודם', normalized: 'previous' },
  { native: 'הקרוב', normalized: 'closest' },
  { native: 'הורה', normalized: 'parent' },

  // Events
  { native: 'לחיצה', normalized: 'click' },
  { native: 'קליק', normalized: 'click' },
  { native: 'קלט', normalized: 'input' },
  { native: 'שינוי', normalized: 'change' },
  { native: 'שליחה', normalized: 'submit' },
  { native: 'מיקוד', normalized: 'focus' },
  { native: 'טשטוש', normalized: 'blur' },
  { native: 'לחיצת מקש', normalized: 'keydown' },
  { native: 'שחרור מקש', normalized: 'keyup' },
  { native: 'מעבר עכבר', normalized: 'mouseover' },
  { native: 'יציאת עכבר', normalized: 'mouseout' },
  // Standard DOM event names commonly written in English even in Hebrew code.
  // The i18n dictionary has no Hebrew form for these, so the grammar
  // transformer passes them through verbatim — register them so the emitted
  // `ב load …` / `ב scroll …` handlers tokenize the event token.
  { native: 'load', normalized: 'load' },
  { native: 'resize', normalized: 'resize' },
  { native: 'scroll', normalized: 'scroll' },
  { native: 'keydown', normalized: 'keydown' },
  { native: 'keyup', normalized: 'keyup' },
  { native: 'mousedown', normalized: 'mousedown' },
  { native: 'mouseup', normalized: 'mouseup' },
  { native: 'טעינה', normalized: 'load' },
  { native: 'גלילה', normalized: 'scroll' },

  // References (feminine forms not in profile)
  { native: 'היא', normalized: 'it' }, // feminine "it"
  { native: 'הוא', normalized: 'it' }, // masculine "it"
  // את is deliberately NOT mapped to 'you' (the feminine-you homonym): the
  // transformer emits את exclusively as the ACCUSATIVE marker (`שלח את
  // refresh`) — profile roleMarkers.patient.primary — and the you-reading
  // poisoned every verb+את clause (send/trigger/tell/wait/add: the 15-lossy
  // he tail). PREPOSITIONS above keeps it tokenizing as the object particle.

  // Time units
  { native: 'שנייה', normalized: 's' },
  { native: 'שניות', normalized: 's' },
  { native: 'מילישנייה', normalized: 'ms' },
  { native: 'דקה', normalized: 'm' },
  { native: 'דקות', normalized: 'm' },
  { native: 'שעה', normalized: 'h' },
  { native: 'שעות', normalized: 'h' },
];

// =============================================================================
// Hebrew Tokenizer Implementation
// =============================================================================

export class HebrewTokenizer extends BaseTokenizer {
  readonly language = 'he';
  readonly direction = 'rtl' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(hebrewProfile, HEBREW_EXTRAS);
    // Note: Hebrew doesn't have a morphological normalizer yet

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractor(new AsciiIdentifierExtractor()); // ASCII identifiers (for mixed content)
    this.registerExtractor(createHebrewProcliticExtractor()); // Hebrew proclitics (MUST come before keywords)
    this.registerExtractors(createHebrewExtractors()); // Hebrew keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)
  // NOTE: do NOT drop את from the stream — ~40 generated he patterns embed it
  // as a required literal before {patient}. The send/trigger/tell/wait gap is
  // covered by את-tolerant handcrafted patterns instead (patterns/he-accusative).

  classifyToken(token: string): TokenKind {
    if (PREPOSITIONS.has(token)) return 'particle';
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
    if (['==', '!=', '<=', '>=', '<', '>', '&&', '||', '!'].includes(token)) return 'operator';

    return 'identifier';
  }

  // tryPreposition(), tryPrefixConjunction(), tryEventMarkerPrefix(),
  // extractHebrewWord(), extractAsciiWord(), extractHebrewNumber() methods removed
  // Now handled by HebrewProcliticExtractor and HebrewKeywordExtractor (context-aware)
}

/**
 * Singleton instance.
 */
export const hebrewTokenizer = new HebrewTokenizer();
