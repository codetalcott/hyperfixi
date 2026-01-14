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
  createLatinCharClassifiers,
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isUrlStart,
  type KeywordEntry,
} from './base';
import { ItalianMorphologicalNormalizer } from './morphology/italian-normalizer';
import { italianProfile } from '../generators/profiles/italian';

// =============================================================================
// Italian Character Classification
// =============================================================================

const { isLetter: isItalianLetter, isIdentifierChar: isItalianIdentifierChar } =
  createLatinCharClassifiers(/[a-zA-ZàèéìíîòóùúÀÈÉÌÍÎÒÓÙÚ]/);

// =============================================================================
// Italian Prepositions
// =============================================================================

/**
 * Italian prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'in', // in, into
  'a', // to, at
  'di', // of, from
  'da', // from, by
  'con', // with
  'su', // on
  'per', // for
  'tra', // between
  'fra', // between (variant)
  'dopo', // after
  'prima', // before
  'dentro', // inside
  'fuori', // outside
  'sopra', // above
  'sotto', // under
  // Articulated prepositions
  'al', // a + il
  'allo', // a + lo
  'alla', // a + la
  'ai', // a + i
  'agli', // a + gli
  'alle', // a + le
  'del', // di + il
  'dello', // di + lo
  'della', // di + la
  'dei', // di + i
  'degli', // di + gli
  'delle', // di + le
  'dal', // da + il
  'dallo', // da + lo
  'dalla', // da + la
  'dai', // da + i
  'dagli', // da + gli
  'dalle', // da + le
  'nel', // in + il
  'nello', // in + lo
  'nella', // in + la
  'nei', // in + i
  'negli', // in + gli
  'nelle', // in + le
  'sul', // su + il
  'sullo', // su + lo
  'sulla', // su + la
  'sui', // su + i
  'sugli', // su + gli
  'sulle', // su + le
]);

// =============================================================================
// Italian Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false)
 * - Positional words
 * - Event names
 * - Time units
 * - Multi-word phrases
 * - Imperative forms (profile uses infinitives)
 */
const ITALIAN_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'vero', normalized: 'true' },
  { native: 'falso', normalized: 'false' },
  { native: 'nullo', normalized: 'null' },
  { native: 'indefinito', normalized: 'undefined' },

  // Positional
  { native: 'primo', normalized: 'first' },
  { native: 'prima', normalized: 'first' },
  { native: 'ultimo', normalized: 'last' },
  { native: 'ultima', normalized: 'last' },
  { native: 'prossimo', normalized: 'next' },
  { native: 'successivo', normalized: 'next' },
  { native: 'precedente', normalized: 'previous' },
  { native: 'vicino', normalized: 'closest' },
  { native: 'padre', normalized: 'parent' },

  // Events
  { native: 'clic', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'fare clic', normalized: 'click' },
  { native: 'input', normalized: 'input' },
  { native: 'cambio', normalized: 'change' },
  { native: 'invio', normalized: 'submit' },
  { native: 'tasto giù', normalized: 'keydown' },
  { native: 'tasto su', normalized: 'keyup' },
  { native: 'mouse sopra', normalized: 'mouseover' },
  { native: 'mouse fuori', normalized: 'mouseout' },
  { native: 'fuoco', normalized: 'focus' },
  { native: 'sfuocatura', normalized: 'blur' },
  { native: 'caricamento', normalized: 'load' },
  { native: 'scorrimento', normalized: 'scroll' },

  // References
  { native: 'io', normalized: 'me' },
  { native: 'me', normalized: 'me' },
  { native: 'destinazione', normalized: 'target' },

  // Time units
  { native: 'secondo', normalized: 's' },
  { native: 'secondi', normalized: 's' },
  { native: 'millisecondo', normalized: 'ms' },
  { native: 'millisecondi', normalized: 'ms' },
  { native: 'minuto', normalized: 'm' },
  { native: 'minuti', normalized: 'm' },
  { native: 'ora', normalized: 'h' },
  { native: 'ore', normalized: 'h' },

  // Multi-word phrases
  { native: 'fino a', normalized: 'until' },
  { native: 'prima di', normalized: 'before' },
  { native: 'dopo di', normalized: 'after' },
  { native: 'dentro di', normalized: 'into' },
  { native: 'fuori di', normalized: 'out' },

  // Override profile conflicts (aggiungere is both add and append in profile, prefer add)
  { native: 'aggiungere', normalized: 'add' },

  // Imperative forms (profile has infinitives)
  { native: 'aggiungi', normalized: 'add' },
  { native: 'rimuovi', normalized: 'remove' },
  { native: 'elimina', normalized: 'remove' },
  { native: 'togli', normalized: 'remove' },
  { native: 'metti', normalized: 'put' },
  { native: 'inserisci', normalized: 'put' },
  { native: 'prendi', normalized: 'take' },
  { native: 'fai', normalized: 'make' },
  { native: 'crea', normalized: 'make' },
  { native: 'clona', normalized: 'clone' },
  { native: 'copia', normalized: 'clone' },
  { native: 'imposta', normalized: 'set' },
  { native: 'ottieni', normalized: 'get' },
  { native: 'incrementa', normalized: 'increment' },
  { native: 'aumenta', normalized: 'increment' },
  { native: 'decrementa', normalized: 'decrement' },
  { native: 'diminuisci', normalized: 'decrement' },
  { native: 'registra', normalized: 'log' },
  { native: 'mostra', normalized: 'show' },
  { native: 'visualizza', normalized: 'show' },
  { native: 'nascondi', normalized: 'hide' },
  { native: 'anima', normalized: 'transition' },
  { native: 'scatena', normalized: 'trigger' },
  { native: 'attiva', normalized: 'trigger' },
  { native: 'invia', normalized: 'send' },
  { native: 'focalizza', normalized: 'focus' },
  { native: 'sfuoca', normalized: 'blur' },
  { native: 'vai', normalized: 'go' },
  { native: 'naviga', normalized: 'go' },
  { native: 'aspetta', normalized: 'wait' },
  { native: 'attendi', normalized: 'wait' },
  { native: 'recupera', normalized: 'fetch' },
  { native: 'stabilizza', normalized: 'settle' },
  { native: 'ripeti', normalized: 'repeat' },
  { native: 'continua', normalized: 'continue' },
  { native: 'ferma', normalized: 'halt' },
  { native: 'lancia', normalized: 'throw' },
  { native: 'chiama', normalized: 'call' },
  { native: 'ritorna', normalized: 'return' },
  { native: 'inizializza', normalized: 'init' },
  { native: 'installa', normalized: 'install' },
  { native: 'misura', normalized: 'measure' },

  // Logical/conditional
  { native: 'e', normalized: 'and' },
  { native: 'o', normalized: 'or' },
  { native: 'non', normalized: 'not' },
  { native: 'è', normalized: 'is' },
  { native: 'esiste', normalized: 'exists' },
  { native: 'vuoto', normalized: 'empty' },

  // Synonyms not in profile
  { native: 'toggle', normalized: 'toggle' },
  { native: 'di', normalized: 'tell' },
];

// =============================================================================
// Italian Tokenizer Implementation
// =============================================================================

export class ItalianTokenizer extends BaseTokenizer {
  readonly language = 'it';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(italianProfile, ITALIAN_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.normalizer = new ItalianMorphologicalNormalizer();
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
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
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
          !isItalianLetter(input[nextPos])
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

    // Check if it's a preposition first
    if (PREPOSITIONS.has(lower)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
    }

    // O(1) Map lookup instead of O(n) array search
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

    return createToken(number, 'literal', createPosition(startPos, pos));
  }
}

/**
 * Singleton instance.
 */
export const italianTokenizer = new ItalianTokenizer();
