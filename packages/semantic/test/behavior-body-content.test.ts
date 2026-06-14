/**
 * Behavior body-content parsing (Phase 3) — the two gaps that capped real
 * behavior fidelity once block decomposition worked:
 *   1. `remove me` / `remove it` — remove-self (element as patient), previously
 *      threw because the remove patient only accepted `selector`.
 *   2. `.{cls}` — dynamic class interpolation, previously un-tokenized (the class
 *      regex required a letter after `.`).
 * Both are general single-statement fixes that unblock parameterized behaviors.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../src';

interface SNode {
  kind?: string;
  action?: string;
  body?: unknown;
  roles?: unknown;
}
function roles(n: SNode): Record<string, { type?: string; value?: string }> {
  const r = n.roles instanceof Map ? Object.fromEntries(n.roles) : (n.roles as object);
  return (r ?? {}) as never;
}
function leaves(n: SNode, acc: string[] = []): string[] {
  if (!n) return acc;
  if (Array.isArray(n)) {
    for (const x of n) leaves(x as SNode, acc);
    return acc;
  }
  if (n.kind === 'command' && n.action) acc.push(n.action);
  else if (n.kind === 'event-handler') leaves(n.body as SNode, acc);
  else if (n.kind === 'compound') leaves((n as { statements?: unknown }).statements as SNode, acc);
  return acc;
}

describe('remove-self (element as patient)', () => {
  for (const ref of ['me', 'it']) {
    it(`parses \`remove ${ref}\` with the element as patient`, () => {
      const node = parse(`remove ${ref}`, 'en') as SNode;
      expect(node.action).toBe('remove');
      expect(roles(node).patient?.value).toBe(ref);
    });
  }

  it('still parses `remove .class from me` (class removal unchanged)', () => {
    const node = parse('remove .x from me', 'en') as SNode;
    expect(roles(node).patient?.value).toBe('.x');
    expect(roles(node).source?.value).toBe('me');
  });

  it('captures `remove me` after another command in a handler body', () => {
    const node = parse('on click add .highlight to me then remove me', 'en') as SNode;
    expect(leaves(node).sort()).toEqual(['add', 'remove']);
  });
});

describe('dynamic class interpolation .{cls}', () => {
  for (const cmd of ['toggle', 'add', 'remove']) {
    const code =
      cmd === 'toggle'
        ? 'toggle .{cls} on me'
        : cmd === 'add'
          ? 'add .{cls} to me'
          : 'remove .{cls} from me';
    it(`tokenizes \`.{cls}\` as a class selector in \`${cmd}\``, () => {
      const node = parse(code, 'en') as SNode;
      expect(node.action).toBe(cmd);
      const p = roles(node).patient as { type?: string; value?: string; selectorKind?: string };
      expect(p.value).toBe('.{cls}');
      expect(p.type).toBe('selector');
    });
  }

  it('does not disturb a literal class selector', () => {
    expect((parse('toggle .active on me', 'en') as SNode).action).toBe('toggle');
    expect(roles(parse('toggle .active on me', 'en') as SNode).patient?.value).toBe('.active');
  });

  it('parses the real Toggleable(cls) behavior end to end', () => {
    const src = 'behavior Toggleable(cls)\n  on click\n    toggle .{cls} on me\n  end\nend';
    const node = parse(src, 'en') as unknown as {
      kind: string;
      parameters: string[];
      eventHandlers: SNode[];
      metadata?: { confidence?: number };
    };
    expect(node.kind).toBe('behavior');
    expect(node.parameters).toEqual(['cls']);
    expect(leaves(node.eventHandlers[0])).toEqual(['toggle']);
    expect(node.metadata?.confidence).toBeGreaterThan(0.7);
  });
});
