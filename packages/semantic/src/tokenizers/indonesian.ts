/**
 * Indonesian Tokenizer
 *
 * Tokenizes Indonesian hyperscript input.
 * Indonesian characteristics:
 * - SVO word order
 * - Space-separated words
 * - Prepositions
 * - Agglutinative prefixes/suffixes (me-, ber-, di-, -kan, -i)
 * - No grammatical gender or conjugation
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
import { indonesianProfile } from '../generators/profiles/indonesian';

// =============================================================================
// Indonesian Character Classification
// =============================================================================

const { isLetter: isIndonesianLetter, isIdentifierChar: isIndonesianIdentifierChar } =
  createLatinCharClassifiers(/[a-zA-Z]/);

// =============================================================================
// Indonesian Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'di', // at, in
  'ke', // to
  'dari', // from
  'pada', // on, at
  'dengan', // with
  'tanpa', // without
  'untuk', // for
  'oleh', // by
  'antara', // between
  'sebelum', // before
  'sesudah', // after
  'setelah', // after
  'selama', // during
  'sampai', // until
  'hingga', // until
  'sejak', // since
  'menuju', // towards
  'tentang', // about
  'terhadap', // towards, against
  'melalui', // through
  'dalam', // inside
  'luar', // outside
]);

// =============================================================================
// Indonesian Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - Additional synonyms
 */
const INDONESIAN_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'benar', normalized: 'true' },
  { native: 'salah', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'kosong', normalized: 'null' },
  { native: 'tidak terdefinisi', normalized: 'undefined' },

  // Positional
  { native: 'pertama', normalized: 'first' },
  { native: 'terakhir', normalized: 'last' },
  { native: 'selanjutnya', normalized: 'next' },
  { native: 'berikutnya', normalized: 'next' },
  { native: 'sebelumnya', normalized: 'previous' },
  { native: 'terdekat', normalized: 'closest' },
  { native: 'induk', normalized: 'parent' },

  // Events
  { native: 'klik', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'masukan', normalized: 'input' },
  { native: 'input', normalized: 'input' },
  { native: 'perubahan', normalized: 'change' },
  { native: 'tombol turun', normalized: 'keydown' },
  { native: 'tombol naik', normalized: 'keyup' },
  { native: 'mouse masuk', normalized: 'mouseover' },
  { native: 'mouse keluar', normalized: 'mouseout' },
  { native: 'gulir', normalized: 'scroll' },

  // Additional references
  { native: 'aku', normalized: 'me' },
  { native: 'ini', normalized: 'me' },
  { native: 'milikku', normalized: 'my' },
  { native: 'dia', normalized: 'it' },
  { native: 'kejadian', normalized: 'event' },
  { native: 'sasaran', normalized: 'target' },

  // Time units
  { native: 'detik', normalized: 's' },
  { native: 'milidetik', normalized: 'ms' },
  { native: 'menit', normalized: 'm' },
  { native: 'jam', normalized: 'h' },

  // Additional synonyms and multi-word phrases
  { native: 'jika tidak', normalized: 'else' },
  { native: 'hilangkan fokus', normalized: 'blur' },
  { native: 'maka', normalized: 'then' },
];

// =============================================================================
// Indonesian Tokenizer Implementation
// =============================================================================

export class IndonesianTokenizer extends BaseTokenizer {
  readonly language = 'id';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.initializeKeywordsFromProfile(indonesianProfile, INDONESIAN_EXTRAS);
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

      if (isIndonesianLetter(input[pos])) {
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

    return new TokenStreamImpl(tokens, 'id');
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

    while (pos < input.length && isIndonesianIdentifierChar(input[pos])) {
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
    if (remaining.startsWith('milidetik')) {
      number += 'ms';
      pos = unitPos + 9;
    } else if (remaining.startsWith('detik')) {
      number += 's';
      pos = unitPos + 5;
    } else if (remaining.startsWith('menit')) {
      number += 'm';
      pos = unitPos + 5;
    } else if (remaining.startsWith('jam')) {
      number += 'h';
      pos = unitPos + 3;
    }

    if (!number || number === '-' || number === '+') return null;

    return createToken(number, 'literal', createPosition(startPos, pos));
  }
}

export const indonesianTokenizer = new IndonesianTokenizer();
