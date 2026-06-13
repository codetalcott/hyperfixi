/**
 * R2 — execution smoke validator locks (session 5).
 *
 * Locks three things:
 *  1. The curated subset's MEMBERSHIP — expanding/shrinking it recalibrates
 *     every language's avgExecutionFidelity, so it must be a deliberate,
 *     baseline-regenerating change, never an accident.
 *  2. The en references EXECUTE: parse → buildAST → runtime.execute installs
 *     the click handler in jsdom and dispatch produces a non-empty,
 *     deterministic DOM-effect signature (the foundation every language is
 *     scored against).
 *  3. Known cross-language behavior: a faithful translation reproduces the en
 *     signature exactly; a translation that drops the destination role lands
 *     its effect on `me` and MUST diverge (the failure class R2 exists to
 *     catch — R0/R1 score some of these 1.0).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ExecutionValidator, EXECUTION_SUBSET, loadExecutionSubset } from './execution-validator';

describe('R2 execution subset (lock)', () => {
  it('contains exactly the 28 curated patterns', () => {
    // Changing this list recalibrates avgExecutionFidelity for every language.
    // If you expand the subset, regenerate the baseline (--save-baseline) in
    // the SAME PR and update this lock.
    expect([...EXECUTION_SUBSET].sort()).toEqual(
      [
        'add-class-basic',
        'add-class-to-other',
        'remove-class-basic',
        'remove-class-from-all',
        'toggle-class-basic',
        'toggle-class-on-other',
        'put-content-basic',
        'show-element',
        'hide-element',
        'increment-counter',
        'decrement-counter',
        'modal-open',
        'tabs-basic',
        'set-text-possessive-dot',
        'set-inner-html-possessive-dot',
        'set-style',
        'closest-ancestor',
        // Session-8 expansion wave 1 (multi-command): see the eligibility
        // probe notes in execution-validator.ts for the candidates excluded
        // because their en reference doesn't execute.
        'tabs-content',
        'accordion-exclusive',
        // Session-9 expansion wave 2 (control-flow): en if/else now folds to a
        // conditional and executes (matches/exists/is-empty condition forms +
        // the propertyAccess runtime evaluator). unless-condition stays out
        // (unless is deliberately not folded).
        'if-condition',
        'if-matches',
        'if-exists',
        'modal-close-backdrop',
        // Session-9 expansion wave 2b (@attr family): the semantic value
        // converter / expression parser now emit canonical attributeAccess
        // nodes, so these en references execute. set-text-basic stays out
        // (jsdom doesn't implement innerText — harness limitation).
        'set-attribute',
        'toggle-visibility',
        'tabs-aria',
        // Session-9 expansion wave 2c: halt-the-event patient preserved by the
        // semantic halt mapper (handler continues); make element literals carry
        // their markup on `raw`. make-toast-element stays out (positional
        // `put it at end of body` — the dropdown-toggle positional gap).
        'halt-propagation',
        'make-element',
      ].sort()
    );
  });
});

describe('R2 execution validator (lock)', () => {
  const validator = new ExecutionValidator();

  beforeAll(async () => {
    await validator.initialize();
  });

  it('en reference executes: on click add .highlight to me', async () => {
    const res = await validator.execute('add-class-basic', 'on click add .highlight to me', 'en');
    expect(res.error).toBeUndefined();
    expect(res.effects).toEqual(['Δ#btn cls[highlight] attr[id=btn] style[] text[Click]']);
  });

  it('is deterministic: two runs of the same pattern produce identical signatures', async () => {
    const a = await validator.execute('toggle-class-basic', 'on click toggle .active', 'en');
    const b = await validator.execute('toggle-class-basic', 'on click toggle .active', 'en');
    expect(a.effects).toEqual(b.effects);
    expect(a.effects.length).toBeGreaterThan(0);
  });

  it('a faithful translation reproduces the en signature exactly (es)', async () => {
    const en = await validator.execute('add-class-basic', 'on click add .highlight to me', 'en');
    const es = await validator.execute('add-class-basic', 'en clic agregar .highlight a yo', 'es');
    expect(es.effects).toEqual(en.effects);
  });

  it('a dropped destination role diverges (the R2 failure class)', async () => {
    // en targets #menu; a translation that loses the destination acts on `me`
    // (#btn) instead — parse-level fidelity can score this 1.0, execution
    // cannot. Locks that the effect signature keys by target element.
    const en = await validator.execute(
      'toggle-class-on-other',
      'on click toggle .open on #menu',
      'en'
    );
    const meInstead = await validator.execute(
      'toggle-class-on-other',
      'on click toggle .open',
      'en'
    );
    expect(en.effects.join()).toContain('#menu');
    expect(meInstead.effects.join()).toContain('#btn');
    expect(meInstead.effects).not.toEqual(en.effects);
  });

  it('wave-2 control-flow en references execute with non-empty signatures', async () => {
    // The else-branch fires (btn has no .active): conditional fold + branch
    // selection are live, not just parsing.
    const ifCond = await validator.execute(
      'if-condition',
      'on click if I match .active then remove .active else add .active end',
      'en'
    );
    expect(ifCond.error).toBeUndefined();
    expect(ifCond.effects.join()).toContain('#btn cls[active');

    // The PATTERN_SETUP makes #btn the backdrop, so the condition is true and
    // hide produces the effect.
    const backdrop = await validator.execute(
      'modal-close-backdrop',
      'on click if target matches .modal-backdrop hide .modal-backdrop end',
      'en'
    );
    expect(backdrop.error).toBeUndefined();
    expect(backdrop.effects.length).toBeGreaterThan(0);
  });

  it('a parse failure comes back as an error, never a throw', async () => {
    const res = await validator.execute('bogus', 'completely unparseable gibberish', 'en');
    expect(res.error).toBeDefined();
    expect(res.effects).toEqual([]);
  });

  it('loadExecutionSubset returns en source for every curated pattern', async () => {
    const sources = await loadExecutionSubset(['en']);
    const en = sources.get('en')!;
    for (const id of EXECUTION_SUBSET) {
      expect(en.get(id), `missing en source for ${id}`).toBeTruthy();
    }
  });
});
