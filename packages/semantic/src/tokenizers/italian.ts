/**
 * Italian Tokenizer
 *
 * Tokenizes Italian hyperscript input.
 * Italian is very similar to Spanish:
 * - Uses space-separated words
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
import { ItalianMorphologicalNormalizer } from './morphology/italian-normalizer';

// =============================================================================
// Italian Character Classification
// =============================================================================

/**
 * Check if character is an Italian letter (including accented).
 */
function isItalianLetter(char: string): boolean {
  return /[a-zA-ZàèéìíîòóùúÀÈÉÌÍÎÒÓÙÚ]/.test(char);
}

/**
 * Check if character is part of an Italian identifier.
 */
function isItalianIdentifierChar(char: string): boolean {
  return isItalianLetter(char) || /[0-9_-]/.test(char);
}

// =============================================================================
// Italian Prepositions
// =============================================================================

/**
 * Italian prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'in',         // in, into
  'a',          // to, at
  'di',         // of, from
  'da',         // from, by
  'con',        // with
  'su',         // on
  'per',        // for
  'tra',        // between
  'fra',        // between (variant)
  'dopo',       // after
  'prima',      // before
  'dentro',     // inside
  'fuori',      // outside
  'sopra',      // above
  'sotto',      // under
  // Articulated prepositions
  'al',         // a + il
  'allo',       // a + lo
  'alla',       // a + la
  'ai',         // a + i
  'agli',       // a + gli
  'alle',       // a + le
  'del',        // di + il
  'dello',      // di + lo
  'della',      // di + la
  'dei',        // di + i
  'degli',      // di + gli
  'delle',      // di + le
  'dal',        // da + il
  'dallo',      // da + lo
  'dalla',      // da + la
  'dai',        // da + i
  'dagli',      // da + gli
  'dalle',      // da + le
  'nel',        // in + il
  'nello',      // in + lo
  'nella',      // in + la
  'nei',        // in + i
  'negli',      // in + gli
  'nelle',      // in + le
  'sul',        // su + il
  'sullo',      // su + lo
  'sulla',      // su + la
  'sui',        // su + i
  'sugli',      // su + gli
  'sulle',      // su + le
]);

// =============================================================================
// Italian Keywords
// =============================================================================

/**
 * Italian command keywords mapped to their English equivalents.
 */
const ITALIAN_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['commutare', 'toggle'],
  ['alternare', 'toggle'],
  ['toggle', 'toggle'],
  ['cambiare', 'toggle'],
  ['aggiungere', 'add'],
  ['aggiungi', 'add'],
  ['rimuovere', 'remove'],
  ['rimuovi', 'remove'],
  ['eliminare', 'remove'],
  ['elimina', 'remove'],
  ['togliere', 'remove'],
  ['togli', 'remove'],
  // Commands - Content operations
  ['mettere', 'put'],
  ['metti', 'put'],
  ['inserire', 'put'],
  ['inserisci', 'put'],
  ['prendere', 'take'],
  ['prendi', 'take'],
  ['fare', 'make'],
  ['fai', 'make'],
  ['creare', 'make'],
  ['crea', 'make'],
  ['clonare', 'clone'],
  ['clona', 'clone'],
  ['copiare', 'clone'],
  ['copia', 'clone'],
  // Commands - Variable operations
  ['impostare', 'set'],
  ['imposta', 'set'],
  ['ottenere', 'get'],
  ['ottieni', 'get'],
  ['incrementare', 'increment'],
  ['incrementa', 'increment'],
  ['aumentare', 'increment'],
  ['aumenta', 'increment'],
  ['decrementare', 'decrement'],
  ['decrementa', 'decrement'],
  ['diminuire', 'decrement'],
  ['diminuisci', 'decrement'],
  ['registrare', 'log'],
  ['registra', 'log'],
  // Commands - Visibility
  ['mostrare', 'show'],
  ['mostra', 'show'],
  ['visualizzare', 'show'],
  ['visualizza', 'show'],
  ['nascondere', 'hide'],
  ['nascondi', 'hide'],
  ['transizione', 'transition'],
  ['animare', 'transition'],
  ['anima', 'transition'],
  // Commands - Events
  ['su', 'on'],
  ['quando', 'on'],
  ['al', 'on'],
  ['scatenare', 'trigger'],
  ['scatena', 'trigger'],
  ['attivare', 'trigger'],
  ['attiva', 'trigger'],
  ['inviare', 'send'],
  ['invia', 'send'],
  // Commands - DOM focus
  ['focalizzare', 'focus'],
  ['focalizza', 'focus'],
  ['sfuocare', 'blur'],
  ['sfuoca', 'blur'],
  // Commands - Navigation
  ['andare', 'go'],
  ['vai', 'go'],
  ['navigare', 'go'],
  ['naviga', 'go'],
  // Commands - Async
  ['aspettare', 'wait'],
  ['aspetta', 'wait'],
  ['attendere', 'wait'],
  ['attendi', 'wait'],
  ['recuperare', 'fetch'],
  ['recupera', 'fetch'],
  ['stabilizzare', 'settle'],
  ['stabilizza', 'settle'],
  // Commands - Control flow
  ['se', 'if'],
  ['altrimenti', 'else'],
  ['ripetere', 'repeat'],
  ['ripeti', 'repeat'],
  ['per', 'for'],
  ['mentre', 'while'],
  ['continuare', 'continue'],
  ['continua', 'continue'],
  ['fermare', 'halt'],
  ['ferma', 'halt'],
  ['lanciare', 'throw'],
  ['lancia', 'throw'],
  ['chiamare', 'call'],
  ['chiama', 'call'],
  ['ritornare', 'return'],
  ['ritorna', 'return'],
  // Commands - Advanced
  ['js', 'js'],
  ['asincrono', 'async'],
  ['dire', 'tell'],
  ['di', 'tell'],
  ['predefinito', 'default'],
  ['inizializzare', 'init'],
  ['inizializza', 'init'],
  ['comportamento', 'behavior'],
  ['installare', 'install'],
  ['installa', 'install'],
  ['misurare', 'measure'],
  ['misura', 'measure'],
  ['fino', 'until'],
  ['evento', 'event'],
  // Modifiers
  ['dentro', 'into'],
  ['prima', 'before'],
  ['dopo', 'after'],
  // Control flow helpers
  ['allora', 'then'],
  ['poi', 'then'],
  ['fine', 'end'],
  ['fino a', 'until'],
  // Events (for event name recognition)
  ['clic', 'click'],
  ['click', 'click'],
  ['fare clic', 'click'],
  ['input', 'input'],
  ['cambio', 'change'],
  ['invio', 'submit'],
  ['tasto giù', 'keydown'],
  ['tasto su', 'keyup'],
  ['mouse sopra', 'mouseover'],
  ['mouse fuori', 'mouseout'],
  ['fuoco', 'focus'],
  ['sfuocatura', 'blur'],
  ['caricamento', 'load'],
  ['scorrimento', 'scroll'],
  // References
  ['io', 'me'],
  ['me', 'me'],
  ['esso', 'it'],
  ['risultato', 'result'],
  ['obiettivo', 'target'],
  ['destinazione', 'target'],
  // Positional
  ['primo', 'first'],
  ['prima', 'first'],
  ['ultimo', 'last'],
  ['ultima', 'last'],
  ['prossimo', 'next'],
  ['successivo', 'next'],
  ['precedente', 'previous'],
  // Boolean
  ['vero', 'true'],
  ['falso', 'false'],
  // Time units
  ['secondo', 's'],
  ['secondi', 's'],
  ['millisecondo', 'ms'],
  ['millisecondi', 'ms'],
  ['minuto', 'm'],
  ['minuti', 'm'],
  ['ora', 'h'],
  ['ore', 'h'],
]);

// =============================================================================
// Italian Tokenizer Implementation
// =============================================================================

export class ItalianTokenizer extends BaseTokenizer {
  readonly language = 'it';
  readonly direction = 'ltr' as const;

  /** Morphological normalizer for Italian verb conjugations */
  private morphNormalizer = new ItalianMorphologicalNormalizer();

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
      if (isDigit(input[pos]) || (input[pos] === '-' && pos + 1 < input.length && isDigit(input[pos + 1]))) {
        const numberToken = this.extractItalianNumber(input, pos);
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

      // Try multi-word phrases first (e.g., "fino a", "fare clic")
      const phraseToken = this.tryMultiWordPhrase(input, pos);
      if (phraseToken) {
        tokens.push(phraseToken);
        pos = phraseToken.position.end;
        continue;
      }

      // Try Italian word
      if (isItalianLetter(input[pos])) {
        const wordToken = this.extractItalianWord(input, pos);
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

    return new TokenStreamImpl(tokens, 'it');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();

    if (PREPOSITIONS.has(lower)) return 'particle';
    if (ITALIAN_KEYWORDS.has(lower)) return 'keyword';
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
      'fino a',
      'prima di',
      'dopo di',
      'dentro di',
      'fuori di',
      'tasto giù',
      'tasto su',
      'mouse sopra',
      'mouse fuori',
      'fare clic',
    ];

    for (const phrase of multiWordPhrases) {
      const candidate = input.slice(pos, pos + phrase.length).toLowerCase();
      if (candidate === phrase) {
        // Check word boundary
        const nextPos = pos + phrase.length;
        if (nextPos >= input.length || isWhitespace(input[nextPos]) || !isItalianLetter(input[nextPos])) {
          const normalized = ITALIAN_KEYWORDS.get(phrase);
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
   * Extract an Italian word.
   *
   * Uses morphological normalization to handle:
   * - Reflexive verbs (mostrarsi → mostrare)
   * - Verb conjugations (alternando → alternare)
   */
  private extractItalianWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isItalianIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();

    // Check if this is a known keyword (exact match)
    const normalized = ITALIAN_KEYWORDS.get(lower);

    if (normalized) {
      return createToken(
        word,
        'keyword',
        createPosition(startPos, pos),
        normalized
      );
    }

    // Check if it's a preposition
    if (PREPOSITIONS.has(lower)) {
      return createToken(
        word,
        'particle',
        createPosition(startPos, pos)
      );
    }

    // Try morphological normalization for conjugated/reflexive forms
    const morphResult = this.morphNormalizer.normalize(lower);

    if (morphResult.stem !== lower && morphResult.confidence >= 0.7) {
      // Check if the stem (infinitive) is a known keyword
      const stemNormalized = ITALIAN_KEYWORDS.get(morphResult.stem);

      if (stemNormalized) {
        const tokenOptions: CreateTokenOptions = {
          normalized: stemNormalized,
          stem: morphResult.stem,
          stemConfidence: morphResult.confidence,
        };

        return createToken(
          word,
          'keyword',
          createPosition(startPos, pos),
          tokenOptions
        );
      }
    }

    // Not a keyword, return as identifier
    return createToken(
      word,
      'identifier',
      createPosition(startPos, pos)
    );
  }

  /**
   * Extract a number, including Italian time unit suffixes.
   */
  private extractItalianNumber(input: string, startPos: number): LanguageToken | null {
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

    // Check for Italian time units
    const remaining = input.slice(unitPos).toLowerCase();
    if (remaining.startsWith('millisecondi') || remaining.startsWith('millisecondo')) {
      number += 'ms';
      pos = unitPos + (remaining.startsWith('millisecondi') ? 12 : 12);
    } else if (remaining.startsWith('secondi') || remaining.startsWith('secondo')) {
      number += 's';
      pos = unitPos + (remaining.startsWith('secondi') ? 7 : 7);
    } else if (remaining.startsWith('minuti') || remaining.startsWith('minuto')) {
      number += 'm';
      pos = unitPos + (remaining.startsWith('minuti') ? 6 : 6);
    } else if (remaining.startsWith('ore') || remaining.startsWith('ora')) {
      number += 'h';
      pos = unitPos + (remaining.startsWith('ore') ? 3 : 3);
    }

    if (!number || number === '-' || number === '+') return null;

    return createToken(
      number,
      'literal',
      createPosition(startPos, pos)
    );
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
export const italianTokenizer = new ItalianTokenizer();
