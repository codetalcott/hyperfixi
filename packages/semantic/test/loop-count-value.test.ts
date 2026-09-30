/**
 * A loop's count is any value an increment's amount can be (PR 125).
 *
 * The counted-loop heads took a count only as a literal or an expression. A
 * variable with its scope's sigil (`$n`, `:n`), `it` and `event` read as
 * references, and the `of` form a translation writes for `#a's textContent`
 * (es `textContent de #a`) as a property path, so no head matched:
 *
 * - English dropped the whole loop, and every translation with it (`repeat $n
 *   times`, `repeat event's detail times`);
 * - with a possessive count, es, it, pl, ru and uk dropped the loop and the
 *   command after it, and de, fr, he, id and pt read `forever`.
 *
 * Found by the value matrix's `times` position (PR 124).
 */
import { describe, it, expect } from 'vitest';
import { buildAST, parse, render } from '../src/index';

const english = (code: string, language: string): string => render(parse(code, language)!, 'en');

describe('a count that reads as a reference', () => {
  it.each([
    'on click repeat $n times increment i end',
    'on click repeat :n times increment i end',
    "on click repeat event's detail times increment i end",
    "on click repeat event's detail + 2 times increment i end",
    'on click repeat $n as Int times increment i end',
  ])('%s', code => {
    expect(english(code, 'en')).toBe(code);
  });

  it('keeps the loop, and the command after it', () => {
    const code = 'on click set i to 0 then repeat $n times increment i end then put i into #out';
    expect(english(code, 'en')).toBe(code);
    for (const language of ['es', 'ja', 'ar', 'qu']) {
      expect(english(render(parse(code, 'en')!, language), language)).toBe(code);
    }
  });

  it('builds a counted loop', () => {
    const { ast } = buildAST(parse('on click repeat $n times increment i end', 'en')!);
    const json = JSON.stringify(ast);
    expect(json).toContain('"loopType":{"type":"literal","value":"times"');
    expect(json).toContain('"times":');
  });
});

describe('a count a translation writes in the of form', () => {
  const code =
    "on click set i to 0 then repeat #a's textContent times increment i end then put i into #out";
  it.each(['de', 'es', 'fr', 'he', 'id', 'it', 'pl', 'pt', 'ru', 'uk'])('%s', language => {
    expect(english(render(parse(code, 'en')!, language), language)).toBe(code);
  });
});
