/**
 * Tests for InterchangeNode → SemanticNode converter
 */

import { describe, it, expect } from 'vitest';
import { fromInterchangeNode, convertValue, renderExpr } from './from-interchange';
import { renderExplicit } from './explicit-renderer';
import { toProtocolJSON } from './protocol-json';
import type { SemanticNode, SemanticValue } from '../core/types';

// =============================================================================
// Helpers
// =============================================================================

/** Type-assert helper for SemanticValue */
function val(v: SemanticValue) {
  return v;
}

// =============================================================================
// 1. Direct Value Mappings
// =============================================================================

describe('convertValue: direct mappings', () => {
  it('converts LiteralNode (string)', () => {
    const result = convertValue({ type: 'literal', value: 'hello' });
    expect(result).toEqual({ type: 'literal', value: 'hello' });
  });

  it('converts LiteralNode (number)', () => {
    const result = convertValue({ type: 'literal', value: 42 });
    expect(result).toEqual({ type: 'literal', value: 42, dataType: 'number' });
  });

  it('converts LiteralNode (boolean)', () => {
    const result = convertValue({ type: 'literal', value: true });
    expect(result).toEqual({ type: 'literal', value: true, dataType: 'boolean' });
  });

  it('converts LiteralNode (null)', () => {
    const result = convertValue({ type: 'literal', value: null });
    expect(result).toEqual({ type: 'literal', value: 'null' });
  });

  it('converts SelectorNode (#id)', () => {
    const result = convertValue({ type: 'selector', value: '#button' });
    expect(result).toEqual({ type: 'selector', value: '#button', selectorKind: 'id' });
  });

  it('converts SelectorNode (.class)', () => {
    const result = convertValue({ type: 'selector', value: '.active' });
    expect(result).toEqual({ type: 'selector', value: '.active', selectorKind: 'class' });
  });

  it('converts SelectorNode ([attr])', () => {
    const result = convertValue({ type: 'selector', value: '[data-x]' });
    expect(result).toEqual({ type: 'selector', value: '[data-x]', selectorKind: 'attribute' });
  });

  it('converts IdentifierNode (known reference: me)', () => {
    const result = convertValue({ type: 'identifier', value: 'me' });
    expect(result).toEqual({ type: 'reference', value: 'me' });
  });

  it('converts IdentifierNode (known reference: result)', () => {
    const result = convertValue({ type: 'identifier', value: 'result' });
    expect(result).toEqual({ type: 'reference', value: 'result' });
  });

  it('converts IdentifierNode (non-reference)', () => {
    const result = convertValue({ type: 'identifier', value: 'foo' });
    expect(result).toEqual({ type: 'literal', value: 'foo' });
  });

  it('converts VariableNode (element scope)', () => {
    const result = convertValue({ type: 'variable', name: 'count', scope: 'element' });
    expect(result).toEqual({ type: 'expression', raw: ':count' });
  });

  it('converts VariableNode (global scope)', () => {
    const result = convertValue({ type: 'variable', name: 'total', scope: 'global' });
    expect(result).toEqual({ type: 'expression', raw: '$total' });
  });

  it('converts VariableNode (local scope)', () => {
    const result = convertValue({ type: 'variable', name: 'temp', scope: 'local' });
    expect(result).toEqual({ type: 'expression', raw: 'temp' });
  });

  it('converts PossessiveNode to PropertyPathValue', () => {
    const result = convertValue({
      type: 'possessive',
      object: { type: 'identifier', value: 'me' },
      property: 'classList',
    });
    expect(result).toEqual({
      type: 'property-path',
      object: { type: 'reference', value: 'me' },
      property: 'classList',
    });
  });
});

// =============================================================================
// 2. Expression Collapsing
// =============================================================================

describe('convertValue: expression collapsing', () => {
  it('collapses BinaryNode', () => {
    const result = convertValue({
      type: 'binary',
      operator: '+',
      left: { type: 'literal', value: 1 },
      right: { type: 'literal', value: 2 },
    });
    expect(result).toEqual({ type: 'expression', raw: '1 + 2' });
  });

  it('collapses UnaryNode', () => {
    const result = convertValue({
      type: 'unary',
      operator: 'not',
      operand: { type: 'identifier', value: 'x' },
    });
    expect(result).toEqual({ type: 'expression', raw: 'not x' });
  });

  it('collapses MemberNode (dot access)', () => {
    const result = convertValue({
      type: 'member',
      object: { type: 'identifier', value: 'event' },
      property: 'detail',
    });
    expect(result).toEqual({ type: 'expression', raw: 'event.detail' });
  });

  it('collapses MemberNode (computed)', () => {
    const result = convertValue({
      type: 'member',
      object: { type: 'identifier', value: 'arr' },
      property: { type: 'literal', value: 0 },
      computed: true,
    });
    expect(result).toEqual({ type: 'expression', raw: 'arr[0]' });
  });

  it('collapses CallNode', () => {
    const result = convertValue({
      type: 'call',
      callee: {
        type: 'member',
        object: { type: 'identifier', value: 'str' },
        property: 'toUpperCase',
      },
      args: [],
    });
    expect(result).toEqual({ type: 'expression', raw: 'str.toUpperCase()' });
  });

  it('collapses CallNode with args', () => {
    const result = convertValue({
      type: 'call',
      callee: {
        type: 'member',
        object: { type: 'identifier', value: 'arr' },
        property: 'join',
      },
      args: [{ type: 'literal', value: '-' }],
    });
    expect(result).toEqual({ type: 'expression', raw: 'arr.join(-)' });
  });

  it('collapses PositionalNode', () => {
    const result = convertValue({
      type: 'positional',
      position: 'first',
      target: { type: 'selector', value: '.item' },
    });
    expect(result).toEqual({ type: 'expression', raw: 'first .item' });
  });

  it('collapses nested expressions', () => {
    const result = convertValue({
      type: 'binary',
      operator: '&&',
      left: {
        type: 'binary',
        operator: '>',
        left: { type: 'identifier', value: 'x' },
        right: { type: 'literal', value: 0 },
      },
      right: {
        type: 'binary',
        operator: '<',
        left: { type: 'identifier', value: 'x' },
        right: { type: 'literal', value: 100 },
      },
    });
    expect(result).toEqual({
      type: 'expression',
      raw: 'x > 0 && x < 100',
    });
  });
});

// =============================================================================
// 3. renderExpr
// =============================================================================

describe('renderExpr', () => {
  it('renders literal string with spaces in quotes', () => {
    expect(renderExpr({ type: 'literal', value: 'hello world' })).toBe('"hello world"');
  });

  it('renders literal string without spaces unquoted', () => {
    expect(renderExpr({ type: 'literal', value: 'hello' })).toBe('hello');
  });

  it('renders null literal', () => {
    expect(renderExpr({ type: 'literal', value: null })).toBe('null');
  });

  it('renders possessive', () => {
    expect(
      renderExpr({
        type: 'possessive',
        object: { type: 'identifier', value: 'me' },
        property: 'innerHTML',
      })
    ).toBe("me's innerHTML");
  });

  it('renders variable scopes', () => {
    expect(renderExpr({ type: 'variable', name: 'x', scope: 'element' })).toBe(':x');
    expect(renderExpr({ type: 'variable', name: 'x', scope: 'global' })).toBe('$x');
    expect(renderExpr({ type: 'variable', name: 'x', scope: 'local' })).toBe('x');
  });

  it('renders positional without target', () => {
    expect(renderExpr({ type: 'positional', position: 'first' })).toBe('first');
  });
});

// =============================================================================
// 4. Command Conversion
// =============================================================================

describe('fromInterchangeNode: command conversion', () => {
  it('converts command with roles (semantic parser path)', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'toggle',
      roles: {
        patient: { type: 'selector', value: '.active' },
        destination: { type: 'selector', value: '#button' },
      },
    });

    expect(node.kind).toBe('command');
    expect(node.action).toBe('toggle');
    expect(node.roles.get('patient')).toEqual({
      type: 'selector',
      value: '.active',
      selectorKind: 'class',
    });
    expect(node.roles.get('destination')).toEqual({
      type: 'selector',
      value: '#button',
      selectorKind: 'id',
    });
  });

  it('infers roles for toggle (core parser path)', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'toggle',
      args: [{ type: 'selector', value: '.active' }],
      target: { type: 'selector', value: '#button' },
    });

    expect(node.kind).toBe('command');
    expect(node.action).toBe('toggle');
    expect(node.roles.get('patient')).toEqual({
      type: 'selector',
      value: '.active',
      selectorKind: 'class',
    });
    expect(node.roles.get('destination')).toEqual({
      type: 'selector',
      value: '#button',
      selectorKind: 'id',
    });
  });

  it('infers roles for set', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'set',
      args: [{ type: 'variable', name: 'count', scope: 'element' }],
      modifiers: { to: { type: 'literal', value: 5 } },
    });

    expect(node.action).toBe('set');
    expect(node.roles.get('destination')).toEqual({ type: 'expression', raw: ':count' });
    expect(node.roles.get('patient')).toEqual({ type: 'literal', value: 5, dataType: 'number' });
  });

  it('infers roles for put', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'put',
      args: [{ type: 'literal', value: 'hello' }],
      modifiers: { into: { type: 'selector', value: '#output' } },
    });

    expect(node.action).toBe('put');
    expect(node.roles.get('patient')).toEqual({ type: 'literal', value: 'hello' });
    expect(node.roles.get('destination')).toEqual({
      type: 'selector',
      value: '#output',
      selectorKind: 'id',
    });
    expect(node.roles.get('method')).toEqual({ type: 'literal', value: 'into' });
  });

  it('infers roles for increment', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'increment',
      args: [{ type: 'variable', name: 'count', scope: 'element' }],
      modifiers: { by: { type: 'literal', value: 5 } },
    });

    expect(node.action).toBe('increment');
    expect(node.roles.get('destination')).toEqual({ type: 'expression', raw: ':count' });
    expect(node.roles.get('quantity')).toEqual({ type: 'literal', value: 5, dataType: 'number' });
  });

  it('infers roles for fetch', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'fetch',
      args: [{ type: 'literal', value: '/api/data' }],
      modifiers: { as: 'json' },
    });

    expect(node.action).toBe('fetch');
    expect(node.roles.get('source')).toEqual({ type: 'literal', value: '/api/data' });
    expect(node.roles.get('responseType')).toEqual({ type: 'literal', value: 'json' });
  });

  it('infers roles for wait', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'wait',
      args: [{ type: 'literal', value: '500ms' }],
    });

    expect(node.action).toBe('wait');
    expect(node.roles.get('duration')).toEqual({ type: 'literal', value: '500ms' });
  });

  it('infers roles for remove (source not destination)', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'remove',
      args: [{ type: 'selector', value: '.active' }],
      target: { type: 'selector', value: '#button' },
    });

    expect(node.action).toBe('remove');
    expect(node.roles.get('patient')).toEqual({
      type: 'selector',
      value: '.active',
      selectorKind: 'class',
    });
    expect(node.roles.get('source')).toEqual({
      type: 'selector',
      value: '#button',
      selectorKind: 'id',
    });
    expect(node.roles.has('destination')).toBe(false);
  });

  it('infers roles for send', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'send',
      args: [{ type: 'literal', value: 'customEvent' }],
      target: { type: 'selector', value: '#target' },
    });

    expect(node.action).toBe('send');
    expect(node.roles.get('patient')).toEqual({ type: 'literal', value: 'customEvent' });
    expect(node.roles.get('destination')).toEqual({
      type: 'selector',
      value: '#target',
      selectorKind: 'id',
    });
  });

  it('infers roles for log', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'log',
      args: [{ type: 'literal', value: 'debug message' }],
    });

    expect(node.action).toBe('log');
    expect(node.roles.get('patient')).toEqual({ type: 'literal', value: 'debug message' });
  });

  it('uses generic fallback for unknown commands', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'myCustomCommand',
      args: [{ type: 'literal', value: 'arg1' }],
      target: { type: 'selector', value: '#el' },
    });

    expect(node.action).toBe('myCustomCommand');
    expect(node.roles.get('patient')).toEqual({ type: 'literal', value: 'arg1' });
    expect(node.roles.get('destination')).toEqual({
      type: 'selector',
      value: '#el',
      selectorKind: 'id',
    });
  });

  it('wraps bare expression nodes as get command', () => {
    const node = fromInterchangeNode({
      type: 'binary',
      operator: '+',
      left: { type: 'literal', value: 1 },
      right: { type: 'literal', value: 2 },
    });

    expect(node.kind).toBe('command');
    expect(node.action).toBe('get');
    expect(node.roles.get('patient')).toEqual({ type: 'expression', raw: '1 + 2' });
  });
});

// =============================================================================
// 5. Control Flow Conversion
// =============================================================================

describe('fromInterchangeNode: control flow', () => {
  it('converts IfNode to conditional', () => {
    const node = fromInterchangeNode({
      type: 'if',
      condition: {
        type: 'binary',
        operator: '>',
        left: { type: 'identifier', value: 'x' },
        right: { type: 'literal', value: 0 },
      },
      thenBranch: [
        { type: 'command', name: 'add', args: [{ type: 'selector', value: '.positive' }] },
      ],
    });

    expect(node.kind).toBe('conditional');
    expect(node.action).toBe('if');
    expect(node.roles.get('condition')).toEqual({ type: 'expression', raw: 'x > 0' });

    const cond = node as { thenBranch: SemanticNode[] };
    expect(cond.thenBranch).toHaveLength(1);
    expect(cond.thenBranch[0].action).toBe('add');
  });

  it('converts IfNode with else branch', () => {
    const node = fromInterchangeNode({
      type: 'if',
      condition: { type: 'identifier', value: 'x' },
      thenBranch: [{ type: 'command', name: 'show' }],
      elseBranch: [{ type: 'command', name: 'hide' }],
    });

    expect(node.kind).toBe('conditional');
    const cond = node as { thenBranch: SemanticNode[]; elseBranch?: SemanticNode[] };
    expect(cond.thenBranch).toHaveLength(1);
    expect(cond.elseBranch).toHaveLength(1);
    expect(cond.elseBranch![0].action).toBe('hide');
  });

  it('converts IfNode with elseIfBranches as nested conditionals', () => {
    const node = fromInterchangeNode({
      type: 'if',
      condition: { type: 'identifier', value: 'a' },
      thenBranch: [{ type: 'command', name: 'log', args: [{ type: 'literal', value: 'a' }] }],
      elseIfBranches: [
        {
          condition: { type: 'identifier', value: 'b' },
          body: [{ type: 'command', name: 'log', args: [{ type: 'literal', value: 'b' }] }],
        },
      ],
      elseBranch: [{ type: 'command', name: 'log', args: [{ type: 'literal', value: 'else' }] }],
    });

    expect(node.kind).toBe('conditional');
    const cond = node as { elseBranch?: SemanticNode[] };
    expect(cond.elseBranch).toHaveLength(1);
    // The else branch should be a nested conditional
    expect(cond.elseBranch![0].kind).toBe('conditional');
    expect(cond.elseBranch![0].action).toBe('if');
  });

  it('converts RepeatNode (times)', () => {
    const node = fromInterchangeNode({
      type: 'repeat',
      count: 3,
      body: [{ type: 'command', name: 'log', args: [{ type: 'literal', value: 'hi' }] }],
    });

    expect(node.kind).toBe('loop');
    const loop = node as { loopVariant: string; body: SemanticNode[] };
    expect(loop.loopVariant).toBe('times');
    expect(node.roles.get('quantity')).toEqual({ type: 'literal', value: 3, dataType: 'number' });
    expect(loop.body).toHaveLength(1);
  });

  it('converts RepeatNode (forever)', () => {
    const node = fromInterchangeNode({
      type: 'repeat',
      body: [{ type: 'command', name: 'wait', args: [{ type: 'literal', value: '100ms' }] }],
    });

    expect(node.kind).toBe('loop');
    const loop = node as { loopVariant: string };
    expect(loop.loopVariant).toBe('forever');
  });

  it('converts RepeatNode (while)', () => {
    const node = fromInterchangeNode({
      type: 'repeat',
      whileCondition: { type: 'identifier', value: 'running' },
      body: [],
    });

    expect(node.kind).toBe('loop');
    const loop = node as { loopVariant: string };
    expect(loop.loopVariant).toBe('while');
    expect(node.roles.get('condition')).toEqual({ type: 'literal', value: 'running' });
  });

  it('converts RepeatNode (until)', () => {
    const node = fromInterchangeNode({
      type: 'repeat',
      untilEvent: 'done',
      body: [],
    });

    expect(node.kind).toBe('loop');
    const loop = node as { loopVariant: string };
    expect(loop.loopVariant).toBe('until');
    expect(node.roles.get('condition')).toEqual({ type: 'literal', value: 'done' });
  });

  it('converts ForEachNode', () => {
    const node = fromInterchangeNode({
      type: 'foreach',
      itemName: 'item',
      indexName: 'i',
      collection: { type: 'selector', value: '.items' },
      body: [{ type: 'command', name: 'log', args: [{ type: 'identifier', value: 'item' }] }],
    });

    expect(node.kind).toBe('loop');
    const loop = node as {
      loopVariant: string;
      loopVariable?: string;
      indexVariable?: string;
      body: SemanticNode[];
    };
    expect(loop.loopVariant).toBe('for');
    expect(loop.loopVariable).toBe('item');
    expect(loop.indexVariable).toBe('i');
    expect(node.roles.get('source')).toEqual({
      type: 'selector',
      value: '.items',
      selectorKind: 'class',
    });
    expect(loop.body).toHaveLength(1);
  });

  it('converts WhileNode', () => {
    const node = fromInterchangeNode({
      type: 'while',
      condition: {
        type: 'binary',
        operator: '<',
        left: { type: 'identifier', value: 'i' },
        right: { type: 'literal', value: 10 },
      },
      body: [{ type: 'command', name: 'increment', args: [{ type: 'identifier', value: 'i' }] }],
    });

    expect(node.kind).toBe('loop');
    const loop = node as { loopVariant: string; body: SemanticNode[] };
    expect(loop.loopVariant).toBe('while');
    expect(node.roles.get('condition')).toEqual({ type: 'expression', raw: 'i < 10' });
    expect(loop.body).toHaveLength(1);
  });
});

// =============================================================================
// 6. Event Handler Conversion
// =============================================================================

describe('fromInterchangeNode: event handlers', () => {
  it('converts basic EventNode', () => {
    const node = fromInterchangeNode({
      type: 'event',
      event: 'click',
      body: [{ type: 'command', name: 'toggle', args: [{ type: 'selector', value: '.active' }] }],
    });

    expect(node.kind).toBe('event-handler');
    expect(node.action).toBe('on');
    expect(node.roles.get('event')).toEqual({ type: 'literal', value: 'click' });
    const eh = node as { body: SemanticNode[] };
    expect(eh.body).toHaveLength(1);
    expect(eh.body[0].action).toBe('toggle');
  });

  it('converts EventNode with modifiers', () => {
    const node = fromInterchangeNode({
      type: 'event',
      event: 'click',
      modifiers: { once: true, debounce: 300 },
      body: [],
    });

    expect(node.kind).toBe('event-handler');
    const eh = node as { eventModifiers?: { once?: boolean; debounce?: number } };
    expect(eh.eventModifiers?.once).toBe(true);
    expect(eh.eventModifiers?.debounce).toBe(300);
  });

  it('bridges from modifier (string → SemanticValue)', () => {
    const node = fromInterchangeNode({
      type: 'event',
      event: 'click',
      modifiers: { from: '.container' },
      body: [],
    });

    const eh = node as { eventModifiers?: { from?: SemanticValue } };
    expect(eh.eventModifiers?.from).toEqual({
      type: 'selector',
      value: '.container',
      selectorKind: 'class',
    });
  });

  it('encodes prevent/stop as roles', () => {
    const node = fromInterchangeNode({
      type: 'event',
      event: 'submit',
      modifiers: { prevent: true, stop: true },
      body: [],
    });

    expect(node.roles.get('prevent')).toEqual({ type: 'literal', value: true });
    expect(node.roles.get('stop')).toEqual({ type: 'literal', value: true });
  });

  it('preserves event target as source role', () => {
    const node = fromInterchangeNode({
      type: 'event',
      event: 'click',
      target: { type: 'selector', value: '#parent' },
      body: [],
    });

    expect(node.roles.get('source')).toEqual({
      type: 'selector',
      value: '#parent',
      selectorKind: 'id',
    });
  });
});

// =============================================================================
// 7. Round-Trip Tests
// =============================================================================

describe('round-trip: InterchangeNode → SemanticNode → bracket syntax', () => {
  it('toggle .active on #button', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'toggle',
      roles: {
        patient: { type: 'selector', value: '.active' },
        destination: { type: 'selector', value: '#button' },
      },
    });

    const bracket = renderExplicit(node);
    expect(bracket).toBe('[toggle patient:.active destination:#button]');
  });

  it('put hello into #output', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'put',
      args: [{ type: 'literal', value: 'hello' }],
      modifiers: { into: { type: 'selector', value: '#output' } },
    });

    const bracket = renderExplicit(node);
    expect(bracket).toContain('[put');
    expect(bracket).toContain('patient:hello');
    expect(bracket).toContain('destination:#output');
    expect(bracket).toContain('method:into');
  });

  it('event handler with body', () => {
    const node = fromInterchangeNode({
      type: 'event',
      event: 'click',
      body: [
        {
          type: 'command',
          name: 'toggle',
          roles: {
            patient: { type: 'selector', value: '.active' },
          },
        },
      ],
    });

    const bracket = renderExplicit(node);
    expect(bracket).toContain('[on');
    expect(bracket).toContain('event:click');
    expect(bracket).toContain('body:');
    expect(bracket).toContain('[toggle patient:.active]');
  });
});

describe('round-trip: InterchangeNode → SemanticNode → protocol JSON', () => {
  it('toggle command produces valid protocol JSON', () => {
    const node = fromInterchangeNode({
      type: 'command',
      name: 'toggle',
      roles: {
        patient: { type: 'selector', value: '.active' },
      },
    });

    const proto = toProtocolJSON(node);
    expect(proto.kind).toBe('command');
    expect(proto.action).toBe('toggle');
    expect(proto.roles.patient).toEqual({
      type: 'selector',
      value: '.active',
      selectorKind: 'class',
    });
  });

  it('event handler produces valid protocol JSON (compact trigger form)', () => {
    const node = fromInterchangeNode({
      type: 'event',
      event: 'click',
      body: [{ type: 'command', name: 'log', args: [{ type: 'literal', value: 'clicked' }] }],
    });

    // Single-command bodies are emitted in the compact form — the body
    // command's action is hoisted to the top level and the event name moves
    // under `trigger.event`. See protocol.ts:canEmitCompactTrigger.
    const proto = toProtocolJSON(node);
    expect(proto.kind).toBeUndefined();
    expect(proto.action).toBe('log');
    expect(proto.trigger).toEqual({ event: 'click' });
    expect(proto.body).toBeUndefined();
  });

  it('if/else produces valid protocol JSON', () => {
    const node = fromInterchangeNode({
      type: 'if',
      condition: { type: 'identifier', value: 'x' },
      thenBranch: [{ type: 'command', name: 'show' }],
      elseBranch: [{ type: 'command', name: 'hide' }],
    });

    const proto = toProtocolJSON(node);
    expect(proto.kind).toBe('command');
    expect(proto.action).toBe('if');
    expect(proto.thenBranch).toHaveLength(1);
    expect(proto.elseBranch).toHaveLength(1);
  });

  it('loop produces valid protocol JSON', () => {
    const node = fromInterchangeNode({
      type: 'repeat',
      count: 5,
      body: [{ type: 'command', name: 'log' }],
    });

    const proto = toProtocolJSON(node);
    expect(proto.kind).toBe('command');
    expect(proto.loopVariant).toBe('times');
    expect(proto.loopBody).toHaveLength(1);
  });
});

// =============================================================================
// 8. Edge Cases
// =============================================================================

describe('edge cases', () => {
  it('handles null input gracefully', () => {
    const node = fromInterchangeNode(null as unknown as { type: string });
    expect(node.kind).toBe('command');
    expect(node.action).toBe('unknown');
  });

  it('handles undefined input gracefully', () => {
    const node = fromInterchangeNode(undefined as unknown as { type: string });
    expect(node.kind).toBe('command');
    expect(node.action).toBe('unknown');
  });

  it('handles unknown node type', () => {
    const node = fromInterchangeNode({ type: 'UNKNOWN_TYPE', value: 'foo' });
    expect(node.kind).toBe('command');
    expect(node.action).toBe('get');
  });

  it('handles command with no args or target', () => {
    const node = fromInterchangeNode({ type: 'command', name: 'halt' });
    expect(node.kind).toBe('command');
    expect(node.action).toBe('halt');
    expect(node.roles.size).toBe(0);
  });

  it('handles event with empty body', () => {
    const node = fromInterchangeNode({ type: 'event', event: 'load', body: [] });
    expect(node.kind).toBe('event-handler');
    const eh = node as { body: SemanticNode[] };
    expect(eh.body).toHaveLength(0);
  });

  it('handles repeat with expression count', () => {
    const node = fromInterchangeNode({
      type: 'repeat',
      count: { type: 'identifier', value: 'n' },
      body: [],
    });

    expect(node.kind).toBe('loop');
    const loop = node as { loopVariant: string };
    expect(loop.loopVariant).toBe('times');
    expect(node.roles.get('quantity')).toEqual({ type: 'literal', value: 'n' });
  });
});
