/**
 * Portuguese Tokenizer
 *
 * Tokenizes Portuguese hyperscript input.
 * Portuguese is similar to Spanish:
 * - SVO word order
 * - Space-separated words
 * - Prepositions
 * - Accent marks
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
import { portugueseProfile } from '../generators/profiles/portuguese';

// =============================================================================
// Portuguese Character Classification
// =============================================================================

const { isLetter: isPortugueseLetter, isIdentifierChar: isPortugueseIdentifierChar } =
  createLatinCharClassifiers(/[a-zA-ZáàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]/);

// =============================================================================
// Portuguese Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'em', // in, on
  'a', // to
  'de', // of, from
  'desde', // from, since
  'até', // until, to
  'ate', // until (no accent)
  'com', // with
  'sem', // without
  'por', // by, for
  'para', // for, to
  'sobre', // on, about
  'entre', // between
  'antes', // before
  'depois', // after
  'dentro', // inside
  'fora', // outside
  'ao', // a + o (contraction)
  'do', // de + o (contraction)
  'no', // em + o (contraction)
  'na', // em + a (contraction)
]);

// =============================================================================
// Portuguese Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - Accent-free variants for accessibility
 */
const PORTUGUESE_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'verdadeiro', normalized: 'true' },
  { native: 'falso', normalized: 'false' },
  { native: 'nulo', normalized: 'null' },
  { native: 'indefinido', normalized: 'undefined' },

  // Positional
  { native: 'primeiro', normalized: 'first' },
  { native: 'primeira', normalized: 'first' },
  { native: 'último', normalized: 'last' },
  { native: 'ultima', normalized: 'last' },
  { native: 'próximo', normalized: 'next' },
  { native: 'proximo', normalized: 'next' },
  { native: 'anterior', normalized: 'previous' },
  { native: 'mais próximo', normalized: 'closest' },
  { native: 'mais proximo', normalized: 'closest' },
  { native: 'pai', normalized: 'parent' },

  // Events
  { native: 'clique', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'entrada', normalized: 'input' },
  { native: 'mudança', normalized: 'change' },
  { native: 'mudanca', normalized: 'change' },
  { native: 'envio', normalized: 'submit' },
  { native: 'tecla baixo', normalized: 'keydown' },
  { native: 'tecla cima', normalized: 'keyup' },
  { native: 'mouse sobre', normalized: 'mouseover' },
  { native: 'mouse fora', normalized: 'mouseout' },
  { native: 'foco', normalized: 'focus' },
  { native: 'desfoque', normalized: 'blur' },
  { native: 'carregar', normalized: 'load' },
  { native: 'rolagem', normalized: 'scroll' },

  // Additional references
  { native: 'meu', normalized: 'my' },
  { native: 'minha', normalized: 'my' },
  { native: 'isso', normalized: 'it' },

  // Time units
  { native: 'segundo', normalized: 's' },
  { native: 'segundos', normalized: 's' },
  { native: 'milissegundo', normalized: 'ms' },
  { native: 'milissegundos', normalized: 'ms' },
  { native: 'minuto', normalized: 'm' },
  { native: 'minutos', normalized: 'm' },
  { native: 'hora', normalized: 'h' },
  { native: 'horas', normalized: 'h' },

  // Accent-free variants (for user convenience)
  { native: 'senao', normalized: 'else' },
  { native: 'transicao', normalized: 'transition' },
  { native: 'ate', normalized: 'until' },
  { native: 'entao', normalized: 'then' },
  { native: 'lancar', normalized: 'throw' },
  { native: 'assincrono', normalized: 'async' },
  { native: 'padrao', normalized: 'default' },
  { native: 'até que', normalized: 'until' },

  // Multi-word phrases
  { native: 'dentro de', normalized: 'into' },
];

// =============================================================================
// Portuguese Time Units
// =============================================================================

/**
 * Portuguese time unit patterns for number parsing.
 * Sorted by length (longest first) to ensure correct matching.
 */
const PORTUGUESE_TIME_UNITS: readonly TimeUnitMapping[] = [
  { pattern: 'milissegundos', suffix: 'ms', length: 13, caseInsensitive: true },
  { pattern: 'milissegundo', suffix: 'ms', length: 12, caseInsensitive: true },
  { pattern: 'segundos', suffix: 's', length: 8, caseInsensitive: true },
  { pattern: 'segundo', suffix: 's', length: 7, caseInsensitive: true },
  { pattern: 'minutos', suffix: 'm', length: 7, caseInsensitive: true },
  { pattern: 'minuto', suffix: 'm', length: 6, caseInsensitive: true },
  { pattern: 'horas', suffix: 'h', length: 5, caseInsensitive: true },
  { pattern: 'hora', suffix: 'h', length: 4, caseInsensitive: true },
];

// =============================================================================
// Portuguese Tokenizer Implementation
// =============================================================================

export class PortugueseTokenizer extends BaseTokenizer {
  readonly language = 'pt';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.initializeKeywordsFromProfile(portugueseProfile, PORTUGUESE_EXTRAS);
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

      if (isPortugueseLetter(input[pos])) {
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

    return new TokenStreamImpl(tokens, 'pt');
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

    while (pos < input.length && isPortugueseIdentifierChar(input[pos])) {
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
   * Extract a number, including Portuguese time unit suffixes.
   */
  private extractNumber(input: string, startPos: number): LanguageToken | null {
    return this.tryNumberWithTimeUnits(input, startPos, PORTUGUESE_TIME_UNITS, {
      allowSign: true,
      skipWhitespace: true,
    });
  }
}

export const portugueseTokenizer = new PortugueseTokenizer();
