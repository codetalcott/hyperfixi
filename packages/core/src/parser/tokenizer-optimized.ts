/**
 * Optimized Hyperscript Tokenizer
 * Performance-optimized version with character code checks and efficient string building
 */

import type { Token } from '../types/core';
import { TokenType } from './tokenizer.js';

// Pre-compute character codes for faster checks
const CHAR_A = 'a'.charCodeAt(0);
const CHAR_Z = 'z'.charCodeAt(0);
const CHAR_A_UPPER = 'A'.charCodeAt(0);
const CHAR_Z_UPPER = 'Z'.charCodeAt(0);
const CHAR_0 = '0'.charCodeAt(0);
const CHAR_9 = '9'.charCodeAt(0);
const CHAR_UNDERSCORE = '_'.charCodeAt(0);
const CHAR_DASH = '-'.charCodeAt(0);
const CHAR_DOT = '.'.charCodeAt(0);
const CHAR_NEWLINE = '\n'.charCodeAt(0);
const CHAR_RETURN = '\r'.charCodeAt(0);
const CHAR_SPACE = ' '.charCodeAt(0);
const CHAR_TAB = '\t'.charCodeAt(0);

// Optimized token classification using Maps for O(1) lookup
const TOKEN_TYPE_MAP = new Map<string, TokenType>([
  // Context variables (highest priority)
  ['me', TokenType.CONTEXT_VAR],
  ['it', TokenType.CONTEXT_VAR],
  ['you', TokenType.CONTEXT_VAR],
  ['result', TokenType.CONTEXT_VAR],
  ['my', TokenType.CONTEXT_VAR],
  ['its', TokenType.CONTEXT_VAR],
  ['your', TokenType.CONTEXT_VAR],
  
  // Logical operators (high priority)
  ['and', TokenType.LOGICAL_OPERATOR],
  ['or', TokenType.LOGICAL_OPERATOR],
  ['not', TokenType.LOGICAL_OPERATOR],
  
  // Boolean values
  ['true', TokenType.BOOLEAN],
  ['false', TokenType.BOOLEAN],
  
  // Common commands (alphabetical for better cache performance)
  ['add', TokenType.COMMAND],
  ['hide', TokenType.COMMAND],
  ['remove', TokenType.COMMAND],
  ['show', TokenType.COMMAND],
  ['wait', TokenType.COMMAND],
  ['put', TokenType.COMMAND],
  ['get', TokenType.COMMAND],
  ['take', TokenType.COMMAND],
  ['make', TokenType.COMMAND],
  ['call', TokenType.COMMAND],
  ['send', TokenType.COMMAND],
  ['tell', TokenType.COMMAND],
  ['go', TokenType.COMMAND],
  ['log', TokenType.COMMAND],
  ['throw', TokenType.COMMAND],
  ['return', TokenType.COMMAND],
  ['toggle', TokenType.COMMAND],
  ['trigger', TokenType.COMMAND],
  ['halt', TokenType.COMMAND],
  ['break', TokenType.COMMAND],
  ['continue', TokenType.COMMAND],
  ['fetch', TokenType.COMMAND],
  ['render', TokenType.COMMAND],
  
  // DOM events (common ones)
  ['click', TokenType.EVENT],
  ['change', TokenType.EVENT],
  ['input', TokenType.EVENT],
  ['submit', TokenType.EVENT],
  ['focus', TokenType.EVENT],
  ['blur', TokenType.EVENT],
  ['load', TokenType.EVENT],
  ['scroll', TokenType.EVENT],
  ['resize', TokenType.EVENT],
  ['keydown', TokenType.EVENT],
  ['keyup', TokenType.EVENT],
  ['mousedown', TokenType.EVENT],
  ['mouseup', TokenType.EVENT],
  ['mouseover', TokenType.EVENT],
  ['mouseout', TokenType.EVENT],
  
  // Keywords
  ['on', TokenType.KEYWORD],
  ['init', TokenType.KEYWORD],
  ['behavior', TokenType.KEYWORD],
  ['def', TokenType.KEYWORD],
  ['set', TokenType.KEYWORD],
  ['if', TokenType.KEYWORD],
  ['else', TokenType.KEYWORD],
  ['unless', TokenType.KEYWORD],
  ['repeat', TokenType.KEYWORD],
  ['for', TokenType.KEYWORD],
  ['while', TokenType.KEYWORD],
  ['until', TokenType.KEYWORD],
  ['end', TokenType.KEYWORD],
  ['in', TokenType.KEYWORD],
  ['to', TokenType.KEYWORD],
  ['from', TokenType.KEYWORD],
  ['into', TokenType.KEYWORD],
  ['with', TokenType.KEYWORD],
  ['as', TokenType.KEYWORD],
  ['then', TokenType.KEYWORD],
  ['when', TokenType.KEYWORD],
  ['where', TokenType.KEYWORD],
  ['after', TokenType.KEYWORD],
  ['before', TokenType.KEYWORD],
  ['by', TokenType.KEYWORD],
  ['at', TokenType.KEYWORD],
  ['async', TokenType.KEYWORD]
]);

// Time units for fast lookup
const TIME_UNITS = new Set(['ms', 's', 'seconds', 'minutes', 'hours', 'days']);

// Comparison operators for fast classification
const COMPARISON_OPERATORS = new Set([
  '==', '!=', '===', '!==', '<', '>', '<=', '>=', 'is', 'is not',
  'contains', 'matches', 'exists'
]);

export interface OptimizedTokenizer {
  input: string;
  position: number;
  line: number;
  column: number;
  tokens: Token[];
  length: number; // Cache input length
}

export function createOptimizedTokenizer(): OptimizedTokenizer {
  return {
    input: '',
    position: 0,
    line: 1,
    column: 1,
    tokens: [],
    length: 0
  };
}

export function tokenizeOptimized(input: string): Token[] {
  const tokenizer = createOptimizedTokenizer();
  tokenizer.input = input;
  tokenizer.length = input.length;
  
  while (tokenizer.position < tokenizer.length) {
    skipWhitespaceOptimized(tokenizer);
    
    if (tokenizer.position >= tokenizer.length) break;
    
    const charCode = input.charCodeAt(tokenizer.position);
    
    // Fast path for common characters using character codes
    if (charCode >= CHAR_A && charCode <= CHAR_Z || 
        charCode >= CHAR_A_UPPER && charCode <= CHAR_Z_UPPER || 
        charCode === CHAR_UNDERSCORE) {
      tokenizeIdentifierOptimized(tokenizer);
      continue;
    }
    
    if (charCode >= CHAR_0 && charCode <= CHAR_9) {
      tokenizeNumberOrTimeOptimized(tokenizer);
      continue;
    }
    
    const char = input[tokenizer.position];
    
    // Handle strings and apostrophes
    if (char === '"') {
      tokenizeStringOptimized(tokenizer);
      continue;
    }
    
    if (char === "'" || char === "'") {
      // Check if this is possessive syntax (apostrophe followed by 's')
      const nextChar = tokenizer.position + 1 < tokenizer.length ? 
        tokenizer.input[tokenizer.position + 1] : '';
      const prevToken = tokenizer.tokens[tokenizer.tokens.length - 1];
      const isPossessive = nextChar === 's' && prevToken && 
        (prevToken.type === TokenType.IDENTIFIER || prevToken.type === TokenType.CONTEXT_VAR);
      
      if (isPossessive) {
        // Tokenize as operator for possessive syntax
        tokenizeOperatorOptimized(tokenizer);
      } else {
        // Tokenize as string
        tokenizeStringOptimized(tokenizer);
      }
      continue;
    }
    
    // Handle symbols like @
    if (char === '@') {
      addTokenOptimized(tokenizer, TokenType.SYMBOL, char);
      advanceOptimized(tokenizer);
      continue;
    }
    
    // Handle CSS selectors
    if (char === '#' || char === '.') {
      tokenizeCSSOrOperatorOptimized(tokenizer);
      continue;
    }
    
    // Handle object/array literals first (before operators)
    if (char === '{') {
      tokenizeObjectLiteralOptimized(tokenizer);
      continue;
    }
    
    if (char === '[') {
      tokenizeArrayOrMemberAccessOptimized(tokenizer);
      continue;
    }
    
    // Handle operators
    if (isOperatorChar(char)) {
      tokenizeOperatorOptimized(tokenizer);
      continue;
    }
    
    // Unknown character - consume it
    addTokenOptimized(tokenizer, TokenType.UNKNOWN, char);
    advanceOptimized(tokenizer);
  }
  
  return tokenizer.tokens;
}

// Optimized helper functions using character codes
function isAlphaOptimized(charCode: number): boolean {
  return (charCode >= CHAR_A && charCode <= CHAR_Z) || 
         (charCode >= CHAR_A_UPPER && charCode <= CHAR_Z_UPPER);
}

function isDigitOptimized(charCode: number): boolean {
  return charCode >= CHAR_0 && charCode <= CHAR_9;
}

function isAlphaNumericOptimized(charCode: number): boolean {
  return isAlphaOptimized(charCode) || isDigitOptimized(charCode);
}

function isWhitespaceOptimized(charCode: number): boolean {
  return charCode === CHAR_SPACE || charCode === CHAR_TAB || 
         charCode === CHAR_NEWLINE || charCode === CHAR_RETURN;
}

function skipWhitespaceOptimized(tokenizer: OptimizedTokenizer): void {
  while (tokenizer.position < tokenizer.length) {
    const charCode = tokenizer.input.charCodeAt(tokenizer.position);
    if (!isWhitespaceOptimized(charCode)) break;
    advanceOptimized(tokenizer);
  }
}

function advanceOptimized(tokenizer: OptimizedTokenizer): string {
  const char = tokenizer.input[tokenizer.position];
  tokenizer.position++;
  
  if (char === '\n') {
    tokenizer.line++;
    tokenizer.column = 1;
  } else {
    tokenizer.column++;
  }
  
  return char;
}

function addTokenOptimized(
  tokenizer: OptimizedTokenizer, 
  type: TokenType, 
  value: string, 
  start?: number
): void {
  const startPos = start ?? tokenizer.position - value.length;
  tokenizer.tokens.push({
    type,
    value,
    start: startPos,
    end: tokenizer.position,
    line: tokenizer.line,
    column: tokenizer.column - value.length
  });
}

function tokenizeIdentifierOptimized(tokenizer: OptimizedTokenizer): void {
  const start = tokenizer.position;
  const chars: string[] = []; // Use array for efficient building
  
  while (tokenizer.position < tokenizer.length) {
    const charCode = tokenizer.input.charCodeAt(tokenizer.position);
    if (isAlphaNumericOptimized(charCode) || 
        charCode === CHAR_UNDERSCORE || 
        charCode === CHAR_DASH) {
      chars.push(advanceOptimized(tokenizer));
    } else {
      break;
    }
  }
  
  const value = chars.join(''); // Single join operation
  const type = classifyIdentifierOptimized(value);
  addTokenOptimized(tokenizer, type, value, start);
}

function classifyIdentifierOptimized(value: string): TokenType {
  // Fast lookup using pre-computed map
  const lowerValue = value.toLowerCase();
  const type = TOKEN_TYPE_MAP.get(lowerValue);
  
  // Return immediately if found, otherwise default to identifier
  return type ?? TokenType.IDENTIFIER;
}

function tokenizeNumberOrTimeOptimized(tokenizer: OptimizedTokenizer): void {
  const start = tokenizer.position;
  const chars: string[] = [];
  
  // Read digits efficiently
  while (tokenizer.position < tokenizer.length) {
    const charCode = tokenizer.input.charCodeAt(tokenizer.position);
    if (isDigitOptimized(charCode)) {
      chars.push(advanceOptimized(tokenizer));
    } else {
      break;
    }
  }
  
  // Handle decimal
  if (tokenizer.position < tokenizer.length && 
      tokenizer.input.charCodeAt(tokenizer.position) === CHAR_DOT) {
    chars.push(advanceOptimized(tokenizer));
    
    while (tokenizer.position < tokenizer.length) {
      const charCode = tokenizer.input.charCodeAt(tokenizer.position);
      if (isDigitOptimized(charCode)) {
        chars.push(advanceOptimized(tokenizer));
      } else {
        break;
      }
    }
  }
  
  const numberValue = chars.join('');
  
  // Check for time unit efficiently
  const unitStart = tokenizer.position;
  const unitChars: string[] = [];
  
  while (tokenizer.position < tokenizer.length) {
    const charCode = tokenizer.input.charCodeAt(tokenizer.position);
    if (isAlphaOptimized(charCode)) {
      unitChars.push(advanceOptimized(tokenizer));
    } else {
      break;
    }
  }
  
  if (unitChars.length > 0) {
    const unit = unitChars.join('');
    if (TIME_UNITS.has(unit)) {
      addTokenOptimized(tokenizer, TokenType.TIME_EXPRESSION, numberValue + unit, start);
      return;
    } else {
      // Reset position if not a time unit
      tokenizer.position = unitStart;
    }
  }
  
  addTokenOptimized(tokenizer, TokenType.NUMBER, numberValue, start);
}

function tokenizeStringOptimized(tokenizer: OptimizedTokenizer): void {
  const start = tokenizer.position;
  const quote = advanceOptimized(tokenizer); // Skip opening quote
  const chars: string[] = [quote]; // Include opening quote in value
  
  while (tokenizer.position < tokenizer.length) {
    const char = tokenizer.input[tokenizer.position];
    
    if (char === quote) {
      chars.push(advanceOptimized(tokenizer)); // Include closing quote
      break;
    }
    
    if (char === '\\' && tokenizer.position + 1 < tokenizer.length) {
      chars.push(advanceOptimized(tokenizer)); // Add backslash
      chars.push(advanceOptimized(tokenizer)); // Add escaped character
    } else {
      chars.push(advanceOptimized(tokenizer));
    }
  }
  
  addTokenOptimized(tokenizer, TokenType.STRING, chars.join(''), start);
}

function tokenizeCSSOrOperatorOptimized(tokenizer: OptimizedTokenizer): void {
  const char = tokenizer.input[tokenizer.position];
  
  if (char === '#') {
    tokenizeCSSSelector(tokenizer);
    return;
  }
  
  // For '.', check context to determine if it's CSS selector or operator
  const prevToken = tokenizer.tokens[tokenizer.tokens.length - 1];
  const isCSSSelectorContext = !prevToken || 
    prevToken.type === 'whitespace' || 
    prevToken.type === 'operator' ||
    prevToken.type === 'keyword' ||
    prevToken.type === 'command';
    
  if (isCSSSelectorContext && tokenizer.position + 1 < tokenizer.length) {
    const nextCharCode = tokenizer.input.charCodeAt(tokenizer.position + 1);
    if (isAlphaOptimized(nextCharCode)) {
      tokenizeCSSSelector(tokenizer);
      return;
    }
  }
  
  // Treat as operator
  addTokenOptimized(tokenizer, TokenType.OPERATOR, char);
  advanceOptimized(tokenizer);
}

function tokenizeCSSSelector(tokenizer: OptimizedTokenizer): void {
  const start = tokenizer.position;
  const prefix = advanceOptimized(tokenizer); // '#' or '.'
  const chars: string[] = [prefix];
  
  while (tokenizer.position < tokenizer.length) {
    const charCode = tokenizer.input.charCodeAt(tokenizer.position);
    if (isAlphaNumericOptimized(charCode) || 
        charCode === CHAR_DASH || 
        charCode === CHAR_UNDERSCORE) {
      chars.push(advanceOptimized(tokenizer));
    } else {
      break;
    }
  }
  
  const selectorType = prefix === '#' ? TokenType.ID_SELECTOR : TokenType.CLASS_SELECTOR;
  addTokenOptimized(tokenizer, selectorType, chars.join(''), start);
}

function tokenizeOperatorOptimized(tokenizer: OptimizedTokenizer): void {
  const start = tokenizer.position;
  
  // Fast check for multi-character operators
  if (tokenizer.position + 2 < tokenizer.length) {
    const threeChar = tokenizer.input.substring(tokenizer.position, tokenizer.position + 3);
    if (threeChar === '===' || threeChar === '!==') {
      tokenizer.position += 3;
      const type = COMPARISON_OPERATORS.has(threeChar) 
        ? TokenType.COMPARISON_OPERATOR 
        : TokenType.OPERATOR;
      addTokenOptimized(tokenizer, type, threeChar, start);
      return;
    }
  }
  
  if (tokenizer.position + 1 < tokenizer.length) {
    const twoChar = tokenizer.input.substring(tokenizer.position, tokenizer.position + 2);
    if (twoChar === '==' || twoChar === '!=' || twoChar === '<=' || 
        twoChar === '>=' || twoChar === '&&' || twoChar === '||') {
      tokenizer.position += 2;
      const type = COMPARISON_OPERATORS.has(twoChar) 
        ? TokenType.COMPARISON_OPERATOR 
        : TokenType.OPERATOR;
      addTokenOptimized(tokenizer, type, twoChar, start);
      return;
    }
  }
  
  // Single character operator
  const char = advanceOptimized(tokenizer);
  const type = COMPARISON_OPERATORS.has(char) 
    ? TokenType.COMPARISON_OPERATOR 
    : TokenType.OPERATOR;
  addTokenOptimized(tokenizer, type, char, start);
}

function tokenizeObjectLiteralOptimized(tokenizer: OptimizedTokenizer): void {
  const start = tokenizer.position;
  const chars: string[] = [];
  let braceCount = 0;
  
  do {
    const char = advanceOptimized(tokenizer);
    chars.push(char);
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
  } while (braceCount > 0 && tokenizer.position < tokenizer.length);
  
  addTokenOptimized(tokenizer, TokenType.OBJECT_LITERAL, chars.join(''), start);
}

function tokenizeArrayOrMemberAccessOptimized(tokenizer: OptimizedTokenizer): void {
  const prevToken = tokenizer.tokens[tokenizer.tokens.length - 1];
  const isMemberAccess = prevToken && 
    (prevToken.type === TokenType.IDENTIFIER || 
     prevToken.type === TokenType.CONTEXT_VAR ||
     prevToken.value === ')' ||
     prevToken.value === ']');
  
  if (isMemberAccess) {
    addTokenOptimized(tokenizer, TokenType.OPERATOR, '[');
    advanceOptimized(tokenizer);
  } else {
    tokenizeArrayLiteral(tokenizer);
  }
}

function tokenizeArrayLiteral(tokenizer: OptimizedTokenizer): void {
  const start = tokenizer.position;
  const chars: string[] = [];
  let bracketCount = 0;
  
  do {
    const char = advanceOptimized(tokenizer);
    chars.push(char);
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;
  } while (bracketCount > 0 && tokenizer.position < tokenizer.length);
  
  addTokenOptimized(tokenizer, TokenType.ARRAY_LITERAL, chars.join(''), start);
}

// Helper function (could be optimized further with character code checks)
function isOperatorChar(char: string): boolean {
  return '+-*/%=!<>&|(){}[],.;:?\'\''.includes(char);
}

// Export for compatibility
export { TokenType };