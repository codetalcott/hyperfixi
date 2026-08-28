/**
 * A hand-crafted `remove` pattern that had outlived its generated sibling — and
 * was actively wrong in the meantime.
 *
 * `remove-bn-full` (`{patient} কে সরান`, priority 100) carried the same tokens
 * as `remove-bn-generated-simple`, minus a verb alternative and minus the typed
 * patient slot. Untyped, that leading role takes an EXPRESSION, so on
 *
 *   আগের <li/> থেকে .highlight কে সরান     ("remove .highlight from previous <li/>")
 *
 * it swallowed the positional run AND the source clause behind it — patient =
 * `previous <li/> থেকে .highlight` — then found its own `কে` and won the
 * priority tie against `remove-bn-generated`, which had bound BOTH roles
 * correctly. The bn source marker `থেকে` came out untranslated in the English,
 * which is the visible symptom.
 *
 * KNOWN RESIDUAL: the corpus row is a HANDLER, and the fused
 * `remove-event-bn-sov` pattern has the same untyped patient slot with no
 * pre-verb source group (the generated SOV shape only offers a POST-verb one).
 * So `previous-element` still sits on the kept-row ratchet; what this clears is
 * the BARE surface, which the bare-render gate does measure. Pinned below so the
 * two halves stay visible apart.
 */

import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parse, parseSemantic, render } from '../src/index';
import type { CommandSemanticNode } from '../src/types';

describe('the bare surface binds both roles', () => {
  it('reads `আগের <li/> থেকে .highlight কে সরান` as remove(patient, source)', () => {
    const node = parse('আগের <li/> থেকে .highlight কে সরান', 'bn') as CommandSemanticNode | null;
    expect(node).not.toBeNull();
    expect(node!.roles.get('patient' as never)).toMatchObject({ value: '.highlight' });
    expect(node!.roles.get('source' as never)).toMatchObject({ raw: 'previous <li/>' });
  });

  it('round-trips the bare command', () => {
    const reference = parseSemantic('remove .highlight from previous <li/>', 'en')!.node!;
    const rendered = render(reference, 'bn');
    const reparsed = parseSemantic(rendered, 'bn')?.node;
    expect(reparsed, `bn did not re-parse: ${rendered}`).toBeTruthy();
    expect(render(reparsed!, 'en')).toBe(render(reference, 'en'));
  });

  it('still reads the plain form the deleted pattern covered', () => {
    // `remove-bn-generated-simple` carries the same tokens; this is the whole of
    // what `remove-bn-full` was for.
    const node = parse('.active কে সরান', 'bn') as CommandSemanticNode | null;
    expect(node?.action).toBe('remove');
    expect(node!.roles.get('patient' as never)).toMatchObject({ value: '.active' });
  });
});

describe('KNOWN RESIDUAL — failing-when-fixed', () => {
  it('the HANDLER form still loses the source', () => {
    // The fused `remove-event-bn-sov` slot has the same untyped patient and only
    // a POST-verb source group, so the renderer's source-first body is not a
    // shape it covers. When this flips, `previous-element[bn]` leaves the
    // kept-row baseline — delete the pin and say so.
    const reference = parseSemantic('on click remove .highlight from previous <li/>', 'en')!.node!;
    const rendered = render(reference, 'bn');
    const reparsed = parseSemantic(rendered, 'bn')?.node;
    expect(
      reparsed ? render(reparsed, 'en') : null,
      `bn now round-trips the handler (${rendered}) — remove this pin`
    ).not.toBe(render(reference, 'en'));
  });
});
