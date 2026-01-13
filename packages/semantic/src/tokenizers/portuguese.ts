/**
 * Portuguese Tokenizer
 *
 * Tokenizes Portuguese hyperscript input.
 * Portuguese is similar to Spanish:
 * - SVO word order
 * - Space-separated words
 * - Prepositions
 * - Accent marks
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
// Portuguese Character Classification
// =============================================================================

/**
 * Check if character is a Portuguese letter (including accented).
 */
function isPortugueseLetter(char: string): boolean {
  return /[a-zA-ZáàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]/.test(char);
}

/**
 * Check if character is part of a Portuguese identifier.
 */
function isPortugueseIdentifierChar(char: string): boolean {
  return isPortugueseLetter(char) || /[0-9_-]/.test(char);
}

// =============================================================================
// Portuguese Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'em', // in, on
  'a', // to
  'de', // of, from
  'desde', // from, since
  'até', // until, to
  'ate', // until (no accent)
  'com', // with
  'sem', // without
  'por', // by, for
  'para', // for, to
  'sobre', // on, about
  'entre', // between
  'antes', // before
  'depois', // after
  'dentro', // inside
  'fora', // outside
  'ao', // a + o (contraction)
  'do', // de + o (contraction)
  'no', // em + o (contraction)
  'na', // em + a (contraction)
]);

// =============================================================================
// Portuguese Keywords
// =============================================================================

const PORTUGUESE_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['alternar', 'toggle'],
  ['trocar', 'toggle'],
  ['adicionar', 'add'],
  ['acrescentar', 'add'],
  ['remover', 'remove'],
  ['eliminar', 'remove'],
  ['apagar', 'remove'],
  // Commands - Content operations
  ['colocar', 'put'],
  ['pôr', 'put'],
  ['por', 'put'],
  ['anexar', 'append'],
  ['preceder', 'prepend'],
  ['pegar', 'take'],
  ['fazer', 'make'],
  ['criar', 'make'],
  ['clonar', 'clone'],
  ['copiar', 'clone'],
  // Commands - Variable operations
  ['definir', 'set'],
  ['configurar', 'set'],
  ['obter', 'get'],
  ['incrementar', 'increment'],
  ['aumentar', 'increment'],
  ['decrementar', 'decrement'],
  ['diminuir', 'decrement'],
  ['registrar', 'log'],
  ['imprimir', 'log'],
  // Commands - Visibility
  ['mostrar', 'show'],
  ['exibir', 'show'],
  ['ocultar', 'hide'],
  ['esconder', 'hide'],
  ['transição', 'transition'],
  ['transicao', 'transition'],
  ['animar', 'transition'],
  // Commands - Events
  ['em', 'on'],
  ['quando', 'on'],
  ['ao', 'on'],
  ['disparar', 'trigger'],
  ['ativar', 'trigger'],
  ['enviar', 'send'],
  // Commands - DOM focus
  ['focar', 'focus'],
  ['foco', 'focus'],
  ['desfocar', 'blur'],
  // Commands - Navigation
  ['ir', 'go'],
  ['navegar', 'go'],
  // Commands - Async
  ['esperar', 'wait'],
  ['aguardar', 'wait'],
  ['buscar', 'fetch'],
  ['estabilizar', 'settle'],
  // Commands - Control flow
  ['se', 'if'],
  ['senão', 'else'],
  ['senao', 'else'],
  ['repetir', 'repeat'],
  ['para', 'for'],
  ['enquanto', 'while'],
  ['continuar', 'continue'],
  ['parar', 'halt'],
  ['lançar', 'throw'],
  ['lancar', 'throw'],
  ['chamar', 'call'],
  ['retornar', 'return'],
  ['devolver', 'return'],
  // Commands - Advanced
  ['js', 'js'],
  ['assíncrono', 'async'],
  ['assincrono', 'async'],
  ['dizer', 'tell'],
  ['padrão', 'default'],
  ['padrao', 'default'],
  ['iniciar', 'init'],
  ['inicializar', 'init'],
  ['comportamento', 'behavior'],
  ['instalar', 'install'],
  ['medir', 'measure'],
  ['até', 'until'],
  ['ate', 'until'],
  ['evento', 'event'],
  // Modifiers
  ['dentro de', 'into'],
  ['antes', 'before'],
  ['depois', 'after'],
  // Control flow helpers
  ['então', 'then'],
  ['entao', 'then'],
  ['fim', 'end'],
  ['até que', 'until'],
  // Events
  ['clique', 'click'],
  ['click', 'click'],
  ['entrada', 'input'],
  ['mudança', 'change'],
  ['mudanca', 'change'],
  ['envio', 'submit'],
  ['tecla baixo', 'keydown'],
  ['tecla cima', 'keyup'],
  ['mouse sobre', 'mouseover'],
  ['mouse fora', 'mouseout'],
  ['foco', 'focus'],
  ['desfoque', 'blur'],
  ['carregar', 'load'],
  ['rolagem', 'scroll'],
  // References
  ['eu', 'me'],
  ['meu', 'my'],
  ['ele', 'it'],
  ['isso', 'it'],
  ['resultado', 'result'],
  ['evento', 'event'],
  ['alvo', 'target'],
  // Positional
  ['primeiro', 'first'],
  ['primeira', 'first'],
  ['último', 'last'],
  ['ultima', 'last'],
  ['próximo', 'next'],
  ['proximo', 'next'],
  ['anterior', 'previous'],
  // Boolean
  ['verdadeiro', 'true'],
  ['falso', 'false'],
  // Time units
  ['segundo', 's'],
  ['segundos', 's'],
  ['milissegundo', 'ms'],
  ['milissegundos', 'ms'],
  ['minuto', 'm'],
  ['minutos', 'm'],
  ['hora', 'h'],
  ['horas', 'h'],
]);

// =============================================================================
// Portuguese Tokenizer Implementation
// =============================================================================

export class PortugueseTokenizer extends BaseTokenizer {
  readonly language = 'pt';
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

      if (isPortugueseLetter(input[pos])) {
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

    return new TokenStreamImpl(tokens, 'pt');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    if (PREPOSITIONS.has(lower)) return 'particle';
    if (PORTUGUESE_KEYWORDS.has(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    return 'identifier';
  }

  private extractWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isPortugueseIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();
    const normalized = PORTUGUESE_KEYWORDS.get(lower);

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
    if (remaining.startsWith('milissegundos') || remaining.startsWith('milissegundo')) {
      number += 'ms';
      pos = unitPos + (remaining.startsWith('milissegundos') ? 13 : 12);
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

export const portugueseTokenizer = new PortugueseTokenizer();
