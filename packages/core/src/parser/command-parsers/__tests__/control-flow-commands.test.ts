/**
 * Test Suite for Control Flow Command Parsers
 *
 * Tests parseHaltCommand, parseRepeatCommand, parseIfCommand, and parseForCommand
 * using mock ParserContext.
 *
 * Note on parseIfCommand: This function has complex lookahead logic that reads
 * ctx.current and ctx.tokens directly. The mock setup must carefully synchronize
 * the internal position variable with ctx.current. Some edge cases of parseIfCommand
 * are intentionally simplified or skipped because the lookahead scanning makes them
 * extremely difficult to mock correctly without essentially reimplementing the parser.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseHaltCommand,
  parseRepeatCommand,
  parseIfCommand,
  parseForCommand,
} from '../control-flow-commands';
import {
  createMockParserContext,
  createTokenStream,
  createToken,
} from '../../../__test-utils__/parser-context-mock';
import type { IdentifierNode } from '../../parser-types';
import type { Token, ASTNode } from '../../../types/core';

function createIdentifierNode(name: string): IdentifierNode {
  return { type: 'identifier', name, start: 0, end: name.length, line: 1, column: 0 };
}

/**
 * Helper to create a token with a specific line number.
 * Useful for parseIfCommand which checks line positions for multi-line detection.
 */
function createTokenOnLine(value: string, line: number, kind = 'identifier'): Token {
  return {
    kind: kind as any,
    value,
    start: 0,
    end: value.length,
    line,
    column: 1,
  };
}

/**
 * Creates a parser context for control flow commands.
 *
 * Unlike simpler command parsers, control flow parsers read ctx.current and
 * ctx.tokens directly for lookahead. This helper ensures those properties
 * stay synchronized with the internal position counter.
 */
function createControlFlowContext(tokens: Token[], overrides: Record<string, any> = {}): any {
  let pos = 0;

  const ctx = createMockParserContext(tokens, {
    peek: vi.fn(
      () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
    ),

    check: vi.fn((value: string) => {
      const token = tokens[pos];
      return token !== undefined && token.value === value;
    }),

    checkIdentifierLike: vi.fn(() => {
      const token = tokens[pos];
      return token !== undefined && (token.kind === 'identifier' || token.kind === 'keyword');
    }),

    advance: vi.fn(() => {
      const token = tokens[pos];
      pos++;
      ctx.current = pos;
      return token;
    }),

    isAtEnd: vi.fn(() => pos >= tokens.length),

    previous: vi.fn(
      () =>
        tokens[Math.max(0, pos - 1)] || {
          kind: 'eof',
          value: '',
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        }
    ),

    consume: vi.fn((expected: string, message?: string) => {
      if (tokens[pos]?.value !== expected) {
        throw new Error(message || `Expected "${expected}" but got "${tokens[pos]?.value}"`);
      }
      const token = tokens[pos];
      pos++;
      ctx.current = pos;
      return token;
    }),

    parseExpression: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-expr',
      start: 0,
      end: 0,
      line: 1,
      column: 0,
    })),

    parsePrimary: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-primary',
      start: 0,
      end: 0,
      line: 1,
      column: 0,
    })),

    parseLogicalAnd: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-condition',
      start: 0,
      end: 0,
      line: 1,
      column: 0,
    })),

    parseCommand: vi.fn(() => ({
      type: 'command',
      name: 'mock-cmd',
      args: [],
      isBlocking: false,
      start: 0,
      end: 0,
      line: 1,
      column: 0,
    })),

    parseCommandListUntilEnd: vi.fn(() => []),

    checkIsCommand: vi.fn(() => false),
    isCommand: vi.fn(() => false),

    getPosition: vi.fn(() => ({
      start: 0,
      end: pos,
      line: 1,
      column: pos,
    })),

    addError: vi.fn(),

    ...overrides,
  });

  // Ensure tokens array is accessible for lookahead
  ctx.tokens = tokens;
  ctx.current = 0;

  return ctx;
}

describe('Control Flow Command Parsers', () => {
  // =========================================================================
  // parseHaltCommand
  // =========================================================================
  describe('parseHaltCommand', () => {
    it('should parse simple halt with no trailing keywords', () => {
      // halt (nothing follows)
      const tokens: Token[] = [];
      const ctx = createControlFlowContext(tokens);

      const result = parseHaltCommand(ctx, createIdentifierNode('halt'));

      expect(result).not.toBeNull();
      expect(result!.name).toBe('halt');
      expect(result!.args).toHaveLength(0);
    });

    it('should parse halt the event', () => {
      // halt the event
      const tokens = createTokenStream(['the', 'event'], ['identifier', 'identifier']);
      const ctx = createControlFlowContext(tokens);

      const result = parseHaltCommand(ctx, createIdentifierNode('halt'));

      expect(result).not.toBeNull();
      expect(result!.name).toBe('halt');
      expect(result!.args).toHaveLength(2);
      expect((result!.args[0] as any).name).toBe('the');
      expect((result!.args[1] as any).name).toBe('event');
    });

    it('should parse halt the (without event keyword following)', () => {
      // halt the <something-else> — only 'the' is consumed; 'event' check fails
      const tokens = createTokenStream(['the', 'something'], ['identifier', 'identifier']);
      const ctx = createControlFlowContext(tokens);

      const result = parseHaltCommand(ctx, createIdentifierNode('halt'));

      expect(result).not.toBeNull();
      expect(result!.name).toBe('halt');
      // Only 'the' should be in args since 'something' !== 'event'
      expect(result!.args).toHaveLength(1);
      expect((result!.args[0] as any).name).toBe('the');
    });
  });

  // =========================================================================
  // parseRepeatCommand
  // =========================================================================
  describe('parseRepeatCommand', () => {
    it('should parse repeat forever', () => {
      // repeat forever <body> end
      const tokens = createTokenStream(['forever'], ['identifier']);
      const ctx = createControlFlowContext(tokens);

      const commandToken = createToken('repeat');
      const result = parseRepeatCommand(ctx, commandToken);

      expect(result.name).toBe('repeat');
      // args[0] = loop type identifier ('forever')
      expect((result.args[0] as any).name).toBe('forever');
      // Last arg should be a block
      const lastArg = result.args[result.args.length - 1] as any;
      expect(lastArg.type).toBe('block');
      expect(lastArg.commands).toEqual([]);
    });

    it('should parse repeat N times', () => {
      // repeat <expr> times <body> end
      // After 'repeat', no keywords match (for/in/while/until/forever).
      // Falls through to N times: parseExpression, then check('times')
      const tokens = createTokenStream(['5', 'times'], ['number', 'identifier']);
      let pos = 0;

      const mockExpr = {
        type: 'literal',
        value: 5,
        raw: '5',
        start: 0,
        end: 1,
        line: 1,
        column: 0,
      };

      const ctx = createControlFlowContext(tokens, {
        // parseExpression consumes the '5' token
        parseExpression: vi.fn(() => {
          pos++;
          ctx.current = pos;
          return mockExpr;
        }),
        check: vi.fn((value: string) => tokens[pos]?.value === value),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          ctx.current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        isAtEnd: vi.fn(() => pos >= tokens.length),
      });
      ctx.current = 0;

      const commandToken = createToken('repeat');
      const result = parseRepeatCommand(ctx, commandToken);

      expect(result.name).toBe('repeat');
      // args[0] = loop type ('times')
      expect((result.args[0] as any).name).toBe('times');
      // args should include the times count expression
      const timesArg = result.args.find((a: any) => a.type === 'literal' && a.value === 5);
      expect(timesArg).toBeDefined();
      // Last arg = block
      const lastArg = result.args[result.args.length - 1] as any;
      expect(lastArg.type).toBe('block');
    });

    it('should parse repeat for-in loop', () => {
      // repeat for item in <collection> <body> end
      const tokens = createTokenStream(
        ['for', 'item', 'in'],
        ['identifier', 'identifier', 'identifier']
      );
      let pos = 0;

      const collectionExpr = {
        type: 'identifier',
        name: 'items',
        start: 0,
        end: 5,
        line: 1,
        column: 0,
      };

      const ctx = createControlFlowContext(tokens, {
        check: vi.fn((value: string) => tokens[pos]?.value === value),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          ctx.current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => collectionExpr),
      });
      ctx.current = 0;

      const commandToken = createToken('repeat');
      const result = parseRepeatCommand(ctx, commandToken);

      expect(result.name).toBe('repeat');
      // args[0] = loop type ('for')
      expect((result.args[0] as any).name).toBe('for');
      // args[1] = variable name (as string node)
      expect((result.args[1] as any).type).toBe('string');
      expect((result.args[1] as any).value).toBe('item');
      // args[2] = collection expression
      expect((result.args[2] as any).name).toBe('items');
      // Last arg = block
      const lastArg = result.args[result.args.length - 1] as any;
      expect(lastArg.type).toBe('block');
    });

    it('should parse repeat while loop', () => {
      // repeat while <condition> <body> end
      const tokens = createTokenStream(['while'], ['identifier']);
      let pos = 0;

      const conditionExpr = {
        type: 'identifier',
        name: 'isRunning',
        start: 0,
        end: 9,
        line: 1,
        column: 0,
      };

      const ctx = createControlFlowContext(tokens, {
        check: vi.fn((value: string) => tokens[pos]?.value === value),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          ctx.current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => conditionExpr),
      });
      ctx.current = 0;

      const commandToken = createToken('repeat');
      const result = parseRepeatCommand(ctx, commandToken);

      expect(result.name).toBe('repeat');
      // args[0] = loop type ('while')
      expect((result.args[0] as any).name).toBe('while');
      // args[1] = condition expression
      expect((result.args[1] as any).name).toBe('isRunning');
      // Last arg = block
      const lastArg = result.args[result.args.length - 1] as any;
      expect(lastArg.type).toBe('block');
    });

    it('should parse repeat until (condition, not event)', () => {
      // repeat until <condition> <body> end
      // check('event') after 'until' returns false
      const tokens = createTokenStream(['until'], ['identifier']);
      let pos = 0;

      const conditionExpr = {
        type: 'identifier',
        name: 'done',
        start: 0,
        end: 4,
        line: 1,
        column: 0,
      };

      const ctx = createControlFlowContext(tokens, {
        check: vi.fn((value: string) => tokens[pos]?.value === value),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          ctx.current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => conditionExpr),
      });
      ctx.current = 0;

      const commandToken = createToken('repeat');
      const result = parseRepeatCommand(ctx, commandToken);

      expect(result.name).toBe('repeat');
      // args[0] = loop type ('until')
      expect((result.args[0] as any).name).toBe('until');
      // args[1] = condition expression
      expect((result.args[1] as any).name).toBe('done');
      // Last arg = block
      const lastArg = result.args[result.args.length - 1] as any;
      expect(lastArg.type).toBe('block');
    });

    it('should parse repeat for-in loop with index', () => {
      // repeat for item in <collection> with index <body> end
      const tokens = createTokenStream(
        ['for', 'item', 'in', 'with', 'index'],
        ['identifier', 'identifier', 'identifier', 'identifier', 'identifier']
      );
      let pos = 0;

      const collectionExpr = {
        type: 'identifier',
        name: 'items',
        start: 0,
        end: 5,
        line: 1,
        column: 0,
      };

      const ctx = createControlFlowContext(tokens, {
        check: vi.fn((value: string) => tokens[pos]?.value === value),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          ctx.current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => collectionExpr),
      });
      ctx.current = 0;
      ctx.tokens = tokens;

      const commandToken = createToken('repeat');
      const result = parseRepeatCommand(ctx, commandToken);

      expect(result.name).toBe('repeat');
      // args[0] = 'for'
      expect((result.args[0] as any).name).toBe('for');
      // args[1] = variable name 'item'
      expect((result.args[1] as any).value).toBe('item');
      // args[2] = collection
      expect((result.args[2] as any).name).toBe('items');
      // Should have an index variable arg (type: 'string', value: 'index')
      const indexArg = result.args.find((a: any) => a.type === 'string' && a.value === 'index');
      expect(indexArg).toBeDefined();
      // Last arg = block
      const lastArg = result.args[result.args.length - 1] as any;
      expect(lastArg.type).toBe('block');
    });
  });

  // =========================================================================
  // parseIfCommand
  //
  // NOTE: parseIfCommand has extremely complex lookahead logic. It reads
  // ctx.current and ctx.tokens directly, saves/restores position, and scans
  // forward looking for 'then', 'end', 'else', or command tokens. Mocking
  // this correctly requires the advance() mock to update ctx.current, and
  // the check/peek/isAtEnd mocks to read from a shared position variable
  // that is also mutated when the source code directly sets ctx.current.
  //
  // Because the source code writes `ctx.current = savedPosForThen` to
  // restore position after lookahead, our mock must handle this mutation.
  // We use a getter/setter on ctx.current to keep the pos variable in sync.
  // =========================================================================
  describe('parseIfCommand', () => {
    /**
     * Creates a specialized context for parseIfCommand that handles
     * the direct ctx.current manipulation (save/restore for lookahead).
     *
     * Key challenge: parseIfCommand reads and writes ctx.current directly
     * for lookahead scanning, and also calls ctx.advance()/ctx.peek()/etc.
     * All of these must share a single position variable. We use a Proxy
     * to intercept reads/writes to ctx.current and keep `pos` in sync.
     */
    function createIfContext(tokens: Token[], overrides: Record<string, any> = {}): any {
      // Shared position state - all mocks read/write through this
      const state = { pos: 0 };

      const baseOverrides: Record<string, any> = {
        peek: vi.fn(
          () =>
            tokens[state.pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),

        check: vi.fn((value: string) => tokens[state.pos]?.value === value),

        advance: vi.fn(() => {
          const t = tokens[state.pos];
          state.pos++;
          return t;
        }),

        isAtEnd: vi.fn(() => state.pos >= tokens.length),

        parseExpression: vi.fn(() => ({
          type: 'identifier',
          name: 'mock-condition',
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),

        parseLogicalAnd: vi.fn(() => {
          // Simulate consuming one condition token
          state.pos++;
          return {
            type: 'identifier',
            name: 'mock-condition',
            start: 0,
            end: 0,
            line: 1,
            column: 0,
          };
        }),

        parseCommand: vi.fn(() => ({
          type: 'command',
          name: 'log',
          args: [],
          isBlocking: false,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),

        parseCommandListUntilEnd: vi.fn(() => []),

        checkIsCommand: vi.fn(() => false),
        isCommand: vi.fn(() => false),

        consume: vi.fn((expected: string, message?: string) => {
          if (tokens[state.pos]?.value !== expected) {
            throw new Error(
              message || `Expected "${expected}" but got "${tokens[state.pos]?.value}"`
            );
          }
          const t = tokens[state.pos];
          state.pos++;
          return t;
        }),

        getPosition: vi.fn(() => ({
          start: 0,
          end: state.pos,
          line: 1,
          column: state.pos,
        })),

        addError: vi.fn(),

        ...overrides,
      };

      const rawCtx = createMockParserContext(tokens, baseOverrides);
      rawCtx.tokens = tokens;

      // Use a Proxy to intercept get/set on 'current' so that the source code's
      // direct reads (ctx.current) and writes (ctx.current = savedPos) are
      // reflected in our shared state.pos variable.
      const ctx = new Proxy(rawCtx, {
        get(target, prop) {
          if (prop === 'current') return state.pos;
          return (target as any)[prop];
        },
        set(target, prop, value) {
          if (prop === 'current') {
            state.pos = value;
            return true;
          }
          (target as any)[prop] = value;
          return true;
        },
      });

      return ctx;
    }

    it('should parse multi-line if with then keyword', () => {
      // if <condition> then <cmd> end
      // Tokens after 'if' (which is already consumed): condition, then, log, end
      //
      // Built from scratch for precise position control, similar to the
      // single-line test above.
      const tokens: Token[] = [
        createTokenOnLine('isActive', 1), // 0: condition
        createTokenOnLine('then', 1), // 1: then keyword
        createTokenOnLine('log', 1), // 2: command
        createTokenOnLine('end', 1), // 3: end keyword
      ];

      const state = { pos: 0 };

      const rawCtx = createMockParserContext(tokens, {
        peek: vi.fn(
          () =>
            tokens[state.pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        check: vi.fn((value: string) => tokens[state.pos]?.value === value),
        advance: vi.fn(() => {
          const t = tokens[state.pos];
          state.pos++;
          return t;
        }),
        isAtEnd: vi.fn(() => state.pos >= tokens.length),
        // checkIsCommand returns true only for 'log'
        checkIsCommand: vi.fn(() => {
          const token = tokens[state.pos];
          return token?.value === 'log';
        }),
        isCommand: vi.fn((name: string) => name === 'log'),
        // parseExpression consumes the condition token
        parseExpression: vi.fn(() => {
          state.pos++;
          return {
            type: 'identifier',
            name: 'mock-condition',
            start: 0,
            end: 0,
            line: 1,
            column: 0,
          };
        }),
        parseCommand: vi.fn(() => ({
          type: 'command',
          name: 'log',
          args: [],
          isBlocking: false,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        consume: vi.fn((expected: string, message?: string) => {
          if (tokens[state.pos]?.value !== expected) {
            throw new Error(
              message || `Expected "${expected}" but got "${tokens[state.pos]?.value}"`
            );
          }
          const t = tokens[state.pos];
          state.pos++;
          return t;
        }),
        getPosition: vi.fn(() => ({ start: 0, end: state.pos, line: 1, column: state.pos })),
        addError: vi.fn(),
      });
      rawCtx.tokens = tokens;

      const ctx = new Proxy(rawCtx, {
        get(target, prop) {
          if (prop === 'current') return state.pos;
          return (target as any)[prop];
        },
        set(target, prop, value) {
          if (prop === 'current') {
            state.pos = value;
            return true;
          }
          (target as any)[prop] = value;
          return true;
        },
      }) as any;

      const commandToken = createTokenOnLine('if', 1);
      const result = parseIfCommand(ctx, commandToken);

      expect(result.name).toBe('if');
      // args[0] = condition
      expect(result.args.length).toBeGreaterThanOrEqual(2);
      // args[1] = then block
      const thenBlock = result.args[1] as any;
      expect(thenBlock.type).toBe('block');
    });

    it('should parse single-line if (condition followed by command on same line)', () => {
      // Single-line: if <condition> <command>
      // No 'then' in tokens, no 'end'/'else' on same line -> single-line form
      // The condition is parsed by parseLogicalAnd, then a command follows
      //
      // This test builds the mock from scratch (not using createIfContext)
      // because the single-line path requires very precise position tracking
      // across checkIsCommand, parseLogicalAnd, and advance calls.
      const tokens: Token[] = [
        createTokenOnLine('isActive', 1), // condition token
        createTokenOnLine('log', 1), // command token
      ];

      // Single shared position - all mock functions reference this
      const state = { pos: 0 };

      const rawCtx = createMockParserContext(tokens, {
        peek: vi.fn(
          () =>
            tokens[state.pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        check: vi.fn((value: string) => tokens[state.pos]?.value === value),
        advance: vi.fn(() => {
          const t = tokens[state.pos];
          state.pos++;
          return t;
        }),
        isAtEnd: vi.fn(() => state.pos >= tokens.length),
        checkIsCommand: vi.fn(() => {
          const token = tokens[state.pos];
          return token?.value === 'log';
        }),
        isCommand: vi.fn((name: string) => name === 'log'),
        parseLogicalAnd: vi.fn(() => {
          state.pos++;
          return {
            type: 'identifier',
            name: 'mock-condition',
            start: 0,
            end: 0,
            line: 1,
            column: 0,
          };
        }),
        parseExpression: vi.fn(() => ({
          type: 'identifier',
          name: 'mock-condition',
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        parseCommand: vi.fn(() => ({
          type: 'command',
          name: 'log',
          args: [],
          isBlocking: false,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        consume: vi.fn(),
        getPosition: vi.fn(() => ({ start: 0, end: state.pos, line: 1, column: state.pos })),
        addError: vi.fn(),
      });
      rawCtx.tokens = tokens;

      // Proxy to keep ctx.current in sync with state.pos
      const ctx = new Proxy(rawCtx, {
        get(target, prop) {
          if (prop === 'current') return state.pos;
          return (target as any)[prop];
        },
        set(target, prop, value) {
          if (prop === 'current') {
            state.pos = value;
            return true;
          }
          (target as any)[prop] = value;
          return true;
        },
      }) as any;

      const commandToken = createTokenOnLine('if', 1);
      const result = parseIfCommand(ctx, commandToken);

      expect(result.name).toBe('if');
      expect(result.args.length).toBeGreaterThanOrEqual(2);
      // args[0] = condition
      expect(result.args[0]).toBeDefined();
      // args[1] = block wrapping the single command
      const block = result.args[1] as any;
      expect(block.type).toBe('block');
      expect(block.commands).toHaveLength(1);
    });

    it('should throw when condition is empty in single-line form', () => {
      // Single-line form but parseLogicalAnd returns nothing useful and
      // the loop produces zero condition tokens. We simulate this by making
      // checkIsCommand return true immediately (so the while loop never runs).
      const tokens: Token[] = [
        createTokenOnLine('log', 1), // Immediately a command, no condition
      ];

      const ctx = createIfContext(tokens, {
        checkIsCommand: vi.fn(() => true),
        isCommand: vi.fn((name: string) => name === 'log'),
        // parseLogicalAnd should not be called since the while loop condition
        // checks checkIsCommand first
      });

      const commandToken = createTokenOnLine('if', 1);

      // The while loop condition prevents entering, conditionTokens is empty -> throw
      expect(() => parseIfCommand(ctx, commandToken)).toThrow('Expected condition after if/unless');
    });

    it('should throw when then block is empty and at end of input', () => {
      // Multi-line form (has 'then') but no commands after 'then' and at end.
      // After consuming the condition and 'then', isAtEnd should be true.
      const tokens: Token[] = [
        createTokenOnLine('isActive', 1), // 0: condition
        createTokenOnLine('then', 1), // 1: then keyword
        // nothing after 'then' - isAtEnd will be true at pos=2
      ];

      const state = { pos: 0 };

      const rawCtx = createMockParserContext(tokens, {
        peek: vi.fn(
          () =>
            tokens[state.pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        check: vi.fn((value: string) => tokens[state.pos]?.value === value),
        advance: vi.fn(() => {
          const t = tokens[state.pos];
          state.pos++;
          return t;
        }),
        isAtEnd: vi.fn(() => state.pos >= tokens.length),
        checkIsCommand: vi.fn(() => false),
        isCommand: vi.fn(() => false),
        // parseExpression consumes the condition token
        parseExpression: vi.fn(() => {
          state.pos++;
          return {
            type: 'identifier',
            name: 'mock-condition',
            start: 0,
            end: 0,
            line: 1,
            column: 0,
          };
        }),
        consume: vi.fn((expected: string, message?: string) => {
          if (tokens[state.pos]?.value !== expected) {
            throw new Error(
              message || `Expected "${expected}" but got "${tokens[state.pos]?.value}"`
            );
          }
          const t = tokens[state.pos];
          state.pos++;
          return t;
        }),
        getPosition: vi.fn(() => ({ start: 0, end: state.pos, line: 1, column: state.pos })),
        addError: vi.fn(),
      });
      rawCtx.tokens = tokens;

      const ctx = new Proxy(rawCtx, {
        get(target, prop) {
          if (prop === 'current') return state.pos;
          return (target as any)[prop];
        },
        set(target, prop, value) {
          if (prop === 'current') {
            state.pos = value;
            return true;
          }
          (target as any)[prop] = value;
          return true;
        },
      }) as any;

      const commandToken = createTokenOnLine('if', 1);

      expect(() => parseIfCommand(ctx, commandToken)).toThrow("Expected command after 'then'");
    });
  });

  // =========================================================================
  // parseForCommand
  // =========================================================================
  describe('parseForCommand', () => {
    it('should parse basic for-in loop', () => {
      // for item in <collection> <body> end
      const tokens = createTokenStream(['item', 'in'], ['identifier', 'identifier']);
      let pos = 0;

      const collectionExpr = {
        type: 'identifier',
        name: 'items',
        start: 0,
        end: 5,
        line: 1,
        column: 0,
      };

      const ctx = createControlFlowContext(tokens, {
        check: vi.fn((value: string) => tokens[pos]?.value === value),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          ctx.current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => collectionExpr),
      });
      ctx.current = 0;

      const commandToken = createToken('for');
      const result = parseForCommand(ctx, commandToken);

      // parseForCommand returns a 'repeat' command for reuse of RepeatCommand
      expect(result.name).toBe('repeat');
      // args[0] = loop type ('for')
      expect((result.args[0] as any).name).toBe('for');
      // args[1] = variable name
      expect((result.args[1] as any).type).toBe('string');
      expect((result.args[1] as any).value).toBe('item');
      // args[2] = collection
      expect((result.args[2] as any).name).toBe('items');
      // Last arg = block
      const lastArg = result.args[result.args.length - 1] as any;
      expect(lastArg.type).toBe('block');
      expect(lastArg.commands).toEqual([]);
    });

    it('should parse for each syntax', () => {
      // for each item in <collection> <body> end
      const tokens = createTokenStream(
        ['each', 'item', 'in'],
        ['identifier', 'identifier', 'identifier']
      );
      let pos = 0;

      const collectionExpr = {
        type: 'identifier',
        name: 'list',
        start: 0,
        end: 4,
        line: 1,
        column: 0,
      };

      const ctx = createControlFlowContext(tokens, {
        check: vi.fn((value: string) => tokens[pos]?.value === value),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          ctx.current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => collectionExpr),
      });
      ctx.current = 0;

      const commandToken = createToken('for');
      const result = parseForCommand(ctx, commandToken);

      expect(result.name).toBe('repeat');
      expect((result.args[0] as any).name).toBe('for');
      expect((result.args[1] as any).value).toBe('item');
      expect((result.args[2] as any).name).toBe('list');
    });

    it('should throw if variable name is missing', () => {
      // for <not-identifier> — peek returns a non-identifier token
      const tokens: Token[] = [
        { kind: 'selector' as any, value: '.active', start: 0, end: 7, line: 1, column: 1 },
      ];
      const ctx = createControlFlowContext(tokens);

      const commandToken = createToken('for');
      expect(() => parseForCommand(ctx, commandToken)).toThrow(
        'Expected variable name after "for"'
      );
    });

    it('should throw if in keyword is missing', () => {
      // for item <not-in>
      const tokens = createTokenStream(['item', 'something'], ['identifier', 'identifier']);
      let pos = 0;

      const ctx = createControlFlowContext(tokens, {
        check: vi.fn((value: string) => tokens[pos]?.value === value),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          ctx.current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        isAtEnd: vi.fn(() => pos >= tokens.length),
      });
      ctx.current = 0;

      const commandToken = createToken('for');
      expect(() => parseForCommand(ctx, commandToken)).toThrow('Expected "in" after variable name');
    });
  });
});
