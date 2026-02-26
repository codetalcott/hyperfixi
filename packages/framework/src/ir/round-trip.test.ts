/**
 * LLM Round-Trip Pipeline Tests
 *
 * Validates the end-to-end pipeline:
 *   InterchangeNode → SemanticNode → LSE bracket → parseExplicit → semantic equivalence
 *   InterchangeNode → SemanticNode → protocol JSON → fromProtocolJSON → semantic equivalence
 *
 * With the kind-aware parseExplicit, bracket round-trips now preserve:
 *   - `kind` for event-handler, conditional, and loop nodes
 *   - `selectorKind` (inferred from selector prefix)
 *   - `thenBranch`/`elseBranch` for conditionals
 *   - `loopVariant`/`body` for loops
 *
 * These tests verify that the action, roles, and structural kind survive the trip.
 */

import { describe, it, expect } from 'vitest';
import { fromInterchangeNode } from './from-interchange';
import { renderExplicit } from './explicit-renderer';
import { parseExplicit } from './explicit-parser';
import { toProtocolJSON, fromProtocolJSON } from './protocol-json';

// =============================================================================
// Helpers
// =============================================================================

/** Round-trip through LSE bracket syntax */
function bracketRoundTrip(interchange: Record<string, unknown>) {
  const semantic = fromInterchangeNode(interchange);
  const lse = renderExplicit(semantic);
  const parsed = parseExplicit(lse);
  return { semantic, lse, parsed };
}

/** Round-trip through protocol JSON */
function protocolRoundTrip(interchange: Record<string, unknown>) {
  const semantic = fromInterchangeNode(interchange);
  const json = toProtocolJSON(semantic);
  const restored = fromProtocolJSON(json);
  return { semantic, json, restored };
}

/** Compare values by type and value only (ignores selectorKind, dataType, etc.) */
function valuesMatch(a: any, b: any): boolean {
  if (!a || !b) return a === b;
  return a.type === b.type && a.value === b.value;
}

// =============================================================================
// 1. Simple Commands
// =============================================================================

describe('LLM round-trip: simple commands', () => {
  it('toggle .active — bracket round-trip preserves action and patient', () => {
    const { semantic, parsed } = bracketRoundTrip({
      type: 'command',
      name: 'toggle',
      args: [{ type: 'selector', value: '.active' }],
    });

    expect(parsed.action).toBe('toggle');
    expect(parsed.kind).toBe('command');
    expect(valuesMatch(parsed.roles.get('patient'), semantic.roles.get('patient'))).toBe(true);
  });

  it('toggle .active — protocol JSON round-trip preserves full structure', () => {
    const { semantic, restored } = protocolRoundTrip({
      type: 'command',
      name: 'toggle',
      args: [{ type: 'selector', value: '.active' }],
    });

    expect(restored.action).toBe('toggle');
    expect(restored.roles.get('patient')).toEqual(semantic.roles.get('patient'));
  });

  it('add .highlight to #button — bracket round-trip', () => {
    const { parsed } = bracketRoundTrip({
      type: 'command',
      name: 'add',
      args: [{ type: 'selector', value: '.highlight' }],
      target: { type: 'selector', value: '#button' },
    });

    expect(parsed.action).toBe('add');
    // Patient and destination survive the trip
    const patient = parsed.roles.get('patient');
    const dest = parsed.roles.get('destination');
    expect(patient?.type).toBe('selector');
    expect(patient?.value).toBe('.highlight');
    expect(dest?.type).toBe('selector');
    expect(dest?.value).toBe('#button');
  });

  it('set :count to 42 — bracket round-trip', () => {
    const { parsed } = bracketRoundTrip({
      type: 'command',
      name: 'set',
      args: [
        { type: 'variable', name: 'count', scope: 'element' },
        { type: 'literal', value: 42 },
      ],
    });

    expect(parsed.action).toBe('set');
  });

  it('remove .error from me — bracket round-trip preserves roles', () => {
    const { parsed } = bracketRoundTrip({
      type: 'command',
      name: 'remove',
      args: [{ type: 'selector', value: '.error' }],
      target: { type: 'identifier', value: 'me' },
    });

    expect(parsed.action).toBe('remove');
    expect(parsed.roles.get('patient')?.value).toBe('.error');
  });

  it('bracket round-trip preserves selectorKind', () => {
    const { semantic, parsed } = bracketRoundTrip({
      type: 'command',
      name: 'toggle',
      args: [{ type: 'selector', value: '.active' }],
    });

    const originalPatient = semantic.roles.get('patient');
    const parsedPatient = parsed.roles.get('patient');
    expect(originalPatient?.type).toBe('selector');
    expect(parsedPatient?.type).toBe('selector');
    // selectorKind now preserved through bracket round-trip
    if (originalPatient?.type === 'selector' && parsedPatient?.type === 'selector') {
      expect(parsedPatient.selectorKind).toBe(originalPatient.selectorKind);
    }
  });
});

// =============================================================================
// 2. Event Handlers
// =============================================================================

describe('LLM round-trip: event handlers', () => {
  it('on click toggle .active — bracket round-trip preserves event-handler kind', () => {
    const { lse, parsed } = bracketRoundTrip({
      type: 'event',
      event: 'click',
      body: [
        {
          type: 'command',
          name: 'toggle',
          args: [{ type: 'selector', value: '.active' }],
        },
      ],
    });

    // The LSE bracket form includes the event name and command
    expect(lse).toContain('on');
    expect(lse).toContain('click');
    expect(lse).toContain('toggle');
    expect(lse).toContain('.active');

    // Kind-aware parser produces event-handler node
    expect(parsed.kind).toBe('event-handler');
    expect(parsed.action).toBe('on');
  });

  it('on click toggle .active — protocol JSON preserves event-handler kind', () => {
    const { semantic, restored } = protocolRoundTrip({
      type: 'event',
      event: 'click',
      body: [
        {
          type: 'command',
          name: 'toggle',
          args: [{ type: 'selector', value: '.active' }],
        },
      ],
    });

    expect(restored.kind).toBe('event-handler');
    // Protocol JSON preserves the full structure
    expect(restored.action).toBe(semantic.action);
  });

  it('multi-command event handler LSE contains all commands', () => {
    const { lse } = bracketRoundTrip({
      type: 'event',
      event: 'click',
      body: [
        {
          type: 'command',
          name: 'add',
          args: [{ type: 'selector', value: '.loading' }],
        },
        {
          type: 'command',
          name: 'fetch',
          args: [{ type: 'literal', value: '/api/data' }],
        },
        {
          type: 'command',
          name: 'remove',
          args: [{ type: 'selector', value: '.loading' }],
        },
      ],
    });

    expect(lse).toContain('add');
    expect(lse).toContain('fetch');
    expect(lse).toContain('remove');
  });
});

// =============================================================================
// 3. Control Flow
// =============================================================================

describe('LLM round-trip: control flow', () => {
  it('if condition — bracket round-trip preserves conditional kind', () => {
    // Use a simple condition (no operators) that round-trips cleanly
    const { parsed } = bracketRoundTrip({
      type: 'if',
      condition: { type: 'identifier', value: 'visible' },
      thenBranch: [
        {
          type: 'command',
          name: 'show',
          args: [{ type: 'selector', value: '#message' }],
        },
      ],
      elseBranch: [],
    });

    // Kind-aware parser produces conditional node
    expect(parsed.kind).toBe('conditional');
    expect(parsed.action).toBe('if');
  });

  it('if condition with complex expression — renders but complex exprs need protocol JSON', () => {
    // Note: bracket syntax for complex conditions (containing operators like ==)
    // doesn't cleanly round-trip through parseExplicit because the parser treats
    // tokens like "==" as role-format markers. Use protocol JSON for lossless round-trip.
    const semantic = fromInterchangeNode({
      type: 'if',
      condition: {
        type: 'binary',
        operator: '==',
        left: { type: 'identifier', value: 'x' },
        right: { type: 'literal', value: 0 },
      },
      thenBranch: [
        {
          type: 'command',
          name: 'show',
          args: [{ type: 'selector', value: '#message' }],
        },
      ],
      elseBranch: [],
    });

    // Verify it renders to bracket syntax (for LLM display)
    const lse = renderExplicit(semantic);
    expect(lse).toContain('if');
    expect(lse).toContain('show');
  });

  it('if condition — protocol JSON preserves conditional kind', () => {
    const { restored } = protocolRoundTrip({
      type: 'if',
      condition: {
        type: 'binary',
        operator: '==',
        left: { type: 'identifier', value: 'x' },
        right: { type: 'literal', value: 0 },
      },
      thenBranch: [
        {
          type: 'command',
          name: 'show',
          args: [{ type: 'selector', value: '#message' }],
        },
      ],
      elseBranch: [],
    });

    expect(restored.kind).toBe('conditional');
  });

  it('repeat loop — bracket round-trip preserves loop kind', () => {
    const { lse, parsed } = bracketRoundTrip({
      type: 'repeat',
      count: 5,
      body: [
        {
          type: 'command',
          name: 'log',
          args: [{ type: 'literal', value: 'tick' }],
        },
      ],
    });

    expect(lse).toContain('repeat');
    expect(lse).toContain('log');

    // Kind-aware parser produces loop node
    expect(parsed.kind).toBe('loop');
    expect(parsed.action).toBe('repeat');
  });

  it('foreach loop — protocol JSON preserves loop kind', () => {
    const { restored } = protocolRoundTrip({
      type: 'foreach',
      itemName: 'item',
      collection: { type: 'selector', value: '.items' },
      body: [
        {
          type: 'command',
          name: 'add',
          args: [{ type: 'selector', value: '.highlight' }],
        },
      ],
    });

    expect(restored.kind).toBe('loop');
  });
});

// =============================================================================
// 4. Protocol JSON Round-Trip (lossless)
// =============================================================================

describe('LLM round-trip: protocol JSON is lossless', () => {
  const testCases = [
    {
      name: 'toggle .active',
      node: {
        type: 'command',
        name: 'toggle',
        args: [{ type: 'selector', value: '.active' }],
      },
    },
    {
      name: 'show #modal',
      node: {
        type: 'command',
        name: 'show',
        args: [{ type: 'selector', value: '#modal' }],
      },
    },
  ];

  for (const tc of testCases) {
    it(`${tc.name}: protocol JSON → fromProtocolJSON → toProtocolJSON is identity`, () => {
      const semantic = fromInterchangeNode(tc.node);
      const json1 = toProtocolJSON(semantic);
      const restored = fromProtocolJSON(json1);
      const json2 = toProtocolJSON(restored);

      expect(json2).toEqual(json1);
    });
  }
});

// =============================================================================
// 5. Idempotency
// =============================================================================

describe('LLM round-trip: idempotency', () => {
  it('bracket render → parse → render is idempotent for commands', () => {
    const semantic = fromInterchangeNode({
      type: 'command',
      name: 'toggle',
      args: [{ type: 'selector', value: '.active' }],
    });

    const lse1 = renderExplicit(semantic);
    const parsed = parseExplicit(lse1);
    const lse2 = renderExplicit(parsed);
    const parsed2 = parseExplicit(lse2);
    const lse3 = renderExplicit(parsed2);

    expect(lse2).toBe(lse1);
    expect(lse3).toBe(lse1);
  });

  it('bracket render → parse → render is idempotent for event handlers', () => {
    const semantic = fromInterchangeNode({
      type: 'event',
      event: 'click',
      body: [
        {
          type: 'command',
          name: 'toggle',
          args: [{ type: 'selector', value: '.active' }],
        },
      ],
    });

    const lse1 = renderExplicit(semantic);
    const parsed = parseExplicit(lse1);
    const lse2 = renderExplicit(parsed);

    expect(lse2).toBe(lse1);
    expect(parsed.kind).toBe('event-handler');
  });

  it('bracket render → parse → render is idempotent for loops', () => {
    const semantic = fromInterchangeNode({
      type: 'repeat',
      count: 3,
      body: [
        {
          type: 'command',
          name: 'log',
          args: [{ type: 'literal', value: 'tick' }],
        },
      ],
    });

    const lse1 = renderExplicit(semantic);
    const parsed = parseExplicit(lse1);
    const lse2 = renderExplicit(parsed);

    expect(lse2).toBe(lse1);
    expect(parsed.kind).toBe('loop');
  });

  it('protocol JSON serialize → deserialize → serialize is idempotent', () => {
    const semantic = fromInterchangeNode({
      type: 'event',
      event: 'click',
      body: [
        {
          type: 'command',
          name: 'add',
          args: [{ type: 'selector', value: '.clicked' }],
        },
      ],
    });

    const json1 = toProtocolJSON(semantic);
    const restored = fromProtocolJSON(json1);
    const json2 = toProtocolJSON(restored);

    expect(json2).toEqual(json1);
  });
});

// =============================================================================
// 6. End-to-end: same input through both paths
// =============================================================================

describe('LLM round-trip: both paths from same input', () => {
  it('simple command produces valid LSE through both bracket and JSON paths', () => {
    const input = {
      type: 'command',
      name: 'toggle',
      args: [{ type: 'selector', value: '.active' }],
    };

    // Path A: bracket
    const semantic = fromInterchangeNode(input);
    const lse = renderExplicit(semantic);
    expect(lse).toContain('toggle');
    expect(lse).toContain('.active');

    // Path B: protocol JSON
    const json = toProtocolJSON(semantic);
    expect(json.action).toBe('toggle');
    expect(json.kind).toBe('command');

    // Both produce parseable output
    const fromBracket = parseExplicit(lse);
    const fromJSON = fromProtocolJSON(json);
    expect(fromBracket.action).toBe('toggle');
    expect(fromJSON.action).toBe('toggle');
  });

  it('event handler produces consistent kind through both paths', () => {
    const input = {
      type: 'event',
      event: 'click',
      body: [
        {
          type: 'command',
          name: 'toggle',
          args: [{ type: 'selector', value: '.active' }],
        },
      ],
    };

    const semantic = fromInterchangeNode(input);

    // Bracket path
    const lse = renderExplicit(semantic);
    const fromBracket = parseExplicit(lse);
    expect(fromBracket.kind).toBe('event-handler');

    // Protocol JSON path
    const json = toProtocolJSON(semantic);
    const fromJSON = fromProtocolJSON(json);
    expect(fromJSON.kind).toBe('event-handler');
  });
});

// =============================================================================
// 7. Direct parseExplicit kind-awareness
// =============================================================================

describe('parseExplicit kind-awareness', () => {
  it('parses [on ...] as event-handler', () => {
    const node = parseExplicit('[on event:click body:[toggle patient:.active]]');
    expect(node.kind).toBe('event-handler');
    expect(node.action).toBe('on');
    expect(node.roles.get('event')?.value).toBe('click');
  });

  it('parses [if ...] as conditional', () => {
    const node = parseExplicit('[if condition:visible then:[show patient:#msg]]');
    expect(node.kind).toBe('conditional');
    expect(node.action).toBe('if');
  });

  it('parses [repeat ...] as loop with times variant', () => {
    const node = parseExplicit('[repeat quantity:5 loop-body:[log patient:"tick"]]');
    expect(node.kind).toBe('loop');
    expect(node.action).toBe('repeat');
    if (node.kind === 'loop') {
      expect((node as any).loopVariant).toBe('times');
    }
  });

  it('parses [repeat ...] as loop with for variant', () => {
    const node = parseExplicit('[repeat source:.items variable:item loop-body:[add patient:.hl]]');
    expect(node.kind).toBe('loop');
    if (node.kind === 'loop') {
      expect((node as any).loopVariant).toBe('for');
      expect((node as any).loopVariable).toBe('item');
    }
  });

  it('parses [repeat ...] with explicit loop-variant', () => {
    const node = parseExplicit(
      '[repeat loop-variant:while condition:running loop-body:[log patient:"waiting"]]'
    );
    expect(node.kind).toBe('loop');
    if (node.kind === 'loop') {
      expect((node as any).loopVariant).toBe('while');
    }
  });

  it('parses regular commands as command kind', () => {
    const node = parseExplicit('[toggle patient:.active]');
    expect(node.kind).toBe('command');
    expect(node.action).toBe('toggle');
  });
});
