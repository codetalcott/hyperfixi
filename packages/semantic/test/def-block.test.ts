/**
 * Structural layer — `def name(params) … end` function definitions (Phase 3).
 *
 * The block layer (parser/block-parser.ts) decomposes a def block and parses its
 * body as a flat command sequence via `parseStatements` (the clause splitter), so
 * multi-command bodies — which the top-level `parse()` would truncate to the first
 * command — yield every statement. The `def` keyword is recognized in any language
 * context (English form); the body parses multilingually.
 */

import { describe, it, expect } from 'vitest';
import { parse, buildAST, translate } from '../src';

interface SNode {
  kind?: string;
  action?: string;
  body?: unknown;
  statements?: unknown;
  thenBranch?: unknown;
  eventHandlers?: unknown;
  initBlock?: unknown;
}
function leaves(node: SNode, acc: string[] = []): string[] {
  if (!node) return acc;
  if (Array.isArray(node)) {
    for (const n of node) leaves(n as SNode, acc);
    return acc;
  }
  switch (node.kind) {
    case 'command':
      if (node.action) acc.push(node.action);
      break;
    case 'compound':
      leaves(node.statements as SNode, acc);
      break;
    case 'event-handler':
    case 'def':
      leaves(node.body as SNode, acc);
      break;
    case 'behavior':
      leaves(node.eventHandlers as SNode, acc);
      leaves(node.initBlock as SNode, acc);
      break;
    case 'conditional':
      acc.push('if');
      leaves(node.thenBranch as SNode, acc);
      break;
  }
  return acc;
}

type Def = { kind: string; name: string; parameters: string[]; body: SNode[] };

describe('def block — structure', () => {
  it('parses name, parameters, and a single-command body', () => {
    const node = parse('def toggleIt()\n  toggle .active on me\nend', 'en') as unknown as Def;
    expect(node.kind).toBe('def');
    expect(node.name).toBe('toggleIt');
    expect(node.parameters).toEqual([]);
    expect(leaves(node)).toEqual(['toggle']);
  });

  it('parses parameters and a MULTI-command body (every statement kept)', () => {
    const src = 'def f(name)\n  add .a to me\n  remove .b from me\n  log name\nend';
    const node = parse(src, 'en') as unknown as Def;
    expect(node.parameters).toEqual(['name']);
    expect(leaves(node)).toEqual(['add', 'remove', 'log']);
  });

  it('builds a core DefNode with a flat command body', () => {
    const result = buildAST(parse('def f()\n  add .a to me\n  remove .b from me\nend', 'en')) as {
      ast: { type: string; name: string; params: string[]; body: Array<{ type: string }> };
    };
    const ast = result.ast ?? (result as never);
    expect(ast.type).toBe('def');
    expect(ast.body.map(c => c.type)).toEqual(['command', 'command']);
  });
});

describe('def block — multilingual body', () => {
  const KW: Record<string, string> = { es: 'fin', ja: '終わり', ko: '끝' };
  for (const [lang, end] of Object.entries(KW)) {
    it(`${lang}: def body parses multilingually`, () => {
      const body = translate('add .active to me', 'en', lang);
      const node = parse(`def f()\n  ${body}\n${end}`, lang) as unknown as Def;
      expect(node.kind).toBe('def');
      expect(leaves(node)).toContain('add');
    });
  }
});

describe('structural layer — non-interference', () => {
  it('behavior init blocks now keep every command', () => {
    const src = 'behavior B\n  init\n    add .a to me\n    log "x"\n  end\nend';
    const node = parse(src, 'en') as unknown as { kind: string };
    expect(node.kind).toBe('behavior');
    expect(leaves(node as SNode)).toEqual(['add', 'log']);
  });

  it('still parses behaviors and single statements', () => {
    expect((parse('behavior Foo\n  on click add .a to me\n  end\nend', 'en') as SNode).kind).toBe(
      'behavior'
    );
    expect((parse('toggle .active', 'en') as SNode).kind).toBe('command');
  });
});
