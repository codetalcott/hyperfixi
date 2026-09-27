/**
 * Values core wrote differently from upstream `_hyperscript`.
 *
 * The value matrix (testing-framework's value-matrix.ts) runs every value
 * shape on both engines; these are the cells where core's own English run
 * differed. Every row here was run on upstream 0.9.93 and core, and the
 * expected result is upstream's. The rows that already agreed are the
 * neighbours each fix must keep: a collection's own `length`, `#a's @title`,
 * an empty array, an increment with no amount.
 */
import { describe, it, expect } from 'vitest';
import { hyperscript } from '../api/hyperscript-api';

const FIXTURE =
  '<div id="out">o</div><p id="a" class="x" title="t1">6</p>' +
  '<div id="w"><p class="w" id="w1">w</p><p class="w">v</p></div><button id="b">b</button>';
const SETUP = 'set arr to [1, 2] then set obj to {v: 6} then set nothing to null then';

/** Compile a click handler, click #b, and read #out's HTML. */
async function click(body: string): Promise<string> {
  const compiled = await hyperscript.compile(`on click ${SETUP} ${body}`);
  expect(compiled.ok, body).toBe(true);
  document.body.innerHTML = FIXTURE;
  const button = document.getElementById('b') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.innerHTML;
}

describe('put writes a value as upstream does', () => {
  it.each([
    ['null', 'null'],
    ['nothing', 'null'],
    ['unsetVariable', 'null'],
    ['[1, 2]', '12'],
    ['arr', '12'],
    ['["<b>x</b>", 2]', '<b>x</b>2'],
    ['[null, 1]', '1'],
    ['[#a, 1]', '<p id="a" class="x" title="t1">6</p>1'],
    ['[]', ''],
    ['"x"', 'x'],
    ['.w', '<p class="w" id="w1">w</p><p class="w">v</p>'],
  ])('put %s', async (value, expected) => {
    expect(await click(`put ${value} into #out`)).toBe(expected);
  });

  it('an array at the end of an element', async () => {
    expect(await click('put [1, 2] at end of #out')).toBe('o12');
  });
});

describe('X of Y reads an attribute, and maps over a collection', () => {
  it.each([
    ['@title of #a', 't1'],
    ['#a\'s @title', 't1'],
    ['@class of .w', 'ww'],
    ['textContent of .w', 'wv'],
    ['textContent of <p.w/>', 'wv'],
    ['length of .w', '2'],
    ['length of arr', '2'],
    ['v of obj', '6'],
  ])('put %s', async (value, expected) => {
    expect(await click(`put ${value} into #out`)).toBe(expected);
  });
});

describe('the X of Y takes `as` and `in` on its target, as X of Y does', () => {
  it.each([
    ['the textContent of #a as Int', 'null'],
    ['textContent of #a as Int', 'null'],
    ['the textContent of #a', '6'],
    ['the textContent of <p.w/> in #w', 'wv'],
  ])('put %s', async (value, expected) => {
    expect(await click(`put ${value} into #out`)).toBe(expected);
  });
});

describe('is empty reads a length, as upstream does', () => {
  it.each([
    ['{} is empty', 'false'],
    ['{} is not empty', 'true'],
    ['obj is empty', 'false'],
    ['[] is empty', 'true'],
    ['arr is empty', 'false'],
    ['"" is empty', 'true'],
    ['null is empty', 'true'],
  ])('put %s', async (value, expected) => {
    expect(await click(`put ${value} into #out`)).toBe(expected);
  });
});

describe('an increment by a null amount is NaN', () => {
  it.each([
    ['increment i by null', 'NaN'],
    ['increment i by nothing', 'NaN'],
    ['decrement i by null', 'NaN'],
    ['increment i by "2"', '3'],
    ['increment i by 2', '3'],
    ['increment i', '2'],
  ])('%s', async (command, expected) => {
    expect(await click(`set i to 1 then ${command} then put i into #out`)).toBe(expected);
  });
});
