/**
 * A language's `and` that reads back as another word.
 *
 * - sw `na` is both `and` and the `with` marker, so the dictionary's collision
 *   guard kept it out of the connective table and a value stopped at it: `put
 *   kweli na flag kwa #out` (put true and flag into #out) lost the `put`. Between
 *   two operands it is now `and`; a command whose own role takes `na` (`fetch …
 *   na {…}`) still stops its value at the marker, and a loop's `na index` is
 *   its `with index`.
 *
 * (qu writes `and` as `chaymanta`, its i18n dictionary's word, which its
 * profile and tokenizer read as `then`: filed, a vocabulary decision.)
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const roundTrip = (source: string, language: string): string => {
  const foreign = render(parse(source, 'en')!, language);
  const back = parse(foreign, language);
  return back ? render(back, 'en') : `(no parse: ${foreign})`;
};

describe.each(['sw'])('%s', language => {
  it.each([
    'on click put true and flag into #out',
    'on click set x to true and flag then put x into #out',
    'on click put flag and true into #out',
    'on click set x to n > 1 and n < 10 then put x into #out',
    'on click if true and flag put "Y" into #out end',
  ])('%s', source => {
    expect(roundTrip(source, language)).toBe(source);
  });
});

describe('sw `na` is still `with`', () => {
  it('as fetch’s marker', () => {
    expect(render(parse('unapo click leta "/api" na {method:"POST"}', 'sw')!, 'en')).toBe(
      'on click fetch "/api" with {method:"POST"}'
    );
  });

  it("as a loop's `with index`", () => {
    const code =
      'kwenye pakia rudia kwa item ndani .item na index kisha ongeza .visible kwa item mwisho';
    expect(render(parse(code, 'sw')!, 'en')).toBe(
      'on load repeat for item in .item with index add .visible to item end'
    );
  });
});

describe("a loop's `with index` in the language's own `with`", () => {
  it('es `con index`', () => {
    const code = 'al cargar repetir para item en .item con index agregar .visible a item fin';
    expect(render(parse(code, 'es')!, 'en')).toBe(
      'on load repeat for item in .item with index add .visible to item end'
    );
  });
});
