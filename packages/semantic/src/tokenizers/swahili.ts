/**
 * Swahili Tokenizer
 *
 * Tokenizes Swahili (Kiswahili) hyperscript input.
 * Swahili characteristics:
 * - SVO word order
 * - Agglutinative morphology
 * - Noun class prefixes (m-, wa-, ki-, vi-, etc.)
 * - Verb prefixes for subject/object agreement
 * - No grammatical gender, but noun classes
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
} from './base';
import { swahiliProfile } from '../generators/profiles/swahili';

// =============================================================================
// Swahili Character Classification
// =============================================================================

const { isLetter: isSwahiliLetter, isIdentifierChar: isSwahiliIdentifierChar } =
  createLatinCharClassifiers(/[a-zA-Z]/);

// =============================================================================
// Swahili Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'kwa', // to, for, with, by
  'na', // and, with
  'katika', // in, at
  'kwenye', // on, at
  'kutoka', // from
  'hadi', // until, to
  'mpaka', // until, up to
  'kabla', // before
  'baada', // after
  'wakati', // during, when
  'bila', // without
  'kuhusu', // about
  'karibu', // near
  'mbele', // in front of
  'nyuma', // behind
  'ndani', // inside
  'nje', // outside
  'juu', // above, on
  'chini', // below, under
  'kati', // between
]);

// =============================================================================
// Swahili Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - Noun class possessive variants
 */
const SWAHILI_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'kweli', normalized: 'true' },
  { native: 'uongo', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'tupu', normalized: 'null' },
  { native: 'haijafafanuliwa', normalized: 'undefined' },

  // Positional
  { native: 'kwanza', normalized: 'first' },
  { native: 'mwisho', normalized: 'last' },
  { native: 'inayofuata', normalized: 'next' },
  { native: 'iliyopita', normalized: 'previous' },
  { native: 'karibu zaidi', normalized: 'closest' },
  { native: 'mzazi', normalized: 'parent' },

  // Events
  { native: 'bonyeza', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'ingiza', normalized: 'input' },
  { native: 'badiliko', normalized: 'change' },
  { native: 'wasilisha', normalized: 'submit' },
  { native: 'funguo chini', normalized: 'keydown' },
  { native: 'funguo juu', normalized: 'keyup' },
  { native: 'kipanya juu', normalized: 'mouseover' },
  { native: 'kipanya nje', normalized: 'mouseout' },
  { native: 'ukungu', normalized: 'blur' },
  { native: 'sogeza', normalized: 'scroll' },

  // Additional references
  { native: 'yenyewe', normalized: 'it' },
  { native: 'wangu', normalized: 'my' },
  { native: 'langu', normalized: 'my' },
  { native: 'changu', normalized: 'my' },

  // Time units
  { native: 'sekunde', normalized: 's' },
  { native: 'milisekunde', normalized: 'ms' },
  { native: 'dakika', normalized: 'm' },
  { native: 'saa', normalized: 'h' },

  // Additional synonyms and multi-word phrases
  { native: 'ondoa lenga', normalized: 'blur' },
  { native: 'piga simu', normalized: 'call' },
  { native: 'basi', normalized: 'then' },
  { native: 'mpaka', normalized: 'until' },
];

// =============================================================================
// Swahili Tokenizer Implementation
// =============================================================================

export class SwahiliTokenizer extends BaseTokenizer {
  readonly language = 'sw';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.initializeKeywordsFromProfile(swahiliProfile, SWAHILI_EXTRAS);
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

      if (isSwahiliLetter(input[pos])) {
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

    return new TokenStreamImpl(tokens, 'sw');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    if (PREPOSITIONS.has(lower)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
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

  private extractWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isSwahiliIdentifierChar(input[pos])) {
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

  private extractNumber(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let number = '';

    if (input[pos] === '-' || input[pos] === '+') {
      number += input[pos++];
    }

    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }

    if (pos < input.length && input[pos] === '.') {
      number += input[pos++];
      while (pos < input.length && isDigit(input[pos])) {
        number += input[pos++];
      }
    }

    let unitPos = pos;
    while (unitPos < input.length && isWhitespace(input[unitPos])) {
      unitPos++;
    }

    const remaining = input.slice(unitPos).toLowerCase();
    if (remaining.startsWith('milisekunde')) {
      number += 'ms';
      pos = unitPos + 11;
    } else if (remaining.startsWith('sekunde')) {
      number += 's';
      pos = unitPos + 7;
    } else if (remaining.startsWith('dakika')) {
      number += 'm';
      pos = unitPos + 6;
    } else if (remaining.startsWith('saa')) {
      number += 'h';
      pos = unitPos + 3;
    }

    if (!number || number === '-' || number === '+') return null;

    return createToken(number, 'literal', createPosition(startPos, pos));
  }
}

export const swahiliTokenizer = new SwahiliTokenizer();
