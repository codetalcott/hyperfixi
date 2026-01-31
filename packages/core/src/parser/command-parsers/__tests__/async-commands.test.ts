/**
 * Test Suite for Async Command Parsers
 *
 * Tests parseWaitCommand and parseInstallCommand from async-commands.ts.
 *
 * parseWaitCommand handles:
 *   - wait <time>           (time-based wait)
 *   - wait for <event>      (event-based wait)
 *   - wait for <event1> or <event2>  (multiple events)
 *   - wait for <event>(param1, param2) from <target>  (event with params and target)
 *
 * parseInstallCommand handles:
 *   - install <BehaviorName>
 *   - install <BehaviorName>(param1, param2)
 *   - install <BehaviorName>(name: value, name2: value2)
 *
 * @module parser/command-parsers/__tests__/async-commands
 */

import { describe, it, expect, vi } from 'vitest';
import { parseWaitCommand, parseInstallCommand } from '../async-commands';
import {
  createMockParserContext,
  createTokenStream,
  createToken,
} from '../../../__test-utils__/parser-context-mock';
import type { IdentifierNode } from '../../parser-types';
import type { Token, ASTNode } from '../../../types/core';

describe('Async Command Parsers', () => {
  /**
   * Helper to build a position-tracking parser context suitable for
   * parseWaitCommand and parseInstallCommand. The closure over `position`
   * ensures advance/peek/check/isAtEnd stay in sync.
   */
  function createTrackingContext(tokens: Token[], extraOverrides: Record<string, any> = {}) {
    let position = 0;

    const ctx = createMockParserContext(tokens, {
      current: position,

      isAtEnd: vi.fn(() => position >= tokens.length),

      peek: vi.fn(
        () =>
          tokens[position] || {
            kind: 'eof',
            value: '',
            start: 0,
            end: 0,
            line: 1,
            column: 0,
          }
      ),

      check: vi.fn((value: string) => {
        const token = tokens[position];
        return token != null && token.value === value;
      }),

      checkIdentifierLike: vi.fn(() => {
        const token = tokens[position];
        return token != null && (token.kind === 'identifier' || token.kind === 'keyword');
      }),

      checkTimeExpression: vi.fn(() => false),

      checkLiteral: vi.fn(() => {
        const kind = tokens[position]?.kind;
        return kind === 'string' || kind === 'number' || kind === 'boolean';
      }),

      match: vi.fn((val: string) => {
        if (tokens[position]?.value === val) {
          position++;
          ctx.current = position;
          return true;
        }
        return false;
      }),

      advance: vi.fn(() => {
        const token = tokens[position];
        position++;
        ctx.current = position;
        return (
          token || {
            kind: 'eof',
            value: '',
            start: 0,
            end: 0,
            line: 1,
            column: 0,
          }
        );
      }),

      previous: vi.fn(
        () =>
          tokens[position - 1] || {
            kind: 'eof',
            value: '',
            start: 0,
            end: 0,
            line: 1,
            column: 0,
          }
      ),

      getPosition: vi.fn(() => ({
        start: 0,
        end: position > 0 && tokens[position - 1] ? tokens[position - 1].end : 0,
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

        if (token.value.startsWith('.') || token.value.startsWith('#')) {
          return {
            type: 'selector',
            value: token.value,
            start: token.start,
            end: token.end,
            line: token.line,
            column: token.column,
          } as ASTNode;
        }
        return {
          type: 'identifier',
          name: token.value,
          start: token.start,
          end: token.end,
          line: token.line,
          column: token.column,
        } as ASTNode;
      }),

      parseExpression: vi.fn(() => {
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

        if (token.kind === 'number') {
          return {
            type: 'literal',
            value: Number(token.value),
            raw: token.value,
            start: token.start,
            end: token.end,
            line: token.line,
            column: token.column,
          } as ASTNode;
        }
        if (token.kind === 'string') {
          return {
            type: 'literal',
            value: token.value,
            raw: `"${token.value}"`,
            start: token.start,
            end: token.end,
            line: token.line,
            column: token.column,
          } as ASTNode;
        }
        return {
          type: 'identifier',
          name: token.value,
          start: token.start,
          end: token.end,
          line: token.line,
          column: token.column,
        } as ASTNode;
      }),

      ...extraOverrides,
    });

    return ctx;
  }

  // =========================================================================
  // parseWaitCommand
  // =========================================================================
  describe('parseWaitCommand', () => {
    describe('Time-based wait', () => {
      it('should parse simple time-based wait', () => {
        // "wait 2s" -- after the parser consumes 'wait', the next token is '2s'
        const tokens = createTokenStream(['2s'], ['number']);
        const timeNode = {
          type: 'literal',
          value: '2s',
          raw: '2s',
          start: 0,
          end: 2,
          line: 1,
          column: 1,
        } as ASTNode;

        const ctx = createTrackingContext(tokens, {
          checkTimeExpression: vi.fn(() => true),
          parsePrimary: vi.fn(() => timeNode),
        });

        const commandToken = createToken('wait', 'identifier', 0);
        const result = parseWaitCommand(ctx, commandToken);

        expect(result).toBeTruthy();
        expect(result.type).toBe('command');
        expect(result.name).toBe('wait');
        expect(result.args).toHaveLength(1);
        expect(result.isBlocking).toBe(true);
        expect(result.args[0]).toBe(timeNode);
      });
    });

    describe('Event-based wait', () => {
      it('should parse wait for single event', () => {
        // "wait for click" -- tokens after 'wait' are: for, click
        const tokens = createTokenStream(['for', 'click'], ['identifier', 'identifier']);

        const ctx = createTrackingContext(tokens);

        const commandToken = createToken('wait', 'identifier', 0);
        const result = parseWaitCommand(ctx, commandToken);

        expect(result).toBeTruthy();
        expect(result.type).toBe('command');
        expect(result.name).toBe('wait');
        expect(result.isBlocking).toBe(true);
        // args[0] is the arrayLiteral containing event objects
        expect(result.args.length).toBeGreaterThanOrEqual(1);

        const eventList = result.args[0] as any;
        expect(eventList.type).toBe('arrayLiteral');
        expect(eventList.elements).toHaveLength(1);
        expect(eventList.elements[0].type).toBe('objectLiteral');

        // The event object should have name = 'click'
        const eventObj = eventList.elements[0];
        const nameProp = eventObj.properties.find((p: any) => p.key.name === 'name');
        expect(nameProp).toBeTruthy();
        expect(nameProp.value.value).toBe('click');
      });

      it('should parse wait for event with parameters', () => {
        // "wait for custom(value, index)"
        const tokens = createTokenStream(
          ['for', 'custom', '(', 'value', ',', 'index', ')'],
          [
            'identifier',
            'identifier',
            'operator',
            'identifier',
            'operator',
            'identifier',
            'operator',
          ]
        );

        const ctx = createTrackingContext(tokens);

        const commandToken = createToken('wait', 'identifier', 0);
        const result = parseWaitCommand(ctx, commandToken);

        expect(result).toBeTruthy();
        expect(result.name).toBe('wait');
        expect(result.args.length).toBeGreaterThanOrEqual(1);

        const eventList = result.args[0] as any;
        expect(eventList.type).toBe('arrayLiteral');
        expect(eventList.elements).toHaveLength(1);

        const eventObj = eventList.elements[0];
        const nameProp = eventObj.properties.find((p: any) => p.key.name === 'name');
        expect(nameProp.value.value).toBe('custom');

        // Check that event params were captured
        const argsProp = eventObj.properties.find((p: any) => p.key.name === 'args');
        expect(argsProp).toBeTruthy();
        expect(argsProp.value.elements).toHaveLength(2);
        expect(argsProp.value.elements[0].value).toBe('value');
        expect(argsProp.value.elements[1].value).toBe('index');
      });

      it('should parse wait for multiple events with or', () => {
        // "wait for click or keydown"
        const tokens = createTokenStream(
          ['for', 'click', 'or', 'keydown'],
          ['identifier', 'identifier', 'identifier', 'identifier']
        );

        const ctx = createTrackingContext(tokens);

        const commandToken = createToken('wait', 'identifier', 0);
        const result = parseWaitCommand(ctx, commandToken);

        expect(result).toBeTruthy();
        expect(result.name).toBe('wait');
        expect(result.args.length).toBeGreaterThanOrEqual(1);

        const eventList = result.args[0] as any;
        expect(eventList.type).toBe('arrayLiteral');
        expect(eventList.elements).toHaveLength(2);

        const firstEvent = eventList.elements[0];
        const secondEvent = eventList.elements[1];

        const firstName = firstEvent.properties.find((p: any) => p.key.name === 'name');
        const secondName = secondEvent.properties.find((p: any) => p.key.name === 'name');
        expect(firstName.value.value).toBe('click');
        expect(secondName.value.value).toBe('keydown');
      });

      it('should parse wait for event from target', () => {
        // "wait for click from #button"
        const tokens = createTokenStream(
          ['for', 'click', 'from', '#button'],
          ['identifier', 'identifier', 'identifier', 'selector']
        );

        const ctx = createTrackingContext(tokens);

        const commandToken = createToken('wait', 'identifier', 0);
        const result = parseWaitCommand(ctx, commandToken);

        expect(result).toBeTruthy();
        expect(result.name).toBe('wait');
        // args[0] = event list, args[1] = target
        expect(result.args).toHaveLength(2);

        const eventList = result.args[0] as any;
        expect(eventList.type).toBe('arrayLiteral');
        expect(eventList.elements).toHaveLength(1);

        const target = result.args[1] as any;
        expect(target.type).toBe('selector');
        expect(target.value).toBe('#button');
      });

      it('should parse wait for event from the target', () => {
        // "wait for click from the window"
        const tokens = createTokenStream(
          ['for', 'click', 'from', 'the', 'window'],
          ['identifier', 'identifier', 'identifier', 'identifier', 'identifier']
        );

        const ctx = createTrackingContext(tokens);

        const commandToken = createToken('wait', 'identifier', 0);
        const result = parseWaitCommand(ctx, commandToken);

        expect(result).toBeTruthy();
        expect(result.name).toBe('wait');
        // args[0] = event list, args[1] = target (after 'the' is consumed)
        expect(result.args).toHaveLength(2);

        const eventList = result.args[0] as any;
        expect(eventList.type).toBe('arrayLiteral');
        expect(eventList.elements).toHaveLength(1);

        const target = result.args[1] as any;
        // parsePrimary returns an identifier for 'window'
        expect(target.type).toBe('identifier');
        expect((target as any).name).toBe('window');
      });
    });
  });

  // =========================================================================
  // parseInstallCommand
  // =========================================================================
  describe('parseInstallCommand', () => {
    describe('Simple install', () => {
      it('should parse simple install', () => {
        // "install Draggable" -- tokens after 'install' are: Draggable
        const tokens = createTokenStream(['Draggable'], ['identifier']);

        const ctx = createTrackingContext(tokens);

        const commandToken = createToken('install', 'identifier', 0);
        const result = parseInstallCommand(ctx, commandToken);

        expect(result).toBeTruthy();
        expect(result.type).toBe('command');
        expect(result.name).toBe('install');
        expect(result.args).toHaveLength(1);

        const behaviorArg = result.args[0] as any;
        expect(behaviorArg.type).toBe('identifier');
        expect(behaviorArg.name).toBe('Draggable');
      });
    });

    describe('Error handling', () => {
      it('should throw if behavior name is missing', () => {
        // No tokens after 'install' -- checkIdentifierLike returns false
        const tokens: Token[] = [];

        const ctx = createTrackingContext(tokens, {
          checkIdentifierLike: vi.fn(() => false),
        });

        const commandToken = createToken('install', 'identifier', 0);

        expect(() => parseInstallCommand(ctx, commandToken)).toThrow(
          'Expected behavior name after "install"'
        );
      });
    });

    describe('Named parameters', () => {
      it('should parse install with named parameters', () => {
        // "install MyBehavior(axis: x, name: test)"
        // Tokens after 'install': MyBehavior ( axis : x , name : test )
        const tokens = createTokenStream(
          ['MyBehavior', '(', 'axis', ':', 'x', ',', 'name', ':', 'test', ')'],
          [
            'identifier',
            'operator',
            'identifier',
            'operator',
            'identifier',
            'operator',
            'identifier',
            'operator',
            'identifier',
            'operator',
          ]
        );

        const ctx = createTrackingContext(tokens);

        const commandToken = createToken('install', 'identifier', 0);
        const result = parseInstallCommand(ctx, commandToken);

        expect(result).toBeTruthy();
        expect(result.name).toBe('install');
        // args[0] = behavior name identifier, args[1] = objectLiteral of params
        expect(result.args).toHaveLength(2);

        const behaviorArg = result.args[0] as any;
        expect(behaviorArg.type).toBe('identifier');
        expect(behaviorArg.name).toBe('MyBehavior');

        const paramsArg = result.args[1] as any;
        expect(paramsArg.type).toBe('objectLiteral');
        expect(paramsArg.properties).toHaveLength(2);

        // First named param: axis
        expect(paramsArg.properties[0].key.type).toBe('identifier');
        expect(paramsArg.properties[0].key.name).toBe('axis');

        // Second named param: name
        expect(paramsArg.properties[1].key.type).toBe('identifier');
        expect(paramsArg.properties[1].key.name).toBe('name');
      });
    });

    describe('Positional parameters', () => {
      it('should parse install with positional parameters', () => {
        // "install MyBehavior(val1, val2)"
        // For positional params, the parser tries identifier + ':' lookahead.
        // When ':' is not found, it rewinds ctx.current to checkpoint, then
        // calls parseExpression. We need to handle the rewind correctly.
        const tokens = createTokenStream(
          ['MyBehavior', '(', 'val1', ',', 'val2', ')'],
          ['identifier', 'operator', 'identifier', 'operator', 'identifier', 'operator']
        );

        // Track position manually to handle the ctx.current rewind
        let position = 0;
        const ctx = createMockParserContext(tokens, {
          current: position,

          isAtEnd: vi.fn(() => position >= tokens.length),

          peek: vi.fn(
            () =>
              tokens[position] || {
                kind: 'eof',
                value: '',
                start: 0,
                end: 0,
                line: 1,
                column: 0,
              }
          ),

          check: vi.fn((value: string) => {
            const token = tokens[position];
            return token != null && token.value === value;
          }),

          checkIdentifierLike: vi.fn(() => {
            const token = tokens[position];
            return token != null && (token.kind === 'identifier' || token.kind === 'keyword');
          }),

          advance: vi.fn(() => {
            const token = tokens[position];
            position++;
            ctx.current = position;
            return (
              token || {
                kind: 'eof',
                value: '',
                start: 0,
                end: 0,
                line: 1,
                column: 0,
              }
            );
          }),

          previous: vi.fn(
            () =>
              tokens[position - 1] || {
                kind: 'eof',
                value: '',
                start: 0,
                end: 0,
                line: 1,
                column: 0,
              }
          ),

          getPosition: vi.fn(() => ({
            start: 0,
            end: position > 0 && tokens[position - 1] ? tokens[position - 1].end : 0,
            line: 1,
            column: 0,
          })),

          parseExpression: vi.fn(() => {
            const token = tokens[position];
            position++;
            ctx.current = position;
            return {
              type: 'identifier',
              name: token.value,
              start: token.start,
              end: token.end,
              line: token.line,
              column: token.column,
            } as ASTNode;
          }),
        });

        // The install parser reads ctx.current for checkpoint/rewind.
        // We need a getter/setter on ctx.current that syncs with our position.
        Object.defineProperty(ctx, 'current', {
          get: () => position,
          set: (v: number) => {
            position = v;
          },
          configurable: true,
        });

        const commandToken = createToken('install', 'identifier', 0);
        const result = parseInstallCommand(ctx, commandToken);

        expect(result).toBeTruthy();
        expect(result.name).toBe('install');
        // args[0] = behavior name, args[1] = objectLiteral with positional params
        expect(result.args).toHaveLength(2);

        const behaviorArg = result.args[0] as any;
        expect(behaviorArg.type).toBe('identifier');
        expect(behaviorArg.name).toBe('MyBehavior');

        const paramsArg = result.args[1] as any;
        expect(paramsArg.type).toBe('objectLiteral');
        expect(paramsArg.properties).toHaveLength(2);

        // Positional params use key.type === 'literal' with value '_positional'
        expect(paramsArg.properties[0].key.type).toBe('literal');
        expect(paramsArg.properties[0].key.value).toBe('_positional');
        expect(paramsArg.properties[1].key.type).toBe('literal');
        expect(paramsArg.properties[1].key.value).toBe('_positional');
      });
    });

    describe('Missing closing paren', () => {
      it('should throw if closing paren is missing', () => {
        // "install MyBehavior(x" -- no closing paren
        const tokens = createTokenStream(
          ['MyBehavior', '(', 'x'],
          ['identifier', 'operator', 'identifier']
        );

        // Use manual position tracking with ctx.current sync for rewind support
        let position = 0;
        const ctx = createMockParserContext(tokens, {
          current: position,

          isAtEnd: vi.fn(() => position >= tokens.length),

          peek: vi.fn(
            () =>
              tokens[position] || {
                kind: 'eof',
                value: '',
                start: 0,
                end: 0,
                line: 1,
                column: 0,
              }
          ),

          check: vi.fn((value: string) => {
            const token = tokens[position];
            return token != null && token.value === value;
          }),

          checkIdentifierLike: vi.fn(() => {
            const token = tokens[position];
            return token != null && (token.kind === 'identifier' || token.kind === 'keyword');
          }),

          advance: vi.fn(() => {
            const token = tokens[position];
            position++;
            ctx.current = position;
            return (
              token || {
                kind: 'eof',
                value: '',
                start: 0,
                end: 0,
                line: 1,
                column: 0,
              }
            );
          }),

          previous: vi.fn(
            () =>
              tokens[position - 1] || {
                kind: 'eof',
                value: '',
                start: 0,
                end: 0,
                line: 1,
                column: 0,
              }
          ),

          getPosition: vi.fn(() => ({
            start: 0,
            end: position > 0 && tokens[position - 1] ? tokens[position - 1].end : 0,
            line: 1,
            column: 0,
          })),

          parseExpression: vi.fn(() => {
            const token = tokens[position];
            position++;
            ctx.current = position;
            return {
              type: 'identifier',
              name: token.value,
              start: token.start,
              end: token.end,
              line: token.line,
              column: token.column,
            } as ASTNode;
          }),
        });

        Object.defineProperty(ctx, 'current', {
          get: () => position,
          set: (v: number) => {
            position = v;
          },
          configurable: true,
        });

        const commandToken = createToken('install', 'identifier', 0);

        expect(() => parseInstallCommand(ctx, commandToken)).toThrow(
          'Expected ")" after behavior parameters'
        );
      });
    });
  });
});
