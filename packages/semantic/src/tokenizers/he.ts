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

import type { LanguageToken, TokenKind, TokenStream } from '../types';
import {
  BaseTokenizer,
  TokenStreamImpl,
  createToken,
  createPosition,
  createUnicodeRangeClassifier,
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isAsciiIdentifierChar,
  isUrlStart,
  type KeywordEntry,
  type TimeUnitMapping,
} from './base';
import { hebrewProfile } from '../generators/profiles/hebrew';

// =============================================================================
// Hebrew Character Classification
// =============================================================================

/** Check if character is Hebrew (includes all Hebrew Unicode blocks). */
const isHebrew = createUnicodeRangeClassifier([
  [0x0590, 0x05ff], // Hebrew
  [0xfb1d, 0xfb4f], // Hebrew Presentation Forms
]);

// =============================================================================
// Hebrew Prefixes and Prepositions
// =============================================================================

/**
 * Hebrew prefix prepositions that attach to the following word.
 * These are common prefixes in Hebrew that modify meaning.
 * Reserved for future morphological analysis integration.
 *
 * Prefixes:
 * - ב (b') - in, at, with
 * - ל (l') - to, for
 * - מ (m') - from
 * - כ (k') - like, as
 * - ה (h') - definite article "the"
 * - ו (v') - conjunction "and"
 * - ש (sh') - relative pronoun "that"
 */

/**
 * Hebrew conjunctions.
 */
const CONJUNCTIONS = new Map<string, string>([
  ['ו', 'and'], // v' - conjunction "and"
]);

/**
 * Hebrew event marker prefixes that attach to event names.
 * These indicate "on/at/when" an event occurs.
 */
const EVENT_MARKER_PREFIXES = new Map<string, string>([
  ['ב', 'on'], // b' - "at/in/on" (event marker)
  ['כ', 'when'], // k' - "as/when" (temporal)
]);

/**
 * Hebrew event names that can follow event marker prefixes.
 */
const EVENT_NAMES = new Set([
  'לחיצה', // click
  'קליק', // click (loanword)
  'שליחה', // submit
  'הגשה', // submit (alternative)
  'ריחוף', // hover
  'מעבר', // hover/transition
  'שינוי', // change
  'עדכון', // update/change
  'קלט', // input
  'הזנה', // input (alternative)
  'מיקוד', // focus
  'טשטוש', // blur
  'טעינה', // load
  'גלילה', // scroll
]);

/**
 * Hebrew prepositions (standalone).
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
 * Extra keywords not covered by the profile.
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
  { native: 'טעינה', normalized: 'load' },
  { native: 'גלילה', normalized: 'scroll' },

  // References (feminine forms not in profile)
  { native: 'היא', normalized: 'it' }, // feminine "it"
  { native: 'הוא', normalized: 'it' }, // masculine "it"
  { native: 'את', normalized: 'you' }, // feminine "you"

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
// Hebrew Time Units
// =============================================================================

/**
 * Hebrew time unit patterns for number parsing.
 */
const HEBREW_TIME_UNITS: readonly TimeUnitMapping[] = [
  { pattern: 'מילישנייה', suffix: 'ms', length: 8, caseInsensitive: false },
  { pattern: 'מילישניות', suffix: 'ms', length: 9, caseInsensitive: false },
  { pattern: 'שניות', suffix: 's', length: 5, caseInsensitive: false },
  { pattern: 'שנייה', suffix: 's', length: 5, caseInsensitive: false },
  { pattern: 'דקות', suffix: 'm', length: 4, caseInsensitive: false },
  { pattern: 'דקה', suffix: 'm', length: 3, caseInsensitive: false },
  { pattern: 'שעות', suffix: 'h', length: 4, caseInsensitive: false },
  { pattern: 'שעה', suffix: 'h', length: 3, caseInsensitive: false },
];

// =============================================================================
// Hebrew Tokenizer Implementation
// =============================================================================

export class HebrewTokenizer extends BaseTokenizer {
  readonly language = 'he';
  readonly direction = 'rtl' as const;

  constructor() {
    super();
    this.initializeKeywordsFromProfile(hebrewProfile, HEBREW_EXTRAS);
  }

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      // Skip whitespace
      if (isWhitespace(input[pos])) {
        pos++;
        continue;
      }

      // Try CSS selector first (LTR island in RTL text)
      if (isSelectorStart(input[pos])) {
        // Check for event modifier first (.once, .debounce(), etc.)
        const modifierToken = this.tryEventModifier(input, pos);
        if (modifierToken) {
          tokens.push(modifierToken);
          pos = modifierToken.position.end;
          continue;
        }

        // Check for property access (obj.prop) vs CSS selector (.active)
        if (this.tryPropertyAccess(input, pos, tokens)) {
          pos++;
          continue;
        }

        const selectorToken = this.trySelector(input, pos);
        if (selectorToken) {
          tokens.push(selectorToken);
          pos = selectorToken.position.end;
          continue;
        }
      }

      // Try string literal
      if (isQuote(input[pos])) {
        const stringToken = this.tryString(input, pos);
        if (stringToken) {
          tokens.push(stringToken);
          pos = stringToken.position.end;
          continue;
        }
      }

      // Try URL (/path, ./path, http://, etc.)
      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      // Try number
      if (isDigit(input[pos])) {
        const numberToken = this.extractHebrewNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      // Try variable reference (:varname)
      const varToken = this.tryVariableRef(input, pos);
      if (varToken) {
        tokens.push(varToken);
        pos = varToken.position.end;
        continue;
      }

      // Try Hebrew preposition (multi-word first)
      const prepToken = this.tryPreposition(input, pos);
      if (prepToken) {
        tokens.push(prepToken);
        pos = prepToken.position.end;
        continue;
      }

      // Try Hebrew word (with prefix detection)
      if (isHebrew(input[pos])) {
        // Check for event marker prefix (ב, כ) attached to event name
        const eventMarkerResult = this.tryEventMarkerPrefix(input, pos);
        if (eventMarkerResult) {
          tokens.push(eventMarkerResult.marker);
          tokens.push(eventMarkerResult.event);
          pos = eventMarkerResult.event.position.end;
          continue;
        }

        // Check for conjunction prefix (ו) attached to following word
        const prefixResult = this.tryPrefixConjunction(input, pos);
        if (prefixResult) {
          tokens.push(prefixResult.conjunction);
          pos = prefixResult.conjunction.position.end;
          // Continue to let the next iteration extract the remaining word
          continue;
        }

        const wordToken = this.extractHebrewWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      // Try ASCII word (for mixed content)
      if (isAsciiIdentifierChar(input[pos])) {
        const asciiToken = this.extractAsciiWord(input, pos);
        if (asciiToken) {
          tokens.push(asciiToken);
          pos = asciiToken.position.end;
          continue;
        }
      }

      // Skip unknown character
      pos++;
    }

    return new TokenStreamImpl(tokens, 'he');
  }

  classifyToken(token: string): TokenKind {
    if (PREPOSITIONS.has(token)) return 'particle';
    if (this.isKeyword(token)) return 'keyword';
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

  /**
   * Try to match a Hebrew preposition.
   */
  private tryPreposition(input: string, pos: number): LanguageToken | null {
    // Check prepositions from longest to shortest
    const sortedPreps = Array.from(PREPOSITIONS).sort((a, b) => b.length - a.length);

    for (const prep of sortedPreps) {
      if (input.slice(pos, pos + prep.length) === prep) {
        // Check that it's a standalone word (followed by space or non-Hebrew)
        const nextPos = pos + prep.length;
        if (nextPos >= input.length || isWhitespace(input[nextPos]) || !isHebrew(input[nextPos])) {
          const token = createToken(prep, 'particle', createPosition(pos, nextPos));
          return {
            ...token,
            metadata: {
              prepositionValue: prep,
            },
          };
        }
      }
    }
    return null;
  }

  /**
   * Try to extract a prefix conjunction (ו - "and") that's attached to the following word.
   *
   * Hebrew conjunction prefix attaches directly to words without space:
   * - והחלף → ו + החלף (and + toggle)
   * - ולחיצה → ו + לחיצה (and + click)
   */
  private tryPrefixConjunction(input: string, pos: number): { conjunction: LanguageToken } | null {
    // CRITICAL: Check if the full word is a keyword BEFORE splitting
    let wordEnd = pos;
    while (wordEnd < input.length && isHebrew(input[wordEnd])) {
      wordEnd++;
    }
    const fullWord = input.slice(pos, wordEnd);

    // Check if full word is a keyword
    if (this.lookupKeyword(fullWord)) {
      return null; // Let extractHebrewWord handle it
    }

    // Check prepositions (they shouldn't be split)
    if (PREPOSITIONS.has(fullWord)) {
      return null;
    }

    // Check for conjunction prefix (ו)
    const char = input[pos];
    const conjEntry = CONJUNCTIONS.get(char);

    if (!conjEntry) return null;

    // Check if there's a following Hebrew character (prefix must be attached)
    const nextPos = pos + 1;
    if (nextPos >= input.length || !isHebrew(input[nextPos])) {
      return null; // Standalone conjunction or end of input
    }

    // Count remaining Hebrew characters to ensure meaningful word follows
    let remainingLength = 0;
    let checkPos = nextPos;
    while (checkPos < input.length && isHebrew(input[checkPos])) {
      remainingLength++;
      checkPos++;
    }

    // Require at least 2 characters after prefix to avoid false positives
    if (remainingLength < 2) {
      return null;
    }

    // Check if the remaining word is a keyword
    const afterPrefix = input.slice(nextPos, wordEnd);
    if (this.lookupKeyword(afterPrefix)) {
      // Split: conjunction + keyword
      return {
        conjunction: createToken(char, 'conjunction', createPosition(pos, nextPos), conjEntry),
      };
    }

    return null;
  }

  /**
   * Try to extract an event marker prefix (ב, כ) attached to an event name.
   *
   * Hebrew event markers attach directly to event names without space:
   * - בלחיצה → ב + לחיצה (on + click)
   * - כשינוי → כ + שינוי (when + change)
   *
   * Returns both the marker token and the event name token if successful.
   */
  private tryEventMarkerPrefix(
    input: string,
    pos: number
  ): { marker: LanguageToken; event: LanguageToken } | null {
    const char = input[pos];
    const markerNormalized = EVENT_MARKER_PREFIXES.get(char);

    if (!markerNormalized) return null;

    // Check if there's a following Hebrew character
    const nextPos = pos + 1;
    if (nextPos >= input.length || !isHebrew(input[nextPos])) {
      return null;
    }

    // Extract the word after the prefix
    let wordEnd = nextPos;
    while (wordEnd < input.length && isHebrew(input[wordEnd])) {
      wordEnd++;
    }
    const afterPrefix = input.slice(nextPos, wordEnd);

    // Check if it's a known event name
    if (EVENT_NAMES.has(afterPrefix)) {
      // Found event marker + event name: split into two tokens
      const markerToken = createToken(
        char,
        'keyword',
        createPosition(pos, nextPos),
        markerNormalized // normalized to 'on' or 'when'
      );

      // Look up the event name to get its normalized form
      const eventKeywordEntry = this.lookupKeyword(afterPrefix);
      const eventToken = eventKeywordEntry
        ? createToken(
            afterPrefix,
            'keyword',
            createPosition(nextPos, wordEnd),
            eventKeywordEntry.normalized
          )
        : createToken(afterPrefix, 'keyword', createPosition(nextPos, wordEnd));

      return { marker: markerToken, event: eventToken };
    }

    return null;
  }

  /**
   * Extract a Hebrew word.
   */
  private extractHebrewWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    // Extract Hebrew characters
    while (pos < input.length && isHebrew(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    // Check if it's a keyword
    const keywordEntry = this.lookupKeyword(word);
    if (keywordEntry) {
      return createToken(word, 'keyword', createPosition(startPos, pos), keywordEntry.normalized);
    }

    // Check if it's a preposition (with metadata for disambiguation)
    if (PREPOSITIONS.has(word)) {
      const token = createToken(word, 'particle', createPosition(startPos, pos));
      return {
        ...token,
        metadata: {
          prepositionValue: word,
        },
      };
    }

    // Try morphological normalization for prefix variations
    const morphToken = this.tryMorphKeywordMatch(word, startPos, pos);
    if (morphToken) return morphToken;

    // Not a keyword or recognized form, return as identifier
    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  /**
   * Extract an ASCII word.
   */
  private extractAsciiWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  /**
   * Extract a number, including Hebrew time unit suffixes.
   */
  private extractHebrewNumber(input: string, startPos: number): LanguageToken | null {
    return this.tryNumberWithTimeUnits(input, startPos, HEBREW_TIME_UNITS, {
      allowSign: false,
      skipWhitespace: true,
    });
  }
}

/**
 * Singleton instance.
 */
export const hebrewTokenizer = new HebrewTokenizer();
