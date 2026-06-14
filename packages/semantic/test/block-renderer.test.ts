/**
 * Block renderer (Phase 4) — render whole behavior/def blocks to target-language
 * source, so a behavior authored in one language round-trips to another. The
 * renderer was block-blind before: a behavior rendered to just its keyword
 * (`comportamiento`), dropping the body.
 */

import { describe, it, expect } from 'vitest';
import { parse, render } from '../src';

interface SNode {
  kind?: string;
  action?: string;
  name?: string;
  parameters?: string[];
  body?: unknown;
  eventHandlers?: SNode[];
  statements?: unknown;
  thenBranch?: unknown;
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
      break;
    case 'conditional':
      acc.push('if');
      leaves(node.thenBranch as SNode, acc);
      break;
  }
  return acc;
}

const BEHAVIOR = 'behavior Toggleable(cls)\n  on click\n    toggle .{cls} on me\n  end\nend';

describe('block renderer — behavior', () => {
  it('renders the keyword, name, params, handler body, and closing end (ES)', () => {
    const out = render(parse(BEHAVIOR, 'en'), 'es');
    expect(out).toContain('comportamiento Toggleable(cls)'); // behavior keyword + header
    expect(out).toContain('alternar'); // toggle, translated
    expect(out).toContain('.{cls}'); // dynamic class preserved verbatim
    expect(out.trimEnd().endsWith('fin')).toBe(true); // closing end, translated
  });

  it('renders the behavior keyword and end in the target language (ja, SOV)', () => {
    const out = render(parse(BEHAVIOR, 'en'), 'ja');
    expect(out).toContain('振る舞い Toggleable(cls)');
    expect(out).toContain('切り替え'); // toggle
    expect(out).toContain('終わり'); // end
  });

  it('round-trips EN → ES → parse with structure + body preserved', () => {
    const back = parse(render(parse(BEHAVIOR, 'en'), 'es'), 'es') as unknown as {
      kind: string;
      name: string;
      parameters: string[];
      eventHandlers: SNode[];
    };
    expect(back.kind).toBe('behavior');
    expect(back.name).toBe('Toggleable');
    expect(back.parameters).toEqual(['cls']);
    expect(back.eventHandlers).toHaveLength(1);
    expect(leaves(back.eventHandlers[0])).toEqual(['toggle']);
  });

  it('renders multiple handlers, each closed by its own end', () => {
    const src =
      'behavior Multi\n  on click add .a to me\n  end\n  on mouseleave remove .b from me\n  end\nend';
    const out = render(parse(src, 'en'), 'es');
    const back = parse(out, 'es') as unknown as { eventHandlers: SNode[] };
    expect(back.eventHandlers).toHaveLength(2);
  });
});

describe('block renderer — def', () => {
  it('renders def header, body, and end; round-trips', () => {
    const out = render(parse('def greet(name)\n  log name\nend', 'en'), 'es');
    expect(out).toContain('greet(name)');
    expect(out).toContain('registrar'); // log, translated
    const back = parse(out, 'es') as unknown as { kind: string; name: string; body: SNode[] };
    expect(back.kind).toBe('def');
    expect(back.name).toBe('greet');
    expect(leaves({ kind: 'def', body: back.body })).toEqual(['log']);
  });
});
