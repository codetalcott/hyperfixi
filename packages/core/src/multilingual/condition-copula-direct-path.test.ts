/**
 * A translated condition's copula reads back as `is` where the language's word
 * for it is also another word, on the multilingual direct path.
 *
 * ar `هو` is also `it`, hi `है` also `has`, and th `เป็น` also `as`, so none is
 * a keyword: the expression lexicon reads each by its neighbors. It read the
 * copula only before a predicate (`p هو فارغ`), so `p هو q` compared p with a
 * variable named `it`, and every comparison phrase (`هو greater than`) failed.
 * Between two operands the word is the copula; hi `है` before a class is `has`
 * (`#d1 है .x`); and hi `नहीं` after the copula is `not`, not `no`. Each word is
 * tested both ways.
 */
import { describe, it, expect } from 'vitest';
import { parseSemantic, render } from '@lokascript/semantic';
import { hyperscript } from '../api/hyperscript-api';

/** Translate the handler, compile it on the direct path, click #b, read #out. */
async function click(source: string, language: string): Promise<string> {
  const code = render(parseSemantic(source, 'en').node!, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML =
    '<div id="out">o</div><p id="d1" class="x">d</p><button id="b">b</button>';
  const button = document.getElementById('b') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.textContent!;
}

const handler = (condition: string): string =>
  'on click set p to 1 then set q to 2 then ' +
  `if ${condition} put "yes" into #out else put "no" into #out end`;

// Each group: the conditions with the branch both engines take (p = 1, q = 2,
// #d1 has class x), and the languages. `has` is core's alone (upstream has no
// `has`), and a translation runs on core.
const GROUPS: Array<[string, Array<[string, string]>, string[]]> = [
  [
    'is',
    [
      ['p is 1', 'yes'],
      ['p is q', 'no'],
    ],
    ['ar', 'hi', 'th'],
  ],
  [
    'is greater than',
    [
      ['q is greater than p', 'yes'],
      ['p is greater than q', 'no'],
    ],
    ['ar', 'hi', 'th'],
  ],
  [
    'is not',
    [
      ['p is not q', 'yes'],
      ['p is not 1', 'no'],
    ],
    ['ar', 'hi', 'th'],
  ],
  [
    'has',
    [
      ['#d1 has .x', 'yes'],
      ['#d1 has .y', 'no'],
    ],
    ['hi'],
  ],
  // hi wrote null as खाली, also its `empty` command, until it wrote `null` (PR
  // 78); after `है नहीं` the condition scan keeps either as the predicate.
  [
    'is not null',
    [
      ['p is not null', 'yes'],
      ['s is not null', 'no'],
    ],
    ['hi'],
  ],
];

describe.each(GROUPS)('%s', (_word, conditions, languages) => {
  describe.each(conditions)('if %s', (condition, expected) => {
    it.each(languages)('%s', async language => {
      expect(await click(handler(condition), language)).toBe(expected);
    });
  });
});
