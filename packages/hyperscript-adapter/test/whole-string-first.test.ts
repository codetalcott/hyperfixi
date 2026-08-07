/**
 * Whole-string-first translation, checked against the REAL engine.
 *
 * The preprocessor used to split multi-statement input on localized `then`
 * keywords BEFORE attempting a whole-string parse, then rejoin the pieces with a
 * hardcoded ` then `. That is invalid immediately after a block header — the
 * canonical parser answers `repeat 3 times then add …` with "Expected 'end' but
 * found 'then'" — so every `repeat`/`tell`/`bind`-block pattern in the corpus
 * translated to English the runtime rejects, in all 21 non-English languages.
 *
 * The oracle here is the vendored `_hyperscript` 0.9.93 the e2e suite already
 * pins (test/browser/vendor/), loaded into the jsdom global — not a
 * string-shape assertion, because the point of the fix is *validity*, and the
 * connector between sibling commands is optional in canonical hyperscript
 * (`tell #panel add .open wait 200ms` is as valid as the `then`-ful form). A
 * test that pinned the exact string would fail for cosmetic reasons and pass
 * for broken ones.
 *
 * Corpus-wide measurement behind the reorder (2026-08-07, over the 3105
 * translations whose English reference the engine accepts): split-first
 * 2849/3105 valid, whole-first 3105/3105 — 256 repaired, 0 broken.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { preprocessToEnglish } from '../src/preprocessor';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Parse on the vendored canonical engine; returns error messages ([] = valid). */
let parseErrors: (src: string) => string[];

beforeAll(() => {
  const vendor = readFileSync(
    path.join(__dirname, 'browser', 'vendor', '_hyperscript-0.9.93.min.js'),
    'utf8'
  );
  // The vendored build is a browser IIFE that assigns window._hyperscript.
  new Function(vendor).call(globalThis);
  const hs = (globalThis as { _hyperscript?: { parse(s: string): { errors?: { message: string }[] } } })
    ._hyperscript;
  if (!hs?.parse) throw new Error('vendored _hyperscript did not expose parse()');
  parseErrors = (src: string) => {
    // The engine has two failure channels: parse().errors collects grammar
    // errors, but the tokenizer THROWS on an unknown character. Fold both.
    try {
      return (hs.parse(src)?.errors ?? []).map(e => e.message);
    } catch (e) {
      return ['threw: ' + String((e as Error).message).split('\n')[0]];
    }
  };
});

/**
 * Rows lifted verbatim from patterns.db, one per repaired block-body family.
 * Each was measured invalid under split-first and valid under whole-first.
 */
const REPAIRED: Array<{ family: string; lang: string; input: string }> = [
  // repeat <n> times — the split rejoin put `then` between header and body
  { family: 'repeat-times', lang: 'es', input: 'en clic repetir 3 times entonces agregar "<p>Line</p>" a yo' },
  { family: 'repeat-times', lang: 'ja', input: '3 times を クリック で 繰り返し それから "<p>Line</p>" を 追加 私 に' },
  { family: 'repeat-times', lang: 'ar', input: 'كرر 3 times عند نقر ثم أضف "<p>Line</p>" إلى أنا' },
  // repeat for … in … — same seam, different loop variant
  { family: 'repeat-for-each', lang: 'fr', input: 'sur clic répéter item en .items alors ajouter .processed à item' },
  { family: 'repeat-for-each', lang: 'ko', input: '클릭 할 때 반복 item 안에 .items 그러면 .processed 를 추가 item 에' },
  // tell <target> — block header whose body also follows directly
  { family: 'tell-other-element', lang: 'es', input: 'en clic decir #panel entonces agregar .open entonces esperar 200ms entonces agregar .visible' },
  { family: 'tell-other-element', lang: 'ja', input: '#panel を クリック で 伝える それから .open を 追加 それから 待つ 200ms それから .visible を 追加' },
  // consecutive bind features — `bind … then bind …` is rejected between features
  { family: 'bind-two-way', lang: 'fr', input: 'bind $name à #input-a alors bind $name à #input-b' },
  { family: 'bind-two-way', lang: 'ar', input: 'اربط $name إلى #input-a ثم اربط $name إلى #input-b' },
];

describe('whole-string-first translation', () => {
  it.each(REPAIRED)('[$family/$lang] translates to English the real engine accepts', row => {
    const english = preprocessToEnglish(row.input, row.lang);
    expect(parseErrors(english)).toEqual([]);
  });

  it('never emits a chain word directly after a block header', () => {
    for (const row of REPAIRED) {
      const english = preprocessToEnglish(row.input, row.lang);
      // `repeat … then`, `tell … then` — the exact shape the rejoin produced.
      expect(english).not.toMatch(/\b(?:repeat|tell|for|while)\b[^\n]*?\bthen\s+(?:add|put|wait|bind)\b/);
    }
  });

  it('still translates a plain then-sequence, keeping every command', () => {
    // Not a block body: whole-first must not lose the sequence it used to split.
    const out = preprocessToEnglish('alternar .active entonces poner "ok" en #msg', 'es');
    expect(out).toContain('toggle .active');
    expect(out).toContain('put "ok" into #msg');
    expect(parseErrors(out)).toEqual([]);
  });

  it('falls back to splitting when the whole string does not parse', () => {
    // `xyz abc` is untranslatable; the row exercises the fallback chain end to
    // end and must still return the original source rather than throwing.
    expect(preprocessToEnglish('xyz abc 123', 'es')).toBe('xyz abc 123');
  });
});
