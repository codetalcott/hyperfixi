/**
 * Ukrainian Tokenizer
 *
 * Tokenizes Ukrainian hyperscript input.
 * Ukrainian characteristics:
 * - SVO word order (relatively free, but SVO is common)
 * - Space-separated words
 * - Prepositions
 * - Cyrillic alphabet (with unique letters і, ї, є, ґ)
 * - Fusional morphology with verb conjugations
 * - Imperative form used in software UI (infinitive also common)
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
// Ukrainian Character Classification
// =============================================================================

function isUkrainianLetter(char: string): boolean {
  // Ukrainian Cyrillic: а-яА-Я plus unique і, ї, є, ґ, ь, '
  return /[a-zA-Zа-яА-ЯіІїЇєЄґҐьЬ']/.test(char);
}

function isUkrainianIdentifierChar(char: string): boolean {
  return isUkrainianLetter(char) || /[0-9_-]/.test(char);
}

// =============================================================================
// Ukrainian Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'в', // in
  'у', // in
  'на', // on
  'з', // with, from
  'із', // with (variant)
  'зі', // with (before consonant clusters)
  'до', // to
  'від', // from
  'о', // about
  'об', // about (before vowels)
  'при', // at, during
  'для', // for
  'під', // under
  'над', // above
  'перед', // in front of
  'між', // between
  'через', // through
  'без', // without
  'по', // along, by
  'за', // behind, for
  'про', // about
  'після', // after
  'навколо', // around
  'проти', // against
  'замість', // instead of
  'крім', // except
  'серед', // among
  'к', // to (less common)
]);

// =============================================================================
// Ukrainian Keywords
// =============================================================================

const UKRAINIAN_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['перемкнути', 'toggle'],
  ['перемкни', 'toggle'], // imperative
  ['додати', 'add'],
  ['додай', 'add'], // imperative
  ['видалити', 'remove'],
  ['видали', 'remove'], // imperative
  ['прибрати', 'remove'],
  ['прибери', 'remove'], // imperative

  // Commands - Content operations
  ['покласти', 'put'],
  ['поклади', 'put'], // imperative
  ['помістити', 'put'],
  ['помісти', 'put'], // imperative
  ['вставити', 'put'],
  ['встав', 'put'], // imperative
  ['додати_в_кінець', 'append'],
  ['взяти', 'take'],
  ['візьми', 'take'], // imperative
  ['створити', 'make'],
  ['створи', 'make'], // imperative
  ['клонувати', 'clone'],
  ['клонуй', 'clone'], // imperative
  ['поміняти', 'swap'],
  ['поміняй', 'swap'], // imperative
  ['трансформувати', 'morph'],
  ['трансформуй', 'morph'], // imperative

  // Commands - Variable operations
  ['встановити', 'set'],
  ['встанови', 'set'], // imperative
  ['задати', 'set'],
  ['задай', 'set'], // imperative
  ['отримати', 'get'],
  ['отримай', 'get'], // imperative
  ['збільшити', 'increment'],
  ['збільш', 'increment'], // imperative
  ['зменшити', 'decrement'],
  ['зменш', 'decrement'], // imperative
  ['записати', 'log'],
  ['запиши', 'log'], // imperative

  // Commands - Visibility
  ['показати', 'show'],
  ['покажи', 'show'], // imperative
  ['сховати', 'hide'],
  ['сховай', 'hide'], // imperative
  ['приховати', 'hide'],
  ['приховай', 'hide'], // imperative
  ['анімувати', 'transition'],
  ['анімуй', 'transition'], // imperative

  // Commands - Events
  ['коли', 'on'],
  ['при', 'on'],
  ['викликати', 'trigger'],
  ['виклич', 'trigger'], // imperative
  ['надіслати', 'send'],
  ['надішли', 'send'], // imperative

  // Commands - DOM focus
  ['сфокусувати', 'focus'],
  ['сфокусуй', 'focus'], // imperative
  ['фокус', 'focus'],
  ['розфокусувати', 'blur'],
  ['розфокусуй', 'blur'], // imperative

  // Commands - Navigation
  ['перейти', 'go'],
  ['перейди', 'go'], // imperative
  ['йти', 'go'],
  ['йди', 'go'], // imperative

  // Commands - Async
  ['чекати', 'wait'],
  ['чекай', 'wait'], // imperative
  ['зачекай', 'wait'], // imperative
  ['завантажити', 'fetch'],
  ['завантаж', 'fetch'], // imperative
  ['стабілізувати', 'settle'],

  // Commands - Control flow
  ['якщо', 'if'],
  ['інакше', 'else'],
  ['повторити', 'repeat'],
  ['повтори', 'repeat'], // imperative
  ['для', 'for'],
  ['кожний', 'for'],
  ['поки', 'while'],
  ['продовжити', 'continue'],
  ['продовжуй', 'continue'], // imperative
  ['зупинити', 'halt'],
  ['зупинись', 'halt'], // imperative
  ['стоп', 'halt'],
  ['кинути', 'throw'],
  ['кинь', 'throw'], // imperative
  ['повернути', 'return'],
  ['поверни', 'return'], // imperative

  // Commands - Advanced
  ['js', 'js'],
  ['асинхронно', 'async'],
  ['async', 'async'],
  ['сказати', 'tell'],
  ['скажи', 'tell'], // imperative
  ['за_замовчуванням', 'default'],
  ['ініціалізувати', 'init'],
  ['ініціалізуй', 'init'], // imperative
  ['поведінка', 'behavior'],
  ['встановити_пакет', 'install'],
  ['виміряти', 'measure'],
  ['виміряй', 'measure'], // imperative

  // Control flow connectors
  ['потім', 'then'],
  ['далі', 'then'],
  ['тоді', 'then'],
  ['і', 'and'],
  ['та', 'and'],
  ['кінець', 'end'],

  // Modifiers
  ['до', 'before'],
  ['перед', 'before'],
  ['після', 'after'],
  ['подія', 'event'],

  // Events (also as keywords)
  ['клік', 'click'],
  ['натискання', 'click'],
  ['зміна', 'change'],
  ['надсилання', 'submit'],
  ['клавіша', 'keydown'],
  ['наведення', 'mouseover'],
  ['відведення', 'mouseout'],
  ['завантаження', 'load'],
  ['прокрутка', 'scroll'],

  // References
  ['я', 'me'],
  ['мій', 'my'],
  ['моя', 'my'],
  ['моє', 'my'],
  ['мої', 'my'],
  ['це', 'it'],
  ['результат', 'result'],
  ['ціль', 'target'],

  // Positional
  ['перший', 'first'],
  ['перша', 'first'],
  ['перше', 'first'],
  ['останній', 'last'],
  ['остання', 'last'],
  ['останнє', 'last'],
  ['наступний', 'next'],
  ['наступна', 'next'],
  ['попередній', 'previous'],
  ['попередня', 'previous'],

  // Boolean
  ['істина', 'true'],
  ['правда', 'true'],
  ['хибність', 'false'],

  // Time units
  ['секунда', 's'],
  ['секунди', 's'],
  ['секунд', 's'],
  ['мілісекунда', 'ms'],
  ['мілісекунди', 'ms'],
  ['мілісекунд', 'ms'],
  ['хвилина', 'm'],
  ['хвилини', 'm'],
  ['хвилин', 'm'],
  ['година', 'h'],
  ['години', 'h'],
  ['годин', 'h'],
]);

// =============================================================================
// Ukrainian Tokenizer
// =============================================================================

export class UkrainianTokenizer extends BaseTokenizer {
  readonly language = 'uk';
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

      if (isUkrainianLetter(input[pos])) {
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

    return new TokenStreamImpl(tokens, 'uk');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    if (PREPOSITIONS.has(lower)) return 'particle';
    if (UKRAINIAN_KEYWORDS.has(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    return 'identifier';
  }

  private extractWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isUkrainianIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();
    const normalized = UKRAINIAN_KEYWORDS.get(lower);

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
    if (remaining.startsWith('мілісекунд') || remaining.startsWith('мс')) {
      if (remaining.startsWith('мілісекунд')) {
        number += 'ms';
        pos = unitPos + 10; // "мілісекунд"
        // Handle inflection endings
        if (remaining.length > 10 && /[аи]/.test(remaining[10])) {
          pos++;
        }
      } else {
        number += 'ms';
        pos = unitPos + 2;
      }
    } else if (remaining.startsWith('секунд') || remaining.startsWith('сек')) {
      if (remaining.startsWith('секунд')) {
        number += 's';
        pos = unitPos + 6;
        // Handle inflection endings
        if (remaining.length > 6 && /[аи]/.test(remaining[6])) {
          pos++;
        }
      } else {
        number += 's';
        pos = unitPos + 3;
      }
    } else if (remaining.startsWith('хвилин') || remaining.startsWith('хв')) {
      if (remaining.startsWith('хвилин')) {
        number += 'm';
        pos = unitPos + 6;
        // Handle inflection endings
        if (remaining.length > 6 && /[аи]/.test(remaining[6])) {
          pos++;
        }
      } else {
        number += 'm';
        pos = unitPos + 2;
      }
    } else if (remaining.startsWith('годин')) {
      number += 'h';
      pos = unitPos + 5;
      // Handle inflection endings
      if (remaining.length > 5 && /[аи]/.test(remaining[5])) {
        pos++;
      }
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

export const ukrainianTokenizer = new UkrainianTokenizer();
