/**
 * German Tokenizer
 *
 * Tokenizes German hyperscript input.
 * German characteristics:
 * - SVO word order (V2 in main clauses, but SVO for our purposes)
 * - Space-separated words
 * - Prepositions
 * - Umlauts (ä, ö, ü) and ß
 * - Compound nouns
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
// German Character Classification
// =============================================================================

function isGermanLetter(char: string): boolean {
  return /[a-zA-ZäöüÄÖÜß]/.test(char);
}

function isGermanIdentifierChar(char: string): boolean {
  return isGermanLetter(char) || /[0-9_-]/.test(char);
}

// =============================================================================
// German Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'an', // at, on
  'auf', // on
  'aus', // from, out of
  'bei', // at, near
  'durch', // through
  'für', // for
  'fur', // for (no umlaut)
  'gegen', // against
  'in', // in
  'mit', // with
  'nach', // after, to
  'ohne', // without
  'seit', // since
  'über', // over, about
  'uber', // over (no umlaut)
  'um', // around, at
  'unter', // under
  'von', // from, of
  'vor', // before, in front of
  'zu', // to
  'zwischen', // between
  'bis', // until
  'gegenüber', // opposite
  'gegenuber', // opposite (no umlaut)
  'während', // during
  'wahrend', // during (no umlaut)
  'wegen', // because of
  'trotz', // despite
  'statt', // instead of
  'innerhalb', // inside
  'außerhalb', // outside
  'ausserhalb', // outside (no umlaut)
]);

// =============================================================================
// German Keywords
// =============================================================================

const GERMAN_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['umschalten', 'toggle'],
  ['wechseln', 'toggle'],
  ['hinzufügen', 'add'],
  ['hinzufugen', 'add'],
  ['hinzufgen', 'add'],
  ['entfernen', 'remove'],
  ['löschen', 'remove'],
  ['loschen', 'remove'],
  // Commands - Content operations
  ['setzen', 'put'],
  ['stellen', 'put'],
  ['platzieren', 'put'],
  ['anhängen', 'append'],
  ['anhangen', 'append'],
  ['voranstellen', 'prepend'],
  ['nehmen', 'take'],
  ['machen', 'make'],
  ['erstellen', 'make'],
  ['erzeugen', 'make'],
  ['klonen', 'clone'],
  ['kopieren', 'clone'],
  ['verwandeln', 'morph'],
  ['transformieren', 'morph'],
  // Commands - Variable operations
  ['festlegen', 'set'],
  ['definieren', 'set'],
  ['holen', 'get'],
  ['bekommen', 'get'],
  ['erhöhen', 'increment'],
  ['erhohen', 'increment'],
  ['erhöhe', 'increment'], // first person imperative (test case)
  ['erhohe', 'increment'], // without umlaut
  ['verringern', 'decrement'],
  ['vermindern', 'decrement'],
  ['verringere', 'decrement'], // first person imperative (test case)
  ['protokollieren', 'log'],
  ['ausgeben', 'log'],
  // Commands - Visibility
  ['zeigen', 'show'],
  ['anzeigen', 'show'],
  ['verbergen', 'hide'],
  ['verstecken', 'hide'],
  ['übergang', 'transition'],
  ['ubergang', 'transition'],
  ['animieren', 'transition'],
  // Commands - Events
  ['bei', 'on'],
  ['wenn', 'on'],
  ['auf', 'on'],
  ['auslösen', 'trigger'],
  ['auslosen', 'trigger'],
  ['senden', 'send'],
  ['schicken', 'send'],
  // Commands - DOM focus
  ['fokussieren', 'focus'],
  ['defokussieren', 'blur'],
  ['entfokussieren', 'blur'],
  // Commands - Navigation
  ['gehen', 'go'],
  ['navigieren', 'go'],
  // Commands - Async
  ['warten', 'wait'],
  ['abrufen', 'fetch'],
  ['laden', 'fetch'],
  ['stabilisieren', 'settle'],
  // Commands - Control flow
  ['wenn', 'if'],
  ['falls', 'if'],
  ['sonst', 'else'],
  ['ansonsten', 'else'],
  ['wiederholen', 'repeat'],
  ['für', 'for'],
  ['solange', 'while'],
  ['während', 'while'],
  ['fortfahren', 'continue'],
  ['weiter', 'continue'],
  ['anhalten', 'halt'],
  ['stoppen', 'halt'],
  ['werfen', 'throw'],
  ['aufrufen', 'call'],
  ['zurückgeben', 'return'],
  ['zuruckgeben', 'return'],
  // Commands - Advanced
  ['js', 'js'],
  ['javascript', 'js'],
  ['asynchron', 'async'],
  ['sagen', 'tell'],
  ['standard', 'default'],
  ['initialisieren', 'init'],
  ['verhalten', 'behavior'],
  ['installieren', 'install'],
  ['messen', 'measure'],
  ['bis', 'until'],
  ['Ereignis', 'event'],
  ['ereignis', 'event'],
  // Modifiers
  ['hinein', 'into'],
  ['vor', 'before'],
  ['nach', 'after'],
  // Control flow helpers
  ['dann', 'then'],
  ['danach', 'then'],
  ['anschließend', 'then'],
  ['anschliessend', 'then'],
  ['ende', 'end'],
  ['beenden', 'end'],
  ['fertig', 'end'],
  ['bis', 'until'],
  // Events
  ['klick', 'click'],
  ['click', 'click'],
  ['eingabe', 'input'],
  ['änderung', 'change'],
  ['anderung', 'change'],
  ['absenden', 'submit'],
  ['taste unten', 'keydown'],
  ['taste oben', 'keyup'],
  ['maus drüber', 'mouseover'],
  ['maus weg', 'mouseout'],
  ['fokus', 'focus'],
  ['unschärfe', 'blur'],
  ['unscharfe', 'blur'],
  ['laden', 'load'],
  ['scrollen', 'scroll'],
  // References
  ['ich', 'me'],
  ['mein', 'my'],
  ['meine', 'my'],
  ['es', 'it'],
  ['ergebnis', 'result'],
  ['ereignis', 'event'],
  ['ziel', 'target'],
  // Positional
  ['erste', 'first'],
  ['erster', 'first'],
  ['erstes', 'first'],
  ['letzte', 'last'],
  ['letzter', 'last'],
  ['letztes', 'last'],
  ['nächste', 'next'],
  ['nachste', 'next'],
  ['vorherige', 'previous'],
  // Boolean
  ['wahr', 'true'],
  ['falsch', 'false'],
  // Time units
  ['sekunde', 's'],
  ['sekunden', 's'],
  ['millisekunde', 'ms'],
  ['millisekunden', 'ms'],
  ['minute', 'm'],
  ['minuten', 'm'],
  ['stunde', 'h'],
  ['stunden', 'h'],
]);

// =============================================================================
// German Tokenizer Implementation
// =============================================================================

export class GermanTokenizer extends BaseTokenizer {
  readonly language = 'de';
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

      if (isGermanLetter(input[pos])) {
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

    return new TokenStreamImpl(tokens, 'de');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    if (PREPOSITIONS.has(lower)) return 'particle';
    if (GERMAN_KEYWORDS.has(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    return 'identifier';
  }

  private extractWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isGermanIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();
    const normalized = GERMAN_KEYWORDS.get(lower);

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
    if (remaining.startsWith('millisekunden') || remaining.startsWith('millisekunde')) {
      number += 'ms';
      pos = unitPos + (remaining.startsWith('millisekunden') ? 13 : 12);
    } else if (remaining.startsWith('sekunden') || remaining.startsWith('sekunde')) {
      number += 's';
      pos = unitPos + (remaining.startsWith('sekunden') ? 8 : 7);
    } else if (remaining.startsWith('minuten') || remaining.startsWith('minute')) {
      number += 'm';
      pos = unitPos + (remaining.startsWith('minuten') ? 7 : 6);
    } else if (remaining.startsWith('stunden') || remaining.startsWith('stunde')) {
      number += 'h';
      pos = unitPos + (remaining.startsWith('stunden') ? 7 : 6);
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

export const germanTokenizer = new GermanTokenizer();
