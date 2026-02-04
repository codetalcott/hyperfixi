/**
 * Spanish Tokenizer
 *
 * Tokenizes Spanish hyperscript input.
 * Spanish is relatively straightforward as it:
 * - Uses space-separated words like English
 * - Has similar preposition structure (SVO)
 * - Uses accent marks that need proper handling
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
import { SpanishMorphologicalNormalizer } from './morphology/spanish-normalizer';
import { spanishProfile } from '../generators/profiles/spanish';

// =============================================================================
// Spanish Character Classification
// =============================================================================

const { isLetter: isSpanishLetter, isIdentifierChar: isSpanishIdentifierChar } =
  createLatinCharClassifiers(/[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/);

// =============================================================================
// Spanish Time Units
// =============================================================================

/**
 * Spanish time unit patterns for number parsing.
 * Sorted by length (longest first) to ensure correct matching.
 */
const SPANISH_TIME_UNITS: readonly TimeUnitMapping[] = [
  { pattern: 'milisegundos', suffix: 'ms', length: 12, caseInsensitive: true },
  { pattern: 'milisegundo', suffix: 'ms', length: 11, caseInsensitive: true },
  { pattern: 'segundos', suffix: 's', length: 8, caseInsensitive: true },
  { pattern: 'segundo', suffix: 's', length: 7, caseInsensitive: true },
  { pattern: 'minutos', suffix: 'm', length: 7, caseInsensitive: true },
  { pattern: 'minuto', suffix: 'm', length: 6, caseInsensitive: true },
  { pattern: 'horas', suffix: 'h', length: 5, caseInsensitive: true },
  { pattern: 'hora', suffix: 'h', length: 4, caseInsensitive: true },
];

// =============================================================================
// Spanish Prepositions
// =============================================================================

/**
 * Spanish prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'en', // in, on
  'a', // to
  'de', // of, from
  'desde', // from
  'hasta', // until, to
  'con', // with
  'sin', // without
  'por', // by, for
  'para', // for
  'sobre', // on, about
  'entre', // between
  'antes', // before
  'después', // after
  'despues', // after (no accent)
  'dentro', // inside
  'fuera', // outside
  'al', // a + el (contraction)
  'del', // de + el (contraction)
]);

// =============================================================================
// Spanish Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false)
 * - Positional words
 * - Event names
 * - Time units
 * - Multi-word phrases
 * - Additional synonyms
 * - Accent variations
 */
const SPANISH_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'verdadero', normalized: 'true' },
  { native: 'falso', normalized: 'false' },
  { native: 'nulo', normalized: 'null' },
  { native: 'indefinido', normalized: 'undefined' },

  // Positional
  { native: 'primero', normalized: 'first' },
  { native: 'primera', normalized: 'first' },
  { native: 'último', normalized: 'last' },
  { native: 'ultima', normalized: 'last' },
  { native: 'siguiente', normalized: 'next' },
  { native: 'anterior', normalized: 'previous' },
  { native: 'cercano', normalized: 'closest' },
  { native: 'padre', normalized: 'parent' },

  // Events
  { native: 'clic', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'hacer clic', normalized: 'click' },
  { native: 'entrada', normalized: 'input' },
  { native: 'cambio', normalized: 'change' },
  { native: 'envío', normalized: 'submit' },
  { native: 'envio', normalized: 'submit' },
  { native: 'tecla abajo', normalized: 'keydown' },
  { native: 'tecla arriba', normalized: 'keyup' },
  { native: 'ratón encima', normalized: 'mouseover' },
  { native: 'raton encima', normalized: 'mouseover' },
  { native: 'ratón fuera', normalized: 'mouseout' },
  { native: 'raton fuera', normalized: 'mouseout' },
  { native: 'enfoque', normalized: 'focus' },
  { native: 'desenfoque', normalized: 'blur' },
  { native: 'carga', normalized: 'load' },
  { native: 'desplazamiento', normalized: 'scroll' },

  // References
  { native: 'yo', normalized: 'me' },
  { native: 'mí', normalized: 'me' },
  { native: 'mi', normalized: 'me' },
  { native: 'ello', normalized: 'it' },
  { native: 'resultado', normalized: 'result' },
  { native: 'objetivo', normalized: 'target' },
  { native: 'destino', normalized: 'target' },

  // Time units
  { native: 'segundo', normalized: 's' },
  { native: 'segundos', normalized: 's' },
  { native: 'milisegundo', normalized: 'ms' },
  { native: 'milisegundos', normalized: 'ms' },
  { native: 'minuto', normalized: 'm' },
  { native: 'minutos', normalized: 'm' },
  { native: 'hora', normalized: 'h' },
  { native: 'horas', normalized: 'h' },

  // Multi-word phrases
  { native: 'de lo contrario', normalized: 'else' },
  { native: 'hasta que', normalized: 'until' },
  { native: 'antes de', normalized: 'before' },
  { native: 'después de', normalized: 'after' },
  { native: 'despues de', normalized: 'after' },
  { native: 'dentro de', normalized: 'into' },
  { native: 'fuera de', normalized: 'out' },

  // Accent variations not in profile
  { native: 'asincrono', normalized: 'async' },
  { native: 'despues', normalized: 'after' },

  // Command overrides (ensure correct mapping when profile has multiple meanings)
  { native: 'añadir', normalized: 'add' }, // Profile may have this as 'append'

  // Synonyms not in profile
  { native: 'toggle', normalized: 'toggle' },
  { native: 'borrar', normalized: 'remove' },
  { native: 'pon', normalized: 'put' },
  { native: 'crear', normalized: 'make' },

  // Logical/conditional
  { native: 'y', normalized: 'and' },
  { native: 'o', normalized: 'or' },
  { native: 'no', normalized: 'not' },
  { native: 'es', normalized: 'is' },
  { native: 'existe', normalized: 'exists' },
  { native: 'vacío', normalized: 'empty' },
  { native: 'vacio', normalized: 'empty' },
];

// =============================================================================
// Spanish Tokenizer Implementation
// =============================================================================

export class SpanishTokenizer extends BaseTokenizer {
  readonly language = 'es';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(spanishProfile, SPANISH_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.normalizer = new SpanishMorphologicalNormalizer();
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

      // Try CSS selector first
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
      if (
        isDigit(input[pos]) ||
        (input[pos] === '-' && pos + 1 < input.length && isDigit(input[pos + 1]))
      ) {
        const numberToken = this.extractSpanishNumber(input, pos);
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

      // Try multi-word phrases first (e.g., "de lo contrario", "hasta que")
      const phraseToken = this.tryMultiWordPhrase(input, pos);
      if (phraseToken) {
        tokens.push(phraseToken);
        pos = phraseToken.position.end;
        continue;
      }

      // Try Spanish word
      if (isSpanishLetter(input[pos])) {
        const wordToken = this.extractSpanishWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      // Try operator
      const operatorToken = this.tryOperator(input, pos);
      if (operatorToken) {
        tokens.push(operatorToken);
        pos = operatorToken.position.end;
        continue;
      }

      // Skip unknown character
      pos++;
    }

    return new TokenStreamImpl(tokens, 'es');
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
    if (['==', '!=', '<=', '>=', '<', '>', '&&', '||', '!'].includes(token)) return 'operator';

    return 'identifier';
  }

  /**
   * Try to match multi-word phrases that function as single units.
   * Multi-word phrases are included in profileKeywords and sorted longest-first,
   * so they'll be matched before their constituent words.
   */
  private tryMultiWordPhrase(input: string, pos: number): LanguageToken | null {
    // Check against multi-word entries in profileKeywords (sorted longest-first)
    for (const entry of this.profileKeywords) {
      // Only check multi-word phrases (contain space)
      if (!entry.native.includes(' ')) continue;

      const phrase = entry.native;
      const candidate = input.slice(pos, pos + phrase.length).toLowerCase();
      if (candidate === phrase.toLowerCase()) {
        // Check word boundary
        const nextPos = pos + phrase.length;
        if (
          nextPos >= input.length ||
          isWhitespace(input[nextPos]) ||
          !isSpanishLetter(input[nextPos])
        ) {
          return createToken(
            input.slice(pos, pos + phrase.length),
            'keyword',
            createPosition(pos, nextPos),
            entry.normalized
          );
        }
      }
    }

    return null;
  }

  /**
   * Extract a Spanish word.
   *
   * Uses morphological normalization to handle:
   * - Reflexive verbs (mostrarse → mostrar)
   * - Verb conjugations (alternando → alternar)
   */
  private extractSpanishWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isSpanishIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();

    // Check if it's a preposition first
    if (PREPOSITIONS.has(lower)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
    }

    // O(1) Map lookup for exact keyword match
    const keywordEntry = this.lookupKeyword(lower);
    if (keywordEntry) {
      return createToken(word, 'keyword', createPosition(startPos, pos), keywordEntry.normalized);
    }

    // Try morphological normalization for conjugated/reflexive forms
    const morphToken = this.tryMorphKeywordMatch(lower, startPos, pos);
    if (morphToken) return morphToken;

    // Not a keyword, return as identifier
    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  /**
   * Extract a number, including Spanish time unit suffixes.
   */
  private extractSpanishNumber(input: string, startPos: number): LanguageToken | null {
    return this.tryNumberWithTimeUnits(input, startPos, SPANISH_TIME_UNITS, {
      allowSign: true,
      skipWhitespace: true,
    });
  }
}

/**
 * Singleton instance.
 */
export const spanishTokenizer = new SpanishTokenizer();
