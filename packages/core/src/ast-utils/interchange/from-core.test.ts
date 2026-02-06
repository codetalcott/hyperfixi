/**
 * Unit tests for fromCoreAST — Core Parser AST → Interchange Format Converter
 */
import { describe, it, expect } from 'vitest';
import { fromCoreAST } from './from-core';

// Helper: create a minimal core node
function coreNode(
  type: string,
  props: Record<string, unknown> = {}
): { type: string; [k: string]: unknown } {
  return { type, ...props };
}

// =============================================================================
// A. NODE TYPE COVERAGE
// =============================================================================

describe('fromCoreAST', () => {
  describe('literal nodes', () => {
    it('converts string literal', () => {
      expect(fromCoreAST(coreNode('literal', { value: 'hello' }))).toEqual({
        type: 'literal',
        value: 'hello',
      });
    });

    it('converts number literal', () => {
      expect(fromCoreAST(coreNode('literal', { value: 42 }))).toEqual({
        type: 'literal',
        value: 42,
      });
    });

    it('converts boolean literal', () => {
      expect(fromCoreAST(coreNode('literal', { value: true }))).toEqual({
        type: 'literal',
        value: true,
      });
    });

    it('converts null literal', () => {
      expect(fromCoreAST(coreNode('literal', { value: null }))).toEqual({
        type: 'literal',
        value: null,
      });
    });
  });

  describe('identifier nodes', () => {
    it('converts identifier with name', () => {
      expect(fromCoreAST(coreNode('identifier', { name: 'foo' }))).toEqual({
        type: 'identifier',
        value: 'foo',
        name: 'foo',
      });
    });

    it('falls back to value when name is missing', () => {
      expect(fromCoreAST(coreNode('identifier', { value: 'bar' }))).toEqual({
        type: 'identifier',
        value: 'bar',
        name: '',
      });
    });

    it('converts contextReference to identifier', () => {
      expect(fromCoreAST(coreNode('contextReference', { name: 'me' }))).toEqual({
        type: 'identifier',
        value: 'me',
      });
    });

    it('contextReference falls back to contextType', () => {
      expect(fromCoreAST(coreNode('contextReference', { contextType: 'it' }))).toEqual({
        type: 'identifier',
        value: 'it',
      });
    });
  });

  describe('selector nodes', () => {
    it('converts selector with value', () => {
      expect(fromCoreAST(coreNode('selector', { value: '.active' }))).toEqual({
        type: 'selector',
        value: '.active',
      });
    });

    it('falls back to selector prop', () => {
      expect(fromCoreAST(coreNode('selector', { selector: '#main' }))).toEqual({
        type: 'selector',
        value: '#main',
      });
    });

    it('converts htmlSelector', () => {
      expect(fromCoreAST(coreNode('htmlSelector', { value: '<button/>' }))).toEqual({
        type: 'selector',
        value: '<button/>',
      });
    });

    it('htmlSelector falls back to selector prop', () => {
      expect(fromCoreAST(coreNode('htmlSelector', { selector: '<div/>' }))).toEqual({
        type: 'selector',
        value: '<div/>',
      });
    });
  });

  describe('variable nodes', () => {
    it('converts local variable', () => {
      expect(fromCoreAST(coreNode('variable', { name: 'x', scope: 'local' }))).toEqual({
        type: 'variable',
        name: 'x',
        scope: 'local',
      });
    });

    it('converts global variable', () => {
      expect(fromCoreAST(coreNode('variable', { name: '$count', scope: 'global' }))).toEqual({
        type: 'variable',
        name: '$count',
        scope: 'global',
      });
    });

    it('converts element variable', () => {
      expect(fromCoreAST(coreNode('variable', { name: ':state', scope: 'element' }))).toEqual({
        type: 'variable',
        name: ':state',
        scope: 'element',
      });
    });

    it('defaults scope to local', () => {
      expect(fromCoreAST(coreNode('variable', { name: 'y' }))).toEqual({
        type: 'variable',
        name: 'y',
        scope: 'local',
      });
    });
  });

  describe('binary expression nodes', () => {
    it('converts simple binary', () => {
      const result = fromCoreAST(
        coreNode('binaryExpression', {
          operator: '+',
          left: coreNode('literal', { value: 1 }),
          right: coreNode('literal', { value: 2 }),
        })
      );
      expect(result).toEqual({
        type: 'binary',
        operator: '+',
        left: { type: 'literal', value: 1 },
        right: { type: 'literal', value: 2 },
      });
    });

    it('converts nested binary (tree)', () => {
      const result = fromCoreAST(
        coreNode('binaryExpression', {
          operator: 'and',
          left: coreNode('binaryExpression', {
            operator: '>',
            left: coreNode('identifier', { name: 'a' }),
            right: coreNode('literal', { value: 0 }),
          }),
          right: coreNode('binaryExpression', {
            operator: '<',
            left: coreNode('identifier', { name: 'b' }),
            right: coreNode('literal', { value: 10 }),
          }),
        })
      );
      expect(result.type).toBe('binary');
      expect((result as any).operator).toBe('and');
      expect((result as any).left.type).toBe('binary');
      expect((result as any).right.type).toBe('binary');
    });
  });

  describe('unary expression nodes', () => {
    it('converts unary with argument', () => {
      const result = fromCoreAST(
        coreNode('unaryExpression', {
          operator: 'not',
          argument: coreNode('literal', { value: true }),
        })
      );
      expect(result).toEqual({
        type: 'unary',
        operator: 'not',
        operand: { type: 'literal', value: true },
      });
    });

    it('converts unary with operand (alternative field name)', () => {
      const result = fromCoreAST(
        coreNode('unaryExpression', {
          operator: '-',
          operand: coreNode('literal', { value: 5 }),
        })
      );
      expect(result).toEqual({
        type: 'unary',
        operator: '-',
        operand: { type: 'literal', value: 5 },
      });
    });
  });

  describe('member expression nodes', () => {
    it('converts non-computed member', () => {
      const result = fromCoreAST(
        coreNode('memberExpression', {
          object: coreNode('identifier', { name: 'obj' }),
          property: coreNode('identifier', { name: 'prop' }),
          computed: false,
        })
      );
      expect(result).toEqual({
        type: 'member',
        object: { type: 'identifier', value: 'obj', name: 'obj' },
        property: { type: 'identifier', value: 'prop', name: 'prop' },
        computed: false,
      });
    });

    it('converts computed member', () => {
      const result = fromCoreAST(
        coreNode('memberExpression', {
          object: coreNode('identifier', { name: 'arr' }),
          property: coreNode('literal', { value: 0 }),
          computed: true,
        })
      );
      expect(result).toEqual({
        type: 'member',
        object: { type: 'identifier', value: 'arr', name: 'arr' },
        property: { type: 'literal', value: 0 },
        computed: true,
      });
    });

    it('converts member with string property', () => {
      const result = fromCoreAST(
        coreNode('memberExpression', {
          object: coreNode('identifier', { name: 'obj' }),
          property: 'textContent',
        })
      );
      expect(result).toEqual({
        type: 'member',
        object: { type: 'identifier', value: 'obj', name: 'obj' },
        property: 'textContent',
        computed: false,
      });
    });

    it('defaults object to me when missing', () => {
      const result = fromCoreAST(
        coreNode('memberExpression', {
          property: 'value',
        })
      );
      expect((result as any).object).toEqual({ type: 'identifier', value: 'me' });
    });
  });

  describe('possessive expression nodes', () => {
    it('converts possessiveExpression', () => {
      const result = fromCoreAST(
        coreNode('possessiveExpression', {
          object: coreNode('identifier', { name: 'element' }),
          property: 'textContent',
        })
      );
      expect(result).toEqual({
        type: 'possessive',
        object: { type: 'identifier', value: 'element', name: 'element' },
        property: 'textContent',
      });
    });

    it('converts propertyAccess', () => {
      const result = fromCoreAST(
        coreNode('propertyAccess', {
          object: coreNode('selector', { value: '#btn' }),
          property: 'disabled',
        })
      );
      expect(result).toEqual({
        type: 'possessive',
        object: { type: 'selector', value: '#btn' },
        property: 'disabled',
      });
    });

    it('handles property as node with name', () => {
      const result = fromCoreAST(
        coreNode('possessiveExpression', {
          object: coreNode('identifier', { name: 'me' }),
          property: coreNode('identifier', { name: 'value' }),
        })
      );
      expect((result as any).property).toBe('value');
    });

    it('defaults object to me when missing', () => {
      const result = fromCoreAST(
        coreNode('possessiveExpression', {
          property: 'innerHTML',
        })
      );
      expect((result as any).object).toEqual({ type: 'identifier', value: 'me' });
    });
  });

  describe('call expression nodes', () => {
    it('converts call with node callee', () => {
      const result = fromCoreAST(
        coreNode('callExpression', {
          callee: coreNode('identifier', { name: 'alert' }),
          arguments: [coreNode('literal', { value: 'hi' })],
        })
      );
      expect(result).toEqual({
        type: 'call',
        callee: { type: 'identifier', value: 'alert', name: 'alert' },
        args: [{ type: 'literal', value: 'hi' }],
      });
    });

    it('converts call with string callee', () => {
      const result = fromCoreAST(
        coreNode('callExpression', {
          callee: 'doSomething',
          arguments: [],
        })
      );
      expect(result).toEqual({
        type: 'call',
        callee: { type: 'identifier', value: 'doSomething', name: 'doSomething' },
        args: [],
      });
    });

    it('uses args field as fallback', () => {
      const result = fromCoreAST(
        coreNode('callExpression', {
          callee: 'fn',
          args: [coreNode('literal', { value: 1 })],
        })
      );
      expect((result as any).args).toEqual([{ type: 'literal', value: 1 }]);
    });
  });

  describe('event handler nodes', () => {
    it('converts basic event handler', () => {
      const result = fromCoreAST(
        coreNode('eventHandler', {
          event: 'click',
          commands: [
            coreNode('command', {
              name: 'toggle',
              args: [coreNode('selector', { value: '.active' })],
            }),
          ],
        })
      );
      expect(result.type).toBe('event');
      expect((result as any).event).toBe('click');
      expect((result as any).body).toHaveLength(1);
      expect((result as any).body[0].type).toBe('command');
    });

    it('defaults event to click', () => {
      const result = fromCoreAST(coreNode('eventHandler', { commands: [] }));
      expect((result as any).event).toBe('click');
    });

    it('uses body field as fallback for commands', () => {
      const result = fromCoreAST(
        coreNode('eventHandler', {
          event: 'load',
          body: [coreNode('command', { name: 'log', args: [] })],
        })
      );
      expect((result as any).body).toHaveLength(1);
    });

    it('normalizes event modifiers from flat props', () => {
      const result = fromCoreAST(
        coreNode('eventHandler', {
          event: 'click',
          commands: [],
          once: true,
          prevent: true,
          debounce: 300,
        })
      );
      expect((result as any).modifiers).toEqual({
        once: true,
        prevent: true,
        debounce: 300,
      });
    });

    it('normalizes selector to from modifier', () => {
      const result = fromCoreAST(
        coreNode('eventHandler', {
          event: 'click',
          commands: [],
          selector: '.btn',
        })
      );
      expect((result as any).modifiers.from).toBe('.btn');
    });

    it('prefers from over selector', () => {
      const result = fromCoreAST(
        coreNode('eventHandler', {
          event: 'click',
          commands: [],
          from: '.container',
          selector: '.btn',
        })
      );
      expect((result as any).modifiers.from).toBe('.container');
    });

    it('includes all modifier types', () => {
      const result = fromCoreAST(
        coreNode('eventHandler', {
          event: 'scroll',
          commands: [],
          once: true,
          prevent: true,
          stop: true,
          capture: true,
          passive: true,
          debounce: 100,
          throttle: 200,
          from: 'window',
        })
      );
      expect((result as any).modifiers).toEqual({
        once: true,
        prevent: true,
        stop: true,
        capture: true,
        passive: true,
        debounce: 100,
        throttle: 200,
        from: 'window',
      });
    });
  });

  describe('command nodes', () => {
    it('converts basic command', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'add',
          args: [coreNode('selector', { value: '.highlight' })],
        })
      );
      expect(result).toEqual({
        type: 'command',
        name: 'add',
        args: [{ type: 'selector', value: '.highlight' }],
      });
    });

    it('includes target when present', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'put',
          args: [coreNode('literal', { value: 'hello' })],
          target: coreNode('selector', { value: '#output' }),
        })
      );
      expect((result as any).target).toEqual({ type: 'selector', value: '#output' });
    });

    it('includes modifiers when present', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'append',
          args: [coreNode('literal', { value: '<li>item</li>' })],
          modifiers: {
            to: coreNode('selector', { value: '#list' }),
          },
        })
      );
      expect((result as any).modifiers).toEqual({
        to: { type: 'selector', value: '#list' },
      });
    });

    it('omits empty modifiers', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'log',
          args: [],
          modifiers: {},
        })
      );
      expect((result as any).modifiers).toBeUndefined();
    });
  });

  describe('if command nodes', () => {
    it('converts if with condition and branches from args', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'if',
          args: [
            coreNode('literal', { value: true }),
            coreNode('block', { commands: [coreNode('command', { name: 'log', args: [] })] }),
            coreNode('block', { commands: [coreNode('command', { name: 'warn', args: [] })] }),
          ],
        })
      );
      expect(result.type).toBe('if');
      expect((result as any).condition).toEqual({ type: 'literal', value: true });
      expect((result as any).thenBranch).toHaveLength(1);
      expect((result as any).elseBranch).toHaveLength(1);
    });

    it('converts if with dedicated condition/thenBranch/elseBranch fields', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'if',
          args: [],
          condition: coreNode('identifier', { name: 'isReady' }),
          thenBranch: [coreNode('command', { name: 'go', args: [] })],
          elseBranch: [coreNode('command', { name: 'wait', args: [] })],
        })
      );
      expect(result.type).toBe('if');
      expect((result as any).condition).toEqual({
        type: 'identifier',
        value: 'isReady',
        name: 'isReady',
      });
      expect((result as any).thenBranch).toHaveLength(1);
      expect((result as any).elseBranch).toHaveLength(1);
    });

    it('converts unless to negated condition', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'unless',
          args: [coreNode('literal', { value: false })],
        })
      );
      expect(result.type).toBe('if');
      expect((result as any).condition.type).toBe('unary');
      expect((result as any).condition.operator).toBe('not');
    });

    it('handles if with no else branch', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'if',
          args: [coreNode('literal', { value: true })],
        })
      );
      expect((result as any).elseBranch).toBeUndefined();
    });
  });

  describe('repeat command nodes', () => {
    it('converts empty repeat to repeat with empty body', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'repeat',
          args: [],
        })
      );
      expect(result).toEqual({ type: 'repeat', body: [] });
    });

    it('converts repeat N times', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'repeat',
          args: [
            coreNode('identifier', { name: 'times' }),
            coreNode('literal', { value: 3 }),
            coreNode('block', { commands: [coreNode('command', { name: 'log', args: [] })] }),
          ],
        })
      );
      expect(result.type).toBe('repeat');
      expect((result as any).count).toEqual({ type: 'literal', value: 3 });
      expect((result as any).body).toHaveLength(1);
    });

    it('converts repeat for each', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'repeat',
          args: [
            coreNode('identifier', { name: 'for' }),
            coreNode('literal', { value: 'item' }),
            coreNode('identifier', { name: 'items' }),
            coreNode('block', { commands: [] }),
          ],
        })
      );
      expect(result.type).toBe('foreach');
      expect((result as any).itemName).toBe('item');
      expect((result as any).collection).toEqual({
        type: 'identifier',
        value: 'items',
        name: 'items',
      });
    });

    it('converts repeat while', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'repeat',
          args: [
            coreNode('identifier', { name: 'while' }),
            coreNode('identifier', { name: 'running' }),
            coreNode('block', { commands: [] }),
          ],
        })
      );
      expect(result.type).toBe('while');
      expect((result as any).condition).toEqual({
        type: 'identifier',
        value: 'running',
        name: 'running',
      });
    });

    it('converts repeat with unknown variant to generic repeat', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'repeat',
          args: [coreNode('identifier', { name: 'forever' }), coreNode('block', { commands: [] })],
        })
      );
      expect(result.type).toBe('repeat');
    });
  });

  // =============================================================================
  // B. EDGE CASES
  // =============================================================================

  describe('edge cases', () => {
    it('handles null input', () => {
      expect(fromCoreAST(null as any)).toEqual({ type: 'literal', value: null });
    });

    it('handles undefined input', () => {
      expect(fromCoreAST(undefined as any)).toEqual({ type: 'literal', value: null });
    });

    it('handles unknown node type (falls to default)', () => {
      expect(fromCoreAST(coreNode('someUnknownType', { value: 'data' }))).toEqual({
        type: 'literal',
        value: 'data',
      });
    });

    it('handles unknown node type with no value', () => {
      expect(fromCoreAST(coreNode('randomType'))).toEqual({
        type: 'literal',
        value: null,
      });
    });

    it('converts string type to literal', () => {
      expect(fromCoreAST(coreNode('string', { value: 'hello world' }))).toEqual({
        type: 'literal',
        value: 'hello world',
      });
    });

    it('converts timeExpression to literal number', () => {
      expect(fromCoreAST(coreNode('timeExpression', { value: 500 }))).toEqual({
        type: 'literal',
        value: 500,
      });
    });

    it('converts templateLiteral to literal with raw', () => {
      expect(fromCoreAST(coreNode('templateLiteral', { raw: 'Hello ${name}' }))).toEqual({
        type: 'literal',
        value: 'Hello ${name}',
      });
    });

    it('templateLiteral defaults to empty string', () => {
      expect(fromCoreAST(coreNode('templateLiteral', {}))).toEqual({
        type: 'literal',
        value: '',
      });
    });

    it('CommandSequence with 1 command unwraps', () => {
      const result = fromCoreAST(
        coreNode('CommandSequence', {
          commands: [coreNode('command', { name: 'log', args: [] })],
        })
      );
      expect(result.type).toBe('command');
      expect((result as any).name).toBe('log');
    });

    it('CommandSequence with N commands wraps in event', () => {
      const result = fromCoreAST(
        coreNode('CommandSequence', {
          commands: [
            coreNode('command', { name: 'add', args: [] }),
            coreNode('command', { name: 'remove', args: [] }),
          ],
        })
      );
      expect(result.type).toBe('event');
      expect((result as any).event).toBe('click');
      expect((result as any).body).toHaveLength(2);
    });

    it('block with 1 command unwraps', () => {
      const result = fromCoreAST(
        coreNode('block', {
          commands: [coreNode('literal', { value: 42 })],
        })
      );
      expect(result.type).toBe('literal');
    });

    it('block with N commands wraps in event', () => {
      const result = fromCoreAST(
        coreNode('block', {
          commands: [
            coreNode('command', { name: 'a', args: [] }),
            coreNode('command', { name: 'b', args: [] }),
          ],
        })
      );
      expect(result.type).toBe('event');
      expect((result as any).body).toHaveLength(2);
    });

    it('positional type is not handled — falls to default', () => {
      const result = fromCoreAST(
        coreNode('positional', {
          position: 'first',
          target: coreNode('selector', { value: '.item' }),
        })
      );
      // Falls to default: literal with null (no value field)
      expect(result.type).toBe('literal');
    });
  });

  // =============================================================================
  // C. DEEPLY NESTED STRUCTURES
  // =============================================================================

  describe('deeply nested structures', () => {
    it('handles binary tree 3 levels deep', () => {
      const result = fromCoreAST(
        coreNode('binaryExpression', {
          operator: '+',
          left: coreNode('binaryExpression', {
            operator: '*',
            left: coreNode('literal', { value: 2 }),
            right: coreNode('literal', { value: 3 }),
          }),
          right: coreNode('binaryExpression', {
            operator: '/',
            left: coreNode('literal', { value: 10 }),
            right: coreNode('literal', { value: 5 }),
          }),
        })
      );
      expect(result.type).toBe('binary');
      const r = result as any;
      expect(r.left.type).toBe('binary');
      expect(r.left.left.value).toBe(2);
      expect(r.right.type).toBe('binary');
      expect(r.right.right.value).toBe(5);
    });

    it('handles event with if containing nested commands', () => {
      const result = fromCoreAST(
        coreNode('eventHandler', {
          event: 'click',
          commands: [
            coreNode('command', {
              name: 'if',
              args: [
                coreNode('identifier', { name: 'visible' }),
                coreNode('block', {
                  commands: [
                    coreNode('command', {
                      name: 'add',
                      args: [coreNode('selector', { value: '.show' })],
                    }),
                    coreNode('command', {
                      name: 'remove',
                      args: [coreNode('selector', { value: '.hide' })],
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
      expect(result.type).toBe('event');
      const ifCmd = (result as any).body[0];
      expect(ifCmd.type).toBe('if');
      expect(ifCmd.thenBranch).toHaveLength(2);
      expect(ifCmd.thenBranch[0].name).toBe('add');
    });

    it('handles call with member expression callee and binary args', () => {
      const result = fromCoreAST(
        coreNode('callExpression', {
          callee: coreNode('memberExpression', {
            object: coreNode('identifier', { name: 'Math' }),
            property: coreNode('identifier', { name: 'max' }),
            computed: false,
          }),
          arguments: [
            coreNode('binaryExpression', {
              operator: '+',
              left: coreNode('literal', { value: 1 }),
              right: coreNode('literal', { value: 2 }),
            }),
          ],
        })
      );
      expect(result.type).toBe('call');
      const r = result as any;
      expect(r.callee.type).toBe('member');
      expect(r.args[0].type).toBe('binary');
    });
  });

  // =============================================================================
  // D. POSITION PRESERVATION
  // =============================================================================

  describe('position preservation', () => {
    it('preserves position fields on literal nodes', () => {
      const result = fromCoreAST(
        coreNode('literal', { value: 42, start: 10, end: 12, line: 3, column: 5 })
      );
      expect(result).toEqual({
        type: 'literal',
        value: 42,
        start: 10,
        end: 12,
        line: 3,
        column: 5,
      });
    });

    it('preserves position fields on identifier nodes', () => {
      const result = fromCoreAST(
        coreNode('identifier', { name: 'foo', start: 0, end: 3, line: 1, column: 0 })
      );
      expect(result.start).toBe(0);
      expect(result.end).toBe(3);
      expect(result.line).toBe(1);
      expect(result.column).toBe(0);
    });

    it('preserves position fields on selector nodes', () => {
      const result = fromCoreAST(
        coreNode('selector', { value: '.btn', start: 5, end: 9, line: 1, column: 5 })
      );
      expect(result).toEqual({
        type: 'selector',
        value: '.btn',
        start: 5,
        end: 9,
        line: 1,
        column: 5,
      });
    });

    it('preserves position fields on event handler nodes', () => {
      const result = fromCoreAST(
        coreNode('eventHandler', {
          event: 'click',
          commands: [],
          start: 0,
          end: 30,
          line: 1,
          column: 0,
        })
      );
      expect(result.start).toBe(0);
      expect(result.end).toBe(30);
      expect(result.line).toBe(1);
    });

    it('preserves position fields on command nodes', () => {
      const result = fromCoreAST(
        coreNode('command', { name: 'toggle', args: [], start: 9, end: 24, line: 2, column: 2 })
      );
      expect(result.start).toBe(9);
      expect(result.end).toBe(24);
    });

    it('preserves position fields on binary expression nodes', () => {
      const result = fromCoreAST(
        coreNode('binaryExpression', {
          operator: '+',
          left: coreNode('literal', { value: 1 }),
          right: coreNode('literal', { value: 2 }),
          start: 0,
          end: 5,
          line: 1,
          column: 0,
        })
      );
      expect(result.start).toBe(0);
      expect(result.end).toBe(5);
    });

    it('preserves position fields on nested children', () => {
      const result = fromCoreAST(
        coreNode('binaryExpression', {
          operator: '+',
          left: coreNode('literal', { value: 1, start: 0, end: 1, line: 1, column: 0 }),
          right: coreNode('literal', { value: 2, start: 4, end: 5, line: 1, column: 4 }),
          start: 0,
          end: 5,
          line: 1,
          column: 0,
        })
      );
      const r = result as any;
      expect(r.left.start).toBe(0);
      expect(r.left.end).toBe(1);
      expect(r.right.start).toBe(4);
      expect(r.right.end).toBe(5);
    });

    it('omits position fields when source node lacks them', () => {
      const result = fromCoreAST(coreNode('literal', { value: 42 }));
      expect(result.start).toBeUndefined();
      expect(result.end).toBeUndefined();
      expect(result.line).toBeUndefined();
      expect(result.column).toBeUndefined();
    });

    it('preserves partial position fields (only start/end, no line/column)', () => {
      const result = fromCoreAST(coreNode('literal', { value: 42, start: 10, end: 12 }));
      expect(result.start).toBe(10);
      expect(result.end).toBe(12);
      expect(result.line).toBeUndefined();
      expect(result.column).toBeUndefined();
    });

    it('preserves positions on if command nodes', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'if',
          args: [coreNode('literal', { value: true })],
          start: 0,
          end: 20,
          line: 1,
          column: 0,
        })
      );
      expect(result.type).toBe('if');
      expect(result.start).toBe(0);
      expect(result.end).toBe(20);
    });

    it('preserves positions on repeat command nodes', () => {
      const result = fromCoreAST(
        coreNode('command', {
          name: 'repeat',
          args: [],
          start: 5,
          end: 25,
          line: 2,
          column: 4,
        })
      );
      expect(result.type).toBe('repeat');
      expect(result.start).toBe(5);
      expect(result.end).toBe(25);
    });
  });
});
