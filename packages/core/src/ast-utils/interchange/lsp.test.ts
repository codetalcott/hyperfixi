/**
 * Tests for the interchange-aware LSP module.
 */
import { describe, it, expect } from 'vitest';
import type { InterchangeNode, EventNode, CommandNode, IfNode } from './types';
import {
  interchangeToLSPDiagnostics,
  interchangeToLSPSymbols,
  interchangeToLSPHover,
  interchangeToLSPCompletions,
  calculateCyclomatic,
  calculateCognitive,
  DiagnosticSeverity,
  SymbolKind,
  CompletionItemKind,
} from './lsp';

// =============================================================================
// HELPERS
// =============================================================================

function literal(
  value: string | number | boolean | null,
  pos?: Partial<{ start: number; end: number; line: number; column: number }>
): InterchangeNode {
  return { type: 'literal', value, ...pos } as InterchangeNode;
}

function ident(
  name: string,
  pos?: Partial<{ start: number; end: number; line: number; column: number }>
): InterchangeNode {
  return { type: 'identifier', value: name, name, ...pos } as InterchangeNode;
}

function cmd(
  name: string,
  args: InterchangeNode[] = [],
  pos?: Partial<{ start: number; end: number; line: number; column: number }>
): CommandNode {
  return { type: 'command', name, args, ...pos } as CommandNode;
}

function event(
  eventName: string,
  body: InterchangeNode[] = [],
  pos?: Partial<{ start: number; end: number; line: number; column: number }>
): EventNode {
  return { type: 'event', event: eventName, body, ...pos } as EventNode;
}

function ifNode(
  condition: InterchangeNode,
  thenBranch: InterchangeNode[],
  elseBranch?: InterchangeNode[],
  pos?: Partial<{ start: number; end: number; line: number; column: number }>
): IfNode {
  return {
    type: 'if',
    condition,
    thenBranch,
    ...(elseBranch ? { elseBranch } : {}),
    ...pos,
  } as IfNode;
}

// =============================================================================
// A. COMPLEXITY ANALYSIS
// =============================================================================

describe('calculateCyclomatic', () => {
  it('returns 1 for a simple command', () => {
    expect(calculateCyclomatic(cmd('toggle'))).toBe(1);
  });

  it('increments for if nodes', () => {
    const node = event('click', [ifNode(literal(true), [cmd('add')])]);
    // 1 base + 1 if = 2
    expect(calculateCyclomatic(node)).toBe(2);
  });

  it('increments for nested if nodes', () => {
    const node = event('click', [ifNode(literal(true), [ifNode(literal(false), [cmd('add')])])]);
    // 1 base + 2 ifs = 3
    expect(calculateCyclomatic(node)).toBe(3);
  });

  it('increments for while loops', () => {
    const whileNode: InterchangeNode = {
      type: 'while',
      condition: literal(true),
      body: [cmd('add')],
    } as InterchangeNode;
    const node = event('click', [whileNode]);
    // 1 base + 1 while = 2
    expect(calculateCyclomatic(node)).toBe(2);
  });

  it('increments for foreach loops', () => {
    const foreachNode: InterchangeNode = {
      type: 'foreach',
      itemName: 'item',
      collection: ident('items'),
      body: [cmd('add')],
    } as InterchangeNode;
    const node = event('click', [foreachNode]);
    // 1 base + 1 foreach = 2
    expect(calculateCyclomatic(node)).toBe(2);
  });

  it('handles complex structures', () => {
    const node = event('click', [
      ifNode(literal(true), [cmd('add'), ifNode(literal(false), [cmd('remove')])]),
      {
        type: 'while',
        condition: literal(true),
        body: [ifNode(literal(true), [cmd('toggle')])],
      } as InterchangeNode,
    ]);
    // 1 base + 3 ifs + 1 while = 5
    expect(calculateCyclomatic(node)).toBe(5);
  });
});

describe('calculateCognitive', () => {
  it('returns 0 for a simple command', () => {
    expect(calculateCognitive(cmd('toggle'))).toBe(0);
  });

  it('accounts for nesting depth', () => {
    // event (nests, depth 0→1) > if (decision at depth 1: 1+1=2)
    const node = event('click', [ifNode(literal(true), [cmd('add')])]);
    expect(calculateCognitive(node)).toBe(2);
  });

  it('deeper nesting increases cognitive weight', () => {
    // event (nests, depth 0→1) > if (decision at depth 1: 1+1=2, nests, depth→2) > if (decision at depth 2: 1+2=3) = 5 total
    const node = event('click', [ifNode(literal(true), [ifNode(literal(false), [cmd('add')])])]);
    expect(calculateCognitive(node)).toBe(5);
  });
});

// =============================================================================
// B. DIAGNOSTICS
// =============================================================================

describe('interchangeToLSPDiagnostics', () => {
  it('returns empty array for simple event handler', () => {
    const nodes = [event('click', [cmd('toggle')])];
    const diagnostics = interchangeToLSPDiagnostics(nodes);
    expect(diagnostics).toEqual([]);
  });

  it('reports high cyclomatic complexity', () => {
    // Build a node with 11+ branches
    const branches: InterchangeNode[] = [];
    for (let i = 0; i < 12; i++) {
      branches.push(ifNode(literal(true), [cmd('add')]));
    }
    const nodes = [event('click', branches, { line: 1, column: 0, start: 0, end: 50 })];
    const diagnostics = interchangeToLSPDiagnostics(nodes);

    const cyclomaticDiag = diagnostics.find(d => d.code === 'high-cyclomatic-complexity');
    expect(cyclomaticDiag).toBeDefined();
    expect(cyclomaticDiag!.severity).toBe(DiagnosticSeverity.Warning);
  });

  it('respects custom thresholds', () => {
    const nodes = [
      event('click', [
        ifNode(literal(true), [cmd('add')]),
        ifNode(literal(false), [cmd('remove')]),
      ]),
    ];
    // Default threshold 10 should not trigger, but threshold 2 should
    expect(
      interchangeToLSPDiagnostics(nodes).filter(d => d.code === 'high-cyclomatic-complexity')
    ).toHaveLength(0);
    expect(
      interchangeToLSPDiagnostics(nodes, { cyclomaticThreshold: 2 }).filter(
        d => d.code === 'high-cyclomatic-complexity'
      )
    ).toHaveLength(1);
  });

  it('uses provided source string', () => {
    const branches: InterchangeNode[] = [];
    for (let i = 0; i < 12; i++) {
      branches.push(ifNode(literal(true), [cmd('add')]));
    }
    const nodes = [event('click', branches)];
    const diagnostics = interchangeToLSPDiagnostics(nodes, { source: 'my-tool' });
    expect(diagnostics.every(d => d.source === 'my-tool')).toBe(true);
  });

  it('reports long event handlers', () => {
    const body: InterchangeNode[] = [];
    for (let i = 0; i < 20; i++) {
      body.push(cmd('add'));
    }
    const nodes = [event('click', body)];
    const diagnostics = interchangeToLSPDiagnostics(nodes);
    const longHandler = diagnostics.find(d => d.code === 'long-event-handler');
    expect(longHandler).toBeDefined();
    expect(longHandler!.severity).toBe(DiagnosticSeverity.Information);
  });

  it('reports deep nesting', () => {
    // 5 levels deep should trigger
    let inner: InterchangeNode = cmd('add');
    for (let i = 0; i < 6; i++) {
      inner = ifNode(literal(true), [inner]);
    }
    const nodes = [event('click', [inner])];
    const diagnostics = interchangeToLSPDiagnostics(nodes);
    const deepNesting = diagnostics.find(d => d.code === 'deep-nesting');
    expect(deepNesting).toBeDefined();
    expect(deepNesting!.severity).toBe(DiagnosticSeverity.Warning);
  });

  it('uses position info for diagnostic ranges', () => {
    const branches: InterchangeNode[] = [];
    for (let i = 0; i < 12; i++) {
      branches.push(ifNode(literal(true), [cmd('add')]));
    }
    const nodes = [event('click', branches, { line: 5, column: 3, start: 40, end: 100 })];
    const diagnostics = interchangeToLSPDiagnostics(nodes);
    const cyclomaticDiag = diagnostics.find(d => d.code === 'high-cyclomatic-complexity');
    expect(cyclomaticDiag).toBeDefined();
    // line 5 → LSP line 4 (0-based)
    expect(cyclomaticDiag!.range.start.line).toBe(4);
    expect(cyclomaticDiag!.range.start.character).toBe(3);
    // end = start + (100-40) = 63
    expect(cyclomaticDiag!.range.end.character).toBe(63);
  });
});

// =============================================================================
// C. SYMBOLS
// =============================================================================

describe('interchangeToLSPSymbols', () => {
  it('extracts event handler symbols', () => {
    const nodes = [event('click', [cmd('toggle')])];
    const symbols = interchangeToLSPSymbols(nodes);
    expect(symbols).toHaveLength(1);
    expect(symbols[0].name).toBe('on click');
    expect(symbols[0].kind).toBe(SymbolKind.Event);
    expect(symbols[0].detail).toBe('Event Handler');
  });

  it('extracts command children of event handlers', () => {
    const nodes = [event('click', [cmd('add'), cmd('remove')])];
    const symbols = interchangeToLSPSymbols(nodes);
    expect(symbols[0].children).toHaveLength(2);
    expect(symbols[0].children![0].name).toBe('add');
    expect(symbols[0].children![0].kind).toBe(SymbolKind.Method);
  });

  it('extracts if symbols', () => {
    const nodes: InterchangeNode[] = [ifNode(literal(true), [cmd('add')])];
    const symbols = interchangeToLSPSymbols(nodes);
    expect(symbols).toHaveLength(1);
    expect(symbols[0].name).toBe('if');
    expect(symbols[0].kind).toBe(SymbolKind.Struct);
  });

  it('extracts loop symbols', () => {
    const repeatNode: InterchangeNode = {
      type: 'repeat',
      body: [cmd('add')],
    } as InterchangeNode;
    const foreachNode: InterchangeNode = {
      type: 'foreach',
      itemName: 'item',
      collection: ident('items'),
      body: [cmd('toggle')],
    } as InterchangeNode;
    const whileNode: InterchangeNode = {
      type: 'while',
      condition: literal(true),
      body: [cmd('remove')],
    } as InterchangeNode;

    const symbols = interchangeToLSPSymbols([repeatNode, foreachNode, whileNode]);
    expect(symbols).toHaveLength(3);
    expect(symbols[0].name).toBe('repeat');
    expect(symbols[0].kind).toBe(SymbolKind.Enum);
    expect(symbols[1].name).toBe('for each item');
    expect(symbols[1].kind).toBe(SymbolKind.Enum);
    expect(symbols[2].name).toBe('while');
    expect(symbols[2].kind).toBe(SymbolKind.Enum);
  });

  it('skips non-structural nodes at top level', () => {
    const nodes = [literal('hello'), ident('x')];
    const symbols = interchangeToLSPSymbols(nodes);
    expect(symbols).toHaveLength(0);
  });

  it('uses position info for symbol ranges', () => {
    const nodes = [event('click', [], { line: 3, column: 5, start: 20, end: 45 })];
    const symbols = interchangeToLSPSymbols(nodes);
    expect(symbols[0].range.start.line).toBe(2); // 3-1
    expect(symbols[0].range.start.character).toBe(5);
  });
});

// =============================================================================
// D. HOVER
// =============================================================================

describe('interchangeToLSPHover', () => {
  it('returns null when no node at position', () => {
    const nodes = [
      event('click', [cmd('toggle', [], { line: 2, column: 2, start: 10, end: 16 })], {
        line: 1,
        column: 0,
        start: 0,
        end: 20,
      }),
    ];
    // Position on line 99 — far from any node
    const hover = interchangeToLSPHover(nodes, { line: 99, character: 0 });
    expect(hover).toBeNull();
  });

  it('returns hover for event handler', () => {
    // Event on line 1 (LSP line 0), command on line 2 — hover at line 0 hits the event
    const nodes = [
      event('click', [cmd('toggle', [], { line: 2, column: 2, start: 15, end: 21 })], {
        line: 1,
        column: 0,
        start: 0,
        end: 50,
      }),
    ];
    const hover = interchangeToLSPHover(nodes, { line: 0, character: 5 });
    expect(hover).not.toBeNull();
    expect(hover!.contents).toContain('Event Handler');
    expect(hover!.contents).toContain('click');
  });

  it('returns hover for command', () => {
    const nodes = [
      event('click', [cmd('toggle', [], { line: 2, column: 2, start: 15, end: 21 })], {
        line: 1,
        column: 0,
        start: 0,
        end: 30,
      }),
    ];
    // LSP line 1 → interchange line 2 — hits the command
    const hover = interchangeToLSPHover(nodes, { line: 1, character: 3 });
    expect(hover).not.toBeNull();
    expect(hover!.contents).toContain('Command');
    expect(hover!.contents).toContain('toggle');
  });

  it('includes complexity info for event handlers', () => {
    // Event on line 1, if on line 2, cmd on line 3 — hover at line 0 hits event only
    const nodes = [
      event(
        'click',
        [
          ifNode(
            literal(true, { line: 2, column: 4, start: 15, end: 19 }),
            [cmd('add', [], { line: 3, column: 6, start: 25, end: 28 })],
            undefined,
            { line: 2, column: 2, start: 14, end: 35 }
          ),
        ],
        { line: 1, column: 0, start: 0, end: 40 }
      ),
    ];
    const hover = interchangeToLSPHover(nodes, { line: 0, character: 0 });
    expect(hover).not.toBeNull();
    expect(hover!.contents).toContain('Complexity');
    expect(hover!.contents).toContain('cyclomatic');
  });
});

// =============================================================================
// E. COMPLETIONS
// =============================================================================

describe('interchangeToLSPCompletions', () => {
  it('returns top-level keywords when no node at position', () => {
    const nodes = [event('click', [], { line: 1, column: 0, start: 0, end: 10 })];
    const completions = interchangeToLSPCompletions(nodes, { line: 99, character: 0 });
    const labels = completions.map(c => c.label);
    expect(labels).toContain('on');
    expect(labels).toContain('behavior');
    expect(labels).toContain('def');
  });

  it('returns command completions inside event handler', () => {
    const nodes = [event('click', [], { line: 1, column: 0, start: 0, end: 10 })];
    const completions = interchangeToLSPCompletions(nodes, { line: 0, character: 5 });
    const labels = completions.map(c => c.label);
    expect(labels).toContain('add');
    expect(labels).toContain('remove');
    expect(labels).toContain('toggle');
    expect(labels).toContain('fetch');
  });

  it('returns conditional completions inside if', () => {
    const ifN = ifNode(literal(true), [cmd('add')], undefined, {
      line: 2,
      column: 0,
      start: 10,
      end: 30,
    });
    const nodes = [event('click', [ifN], { line: 1, column: 0, start: 0, end: 40 })];
    const completions = interchangeToLSPCompletions(nodes, { line: 1, character: 5 });
    const labels = completions.map(c => c.label);
    expect(labels).toContain('then');
    expect(labels).toContain('else');
    expect(labels).toContain('end');
  });

  it('returns variable completions for expression context', () => {
    const lit = literal(42, { line: 3, column: 0, start: 20, end: 22 });
    const nodes = [event('click', [lit], { line: 1, column: 0, start: 0, end: 30 })];
    const completions = interchangeToLSPCompletions(nodes, { line: 2, character: 0 });
    const labels = completions.map(c => c.label);
    expect(labels).toContain('me');
    expect(labels).toContain('it');
  });
});

// =============================================================================
// F. RANGE CONVERSION
// =============================================================================

describe('diagnostic ranges', () => {
  it('converts 1-based line to 0-based LSP line', () => {
    // Event at line 5, column 3
    const branches: InterchangeNode[] = [];
    for (let i = 0; i < 12; i++) {
      branches.push(ifNode(literal(true), [cmd('add')]));
    }
    const nodes = [event('click', branches, { line: 5, column: 3 })];
    const diagnostics = interchangeToLSPDiagnostics(nodes);
    const diag = diagnostics.find(d => d.code === 'high-cyclomatic-complexity');
    expect(diag).toBeDefined();
    expect(diag!.range.start.line).toBe(4); // 5-1
    expect(diag!.range.start.character).toBe(3);
  });

  it('falls back to line 0 when no position', () => {
    const branches: InterchangeNode[] = [];
    for (let i = 0; i < 12; i++) {
      branches.push(ifNode(literal(true), [cmd('add')]));
    }
    const nodes = [event('click', branches)];
    const diagnostics = interchangeToLSPDiagnostics(nodes);
    const diag = diagnostics.find(d => d.code === 'high-cyclomatic-complexity');
    expect(diag).toBeDefined();
    expect(diag!.range.start.line).toBe(0); // (1-1)
    expect(diag!.range.start.character).toBe(0);
  });
});
