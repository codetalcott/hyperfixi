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
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isUrlStart,
} from './base';

// =============================================================================
// Polish Character Classification
// =============================================================================

function isPolishLetter(char: string): boolean {
  return /[a-zA-ZąęćńóśźżłĄĘĆŃÓŚŹŻŁ]/.test(char);
}

function isPolishIdentifierChar(char: string): boolean {
  return isPolishLetter(char) || /[0-9_-]/.test(char);
}

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
// Polish Keywords
// =============================================================================

const POLISH_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations (imperative form)
  ['przełącz', 'toggle'],
  ['przelacz', 'toggle'], // without diacritic
  ['dodaj', 'add'],
  ['usuń', 'remove'],
  ['usun', 'remove'], // without diacritic
  ['wyczyść', 'remove'], // clear/clean
  ['wyczysc', 'remove'], // without diacritic

  // Commands - Content operations
  ['umieść', 'put'],
  ['umiesc', 'put'], // without diacritic
  ['wstaw', 'put'],
  ['połóż', 'put'],
  ['poloz', 'put'], // without diacritic
  ['dołącz', 'append'],
  ['dolacz', 'append'], // without diacritic
  ['weź', 'take'],
  ['wez', 'take'], // without diacritic
  ['pobierz', 'take'],
  ['utwórz', 'make'],
  ['utworz', 'make'], // without diacritic
  ['stwórz', 'make'],
  ['stworz', 'make'], // without diacritic
  ['sklonuj', 'clone'],
  ['kopiuj', 'clone'],
  ['zamień', 'swap'],
  ['zamien', 'swap'], // without diacritic
  ['przekształć', 'morph'],
  ['przeksztalc', 'morph'], // without diacritic

  // Commands - Variable operations
  ['ustaw', 'set'],
  ['określ', 'set'],
  ['okresl', 'set'], // without diacritic
  ['zwiększ', 'increment'],
  ['zwieksz', 'increment'], // without diacritic
  ['zmniejsz', 'decrement'],
  ['loguj', 'log'],
  ['wypisz', 'log'],

  // Commands - Visibility
  ['pokaż', 'show'],
  ['pokaz', 'show'], // without diacritic
  ['wyświetl', 'show'],
  ['wyswietl', 'show'], // without diacritic
  ['ukryj', 'hide'],
  ['schowaj', 'hide'],
  ['animuj', 'transition'],
  ['przejście', 'transition'],
  ['przejscie', 'transition'], // without diacritic

  // Commands - Events
  ['gdy', 'on'],
  ['kiedy', 'on'],
  ['przy', 'on'],
  ['wywołaj', 'trigger'],
  ['wywolaj', 'trigger'], // without diacritic
  ['wyzwól', 'trigger'],
  ['wyzwol', 'trigger'], // without diacritic
  ['wyślij', 'send'],
  ['wyslij', 'send'], // without diacritic

  // Commands - DOM focus
  ['skup', 'focus'],
  ['skupienie', 'focus'],
  ['rozmyj', 'blur'],
  ['odskup', 'blur'],

  // Commands - Navigation
  ['idź', 'go'],
  ['idz', 'go'], // without diacritic
  ['przejdź', 'go'],
  ['przejdz', 'go'], // without diacritic
  ['nawiguj', 'go'],

  // Commands - Async
  ['czekaj', 'wait'],
  ['poczekaj', 'wait'],
  ['załaduj', 'fetch'],
  ['zaladuj', 'fetch'], // without diacritic
  ['ustabilizuj', 'settle'],

  // Commands - Control flow
  ['jeśli', 'if'],
  ['jesli', 'if'], // without diacritic
  ['jeżeli', 'if'],
  ['jezeli', 'if'], // without diacritic
  ['inaczej', 'else'],
  ['wpp', 'else'], // w przeciwnym przypadku
  ['powtórz', 'repeat'],
  ['powtorz', 'repeat'], // without diacritic
  ['każdy', 'for'],
  ['kazdy', 'for'], // without diacritic
  ['dopóki', 'while'],
  ['dopoki', 'while'], // without diacritic
  ['podczas', 'while'],
  ['kontynuuj', 'continue'],
  ['dalej', 'continue'],
  ['zatrzymaj', 'halt'],
  ['przerwij', 'halt'],
  ['stop', 'halt'],
  ['rzuć', 'throw'],
  ['rzuc', 'throw'], // without diacritic
  ['zwróć', 'return'],
  ['zwroc', 'return'], // without diacritic

  // Commands - Advanced
  ['js', 'js'],
  ['asynchronicznie', 'async'],
  ['async', 'async'],
  ['powiedz', 'tell'],
  ['domyślnie', 'default'],
  ['domyslnie', 'default'], // without diacritic
  ['inicjuj', 'init'],
  ['zachowanie', 'behavior'],
  ['zainstaluj', 'install'],
  ['zmierz', 'measure'],

  // Control flow connectors
  ['wtedy', 'then'],
  ['potem', 'then'],
  ['następnie', 'then'],
  ['nastepnie', 'then'], // without diacritic
  ['i', 'and'],
  ['oraz', 'and'],
  ['koniec', 'end'],

  // Modifiers
  ['przed', 'before'],
  ['aż', 'until'],
  ['az', 'until'], // without diacritic
  ['zdarzenie', 'event'],

  // Events (also as keywords)
  ['kliknięcie', 'click'],
  ['klikniecie', 'click'],
  ['klik', 'click'],
  ['zmiana', 'change'],
  ['wysłanie', 'submit'],
  ['wyslanie', 'submit'],
  ['naciśnięcie', 'keydown'],
  ['nacisniecie', 'keydown'],
  ['klawisz', 'keydown'],
  ['najechanie', 'mouseover'],
  ['zjechanie', 'mouseout'],
  ['rozmycie', 'blur'],
  ['załadowanie', 'load'],
  ['zaladowanie', 'load'],
  ['przewinięcie', 'scroll'],
  ['przewiniecie', 'scroll'],

  // References
  ['ja', 'me'],
  ['mój', 'my'],
  ['moj', 'my'],
  ['to', 'it'],
  ['wynik', 'result'],
  ['cel', 'target'],

  // Positional
  ['pierwszy', 'first'],
  ['pierwsza', 'first'],
  ['pierwsze', 'first'],
  ['ostatni', 'last'],
  ['ostatnia', 'last'],
  ['ostatnie', 'last'],
  ['następny', 'next'],
  ['nastepny', 'next'],
  ['poprzedni', 'previous'],

  // Boolean
  ['prawda', 'true'],
  ['fałsz', 'false'],
  ['falsz', 'false'],

  // Time units
  ['sekunda', 's'],
  ['sekundy', 's'],
  ['sekund', 's'],
  ['milisekunda', 'ms'],
  ['milisekundy', 'ms'],
  ['milisekund', 'ms'],
  ['minuta', 'm'],
  ['minuty', 'm'],
  ['minut', 'm'],
  ['godzina', 'h'],
  ['godziny', 'h'],
  ['godzin', 'h'],
]);

// =============================================================================
// Polish Tokenizer
// =============================================================================

export class PolishTokenizer extends BaseTokenizer {
  readonly language = 'pl';
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
    if (POLISH_KEYWORDS.has(lower)) return 'keyword';
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
    const normalized = POLISH_KEYWORDS.get(lower);

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

export const polishTokenizer = new PolishTokenizer();
