/**
 * The renderer's pattern choice counts the slots nested inside optional groups.
 *
 * `findBestPattern` scored only TOP-LEVEL role tokens. Every `[for {duration}]`,
 * `[by {quantity}]`, `[with {style}]` group lives one level down, so a pattern
 * that carries the slot and a handcrafted one that does not scored IDENTICALLY,
 * and the tie fell to registration order.
 *
 * `toggle .loading for 2s` is the clearest case: `toggle-es-generated` has a
 * `[{duration}]` group and `toggle-es-full` does not, both at priority 100 — so
 * the render came out `alternar .loading` and the duration was gone. Not
 * mistranslated: absent, with nothing in the output to notice. Same shape for
 * `increment #score by 10` in qu/th/zh.
 *
 * A nested match scores HALF a top-level one. That is not a tuning knob for this
 * corpus so much as the honest weight — a slot inside an optional group is
 * weaker evidence that the pattern is the right shape than a slot the pattern
 * requires. It was measured across the whole corpus: at full weight the change
 * is +19/−4 (it re-orders the pl `behavior Resizable` handler and three qu
 * positional rows), at half weight +11/−0.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { CommandSemanticNode } from '../src/types';

const LANGUAGES = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

/** The languages whose handcrafted pattern was winning the tie. */
const WAS_DROPPING_DURATION = ['es', 'it', 'pl', 'ru', 'th', 'uk', 'vi', 'zh'] as const;
const WAS_DROPPING_QUANTITY = ['qu', 'th', 'zh'] as const;

describe('an optional role reaches the rendered surface', () => {
  it.each(WAS_DROPPING_DURATION)('%s renders toggle\'s duration', language => {
    // Pre-change: `alternar .loading` — the `for 2s` had no slot in the pattern
    // the renderer chose, so it was dropped without a diagnostic.
    const rendered = translate('toggle .loading for 2s', 'en', language);
    expect(rendered, `${language} dropped the duration`).toContain('2s');
  });

  it.each(WAS_DROPPING_QUANTITY)('%s renders increment\'s quantity', language => {
    const rendered = translate('increment #score by 10', 'en', language);
    expect(rendered, `${language} dropped the quantity`).toContain('10');
  });

  it.each(WAS_DROPPING_DURATION)('%s round-trips toggle.duration', language => {
    // Asserted on the HANDLER form, which is the corpus row
    // (`toggle-class-temporary`). The bare command re-parses the duration in
    // seven of the eight; th's `toggle-th-simple` has no duration slot of its
    // own, a parse-side gap this render fix does not touch.
    const rendered = translate('on click toggle .loading for 2s', 'en', language);
    const node = parse(rendered, language) as { body?: CommandSemanticNode[] } | null;
    const toggle = node?.body?.find(b => b.action === 'toggle');
    expect(toggle, `${language}: rendered toggle did not re-parse: ${rendered}`).toBeDefined();
    expect(toggle!.roles.has('duration' as never), `${language} lost the duration`).toBe(true);
  });
});

describe('the plain forms are unchanged', () => {
  // A pattern is preferred for CARRYING a slot, never for filling it: a node
  // without the role must still choose the same pattern it always did.
  it.each(LANGUAGES)('%s still renders a bare toggle with no stray words', language => {
    const bare = translate('toggle .loading', 'en', language);
    expect(bare, `${language} leaked a duration into a bare toggle`).not.toContain('2s');
  });

  it.each(LANGUAGES)('%s round-trips a bare toggle', language => {
    // hi parses a bare `.active को मैं पर टॉगल` as an event handler (its `पर` is
    // both the on-marker and the destination marker) — pre-existing and
    // untouched here, so assert on the toggle wherever it lands in the tree.
    const rendered = translate('toggle .active', 'en', language);
    const root = parse(rendered, language) as
      | (CommandSemanticNode & { body?: CommandSemanticNode[] })
      | null;
    const toggle = root?.action === 'toggle' ? root : root?.body?.find(b => b.action === 'toggle');
    expect(toggle, `${language}: bare toggle did not re-parse: ${rendered}`).toBeDefined();
    expect(toggle!.roles.get('patient' as never)).toMatchObject({ value: '.active' });
  });
});

describe('a missing REQUIRED role is still penalised', () => {
  // The −50 penalty must stay top-level-only. Applying it inside a group would
  // punish a pattern for an optional slot the node does not fill — which is
  // every pattern, for most nodes — and the handcrafted `[en {destination}]`
  // groups write their role token bare (no `optional` flag), so the flag cannot
  // be trusted one level down.
  it('es renders a source-less remove without a from-phrase', () => {
    const rendered = translate('remove .active', 'en', 'es');
    expect(rendered).not.toMatch(/\bde\s*$/u);
    const node = parse(rendered, 'es') as CommandSemanticNode;
    expect(node.action).toBe('remove');
    expect(node.roles.get('patient' as never)).toMatchObject({ value: '.active' });
  });

  it('es still renders a remove WITH its source', () => {
    const rendered = translate('remove .active from #panel', 'en', 'es');
    expect(rendered).toContain('#panel');
    const node = parse(rendered, 'es') as CommandSemanticNode;
    expect(node.roles.get('source' as never)).toMatchObject({ value: '#panel' });
  });
});
