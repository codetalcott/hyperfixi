/**
 * Hyperscript Tokenizer
 * Performs lexical analysis and token classification based on hyperscript-lsp database
 */

import type { Token } from '../types/core';

// Re-export Token for use in other parser files
export type { Token } from '../types/core';

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
  TEMPLATE_LITERAL = 'template_literal',
  
  // Selectors and references
  CSS_SELECTOR = 'css_selector',
  ID_SELECTOR = 'id_selector',
  CLASS_SELECTOR = 'class_selector',
  QUERY_REFERENCE = 'query_reference',
  
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
  'on', 'init', 'behavior', 'def', 'if', 'else', 'unless', 'for',
  'while', 'until', 'end', 'and', 'or', 'not', 'in', 'to', 'from', 'into',
  'with', 'as', 'then', 'when', 'where', 'after', 'before', 'by', 'at', 'async', 'no',
  // Compound syntax keywords
  'start', 'of', 'the',
  // Constructor keyword
  'new',
  // Scope keywords
  'global', 'local',
  // Additional keywords for English-style operators
  'equal', 'equals', 'greater', 'less', 'than', 'really'
]);

const COMMANDS = new Set([
  'add', 'append', 'async', 'beep', 'break', 'call', 'continue', 'decrement',
  'default', 'exit', 'fetch', 'get', 'go', 'halt', 'hide', 'if', 'increment', 'install', 'js', 'log',
  'make', 'measure', 'pick', 'put', 'remove', 'render', 'repeat', 'return',
  'send', 'set', 'settle', 'show', 'take', 'tell', 'throw', 'toggle',
  'transition', 'trigger', 'unless', 'wait'
]);

const CONTEXT_VARS = new Set([
  'me', 'it', 'you', 'result', 'my', 'its', 'your'
]);

const LOGICAL_OPERATORS = new Set(['and', 'or', 'not', 'no']);

const COMPARISON_OPERATORS = new Set([
  '==', '!=', '===', '!==', '<', '>', '<=', '>=', 'is', 'is not',
  'contains', 'does not contain', 'include', 'includes', 'does not include', 'matches', 'exists', 'does not exist', 'is empty', 'is not empty',
  'is in', 'is not in', 'equals', 'in',
  // English-style comparison operators
  'is equal to', 'is really equal to', 'is not equal to', 'is not really equal to',
  'is greater than', 'is less than', 'is greater than or equal to', 'is less than or equal to',
  'really equals'
]);

const MATHEMATICAL_OPERATORS = new Set(['+', '-', '*', '/', 'mod']);

// Compound prepositions used in put command and other DOM operations
// (Currently not used directly, but kept for reference)
// const COMPOUND_PREPOSITIONS = new Set([
//   'at start of',
//   'at end of',
//   'at the start of',
//   'at the end of',
//   'before',
//   'after',
//   'into'
// ]);

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
  
  const inputLength = input.length; // Cache length for performance
  
  while (tokenizer.position < inputLength) {
    skipWhitespace(tokenizer);
    
    if (tokenizer.position >= inputLength) break;
    
    const char = input[tokenizer.position];
    
    // Handle comments
    if (char === '-' && peek(tokenizer, 1) === '-') {
      tokenizeComment(tokenizer);
      continue;
    }
    
    // Handle strings, but check for possessive syntax first
    if (char === '"') {
      tokenizeString(tokenizer);
      continue;
    }
    
    if (char === "'" || char === "'") {
      // Check if this is possessive syntax (apostrophe followed by 's')
      const nextChar = peek(tokenizer, 1);
      const prevToken = tokenizer.tokens[tokenizer.tokens.length - 1];
      const isPossessive = nextChar === 's' && prevToken && 
        (prevToken.type === TokenType.IDENTIFIER || prevToken.type === TokenType.CONTEXT_VAR || 
         prevToken.type === TokenType.ID_SELECTOR || prevToken.type === TokenType.CLASS_SELECTOR);
      
      if (isPossessive) {
        // Directly create the "'s" token without compound operator interference
        const start = tokenizer.position;
        advance(tokenizer); // consume apostrophe
        advance(tokenizer); // consume 's'
        addToken(tokenizer, TokenType.OPERATOR, "'s", start);
      } else {
        // Tokenize as string
        tokenizeString(tokenizer);
      }
      continue;
    }
    
    // Handle template literals (backticks)
    if (char === '`') {
      tokenizeTemplateLiteral(tokenizer);
      continue;
    }
    
    // Handle query reference syntax (<selector/>) vs comparison operators
    if (char === '<') {
      // Look ahead to see if this is actually a query reference (ends with />)
      // vs a comparison operator like "< 10"
      if (looksLikeQueryReference(tokenizer)) {
        tokenizeQueryReference(tokenizer);
      } else {
        // Treat as comparison operator
        tokenizeOperator(tokenizer);
      }
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
        (prevToken.type === 'operator' && 
         // Exclude closing parens and brackets which indicate method calls or array access
         prevToken.value !== ')' && prevToken.value !== ']') ||
        prevToken.type === 'keyword' ||
        prevToken.type === 'command' ||  // Commands like "add .active" in conditionals
        prevToken.type === 'comparison_operator' || // Comparison operators like "is not in"
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
    
    // Handle object literals - emit individual tokens for proper parsing
    if (char === '{') {
      addToken(tokenizer, TokenType.OPERATOR, '{');
      advance(tokenizer);
      continue;
    }
    
    // Handle closing brace for objects
    if (char === '}') {
      addToken(tokenizer, TokenType.OPERATOR, '}');
      advance(tokenizer);
      continue;
    }
    
    if (char === '[') {
      // Determine if this is array literal, member access, or event condition
      const prevToken = tokenizer.tokens[tokenizer.tokens.length - 1];
      
      // Check for event handler condition syntax
      const isEventCondition = prevToken && 
        (prevToken.type === TokenType.EVENT || 
         (prevToken.type === TokenType.IDENTIFIER && DOM_EVENTS.has(prevToken.value))) &&
        tokenizer.tokens.length >= 2 &&
        tokenizer.tokens[tokenizer.tokens.length - 2]?.value === 'on';
      
      const isMemberAccess = prevToken && 
        (prevToken.type === TokenType.IDENTIFIER || 
         prevToken.type === TokenType.CONTEXT_VAR ||
         prevToken.value === ')' ||
         prevToken.value === ']') &&
        !isEventCondition; // Don't treat as member access if it's an event condition
      
      if (isMemberAccess) {
        // Treat as member access operator
        addToken(tokenizer, TokenType.OPERATOR, '[');
        advance(tokenizer);
      } else {
        // Treat as array literal or event condition bracket
        if (isEventCondition) {
          // For event conditions, just add the bracket as a simple token
          addToken(tokenizer, TokenType.SYMBOL, '[');
          advance(tokenizer);
        } else {
          // For array literals, tokenize individual brackets instead of whole array
          // This allows the parser to handle array structure properly
          addToken(tokenizer, TokenType.OPERATOR, '[');
          advance(tokenizer);
        }
      }
      continue;
    }
    
    // Handle closing bracket for arrays
    if (char === ']') {
      addToken(tokenizer, TokenType.OPERATOR, ']');
      advance(tokenizer);
      continue;
    }
    
    // Handle operators
    if (isOperatorChar(char)) {
      tokenizeOperator(tokenizer);
      continue;
    }
    
    // Handle numbers and time expressions - optimized path
    if (char >= '0' && char <= '9') { // Faster than isDigit
      tokenizeNumberOrTime(tokenizer);
      continue;
    }
    
    // Handle identifiers, keywords, commands, etc. - optimized path
    if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_') {
      tokenizeIdentifier(tokenizer);
      continue;
    }
    
    // Unknown character - consume it
    addToken(tokenizer, TokenType.UNKNOWN, char);
    advance(tokenizer);
  }
  
  //   tokenCount: tokenizer.tokens.length,
  //   tokens: tokenizer.tokens.map(t => ({ type: t.type, value: t.value }))
  // });
  
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
  const input = tokenizer.input;
  const inputLength = input.length;
  
  while (tokenizer.position < inputLength) {
    const char = input[tokenizer.position];
    // Optimized whitespace check - most common first
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

function tokenizeTemplateLiteral(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  advance(tokenizer); // consume opening backtick
  let value = '';
  
  while (tokenizer.position < tokenizer.input.length) {
    const char = tokenizer.input[tokenizer.position];
    
    if (char === '`') {
      advance(tokenizer); // consume closing backtick
      break;
    }
    
    if (char === '\\') {
      // Handle escape sequences
      advance(tokenizer); // consume backslash
      if (tokenizer.position < tokenizer.input.length) {
        const escaped = advance(tokenizer);
        // Handle common escape sequences
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '`': value += '`'; break;
          default: 
            value += escaped;
        }
      }
    } else {
      value += advance(tokenizer);
    }
  }
  
  // Check if we reached EOF without closing backtick
  if (tokenizer.position >= tokenizer.input.length && !tokenizer.input.endsWith('`')) {
    throw new Error(`Unterminated template literal at line ${tokenizer.line}, column ${tokenizer.column - value.length}`);
  }
  
  addToken(tokenizer, TokenType.TEMPLATE_LITERAL, value, start);
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

function tokenizeQueryReference(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  let value = '';
  
  // Consume opening '<'
  value += advance(tokenizer);
  
  // Read until closing '/>'
  while (tokenizer.position < tokenizer.input.length - 1) {
    const char = tokenizer.input[tokenizer.position];
    const nextChar = tokenizer.input[tokenizer.position + 1];
    
    value += advance(tokenizer);
    
    // Check for closing '/>'
    if (char === '/' && nextChar === '>') {
      value += advance(tokenizer); // consume '>'
      break;
    }
  }
  
  addToken(tokenizer, TokenType.QUERY_REFERENCE, value, start);
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

// Reserved for future use - object literal tokenization
// function _tokenizeObjectLiteral(tokenizer: Tokenizer): void {
//   const start = tokenizer.position;
//   let value = '';
//   let braceCount = 0;
//
//   do {
//     const char = advance(tokenizer);
//     value += char;
//     if (char === '{') braceCount++;
//     if (char === '}') braceCount--;
//   } while (braceCount > 0 && tokenizer.position < tokenizer.input.length);
//
//   addToken(tokenizer, TokenType.OBJECT_LITERAL, value, start);
// }

// Reserved for future use - array literal tokenization
// function _tokenizeArrayLiteral(tokenizer: Tokenizer): void {
//   const start = tokenizer.position;
//   let value = '';
//   let bracketCount = 0;
//
//   do {
//     const char = advance(tokenizer);
//     value += char;
//     if (char === '[') bracketCount++;
//     if (char === ']') bracketCount--;
//   } while (bracketCount > 0 && tokenizer.position < tokenizer.input.length);
//
//   addToken(tokenizer, TokenType.ARRAY_LITERAL, value, start);
// }

function tokenizeOperator(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  let value = '';
  
  // Handle possessive operator first ('s)
  const char = tokenizer.input[tokenizer.position];
  if ((char === "'" || char === "'") && peek(tokenizer, 1) === 's') {
    value = "'s";
    advance(tokenizer); // consume apostrophe
    advance(tokenizer); // consume 's'
    addToken(tokenizer, TokenType.OPERATOR, value, start);
    return;
  }
  
  // Handle multi-character operators
  const twoChar = tokenizer.input.substring(tokenizer.position, tokenizer.position + 2);
  const threeChar = tokenizer.input.substring(tokenizer.position, tokenizer.position + 3);
  
  if (['===', '!=='].includes(threeChar)) {
    value = threeChar;
    advance(tokenizer);
    advance(tokenizer);
    advance(tokenizer);
  } else if (['==', '!=', '<=', '>=', '&&', '||', '**', '~=', '|=', '^=', '$=', '*='].includes(twoChar)) {
    value = twoChar;
    advance(tokenizer);
    advance(tokenizer);
  } else {
    value = advance(tokenizer);
  }
  
  // Determine the correct token type
  let type = TokenType.OPERATOR;
  if (COMPARISON_OPERATORS.has(value)) {
    type = TokenType.COMPARISON_OPERATOR;
  } else if (['&&', '||'].includes(value)) {
    type = TokenType.LOGICAL_OPERATOR;
  } else if (MATHEMATICAL_OPERATORS.has(value)) {
    type = TokenType.OPERATOR;
  }
    
  addToken(tokenizer, type, value, start);
}

function tokenizeNumberOrTime(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  const input = tokenizer.input;
  const inputLength = input.length;
  let value = '';
  
  // Read digits - optimized
  while (tokenizer.position < inputLength) {
    const char = input[tokenizer.position];
    if (char >= '0' && char <= '9') {
      value += advance(tokenizer);
    } else {
      break;
    }
  }
  
  // Handle decimal
  if (tokenizer.position < inputLength && input[tokenizer.position] === '.') {
    value += advance(tokenizer);
    while (tokenizer.position < inputLength) {
      const char = input[tokenizer.position];
      if (char >= '0' && char <= '9') {
        value += advance(tokenizer);
      } else {
        break;
      }
    }
  }
  
  // Check for time unit - optimized
  const unitStart = tokenizer.position;
  let unit = '';
  while (tokenizer.position < inputLength) {
    const char = input[tokenizer.position];
    if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')) {
      unit += advance(tokenizer);
    } else {
      break;
    }
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
  const input = tokenizer.input;
  const inputLength = input.length;
  let value = '';
  
  while (tokenizer.position < inputLength) {
    const char = input[tokenizer.position];
    // Optimized character checking - avoid function calls
    if ((char >= 'a' && char <= 'z') || 
        (char >= 'A' && char <= 'Z') || 
        (char >= '0' && char <= '9') || 
        char === '_' || char === '-') {
      value += advance(tokenizer);
    } else {
      break;
    }
  }
  
  // Check for multi-word operators starting with this identifier
  const compound = tryTokenizeCompoundOperator(tokenizer, value, start);
  if (compound) {
    return; // Compound operator was handled
  }
  
  // Classify the identifier
  const type = classifyIdentifier(value);
  addToken(tokenizer, type, value, start);
}

function tryTokenizeCompoundOperator(tokenizer: Tokenizer, firstWord: string, start: number): boolean {
  const lowerFirst = firstWord.toLowerCase();
  const originalPosition = tokenizer.position;
  
  // Never treat 's as part of a compound operator - it's possessive syntax
  if (firstWord === "'s" || firstWord === "'s") {
    return false;
  }
  
  // Don't create compound operators that would interfere with possessive syntax
  // Check if we just tokenized something that could be followed by 's (possessive)
  const prevToken = tokenizer.tokens[tokenizer.tokens.length - 1];
  if (prevToken && (prevToken.type === 'identifier' || prevToken.type === 'id_selector' || 
                    prevToken.type === 'class_selector' || prevToken.type === 'context_var')) {
    const nextChar = tokenizer.position < tokenizer.input.length ? tokenizer.input[tokenizer.position] : '';
    if (nextChar === "'" || nextChar === "'") {
      // This might be possessive syntax, don't create compound operators
      return false;
    }
  }
  
  // Skip whitespace to find next word
  skipWhitespace(tokenizer);

  // Peek at the next identifier
  let nextWord = '';
  while (tokenizer.position < tokenizer.input.length) {
    const char = tokenizer.input[tokenizer.position];
    if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || 
        (char >= '0' && char <= '9') || char === '_' || char === '-') {
      nextWord += advance(tokenizer);
    } else {
      break;
    }
  }
  
  if (nextWord) {
    const lowerNext = nextWord.toLowerCase();
    let compound = `${lowerFirst} ${lowerNext}`;

    // Check for compound prepositions (e.g., "at start of", "at the start of")
    const compoundPrep = tryBuildCompoundPreposition(tokenizer, lowerFirst, lowerNext, start);
    if (compoundPrep) {
      return true; // Compound preposition was handled
    }

    // Try to build longest possible compound operator
    const longestCompound = tryBuildLongestCompound(tokenizer, lowerFirst, lowerNext);
    if (longestCompound) {
      addToken(tokenizer, TokenType.COMPARISON_OPERATOR, longestCompound, start);
      return true;
    }

    // Check two-word operators
    if (COMPARISON_OPERATORS.has(compound)) {
      addToken(tokenizer, TokenType.COMPARISON_OPERATOR, compound, start);
      return true;
    }
  }
  
  // Check single-word operators
  if (COMPARISON_OPERATORS.has(lowerFirst)) {
    tokenizer.position = originalPosition; // Reset position
    addToken(tokenizer, TokenType.COMPARISON_OPERATOR, firstWord, start);
    return true;
  }
  
  // No compound operator found, reset position
  tokenizer.position = originalPosition;
  return false;
}

function tryBuildCompoundPreposition(
  tokenizer: Tokenizer,
  firstWord: string,
  secondWord: string,
  start: number
): boolean {
  const lowerFirst = firstWord.toLowerCase();
  const lowerSecond = secondWord.toLowerCase();

  // Handle "at start of", "at end of", "at the start of", "at the end of"
  if (lowerFirst === 'at') {
    // Save position before trying to read more words
    const afterSecondWord = tokenizer.position;

    // Check for "at the start/end of" pattern
    if (lowerSecond === 'the') {
      skipWhitespace(tokenizer);
      let thirdWord = '';
      while (tokenizer.position < tokenizer.input.length) {
        const char = tokenizer.input[tokenizer.position];
        if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') ||
            (char >= '0' && char <= '9') || char === '_' || char === '-') {
          thirdWord += advance(tokenizer);
        } else {
          break;
        }
      }

      const lowerThird = thirdWord.toLowerCase();
      if (lowerThird === 'start' || lowerThird === 'end') {
        // Now look for "of"
        skipWhitespace(tokenizer);
        let fourthWord = '';
        while (tokenizer.position < tokenizer.input.length) {
          const char = tokenizer.input[tokenizer.position];
          if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') ||
              (char >= '0' && char <= '9') || char === '_' || char === '-') {
            fourthWord += advance(tokenizer);
          } else {
            break;
          }
        }

        const lowerFourth = fourthWord.toLowerCase();
        if (lowerFourth === 'of') {
          const compound = `at the ${lowerThird} of`;
          addToken(tokenizer, TokenType.KEYWORD, compound, start);
          return true;
        }
      }
      // Didn't match pattern, reset
      tokenizer.position = afterSecondWord;
      return false;
    }

    // Check for "at start of" or "at end of" (without "the")
    if (lowerSecond === 'start' || lowerSecond === 'end') {
      skipWhitespace(tokenizer);
      let thirdWord = '';
      while (tokenizer.position < tokenizer.input.length) {
        const char = tokenizer.input[tokenizer.position];
        if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') ||
            (char >= '0' && char <= '9') || char === '_' || char === '-') {
          thirdWord += advance(tokenizer);
        } else {
          break;
        }
      }

      const lowerThird = thirdWord.toLowerCase();
      if (lowerThird === 'of') {
        const compound = `at ${lowerSecond} of`;
        addToken(tokenizer, TokenType.KEYWORD, compound, start);
        return true;
      }
      // Didn't match pattern, reset
      tokenizer.position = afterSecondWord;
      return false;
    }
  }

  return false;
}

function classifyIdentifier(value: string): TokenType {
  const lowerValue = value.toLowerCase();
  
  // Special case for include/includes to ensure they're treated as comparison operators
  if (lowerValue === 'include' || lowerValue === 'includes') {
    return TokenType.COMPARISON_OPERATOR;
  }

  // Check more specific types first
  if (LOGICAL_OPERATORS.has(lowerValue)) {
    return TokenType.LOGICAL_OPERATOR;
  }

  if (MATHEMATICAL_OPERATORS.has(value) || MATHEMATICAL_OPERATORS.has(lowerValue)) {
    return TokenType.OPERATOR;
  }

  if (COMPARISON_OPERATORS.has(lowerValue)) {
    return TokenType.COMPARISON_OPERATOR;
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

  if (['true', 'false', 'null', 'undefined'].includes(lowerValue)) {
    return TokenType.BOOLEAN; // Using BOOLEAN for all literal values including null/undefined
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

// Reserved for future use
// function _isDigit(char: string): boolean {
//   return /[0-9]/.test(char);
// }

function isAlphaNumeric(char: string): boolean {
  return /[a-zA-Z0-9]/.test(char);
}

function looksLikeQueryReference(tokenizer: Tokenizer): boolean {
  // Look ahead to see if this pattern matches <.../>
  // A query reference should contain valid selector characters and end with />
  let pos = tokenizer.position + 1; // Start after <
  let foundValidContent = false;
  
  while (pos < tokenizer.input.length) {
    const char = tokenizer.input[pos];
    
    // If we find />, this is likely a query reference
    if (char === '/' && pos + 1 < tokenizer.input.length && tokenizer.input[pos + 1] === '>') {
      return foundValidContent; // Only return true if we found some content between < and />
    }
    
    // If we find content that looks like selector syntax
    if (isAlphaNumeric(char) || char === '.' || char === '#' || char === '[' || char === ']' || 
        char === ':' || char === '-' || char === '_' || char === ' ' || char === '=' || 
        char === '"' || char === "'" || char === '(' || char === ')') {
      foundValidContent = true;
      pos++;
    } else if (char === ' ' || char === '\t') {
      // Skip whitespace
      pos++;
    } else {
      // Found invalid character for query reference, probably comparison
      return false;
    }
    
    // If we've gone too far without finding />, it's probably not a query reference
    if (pos - tokenizer.position > 50) {
      return false;
    }
  }
  
  // Reached end without finding />, not a query reference
  return false;
}

/**
 * Try to build the longest possible compound operator starting with two given words
 * Returns the compound operator string if found, null otherwise
 */
function tryBuildLongestCompound(tokenizer: Tokenizer, firstWord: string, secondWord: string): string | null {
  const originalPosition = tokenizer.position;
  let compound = `${firstWord} ${secondWord}`;
  const words = [firstWord, secondWord];
  
  // Keep adding words until we can't find any more or reach a reasonable limit
  const maxWords = 8; // Reasonable upper bound
  
  while (words.length < maxWords) {
    // Skip whitespace and try to read next word
    skipWhitespace(tokenizer);
    
    if (tokenizer.position >= tokenizer.input.length) {
      break;
    }

    let nextWord = '';

    while (tokenizer.position < tokenizer.input.length) {
      const char = tokenizer.input[tokenizer.position];
      // Only include alphabetic characters for compound operator words
      // Exclude numbers to avoid consuming the right operand
      if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')) {
        nextWord += advance(tokenizer);
      } else {
        break;
      }
    }
    
    if (!nextWord) {
      break;
    }
    
    // Add the word and check if this compound exists
    words.push(nextWord.toLowerCase());
    const newCompound = words.join(' ');
    
    // If this compound exists, update our candidate
    if (COMPARISON_OPERATORS.has(newCompound)) {
      compound = newCompound;
      // Continue looking for longer compounds
    } else {
      // This compound doesn't exist, but maybe a longer one does
      // Continue checking in case we have patterns like "is greater than or equal to"
      // where "is greater than" exists but we want the longer form
    }
  }
  
  // Check if we found a valid compound
  if (COMPARISON_OPERATORS.has(compound) && compound !== `${firstWord} ${secondWord}`) {
    // Found a compound longer than 2 words
    return compound;
  }
  
  // Reset position and return null
  tokenizer.position = originalPosition;
  return null;
}

function isOperatorChar(char: string): boolean {
  return '+-*/^%=!<>&|(){}[],.;:?\'\'~$'.includes(char);
}