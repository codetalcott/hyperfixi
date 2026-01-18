/**
 * Polish Tokenizer
 *
 * Tokenizes Polish hyperscript input.
 * Polish characteristics:
 * - SVO word order (relatively free, but SVO is common)
 * - Space-separated words
 * - Prepositions
 * - Polish diacritics: ą, ę, ć, ń, ó, ś, ź, ż, ł
 * - Fusional morphology with verb conjugations
 * - Imperative form used in software UI (unlike most languages that use infinitive)
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
import { polishProfile } from '../generators/profiles/polish';

// =============================================================================
// Polish Character Classification
// =============================================================================

const { isLetter: isPolishLetter, isIdentifierChar: isPolishIdentifierChar } =
  createLatinCharClassifiers(/[a-zA-ZąęćńóśźżłĄĘĆŃÓŚŹŻŁ]/);

// =============================================================================
// Polish Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'do', // to, into
  'od', // from
  'z', // from, with
  'ze', // from, with (before consonant clusters)
  'w', // in
  'we', // in (before consonant clusters)
  'na', // on, for
  'po', // after, for
  'pod', // under
  'przed', // before, in front of
  'za', // behind, for
  'nad', // above
  'między', // between
  'miedzy', // between (no diacritic)
  'przez', // through, by
  'dla', // for
  'bez', // without
  'o', // about
  'przy', // at, by
  'u', // at (someone's place)
  'według', // according to
  'wedlug', // according to (no diacritic)
  'mimo', // despite
  'wśród', // among
  'wsrod', // among (no diacritic)
  'obok', // beside
  'poza', // outside, beyond
  'wokół', // around
  'wokol', // around (no diacritic)
  'przeciw', // against
  'ku', // towards
]);

// =============================================================================
// Polish Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false)
 * - Positional words
 * - Event names
 * - Time units
 * - Additional verb forms and synonyms
 */
const POLISH_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'prawda', normalized: 'true' },
  { native: 'fałsz', normalized: 'false' },
  { native: 'falsz', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'nieokreślony', normalized: 'undefined' },
  { native: 'nieokreslony', normalized: 'undefined' },

  // Positional
  { native: 'pierwszy', normalized: 'first' },
  { native: 'pierwsza', normalized: 'first' },
  { native: 'pierwsze', normalized: 'first' },
  { native: 'ostatni', normalized: 'last' },
  { native: 'ostatnia', normalized: 'last' },
  { native: 'ostatnie', normalized: 'last' },
  { native: 'następny', normalized: 'next' },
  { native: 'nastepny', normalized: 'next' },
  { native: 'poprzedni', normalized: 'previous' },
  { native: 'najbliższy', normalized: 'closest' },
  { native: 'najblizszy', normalized: 'closest' },
  { native: 'rodzic', normalized: 'parent' },

  // Events
  { native: 'kliknięcie', normalized: 'click' },
  { native: 'klikniecie', normalized: 'click' },
  { native: 'klik', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'zmiana', normalized: 'change' },
  { native: 'wysłanie', normalized: 'submit' },
  { native: 'wyslanie', normalized: 'submit' },
  { native: 'naciśnięcie', normalized: 'keydown' },
  { native: 'nacisniecie', normalized: 'keydown' },
  { native: 'klawisz', normalized: 'keydown' },
  { native: 'najechanie', normalized: 'mouseover' },
  { native: 'zjechanie', normalized: 'mouseout' },
  { native: 'rozmycie', normalized: 'blur' },
  { native: 'załadowanie', normalized: 'load' },
  { native: 'zaladowanie', normalized: 'load' },
  { native: 'przewinięcie', normalized: 'scroll' },
  { native: 'przewiniecie', normalized: 'scroll' },
  { native: 'input', normalized: 'input' },

  // References
  { native: 'mój', normalized: 'my' },
  { native: 'moj', normalized: 'my' },

  // Time units
  { native: 'sekunda', normalized: 's' },
  { native: 'sekundy', normalized: 's' },
  { native: 'sekund', normalized: 's' },
  { native: 'milisekunda', normalized: 'ms' },
  { native: 'milisekundy', normalized: 'ms' },
  { native: 'milisekund', normalized: 'ms' },
  { native: 'minuta', normalized: 'm' },
  { native: 'minuty', normalized: 'm' },
  { native: 'minut', normalized: 'm' },
  { native: 'godzina', normalized: 'h' },
  { native: 'godziny', normalized: 'h' },
  { native: 'godzin', normalized: 'h' },

  // Additional verb forms not in profile (lay/put variants)
  { native: 'połóż', normalized: 'put' },
  { native: 'poloz', normalized: 'put' },

  // Logical/conditional
  { native: 'lub', normalized: 'or' },
  { native: 'nie', normalized: 'not' },
  { native: 'jest', normalized: 'is' },
  { native: 'istnieje', normalized: 'exists' },
  { native: 'pusty', normalized: 'empty' },
  { native: 'puste', normalized: 'empty' },
];

// =============================================================================
// Polish Tokenizer
// =============================================================================

export class PolishTokenizer extends BaseTokenizer {
  readonly language = 'pl';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(polishProfile, POLISH_EXTRAS);
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

      if (isPolishLetter(input[pos])) {
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

    return new TokenStreamImpl(tokens, 'pl');
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

    while (pos < input.length && isPolishIdentifierChar(input[pos])) {
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
    if (remaining.startsWith('milisekund') || remaining.startsWith('milisekunda')) {
      number += 'ms';
      pos =
        unitPos +
        (remaining.startsWith('milisekundy') ? 11 : remaining.startsWith('milisekunda') ? 11 : 10);
    } else if (remaining.startsWith('sekund') || remaining.startsWith('sekunda')) {
      number += 's';
      pos =
        unitPos + (remaining.startsWith('sekundy') ? 7 : remaining.startsWith('sekunda') ? 7 : 6);
    } else if (remaining.startsWith('minut') || remaining.startsWith('minuta')) {
      number += 'm';
      pos = unitPos + (remaining.startsWith('minuty') ? 6 : remaining.startsWith('minuta') ? 6 : 5);
    } else if (remaining.startsWith('godzin') || remaining.startsWith('godzina')) {
      number += 'h';
      pos =
        unitPos + (remaining.startsWith('godziny') ? 7 : remaining.startsWith('godzina') ? 7 : 6);
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

export const polishTokenizer = new PolishTokenizer();
