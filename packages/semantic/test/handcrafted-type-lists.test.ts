/**
 * The handcrafted patterns' role types are the schema's, not copies of them (M3
 * (a), `docs-internal/MULTILINGUAL_NEXT_STEPS.md`). A copied list drifts: German
 * lost every `get` of a literal to one (PR 130), and vi's `gán … vào …` set kept
 * one without the property path until M3. A role whose types a schema states reads them from
 * `generators/role-types.ts`, which the schema reads too.
 *
 * This counts the literal lists left in `src/patterns/` and only shrinks. A new
 * pattern takes a shared list; a list that narrows its schema's on purpose says
 * why beside it, and the count here comes down when one is derived.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { translate } from '../src/index';

/** Literal `expectedTypes: [...]` lists in src/patterns/ on 2026-10-12 (139 before M3). */
const MAX_LITERAL_LISTS = 28;

describe('handcrafted pattern type lists', () => {
  it('do not grow back', () => {
    const dir = join(__dirname, '..', 'src', 'patterns');
    let count = 0;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.ts')) continue;
      count += readFileSync(join(dir, file), 'utf8').match(/expectedTypes: \[/g)?.length ?? 0;
    }
    expect(
      count,
      count > MAX_LITERAL_LISTS
        ? 'use a list from generators/role-types.ts instead of a copy'
        : `${MAX_LITERAL_LISTS - count} fewer: lower MAX_LITERAL_LISTS to ${count}`
    ).toBe(MAX_LITERAL_LISTS);
  });
});

/** Each language's render, read back to English. */
const roundTrip = (src: string, lang: string): string =>
  translate(translate(src, 'en', lang), lang, 'en');

describe('copies that had drifted from their list', () => {
  it("zh put takes a property as its value (the schema's list has it)", () => {
    // put-zh-full and put-zh-ba lacked `property-path`, so a property value
    // fell to a pattern that refused the rest (command-shape gate: one zh lane).
    for (const src of [
      'put the textContent of last <.picked/> into #out',
      'put the textContent of last <.picked/> in #list into #out',
    ]) {
      expect(roundTrip(src, 'zh'), src).toBe(translate(src, 'en', 'en'));
    }
  });

  it("en repeat N times takes a property as its count, as every other language's head does", () => {
    // en's head lacked `property-path` (COUNT_TYPES has it), so the count read
    // as a raw expression and ja/ko/zh wrote its English verbatim.
    const src = 'repeat the textContent of #a times log 1 end';
    expect(translate(src, 'en', 'ja')).toContain('#aのtextContent');
    expect(translate(src, 'en', 'ko')).toContain('#a의 textContent');
    expect(translate(src, 'en', 'zh')).toContain('#a的textContent');
    for (const lang of ['ja', 'ko', 'zh']) {
      expect(translate(src, 'en', lang), lang).not.toMatch(/\bthe\b|\bof\b/);
    }
  });

  it("pl/uk hide's style takes the schema's types, which still leave out a reference", () => {
    // `z`/`з` is also "from": `z okno` is a source, never a style.
    expect(translate('ukryj .modal z opacity', 'pl', 'en')).toBe('hide .modal with opacity');
    expect(translate('ukryj .modal z .hidden', 'pl', 'en')).toBe('hide .modal with .hidden');
    expect(translate('сховати .modal з .hidden', 'uk', 'en')).toBe('hide .modal with .hidden');
    expect(() => translate('ukryj .modal z okno', 'pl', 'en')).toThrow(/z okno/);
    expect(() => translate('сховати .modal з вікно', 'uk', 'en')).toThrow(/з вікно/);
  });
});
