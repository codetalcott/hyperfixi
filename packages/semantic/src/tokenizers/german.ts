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

import type { LanguageToken, TokenKind, TokenStream } from '../types';
import {
  BaseTokenizer,
  TokenStreamImpl,
  createToken,
  createPosition,
  createLatinCharClassifiers,
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isUrlStart,
  type KeywordEntry,
  type TimeUnitMapping,
} from './base';
import { germanProfile } from '../generators/profiles/german';

// =============================================================================
// German Character Classification
// =============================================================================

const { isLetter: isGermanLetter, isIdentifierChar: isGermanIdentifierChar } =
  createLatinCharClassifiers(/[a-zA-ZäöüÄÖÜß]/);

// =============================================================================
// German Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'an', // at, on
  'auf', // on
  'aus', // from, out of
  'bei', // at, near
  'durch', // through
  'für', // for
  'fur', // for (no umlaut)
  'gegen', // against
  'in', // in
  'mit', // with
  'nach', // after, to
  'ohne', // without
  'seit', // since
  'über', // over, about
  'uber', // over (no umlaut)
  'um', // around, at
  'unter', // under
  'von', // from, of
  'vor', // before, in front of
  'zu', // to
  'zwischen', // between
  'bis', // until
  'gegenüber', // opposite
  'gegenuber', // opposite (no umlaut)
  'während', // during
  'wahrend', // during (no umlaut)
  'wegen', // because of
  'trotz', // despite
  'statt', // instead of
  'innerhalb', // inside
  'außerhalb', // outside
  'ausserhalb', // outside (no umlaut)
]);

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
  { native: 'nächste', normalized: 'next' },
  { native: 'nachste', normalized: 'next' },
  { native: 'vorherige', normalized: 'previous' },
  { native: 'nächste', normalized: 'closest' },
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
// German Time Units
// =============================================================================

/**
 * German time unit patterns for number parsing.
 * Sorted by length (longest first) to ensure correct matching.
 */
const GERMAN_TIME_UNITS: readonly TimeUnitMapping[] = [
  { pattern: 'millisekunden', suffix: 'ms', length: 13, caseInsensitive: true },
  { pattern: 'millisekunde', suffix: 'ms', length: 12, caseInsensitive: true },
  { pattern: 'sekunden', suffix: 's', length: 8, caseInsensitive: true },
  { pattern: 'sekunde', suffix: 's', length: 7, caseInsensitive: true },
  { pattern: 'minuten', suffix: 'm', length: 7, caseInsensitive: true },
  { pattern: 'minute', suffix: 'm', length: 6, caseInsensitive: true },
  { pattern: 'stunden', suffix: 'h', length: 7, caseInsensitive: true },
  { pattern: 'stunde', suffix: 'h', length: 6, caseInsensitive: true },
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
  }

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      if (isWhitespace(input[pos])) {
        pos++;
        continue;
      }

      if (isSelectorStart(input[pos])) {
        // Check for event modifier first (.once, .debounce(), etc.)
        const modifierToken = this.tryEventModifier(input, pos);
        if (modifierToken) {
          tokens.push(modifierToken);
          pos = modifierToken.position.end;
          continue;
        }

        const selectorToken = this.trySelector(input, pos);
        if (selectorToken) {
          tokens.push(selectorToken);
          pos = selectorToken.position.end;
          continue;
        }
      }

      if (isQuote(input[pos])) {
        const stringToken = this.tryString(input, pos);
        if (stringToken) {
          tokens.push(stringToken);
          pos = stringToken.position.end;
          continue;
        }
      }

      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      if (
        isDigit(input[pos]) ||
        (input[pos] === '-' && pos + 1 < input.length && isDigit(input[pos + 1]))
      ) {
        const numberToken = this.extractNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      const varToken = this.tryVariableRef(input, pos);
      if (varToken) {
        tokens.push(varToken);
        pos = varToken.position.end;
        continue;
      }

      if (isGermanLetter(input[pos])) {
        const wordToken = this.extractWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      const operatorToken = this.tryOperator(input, pos);
      if (operatorToken) {
        tokens.push(operatorToken);
        pos = operatorToken.position.end;
        continue;
      }

      pos++;
    }

    return new TokenStreamImpl(tokens, 'de');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    if (PREPOSITIONS.has(lower)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    return 'identifier';
  }

  private extractWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isGermanIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();

    // O(1) Map lookup instead of O(n) array search
    const keywordEntry = this.lookupKeyword(lower);
    if (keywordEntry) {
      return createToken(word, 'keyword', createPosition(startPos, pos), keywordEntry.normalized);
    }

    if (PREPOSITIONS.has(lower)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
    }

    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  /**
   * Extract a number, including German time unit suffixes.
   */
  private extractNumber(input: string, startPos: number): LanguageToken | null {
    return this.tryNumberWithTimeUnits(input, startPos, GERMAN_TIME_UNITS, {
      allowSign: true,
      skipWhitespace: true,
    });
  }
}

export const germanTokenizer = new GermanTokenizer();
