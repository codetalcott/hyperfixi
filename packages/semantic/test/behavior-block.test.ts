/**
 * Structural / block layer — `behavior … end` parsing (Phase 3).
 *
 * Before this layer the semantic parser matched the leading `behavior` keyword and
 * dropped the entire body, returning a degenerate `command` node at confidence 1.0.
 * The block layer (parser/block-parser.ts) decomposes the block into its handlers
 * (parsed by the single-statement engine) and re-assembles a BehaviorSemanticNode.
 */

import { describe, it, expect } from 'vitest';
import { parse, buildAST, translate } from '../src';

interface SNode {
  kind?: string;
  action?: string;
  body?: unknown;
  statements?: unknown;
  thenBranch?: unknown;
}
/** Multiset of leaf command actions inside a handler body. */
function bodyActions(node: SNode, acc: string[] = []): string[] {
  if (!node) return acc;
  if (Array.isArray(node)) {
    for (const n of node) bodyActions(n as SNode, acc);
    return acc;
  }
  switch (node.kind) {
    case 'command':
      if (node.action) acc.push(node.action);
      break;
    case 'compound':
      bodyActions(node.statements as SNode, acc);
      break;
    case 'event-handler':
      bodyActions(node.body as SNode, acc);
      break;
    case 'conditional':
      acc.push('if');
      bodyActions(node.thenBranch as SNode, acc);
      break;
  }
  return acc;
}

type Behavior = {
  kind: string;
  name: string;
  parameters: string[];
  eventHandlers: SNode[];
  metadata?: { confidence?: number };
};

describe('behavior block — structure', () => {
  it('parses name, parameters, and handler (body preserved, not dropped)', () => {
    const src =
      'behavior Removable(cls, target)\n' +
      '  on click add .active to me then remove .hidden from me\n' +
      '  end\n' +
      'end';
    const node = parse(src, 'en') as unknown as Behavior;
    expect(node.kind).toBe('behavior');
    expect(node.name).toBe('Removable');
    expect(node.parameters).toEqual(['cls', 'target']);
    expect(node.eventHandlers).toHaveLength(1);
    expect(bodyActions(node.eventHandlers[0]).sort()).toEqual(['add', 'remove']);
  });

  it('parses multiple handlers and a nested if inside a handler', () => {
    const src =
      'behavior Multi\n' +
      '  on click add .active to me\n' +
      '  end\n' +
      '  on mouseleave\n' +
      '    if I match .open then remove .open from me end\n' +
      '  end\n' +
      'end';
    const node = parse(src, 'en') as unknown as Behavior;
    expect(node.eventHandlers).toHaveLength(2);
    expect(bodyActions(node.eventHandlers[0])).toContain('add');
    // nested if is depth-contained within the second handler
    expect(bodyActions(node.eventHandlers[1]).sort()).toEqual(['if', 'remove']);
  });

  it('builds a core BehaviorNode with eventHandlers → commands', () => {
    const src = 'behavior Foo\n  on click add .active to me\n  end\nend';
    const result = buildAST(parse(src, 'en')) as { ast: Record<string, unknown> };
    const ast = result.ast ?? result;
    expect(ast.type).toBe('behavior');
    expect(ast.name).toBe('Foo');
    const handlers = ast.eventHandlers as Array<{ type: string; commands: unknown[] }>;
    expect(handlers).toHaveLength(1);
    expect(handlers[0].type).toBe('eventHandler');
    expect(handlers[0].commands.length).toBeGreaterThan(0);
  });
});

describe('behavior block — multilingual', () => {
  // [behavior keyword, end keyword] per language (verified against profiles).
  const KW: Record<string, [string, string]> = {
    es: ['comportamiento', 'fin'],
    ja: ['振る舞い', '終わり'],
    ko: ['동작', '끝'],
    ar: ['سلوك', 'نهاية'],
    de: ['verhalten', 'ende'],
    zh: ['行为', '结束'],
    tr: ['davranış', 'son'],
  };
  const inner = 'on click add .active to me then remove .hidden from me';

  for (const [lang, [beh, end]] of Object.entries(KW)) {
    it(`${lang}: behavior block parses with handler body preserved`, () => {
      const handler = translate(inner, 'en', lang);
      const block = `${beh} Foo\n  ${handler}\n  ${end}\n${end}`;
      const node = parse(block, lang) as unknown as Behavior;
      expect(node.kind).toBe('behavior');
      expect(node.eventHandlers).toHaveLength(1);
      expect(bodyActions(node.eventHandlers[0]).sort()).toEqual(['add', 'remove']);
    });
  }
});

describe('behavior block — honesty + non-interference', () => {
  it('reports low confidence when a handler body is silently dropped', () => {
    // `.{cls}` (dynamic class) isn't yet parsed by the statement engine, so the
    // handler body is empty — the block must NOT report a false 1.0.
    const src = 'behavior Bad\n  on click add .{cls} to me\n  end\nend';
    const node = parse(src, 'en') as unknown as Behavior;
    expect(node.kind).toBe('behavior');
    expect(node.metadata?.confidence ?? 1).toBeLessThan(0.5);
  });

  it('leaves ordinary single statements unaffected', () => {
    expect((parse('toggle .active on #btn', 'en') as SNode).kind).toBe('command');
    expect((parse('on click add .active to me', 'en') as SNode).kind).toBe('event-handler');
  });
});
