/**
 * Unit tests for toCoreAST — Interchange Format → Core Parser AST Converter
 */
import { describe, it, expect } from 'vitest';
import { toCoreAST } from './to-core';
import { fromCoreAST } from './from-core';
import type { InterchangeNode } from './types';

// =============================================================================
// A. NODE TYPE COVERAGE
// =============================================================================

describe('toCoreAST', () => {
  describe('literal nodes', () => {
    it('converts string literal', () => {
      const result = toCoreAST({ type: 'literal', value: 'hello' });
      expect(result.type).toBe('literal');
      expect(result.value).toBe('hello');
      expect(result.raw).toBe('hello');
    });

    it('converts number literal', () => {
      const result = toCoreAST({ type: 'literal', value: 42 });
      expect(result.type).toBe('literal');
      expect(result.value).toBe(42);
      expect(result.raw).toBe('42');
    });

    it('converts boolean literal', () => {
      const result = toCoreAST({ type: 'literal', value: true });
      expect(result.type).toBe('literal');
      expect(result.value).toBe(true);
    });

    it('converts null literal', () => {
      const result = toCoreAST({ type: 'literal', value: null });
      expect(result.type).toBe('literal');
      expect(result.value).toBe(null);
      expect(result.raw).toBe('null');
    });
  });

  describe('identifier nodes', () => {
    it('converts identifier using name field', () => {
      const result = toCoreAST({ type: 'identifier', value: 'foo', name: 'foo' });
      expect(result.type).toBe('identifier');
      expect(result.name).toBe('foo');
    });

    it('falls back to value when name is missing', () => {
      const result = toCoreAST({ type: 'identifier', value: 'bar' });
      expect(result.name).toBe('bar');
    });
  });

  describe('selector nodes', () => {
    it('converts selector', () => {
      const result = toCoreAST({ type: 'selector', value: '.active' });
      expect(result.type).toBe('selector');
      expect(result.value).toBe('.active');
    });
  });

  describe('variable nodes', () => {
    it('converts to identifier with scope', () => {
      const result = toCoreAST({ type: 'variable', name: ':count', scope: 'element' });
      expect(result.type).toBe('identifier');
      expect(result.name).toBe(':count');
      expect(result.scope).toBe('element');
    });

    it('preserves local scope', () => {
      const result = toCoreAST({ type: 'variable', name: 'x', scope: 'local' });
      expect(result.scope).toBe('local');
    });

    it('preserves global scope', () => {
      const result = toCoreAST({ type: 'variable', name: '$total', scope: 'global' });
      expect(result.scope).toBe('global');
    });
  });

  describe('binary expression nodes', () => {
    it('converts to binaryExpression', () => {
      const result = toCoreAST({
        type: 'binary',
        operator: '+',
        left: { type: 'literal', value: 1 },
        right: { type: 'literal', value: 2 },
      });
      expect(result.type).toBe('binaryExpression');
      expect(result.operator).toBe('+');
      expect((result.left as any).type).toBe('literal');
      expect((result.right as any).type).toBe('literal');
    });
  });

  describe('unary expression nodes', () => {
    it('converts to unaryExpression with argument (not operand)', () => {
      const result = toCoreAST({
        type: 'unary',
        operator: 'not',
        operand: { type: 'literal', value: true },
      });
      expect(result.type).toBe('unaryExpression');
      expect(result.operator).toBe('not');
      expect(result.argument).toBeDefined();
      expect((result.argument as any).type).toBe('literal');
      expect(result.prefix).toBe(true);
    });
  });

  describe('member expression nodes', () => {
    it('converts with node property', () => {
      const result = toCoreAST({
        type: 'member',
        object: { type: 'identifier', value: 'obj' },
        property: { type: 'identifier', value: 'prop', name: 'prop' },
        computed: false,
      });
      expect(result.type).toBe('memberExpression');
      expect(result.computed).toBe(false);
      expect((result.property as any).type).toBe('identifier');
    });

    it('wraps string property in identifier node', () => {
      const result = toCoreAST({
        type: 'member',
        object: { type: 'identifier', value: 'el' },
        property: 'textContent',
      });
      expect(result.type).toBe('memberExpression');
      expect((result.property as any).type).toBe('identifier');
      expect((result.property as any).name).toBe('textContent');
    });

    it('defaults computed to false', () => {
      const result = toCoreAST({
        type: 'member',
        object: { type: 'identifier', value: 'x' },
        property: 'y',
      });
      expect(result.computed).toBe(false);
    });
  });

  describe('possessive expression nodes', () => {
    it('converts to possessiveExpression wrapping property in identifier', () => {
      const result = toCoreAST({
        type: 'possessive',
        object: { type: 'identifier', value: 'me' },
        property: 'textContent',
      });
      expect(result.type).toBe('possessiveExpression');
      expect((result.property as any).type).toBe('identifier');
      expect((result.property as any).name).toBe('textContent');
    });
  });

  describe('call expression nodes', () => {
    it('converts to callExpression with arguments (not args)', () => {
      const result = toCoreAST({
        type: 'call',
        callee: { type: 'identifier', value: 'alert' },
        args: [{ type: 'literal', value: 'hi' }],
      });
      expect(result.type).toBe('callExpression');
      expect((result.callee as any).type).toBe('identifier');
      expect(result.arguments as any[]).toHaveLength(1);
    });

    it('handles no args', () => {
      const result = toCoreAST({
        type: 'call',
        callee: { type: 'identifier', value: 'fn' },
      });
      expect(result.arguments as any[]).toEqual([]);
    });
  });

  describe('event nodes', () => {
    it('converts to eventHandler', () => {
      const result = toCoreAST({
        type: 'event',
        event: 'click',
        body: [{ type: 'command', name: 'toggle', args: [{ type: 'selector', value: '.active' }] }],
      });
      expect(result.type).toBe('eventHandler');
      expect(result.event).toBe('click');
      expect(result.commands as any[]).toHaveLength(1);
    });

    it('flattens event modifiers to top-level props', () => {
      const result = toCoreAST({
        type: 'event',
        event: 'click',
        modifiers: { once: true, prevent: true, debounce: 300 },
        body: [],
      });
      expect(result.once).toBe(true);
      expect(result.prevent).toBe(true);
      expect(result.debounce).toBe(300);
    });

    it('handles all modifier types', () => {
      const result = toCoreAST({
        type: 'event',
        event: 'scroll',
        modifiers: {
          once: true,
          prevent: true,
          stop: true,
          capture: true,
          passive: true,
          debounce: 100,
          throttle: 200,
          from: 'window',
        },
        body: [],
      });
      expect(result.once).toBe(true);
      expect(result.prevent).toBe(true);
      expect(result.stop).toBe(true);
      expect(result.capture).toBe(true);
      expect(result.passive).toBe(true);
      expect(result.debounce).toBe(100);
      expect(result.throttle).toBe(200);
      expect(result.from).toBe('window');
    });

    it('handles no modifiers', () => {
      const result = toCoreAST({ type: 'event', event: 'load', body: [] });
      expect(result.once).toBeUndefined();
      expect(result.prevent).toBeUndefined();
    });
  });

  describe('command nodes', () => {
    it('converts with isBlocking: false', () => {
      const result = toCoreAST({
        type: 'command',
        name: 'add',
        args: [{ type: 'selector', value: '.cls' }],
      });
      expect(result.type).toBe('command');
      expect(result.name).toBe('add');
      expect(result.isBlocking).toBe(false);
    });

    it('includes target when present', () => {
      const result = toCoreAST({
        type: 'command',
        name: 'put',
        args: [],
        target: { type: 'selector', value: '#out' },
      });
      expect((result.target as any).type).toBe('selector');
    });

    it('includes converted modifiers', () => {
      const result = toCoreAST({
        type: 'command',
        name: 'append',
        args: [],
        modifiers: { to: { type: 'selector', value: '#list' } as unknown },
      });
      expect((result.modifiers as any).to.type).toBe('selector');
    });
  });

  describe('if nodes', () => {
    it('converts to command with name=if', () => {
      const result = toCoreAST({
        type: 'if',
        condition: { type: 'literal', value: true },
        thenBranch: [{ type: 'command', name: 'log', args: [] }],
      });
      expect(result.type).toBe('command');
      expect(result.name).toBe('if');
      expect(result.isBlocking).toBe(true);
      expect((result.condition as any).type).toBe('literal');
      expect(result.thenBranch as any[]).toHaveLength(1);
    });

    it('includes elseBranch when present', () => {
      const result = toCoreAST({
        type: 'if',
        condition: { type: 'identifier', value: 'ready' },
        thenBranch: [{ type: 'command', name: 'go', args: [] }],
        elseBranch: [{ type: 'command', name: 'wait', args: [] }],
      });
      expect(result.elseBranch as any[]).toHaveLength(1);
    });

    it('omits elseBranch when absent', () => {
      const result = toCoreAST({
        type: 'if',
        condition: { type: 'literal', value: true },
        thenBranch: [],
      });
      expect(result.elseBranch).toBeUndefined();
    });
  });

  describe('repeat nodes', () => {
    it('converts repeat with count (times variant)', () => {
      const result = toCoreAST({
        type: 'repeat',
        count: { type: 'literal', value: 3 },
        body: [{ type: 'command', name: 'log', args: [] }],
      });
      expect(result.type).toBe('command');
      expect(result.name).toBe('repeat');
      expect(result.isBlocking).toBe(true);
      expect(result.loopVariant).toBe('times');
      expect((result.count as any).type).toBe('literal');
    });

    it('converts repeat with numeric count', () => {
      const result = toCoreAST({
        type: 'repeat',
        count: 5,
        body: [],
      });
      expect((result.count as any).type).toBe('literal');
      expect((result.count as any).value).toBe(5);
    });

    it('converts repeat without count (forever)', () => {
      const result = toCoreAST({ type: 'repeat', body: [] });
      expect(result.count).toBeUndefined();
      expect(result.loopVariant).toBeUndefined();
    });
  });

  describe('foreach nodes', () => {
    it('converts to repeat with for variant', () => {
      const result = toCoreAST({
        type: 'foreach',
        itemName: 'item',
        collection: { type: 'identifier', value: 'items' },
        body: [{ type: 'command', name: 'log', args: [] }],
      });
      expect(result.type).toBe('command');
      expect(result.name).toBe('repeat');
      expect(result.loopVariant).toBe('for');
      expect(result.itemName).toBe('item');
      expect((result.collection as any).type).toBe('identifier');
    });

    it('includes indexName when present', () => {
      const result = toCoreAST({
        type: 'foreach',
        itemName: 'item',
        indexName: 'i',
        collection: { type: 'identifier', value: 'list' },
        body: [],
      });
      expect(result.indexName).toBe('i');
    });
  });

  describe('while nodes', () => {
    it('converts to repeat with while variant', () => {
      const result = toCoreAST({
        type: 'while',
        condition: { type: 'identifier', value: 'running' },
        body: [],
      });
      expect(result.type).toBe('command');
      expect(result.name).toBe('repeat');
      expect(result.loopVariant).toBe('while');
      expect((result.condition as any).type).toBe('identifier');
    });
  });

  describe('positional nodes', () => {
    it('converts to callExpression', () => {
      const result = toCoreAST({
        type: 'positional',
        position: 'first',
        target: { type: 'selector', value: '.item' },
      });
      expect(result.type).toBe('callExpression');
      expect((result.callee as any).name).toBe('first');
      expect(result.arguments as any[]).toHaveLength(1);
    });

    it('handles positional without target', () => {
      const result = toCoreAST({ type: 'positional', position: 'last' });
      expect((result.callee as any).name).toBe('last');
      expect(result.arguments as any[]).toEqual([]);
    });
  });

  // =============================================================================
  // B. SYNTHETIC POSITIONS
  // =============================================================================

  describe('synthetic positions', () => {
    it('all nodes have synthetic position fields', () => {
      const nodes: InterchangeNode[] = [
        { type: 'literal', value: 1 },
        { type: 'identifier', value: 'x' },
        { type: 'selector', value: '.a' },
        { type: 'variable', name: 'y', scope: 'local' },
        {
          type: 'binary',
          operator: '+',
          left: { type: 'literal', value: 1 },
          right: { type: 'literal', value: 2 },
        },
        { type: 'unary', operator: 'not', operand: { type: 'literal', value: true } },
        { type: 'member', object: { type: 'identifier', value: 'x' }, property: 'y' },
        { type: 'possessive', object: { type: 'identifier', value: 'me' }, property: 'val' },
        { type: 'call', callee: { type: 'identifier', value: 'fn' } },
        { type: 'event', event: 'click', body: [] },
        { type: 'command', name: 'log', args: [] },
        { type: 'if', condition: { type: 'literal', value: true }, thenBranch: [] },
        { type: 'repeat', body: [] },
        {
          type: 'foreach',
          itemName: 'x',
          collection: { type: 'identifier', value: 'xs' },
          body: [],
        },
        { type: 'while', condition: { type: 'literal', value: true }, body: [] },
        { type: 'positional', position: 'first' },
      ];

      for (const node of nodes) {
        const result = toCoreAST(node);
        expect(result.start).toBe(0);
        expect(result.end).toBe(0);
        expect(result.line).toBe(1);
        expect(result.column).toBe(0);
      }
    });
  });

  // =============================================================================
  // C. EDGE CASES
  // =============================================================================

  describe('edge cases', () => {
    it('handles null input', () => {
      const result = toCoreAST(null as any);
      expect(result.type).toBe('literal');
      expect(result.value).toBe(null);
    });

    it('handles undefined input', () => {
      const result = toCoreAST(undefined as any);
      expect(result.type).toBe('literal');
      expect(result.value).toBe(null);
    });
  });

  // =============================================================================
  // D. ROUNDTRIP TESTS (fromCoreAST → toCoreAST)
  // =============================================================================

  describe('roundtrip (toCoreAST ∘ fromCoreAST)', () => {
    it('preserves literal semantic meaning', () => {
      const core = { type: 'literal', value: 42 };
      const interchange = fromCoreAST(core);
      const roundtripped = toCoreAST(interchange);
      expect(roundtripped.type).toBe('literal');
      expect(roundtripped.value).toBe(42);
    });

    it('preserves identifier name', () => {
      const core = { type: 'identifier', name: 'myVar' };
      const interchange = fromCoreAST(core);
      const roundtripped = toCoreAST(interchange);
      expect(roundtripped.type).toBe('identifier');
      expect(roundtripped.name).toBe('myVar');
    });

    it('preserves selector value', () => {
      const core = { type: 'selector', value: '.active' };
      const interchange = fromCoreAST(core);
      const roundtripped = toCoreAST(interchange);
      expect(roundtripped.type).toBe('selector');
      expect(roundtripped.value).toBe('.active');
    });

    it('preserves binary expression structure', () => {
      const core = {
        type: 'binaryExpression',
        operator: '==',
        left: { type: 'identifier', name: 'x' },
        right: { type: 'literal', value: 5 },
      };
      const interchange = fromCoreAST(core);
      const roundtripped = toCoreAST(interchange);
      expect(roundtripped.type).toBe('binaryExpression');
      expect(roundtripped.operator).toBe('==');
      expect((roundtripped.left as any).name).toBe('x');
      expect((roundtripped.right as any).value).toBe(5);
    });

    it('preserves unary expression structure', () => {
      const core = {
        type: 'unaryExpression',
        operator: 'not',
        argument: { type: 'literal', value: true },
      };
      const interchange = fromCoreAST(core);
      const roundtripped = toCoreAST(interchange);
      expect(roundtripped.type).toBe('unaryExpression');
      expect(roundtripped.operator).toBe('not');
      expect((roundtripped.argument as any).value).toBe(true);
    });

    it('preserves event handler structure', () => {
      const core = {
        type: 'eventHandler',
        event: 'click',
        once: true,
        prevent: true,
        commands: [
          { type: 'command', name: 'toggle', args: [{ type: 'selector', value: '.active' }] },
        ],
      };
      const interchange = fromCoreAST(core);
      const roundtripped = toCoreAST(interchange);
      expect(roundtripped.type).toBe('eventHandler');
      expect(roundtripped.event).toBe('click');
      expect(roundtripped.once).toBe(true);
      expect(roundtripped.prevent).toBe(true);
      expect(roundtripped.commands as any[]).toHaveLength(1);
    });

    it('preserves command name and args', () => {
      const core = {
        type: 'command',
        name: 'add',
        args: [{ type: 'selector', value: '.highlight' }],
      };
      const interchange = fromCoreAST(core);
      const roundtripped = toCoreAST(interchange);
      expect(roundtripped.type).toBe('command');
      expect(roundtripped.name).toBe('add');
      expect((roundtripped.args as any[])[0].type).toBe('selector');
    });

    it('preserves call expression structure', () => {
      const core = {
        type: 'callExpression',
        callee: { type: 'identifier', name: 'alert' },
        arguments: [{ type: 'literal', value: 'msg' }],
      };
      const interchange = fromCoreAST(core);
      const roundtripped = toCoreAST(interchange);
      expect(roundtripped.type).toBe('callExpression');
      expect((roundtripped.callee as any).name).toBe('alert');
      expect(roundtripped.arguments as any[]).toHaveLength(1);
    });
  });

  // =============================================================================
  // E. POSITION HANDLING
  // =============================================================================

  describe('position handling', () => {
    it('uses real positions from interchange nodes when available', () => {
      const node: InterchangeNode = {
        type: 'literal',
        value: 42,
        start: 10,
        end: 12,
        line: 3,
        column: 5,
      };
      const result = toCoreAST(node);
      expect(result.start).toBe(10);
      expect(result.end).toBe(12);
      expect(result.line).toBe(3);
      expect(result.column).toBe(5);
    });

    it('uses synthetic POS when interchange nodes lack positions', () => {
      const node: InterchangeNode = { type: 'literal', value: 42 };
      const result = toCoreAST(node);
      expect(result.start).toBe(0);
      expect(result.end).toBe(0);
      expect(result.line).toBe(1);
      expect(result.column).toBe(0);
    });

    it('uses real positions on identifier nodes', () => {
      const node: InterchangeNode = {
        type: 'identifier',
        value: 'x',
        start: 5,
        end: 6,
        line: 2,
        column: 3,
      };
      const result = toCoreAST(node);
      expect(result.start).toBe(5);
      expect(result.end).toBe(6);
      expect(result.line).toBe(2);
    });

    it('uses real positions on event nodes', () => {
      const node: InterchangeNode = {
        type: 'event',
        event: 'click',
        body: [],
        start: 0,
        end: 30,
        line: 1,
        column: 0,
      };
      const result = toCoreAST(node);
      expect(result.start).toBe(0);
      expect(result.end).toBe(30);
    });

    it('uses real positions on command nodes', () => {
      const node: InterchangeNode = {
        type: 'command',
        name: 'toggle',
        args: [],
        start: 9,
        end: 24,
        line: 2,
        column: 2,
      };
      const result = toCoreAST(node);
      expect(result.start).toBe(9);
      expect(result.end).toBe(24);
    });

    it('uses real positions on binary nodes', () => {
      const node: InterchangeNode = {
        type: 'binary',
        operator: '+',
        left: { type: 'literal', value: 1 },
        right: { type: 'literal', value: 2 },
        start: 0,
        end: 5,
        line: 1,
        column: 0,
      };
      const result = toCoreAST(node);
      expect(result.start).toBe(0);
      expect(result.end).toBe(5);
    });

    it('uses real positions on if nodes', () => {
      const node: InterchangeNode = {
        type: 'if',
        condition: { type: 'literal', value: true },
        thenBranch: [],
        start: 0,
        end: 20,
        line: 1,
        column: 0,
      };
      const result = toCoreAST(node);
      expect(result.start).toBe(0);
      expect(result.end).toBe(20);
    });

    it('roundtrip preserves positions from core AST with positions', () => {
      const core = {
        type: 'literal',
        value: 42,
        start: 10,
        end: 12,
        line: 3,
        column: 5,
      };
      const interchange = fromCoreAST(core);
      const roundtripped = toCoreAST(interchange);
      expect(roundtripped.start).toBe(10);
      expect(roundtripped.end).toBe(12);
      expect(roundtripped.line).toBe(3);
      expect(roundtripped.column).toBe(5);
    });

    it('handles partial positions (only start/end)', () => {
      const node: InterchangeNode = { type: 'literal', value: 42, start: 10, end: 12 };
      const result = toCoreAST(node);
      expect(result.start).toBe(10);
      expect(result.end).toBe(12);
      expect(result.line).toBe(1); // falls back to POS.line
      expect(result.column).toBe(0); // falls back to POS.column
    });
  });
});
