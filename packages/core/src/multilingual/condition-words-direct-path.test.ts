/**
 * A translated condition reads its `or`, `not` and `and` back, on the
 * multilingual direct path.
 *
 * The renderer writes these words in the language, and where the tokenizer
 * reads the word back as a bare identifier the condition kept it: de `p oder
 * q` compared p with a variable named `oder`, and `nicht p` tested one named
 * `nicht`. The expression lexicon now carries each language's logical words
 * that nothing else in its dictionary spells the same way. Each word is tested
 * both ways, in the languages whose tokenizer read it as an identifier.
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
  document.body.innerHTML = '<div id="out">o</div><button id="b">b</button>';
  const button = document.getElementById('b') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.textContent!;
}

const handler = (condition: string): string =>
  'on click set p to 1 then set q to 2 then set r to 0 then ' +
  `if ${condition} put "yes" into #out else put "no" into #out end`;

// Each group: the conditions with the branch both engines take (p = 1, q = 2,
// r = 0), and the languages whose word for it read back as an identifier.
const GROUPS: Array<[string, Array<[string, string]>, string[]]> = [
  [
    'or',
    [
      ['r or q', 'yes'],
      ['r or 0', 'no'],
    ],
    ['ar', 'de', 'fr', 'ms', 'pt', 'qu', 'ru', 'th', 'tl', 'uk'],
  ],
  [
    'not',
    [
      ['not r', 'yes'],
      ['not p', 'no'],
      ['not r and p', 'yes'],
      ['not p or r', 'no'],
    ],
    ['de', 'fr', 'id', 'ms', 'pt', 'ru', 'th', 'tl', 'uk'],
  ],
  [
    'is not',
    [
      ['p is not q', 'yes'],
      ['p is not 1', 'no'],
    ],
    ['de', 'fr', 'id', 'ms', 'pt', 'ru', 'tl', 'uk'],
  ],
  [
    'and',
    [
      ['p and q', 'yes'],
      ['p and r', 'no'],
    ],
    ['ar'],
  ],
  // ja `そして` and ko `그리고`, their word for `and`, were also then-words, so a
  // handler body split the condition at them. Either half alone takes the other
  // branch in one of the two negative rows.
  [
    'and, also a then-word',
    [
      ['p is 1 and q is 2', 'yes'],
      ['p is not q and q is 3', 'no'],
      ['p is 2 and q is 2', 'no'],
    ],
    ['ja', 'ko'],
  ],
];

describe.each(GROUPS)('%s', (_word, conditions, languages) => {
  describe.each(conditions)('if %s', (condition, expected) => {
    it.each(languages)('%s', async language => {
      expect(await click(handler(condition), language)).toBe(expected);
    });
  });
});
