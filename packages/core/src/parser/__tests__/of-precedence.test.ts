/**
 * `X of Y` binds as property access, as upstream reads it.
 *
 * Core gave `of` the comparisons' binding power, right-associative, so its
 * right operand took every operator after it: `textContent of #d1 is "d"` read
 * as `textContent of (#d1 is "d")`, the property of a boolean, and put nothing.
 * Arithmetic after it threw. Upstream's `of` is in the same chain as `.` and
 * `'s`, and its right operand is a unaryExpression, which takes `as`, `in` and
 * a further `of`, and nothing looser.
 *
 * Every row but the last was checked on both engines (upstream 0.9.93 and
 * core).
 */
import { describe, it, expect } from 'vitest';
import { hyperscript } from '../../api/hyperscript-api';

const FIXTURE =
  '<div id="out">o</div><p id="d1" class="x">d</p>' +
  '<div id="wrap"><p class="w">w</p><p class="w">v</p></div><button id="b">b</button>';
const SETUP = 'set n to 3 then set t to "" then set arr to [1, 2] then set obj to {a: {b: 7}} then';

/** Compile `put <value> into #out` in a click handler, click #b, read #out. */
async function put(value: string): Promise<string> {
  const compiled = await hyperscript.compile(`on click ${SETUP} put ${value} into #out`);
  expect(compiled.ok, value).toBe(true);
  document.body.innerHTML = FIXTURE;
  const button = document.getElementById('b') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.textContent!;
}

describe('an operator after `X of Y` applies to the property', () => {
  it.each([
    ['textContent of #d1 is "d"', 'true'],
    ['textContent of #d1 is "e"', 'false'],
    ['textContent of #d1 is not "d"', 'false'],
    ['textContent of #d1 == "d"', 'true'],
    ['textContent of #d1 == "e"', 'false'],
    ['id of #d1 is "d1"', 'true'],
    ['className of #d1 is "x"', 'true'],
    ['className of #d1 is "e"', 'false'],
    ['length of t is 0', 'true'],
    ['length of t is 1', 'false'],
    ['length of arr > 1', 'true'],
    ['length of arr > 2', 'false'],
    ['length of arr is not 2', 'false'],
    ['textContent of #d1 contains "d"', 'true'],
    ['textContent of #d1 contains "e"', 'false'],
    ['textContent of #d1 starts with "d"', 'true'],
    ['textContent of #d1 starts with "e"', 'false'],
    ['textContent of #d1 exists', 'true'],
    ['value of #d1 exists', 'false'],
    ['textContent of #d1 is empty', 'false'],
    ['value of #d1 is empty', 'true'],
    ['textContent of #d1 + "x"', 'dx'],
    ['textContent of #d1 + textContent of #d1', 'dd'],
    ['length of arr + 5', '7'],
    ['b of a of obj + 1', '8'],
    ['length of arr * 2', '4'],
    ['n * length of arr', '6'],
    ['n + length of t', '3'],
    ['"d" is textContent of #d1', 'true'],
  ])('%s', async (value, expected) => {
    expect(await put(value)).toBe(expected);
  });
});

describe('`X of Y` is one operand of a prefix operator', () => {
  it.each([
    ['not textContent of #d1', 'false'],
    ['not value of #d1', 'true'],
    ['not length of t', 'true'],
    ['not length of arr', 'false'],
    ['-length of arr', '-2'],
    ['-length of arr + 5', '3'],
    ['textContent of first <p/> is "d"', 'true'],
    ['textContent of first <p/> is "e"', 'false'],
  ])('%s', async (value, expected) => {
    expect(await put(value)).toBe(expected);
  });
});

describe('`and` and `or` join whole comparisons of `X of Y`', () => {
  it.each([
    ['n is 3 and textContent of #d1 is "d"', 'true'],
    ['n is 3 and textContent of #d1 is "e"', 'false'],
    ['length of arr is 2 and n is 3', 'true'],
    ['length of arr is 1 and n is 3', 'false'],
    ['textContent of #d1 is "e" or n is 3', 'true'],
    ['textContent of #d1 is "e" or n is 4', 'false'],
  ])('%s', async (value, expected) => {
    expect(await put(value)).toBe(expected);
  });
});

// Upstream's right operand is a unaryExpression, whose chain takes a further
// `of`, `in` and `as`. `length of arr as String` is the length of "1,2".
describe("`of`'s right operand takes what upstream's does", () => {
  it.each([
    ['b of a of obj', '7'],
    ['length of <p.w/> in #wrap', '2'],
    ['length of <p.w/> in #wrap + 1', '3'],
    ['length of <p.w/> in #wrap is 2', 'true'],
    ['length of arr as String', '3'],
    ['length of arr as String is "2"', 'false'],
  ])('%s', async (value, expected) => {
    expect(await put(value)).toBe(expected);
  });
});

// Core only: upstream has no `^`. The operand stops before it, as before the
// rest of the arithmetic.
it('`length of arr ^ 2` squares the length', async () => {
  expect(await put('length of arr ^ 2')).toBe('4');
});
