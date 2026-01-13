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
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isUrlStart,
} from './base';

// =============================================================================
// Swahili Character Classification
// =============================================================================

function isSwahiliLetter(char: string): boolean {
  return /[a-zA-Z]/.test(char);
}

function isSwahiliIdentifierChar(char: string): boolean {
  return isSwahiliLetter(char) || /[0-9_-]/.test(char);
}

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
// Swahili Keywords
// =============================================================================

const SWAHILI_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['badilisha', 'toggle'],
  ['geuza', 'toggle'],
  ['ongeza', 'add'],
  ['weka', 'add'],
  ['ondoa', 'remove'],
  ['futa', 'remove'],
  ['toa', 'remove'],
  // Commands - Content operations
  ['weka', 'put'],
  ['tia', 'put'],
  ['ambatanisha', 'append'],
  ['tanguliza', 'prepend'],
  ['chukua', 'take'],
  ['tengeneza', 'make'],
  ['unda', 'make'],
  ['nakili', 'clone'],
  ['rudufu', 'clone'],
  ['geuza', 'morph'],
  ['badilisha', 'swap'],
  // Commands - Variable operations
  ['weka', 'set'],
  ['seti', 'set'],
  ['pata', 'get'],
  ['pokea', 'get'],
  ['ongeza', 'increment'],
  ['punguza', 'decrement'],
  ['andika', 'log'],
  ['rekodi', 'log'],
  // Commands - Visibility
  ['onyesha', 'show'],
  ['ficha', 'hide'],
  ['mficho', 'hide'],
  ['hamisha', 'transition'],
  ['animisha', 'transition'],
  // Commands - Events
  ['wakati', 'on'],
  ['kwenye', 'on'],
  ['unapo', 'on'],
  ['chochea', 'trigger'],
  ['anzisha', 'trigger'],
  ['tuma', 'send'],
  ['peleka', 'send'],
  // Commands - DOM focus
  ['lenga', 'focus'],
  ['angazia', 'focus'],
  ['ondoa lenga', 'blur'],
  ['blur', 'blur'],
  // Commands - Navigation
  ['nenda', 'go'],
  ['enda', 'go'],
  ['elekea', 'go'],
  // Commands - Async
  ['subiri', 'wait'],
  ['ngoja', 'wait'],
  ['leta', 'fetch'],
  ['pakia', 'fetch'],
  ['tulia', 'settle'],
  ['imarika', 'settle'],
  // Commands - Control flow
  ['kama', 'if'],
  ['ikiwa', 'if'],
  ['vinginevyo', 'else'],
  ['sivyo', 'else'],
  ['rudia', 'repeat'],
  ['kwa', 'for'],
  ['wakati', 'while'],
  ['endelea', 'continue'],
  ['simama', 'halt'],
  ['acha', 'halt'],
  ['tupa', 'throw'],
  ['ita', 'call'],
  ['piga simu', 'call'],
  ['rudisha', 'return'],
  ['rejea', 'return'],
  // Commands - Advanced
  ['js', 'js'],
  ['javascript', 'js'],
  ['isiyo sawia', 'async'],
  ['sema', 'tell'],
  ['ambia', 'tell'],
  ['chaguo-msingi', 'default'],
  ['anzisha', 'init'],
  ['anza', 'init'],
  ['tabia', 'behavior'],
  ['pima', 'measure'],
  ['hadi', 'until'],
  ['tukio', 'event'],
  ['kutoka', 'from'],
  // Modifiers
  ['ndani', 'into'],
  ['kabla', 'before'],
  ['baada', 'after'],
  // Control flow helpers
  ['basi', 'then'],
  ['kisha', 'then'],
  ['halafu', 'then'],
  ['baadaye', 'then'],
  ['mwisho', 'end'],
  ['maliza', 'end'],
  ['tamati', 'end'],
  ['hadi', 'until'],
  ['mpaka', 'until'],
  // Events
  ['bonyeza', 'click'],
  ['click', 'click'],
  ['ingiza', 'input'],
  ['badiliko', 'change'],
  ['wasilisha', 'submit'],
  ['funguo chini', 'keydown'],
  ['funguo juu', 'keyup'],
  ['kipanya juu', 'mouseover'],
  ['kipanya nje', 'mouseout'],
  ['lenga', 'focus'],
  ['ukungu', 'blur'],
  ['pakia', 'load'],
  ['sogeza', 'scroll'],
  // References
  ['mimi', 'me'],
  ['yangu', 'my'],
  ['hiyo', 'it'],
  ['yenyewe', 'it'],
  ['matokeo', 'result'],
  ['tukio', 'event'],
  ['lengo', 'target'],
  // Positional
  ['kwanza', 'first'],
  ['mwisho', 'last'],
  ['inayofuata', 'next'],
  ['iliyopita', 'previous'],
  // Boolean
  ['kweli', 'true'],
  ['uongo', 'false'],
  // Time units
  ['sekunde', 's'],
  ['milisekunde', 'ms'],
  ['dakika', 'm'],
  ['saa', 'h'],
]);

// =============================================================================
// Swahili Tokenizer Implementation
// =============================================================================

export class SwahiliTokenizer extends BaseTokenizer {
  readonly language = 'sw';
  readonly direction = 'ltr' as const;

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      if (isWhitespace(input[pos])) {
        pos++;
        continue;
      }

      if (isSelectorStart(input[pos])) {
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
    if (SWAHILI_KEYWORDS.has(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
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
    const normalized = SWAHILI_KEYWORDS.get(lower);

    if (normalized) {
      return createToken(word, 'keyword', createPosition(startPos, pos), normalized);
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

  private tryOperator(input: string, pos: number): LanguageToken | null {
    const twoChar = input.slice(pos, pos + 2);
    if (['==', '!=', '<=', '>=', '&&', '||', '->'].includes(twoChar)) {
      return createToken(twoChar, 'operator', createPosition(pos, pos + 2));
    }

    const oneChar = input[pos];
    if (['<', '>', '!', '+', '-', '*', '/', '='].includes(oneChar)) {
      return createToken(oneChar, 'operator', createPosition(pos, pos + 1));
    }

    if (['(', ')', '{', '}', ',', ';', ':'].includes(oneChar)) {
      return createToken(oneChar, 'punctuation', createPosition(pos, pos + 1));
    }

    return null;
  }
}

export const swahiliTokenizer = new SwahiliTokenizer();
