/**
 * Quechua Tokenizer
 *
 * Tokenizes Quechua (Runasimi) hyperscript input.
 * Quechua characteristics:
 * - SOV word order
 * - Agglutinative/polysynthetic morphology
 * - Postpositions (suffixes)
 * - Case suffixes: -ta (accusative), -man (allative), -manta (ablative), etc.
 * - Evidential markers
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
// Quechua Character Classification
// =============================================================================

function isQuechuaLetter(char: string): boolean {
  // Quechua uses Latin script with some special characters
  return /[a-zA-ZñÑ']/.test(char);
}

function isQuechuaIdentifierChar(char: string): boolean {
  return isQuechuaLetter(char) || /[0-9_-]/.test(char);
}

// =============================================================================
// Quechua Suffixes (Postpositions/Case markers)
// =============================================================================

const SUFFIXES = new Set([
  '-ta', // accusative (direct object)
  '-man', // allative (to, towards)
  '-manta', // ablative (from)
  '-pi', // locative (at, in)
  '-wan', // comitative/instrumental (with)
  '-paq', // benefactive (for)
  '-kama', // limitative (until, up to)
  '-rayku', // causative (because of)
  '-hina', // simulative (like, as)
]);

// =============================================================================
// Quechua Keywords
// =============================================================================

const QUECHUA_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ["t'ikray", 'toggle'],
  ['tikray', 'toggle'],
  ['kutichiy', 'toggle'],
  ['yapay', 'add'],
  ['yapaykuy', 'add'],
  ['qichuy', 'remove'],
  ['hurquy', 'remove'],
  ['anchuchiy', 'remove'],
  // Commands - Content operations
  ['churay', 'put'],
  ['tiyachiy', 'put'],
  ['qatichiy', 'append'],
  ['ñawpachiy', 'prepend'],
  ['nawpachiy', 'prepend'],
  ['hapiy', 'take'],
  ['ruray', 'make'],
  ['kamay', 'make'],
  ['kikinchay', 'clone'],
  ['qillqay', 'clone'],
  ["t'inkuy", 'swap'],
  ['tinkuy', 'swap'],
  // Note: tikray maps to toggle (lines 61-62), use different words for morph
  ['tukuchiy', 'morph'], // "to transform completely"
  // Commands - Variable operations
  ['churay', 'set'],
  ['kamaykuy', 'set'],
  ['taripay', 'get'],
  ['yapachiy', 'increment'],
  ['pisiyachiy', 'decrement'],
  ['qillqakuy', 'log'],
  ['willakuy', 'log'],
  // Commands - Visibility
  ['rikuchiy', 'show'],
  ['qawachiy', 'show'],
  ['pakay', 'hide'],
  ['pakakuy', 'hide'],
  // Note: tikray maps to toggle (lines 61-62), use different words for transition
  ['muyuy', 'transition'], // "to move smoothly"
  ['kuyuchiy', 'transition'],
  // Commands - Events
  ['chaypim', 'on'],
  ['kaypi', 'on'],
  ['qallarichiy', 'trigger'],
  ['kachay', 'send'],
  ['apachiy', 'send'],
  // Commands - DOM focus
  ['qhawachiy', 'focus'],
  ['mana qhawachiy', 'blur'],
  // Commands - Navigation
  ['riy', 'go'],
  ['puriy', 'go'],
  // Commands - Async
  ['suyay', 'wait'],
  ['apamuy', 'fetch'],
  ['taripakaramuy', 'fetch'],
  ['tiyakuy', 'settle'],
  // Commands - Control flow
  ['sichus', 'if'],
  ['manachus', 'else'],
  ['hukniraq', 'else'],
  ['kutipay', 'repeat'],
  ['muyu', 'repeat'],
  ['sapankaq', 'for'],
  ['kaykamaqa', 'while'],
  ['qatipay', 'continue'],
  ['sayay', 'halt'],
  ['tukuy', 'halt'],
  ['chanqay', 'throw'],
  ['waqyay', 'call'],
  ['kutichiy', 'return'],
  ['kutimuy', 'return'],
  // Commands - Advanced
  ['js', 'js'],
  ['mana waqtalla', 'async'],
  ['niy', 'tell'],
  ['willakuy', 'tell'],
  ['qallariy', 'default'],
  ['qallarichiy', 'init'],
  ['ruwana', 'behavior'],
  ['tupuy', 'measure'],
  ['ruwakuq', 'event'],
  ['-manta', 'from'],
  // Modifiers
  ['ukuman', 'into'],
  ['ñawpaq', 'before'],
  ['nawpaq', 'before'],
  ['qhipa', 'after'],
  // Control flow helpers
  ['chayqa', 'then'],
  ['chaymanta', 'then'],
  ['chaymantataq', 'then'],
  ['hinaspa', 'then'],
  ['tukuy', 'end'],
  ['tukukuy', 'end'],
  ['puchukay', 'end'],
  ['kaykama', 'until'],
  // Events
  ['llikllay', 'click'],
  ['click', 'click'],
  ['yaykuy', 'input'],
  ['tikray', 'change'],
  ['apachiy', 'submit'],
  ['llave uray', 'keydown'],
  ['llave hawa', 'keyup'],
  ['mausiri yayku', 'mouseover'],
  ['mausiri lluqsi', 'mouseout'],
  ['qhaway', 'focus'],
  ['mana qhaway', 'blur'],
  ['kargay', 'load'],
  ['muyuy', 'scroll'],
  // References
  ['ñuqa', 'me'],
  ['nuqa', 'me'],
  ['ñuqap', 'my'],
  ['nuqap', 'my'],
  ['chay', 'it'],
  ['chaymi', 'it'],
  ['lluqsiy', 'result'],
  ['ruway', 'event'],
  ['maypi', 'target'],
  // Positional
  ['ñawpaq', 'first'],
  ['nawpaq', 'first'],
  ['qhipa', 'last'],
  ['hamuq', 'next'],
  ['ñawpaq kaq', 'previous'],
  // Boolean
  ['arí', 'true'],
  ['ari', 'true'],
  ['manan', 'false'],
  ['mana', 'false'],
  // Time units
  ['sikundu', 'seconds'],
  ['segundu', 's'],
  ['waranqa sikundu', 'ms'],
  ['minutu', 'm'],
  ['ura', 'h'],
  ['hora', 'h'],
]);

// =============================================================================
// Quechua Tokenizer Implementation
// =============================================================================

export class QuechuaTokenizer extends BaseTokenizer {
  readonly language = 'qu';
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

      // Check for suffix markers (-ta, -man, etc.)
      if (input[pos] === '-') {
        const suffixToken = this.trySuffix(input, pos);
        if (suffixToken) {
          tokens.push(suffixToken);
          pos = suffixToken.position.end;
          continue;
        }
      }

      if (isQuechuaLetter(input[pos])) {
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

    return new TokenStreamImpl(tokens, 'qu');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    if (SUFFIXES.has(lower)) return 'particle';
    if (QUECHUA_KEYWORDS.has(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    return 'identifier';
  }

  private trySuffix(input: string, startPos: number): LanguageToken | null {
    // Check for known suffixes
    for (const suffix of SUFFIXES) {
      if (input.slice(startPos, startPos + suffix.length).toLowerCase() === suffix) {
        return createToken(
          input.slice(startPos, startPos + suffix.length),
          'particle',
          createPosition(startPos, startPos + suffix.length)
        );
      }
    }
    return null;
  }

  private extractWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isQuechuaIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();
    const normalized = QUECHUA_KEYWORDS.get(lower);

    if (normalized) {
      return createToken(word, 'keyword', createPosition(startPos, pos), normalized);
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

    // Quechua time units (borrowed from Spanish)
    const remaining = input.slice(unitPos).toLowerCase();
    if (remaining.startsWith('sikundu') || remaining.startsWith('segundu')) {
      number += 's';
      pos = unitPos + 7;
    } else if (remaining.startsWith('minutu')) {
      number += 'm';
      pos = unitPos + 6;
    } else if (remaining.startsWith('hora') || remaining.startsWith('ura')) {
      number += 'h';
      pos = unitPos + (remaining.startsWith('hora') ? 4 : 3);
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
    if (['<', '>', '!', '+', '*', '/', '='].includes(oneChar)) {
      return createToken(oneChar, 'operator', createPosition(pos, pos + 1));
    }

    if (['(', ')', '{', '}', ',', ';', ':'].includes(oneChar)) {
      return createToken(oneChar, 'punctuation', createPosition(pos, pos + 1));
    }

    return null;
  }
}

export const quechuaTokenizer = new QuechuaTokenizer();
