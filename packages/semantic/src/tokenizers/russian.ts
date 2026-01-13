/**
 * Russian Tokenizer
 *
 * Tokenizes Russian hyperscript input.
 * Russian characteristics:
 * - SVO word order (relatively free, but SVO is common)
 * - Space-separated words
 * - Prepositions
 * - Cyrillic alphabet
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
// Russian Character Classification
// =============================================================================

function isRussianLetter(char: string): boolean {
  return /[a-zA-Zа-яА-ЯёЁ]/.test(char);
}

function isRussianIdentifierChar(char: string): boolean {
  return isRussianLetter(char) || /[0-9_-]/.test(char);
}

// =============================================================================
// Russian Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'в', // in
  'во', // in (before consonant clusters)
  'на', // on
  'с', // with, from
  'со', // with (before consonant clusters)
  'к', // to, towards
  'ко', // to (before consonant clusters)
  'о', // about
  'об', // about (before vowels)
  'обо', // about (before consonant clusters)
  'у', // at, by
  'от', // from
  'до', // until, to
  'из', // from, out of
  'за', // behind, for
  'по', // along, by
  'под', // under
  'над', // above
  'перед', // in front of
  'передо', // in front of (before consonant clusters)
  'между', // between
  'через', // through
  'без', // without
  'для', // for
  'при', // at, during
  'про', // about
  'после', // after
  'вокруг', // around
  'против', // against
  'вместо', // instead of
  'кроме', // except
  'среди', // among
]);

// =============================================================================
// Russian Keywords
// =============================================================================

const RUSSIAN_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['переключить', 'toggle'],
  ['переключи', 'toggle'], // imperative
  ['добавить', 'add'],
  ['добавь', 'add'], // imperative
  ['удалить', 'remove'],
  ['удали', 'remove'], // imperative
  ['убрать', 'remove'],
  ['убери', 'remove'], // imperative

  // Commands - Content operations
  ['положить', 'put'],
  ['положи', 'put'], // imperative
  ['поместить', 'put'],
  ['помести', 'put'], // imperative
  ['вставить', 'put'],
  ['вставь', 'put'], // imperative
  ['добавить_в_конец', 'append'],
  ['взять', 'take'],
  ['возьми', 'take'], // imperative
  ['создать', 'make'],
  ['создай', 'make'], // imperative
  ['клонировать', 'clone'],
  ['клонируй', 'clone'], // imperative
  ['поменять', 'swap'],
  ['поменяй', 'swap'], // imperative
  ['трансформировать', 'morph'],
  ['трансформируй', 'morph'], // imperative

  // Commands - Variable operations
  ['установить', 'set'],
  ['установи', 'set'], // imperative
  ['задать', 'set'],
  ['задай', 'set'], // imperative
  ['получить', 'get'],
  ['получи', 'get'], // imperative
  ['увеличить', 'increment'],
  ['увеличь', 'increment'], // imperative
  ['уменьшить', 'decrement'],
  ['уменьши', 'decrement'], // imperative
  ['записать', 'log'],
  ['запиши', 'log'], // imperative

  // Commands - Visibility
  ['показать', 'show'],
  ['покажи', 'show'], // imperative
  ['скрыть', 'hide'],
  ['скрой', 'hide'], // imperative
  ['спрятать', 'hide'],
  ['спрячь', 'hide'], // imperative
  ['анимировать', 'transition'],
  ['анимируй', 'transition'], // imperative

  // Commands - Events
  ['когда', 'on'],
  ['при', 'on'],
  ['вызвать', 'trigger'],
  ['вызови', 'trigger'], // imperative
  ['отправить', 'send'],
  ['отправь', 'send'], // imperative

  // Commands - DOM focus
  ['сфокусировать', 'focus'],
  ['сфокусируй', 'focus'], // imperative
  ['фокус', 'focus'],
  ['размыть', 'blur'],
  ['размой', 'blur'], // imperative

  // Commands - Navigation
  ['перейти', 'go'],
  ['перейди', 'go'], // imperative
  ['идти', 'go'],
  ['иди', 'go'], // imperative

  // Commands - Async
  ['ждать', 'wait'],
  ['жди', 'wait'], // imperative
  ['подожди', 'wait'], // imperative
  ['загрузить', 'fetch'],
  ['загрузи', 'fetch'], // imperative
  ['стабилизировать', 'settle'],

  // Commands - Control flow
  ['если', 'if'],
  ['иначе', 'else'],
  ['повторить', 'repeat'],
  ['повтори', 'repeat'], // imperative
  ['для', 'for'],
  ['каждый', 'for'],
  ['пока', 'while'],
  ['продолжить', 'continue'],
  ['продолжи', 'continue'], // imperative
  ['остановить', 'halt'],
  ['остановись', 'halt'], // imperative
  ['стоп', 'halt'],
  ['бросить', 'throw'],
  ['брось', 'throw'], // imperative
  ['вернуть', 'return'],
  ['верни', 'return'], // imperative

  // Commands - Advanced
  ['js', 'js'],
  ['асинхронно', 'async'],
  ['async', 'async'],
  ['сказать', 'tell'],
  ['скажи', 'tell'], // imperative
  ['по_умолчанию', 'default'],
  ['инициализировать', 'init'],
  ['инициализируй', 'init'], // imperative
  ['поведение', 'behavior'],
  ['установить_пакет', 'install'],
  ['измерить', 'measure'],
  ['измерь', 'measure'], // imperative

  // Control flow connectors
  ['затем', 'then'],
  ['потом', 'then'],
  ['тогда', 'then'],
  ['и', 'and'],
  ['конец', 'end'],

  // Modifiers
  ['до', 'before'],
  ['после', 'after'],
  ['событие', 'event'],

  // Events (also as keywords)
  ['клик', 'click'],
  ['нажатие', 'click'],
  ['изменение', 'change'],
  ['отправка', 'submit'],
  ['клавиша', 'keydown'],
  ['наведение', 'mouseover'],
  ['уход', 'mouseout'],
  ['загрузка', 'load'],
  ['прокрутка', 'scroll'],

  // References
  ['я', 'me'],
  ['мой', 'my'],
  ['моя', 'my'],
  ['моё', 'my'],
  ['мои', 'my'],
  ['это', 'it'],
  ['результат', 'result'],
  ['цель', 'target'],

  // Positional
  ['первый', 'first'],
  ['первая', 'first'],
  ['первое', 'first'],
  ['последний', 'last'],
  ['последняя', 'last'],
  ['последнее', 'last'],
  ['следующий', 'next'],
  ['следующая', 'next'],
  ['предыдущий', 'previous'],
  ['предыдущая', 'previous'],

  // Boolean
  ['истина', 'true'],
  ['правда', 'true'],
  ['ложь', 'false'],

  // Time units
  ['секунда', 's'],
  ['секунды', 's'],
  ['секунд', 's'],
  ['миллисекунда', 'ms'],
  ['миллисекунды', 'ms'],
  ['миллисекунд', 'ms'],
  ['минута', 'm'],
  ['минуты', 'm'],
  ['минут', 'm'],
  ['час', 'h'],
  ['часа', 'h'],
  ['часов', 'h'],
]);

// =============================================================================
// Russian Tokenizer
// =============================================================================

export class RussianTokenizer extends BaseTokenizer {
  readonly language = 'ru';
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

      if (isRussianLetter(input[pos])) {
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

    return new TokenStreamImpl(tokens, 'ru');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    if (PREPOSITIONS.has(lower)) return 'particle';
    if (RUSSIAN_KEYWORDS.has(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    return 'identifier';
  }

  private extractWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isRussianIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();
    const normalized = RUSSIAN_KEYWORDS.get(lower);

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
    if (remaining.startsWith('миллисекунд') || remaining.startsWith('мс')) {
      if (remaining.startsWith('миллисекунд')) {
        number += 'ms';
        pos = unitPos + 11; // "миллисекунд"
        // Handle inflection endings
        if (remaining.length > 11 && /[аы]/.test(remaining[11])) {
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
        if (remaining.length > 6 && /[аы]/.test(remaining[6])) {
          pos++;
        }
      } else {
        number += 's';
        pos = unitPos + 3;
      }
    } else if (remaining.startsWith('минут') || remaining.startsWith('мин')) {
      if (remaining.startsWith('минут')) {
        number += 'm';
        pos = unitPos + 5;
        // Handle inflection endings
        if (remaining.length > 5 && /[аы]/.test(remaining[5])) {
          pos++;
        }
      } else {
        number += 'm';
        pos = unitPos + 3;
      }
    } else if (remaining.startsWith('час')) {
      number += 'h';
      pos = unitPos + 3;
      // Handle inflection endings: часа, часов
      if (remaining.length > 3 && remaining[3] === 'а') {
        pos++;
      } else if (remaining.length > 3 && remaining.slice(3, 5) === 'ов') {
        pos += 2;
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

export const russianTokenizer = new RussianTokenizer();
