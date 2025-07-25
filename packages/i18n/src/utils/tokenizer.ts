// packages/i18n/src/utils/tokenizer.ts

import { Token, TokenType, Dictionary } from '../types';

export function tokenize(text: string, locale: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;
  let line = 1;
  let column = 1;

  while (position < text.length) {
    const start = position;
    const startLine = line;
    const startColumn = column;

    // Skip whitespace but track it
    if (isWhitespace(text[position])) {
      const whitespace = consumeWhitespace(text, position);
      tokens.push({
        type: 'literal',
        value: whitespace,
        position: {
          start,
          end: position + whitespace.length,
          line: startLine,
          column: startColumn
        }
      });
      
      // Update position tracking
      for (let i = 0; i < whitespace.length; i++) {
        if (whitespace[i] === '\n') {
          line++;
          column = 1;
        } else {
          column++;
        }
      }
      position += whitespace.length;
      continue;
    }

    // String literals
    if (text[position] === '"' || text[position] === "'") {
      const quote = text[position];
      let value = quote;
      position++;
      column++;

      while (position < text.length && text[position] !== quote) {
        if (text[position] === '\\' && position + 1 < text.length) {
          value += text[position] + text[position + 1];
          position += 2;
          column += 2;
        } else {
          value += text[position];
          if (text[position] === '\n') {
            line++;
            column = 1;
          } else {
            column++;
          }
          position++;
        }
      }

      if (position < text.length) {
        value += text[position];
        position++;
        column++;
      }

      tokens.push({
        type: 'literal',
        value,
        position: {
          start,
          end: position,
          line: startLine,
          column: startColumn
        }
      });
      continue;
    }

    // Numbers
    if (isDigit(text[position])) {
      const number = consumeNumber(text, position);
      tokens.push({
        type: 'literal',
        value: number,
        position: {
          start,
          end: position + number.length,
          line: startLine,
          column: startColumn
        }
      });
      position += number.length;
      column += number.length;
      continue;
    }

    // Identifiers and keywords
    if (isIdentifierStart(text[position])) {
      const word = consumeIdentifier(text, position);
      const tokenType = categorizeWord(word, locale);
      
      tokens.push({
        type: tokenType,
        value: word,
        position: {
          start,
          end: position + word.length,
          line: startLine,
          column: startColumn
        }
      });
      position += word.length;
      column += word.length;
      continue;
    }

    // Operators and punctuation
    const operator = consumeOperator(text, position);
    tokens.push({
      type: 'operator',
      value: operator,
      position: {
        start,
        end: position + operator.length,
        line: startLine,
        column: startColumn
      }
    });
    position += operator.length;
    column += operator.length;
  }

  return tokens;
}

function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

function isDigit(char: string): boolean {
  return /\d/.test(char);
}

function isIdentifierStart(char: string): boolean {
  return /[a-zA-Z_$áéíóúñÑàèìòùÀÈÌÒÙ一-龯ㄱ-ㅎㅏ-ㅣ가-힣]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[a-zA-Z0-9_$áéíóúñÑàèìòùÀÈÌÒÙ一-龯ㄱ-ㅎㅏ-ㅣ가-힣-]/.test(char);
}

function consumeWhitespace(text: string, start: number): string {
  let end = start;
  while (end < text.length && isWhitespace(text[end])) {
    end++;
  }
  return text.substring(start, end);
}

function consumeNumber(text: string, start: number): string {
  let end = start;
  while (end < text.length && (isDigit(text[end]) || text[end] === '.')) {
    end++;
  }
  return text.substring(start, end);
}

function consumeIdentifier(text: string, start: number): string {
  let end = start;
  while (end < text.length && isIdentifierPart(text[end])) {
    end++;
  }
  return text.substring(start, end);
}

function consumeOperator(text: string, start: number): string {
  // Try to match multi-character operators first
  const twoChar = text.substring(start, start + 2);
  if (['==', '!=', '<=', '>=', '&&', '||', '..'].includes(twoChar)) {
    return twoChar;
  }
  
  // Single character operators
  return text[start];
}

function categorizeWord(word: string, locale: string): TokenType {
  // This would be enhanced with dictionary lookups
  const lowerWord = word.toLowerCase();
  
  // Common keywords across languages
  const commands = ['on', 'en', '당', 'tell', 'decir', 'trigger', 'send', 'wait', 'esperar', '대기'];
  const modifiers = ['to', 'a', 'from', 'de', 'into', 'en', 'with', 'con'];
  const logical = ['if', 'si', '만약', 'then', 'entonces', 'else', 'sino', 'and', 'y', 'or', 'o'];
  const values = ['true', 'verdadero', '참', 'false', 'falso', '거짓', 'null', 'nulo', 'me', 'yo', '나'];
  
  if (commands.some(cmd => lowerWord === cmd)) return 'command';
  if (modifiers.some(mod => lowerWord === mod)) return 'modifier';
  if (logical.some(log => lowerWord === log)) return 'logical';
  if (values.some(val => lowerWord === val)) return 'value';
  
  // Default to identifier
  return 'identifier';
}
