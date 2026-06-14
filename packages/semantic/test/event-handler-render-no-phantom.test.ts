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
