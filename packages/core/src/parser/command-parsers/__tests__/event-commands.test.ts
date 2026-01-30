/**
 * Test Suite for Event Command Parsers
 *
 * Tests the parseTriggerCommand function which handles both 'trigger' and 'send' commands.
 * These commands fire events on target elements with syntax like:
 *   - trigger <event> on <target>
 *   - send <event> to <target>
 *
 * @module parser/command-parsers/__tests__/event-commands
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseTriggerCommand } from '../event-commands';
import {
  createMockParserContext,
  createTokenStream,
  createToken,
} from '../../../__test-utils__/parser-context-mock';
import type { ParserContext, IdentifierNode } from '../../parser-types';
import type { Token, ASTNode } from '../../../types/core';

describe('Event Command Parsers', () => {
  /**
   * Helper to create an identifier node for command name
   */
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

  /**
   * Helper to create a properly configured parser context
   * that simulates the parsing flow used by parseTriggerCommand
   */
  function createParserContextForEventCommand(tokens: Token[]): ParserContext {
    let position = 0;

    // Track which tokens have been parsed by parsePrimary
    const parsedTokens: ASTNode[] = [];

    const ctx = createMockParserContext(tokens, {
      current: position,

      isAtEnd: vi.fn(() => position >= tokens.length),

      peek: vi.fn(
        () => tokens[position] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
      ),

      check: vi.fn((value: string) => {
        const token = tokens[position];
        return token && token.value === value;
      }),

      checkIdentifierLike: vi.fn(() => {
        const token = tokens[position];
        return token && (token.kind === 'identifier' || token.kind === 'keyword');
      }),

      advance: vi.fn(() => {
        const token = tokens[position];
        position++;
        ctx.current = position;
        return token || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 };
      }),

      getPosition: vi.fn(() => ({
        start: 0,
        end: position > 0 && tokens[position - 1] ? tokens[position - 1].end : 0,
        line: 1,
        column: 0,
      })),

      createIdentifier: vi.fn((name: string) => ({
        type: 'identifier' as const,
        name,
        start: 0,
        end: name.length,
        line: 1,
        column: 0,
      })),

      parsePrimary: vi.fn(() => {
        if (position >= tokens.length) {
          return {
            type: 'identifier',
            name: '__END__',
            start: 0,
            end: 0,
            line: 1,
            column: 0,
          };
        }

        const token = tokens[position];
        position++;
        ctx.current = position;

        let node: ASTNode;

        // Convert token to appropriate AST node
        if (token.value.startsWith('.') || token.value.startsWith('#')) {
          node = {
            type: 'selector',
            value: token.value,
            start: token.start,
            end: token.end,
            line: token.line,
            column: token.column,
          };
        } else if (token.value.startsWith('<') && token.value.endsWith('/>')) {
          node = {
            type: 'selector',
            value: token.value,
            start: token.start,
            end: token.end,
            line: token.line,
            column: token.column,
          };
        } else if (token.kind === 'keyword') {
          node = {
            type: 'identifier',
            name: token.value,
            start: token.start,
            end: token.end,
            line: token.line,
            column: token.column,
          };
        } else {
          node = {
            type: 'identifier',
            name: token.value,
            start: token.start,
            end: token.end,
            line: token.line,
            column: token.column,
          };
        }

        parsedTokens.push(node);
        return node;
      }),

      checkIsCommand: vi.fn(() => false), // Event commands don't check for nested commands
    });

    return ctx;
  }

  describe('parseTriggerCommand', () => {
    describe('Basic syntax', () => {
      it('should parse "trigger click on #button"', () => {
        const tokens = createTokenStream(
          ['click', 'on', '#button'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        expect(result).toBeTruthy();
        expect(result?.type).toBe('command');
        expect(result?.name).toBe('trigger');
        expect(result?.args).toHaveLength(3);

        // Should have: event (string), 'on' keyword, target (selector)
        expect(result?.args[0]).toMatchObject({
          type: 'string',
          value: 'click',
        });
        expect(result?.args[1]).toMatchObject({
          type: 'identifier',
          name: 'on',
        });
        expect(result?.args[2]).toMatchObject({
          type: 'selector',
          value: '#button',
        });
      });

      it('should parse "send customEvent to #target"', () => {
        const tokens = createTokenStream(
          ['customEvent', 'to', '#target'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('send'));

        expect(result).toBeTruthy();
        expect(result?.type).toBe('command');
        expect(result?.name).toBe('send');
        expect(result?.args).toHaveLength(3);

        // Should have: event (string), 'to' keyword, target (selector)
        expect(result?.args[0]).toMatchObject({
          type: 'string',
          value: 'customEvent',
        });
        expect(result?.args[1]).toMatchObject({
          type: 'identifier',
          name: 'to',
        });
        expect(result?.args[2]).toMatchObject({
          type: 'selector',
          value: '#target',
        });
      });

      it('should parse event name correctly', () => {
        const tokens = createTokenStream(
          ['myEvent', 'on', '.element'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        expect(result?.args[0]).toMatchObject({
          type: 'string',
          value: 'myEvent',
        });
      });

      it('should parse target correctly', () => {
        const tokens = createTokenStream(
          ['click', 'on', '<button/>'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        expect(result?.args[2]).toMatchObject({
          type: 'selector',
          value: '<button/>',
        });
      });
    });

    describe('Colon-separated events', () => {
      it('should combine "draggable:start" into single event name', () => {
        const tokens = [
          createToken('draggable', 'identifier', 0),
          createToken(':', 'operator', 9),
          createToken('start', 'identifier', 10),
          createToken('on', 'keyword', 16),
          createToken('.element', 'selector', 19),
        ];

        let position = 0;
        const ctx = createMockParserContext(tokens, {
          current: position,
          isAtEnd: vi.fn(() => position >= tokens.length),
          peek: vi.fn(
            () =>
              tokens[position] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
          ),
          check: vi.fn((value: string) => {
            const token = tokens[position];
            return token && token.value === value;
          }),
          checkIdentifierLike: vi.fn(() => {
            const token = tokens[position];
            return token && (token.kind === 'identifier' || token.kind === 'keyword');
          }),
          advance: vi.fn(() => {
            const token = tokens[position];
            position++;
            ctx.current = position;
            return token || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 };
          }),
          getPosition: vi.fn(() => ({
            start: 0,
            end: position > 0 && tokens[position - 1] ? tokens[position - 1].end : 0,
            line: 1,
            column: 0,
          })),
          createIdentifier: vi.fn((name: string) => ({
            type: 'identifier' as const,
            name,
            start: 0,
            end: name.length,
            line: 1,
            column: 0,
          })),
          parsePrimary: vi.fn(() => {
            const token = tokens[position];
            position++;
            ctx.current = position;
            return {
              type: token.value.startsWith('.') ? 'selector' : 'identifier',
              [token.value.startsWith('.') ? 'value' : 'name']: token.value,
              start: token.start,
              end: token.end,
              line: token.line,
              column: token.column,
            } as ASTNode;
          }),
          checkIsCommand: vi.fn(() => false),
        });

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        expect(result?.args[0]).toMatchObject({
          type: 'string',
          value: 'draggable:start',
        });
      });

      it('should handle multiple colons like "custom:event:type"', () => {
        const tokens = [
          createToken('custom', 'identifier', 0),
          createToken(':', 'operator', 6),
          createToken('event', 'identifier', 7),
          createToken(':', 'operator', 12),
          createToken('type', 'identifier', 13),
          createToken('on', 'keyword', 18),
          createToken('#target', 'selector', 21),
        ];

        let position = 0;
        const ctx = createMockParserContext(tokens, {
          current: position,
          isAtEnd: vi.fn(() => position >= tokens.length),
          peek: vi.fn(
            () =>
              tokens[position] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
          ),
          check: vi.fn((value: string) => {
            const token = tokens[position];
            return token && token.value === value;
          }),
          checkIdentifierLike: vi.fn(() => {
            const token = tokens[position];
            return token && (token.kind === 'identifier' || token.kind === 'keyword');
          }),
          advance: vi.fn(() => {
            const token = tokens[position];
            position++;
            ctx.current = position;
            return token || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 };
          }),
          getPosition: vi.fn(() => ({
            start: 0,
            end: position > 0 && tokens[position - 1] ? tokens[position - 1].end : 0,
            line: 1,
            column: 0,
          })),
          createIdentifier: vi.fn((name: string) => ({
            type: 'identifier' as const,
            name,
            start: 0,
            end: name.length,
            line: 1,
            column: 0,
          })),
          parsePrimary: vi.fn(() => {
            const token = tokens[position];
            position++;
            ctx.current = position;
            return {
              type: token.value.startsWith('#') ? 'selector' : 'identifier',
              [token.value.startsWith('#') ? 'value' : 'name']: token.value,
              start: token.start,
              end: token.end,
              line: token.line,
              column: token.column,
            } as ASTNode;
          }),
          checkIsCommand: vi.fn(() => false),
        });

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        expect(result?.args[0]).toMatchObject({
          type: 'string',
          value: 'custom:event:type',
        });
      });

      it('should stop at colon if followed by non-identifier', () => {
        const tokens = [
          createToken('event', 'identifier', 0),
          createToken(':', 'operator', 5),
          createToken('123', 'number', 6), // Not an identifier
        ];

        let position = 0;
        const ctx = createMockParserContext(tokens, {
          current: position,
          isAtEnd: vi.fn(() => position >= tokens.length),
          peek: vi.fn(
            () =>
              tokens[position] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
          ),
          check: vi.fn((value: string) => {
            const token = tokens[position];
            return token && token.value === value;
          }),
          checkIdentifierLike: vi.fn(() => {
            const token = tokens[position];
            return token && (token.kind === 'identifier' || token.kind === 'keyword');
          }),
          advance: vi.fn(() => {
            const token = tokens[position];
            position++;
            ctx.current = position;
            return token || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 };
          }),
          getPosition: vi.fn(() => ({
            start: 0,
            end: position > 0 && tokens[position - 1] ? tokens[position - 1].end : 0,
            line: 1,
            column: 0,
          })),
          createIdentifier: vi.fn((name: string) => ({
            type: 'identifier' as const,
            name,
            start: 0,
            end: name.length,
            line: 1,
            column: 0,
          })),
          parsePrimary: vi.fn(() => {
            const token = tokens[position];
            position++;
            ctx.current = position;
            return {
              type: 'literal',
              value: parseInt(token.value),
              raw: token.value,
              start: token.start,
              end: token.end,
              line: token.line,
              column: token.column,
            } as ASTNode;
          }),
          checkIsCommand: vi.fn(() => false),
        });

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        // Event name should include colon but stop before number
        expect(result?.args[0]).toMatchObject({
          type: 'string',
          value: 'event:',
        });
      });
    });

    describe('Keyword detection', () => {
      it('should find "on" keyword in argument list', () => {
        const tokens = createTokenStream(
          ['click', 'on', '#button'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        // Should have restructured around 'on'
        expect(result?.args[1]).toMatchObject({
          type: 'identifier',
          name: 'on',
        });
      });

      it('should find "to" keyword in argument list', () => {
        const tokens = createTokenStream(
          ['event', 'to', '.target'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('send'));

        // Should have restructured around 'to'
        expect(result?.args[1]).toMatchObject({
          type: 'identifier',
          name: 'to',
        });
      });

      it('should handle missing keyword gracefully', () => {
        const tokens = createTokenStream(['click', '#button'], ['identifier', 'selector']);
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        // Should not fail, just use args as-is
        expect(result).toBeTruthy();
        expect(result?.args.length).toBeGreaterThan(0);
      });
    });

    describe('Argument restructuring', () => {
      it('should restructure arguments around "on" keyword', () => {
        const tokens = createTokenStream(
          ['myEvent', 'on', '#target'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        // Order: event, 'on', target
        expect(result?.args).toHaveLength(3);
        expect((result?.args[0] as any).value).toBe('myEvent');
        expect((result?.args[1] as any).name).toBe('on');
        expect((result?.args[2] as any).value).toBe('#target');
      });

      it('should restructure arguments around "to" keyword', () => {
        const tokens = createTokenStream(
          ['event', 'to', '.element'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('send'));

        // Order: event, 'to', target
        expect(result?.args).toHaveLength(3);
        expect((result?.args[0] as any).value).toBe('event');
        expect((result?.args[1] as any).name).toBe('to');
        expect((result?.args[2] as any).value).toBe('.element');
      });

      it('should preserve argument order after keyword', () => {
        const tokens = createTokenStream(
          ['click', 'on', '#button', 'extra'],
          ['identifier', 'keyword', 'selector', 'identifier']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        // Should preserve all args after 'on'
        expect(result?.args.length).toBeGreaterThanOrEqual(3);
        expect((result?.args[2] as any).value).toBe('#button');
      });
    });

    describe('Edge cases', () => {
      it('should handle empty target after keyword', () => {
        const tokens = createTokenStream(['click', 'on'], ['identifier', 'keyword']);
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        expect(result).toBeTruthy();
        // May have only event and 'on', no target
        expect(result?.args.length).toBeGreaterThanOrEqual(2);
      });

      it('should handle multiple arguments before keyword', () => {
        const tokens = createTokenStream(
          ['arg1', 'arg2', 'on', '#target'],
          ['identifier', 'identifier', 'keyword', 'selector']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        expect(result).toBeTruthy();
        expect(result?.args.length).toBeGreaterThan(2);
      });

      it('should use all args as-is when no keyword found', () => {
        const tokens = createTokenStream(['event', 'target'], ['identifier', 'identifier']);
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        expect(result).toBeTruthy();
        // Without keyword, args are used as-is
        expect(result?.args.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('Command node structure', () => {
      it('should return a CommandNode', () => {
        const tokens = createTokenStream(
          ['click', 'on', '#button'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        expect(result).toBeTruthy();
        expect(result?.type).toBe('command');
      });

      it('should have correct command name from identifier', () => {
        const tokens1 = createTokenStream(
          ['click', 'on', '#button'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx1 = createParserContextForEventCommand(tokens1);
        const triggerResult = parseTriggerCommand(ctx1, createIdentifierNode('trigger'));
        expect(triggerResult?.name).toBe('trigger');

        // Reset and test with 'send'
        const tokens2 = createTokenStream(
          ['event', 'to', '#target'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx2 = createParserContextForEventCommand(tokens2);
        const sendResult = parseTriggerCommand(ctx2, createIdentifierNode('send'));
        expect(sendResult?.name).toBe('send');
      });

      it('should have restructured arguments array', () => {
        const tokens = createTokenStream(
          ['myEvent', 'on', '.target'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        expect(result?.args).toBeInstanceOf(Array);
        expect(result?.args).toHaveLength(3);
      });
    });

    describe('Integration tests', () => {
      it('should parse complete trigger command end-to-end', () => {
        const tokens = createTokenStream(
          ['customEvent', 'on', '<form/>'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('trigger'));

        expect(result).toMatchObject({
          type: 'command',
          name: 'trigger',
        });

        expect(result?.args).toHaveLength(3);
        expect((result?.args[0] as any).type).toBe('string');
        expect((result?.args[0] as any).value).toBe('customEvent');
        expect((result?.args[1] as any).type).toBe('identifier');
        expect((result?.args[1] as any).name).toBe('on');
        expect((result?.args[2] as any).type).toBe('selector');
        expect((result?.args[2] as any).value).toBe('<form/>');
      });

      it('should parse complete send command end-to-end', () => {
        const tokens = createTokenStream(
          ['notify', 'to', '#notification'],
          ['identifier', 'keyword', 'selector']
        );
        const ctx = createParserContextForEventCommand(tokens);

        const result = parseTriggerCommand(ctx, createIdentifierNode('send'));

        expect(result).toMatchObject({
          type: 'command',
          name: 'send',
        });

        expect(result?.args).toHaveLength(3);
        expect((result?.args[0] as any).type).toBe('string');
        expect((result?.args[0] as any).value).toBe('notify');
        expect((result?.args[1] as any).type).toBe('identifier');
        expect((result?.args[1] as any).name).toBe('to');
        expect((result?.args[2] as any).type).toBe('selector');
        expect((result?.args[2] as any).value).toBe('#notification');
      });
    });
  });
});
