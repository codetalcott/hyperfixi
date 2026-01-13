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
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isUrlStart,
  type CreateTokenOptions,
} from './base';
import { SpanishMorphologicalNormalizer } from './morphology/spanish-normalizer';

// =============================================================================
// Spanish Character Classification
// =============================================================================

/**
 * Check if character is a Spanish letter (including accented).
 */
function isSpanishLetter(char: string): boolean {
  return /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(char);
}

/**
 * Check if character is part of a Spanish identifier.
 */
function isSpanishIdentifierChar(char: string): boolean {
  return isSpanishLetter(char) || /[0-9_-]/.test(char);
}

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
// Spanish Keywords
// =============================================================================

/**
 * Spanish command keywords mapped to their English equivalents.
 */
const SPANISH_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['alternar', 'toggle'],
  ['cambiar', 'toggle'],
  ['toggle', 'toggle'],
  ['conmutar', 'toggle'],
  ['añadir', 'add'],
  ['agregar', 'add'],
  ['quitar', 'remove'],
  ['eliminar', 'remove'],
  ['borrar', 'remove'],
  ['remover', 'remove'],
  ['sacar', 'remove'],
  // Commands - Content operations
  ['poner', 'put'],
  ['pon', 'put'],
  ['colocar', 'put'],
  ['anteponer', 'prepend'],
  ['tomar', 'take'],
  ['hacer', 'make'],
  ['crear', 'make'],
  ['clonar', 'clone'],
  ['copiar', 'clone'],
  // Commands - Variable operations
  ['establecer', 'set'],
  ['fijar', 'set'],
  ['obtener', 'get'],
  ['incrementar', 'increment'],
  ['aumentar', 'increment'],
  ['decrementar', 'decrement'],
  ['disminuir', 'decrement'],
  ['registrar', 'log'],
  ['imprimir', 'log'],
  // Commands - Visibility
  ['mostrar', 'show'],
  ['enseñar', 'show'],
  ['ocultar', 'hide'],
  ['esconder', 'hide'],
  ['transición', 'transition'],
  ['animar', 'transition'],
  // Commands - Events
  ['en', 'on'],
  ['cuando', 'on'],
  ['al', 'on'],
  ['disparar', 'trigger'],
  ['activar', 'trigger'],
  ['enviar', 'send'],
  // Commands - DOM focus
  ['enfocar', 'focus'],
  ['desenfocar', 'blur'],
  // Commands - Navigation
  ['ir', 'go'],
  ['navegar', 'go'],
  // Commands - Async
  ['esperar', 'wait'],
  ['buscar', 'fetch'],
  ['estabilizar', 'settle'],
  // Commands - Control flow
  ['si', 'if'],
  ['sino', 'else'],
  ['repetir', 'repeat'],
  ['para', 'for'],
  ['mientras', 'while'],
  ['continuar', 'continue'],
  ['detener', 'halt'],
  ['parar', 'halt'],
  ['lanzar', 'throw'],
  ['arrojar', 'throw'],
  ['llamar', 'call'],
  ['devolver', 'return'],
  ['retornar', 'return'],
  // Commands - Advanced
  ['js', 'js'],
  ['asíncrono', 'async'],
  ['asincrono', 'async'],
  ['decir', 'tell'],
  ['predeterminar', 'default'],
  ['iniciar', 'init'],
  ['inicializar', 'init'],
  ['comportamiento', 'behavior'],
  ['instalar', 'install'],
  ['medir', 'measure'],
  ['hasta', 'until'],
  ['evento', 'event'],
  // Modifiers
  ['dentro de', 'into'],
  ['antes', 'before'],
  ['después', 'after'],
  ['despues', 'after'],
  // Control flow helpers
  ['entonces', 'then'],
  ['de lo contrario', 'else'],
  ['fin', 'end'],
  ['hasta que', 'until'],
  // Events (for event name recognition)
  ['clic', 'click'],
  ['click', 'click'],
  ['hacer clic', 'click'], // Multi-word: "to make click" → click
  ['entrada', 'input'],
  ['cambio', 'change'],
  ['envío', 'submit'],
  ['envio', 'submit'],
  ['tecla abajo', 'keydown'],
  ['tecla arriba', 'keyup'],
  ['ratón encima', 'mouseover'],
  ['ratón fuera', 'mouseout'],
  ['enfoque', 'focus'],
  ['desenfoque', 'blur'],
  ['carga', 'load'],
  ['desplazamiento', 'scroll'],
  // References
  ['yo', 'me'],
  ['mí', 'me'],
  ['mi', 'me'],
  ['ello', 'it'],
  ['resultado', 'result'],
  ['evento', 'event'],
  ['objetivo', 'target'],
  ['destino', 'target'],
  // Positional
  ['primero', 'first'],
  ['primera', 'first'],
  ['último', 'last'],
  ['ultima', 'last'],
  ['siguiente', 'next'],
  ['anterior', 'previous'],
  // Boolean
  ['verdadero', 'true'],
  ['falso', 'false'],
  // Time units
  ['segundo', 's'],
  ['segundos', 's'],
  ['milisegundo', 'ms'],
  ['milisegundos', 'ms'],
  ['minuto', 'm'],
  ['minutos', 'm'],
  ['hora', 'h'],
  ['horas', 'h'],
]);

// =============================================================================
// Spanish Tokenizer Implementation
// =============================================================================

export class SpanishTokenizer extends BaseTokenizer {
  readonly language = 'es';
  readonly direction = 'ltr' as const;

  /** Morphological normalizer for Spanish verb conjugations */
  private morphNormalizer = new SpanishMorphologicalNormalizer();

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
    if (SPANISH_KEYWORDS.has(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    if (['==', '!=', '<=', '>=', '<', '>', '&&', '||', '!'].includes(token)) return 'operator';

    return 'identifier';
  }

  /**
   * Try to match multi-word phrases that function as single units.
   */
  private tryMultiWordPhrase(input: string, pos: number): LanguageToken | null {
    const multiWordPhrases = [
      'de lo contrario',
      'hasta que',
      'antes de',
      'después de',
      'despues de',
      'dentro de',
      'fuera de',
      'tecla abajo',
      'tecla arriba',
      'ratón encima',
      'raton encima',
      'ratón fuera',
      'raton fuera',
      'hacer clic', // "to make click" → click event
    ];

    for (const phrase of multiWordPhrases) {
      const candidate = input.slice(pos, pos + phrase.length).toLowerCase();
      if (candidate === phrase) {
        // Check word boundary
        const nextPos = pos + phrase.length;
        if (
          nextPos >= input.length ||
          isWhitespace(input[nextPos]) ||
          !isSpanishLetter(input[nextPos])
        ) {
          const normalized = SPANISH_KEYWORDS.get(phrase);
          return createToken(
            input.slice(pos, pos + phrase.length),
            normalized ? 'keyword' : 'particle',
            createPosition(pos, nextPos),
            normalized
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

    // Check if this is a known keyword (exact match)
    const normalized = SPANISH_KEYWORDS.get(lower);

    if (normalized) {
      return createToken(word, 'keyword', createPosition(startPos, pos), normalized);
    }

    // Check if it's a preposition
    if (PREPOSITIONS.has(lower)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
    }

    // Try morphological normalization for conjugated/reflexive forms
    const morphResult = this.morphNormalizer.normalize(lower);

    if (morphResult.stem !== lower && morphResult.confidence >= 0.7) {
      // Check if the stem (infinitive) is a known keyword
      const stemNormalized = SPANISH_KEYWORDS.get(morphResult.stem);

      if (stemNormalized) {
        const tokenOptions: CreateTokenOptions = {
          normalized: stemNormalized,
          stem: morphResult.stem,
          stemConfidence: morphResult.confidence,
        };

        return createToken(word, 'keyword', createPosition(startPos, pos), tokenOptions);
      }
    }

    // Not a keyword, return as identifier
    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  /**
   * Extract a number, including Spanish time unit suffixes.
   */
  private extractSpanishNumber(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let number = '';

    // Optional sign
    if (input[pos] === '-' || input[pos] === '+') {
      number += input[pos++];
    }

    // Integer part
    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }

    // Optional decimal
    if (pos < input.length && input[pos] === '.') {
      number += input[pos++];
      while (pos < input.length && isDigit(input[pos])) {
        number += input[pos++];
      }
    }

    // Skip whitespace before time unit
    let unitPos = pos;
    while (unitPos < input.length && isWhitespace(input[unitPos])) {
      unitPos++;
    }

    // Check for Spanish time units
    const remaining = input.slice(unitPos).toLowerCase();
    if (remaining.startsWith('milisegundos') || remaining.startsWith('milisegundo')) {
      number += 'ms';
      pos = unitPos + (remaining.startsWith('milisegundos') ? 12 : 11);
    } else if (remaining.startsWith('segundos') || remaining.startsWith('segundo')) {
      number += 's';
      pos = unitPos + (remaining.startsWith('segundos') ? 8 : 7);
    } else if (remaining.startsWith('minutos') || remaining.startsWith('minuto')) {
      number += 'm';
      pos = unitPos + (remaining.startsWith('minutos') ? 7 : 6);
    } else if (remaining.startsWith('horas') || remaining.startsWith('hora')) {
      number += 'h';
      pos = unitPos + (remaining.startsWith('horas') ? 5 : 4);
    }

    if (!number || number === '-' || number === '+') return null;

    return createToken(number, 'literal', createPosition(startPos, pos));
  }

  /**
   * Try to extract an operator token.
   */
  private tryOperator(input: string, pos: number): LanguageToken | null {
    // Two-character operators
    const twoChar = input.slice(pos, pos + 2);
    if (['==', '!=', '<=', '>=', '&&', '||', '->'].includes(twoChar)) {
      return createToken(twoChar, 'operator', createPosition(pos, pos + 2));
    }

    // Single-character operators
    const oneChar = input[pos];
    if (['<', '>', '!', '+', '-', '*', '/', '='].includes(oneChar)) {
      return createToken(oneChar, 'operator', createPosition(pos, pos + 1));
    }

    // Punctuation
    if (['(', ')', '{', '}', ',', ';', ':'].includes(oneChar)) {
      return createToken(oneChar, 'punctuation', createPosition(pos, pos + 1));
    }

    return null;
  }
}

/**
 * Singleton instance.
 */
export const spanishTokenizer = new SpanishTokenizer();
