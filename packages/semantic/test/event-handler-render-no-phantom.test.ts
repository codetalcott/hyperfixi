/**
 * Regression lock — event-handler rendering must not inject a phantom command.
 *
 * Bug (MULTILINGUAL_BEHAVIORS_PLAN.md Phase 1): the 'on' pattern set contains
 * fused `<command>-event-*` patterns (e.g. `toggle-event-ko-sov-simple`,
 * `<event> 할 때 토글`) used to PARSE single-line fused commands. The renderer
 * selected one to render a multi-statement handler, emitting its trailing verb
 * literal as a phantom `toggle` ahead of the real body — `切り替え / 토글 /
 * değiştir / بدّل / переключить`. The fix restricts event-handler rendering to
 * pure trigger patterns (renderer.ts `findBestPattern`).
 *
 * These languages were the affected (non-SVO-Latin) set.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src';

const AFFECTED = ['ja', 'ko', 'tr', 'ar', 'ru'] as const;

/** Multiset of leaf command actions in a parsed semantic node tree. */
function leafActions(node: unknown, acc: string[] = []): string[] {
  if (!node) return acc;
  if (Array.isArray(node)) {
    for (const n of node) leafActions(n, acc);
    return acc;
  }
  const n = node as {
    kind?: string;
    action?: string;
    statements?: unknown;
    body?: unknown;
    thenBody?: unknown;
    elseBody?: unknown;
  };
  switch (n.kind) {
    case 'command':
      if (n.action) acc.push(n.action);
      break;
    case 'compound':
      leafActions(n.statements, acc);
      break;
    case 'conditional':
      acc.push('if');
      leafActions(n.thenBody ?? n.body, acc);
      leafActions(n.elseBody, acc);
      break;
    case 'loop':
      acc.push('repeat');
      leafActions(n.body, acc);
      break;
    case 'event-handler':
      leafActions(n.body, acc);
      break;
  }
  return acc;
}

const sorted = (xs: string[]) => [...xs].sort();

describe('event-handler render — no phantom command', () => {
  const cases = [
    'on click add .active to me then remove .hidden from me',
    'on mouseenter add .hover to me',
    'on click if I match .open then remove .open from me end',
  ];

  for (const code of cases) {
    const reference = sorted(leafActions(parse(code, 'en')));

    for (const lang of AFFECTED) {
      it(`${lang}: "${code}" round-trips with no added/dropped command`, () => {
        const translated = translate(code, 'en', lang);
        const roundTripped = sorted(leafActions(parse(translated, lang)));
        // Multiset equality catches BOTH a phantom add and a silent drop.
        expect(roundTripped).toEqual(reference);
      });
    }
  }

  it('does not emit the native toggle verb when the source has no toggle', () => {
    // The exact phantom literals from the bug, per language.
    const toggleVerb: Record<string, string> = {
      ja: '切り替え',
      ko: '토글',
      tr: 'değiştir',
      ar: 'بدّل',
      ru: 'переключить',
    };
    const code = 'on click add .active to me';
    for (const lang of AFFECTED) {
      expect(translate(code, 'en', lang)).not.toContain(toggleVerb[lang]);
    }
  });

  it('still renders a genuine single toggle exactly once (no double-toggle)', () => {
    const reference = sorted(leafActions(parse('on click toggle .active', 'en')));
    expect(reference).toEqual(['toggle']);
    for (const lang of AFFECTED) {
      const translated = translate('on click toggle .active', 'en', lang);
      expect(sorted(leafActions(parse(translated, lang)))).toEqual(['toggle']);
    }
  });
});

describe('event-handler render — no duplicated trigger marker (Phase 2)', () => {
  // bn (তে), hi (पर), th (เมื่อ) use the same word for the trigger keyword and the
  // event role marker, so the generator emitted it twice (`<event> তে তে`). The
  // duplicate paired with the following token as a phantom command (`তে আমি` →
  // `on me`; `เมื่อ click` → a stray `click` command). `buildTokens` now collapses
  // adjacent identical literals.
  const DOUBLED = ['bn', 'hi', 'th'] as const;
  const cases = [
    'on click add .active to me',
    'on click toggle .open on #panel',
    'on click add .a to me then remove .b from me',
  ];

  for (const code of cases) {
    const reference = sorted(leafActions(parse(code, 'en')));
    for (const lang of DOUBLED) {
      it(`${lang}: "${code}" — no phantom trigger command`, () => {
        const translated = translate(code, 'en', lang);
        expect(sorted(leafActions(parse(translated, lang)))).toEqual(reference);
      });
    }
  }

  it('does not render the trigger marker twice in a row', () => {
    const doubled: Record<string, string> = { bn: 'তে তে', hi: 'पर पर', th: 'เมื่อ เมื่อ' };
    for (const lang of DOUBLED) {
      expect(translate('on click add .active to me', 'en', lang)).not.toContain(doubled[lang]);
    }
  });
});

describe('render — default quantity (Phase 2 tail: vi increment)', () => {
  // The parser injects `quantity: 1` for increment/decrement even when
  // unspecified; rendering it produced a redundant amount. In vi the quantity
  // marker `thêm` is also the `add` keyword, so `tăng :count thêm 1` re-parsed as
  // increment + a phantom `add`. The renderer now omits a default-1 quantity.
  it('omits the default quantity of 1 (no phantom add in vi)', () => {
    const ref = sorted(leafActions(parse('on click increment :count then log :count', 'en')));
    for (const lang of ['vi', 'es', 'ja', 'en']) {
      const translated = translate('on click increment :count then log :count', 'en', lang);
      expect(sorted(leafActions(parse(translated, lang)))).toEqual(ref);
    }
    expect(translate('increment :count', 'en', 'vi')).not.toContain('thêm');
  });

  it('still renders an explicit non-default quantity', () => {
    expect(translate('increment :count by 5', 'en', 'vi')).toContain('5');
    expect(translate('increment :count by 5', 'en', 'vi')).toContain('thêm');
  });
});

describe('render — canonical put over positional variant (Phase 2 tail: bn put)', () => {
  // `put-bn-at-end` (a handcrafted "at end of" pattern, priority 110) outranked
  // the canonical put and rendered every plain `put X into Y` as the verbose
  // positional form, which re-parsed into a scrambled patient + phantom. The
  // renderer now penalizes positional (`-at-end`/`-at-start`) patterns.
  it('bn renders plain put canonically and round-trips to [put]', () => {
    const ref = sorted(leafActions(parse('on click put "hi" into #out', 'en')));
    expect(ref).toEqual(['put']);
    const translated = translate('on click put "hi" into #out', 'en', 'bn');
    expect(translated).not.toContain('শেষ'); // no spurious "end" token
    expect(sorted(leafActions(parse(translated, 'bn')))).toEqual(['put']);
  });
});
