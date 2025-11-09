/**
 * HyperScript Tokenizer
 * Compatible with _hyperscript tokenizer API
 */

export interface Token {
  type: string;
  value: string;
  start: number;
  end: number;
  column: number;
  line: number;
  op?: boolean;
  template?: boolean;
}

// Operator token mapping
const OP_TABLE: Record<string, string> = {
  '+': 'PLUS',
  '-': 'MINUS',
  '*': 'MULTIPLY',
  '/': 'DIVIDE',
  '.': 'PERIOD',
  '..': 'ELLIPSIS',
  '\\': 'BACKSLASH',
  ':': 'COLON',
  '%': 'PERCENT',
  '|': 'PIPE',
  '!': 'EXCLAMATION',
  '?': 'QUESTION',
  '#': 'POUND',
  '&': 'AMPERSAND',
  $: 'DOLLAR',
  ';': 'SEMI',
  ',': 'COMMA',
  '(': 'L_PAREN',
  ')': 'R_PAREN',
  '<': 'L_ANG',
  '>': 'R_ANG',
  '<=': 'LTE_ANG',
  '>=': 'GTE_ANG',
  '==': 'EQ',
  '===': 'EQQ',
  '!=': 'NEQ',
  '!==': 'NEQQ',
  '{': 'L_BRACE',
  '}': 'R_BRACE',
  '[': 'L_BRACKET',
  ']': 'R_BRACKET',
  '=': 'EQUALS',
  '~': 'TILDE',
  "'": 'APOSTROPHE',
};

/**
 * Lexer class for tokenizing hyperscript source
 */
export class Lexer {
  static isAlpha(c: string): boolean {
    return c !== undefined && /[a-zA-Z]/.test(c);
  }

  static isNumeric(c: string): boolean {
    return c !== undefined && /[0-9]/.test(c);
  }

  static isWhitespace(c: string): boolean {
    return c !== undefined && /\s/.test(c);
  }

  static isNewline(c: string): boolean {
    return c === '\r' || c === '\n';
  }

  static isIdentifierChar(c: string): boolean {
    return c === '_' || c === '$';
  }

  static isReservedChar(c: string): boolean {
    return c === '`' || c === '^';
  }

  static isValidCSSClassChar(c: string): boolean {
    return c !== undefined && /[a-zA-Z0-9_-]/.test(c);
  }

  static isValidCSSIDChar(c: string): boolean {
    return c !== undefined && /[a-zA-Z0-9_-]/.test(c);
  }

  static isValidSingleQuoteStringStart(tokens: Token[]): boolean {
    // Single quotes are only strings in valid contexts (not after identifiers, class refs, id refs)
    if (tokens.length > 0) {
      const previousToken = tokens[tokens.length - 1];
      if (
        previousToken.type === 'IDENTIFIER' ||
        previousToken.type === 'CLASS_REF' ||
        previousToken.type === 'ID_REF'
      ) {
        return false; // NOT a string start - treat as operator
      }
      if (previousToken.op && (previousToken.value === '>' || previousToken.value === ')')) {
        return false; // NOT a string start - treat as operator
      }
    }
    return true; // IS a string start
  }

  /**
   * Main tokenization function
   */
  static tokenize(source: string, template: boolean = false): Tokens {
    const tokens: Token[] = [];
    let position = 0;
    let line = 1;
    let column = 1;
    let templateBraceCount = 0;

    const currentChar = () => source[position];
    const peekChar = (offset = 1) => source[position + offset];

    const advance = () => {
      const char = currentChar();
      position++;
      if (Lexer.isNewline(char)) {
        line++;
        column = 1;
      } else {
        column++;
      }
      return char;
    };

    const makeToken = (type: string, value: string, start: number): Token => ({
      type,
      value,
      start,
      end: position,
      column: column - value.length,
      line,
      op: OP_TABLE[value] !== undefined,
      template,
    });

    while (position < source.length) {
      const start = position;
      const char = currentChar();

      // Skip comments
      if (char === '/' && peekChar() === '/') {
        // Single line comment
        while (position < source.length && !Lexer.isNewline(currentChar())) {
          advance();
        }
        continue;
      }

      if (char === '/' && peekChar() === '*') {
        // Multi-line comment
        advance(); // skip /
        advance(); // skip *
        while (position < source.length - 1) {
          if (currentChar() === '*' && peekChar() === '/') {
            advance(); // skip *
            advance(); // skip /
            break;
          }
          advance();
        }
        continue;
      }

      if (char === '-' && peekChar() === '-') {
        // Hyperscript single line comment
        while (position < source.length && !Lexer.isNewline(currentChar())) {
          advance();
        }
        continue;
      }

      // Whitespace
      if (Lexer.isWhitespace(char)) {
        let whitespace = '';
        while (position < source.length && Lexer.isWhitespace(currentChar())) {
          whitespace += advance();
        }
        tokens.push(makeToken('WHITESPACE', whitespace, start));
        continue;
      }

      // Numbers
      if (Lexer.isNumeric(char)) {
        let number = '';
        while (
          position < source.length &&
          (Lexer.isNumeric(currentChar()) || currentChar() === '.')
        ) {
          number += advance();
        }
        // Scientific notation
        if (currentChar() === 'e' || currentChar() === 'E') {
          number += advance();
          if (currentChar() === '+' || currentChar() === '-') {
            number += advance();
          }
          while (position < source.length && Lexer.isNumeric(currentChar())) {
            number += advance();
          }
        }
        tokens.push(makeToken('NUMBER', number, start));
        continue;
      }

      // Strings (context-aware for single quotes)
      if (
        char === '"' ||
        char === '`' ||
        (char === "'" && Lexer.isValidSingleQuoteStringStart(tokens))
      ) {
        const quote = char;
        let string = advance(); // include opening quote

        if (quote === '`' && template) {
          // Template string with interpolation
          while (position < source.length) {
            const c = currentChar();
            if (c === '`') {
              string += advance();
              break;
            } else if (c === '$' && peekChar() === '{') {
              string += advance(); // $
              string += advance(); // {
              templateBraceCount++;
            } else if (c === '}' && templateBraceCount > 0) {
              string += advance();
              templateBraceCount--;
            } else if (c === '\\') {
              string += advance(); // backslash
              if (position < source.length) {
                string += advance(); // escaped char
              }
            } else {
              string += advance();
            }
          }
        } else {
          // Regular string
          while (position < source.length) {
            const c = currentChar();
            if (c === quote) {
              string += advance();
              break;
            } else if (c === '\\') {
              string += advance(); // backslash
              if (position < source.length) {
                string += advance(); // escaped char
              }
            } else {
              string += advance();
            }
          }
        }
        tokens.push(makeToken('STRING', string, start));
        continue;
      }

      // Attribute references ([@attr] form must be checked before operators)
      if (char === '[' && peekChar() === '@') {
        let attrRef = advance(); // [
        attrRef += advance(); // @
        while (position < source.length && currentChar() !== ']') {
          attrRef += advance();
        }
        if (currentChar() === ']') {
          attrRef += advance(); // ]
        }
        tokens.push(makeToken('ATTRIBUTE_REF', attrRef, start));
        continue;
      }

      // Attribute references (@attr form)
      if (char === '@') {
        let attrRef = advance(); // @
        while (
          position < source.length &&
          (Lexer.isAlpha(currentChar()) || Lexer.isNumeric(currentChar()) || currentChar() === '-')
        ) {
          attrRef += advance();
        }
        tokens.push(makeToken('ATTRIBUTE_REF', attrRef, start));
        continue;
      }

      // Class references (.class)
      if (char === '.' && Lexer.isAlpha(peekChar())) {
        let classRef = advance(); // .
        while (position < source.length && Lexer.isValidCSSClassChar(currentChar())) {
          classRef += advance();
        }
        tokens.push({ ...makeToken('CLASS_REF', classRef, start), template: true });
        continue;
      }

      // ID references (#id)
      if (char === '#' && Lexer.isAlpha(peekChar())) {
        let idRef = advance(); // #
        while (position < source.length && Lexer.isValidCSSIDChar(currentChar())) {
          idRef += advance();
        }
        tokens.push({ ...makeToken('ID_REF', idRef, start), template: true });
        continue;
      }

      // Style references (*property)
      if (char === '*' && Lexer.isAlpha(peekChar())) {
        let styleRef = advance(); // *
        while (
          position < source.length &&
          (Lexer.isAlpha(currentChar()) || Lexer.isNumeric(currentChar()) || currentChar() === '-')
        ) {
          styleRef += advance();
        }
        tokens.push(makeToken('STYLE_REF', styleRef, start));
        continue;
      }

      // Reserved characters
      if (Lexer.isReservedChar(char)) {
        tokens.push(makeToken('RESERVED', advance(), start));
        continue;
      }

      // Multi-character operators
      const twoChar = char + peekChar();
      const threeChar = twoChar + source[position + 2];

      if (OP_TABLE[threeChar]) {
        advance();
        advance();
        tokens.push(makeToken(OP_TABLE[threeChar], threeChar, start));
        continue;
      }

      if (OP_TABLE[twoChar]) {
        advance();
        tokens.push(makeToken(OP_TABLE[twoChar], twoChar, start));
        continue;
      }

      // Single character operators
      if (OP_TABLE[char]) {
        tokens.push(makeToken(OP_TABLE[char], advance(), start));
        continue;
      }

      // Identifiers
      if (Lexer.isAlpha(char) || Lexer.isIdentifierChar(char)) {
        let identifier = '';
        while (
          position < source.length &&
          (Lexer.isAlpha(currentChar()) ||
            Lexer.isNumeric(currentChar()) ||
            Lexer.isIdentifierChar(currentChar()))
        ) {
          identifier += advance();
        }
        tokens.push(makeToken('IDENTIFIER', identifier, start));
        continue;
      }

      // Unknown character - create token anyway
      tokens.push(makeToken('UNKNOWN', advance(), start));
    }

    // Add EOF token
    tokens.push({
      type: 'EOF',
      value: '<<<EOF>>>',
      start: position,
      end: position,
      column,
      line,
    });

    return new Tokens(tokens, 0, source);
  }
}

/**
 * Token stream manager class
 */
export class Tokens {
  private tokens: Token[];
  private consumed: number;
  private source: string;
  private lastConsumed?: Token;

  constructor(tokens: Token[], consumed: number, source: string) {
    this.tokens = tokens;
    this.consumed = consumed;
    this.source = source;
  }

  hasMore(): boolean {
    return this.consumed < this.tokens.length;
  }

  token(n: number = 0, dontIgnoreWhitespace: boolean = false): Token {
    let index = this.consumed;
    let count = 0;

    // Skip to the nth non-whitespace token (or nth token if dontIgnoreWhitespace)
    while (index < this.tokens.length && count <= n) {
      if (dontIgnoreWhitespace || this.tokens[index].type !== 'WHITESPACE') {
        if (count === n) {
          break;
        }
        count++;
      }
      index++;
    }

    if (index >= this.tokens.length) {
      return {
        type: 'EOF',
        value: '<<<EOF>>>',
        start: this.source.length,
        end: this.source.length,
        column: 0,
        line: 0,
      };
    }

    return this.tokens[index];
  }

  currentToken(): Token {
    return this.token(0);
  }

  consumeToken(): Token {
    const token = this.currentToken();

    // Skip over whitespace
    while (this.consumed < this.tokens.length && this.tokens[this.consumed].type === 'WHITESPACE') {
      this.consumed++;
    }

    if (this.consumed < this.tokens.length) {
      this.lastConsumed = this.tokens[this.consumed];
      this.consumed++;
    }

    return token;
  }

  consumeWhitespace(): void {
    while (this.consumed < this.tokens.length && this.tokens[this.consumed].type === 'WHITESPACE') {
      this.consumed++;
    }
  }

  lastMatch(): Token | undefined {
    return this.lastConsumed;
  }

  matchToken(value: string, type?: string): Token | null {
    const token = this.currentToken();
    if (token.value === value && (!type || token.type === type)) {
      return this.consumeToken();
    }
    return null;
  }

  matchTokenType(...types: string[]): Token | null {
    const token = this.currentToken();
    if (types.includes(token.type)) {
      return this.consumeToken();
    }
    return null;
  }

  matchOpToken(value: string): Token | null {
    const token = this.currentToken();
    if (token.op && token.value === value) {
      return this.consumeToken();
    }
    return null;
  }

  requireToken(value: string, type?: string): Token {
    const token = this.matchToken(value, type);
    if (!token) {
      this.raiseError(
        `Expected '${value}'${type ? ` (${type})` : ''} but found '${this.currentToken().value}'`
      );
    }
    return token;
  }

  requireTokenType(type: string): Token {
    const token = this.matchTokenType(type);
    if (!token) {
      this.raiseError(`Expected ${type} but found '${this.currentToken().value}'`);
    }
    return token;
  }

  requireOpToken(value: string): Token {
    const token = this.matchOpToken(value);
    if (!token) {
      this.raiseError(`Expected operator '${value}' but found '${this.currentToken().value}'`);
    }
    return token;
  }

  consumeUntil(value?: string, type?: string): Token[] {
    const consumed: Token[] = [];
    while (this.hasMore()) {
      const token = this.currentToken();
      if (token.type === 'EOF') break;
      if (value && token.value === value) break;
      if (type && token.type === type) break;
      consumed.push(this.consumeToken());
    }
    return consumed;
  }

  consumeUntilWhitespace(): Token[] {
    const consumed: Token[] = [];
    while (this.hasMore()) {
      const token = this.currentToken();
      if (token.type === 'WHITESPACE' || token.type === 'EOF') break;
      consumed.push(this.consumeToken());
    }
    return consumed;
  }

  lastWhitespace(): string {
    if (this.consumed > 0 && this.tokens[this.consumed - 1].type === 'WHITESPACE') {
      return this.tokens[this.consumed - 1].value;
    }
    return '';
  }

  raiseError(message: string): never {
    const token = this.currentToken();
    throw new Error(`Parse error at line ${token.line}, column ${token.column}: ${message}`);
  }

  // Static utility methods
  static sourceFor(tokens: Token[]): string {
    if (tokens.length === 0) return '';
    // This would need access to original source - simplified for now
    return tokens.map(t => t.value).join('');
  }

  static lineFor(token: Token): string {
    // Would need access to original source lines - simplified
    return `Line ${token.line}`;
  }

  static positionString(token: Token): string {
    return `line ${token.line}, column ${token.column}`;
  }
}
