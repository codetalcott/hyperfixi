/**
 * `repeat until <condition>` keeps its condition, in English and in every
 * translation.
 *
 * The English parse took the generated repeat pattern, which put the condition
 * in `quantity`, where the AST builder does not read it for an `until` loop;
 * and no other language had a head pattern for the form, so each rendered
 * `until` in English and read it back without its condition.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, tryGetProfile } from '../src/index';

const LANGUAGES = [
  'en',
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
];

type Loop = { roles: Map<string, { value?: unknown; raw?: string }> };

it('English reads the condition into the `condition` role', () => {
  const loop = parse('repeat until n > 3 increment n end', 'en') as unknown as Loop;
  expect(loop.roles.get('loopType')).toMatchObject({ value: 'until' });
  expect(loop.roles.get('condition')).toMatchObject({ raw: 'n > 3' });
});

describe.each([
  'on click repeat until n > 3 increment n end',
  'on click repeat until p or q increment n end',
  // `until event X` keeps its own head.
  'on click repeat until event mouseup increment n end',
])('%s', source => {
  it.each(LANGUAGES)('%s', language => {
    const foreign = render(parse(source, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(source);
  });
});

// With the language's own verb (the render keeps English `repeat`), the fused
// handler pattern (it `su {event} ripetere {loopType}`) took the until word
// alone for the loop's form: `repeat fino`, and the loop lost its condition.
// Its while twin was swapped for the head that reads the condition; the until
// head was not (PR 123).
describe("with the language's own repeat verb", () => {
  const source = 'on click repeat until n > 3 increment n end';
  it.each(['it', 'ms', 'pl', 'th', 'tl', 'vi'])('%s', language => {
    const verb = tryGetProfile(language)!.keywords.repeat!.primary;
    const foreign = render(parse(source, 'en')!, language).replace(/\brepeat\b/, verb);
    expect(foreign).not.toContain('repeat');
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(source);
  });

  // es took `hasta` alone only where an end word followed it, the until's
  // operand (a variable spelled like es `fin`).
  it('es, before an end word', () => {
    expect(render(parse('al clic repetir hasta fin es 3 incrementar x fin', 'es')!, 'en')).toBe(
      'on click repeat until fin is 3 increment x end'
    );
  });
});
