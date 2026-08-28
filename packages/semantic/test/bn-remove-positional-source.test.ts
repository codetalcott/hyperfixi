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
 * The HANDLER half was a second, separate gap, pinned here failing-when-fixed
 * until it cleared: the fused SOV shape offered only a POST-verb source group,
 * because that is where the i18n transformer emits a from-phrase, while the
 * semantic renderer emits it BEFORE the patient. The generator now adds the
 * pre-verb source group as the twin of the destination one it already had.
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

describe('the HANDLER form binds them too — PROMOTED from a pin', () => {
  // The fused SOV shape had only a POST-verb source group, because that is where
  // the i18n transformer emits a from-phrase; the semantic renderer emits it
  // BEFORE the patient, a shape no fused pattern covered. The generator now adds
  // the pre-verb source group as the twin of the destination one it already had.
  it.each(['bn', 'hi', 'ja', 'ko', 'qu', 'tr', 'th', 'zh', 'de', 'es'])('%s', language => {
    const reference = parseSemantic('on click remove .highlight from previous <li/>', 'en')!.node!;
    const rendered = render(reference, language);
    const reparsed = parseSemantic(rendered, language)?.node;
    expect(reparsed, `${language} did not re-parse: ${rendered}`).toBeTruthy();
    expect(render(reparsed!, 'en')).toBe(render(reference, 'en'));
  });
});
