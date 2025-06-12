/**
 * Hyperscript Tokenizer
 * Performs lexical analysis and token classification based on hyperscript-lsp database
 */

import type { Token } from '../types/core';

// Token types based on hyperscript language elements
export enum TokenType {
  // Language elements
  KEYWORD = 'keyword',
  COMMAND = 'command',
  EXPRESSION = 'expression',
  FEATURE = 'feature',
  
  // Literals
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  
  // Selectors and references
  CSS_SELECTOR = 'css_selector',
  ID_SELECTOR = 'id_selector',
  CLASS_SELECTOR = 'class_selector',
  
  // Context variables
  CONTEXT_VAR = 'context_var',
  PROPERTY_ACCESS = 'property_access',
  
  // Events
  EVENT = 'event',
  
  // Operators
  OPERATOR = 'operator',
  LOGICAL_OPERATOR = 'logical_operator',
  COMPARISON_OPERATOR = 'comparison_operator',
  
  // Special constructs
  TIME_EXPRESSION = 'time_expression',
  OBJECT_LITERAL = 'object_literal',
  ARRAY_LITERAL = 'array_literal',
  SYMBOL = 'symbol',
  
  // Structural
  WHITESPACE = 'whitespace',
  NEWLINE = 'newline',
  COMMENT = 'comment',
  
  // Unknown
  IDENTIFIER = 'identifier',
  UNKNOWN = 'unknown',
}

// Hyperscript language element sets (based on LSP database)
const KEYWORDS = new Set([
  'on', 'init', 'behavior', 'def', 'set', 'if', 'else', 'unless', 'repeat', 'for',
  'while', 'until', 'end', 'and', 'or', 'not', 'in', 'to', 'from', 'into',
  'with', 'as', 'then', 'when', 'where', 'after', 'before', 'by', 'at', 'async'
]);

const COMMANDS = new Set([
  'add', 'append', 'async', 'beep', 'break', 'call', 'continue', 'decrement',
  'default', 'fetch', 'get', 'go', 'halt', 'hide', 'increment', 'js', 'log',
  'make', 'measure', 'pick', 'put', 'remove', 'render', 'return',
  'send', 'settle', 'show', 'take', 'tell', 'throw', 'toggle',
  'transition', 'trigger', 'wait'
]);

const CONTEXT_VARS = new Set([
  'me', 'it', 'you', 'result', 'my', 'its', 'your'
]);

const LOGICAL_OPERATORS = new Set(['and', 'or', 'not']);

const COMPARISON_OPERATORS = new Set([
  '==', '!=', '===', '!==', '<', '>', '<=', '>=', 'is', 'is not',
  'contains', 'matches', 'exists'
]);

const TIME_UNITS = new Set(['ms', 's', 'seconds', 'minutes', 'hours', 'days']);

// Common DOM events
const DOM_EVENTS = new Set([
  'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout',
  'mousemove', 'mouseenter', 'mouseleave', 'focus', 'blur', 'change',
  'input', 'submit', 'reset', 'select', 'load', 'unload', 'resize',
  'scroll', 'keydown', 'keyup', 'keypress', 'touchstart', 'touchend',
  'touchmove', 'touchcancel', 'drag', 'drop', 'dragover', 'dragenter',
  'dragleave', 'cut', 'copy', 'paste'
]);

export interface Tokenizer {
  input: string;
  position: number;
  line: number;
  column: number;
  tokens: Token[];
}

export function createTokenizer(): Tokenizer {
  return {
    input: '',
    position: 0,
    line: 1,
    column: 1,
    tokens: [],
  };
}

export function tokenize(input: string): Token[] {
  const tokenizer = createTokenizer();
  tokenizer.input = input;
  
  while (tokenizer.position < input.length) {
    skipWhitespace(tokenizer);
    
    if (tokenizer.position >= input.length) break;
    
    const char = input[tokenizer.position];
    
    // Handle comments
    if (char === '-' && peek(tokenizer, 1) === '-') {
      tokenizeComment(tokenizer);
      continue;
    }
    
    // Handle strings
    if (char === '"' || char === "'") {
      tokenizeString(tokenizer);
      continue;
    }
    
    // Handle CSS selectors (but only when not preceded by an identifier/expression)
    if (char === '#') {
      tokenizeCSSSelector(tokenizer);
      continue;
    }
    
    if (char === '.') {
      // Check if this is a CSS selector or a member access operator
      // It's a CSS selector if it's at the start or follows whitespace/operators
      const prevToken = tokenizer.tokens[tokenizer.tokens.length - 1];
      const isCSSSelectorContext = !prevToken || 
        prevToken.type === 'whitespace' || 
        prevToken.type === 'operator' ||
        prevToken.type === 'keyword' ||
        prevToken.value === '(' || 
        prevToken.value === '[' ||
        prevToken.value === '{' ||
        prevToken.value === ',' ||
        prevToken.value === ';';
        
      if (isCSSSelectorContext && isAlpha(peek(tokenizer))) {
        tokenizeCSSSelector(tokenizer);
        continue;
      }
      // Otherwise, fall through to operator handling
    }
    
    // Handle symbols
    if (char === '@') {
      tokenizeSymbol(tokenizer);
      continue;
    }
    
    // Handle object/array literals
    if (char === '{') {
      tokenizeObjectLiteral(tokenizer);
      continue;
    }
    
    if (char === '[') {
      // Determine if this is array literal or member access
      const prevToken = tokenizer.tokens[tokenizer.tokens.length - 1];
      const isMemberAccess = prevToken && 
        (prevToken.type === TokenType.IDENTIFIER || 
         prevToken.type === TokenType.CONTEXT_VAR ||
         prevToken.value === ')' ||
         prevToken.value === ']');
      
      if (isMemberAccess) {
        // Treat as member access operator
        addToken(tokenizer, TokenType.OPERATOR, '[');
        advance(tokenizer);
      } else {
        // Treat as array literal
        tokenizeArrayLiteral(tokenizer);
      }
      continue;
    }
    
    // Handle operators
    if (isOperatorChar(char)) {
      tokenizeOperator(tokenizer);
      continue;
    }
    
    // Handle numbers and time expressions
    if (isDigit(char)) {
      tokenizeNumberOrTime(tokenizer);
      continue;
    }
    
    // Handle identifiers, keywords, commands, etc.
    if (isAlpha(char) || char === '_') {
      tokenizeIdentifier(tokenizer);
      continue;
    }
    
    // Unknown character - consume it
    addToken(tokenizer, TokenType.UNKNOWN, char);
    advance(tokenizer);
  }
  
  return tokenizer.tokens;
}

function peek(tokenizer: Tokenizer, offset: number = 1): string {
  const pos = tokenizer.position + offset;
  return pos < tokenizer.input.length ? tokenizer.input[pos] : '';
}

function advance(tokenizer: Tokenizer): string {
  const char = tokenizer.input[tokenizer.position];
  tokenizer.position++;
  
  if (char === '\n') {
    tokenizer.line++;
    tokenizer.column = 1;
  } else if (char === '\r') {
    // Handle \r\n and standalone \r
    const nextChar = tokenizer.position < tokenizer.input.length ? tokenizer.input[tokenizer.position] : '';
    if (nextChar === '\n') {
      // \r\n - advance past the \n as well
      tokenizer.position++;
    }
    tokenizer.line++;
    tokenizer.column = 1;
  } else {
    tokenizer.column++;
  }
  
  return char;
}

function skipWhitespace(tokenizer: Tokenizer): void {
  while (tokenizer.position < tokenizer.input.length) {
    const char = tokenizer.input[tokenizer.position];
    if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
      advance(tokenizer);
    } else {
      break;
    }
  }
}

function addToken(
  tokenizer: Tokenizer,
  type: TokenType,
  value: string,
  start?: number,
  end?: number
): void {
  const tokenStart = start ?? tokenizer.position - value.length;
  const tokenEnd = end ?? tokenizer.position;
  
  // Calculate the column at the start of the token
  let tokenColumn = tokenizer.column - value.length;
  if (start !== undefined) {
    // If start is explicitly provided, calculate column based on line breaks
    tokenColumn = 1;
    let lastNewlinePos = -1;
    for (let i = 0; i < start; i++) {
      if (tokenizer.input[i] === '\n' || tokenizer.input[i] === '\r') {
        lastNewlinePos = i;
      }
    }
    tokenColumn = start - lastNewlinePos;
  }
  
  tokenizer.tokens.push({
    type: type as string,
    value,
    start: tokenStart,
    end: tokenEnd,
    line: getLineAtPosition(tokenizer, tokenStart),
    column: tokenColumn,
  });
}

function getLineAtPosition(tokenizer: Tokenizer, position: number): number {
  let line = 1;
  for (let i = 0; i < position && i < tokenizer.input.length; i++) {
    const char = tokenizer.input[i];
    if (char === '\n') {
      line++;
    } else if (char === '\r') {
      line++;
      // Skip \n if it's part of \r\n
      if (i + 1 < tokenizer.input.length && tokenizer.input[i + 1] === '\n') {
        i++;
      }
    }
  }
  return line;
}

function tokenizeComment(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  let value = '';
  
  // Skip '--'
  advance(tokenizer);
  advance(tokenizer);
  
  // Read until end of line
  while (tokenizer.position < tokenizer.input.length) {
    const char = tokenizer.input[tokenizer.position];
    if (char === '\n') break;
    value += advance(tokenizer);
  }
  
  addToken(tokenizer, TokenType.COMMENT, '--' + value, start);
}

function tokenizeString(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  const quote = advance(tokenizer); // consume opening quote
  let value = quote;
  
  while (tokenizer.position < tokenizer.input.length) {
    const char = advance(tokenizer);
    value += char;
    
    if (char === quote) break; // closing quote
    if (char === '\\') {
      // Handle escape sequences
      if (tokenizer.position < tokenizer.input.length) {
        value += advance(tokenizer);
      }
    }
  }
  
  addToken(tokenizer, TokenType.STRING, value, start);
}

function tokenizeCSSSelector(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  const prefix = advance(tokenizer); // # or .
  let value = prefix;
  
  while (tokenizer.position < tokenizer.input.length) {
    const char = tokenizer.input[tokenizer.position];
    if (isAlphaNumeric(char) || char === '-' || char === '_') {
      value += advance(tokenizer);
    } else {
      break;
    }
  }
  
  const type = prefix === '#' ? TokenType.ID_SELECTOR : TokenType.CLASS_SELECTOR;
  addToken(tokenizer, type, value, start);
}

function tokenizeSymbol(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  let value = advance(tokenizer); // consume @
  
  while (tokenizer.position < tokenizer.input.length) {
    const char = tokenizer.input[tokenizer.position];
    if (isAlphaNumeric(char) || char === '_' || char === '-') {
      value += advance(tokenizer);
    } else {
      break;
    }
  }
  
  addToken(tokenizer, TokenType.SYMBOL, value, start);
}

function tokenizeObjectLiteral(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  let value = '';
  let braceCount = 0;
  
  do {
    const char = advance(tokenizer);
    value += char;
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
  } while (braceCount > 0 && tokenizer.position < tokenizer.input.length);
  
  addToken(tokenizer, TokenType.OBJECT_LITERAL, value, start);
}

function tokenizeArrayLiteral(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  let value = '';
  let bracketCount = 0;
  
  do {
    const char = advance(tokenizer);
    value += char;
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;
  } while (bracketCount > 0 && tokenizer.position < tokenizer.input.length);
  
  addToken(tokenizer, TokenType.ARRAY_LITERAL, value, start);
}

function tokenizeOperator(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  let value = '';
  
  // Handle multi-character operators
  const twoChar = tokenizer.input.substring(tokenizer.position, tokenizer.position + 2);
  const threeChar = tokenizer.input.substring(tokenizer.position, tokenizer.position + 3);
  
  if (['===', '!=='].includes(threeChar)) {
    value = threeChar;
    advance(tokenizer);
    advance(tokenizer);
    advance(tokenizer);
  } else if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChar)) {
    value = twoChar;
    advance(tokenizer);
    advance(tokenizer);
  } else {
    value = advance(tokenizer);
  }
  
  const type = COMPARISON_OPERATORS.has(value) 
    ? TokenType.COMPARISON_OPERATOR 
    : TokenType.OPERATOR;
    
  addToken(tokenizer, type, value, start);
}

function tokenizeNumberOrTime(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  let value = '';
  
  // Read digits
  while (tokenizer.position < tokenizer.input.length && isDigit(tokenizer.input[tokenizer.position])) {
    value += advance(tokenizer);
  }
  
  // Handle decimal
  if (tokenizer.position < tokenizer.input.length && tokenizer.input[tokenizer.position] === '.') {
    value += advance(tokenizer);
    while (tokenizer.position < tokenizer.input.length && isDigit(tokenizer.input[tokenizer.position])) {
      value += advance(tokenizer);
    }
  }
  
  // Check for time unit
  const unitStart = tokenizer.position;
  let unit = '';
  while (tokenizer.position < tokenizer.input.length && isAlpha(tokenizer.input[tokenizer.position])) {
    unit += advance(tokenizer);
  }
  
  if (TIME_UNITS.has(unit)) {
    addToken(tokenizer, TokenType.TIME_EXPRESSION, value + unit, start);
  } else {
    // Reset position if not a time unit
    tokenizer.position = unitStart;
    addToken(tokenizer, TokenType.NUMBER, value, start);
  }
}

function tokenizeIdentifier(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  let value = '';
  
  while (tokenizer.position < tokenizer.input.length) {
    const char = tokenizer.input[tokenizer.position];
    if (isAlphaNumeric(char) || char === '_' || char === '-') {
      value += advance(tokenizer);
    } else {
      break;
    }
  }
  
  // Classify the identifier
  const type = classifyIdentifier(value);
  addToken(tokenizer, type, value, start);
}

function classifyIdentifier(value: string): TokenType {
  const lowerValue = value.toLowerCase();
  
  // Check more specific types first
  if (LOGICAL_OPERATORS.has(lowerValue)) {
    return TokenType.LOGICAL_OPERATOR;
  }
  
  if (CONTEXT_VARS.has(lowerValue)) {
    return TokenType.CONTEXT_VAR;
  }
  
  if (COMMANDS.has(lowerValue)) {
    return TokenType.COMMAND;
  }
  
  if (DOM_EVENTS.has(lowerValue)) {
    return TokenType.EVENT;
  }
  
  if (['true', 'false'].includes(lowerValue)) {
    return TokenType.BOOLEAN;
  }
  
  if (KEYWORDS.has(lowerValue)) {
    return TokenType.KEYWORD;
  }
  
  return TokenType.IDENTIFIER;
}

// Helper functions
function isAlpha(char: string): boolean {
  return /[a-zA-Z]/.test(char);
}

function isDigit(char: string): boolean {
  return /[0-9]/.test(char);
}

function isAlphaNumeric(char: string): boolean {
  return /[a-zA-Z0-9]/.test(char);
}

function isOperatorChar(char: string): boolean {
  return '+-*/%=!<>&|(){}[],.;:?'.includes(char);
}