import { describe, it, expect, beforeEach } from 'vitest';
import { Lexer, Tokens, Token } from './tokenizer';

describe('Lexer', () => {
  describe('character classification', () => {
    it('should identify alphabetic characters', () => {
      expect(Lexer.isAlpha('a')).toBe(true);
      expect(Lexer.isAlpha('Z')).toBe(true);
      expect(Lexer.isAlpha('1')).toBe(false);
      expect(Lexer.isAlpha(' ')).toBe(false);
    });

    it('should identify numeric characters', () => {
      expect(Lexer.isNumeric('0')).toBe(true);
      expect(Lexer.isNumeric('9')).toBe(true);
      expect(Lexer.isNumeric('a')).toBe(false);
      expect(Lexer.isNumeric(' ')).toBe(false);
    });

    it('should identify whitespace characters', () => {
      expect(Lexer.isWhitespace(' ')).toBe(true);
      expect(Lexer.isWhitespace('\t')).toBe(true);
      expect(Lexer.isWhitespace('\n')).toBe(true);
      expect(Lexer.isWhitespace('a')).toBe(false);
    });

    it('should identify newline characters', () => {
      expect(Lexer.isNewline('\n')).toBe(true);
      expect(Lexer.isNewline('\r')).toBe(true);
      expect(Lexer.isNewline(' ')).toBe(false);
      expect(Lexer.isNewline('a')).toBe(false);
    });
  });

  describe('tokenization', () => {
    it('should tokenize simple identifiers', () => {
      const tokens = Lexer.tokenize('hello world');

      expect(tokens.currentToken().type).toBe('IDENTIFIER');
      expect(tokens.currentToken().value).toBe('hello');

      tokens.consumeToken();
      expect(tokens.currentToken().type).toBe('IDENTIFIER');
      expect(tokens.currentToken().value).toBe('world');
    });

    it('should tokenize numbers', () => {
      const tokens = Lexer.tokenize('123 45.67 1.23e-4');

      expect(tokens.currentToken().type).toBe('NUMBER');
      expect(tokens.currentToken().value).toBe('123');

      tokens.consumeToken();
      expect(tokens.currentToken().type).toBe('NUMBER');
      expect(tokens.currentToken().value).toBe('45.67');

      tokens.consumeToken();
      expect(tokens.currentToken().type).toBe('NUMBER');
      expect(tokens.currentToken().value).toBe('1.23e-4');
    });

    it('should tokenize strings', () => {
      const tokens = Lexer.tokenize(`"hello" 'world' \`template\``);

      expect(tokens.currentToken().type).toBe('STRING');
      expect(tokens.currentToken().value).toBe('"hello"');

      tokens.consumeToken();
      expect(tokens.currentToken().type).toBe('STRING');
      expect(tokens.currentToken().value).toBe("'world'");

      tokens.consumeToken();
      expect(tokens.currentToken().type).toBe('STRING');
      expect(tokens.currentToken().value).toBe('`template`');
    });

    it('should tokenize class references', () => {
      const tokens = Lexer.tokenize('.foo .bar-baz');

      expect(tokens.currentToken().type).toBe('CLASS_REF');
      expect(tokens.currentToken().value).toBe('.foo');
      expect(tokens.currentToken().template).toBe(true);

      tokens.consumeToken();
      expect(tokens.currentToken().type).toBe('CLASS_REF');
      expect(tokens.currentToken().value).toBe('.bar-baz');
    });

    it('should tokenize ID references', () => {
      const tokens = Lexer.tokenize('#foo #bar-baz');

      expect(tokens.currentToken().type).toBe('ID_REF');
      expect(tokens.currentToken().value).toBe('#foo');
      expect(tokens.currentToken().template).toBe(true);

      tokens.consumeToken();
      expect(tokens.currentToken().type).toBe('ID_REF');
      expect(tokens.currentToken().value).toBe('#bar-baz');
    });

    it('should tokenize attribute references', () => {
      const tokens = Lexer.tokenize('@foo @bar-baz [@complex-attr]');

      expect(tokens.currentToken().type).toBe('ATTRIBUTE_REF');
      expect(tokens.currentToken().value).toBe('@foo');

      tokens.consumeToken();
      expect(tokens.currentToken().type).toBe('ATTRIBUTE_REF');
      expect(tokens.currentToken().value).toBe('@bar-baz');

      tokens.consumeToken();
      expect(tokens.currentToken().type).toBe('ATTRIBUTE_REF');
      expect(tokens.currentToken().value).toBe('[@complex-attr]');
    });

    it('should tokenize operators', () => {
      const tokens = Lexer.tokenize('+ - * / == != <= >= ( ) { }');

      const expectedOps = [
        ['PLUS', '+'],
        ['MINUS', '-'],
        ['MULTIPLY', '*'],
        ['DIVIDE', '/'],
        ['EQ', '=='],
        ['NEQ', '!='],
        ['LTE_ANG', '<='],
        ['GTE_ANG', '>='],
        ['L_PAREN', '('],
        ['R_PAREN', ')'],
        ['L_BRACE', '{'],
        ['R_BRACE', '}'],
      ];

      for (const [expectedType, expectedValue] of expectedOps) {
        expect(tokens.currentToken().type).toBe(expectedType);
        expect(tokens.currentToken().value).toBe(expectedValue);
        expect(tokens.currentToken().op).toBe(true);
        tokens.consumeToken();
      }
    });

    it('should skip single line comments', () => {
      const tokens = Lexer.tokenize('hello -- this is a comment\nworld');

      expect(tokens.currentToken().type).toBe('IDENTIFIER');
      expect(tokens.currentToken().value).toBe('hello');

      tokens.consumeToken();
      expect(tokens.currentToken().type).toBe('IDENTIFIER');
      expect(tokens.currentToken().value).toBe('world');
    });

    it('should skip multi-line comments', () => {
      const tokens = Lexer.tokenize('hello /* this is a\nmulti-line comment */ world');

      expect(tokens.currentToken().type).toBe('IDENTIFIER');
      expect(tokens.currentToken().value).toBe('hello');

      tokens.consumeToken();
      expect(tokens.currentToken().type).toBe('IDENTIFIER');
      expect(tokens.currentToken().value).toBe('world');
    });

    it('should handle escaped strings', () => {
      const tokens = Lexer.tokenize('"hello \\"world\\" \\n"');

      expect(tokens.currentToken().type).toBe('STRING');
      expect(tokens.currentToken().value).toBe('"hello \\"world\\" \\n"');
    });

    it('should track line and column numbers', () => {
      const tokens = Lexer.tokenize('hello\n  world\n    test');

      expect(tokens.currentToken().line).toBe(1);
      expect(tokens.currentToken().column).toBe(1);

      tokens.consumeToken();
      expect(tokens.currentToken().line).toBe(2);
      expect(tokens.currentToken().column).toBe(3);

      tokens.consumeToken();
      expect(tokens.currentToken().line).toBe(3);
      expect(tokens.currentToken().column).toBe(5);
    });
  });
});

describe('Tokens', () => {
  let tokens: Tokens;

  beforeEach(() => {
    tokens = Lexer.tokenize('hello world 123');
  });

  it('should provide hasMore() functionality', () => {
    expect(tokens.hasMore()).toBe(true);

    tokens.consumeToken(); // hello
    expect(tokens.hasMore()).toBe(true);

    tokens.consumeToken(); // world
    expect(tokens.hasMore()).toBe(true);

    tokens.consumeToken(); // 123
    expect(tokens.hasMore()).toBe(true); // EOF token exists
  });

  it('should provide token lookahead', () => {
    expect(tokens.token(0).value).toBe('hello');
    expect(tokens.token(1).value).toBe('world');
    expect(tokens.token(2).value).toBe('123');
    expect(tokens.token(3).type).toBe('EOF');
  });

  it('should consume tokens correctly', () => {
    expect(tokens.consumeToken().value).toBe('hello');
    expect(tokens.consumeToken().value).toBe('world');
    expect(tokens.consumeToken().value).toBe('123');
    expect(tokens.consumeToken().type).toBe('EOF');
  });

  it('should match tokens by value', () => {
    const token = tokens.matchToken('hello');
    expect(token?.value).toBe('hello');
    expect(tokens.currentToken().value).toBe('world');

    const noMatch = tokens.matchToken('foo');
    expect(noMatch).toBeNull();
  });

  it('should match tokens by type', () => {
    const token = tokens.matchTokenType('IDENTIFIER');
    expect(token?.value).toBe('hello');
    expect(tokens.currentToken().value).toBe('world');
  });

  it('should require tokens', () => {
    const token = tokens.requireToken('hello');
    expect(token.value).toBe('hello');

    expect(() => tokens.requireToken('foo')).toThrow("Expected 'foo' but found 'world'");
  });

  it('should consume until conditions', () => {
    const consumed = tokens.consumeUntil('123');
    expect(consumed).toHaveLength(2);
    expect(consumed[0].value).toBe('hello');
    expect(consumed[1].value).toBe('world');
    expect(tokens.currentToken().value).toBe('123');
  });

  it('should handle whitespace correctly', () => {
    const tokensWithWhitespace = Lexer.tokenize('hello   world');

    // Without whitespace flag - skips whitespace
    expect(tokensWithWhitespace.token(0).value).toBe('hello');
    expect(tokensWithWhitespace.token(1).value).toBe('world');

    // With whitespace flag - includes whitespace
    expect(tokensWithWhitespace.token(1, true).type).toBe('WHITESPACE');
  });

  it('should raise errors with position information', () => {
    expect(() => tokens.raiseError('test error')).toThrow(
      'Parse error at line 1, column 1: test error'
    );
  });
});

describe('hyperscript compatibility', () => {
  it('should handle hyperscript-style expressions', () => {
    const tokens = Lexer.tokenize('add .foo to #bar when clicked');

    expect(tokens.currentToken().value).toBe('add');
    tokens.consumeToken();

    expect(tokens.currentToken().type).toBe('CLASS_REF');
    expect(tokens.currentToken().value).toBe('.foo');
    tokens.consumeToken();

    expect(tokens.currentToken().value).toBe('to');
    tokens.consumeToken();

    expect(tokens.currentToken().type).toBe('ID_REF');
    expect(tokens.currentToken().value).toBe('#bar');
    tokens.consumeToken();

    expect(tokens.currentToken().value).toBe('when');
    tokens.consumeToken();

    expect(tokens.currentToken().value).toBe('clicked');
  });

  it('should handle possessive expressions', () => {
    const tokens = Lexer.tokenize("my value's length");

    expect(tokens.currentToken().value).toBe('my');
    tokens.consumeToken();

    expect(tokens.currentToken().value).toBe('value');
    tokens.consumeToken();

    // Possessive should be two tokens: ' (operator) and s (identifier)
    expect(tokens.currentToken().value).toBe("'");
    expect(tokens.currentToken().type).toBe('APOSTROPHE');
    expect(tokens.currentToken().op).toBe(true);
    tokens.consumeToken();

    expect(tokens.currentToken().value).toBe('s');
    expect(tokens.currentToken().type).toBe('IDENTIFIER');
    tokens.consumeToken();

    expect(tokens.currentToken().value).toBe('length');
  });

  it('should handle complex hyperscript patterns', () => {
    const tokens = Lexer.tokenize("put 'Hello' into #output's innerHTML then add .success to me");

    const expectedTokens = [
      { value: 'put', type: 'IDENTIFIER' },
      { value: "'Hello'", type: 'STRING' },
      { value: 'into', type: 'IDENTIFIER' },
      { value: '#output', type: 'ID_REF' },
      { value: "'", type: 'APOSTROPHE' },
      { value: 's', type: 'IDENTIFIER' },
      { value: 'innerHTML', type: 'IDENTIFIER' },
      { value: 'then', type: 'IDENTIFIER' },
      { value: 'add', type: 'IDENTIFIER' },
      { value: '.success', type: 'CLASS_REF' },
      { value: 'to', type: 'IDENTIFIER' },
      { value: 'me', type: 'IDENTIFIER' },
    ];

    for (const expected of expectedTokens) {
      const token = tokens.currentToken();
      expect(token.value).toBe(expected.value);
      expect(token.type).toBe(expected.type);
      tokens.consumeToken();
    }
  });
});
