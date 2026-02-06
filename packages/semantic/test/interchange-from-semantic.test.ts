/**
 * Unit tests for fromSemanticAST — Semantic AST → Interchange Format Converter
 */
import { describe, it, expect } from 'vitest';
import { fromSemanticAST } from '../src/interchange/from-semantic';

// Helper: create a minimal semantic AST node
function semNode(
  type: string,
  props: Record<string, unknown> = {}
): { type: string; [k: string]: unknown } {
  return { type, ...props };
}

// =============================================================================
// A. NODE TYPE COVERAGE
// =============================================================================

describe('fromSemanticAST', () => {
  describe('literal nodes', () => {
    it('converts string literal', () => {
      expect(fromSemanticAST(semNode('literal', { value: 'hello' }))).toEqual({
        type: 'literal',
        value: 'hello',
      });
    });

    it('converts number literal', () => {
      expect(fromSemanticAST(semNode('literal', { value: 42 }))).toEqual({
        type: 'literal',
        value: 42,
      });
    });

    it('converts boolean literal', () => {
      expect(fromSemanticAST(semNode('literal', { value: false }))).toEqual({
        type: 'literal',
        value: false,
      });
    });

    it('converts null literal', () => {
      expect(fromSemanticAST(semNode('literal', { value: null }))).toEqual({
        type: 'literal',
        value: null,
      });
    });
  });

  describe('identifier nodes', () => {
    it('converts identifier with name', () => {
      expect(fromSemanticAST(semNode('identifier', { name: 'foo' }))).toEqual({
        type: 'identifier',
        value: 'foo',
        name: 'foo',
      });
    });

    it('falls back to value when name is missing', () => {
      expect(fromSemanticAST(semNode('identifier', { value: 'bar' }))).toEqual({
        type: 'identifier',
        value: 'bar',
        name: '',
      });
    });

    it('converts contextReference to identifier', () => {
      expect(fromSemanticAST(semNode('contextReference', { name: 'me' }))).toEqual({
        type: 'identifier',
        value: 'me',
      });
    });

    it('contextReference falls back to contextType', () => {
      expect(fromSemanticAST(semNode('contextReference', { contextType: 'it' }))).toEqual({
        type: 'identifier',
        value: 'it',
      });
    });
  });

  describe('selector nodes', () => {
    it('converts selector with value', () => {
      expect(fromSemanticAST(semNode('selector', { value: '.active' }))).toEqual({
        type: 'selector',
        value: '.active',
      });
    });

    it('falls back to selector prop', () => {
      expect(fromSemanticAST(semNode('selector', { selector: '#main' }))).toEqual({
        type: 'selector',
        value: '#main',
      });
    });

    it('converts htmlSelector', () => {
      expect(fromSemanticAST(semNode('htmlSelector', { value: '<div/>' }))).toEqual({
        type: 'selector',
        value: '<div/>',
      });
    });
  });

  describe('variable nodes', () => {
    it('converts local variable', () => {
      expect(fromSemanticAST(semNode('variable', { name: 'x', scope: 'local' }))).toEqual({
        type: 'variable',
        name: 'x',
        scope: 'local',
      });
    });

    it('converts global variable', () => {
      expect(fromSemanticAST(semNode('variable', { name: '$count', scope: 'global' }))).toEqual({
        type: 'variable',
        name: '$count',
        scope: 'global',
      });
    });

    it('defaults scope to local', () => {
      expect(fromSemanticAST(semNode('variable', { name: 'y' }))).toEqual({
        type: 'variable',
        name: 'y',
        scope: 'local',
      });
    });
  });

  describe('binary expression nodes', () => {
    it('converts simple binary', () => {
      const result = fromSemanticAST(
        semNode('binaryExpression', {
          operator: '==',
          left: semNode('identifier', { name: 'x' }),
          right: semNode('literal', { value: 5 }),
        })
      );
      expect(result).toEqual({
        type: 'binary',
        operator: '==',
        left: { type: 'identifier', value: 'x', name: 'x' },
        right: { type: 'literal', value: 5 },
      });
    });
  });

  describe('unary expression nodes', () => {
    it('converts unary expression', () => {
      const result = fromSemanticAST(
        semNode('unaryExpression', {
          operator: 'not',
          operand: semNode('literal', { value: true }),
        })
      );
      expect(result).toEqual({
        type: 'unary',
        operator: 'not',
        operand: { type: 'literal', value: true },
      });
    });
  });

  describe('member expression nodes', () => {
    it('converts non-computed member', () => {
      const result = fromSemanticAST(
        semNode('memberExpression', {
          object: semNode('identifier', { name: 'obj' }),
          property: semNode('identifier', { name: 'prop' }),
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

    it('converts member with string property', () => {
      const result = fromSemanticAST(
        semNode('memberExpression', {
          object: semNode('identifier', { name: 'el' }),
          property: 'value',
        })
      );
      expect(result).toEqual({
        type: 'member',
        object: { type: 'identifier', value: 'el', name: 'el' },
        property: 'value',
        computed: false,
      });
    });

    it('defaults object to me when missing', () => {
      const result = fromSemanticAST(
        semNode('memberExpression', {
          property: 'value',
        })
      );
      expect((result as any).object).toEqual({ type: 'identifier', value: 'me' });
    });
  });

  describe('possessive expression nodes', () => {
    it('converts possessiveExpression with string property', () => {
      const result = fromSemanticAST(
        semNode('possessiveExpression', {
          object: semNode('identifier', { name: 'me' }),
          property: 'textContent',
        })
      );
      expect(result).toEqual({
        type: 'possessive',
        object: { type: 'identifier', value: 'me', name: 'me' },
        property: 'textContent',
      });
    });

    it('converts possessiveExpression with node property', () => {
      const result = fromSemanticAST(
        semNode('possessiveExpression', {
          object: semNode('identifier', { name: 'me' }),
          property: semNode('identifier', { name: 'innerHTML' }),
        })
      );
      expect((result as any).property).toBe('innerHTML');
    });

    it('converts propertyAccess to possessive', () => {
      const result = fromSemanticAST(
        semNode('propertyAccess', {
          object: semNode('selector', { value: '#btn' }),
          property: 'disabled',
        })
      );
      expect(result).toEqual({
        type: 'possessive',
        object: { type: 'selector', value: '#btn' },
        property: 'disabled',
      });
    });

    it('defaults object to me when missing', () => {
      const result = fromSemanticAST(
        semNode('possessiveExpression', {
          property: 'innerHTML',
        })
      );
      expect((result as any).object).toEqual({ type: 'identifier', value: 'me' });
    });
  });

  describe('call expression nodes', () => {
    it('converts call with node callee', () => {
      const result = fromSemanticAST(
        semNode('callExpression', {
          callee: semNode('identifier', { name: 'alert' }),
          arguments: [semNode('literal', { value: 'msg' })],
        })
      );
      expect(result).toEqual({
        type: 'call',
        callee: { type: 'identifier', value: 'alert', name: 'alert' },
        args: [{ type: 'literal', value: 'msg' }],
      });
    });

    it('converts call with string callee', () => {
      const result = fromSemanticAST(
        semNode('callExpression', {
          callee: 'doStuff',
          arguments: [],
        })
      );
      expect((result as any).callee).toEqual({
        type: 'identifier',
        value: 'doStuff',
        name: 'doStuff',
      });
    });

    it('uses args field as fallback', () => {
      const result = fromSemanticAST(
        semNode('callExpression', {
          callee: 'fn',
          args: [semNode('literal', { value: 1 })],
        })
      );
      expect((result as any).args).toEqual([{ type: 'literal', value: 1 }]);
    });
  });

  describe('event handler nodes', () => {
    it('converts basic event handler', () => {
      const result = fromSemanticAST(
        semNode('eventHandler', {
          event: 'click',
          commands: [
            semNode('command', {
              name: 'toggle',
              args: [semNode('selector', { value: '.active' })],
            }),
          ],
        })
      );
      expect(result.type).toBe('event');
      expect((result as any).event).toBe('click');
      expect((result as any).body).toHaveLength(1);
    });

    it('defaults event to click', () => {
      const result = fromSemanticAST(semNode('eventHandler', { commands: [] }));
      expect((result as any).event).toBe('click');
    });
  });

  describe('command nodes', () => {
    it('converts basic command', () => {
      const result = fromSemanticAST(
        semNode('command', {
          name: 'add',
          args: [semNode('selector', { value: '.cls' })],
        })
      );
      expect(result).toEqual({
        type: 'command',
        name: 'add',
        args: [{ type: 'selector', value: '.cls' }],
      });
    });

    it('includes target when present', () => {
      const result = fromSemanticAST(
        semNode('command', {
          name: 'put',
          args: [],
          target: semNode('selector', { value: '#out' }),
        })
      );
      expect((result as any).target).toEqual({ type: 'selector', value: '#out' });
    });

    it('includes modifiers when present', () => {
      const result = fromSemanticAST(
        semNode('command', {
          name: 'append',
          args: [],
          modifiers: { to: semNode('selector', { value: '#list' }) },
        })
      );
      expect((result as any).modifiers).toEqual({
        to: { type: 'selector', value: '#list' },
      });
    });

    it('omits empty modifiers', () => {
      const result = fromSemanticAST(
        semNode('command', {
          name: 'log',
          args: [],
          modifiers: {},
        })
      );
      expect((result as any).modifiers).toBeUndefined();
    });
  });

  describe('if nodes', () => {
    it('converts if command from args', () => {
      const result = fromSemanticAST(
        semNode('command', {
          name: 'if',
          args: [
            semNode('literal', { value: true }),
            semNode('block', { commands: [semNode('command', { name: 'log', args: [] })] }),
          ],
        })
      );
      expect(result.type).toBe('if');
      expect((result as any).condition).toEqual({ type: 'literal', value: true });
      expect((result as any).thenBranch).toHaveLength(1);
    });

    it('converts standalone if node with condition/thenBranch/elseBranch', () => {
      const result = fromSemanticAST(
        semNode('if', {
          condition: semNode('identifier', { name: 'ready' }),
          thenBranch: [semNode('command', { name: 'go', args: [] })],
          elseBranch: [semNode('command', { name: 'wait', args: [] })],
        })
      );
      expect(result.type).toBe('if');
      expect((result as any).thenBranch).toHaveLength(1);
      expect((result as any).elseBranch).toHaveLength(1);
    });

    it('converts unless to negated condition', () => {
      const result = fromSemanticAST(
        semNode('command', {
          name: 'unless',
          args: [semNode('literal', { value: false })],
        })
      );
      expect((result as any).condition.type).toBe('unary');
      expect((result as any).condition.operator).toBe('not');
    });

    it('omits elseBranch when absent', () => {
      const result = fromSemanticAST(
        semNode('if', {
          condition: semNode('literal', { value: true }),
          thenBranch: [],
        })
      );
      expect((result as any).elseBranch).toBeUndefined();
    });
  });

  describe('repeat command nodes', () => {
    it('converts empty repeat', () => {
      const result = fromSemanticAST(
        semNode('command', {
          name: 'repeat',
          args: [],
        })
      );
      expect(result).toEqual({ type: 'repeat', body: [] });
    });

    it('converts repeat N times', () => {
      const result = fromSemanticAST(
        semNode('command', {
          name: 'repeat',
          args: [
            semNode('identifier', { name: 'times' }),
            semNode('literal', { value: 5 }),
            semNode('block', { commands: [semNode('command', { name: 'log', args: [] })] }),
          ],
        })
      );
      expect(result.type).toBe('repeat');
      expect((result as any).count).toEqual({ type: 'literal', value: 5 });
      expect((result as any).body).toHaveLength(1);
    });

    it('converts repeat for each', () => {
      const result = fromSemanticAST(
        semNode('command', {
          name: 'repeat',
          args: [
            semNode('identifier', { name: 'for' }),
            semNode('literal', { value: 'item' }),
            semNode('identifier', { name: 'items' }),
            semNode('block', { commands: [] }),
          ],
        })
      );
      expect(result.type).toBe('foreach');
      expect((result as any).itemName).toBe('item');
    });

    it('converts repeat while', () => {
      const result = fromSemanticAST(
        semNode('command', {
          name: 'repeat',
          args: [
            semNode('identifier', { name: 'while' }),
            semNode('identifier', { name: 'running' }),
            semNode('block', { commands: [] }),
          ],
        })
      );
      expect(result.type).toBe('while');
    });

    it('converts repeat until (negated while)', () => {
      const result = fromSemanticAST(
        semNode('command', {
          name: 'repeat',
          args: [
            semNode('identifier', { name: 'until' }),
            semNode('identifier', { name: 'done' }),
            semNode('block', { commands: [] }),
          ],
        })
      );
      expect(result.type).toBe('while');
      expect((result as any).condition.type).toBe('unary');
      expect((result as any).condition.operator).toBe('not');
    });
  });

  // =============================================================================
  // B. EDGE CASES
  // =============================================================================

  describe('edge cases', () => {
    it('handles null input', () => {
      expect(fromSemanticAST(null as any)).toEqual({ type: 'literal', value: null });
    });

    it('handles undefined input', () => {
      expect(fromSemanticAST(undefined as any)).toEqual({ type: 'literal', value: null });
    });

    it('handles unknown node type', () => {
      expect(fromSemanticAST(semNode('weirdType', { value: 'x' }))).toEqual({
        type: 'literal',
        value: 'x',
      });
    });

    it('handles unknown node type with no value', () => {
      expect(fromSemanticAST(semNode('randomType'))).toEqual({
        type: 'literal',
        value: null,
      });
    });

    it('converts string type to literal', () => {
      expect(fromSemanticAST(semNode('string', { value: 'text' }))).toEqual({
        type: 'literal',
        value: 'text',
      });
    });

    it('converts timeExpression to literal', () => {
      expect(fromSemanticAST(semNode('timeExpression', { value: 1000 }))).toEqual({
        type: 'literal',
        value: 1000,
      });
    });

    it('converts templateLiteral to literal', () => {
      expect(fromSemanticAST(semNode('templateLiteral', { raw: 'val=${x}' }))).toEqual({
        type: 'literal',
        value: 'val=${x}',
      });
    });

    it('CommandSequence with 1 command unwraps', () => {
      const result = fromSemanticAST(
        semNode('CommandSequence', {
          commands: [semNode('command', { name: 'log', args: [] })],
        })
      );
      expect(result.type).toBe('command');
    });

    it('CommandSequence with N commands wraps in event', () => {
      const result = fromSemanticAST(
        semNode('CommandSequence', {
          commands: [
            semNode('command', { name: 'a', args: [] }),
            semNode('command', { name: 'b', args: [] }),
          ],
        })
      );
      expect(result.type).toBe('event');
      expect((result as any).body).toHaveLength(2);
    });

    it('block with 1 command unwraps', () => {
      const result = fromSemanticAST(
        semNode('block', {
          commands: [semNode('literal', { value: 1 })],
        })
      );
      expect(result.type).toBe('literal');
    });

    it('block with N commands wraps in event', () => {
      const result = fromSemanticAST(
        semNode('block', {
          commands: [
            semNode('command', { name: 'a', args: [] }),
            semNode('command', { name: 'b', args: [] }),
          ],
        })
      );
      expect(result.type).toBe('event');
      expect((result as any).body).toHaveLength(2);
    });
  });

  // =============================================================================
  // C. DEEPLY NESTED STRUCTURES
  // =============================================================================

  describe('deeply nested structures', () => {
    it('handles binary tree 3 levels deep', () => {
      const result = fromSemanticAST(
        semNode('binaryExpression', {
          operator: 'or',
          left: semNode('binaryExpression', {
            operator: 'and',
            left: semNode('literal', { value: true }),
            right: semNode('literal', { value: false }),
          }),
          right: semNode('binaryExpression', {
            operator: '==',
            left: semNode('identifier', { name: 'x' }),
            right: semNode('literal', { value: 0 }),
          }),
        })
      );
      expect(result.type).toBe('binary');
      expect((result as any).left.type).toBe('binary');
      expect((result as any).right.type).toBe('binary');
    });

    it('handles event with if containing nested commands', () => {
      const result = fromSemanticAST(
        semNode('eventHandler', {
          event: 'click',
          commands: [
            semNode('command', {
              name: 'if',
              args: [
                semNode('identifier', { name: 'active' }),
                semNode('block', {
                  commands: [
                    semNode('command', {
                      name: 'remove',
                      args: [semNode('selector', { value: '.active' })],
                    }),
                  ],
                }),
                semNode('block', {
                  commands: [
                    semNode('command', {
                      name: 'add',
                      args: [semNode('selector', { value: '.active' })],
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
      expect(result.type).toBe('event');
      const ifNode = (result as any).body[0];
      expect(ifNode.type).toBe('if');
      expect(ifNode.thenBranch).toHaveLength(1);
      expect(ifNode.elseBranch).toHaveLength(1);
    });

    it('handles call with member expression callee', () => {
      const result = fromSemanticAST(
        semNode('callExpression', {
          callee: semNode('memberExpression', {
            object: semNode('identifier', { name: 'str' }),
            property: semNode('identifier', { name: 'toUpperCase' }),
            computed: false,
          }),
          arguments: [],
        })
      );
      expect(result.type).toBe('call');
      expect((result as any).callee.type).toBe('member');
    });
  });

  // =============================================================================
  // D. EVENT MODIFIER NORMALIZATION (semantic-specific)
  // =============================================================================

  describe('event modifier normalization', () => {
    it('reads flat props', () => {
      const result = fromSemanticAST(
        semNode('eventHandler', {
          event: 'click',
          commands: [],
          once: true,
          prevent: true,
        })
      );
      expect((result as any).modifiers).toEqual({
        once: true,
        prevent: true,
      });
    });

    it('reads nested eventModifiers object', () => {
      const result = fromSemanticAST(
        semNode('eventHandler', {
          event: 'click',
          commands: [],
          eventModifiers: {
            once: true,
            debounce: 500,
            stop: true,
          },
        })
      );
      expect((result as any).modifiers).toEqual({
        once: true,
        debounce: 500,
        stop: true,
      });
    });

    it('merges flat + nested (flat takes priority via ??)', () => {
      const result = fromSemanticAST(
        semNode('eventHandler', {
          event: 'click',
          commands: [],
          debounce: 100,
          eventModifiers: {
            debounce: 999, // should NOT win because flat ?? nested means flat wins
          },
        })
      );
      expect((result as any).modifiers.debounce).toBe(100);
    });

    it('uses selector as from fallback', () => {
      const result = fromSemanticAST(
        semNode('eventHandler', {
          event: 'click',
          commands: [],
          selector: '.btn',
        })
      );
      expect((result as any).modifiers.from).toBe('.btn');
    });

    it('prefers from over selector', () => {
      const result = fromSemanticAST(
        semNode('eventHandler', {
          event: 'click',
          commands: [],
          from: '.container',
          selector: '.btn',
        })
      );
      expect((result as any).modifiers.from).toBe('.container');
    });

    it('includes all modifier types', () => {
      const result = fromSemanticAST(
        semNode('eventHandler', {
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

    it('returns empty modifiers when none set', () => {
      const result = fromSemanticAST(
        semNode('eventHandler', {
          event: 'click',
          commands: [],
        })
      );
      // All fields are conditional spreads, so empty modifiers = {}
      expect((result as any).modifiers).toEqual({});
    });
  });

  // ===========================================================================
  // F. POSITION PRESERVATION
  // ===========================================================================

  describe('position preservation', () => {
    const POS = { start: 10, end: 25, line: 3, column: 5 };

    it('preserves positions on literal', () => {
      const result = fromSemanticAST(semNode('literal', { value: 42, ...POS }));
      expect(result).toEqual({ type: 'literal', value: 42, ...POS });
    });

    it('preserves positions on string', () => {
      const result = fromSemanticAST(semNode('string', { value: 'hi', ...POS }));
      expect(result).toEqual({ type: 'literal', value: 'hi', ...POS });
    });

    it('preserves positions on identifier', () => {
      const result = fromSemanticAST(semNode('identifier', { name: 'x', ...POS }));
      expect(result).toEqual({ type: 'identifier', value: 'x', name: 'x', ...POS });
    });

    it('preserves positions on selector', () => {
      const result = fromSemanticAST(semNode('selector', { value: '.foo', ...POS }));
      expect(result).toEqual({ type: 'selector', value: '.foo', ...POS });
    });

    it('preserves positions on eventHandler', () => {
      const result = fromSemanticAST(
        semNode('eventHandler', { event: 'click', commands: [], ...POS })
      );
      expect(result.type).toBe('event');
      expect((result as any).start).toBe(10);
      expect((result as any).end).toBe(25);
      expect((result as any).line).toBe(3);
      expect((result as any).column).toBe(5);
    });

    it('preserves positions on command', () => {
      const result = fromSemanticAST(
        semNode('command', { name: 'add', args: [], ...POS })
      );
      expect(result.type).toBe('command');
      expect((result as any).start).toBe(10);
      expect((result as any).end).toBe(25);
    });

    it('preserves positions on binaryExpression', () => {
      const result = fromSemanticAST(
        semNode('binaryExpression', {
          operator: '+',
          left: semNode('literal', { value: 1 }),
          right: semNode('literal', { value: 2 }),
          ...POS,
        })
      );
      expect(result.type).toBe('binary');
      expect((result as any).start).toBe(10);
      expect((result as any).line).toBe(3);
    });

    it('preserves positions on unaryExpression', () => {
      const result = fromSemanticAST(
        semNode('unaryExpression', {
          operator: 'not',
          operand: semNode('literal', { value: true }),
          ...POS,
        })
      );
      expect(result.type).toBe('unary');
      expect((result as any).start).toBe(10);
      expect((result as any).end).toBe(25);
    });

    it('preserves positions on nested children independently', () => {
      const childPos = { start: 15, end: 20, line: 3, column: 10 };
      const result = fromSemanticAST(
        semNode('binaryExpression', {
          operator: '==',
          left: semNode('literal', { value: 1, ...childPos }),
          right: semNode('literal', { value: 2 }),
          ...POS,
        })
      );
      expect((result as any).start).toBe(10);
      expect((result as any).left.start).toBe(15);
      expect((result as any).left.end).toBe(20);
      // right has no positions
      expect((result as any).right.start).toBeUndefined();
    });

    it('omits position fields when absent', () => {
      const result = fromSemanticAST(semNode('literal', { value: 99 }));
      expect(result).toEqual({ type: 'literal', value: 99 });
      expect('start' in result).toBe(false);
      expect('line' in result).toBe(false);
    });

    it('handles partial positions', () => {
      const result = fromSemanticAST(
        semNode('literal', { value: 'x', start: 5, line: 2 })
      );
      expect((result as any).start).toBe(5);
      expect((result as any).line).toBe(2);
      expect('end' in result).toBe(false);
      expect('column' in result).toBe(false);
    });

    it('preserves positions on possessiveExpression', () => {
      const result = fromSemanticAST(
        semNode('possessiveExpression', {
          object: semNode('identifier', { name: 'me' }),
          property: 'color',
          ...POS,
        })
      );
      expect(result.type).toBe('possessive');
      expect((result as any).start).toBe(10);
      expect((result as any).end).toBe(25);
    });

    it('preserves positions on if command', () => {
      const result = fromSemanticAST(
        semNode('command', {
          name: 'if',
          args: [semNode('literal', { value: true }), semNode('block', { commands: [] })],
          ...POS,
        })
      );
      expect(result.type).toBe('if');
      expect((result as any).start).toBe(10);
      expect((result as any).line).toBe(3);
    });
  });
});
