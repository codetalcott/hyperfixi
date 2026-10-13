/**
 * A loop tested at its bottom (`repeat … until x is 3 end`) reads back in de,
 * fr and ko, where each language's reader lost a different word:
 *
 * - de writes `set` as `setze` (set-de-full), which tokenized as an
 *   identifier, so the repeat head's optional count slot took it and the body
 *   was lost (`wiederholen endlos setze x auf …`);
 * - fr's `until` is `jusqu'à`, which tokenized as `jusqu`, a quote and `à`;
 * - ko's `까지` is a particle the extractor reads as `to`, so the bottom test,
 *   which took the word `until` or a particle marking it (ja `まで`), missed it.
 */
import { describe, it, expect } from 'vitest';
import { translate } from '../src/index';

describe.each(['de', 'fr', 'ko'])('%s', language => {
  it.each([
    'on click set x to 0 then repeat forever set x to x + 1 until x is 3 end then put x into me',
    'on click set x to 0 then repeat forever set x to x + 1 until true end then put x into me',
    'repeat forever set x to x + 1 until x is 3 end',
    'repeat until x is 3 increment x end',
  ])('%s', source => {
    const foreign = translate(source, 'en', language);
    expect(translate(foreign, language, 'en'), foreign).toBe(source);
  });
});

it("de's `setzen` is still put, and `setze` set", () => {
  expect(translate('setzen x in mich', 'de', 'en')).toBe('put x into me');
  expect(translate('setze x auf 1', 'de', 'en')).toBe('set x to 1');
});
