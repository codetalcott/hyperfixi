/**
 * Test Suite for Utility Command Parsers (Non-Dispatch Functions)
 *
 * Tests parseRegularCommand, parseMultiWordCommand, parseJsCommand, and parseTellCommand.
 * Skips parseCompoundCommand to avoid circular dependency issues.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseRegularCommand,
  parseMultiWordCommand,
  parseFetchCommand,
  parseJsCommand,
  parseTellCommand,
} from '../utility-commands';
import {
  createMockParserContext,
  createTokenStream,
  createToken,
} from '../../../__test-utils__/parser-context-mock';
import type { IdentifierNode } from '../../parser-types';

describe('Utility Command Parsers (Non-Dispatch)', () => {
  function createIdentifierNode(name: string): IdentifierNode {
    return {
      type: 'identifier',
      name,
      start: 0,
      end: name.length,
      line: 1,
      column: 0,
    };
  }

  describe('parseRegularCommand', () => {
    it('should parse command with multiple arguments', () => {
      const tokens = createTokenStream(['arg1', 'arg2', 'then']);
      const ctx = createMockParserContext(tokens, {
        checkIdentifierLike: vi
          .fn()
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)
          .mockReturnValue(false),
        parsePrimary: vi
          .fn()
          .mockReturnValueOnce({ type: 'identifier', name: 'arg1' })
          .mockReturnValueOnce({ type: 'identifier', name: 'arg2' }),
        getPosition: vi.fn(() => ({ start: 0, end: 10, line: 1, column: 0 })),
      });

      const result = parseRegularCommand(ctx, createIdentifierNode('myCommand'));

      expect(result.args).toHaveLength(2);
      expect(result.name).toBe('myCommand');
    });

    it('should parse command with selector arguments', () => {
      const tokens = createTokenStream(['.class', '#id']);
      const ctx = createMockParserContext(tokens, {
        checkIdentifierLike: vi.fn(() => false),
        checkSelector: vi
          .fn()
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)
          .mockReturnValue(false),
        parsePrimary: vi
          .fn()
          .mockReturnValueOnce({ type: 'selector', value: '.class' })
          .mockReturnValueOnce({ type: 'selector', value: '#id' }),
        getPosition: vi.fn(() => ({ start: 0, end: 10, line: 1, column: 0 })),
      });

      const result = parseRegularCommand(ctx, createIdentifierNode('myCommand'));

      expect(result.args).toHaveLength(2);
    });

    it('should stop at command boundaries', () => {
      const tokens = createTokenStream(['arg', 'then']);
      const ctx = createMockParserContext(tokens, {
        checkIdentifierLike: vi
          .fn(() => true)
          .mockReturnValueOnce(true)
          .mockReturnValue(false),
        parsePrimary: vi.fn(() => ({ type: 'identifier', name: 'arg' })),
        getPosition: vi.fn(() => ({ start: 0, end: 10, line: 1, column: 0 })),
      });

      const result = parseRegularCommand(ctx, createIdentifierNode('myCommand'));

      expect(result.args).toHaveLength(1);
    });
  });

  describe('parseMultiWordCommand', () => {
    it('should return null if no pattern found', () => {
      const tokens = createTokenStream([]);
      const ctx = createMockParserContext(tokens, {
        getMultiWordPattern: vi.fn(() => null),
      });

      const result = parseMultiWordCommand(ctx, createToken('unknown'), 'unknown');

      expect(result).toBeNull();
    });

    it('should parse command with keyword modifiers', () => {
      // "fetch /api/data as json" → primary arg: /api/data, modifier: { as: json }
      const tokens = createTokenStream(['/api/data', 'as', 'json']);
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        getMultiWordPattern: vi.fn(() => ({
          command: 'fetch',
          keywords: ['as', 'with'],
          syntax: 'fetch <url> [as <type>] [with <options>]',
        })),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        peek: vi.fn(
          () =>
            tokens[pos] || { value: '', kind: 'identifier', start: 0, end: 0, line: 1, column: 0 }
        ),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          return t;
        }),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            return true;
          }
          return false;
        }),
        parsePrimary: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          return { type: 'literal', value: t?.value, start: 0, end: 10 };
        }),
        parseExpression: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          return { type: 'identifier', name: t?.value, start: 0, end: 10 };
        }),
        getPosition: vi.fn(() => ({ start: 0, end: 30, line: 1, column: 0 })),
      });

      const result = parseMultiWordCommand(ctx, createToken('fetch'), 'fetch');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('fetch');
      expect(result!.args).toHaveLength(1); // primary arg: /api/data
    });

    it('should parse command with multiple modifiers', () => {
      // "append <div/> to #target" → primary arg: <div/>, modifier: { to: #target }
      const tokens = createTokenStream(['<div/>', 'to', '#target']);
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        getMultiWordPattern: vi.fn(() => ({
          command: 'append',
          keywords: ['to'],
          syntax: 'append <value> [to <target>]',
        })),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        peek: vi.fn(
          () =>
            tokens[pos] || { value: '', kind: 'identifier', start: 0, end: 0, line: 1, column: 0 }
        ),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          return t;
        }),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            return true;
          }
          return false;
        }),
        parsePrimary: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          return { type: 'selector', value: t?.value, start: 0, end: 10 };
        }),
        parseExpression: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          return { type: 'selector', value: t?.value, start: 0, end: 10 };
        }),
        getPosition: vi.fn(() => ({ start: 0, end: 30, line: 1, column: 0 })),
      });

      const result = parseMultiWordCommand(ctx, createToken('append'), 'append');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('append');
      expect(result!.args).toHaveLength(1); // primary arg
    });
  });

  describe('parseJsCommand', () => {
    it('should parse js command without parameters', () => {
      const tokens = createTokenStream(['console.log("test")', 'end']);
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        match: vi.fn(() => false),
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        peek: vi.fn(() => tokens[pos]),
        advance: vi.fn(() => tokens[pos++]),
        consume: vi.fn(),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        getInputSlice: vi.fn(() => 'console.log("test")'),
        getPosition: vi.fn(() => ({ start: 0, end: 10, line: 1, column: 0 })),
      });

      const result = parseJsCommand(ctx, createIdentifierNode('js'));

      expect(result.name).toBe('js');
      expect(result.args).toHaveLength(2);
    });

    it('should parse js command with parameters', () => {
      const tokens = createTokenStream(['(', 'x', ',', 'y', ')', 'return', 'x', '+', 'y', 'end']);
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            return true;
          }
          return false;
        }),
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        checkIdentifierLike: vi.fn(() => ['x', 'y'].includes(tokens[pos]?.value)),
        peek: vi.fn(() => tokens[pos]),
        advance: vi.fn(() => tokens[pos++]),
        consume: vi.fn(() => pos++),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        getInputSlice: vi.fn(() => 'return x + y'),
        getPosition: vi.fn(() => ({ start: 0, end: 10, line: 1, column: 0 })),
      });

      const result = parseJsCommand(ctx, createIdentifierNode('js'));

      expect(result.args).toHaveLength(2);
      const params = (result.args[1] as any).elements;
      expect(params).toHaveLength(2);
    });
  });

  describe('parseFetchCommand', () => {
    /**
     * Helper: creates a tracking context where position is managed by a closure.
     * All token navigation methods (check, peek, advance, match, isAtEnd, peekAt)
     * stay in sync through the shared `pos` variable.
     */
    function createFetchCtx(
      tokens: ReturnType<typeof createTokenStream>,
      overrides: Record<string, any> = {}
    ) {
      let pos = 0;
      const eofToken = { kind: 'eof', value: '', start: 99, end: 99, line: 1, column: 99 } as any;

      return createMockParserContext(tokens, {
        isAtEnd: vi.fn(() => pos >= tokens.length),
        peek: vi.fn(() => tokens[pos] || eofToken),
        peekAt: vi.fn((offset: number) => {
          const idx = pos + offset;
          return idx >= 0 && idx < tokens.length ? tokens[idx] : null;
        }),
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        checkIdentifierLike: vi.fn(() => {
          const t = tokens[pos];
          return t != null && (t.kind === 'identifier' || t.kind === 'keyword');
        }),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          return t;
        }),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            return true;
          }
          return false;
        }),
        consume: vi.fn((_expected: string, _msg: string) => {
          const t = tokens[pos];
          pos++;
          return t;
        }),
        parsePrimary: vi.fn(() => {
          const t = tokens[pos];
          if (!t) return null;
          // Handle object literal token '{' → return objectLiteral node
          if (t.value === '{') {
            pos++; // consume '{'
            const props: any[] = [];
            while (pos < tokens.length && tokens[pos]?.value !== '}') {
              const key = tokens[pos];
              pos++;
              pos++; // consume ':'
              const val = tokens[pos];
              pos++;
              props.push({
                key: { type: 'identifier', name: key?.value },
                value: { type: 'literal', value: val?.value },
              });
              if (tokens[pos]?.value === ',') pos++; // consume optional comma
            }
            if (tokens[pos]?.value === '}') pos++; // consume '}'
            return { type: 'objectLiteral', properties: props, start: t.start, end: 99 };
          }
          pos++;
          return {
            type: 'identifier',
            name: t.value,
            start: t.start,
            end: t.end,
            line: t.line,
            column: t.column,
          };
        }),
        getPosition: vi.fn(() => ({ start: 0, end: 99, line: 1, column: 0 })),
        addError: vi.fn(),
        ...overrides,
      });
    }

    it('should parse basic "fetch /url"', () => {
      const tokens = createTokenStream(['/api/data']);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.name).toBe('fetch');
      expect(result.args).toHaveLength(1);
      expect((result.args[0] as any).name).toBe('/api/data');
    });

    it('should parse "fetch /url as json"', () => {
      const tokens = createTokenStream(['/api/data', 'as', 'json']);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.name).toBe('fetch');
      expect(result.args).toHaveLength(1);
      expect(result.modifiers).toBeDefined();
      expect((result.modifiers!.as as any).name).toBe('json');
    });

    it('should parse "fetch /url as Object" (Object alias)', () => {
      const tokens = createTokenStream(['/api/data', 'as', 'Object']);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.modifiers).toBeDefined();
      expect((result.modifiers!.as as any).name).toBe('Object');
    });

    it('should parse "fetch /url as an Object" (skip article)', () => {
      const tokens = createTokenStream(['/api/data', 'as', 'an', 'Object']);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.modifiers).toBeDefined();
      // 'an' should be skipped, 'Object' should be the as value
      expect((result.modifiers!.as as any).name).toBe('Object');
    });

    it('should parse "fetch /url as a json" (skip article)', () => {
      const tokens = createTokenStream(['/api/data', 'as', 'a', 'json']);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.modifiers).toBeDefined();
      expect((result.modifiers!.as as any).name).toBe('json');
    });

    it('should parse "fetch /url {method:POST}" (inline object literal)', () => {
      const tokens = createTokenStream(['/api/data', '{', 'method', ':', "'POST'", '}']);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.name).toBe('fetch');
      expect(result.args).toHaveLength(1);
      expect(result.modifiers).toBeDefined();
      expect((result.modifiers!.with as any).type).toBe('objectLiteral');
    });

    it('should parse "fetch /url with {method:POST}" (with + object literal)', () => {
      const tokens = createTokenStream(['/api/data', 'with', '{', 'method', ':', "'POST'", '}']);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.name).toBe('fetch');
      expect(result.modifiers).toBeDefined();
      expect((result.modifiers!.with as any).type).toBe('objectLiteral');
    });

    it('should parse "fetch /url with method:POST" (naked named args)', () => {
      const tokens = createTokenStream(['/api/data', 'with', 'method', ':', "'POST'"]);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.name).toBe('fetch');
      expect(result.modifiers).toBeDefined();
      const withMod = result.modifiers!.with as any;
      expect(withMod.type).toBe('objectLiteral');
      expect(withMod.properties).toHaveLength(1);
      expect(withMod.properties[0].key.name).toBe('method');
    });

    it('should parse naked named args with multiple properties', () => {
      // "fetch /url with method:'POST', credentials:'include'"
      const tokens = createTokenStream([
        '/api/data',
        'with',
        'method',
        ':',
        "'POST'",
        ',',
        'credentials',
        ':',
        "'include'",
      ]);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      const withMod = result.modifiers!.with as any;
      expect(withMod.type).toBe('objectLiteral');
      expect(withMod.properties).toHaveLength(2);
      expect(withMod.properties[0].key.name).toBe('method');
      expect(withMod.properties[1].key.name).toBe('credentials');
    });

    it('should parse "fetch /url with {opts} as json" (as after with)', () => {
      const tokens = createTokenStream([
        '/api/data',
        'with',
        '{',
        'method',
        ':',
        "'POST'",
        '}',
        'as',
        'json',
      ]);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.modifiers).toBeDefined();
      expect((result.modifiers!.with as any).type).toBe('objectLiteral');
      expect((result.modifiers!.as as any).name).toBe('json');
    });

    it('should parse "fetch /url as json with {opts}" (as before with — existing)', () => {
      const tokens = createTokenStream([
        '/api/data',
        'as',
        'json',
        'with',
        '{',
        'method',
        ':',
        "'POST'",
        '}',
      ]);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.modifiers).toBeDefined();
      expect((result.modifiers!.as as any).name).toBe('json');
      expect((result.modifiers!.with as any).type).toBe('objectLiteral');
    });

    it('should stop at command boundary (then)', () => {
      const tokens = createTokenStream(['/api/data', 'then']);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.args).toHaveLength(1);
      expect(result.modifiers).toBeUndefined();
    });

    it('should handle error when URL is missing', () => {
      const tokens = createTokenStream([]);
      const ctx = createFetchCtx(tokens, {
        parsePrimary: vi.fn(() => null),
      });

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(ctx.addError).toHaveBeenCalledWith('fetch requires a URL');
    });

    // Upstream _hyperscript 0.9.90: `do not throw` opts out of throw-on-non-2xx.
    it('should parse "fetch /url do not throw"', () => {
      const tokens = createTokenStream(['/api/data', 'do', 'not', 'throw']);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.modifiers).toBeDefined();
      expect(result.modifiers!.doNotThrow).toBeDefined();
      expect((result.modifiers!.doNotThrow as any).value).toBe(true);
    });

    it('should parse "fetch /url as json do not throw" (after `as`)', () => {
      const tokens = createTokenStream(['/api/data', 'as', 'json', 'do', 'not', 'throw']);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.modifiers).toBeDefined();
      expect((result.modifiers!.as as any).name).toBe('json');
      expect((result.modifiers!.doNotThrow as any).value).toBe(true);
    });

    it('should parse "fetch /url do not throw as json" (before `as`)', () => {
      const tokens = createTokenStream(['/api/data', 'do', 'not', 'throw', 'as', 'json']);
      const ctx = createFetchCtx(tokens);

      const result = parseFetchCommand(ctx, createToken('fetch'));

      expect(result.modifiers).toBeDefined();
      expect((result.modifiers!.as as any).name).toBe('json');
      expect((result.modifiers!.doNotThrow as any).value).toBe(true);
    });
  });

  describe('parseTellCommand', () => {
    it('should parse tell with target and single command', () => {
      const tokens = createTokenStream(['#el', 'add', '.active']);
      const ctx = createMockParserContext(tokens, {
        parseExpression: vi.fn(() => ({ type: 'selector', value: '#el' })),
        checkIsCommand: vi
          .fn(() => true)
          .mockReturnValueOnce(true)
          .mockReturnValue(false),
        advance: vi.fn(),
        parseCommand: vi.fn(() => ({ type: 'Command', name: 'add', arguments: [] })),
        match: vi.fn(() => false),
        check: vi.fn(() => false),
        isAtEnd: vi
          .fn(() => false)
          .mockReturnValueOnce(false)
          .mockReturnValue(true),
        getPosition: vi.fn(() => ({ start: 0, end: 10, line: 1, column: 0 })),
      });

      const result = parseTellCommand(ctx, createIdentifierNode('tell'));

      expect(result.name).toBe('tell');
      expect(result.args.length).toBeGreaterThanOrEqual(2);
    });

    it('should throw if target is missing', () => {
      const tokens = createTokenStream([]);
      const ctx = createMockParserContext(tokens, {
        parseExpression: vi.fn(() => null),
      });

      expect(() => parseTellCommand(ctx, createIdentifierNode('tell'))).toThrow(
        'requires a target expression'
      );
    });

    it('should throw if no commands after target', () => {
      const tokens = createTokenStream(['#el']);
      const ctx = createMockParserContext(tokens, {
        parseExpression: vi.fn(() => ({ type: 'selector', value: '#el' })),
        checkIsCommand: vi.fn(() => false),
        isAtEnd: vi.fn(() => true),
      });

      expect(() => parseTellCommand(ctx, createIdentifierNode('tell'))).toThrow(
        'requires at least one command'
      );
    });
  });
});
