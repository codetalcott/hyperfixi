/**
 * Russian Tokenizer
 *
 * Tokenizes Russian hyperscript input.
 * Russian characteristics:
 * - SVO word order (relatively free, but SVO is common)
 * - Space-separated words
 * - Prepositions
 * - Cyrillic alphabet
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
import { russianProfile } from '../generators/profiles/russian';
import { RussianMorphologicalNormalizer } from './morphology/russian-normalizer';

// =============================================================================
// Russian Character Classification
// =============================================================================

const { isLetter: isRussianLetter, isIdentifierChar: isRussianIdentifierChar } =
  createLatinCharClassifiers(/[a-zA-Zа-яА-ЯёЁ]/);

// =============================================================================
// Russian Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'в', // in
  'во', // in (before consonant clusters)
  'на', // on
  'с', // with, from
  'со', // with (before consonant clusters)
  'к', // to, towards
  'ко', // to (before consonant clusters)
  'о', // about
  'об', // about (before vowels)
  'обо', // about (before consonant clusters)
  'у', // at, by
  'от', // from
  'до', // until, to
  'из', // from, out of
  'за', // behind, for
  'по', // along, by
  'под', // under
  'над', // above
  'перед', // in front of
  'передо', // in front of (before consonant clusters)
  'между', // between
  'через', // through
  'без', // without
  'для', // for
  'при', // at, during
  'про', // about
  'после', // after
  'вокруг', // around
  'против', // against
  'вместо', // instead of
  'кроме', // except
  'среди', // among
]);

// =============================================================================
// Russian Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false)
 * - Positional words
 * - Event names
 * - Time units
 * - Additional verb forms and synonyms
 */
const RUSSIAN_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'истина', normalized: 'true' },
  { native: 'правда', normalized: 'true' },
  { native: 'ложь', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'неопределено', normalized: 'undefined' },

  // Positional
  { native: 'первый', normalized: 'first' },
  { native: 'первая', normalized: 'first' },
  { native: 'первое', normalized: 'first' },
  { native: 'последний', normalized: 'last' },
  { native: 'последняя', normalized: 'last' },
  { native: 'последнее', normalized: 'last' },
  { native: 'следующий', normalized: 'next' },
  { native: 'следующая', normalized: 'next' },
  { native: 'предыдущий', normalized: 'previous' },
  { native: 'предыдущая', normalized: 'previous' },
  { native: 'ближайший', normalized: 'closest' },
  { native: 'родитель', normalized: 'parent' },

  // Events
  { native: 'клик', normalized: 'click' },
  { native: 'нажатие', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'изменение', normalized: 'change' },
  { native: 'отправка', normalized: 'submit' },
  { native: 'клавиша', normalized: 'keydown' },
  { native: 'наведение', normalized: 'mouseover' },
  { native: 'уход', normalized: 'mouseout' },
  { native: 'загрузка', normalized: 'load' },
  { native: 'прокрутка', normalized: 'scroll' },
  { native: 'ввод', normalized: 'input' },

  // References - possessive forms
  { native: 'мой', normalized: 'my' },
  { native: 'моя', normalized: 'my' },
  { native: 'моё', normalized: 'my' },
  { native: 'мои', normalized: 'my' },

  // Time units
  { native: 'секунда', normalized: 's' },
  { native: 'секунды', normalized: 's' },
  { native: 'секунд', normalized: 's' },
  { native: 'миллисекунда', normalized: 'ms' },
  { native: 'миллисекунды', normalized: 'ms' },
  { native: 'миллисекунд', normalized: 'ms' },
  { native: 'минута', normalized: 'm' },
  { native: 'минуты', normalized: 'm' },
  { native: 'минут', normalized: 'm' },
  { native: 'час', normalized: 'h' },
  { native: 'часа', normalized: 'h' },
  { native: 'часов', normalized: 'h' },

  // Logical/conditional
  { native: 'или', normalized: 'or' },
  { native: 'не', normalized: 'not' },
  { native: 'есть', normalized: 'is' },
  { native: 'существует', normalized: 'exists' },
  { native: 'пустой', normalized: 'empty' },
  { native: 'пустая', normalized: 'empty' },
  { native: 'пустое', normalized: 'empty' },
];

// =============================================================================
// Russian Tokenizer
// =============================================================================

export class RussianTokenizer extends BaseTokenizer {
  readonly language = 'ru';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(russianProfile, RUSSIAN_EXTRAS);
    this.normalizer = new RussianMorphologicalNormalizer();
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

      if (isRussianLetter(input[pos])) {
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

    return new TokenStreamImpl(tokens, 'ru');
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

    while (pos < input.length && isRussianIdentifierChar(input[pos])) {
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
    if (remaining.startsWith('миллисекунд') || remaining.startsWith('мс')) {
      if (remaining.startsWith('миллисекунд')) {
        number += 'ms';
        pos = unitPos + 11; // "миллисекунд"
        // Handle inflection endings
        if (remaining.length > 11 && /[аы]/.test(remaining[11])) {
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
        if (remaining.length > 6 && /[аы]/.test(remaining[6])) {
          pos++;
        }
      } else {
        number += 's';
        pos = unitPos + 3;
      }
    } else if (remaining.startsWith('минут') || remaining.startsWith('мин')) {
      if (remaining.startsWith('минут')) {
        number += 'm';
        pos = unitPos + 5;
        // Handle inflection endings
        if (remaining.length > 5 && /[аы]/.test(remaining[5])) {
          pos++;
        }
      } else {
        number += 'm';
        pos = unitPos + 3;
      }
    } else if (remaining.startsWith('час')) {
      number += 'h';
      pos = unitPos + 3;
      // Handle inflection endings: часа, часов
      if (remaining.length > 3 && remaining[3] === 'а') {
        pos++;
      } else if (remaining.length > 3 && remaining.slice(3, 5) === 'ов') {
        pos += 2;
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

export const russianTokenizer = new RussianTokenizer();
