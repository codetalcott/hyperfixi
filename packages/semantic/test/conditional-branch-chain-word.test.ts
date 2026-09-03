/**
 * A conditional's branch body is joined by `joinStatements`, which used to
 * hardcode the English ` then ` — so every non-en conditional rendered an
 * untranslated English connector between its branch commands
 * (`もし … 削除 then 追加`). renderCompound has always localized its chain word
 * via the profile; this pins the branch join to the same contract.
 *
 * The chain word is looked up as the profile's `then` keyword, so these
 * assertions are the profiles' own values, not transliterations invented here.
 */

import { describe, it, expect } from 'vitest';
import { parseSemantic, render } from '../src';

const SRC = 'on click if I match .active remove .active then add .b end';

/** language → its profile's `then` keyword. */
const THEN: Record<string, string> = {
  es: 'entonces',
  ja: 'それから',
  ko: '그다음',
  ar: 'ثم',
  fr: 'puis',
  de: 'dann',
  pt: 'então',
};

describe('conditional branch join — chain word is localized', () => {
  const parsed = parseSemantic(SRC, 'en');

  it('parses the reference source with a conditional in the handler body', () => {
    expect(parsed.node).not.toBeNull();
    expect(render(parsed.node!, 'en')).toContain('remove .active then add .b');
  });

  for (const [lang, thenWord] of Object.entries(THEN)) {
    it(`joins ${lang} branch statements with "${thenWord}", never the English "then"`, () => {
      const out = render(parsed.node!, lang);
      expect(out).toContain(thenWord);
      // The bug: an English `then` surviving into target-language output. Match on
      // word boundaries so a language whose own connector merely CONTAINS the
      // letters (none currently do) would not false-positive.
      expect(out).not.toMatch(/(^|\s)then(\s|$)/);
    });
  }

  it('leaves English output unchanged', () => {
    expect(render(parsed.node!, 'en')).toBe(SRC);
  });
});
