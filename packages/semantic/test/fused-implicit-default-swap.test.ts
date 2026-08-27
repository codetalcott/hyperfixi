/**
 * A role the MATCHER defaulted is not a capture the re-parse must preserve.
 *
 * When a fused event pattern's optional group does not fire,
 * `applyExtractionRules` fills the role from the schema and marks it
 * `implicit`. `toggle-event-vi-vso` is `khi {event} chuyển đổi {patient} vào
 * {destination?}` while the renderer emits vi's destination marker as `trên`,
 * so the group never matched and the pattern defaulted
 * `destination:reference=me(implicit)`.
 *
 * The [verb..clause boundary] re-parse then found the real thing —
 * `toggle-vi-full` binds `destination:selector=#menu` — but the superset guard
 * counted the DEFAULT as a fused capture that had to reappear with the same
 * value type, so `selector` vs `reference` read as a mismatch and the repair
 * vetoed itself. Implicit defaults are now exempt from that requirement.
 *
 * The swap's gain test is a union of two conditions, and each disjunct was
 * forced by a measured regression:
 *   (i)  MORE roles than the fused capture — the original test. Discounting
 *        implicit roles here re-broke every counted loop in 12 languages: the
 *        canonical `repeat-{L}-times` head binds `loopType:"times"` implicitly,
 *        so dropping it ties 1 > 1 and the head-only swap is rejected.
 *   (ii) more REAL roles — an upgrade from a default to an actual value, which
 *        is vi's case at an unchanged role count.
 * Neither may fire when the re-parse merely re-defaults what the fused capture
 * already defaulted: SOV `add @disabled to <button/> in me` keeps a fused
 * `destination:me(implicit)` whose real value is postposed OUTSIDE the
 * [verb..boundary] slice, so the re-parse defaults it too. Swapping there
 * consumes the clause and robs the trailing reclaim that does recover it
 * (ja/ko/hi form-disable-on-submit, caught by multilingual-roadmap-fixes).
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { CommandSemanticNode, SemanticNode } from '../src/types';

function findAll(node: SemanticNode | null, action: string): CommandSemanticNode[] {
  const out: CommandSemanticNode[] = [];
  const walk = (n: SemanticNode | null | undefined): void => {
    if (!n || typeof n !== 'object') return;
    if ((n as CommandSemanticNode).action === action) out.push(n as CommandSemanticNode);
    const rec = n as unknown as Record<string, unknown>;
    for (const key of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const kids = rec[key];
      if (Array.isArray(kids)) kids.forEach(k => walk(k as SemanticNode));
    }
  };
  walk(node);
  return out;
}

function role(node: CommandSemanticNode | undefined, name: string) {
  return node?.roles.get(name as never) as
    | { type?: string; value?: unknown; implicit?: boolean }
    | undefined;
}

describe('the re-parse may replace a defaulted role (vi)', () => {
  // Every one of these is a corpus row whose destination was silently `me`.
  const cases: ReadonlyArray<readonly [string, string, unknown]> = [
    ['on click toggle .open on #menu', 'toggle', '#menu'],
    ['on click toggle @hidden on #panel', 'toggle', '#panel'],
    ['on click toggle .expanded on closest .card', 'toggle', 'closest .card'],
  ];

  it.each(cases)('%s recovers its destination', (english, action, expected) => {
    const rendered = translate(english, 'en', 'vi');
    const parsed = parse(rendered, 'vi');
    expect(parsed, `vi: did not parse: ${rendered}`).not.toBeNull();
    const [cmd] = findAll(parsed, action);
    expect(cmd, `vi: no ${action} in: ${rendered}`).toBeDefined();
    const dest = role(cmd, 'destination');
    expect(dest?.value ?? (dest as { raw?: string } | undefined)?.raw, `vi kept the default`).toBe(
      expected
    );
    // The distinguishing half: `me` is the schema default, so a value check
    // alone would pass on the broken parse for a `on me` row.
    expect(dest?.implicit, 'vi defaulted the destination instead of reading it').not.toBe(true);
  });
});

describe('the asymmetry holds — a counted loop still swaps in', () => {
  // Its canonical head binds `loopType` IMPLICITLY. Discounting implicit roles
  // on the re-parse side as well ties the count and rejects the swap; these
  // rows are the measurement that says so.
  it.each(['es', 'th', 'ms', 'vi', 'pl'] as const)('%s keeps quantity=3', language => {
    const rendered = translate('on click repeat 3 times add "<p>Line</p>" to me', 'en', language);
    const [loop] = findAll(parse(rendered, language), 'repeat');
    expect(loop, `${language}: no repeat in: ${rendered}`).toBeDefined();
    expect(role(loop, 'quantity')?.value, `${language} lost the loop count`).toBe(3);
  });
});

describe('a re-parse that only re-defaults must not win the clause', () => {
  // The real destination is postposed outside the [verb..boundary] slice, so
  // both the fused capture and the re-parse default it to `me`. The swap must
  // stand down and leave the clause to the trailing DESTINATION/SOURCE reclaim.
  const FORM_DISABLE: ReadonlyArray<readonly [string, string]> = [
    ['ja', '@disabled を 送信 で 追加 <button/> in me に それから "Submitting..." を <button/> in me に 置く'],
    ['ko', '@disabled 를 제출 할 때 추가 <button/> in me 에 그러면 "Submitting..." 를 <button/> in me 에 넣다'],
    ['hi', '@disabled को जमा पर जोड़ें <button/> in me में फिर "Submitting..." को <button/> in me में रखें'],
  ];

  it.each(FORM_DISABLE)('[%s] keeps the reclaimed <button/> destination', (language, line) => {
    const [added] = findAll(parse(line, language), 'add');
    expect(added, `${language}: no add parsed`).toBeDefined();
    expect(role(added, 'destination')?.value, `${language} lost the reclaim to the swap`).toBe(
      '<button/>'
    );
  });
});

describe('the verb-final safety rail still rejects a defaulting re-parse (qu)', () => {
  // qu fronts the patient AHEAD of the event, so it sits outside the
  // [verb..boundary] slice and the re-parse of `yapachiy 10` fills a DEFAULT
  // `patient:reference=me`. That must never replace the real capture — the
  // fused role here is a genuine selector, not an implicit default, so
  // `preservesFused` still rejects it on type.
  it('keeps the fronted #score patient', () => {
    const rendered = translate('on click increment #score by 10', 'en', 'qu');
    const [inc] = findAll(parse(rendered, 'qu'), 'increment');
    expect(inc, `qu: no increment in: ${rendered}`).toBeDefined();
    expect(role(inc, 'patient')?.value, 'qu replaced the real patient with a default').toBe(
      '#score'
    );
    expect(role(inc, 'quantity')?.value).toBe(10);
  });
});
