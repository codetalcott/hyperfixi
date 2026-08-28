/**
 * qu needed a repeat-until head it could RENDER, not only one it could read.
 *
 * Two qu heads exist to read the i18n transformer's
 * `hayk_akama ruway <event> ta <source> manta kutipay` output, and they carry
 * that junk prefix IN-PATTERN — `hayk_akama` tokenizes as `hayk _ a kama`, so
 * the prefix is matched literally. The renderer chooses among the patterns
 * registered for a command, so it picked one of those and emitted the junk as a
 * surface:
 *
 *   qu   maykama mousedown hayk _ a until event mouseup ta manta repeat …
 *
 * That is not Quechua, and it does not re-parse: `repeat-until-event` was the
 * only row of its family qu could not read back. The other SOV five have a
 * proper head from `repeatUntilHeadSOV`; qu now has the same shape in its own
 * words (`kama ruway {event} ta repeat [{source} manta]`), registered ahead of
 * the tolerances, which keep working.
 *
 * It cannot reuse `repeatUntilHeadSOV` directly: that builder derives the id
 * `repeat-{lang}-until-head`, which is exactly the tolerance's id, and the
 * registration silently REPLACES it — measured, the i18n form then failed to
 * parse at all.
 */

import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parse, parseSemantic, render } from '../src/index';
import type { SemanticNode } from '../src/types';

const SOURCE = 'on mousedown repeat until event mouseup increment #counter wait 100ms end';

function findRepeat(node: SemanticNode | null): SemanticNode | null {
  if (!node) return null;
  if ((node as { action?: string }).action === 'repeat') return node;
  for (const child of [
    ...((node as { body?: SemanticNode[] }).body ?? []),
    ...((node as { statements?: SemanticNode[] }).statements ?? []),
  ]) {
    const hit = findRepeat(child);
    if (hit) return hit;
  }
  return null;
}

describe('the rendered surface is Quechua, and reads back', () => {
  it('renders `kama ruway <event> ta repeat`, with no `hayk _ a` junk', () => {
    const rendered = render(parseSemantic(SOURCE, 'en')!.node!, 'qu');
    expect(rendered, 'the parse tolerance leaked into the surface').not.toContain('hayk');
    expect(rendered).toContain('kama ruway mouseup ta repeat');
  });

  it('round-trips', () => {
    const reference = parseSemantic(SOURCE, 'en')!.node!;
    const rendered = render(reference, 'qu');
    const reparsed = parseSemantic(rendered, 'qu')?.node;
    expect(reparsed, `qu did not re-parse: ${rendered}`).toBeTruthy();
    expect(render(reparsed!, 'en')).toBe(render(reference, 'en'));
  });
});

describe('the i18n tolerances still read their own form', () => {
  // The reason the canonical head needs its own id: registering it as
  // `repeat-qu-until-head` replaces this one.
  it('parses `hayk_akama ruway pointerup ta qillqa manta kutipay`', () => {
    const node = findRepeat(parse('hayk_akama ruway pointerup ta qillqa manta kutipay', 'qu'));
    expect(node).not.toBeNull();
    expect((node as { roles: Map<string, unknown> }).roles.get('loopType')).toMatchObject({
      value: 'until-event',
    });
    expect((node as { roles: Map<string, unknown> }).roles.get('source')).toBeDefined();
  });
});
