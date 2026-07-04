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
  it('contains exactly the 47 curated patterns', () => {
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
        // Session-9 expansion wave 2d: `next .sel` folds to a positional call
        // expression. make-toast-element still out (at-end-of positional put).
        'dropdown-toggle',
        // Session-10 expansion wave 3: positional-phrase patients — the
        // pattern matcher captures `closest <sel>` / `the next <sel>`, so
        // `hide closest .modal` parses and executes (PATTERN_SETUP gives #btn
        // a .modal ancestor).
        'modal-close-button',
        // Session-10 expansion wave 3b: the at-end-of positional put — en
        // `at end of`/`at start of` patterns + the parseBodyWithClauses
        // end-noun guard + putMapper manner + core multi-word modifier keys
        // + contextReference body. The last R2 candidate excluded for an
        // unusable en reference is now in.
        'make-toast-element',
        // Expansion wave 4 (the deferred S1 follow-up): the first non-click,
        // event-reading cell. buildEventHandler binds the custom `success`
        // event (carried as an expression role) instead of defaulting to click;
        // PATTERN_TRIGGER dispatches a CustomEvent whose detail.message the
        // handler reads. set @role on the #sr-announce scope landed in S1.
        'announce-screen-reader',
        // Session-12 expansion wave 5: `remove me` (bare self-removal).
        'remove-element',
        // Session-13 expansion wave 6: six wave-5 "worklist" candidates that, when
        // re-grounded against a freshly populated patterns.db, match the en effect in
        // ALL 23 languages (the wave-5 divergence counts were measured against a stale
        // committed db — see the wave-6 note in execution-validator.ts). multiple-events,
        // put-after, put-before remain out (real cross-language execution divergences).
        'next-element',
        'toggle-aria-expanded',
        'set-opacity',
        'set-transform',
        'accordion-toggle',
        'caret-var-on-target',
        // Session-13 expansion wave 7: multiple-events (`on click or
        // keypress[...] toggle .active`), the third wave-5 worklist divergence,
        // now fixed by the semantic or-clause excision pre-pass + ja `または`→or
        // tokenizer fix + hi/bn OR_KEYWORDS. All 23 langs match the en click effect.
        'multiple-events',
        // Session-14 expansion wave 8: put-before / put-after (`put X before/after me`),
        // the last two wave-5 worklist divergences. Position word captured as `manner`
        // across SVO/SOV (#516) + handcrafted VSO put-event patterns for ar/tl/uk.
        'put-before',
        'put-after',
        // Wave 9 (R2-coverage sweep): three patterns whose en reference runs with
        // a clean deterministic signature and already match in all 23 languages —
        // pure coverage, no parser/dict fix. See the wave-9 note in
        // execution-validator.ts (the *opacity hide/show strategies are
        // synchronous, not the excluded async transition family).
        'chained-access-possessive-dot',
        'hide-with-transition',
        'show-with-transition',
        // Wave 10 (SOV literal-role-extraction arc, PRs #560/#561): the two R2
        // blockers — the fronted append content literal (bogus `event` role in
        // the body-clause marker lookup) and the trailing bare increment amount
        // (unconsumed by every fused event pattern, defaulted to 1) — now
        // captured in all 23 languages. See the wave-10 note in
        // execution-validator.ts.
        'append-content',
        'increment-by-amount',
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

  it('the announce-screen-reader cell executes via its custom-event trigger', async () => {
    // First non-click cell: `on success put event.detail.message into
    // #sr-announce set @role to "alert" on #sr-announce`. PATTERN_TRIGGER
    // dispatches a `success` CustomEvent carrying detail.message; the handler
    // writes that text into #sr-announce and sets role=alert on it. Locks both
    // the per-cell trigger wiring and the two-line effect signature.
    const res = await validator.execute(
      'announce-screen-reader',
      'on success put event.detail.message into #sr-announce set @role to "alert" on #sr-announce',
      'en'
    );
    expect(res.error).toBeUndefined();
    expect(res.effects).toEqual([
      'Δ#sr-announce cls[] attr[id=sr-announce,role=alert] style[] text[Saved successfully]',
    ]);
  });

  it('a click trigger does not fire the success-only handler (trigger isolation)', async () => {
    // The default click dispatch must NOT execute a handler bound to a custom
    // event — proves PATTERN_TRIGGER actually routes the event name, rather than
    // the handler firing on any event.
    const clickOnly = await validator.execute(
      'toggle-class-basic', // a click cell, but force the wrong source text:
      'on success add .x to me',
      'en'
    );
    // No PATTERN_TRIGGER for toggle-class-basic → click dispatched → success
    // handler never runs → empty signature.
    expect(clickOnly.effects).toEqual([]);
  });

  it('wave-6 en references execute with their locked signatures', async () => {
    // The six wave-6 additions. Each en reference must produce a non-empty,
    // deterministic signature against the existing fixture (the foundation every
    // language is scored against). next/closest positionals fall back to `me`
    // when no match exists in the fixture; set *opacity/*transform write inline
    // style; caret-var-on-target clears #btn text (undefined `^count`).
    const cases: ReadonlyArray<[string, string, string[]]> = [
      [
        'next-element',
        'on click add .highlight to next <li/>',
        ['Δli[9] cls[active highlight items] attr[] style[] text[]'],
      ],
      [
        'toggle-aria-expanded',
        'on click toggle @aria-expanded on me toggle .open on next .panel',
        ['Δ#btn cls[open] attr[aria-expanded=,id=btn] style[] text[Click]'],
      ],
      [
        'set-opacity',
        'on click set my *opacity to 0.5',
        ['Δ#btn cls[] attr[id=btn] style[opacity: 0.5;] text[Click]'],
      ],
      [
        'set-transform',
        'on click set my *transform to "rotate(45deg)"',
        ['Δ#btn cls[] attr[id=btn] style[transform: rotate(45deg);] text[Click]'],
      ],
      [
        'accordion-toggle',
        'on click toggle .open on closest .accordion-item toggle @aria-expanded',
        ['Δ#btn cls[open] attr[aria-expanded=,id=btn] style[] text[Click]'],
      ],
      [
        'caret-var-on-target',
        'on click put ^count on #host into me',
        ['Δ#btn cls[] attr[id=btn] style[] text[]'],
      ],
    ];
    for (const [id, code, expected] of cases) {
      const res = await validator.execute(id, code, 'en');
      expect(res.error, `${id} errored: ${res.error}`).toBeUndefined();
      expect(res.effects, `${id} signature`).toEqual(expected);
    }
  });

  it('a localized translation reproduces the wave-6 en signature (ms next-element)', async () => {
    // This is the wave-5 worklist's recorded ms "divergence": it only appeared
    // because the committed db carried an UNTRANSLATED `to next` (a stale snapshot).
    // A fresh populate localizes it (`ke seterusnya`), and it executes identically
    // to en — the reason next-element joins the subset with no parser/dict fix.
    const en = await validator.execute(
      'next-element',
      'on click add .highlight to next <li/>',
      'en'
    );
    const ms = await validator.execute(
      'next-element',
      'apabila click tambah .highlight ke seterusnya <li/>',
      'ms'
    );
    expect(ms.error, `ms errored: ${ms.error}`).toBeUndefined();
    expect(ms.effects).toEqual(en.effects);
  });

  it('wave-7 multiple-events: en + a translation toggle .active on click', async () => {
    // `on click or keypress[...] toggle .active` — the multi-event handler. R2
    // dispatches click only, so both events bind but only the click effect is
    // measured: .active toggled onto #btn. A translation whose `or`-clause used to
    // become a phantom command (it `o`) or mangle (ko) now reproduces it exactly.
    const en = await validator.execute(
      'multiple-events',
      'on click or keypress[key=="Enter"] toggle .active',
      'en'
    );
    expect(en.error).toBeUndefined();
    expect(en.effects).toEqual(['Δ#btn cls[active] attr[id=btn] style[] text[Click]']);
    const it = await validator.execute(
      'multiple-events',
      'su clic o keypress[key=="Enter"] commutare .active',
      'it'
    );
    expect(it.error, `it errored: ${it.error}`).toBeUndefined();
    expect(it.effects).toEqual(en.effects);
  });

  it('wave-8 put-before/after: en inserts the <p> at the right offset; a VSO translation matches', async () => {
    // `put "<p>New</p>" before/after me` — the position word must land the content
    // before/after #btn (not inside it). before → +p[1] (preceding #btn's parent
    // diff), after → +p[2]. ar (VSO) used to drop the position (fused VSO event
    // pattern consumed قبل/بعد as a plain destination marker → inserted INTO me);
    // the handcrafted put-event-ar-vso-before/after now captures manner, so ar
    // reproduces the en effect exactly.
    for (const [id, enCode, arCode] of [
      ['put-before', 'on click put "<p>New</p>" before me', 'ضع "<p>New</p>" قبل أنا عند نقر'],
      ['put-after', 'on click put "<p>New</p>" after me', 'ضع "<p>New</p>" بعد أنا عند نقر'],
    ] as const) {
      const en = await validator.execute(id, enCode, 'en');
      expect(en.error, `en ${id} errored: ${en.error}`).toBeUndefined();
      expect(en.effects.join(), `en ${id} should insert a <p>`).toContain('text[New]');
      const ar = await validator.execute(id, arCode, 'ar');
      expect(ar.error, `ar ${id} errored: ${ar.error}`).toBeUndefined();
      expect(ar.effects, `ar ${id} must reproduce en`).toEqual(en.effects);
    }
  });

  it('wave-9 en references execute with their locked signatures', async () => {
    // The three wave-9 additions. Each en reference must produce a non-empty,
    // deterministic signature against the existing fixture. The `*opacity`
    // hide/show STRATEGIES are synchronous (no timer): hide writes display:none
    // + a data-original-display marker on #btn; show adds the visibility class
    // on #modal. chained-access-possessive-dot writes the parent (.card) display.
    const cases: ReadonlyArray<[string, string, string[]]> = [
      [
        'chained-access-possessive-dot',
        'on click set my.parentElement.style.display to "none"',
        ['Δdiv[0] cls[card] attr[] style[display: none;] text[]'],
      ],
      [
        'hide-with-transition',
        'on click hide me with *opacity',
        ['Δ#btn cls[] attr[data-original-display=,id=btn] style[display: none;] text[Click]'],
      ],
      [
        'show-with-transition',
        'on click show #modal with *opacity',
        ['Δ#modal cls[show] attr[id=modal] style[] text[]'],
      ],
    ];
    for (const [id, code, expected] of cases) {
      const res = await validator.execute(id, code, 'en');
      expect(res.error, `${id} errored: ${res.error}`).toBeUndefined();
      expect(res.effects, `${id} signature`).toEqual(expected);
    }
  });

  it('wave-10 en references execute with their locked signatures; SOV translations match', async () => {
    // The two SOV literal-role-extraction blockers (PRs #560/#561). The en
    // signatures anchor on the wave-10 fixture elements (appended last, so all
    // pre-existing document-order indices are preserved). The ja translations
    // lock the exact failure class each fix closed: append's fronted content
    // literal (was a bogus `event` role → runtime "append requires content")
    // and increment's trailing bare amount (was dropped → +1 instead of +10).
    const cases: ReadonlyArray<[string, string, string, string]> = [
      [
        'append-content',
        'on click append "<li>Item</li>" to #list',
        '"<li>Item</li>" を クリック で 末尾追加 #list に',
        'text[Item]',
      ],
      [
        'increment-by-amount',
        'on click increment #score by 10',
        '#score を クリック で 増加 10',
        'text[10]',
      ],
    ];
    for (const [id, enCode, jaCode, marker] of cases) {
      const en = await validator.execute(id, enCode, 'en');
      expect(en.error, `en ${id} errored: ${en.error}`).toBeUndefined();
      expect(en.effects.join(), `en ${id} signature must carry ${marker}`).toContain(marker);
      const ja = await validator.execute(id, jaCode, 'ja');
      expect(ja.error, `ja ${id} errored: ${ja.error}`).toBeUndefined();
      expect(ja.effects, `ja ${id} must reproduce en`).toEqual(en.effects);
    }
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
