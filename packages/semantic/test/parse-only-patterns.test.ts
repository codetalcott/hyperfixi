/**
 * A pattern that exists to READ a form, never to write it, says so with
 * `parseOnly` (R6, `docs-internal/multilingual/OPEN_ITEMS.md`), and the renderer
 * skips it. Before the flag, the render surface was whatever outscored the
 * rest: four patterns written to read the retired i18n transformer's output
 * became what a language wrote, each fixed on its own; qu's prefixed
 * `repeat until event` head came back whenever the loop had a source.
 *
 * The list here is every read-only pattern. A new one is a reviewed change.
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, getPatternsForLanguage, translate } from '../src/index';

describe('parse-only patterns', () => {
  it('are the ones listed', () => {
    const ids = getSupportedLanguages()
      .flatMap(l => getPatternsForLanguage(l))
      .filter(p => p.parseOnly)
      .map(p => p.id)
      .filter(id => !/^wait-[a-z]+-event-head$/.test(id))
      .sort();
    // Plus `wait-<lang>-event-head` (P52): the renderer writes the event word
    // itself, before a name no table knows.
    expect(ids).toEqual(['repeat-qu-midclause-until-head', 'repeat-qu-until-head']);
  });

  it("qu writes its own until-head, with a source too, and still reads the transformer's", () => {
    const src = 'repeat until event pointerup from #box log 1 end';
    const qu = translate(src, 'en', 'qu');
    expect(qu).toMatch(/^kama ruway pointerup ta /);
    expect(qu).not.toMatch(/hayk|\buntil\b|\bevent\b|\brepeat\b/);
    expect(translate(qu, 'qu', 'en')).toBe(src);
    // The form 4.x's transformer wrote, and the prefixed head reads.
    expect(
      translate(
        'hayk_akama ruway pointerup ta #box manta kutipay 1 ta qillqakuy tukukuy',
        'qu',
        'en'
      )
    ).toBe(src);
  });
});
