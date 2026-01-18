/**
 * Ukrainian Tokenizer
 *
 * Tokenizes Ukrainian hyperscript input.
 * Ukrainian characteristics:
 * - SVO word order (relatively free, but SVO is common)
 * - Space-separated words
 * - Prepositions
 * - Cyrillic alphabet (with unique letters і, ї, є, ґ)
 * - Fusional morphology with verb conjugations
 * - Imperative form used in software UI (infinitive also common)
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
import { ukrainianProfile } from '../generators/profiles/ukrainian';

// =============================================================================
// Ukrainian Character Classification
// =============================================================================

const { isLetter: isUkrainianLetter, isIdentifierChar: isUkrainianIdentifierChar } =
  createLatinCharClassifiers(/[a-zA-Zа-яА-ЯіІїЇєЄґҐьЬ']/);

// =============================================================================
// Ukrainian Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'в', // in
  'у', // in
  'на', // on
  'з', // with, from
  'із', // with (variant)
  'зі', // with (before consonant clusters)
  'до', // to
  'від', // from
  'о', // about
  'об', // about (before vowels)
  'при', // at, during
  'для', // for
  'під', // under
  'над', // above
  'перед', // in front of
  'між', // between
  'через', // through
  'без', // without
  'по', // along, by
  'за', // behind, for
  'про', // about
  'після', // after
  'навколо', // around
  'проти', // against
  'замість', // instead of
  'крім', // except
  'серед', // among
  'к', // to (less common)
]);

// =============================================================================
// Ukrainian Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false)
 * - Positional words
 * - Event names
 * - Time units
 * - Additional verb forms
 */
const UKRAINIAN_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'істина', normalized: 'true' },
  { native: 'правда', normalized: 'true' },
  { native: 'хибність', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'невизначено', normalized: 'undefined' },

  // Positional
  { native: 'перший', normalized: 'first' },
  { native: 'перша', normalized: 'first' },
  { native: 'перше', normalized: 'first' },
  { native: 'останній', normalized: 'last' },
  { native: 'остання', normalized: 'last' },
  { native: 'останнє', normalized: 'last' },
  { native: 'наступний', normalized: 'next' },
  { native: 'наступна', normalized: 'next' },
  { native: 'попередній', normalized: 'previous' },
  { native: 'попередня', normalized: 'previous' },
  { native: 'найближчий', normalized: 'closest' },
  { native: 'батько', normalized: 'parent' },

  // Events
  { native: 'клік', normalized: 'click' },
  { native: 'натискання', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'зміна', normalized: 'change' },
  { native: 'надсилання', normalized: 'submit' },
  { native: 'клавіша', normalized: 'keydown' },
  { native: 'наведення', normalized: 'mouseover' },
  { native: 'відведення', normalized: 'mouseout' },
  { native: 'завантаження', normalized: 'load' },
  { native: 'прокрутка', normalized: 'scroll' },
  { native: 'введення', normalized: 'input' },

  // References - possessive forms
  { native: 'мій', normalized: 'my' },
  { native: 'моя', normalized: 'my' },
  { native: 'моє', normalized: 'my' },
  { native: 'мої', normalized: 'my' },

  // Time units
  { native: 'секунда', normalized: 's' },
  { native: 'секунди', normalized: 's' },
  { native: 'секунд', normalized: 's' },
  { native: 'мілісекунда', normalized: 'ms' },
  { native: 'мілісекунди', normalized: 'ms' },
  { native: 'мілісекунд', normalized: 'ms' },
  { native: 'хвилина', normalized: 'm' },
  { native: 'хвилини', normalized: 'm' },
  { native: 'хвилин', normalized: 'm' },
  { native: 'година', normalized: 'h' },
  { native: 'години', normalized: 'h' },
  { native: 'годин', normalized: 'h' },

  // Logical/conditional
  { native: 'або', normalized: 'or' },
  { native: 'не', normalized: 'not' },
  { native: 'є', normalized: 'is' },
  { native: 'існує', normalized: 'exists' },
  { native: 'порожній', normalized: 'empty' },
  { native: 'порожня', normalized: 'empty' },
  { native: 'порожнє', normalized: 'empty' },
];

// =============================================================================
// Ukrainian Tokenizer
// =============================================================================

export class UkrainianTokenizer extends BaseTokenizer {
  readonly language = 'uk';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(ukrainianProfile, UKRAINIAN_EXTRAS);
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

      if (isUkrainianLetter(input[pos])) {
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

    return new TokenStreamImpl(tokens, 'uk');
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

    while (pos < input.length && isUkrainianIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();

    // Check if it's a preposition first
    if (PREPOSITIONS.has(lower)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
    }

    // O(1) Map lookup instead of O(n) array search
    const keywordEntry = this.lookupKeyword(lower);
    if (keywordEntry) {
      return createToken(word, 'keyword', createPosition(startPos, pos), keywordEntry.normalized);
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

    // Check for time units
    let unitPos = pos;
    while (unitPos < input.length && isWhitespace(input[unitPos])) {
      unitPos++;
    }

    const remaining = input.slice(unitPos).toLowerCase();
    if (remaining.startsWith('мілісекунд') || remaining.startsWith('мс')) {
      if (remaining.startsWith('мілісекунд')) {
        number += 'ms';
        pos = unitPos + 10; // "мілісекунд"
        // Handle inflection endings
        if (remaining.length > 10 && /[аи]/.test(remaining[10])) {
          pos++;
        }
      } else {
        number += 'ms';
        pos = unitPos + 2;
      }
    } else if (remaining.startsWith('секунд') || remaining.startsWith('сек')) {
      if (remaining.startsWith('секунд')) {
        number += 's';
        pos = unitPos + 6;
        // Handle inflection endings
        if (remaining.length > 6 && /[аи]/.test(remaining[6])) {
          pos++;
        }
      } else {
        number += 's';
        pos = unitPos + 3;
      }
    } else if (remaining.startsWith('хвилин') || remaining.startsWith('хв')) {
      if (remaining.startsWith('хвилин')) {
        number += 'm';
        pos = unitPos + 6;
        // Handle inflection endings
        if (remaining.length > 6 && /[аи]/.test(remaining[6])) {
          pos++;
        }
      } else {
        number += 'm';
        pos = unitPos + 2;
      }
    } else if (remaining.startsWith('годин')) {
      number += 'h';
      pos = unitPos + 5;
      // Handle inflection endings
      if (remaining.length > 5 && /[аи]/.test(remaining[5])) {
        pos++;
      }
    } else if (remaining.startsWith('ms')) {
      number += 'ms';
      pos = unitPos + 2;
    } else if (remaining.startsWith('s') && !remaining.startsWith('se')) {
      number += 's';
      pos = unitPos + 1;
    }

    if (!number || number === '-' || number === '+') return null;

    return createToken(number, 'literal', createPosition(startPos, pos));
  }
}

export const ukrainianTokenizer = new UkrainianTokenizer();
