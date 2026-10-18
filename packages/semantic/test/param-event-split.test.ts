/**
 * A second handler on a parameterized event, and a `throw` after pl's `do`.
 *
 * - ko writes its handler head after the event (`exception(error) 할 때`), and
 *   the program splitter took the token before `할 때` for the event: `)`. The
 *   second handler began at `)`, its `exception ( error` left in the first.
 *   It steps back over a list of names only: a call (`bar()`) is no head.
 * - pl's `do` is `into`, and the `do not throw` strip took `do mnie wtedy rzuć`
 *   (into me then throw) for the phrase, so `put "foo" into me then throw "bar"`
 *   read as `put "foo"` and an unread `"bar"`.
 */
import { describe, it, expect } from 'vitest';
import { translate } from '../src/index';

const squeeze = (s: string) => s.replace(/\s+/g, ' ').trim();

describe.each(['ko', 'pl'])('%s', language => {
  it.each([
    'on click put "foo" into me then throw "bar"\non exception(error) put error into me',
    'on click trigger foo(x:42) end\non foo(x) put x into my innerHTML',
    'on click put "foo" into me then throw "bar"',
  ])('%s', source => {
    const english = translate(source, 'en', 'en');
    const foreign = translate(source, 'en', language);
    expect(squeeze(translate(foreign, language, 'en')), foreign).toBe(squeeze(english));
  });
});

it.each(['bn', 'hi', 'ko'])('%s: a call before a marker that is also `on` is not a head', language => {
  // bn `bar()তে` is `to bar()`: a call's arguments are not a handler's names.
  const source = 'def bar return #bar end\non click send foo to bar()';
  const english = translate(source, 'en', 'en');
  expect(translate(translate(source, 'en', language), language, 'en')).toBe(english);
});

it.each(['pl', 'ko', 'ja', 'es'])('%s still reads fetch\'s `do not throw`', language => {
  const source = 'on click fetch /x do not throw then put it into me';
  const english = translate(source, 'en', 'en');
  expect(translate(translate(source, 'en', language), language, 'en')).toBe(english);
});
