/**
 * A translated condition's `not` reads back where its tokenizer split the word
 * or the condition scan ended at the predicate after it, on the multilingual
 * direct path.
 *
 * ja renders `not` as `ではない` and ar as `ليس`, and their tokenizers split the
 * word (ja `で は ない`, ar `ل يس`), so `if not r` tested something else. And
 * `p is not empty` ended the condition at the predicate in the languages whose
 * `not` is a plain word (de `ist nicht leer`): `leer` is also the `empty`
 * command, so the condition became `p is not` and the rest a command. Each
 * word is tested both ways.
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
  'on click set p to 1 then set q to 2 then set r to 0 then set t to "" then ' +
  `if ${condition} put "yes" into #out else put "no" into #out end`;

// Each group: the conditions with the branch both engines take (p = 1, q = 2,
// r = 0, t = ""), and the languages it was wrong in.
const GROUPS: Array<[string, Array<[string, string]>, string[]]> = [
  [
    'not',
    [
      ['not r', 'yes'],
      ['not p', 'no'],
    ],
    ['ar', 'ja'],
  ],
  [
    'is not',
    [
      ['p is not q', 'yes'],
      ['p is not 1', 'no'],
    ],
    ['ja'],
  ],
  [
    'is not empty',
    [
      ['p is not empty', 'yes'],
      ['t is not empty', 'no'],
    ],
    ['bn', 'de', 'fr', 'ja', 'pt', 'ru', 'tl', 'uk'],
  ],
];

describe.each(GROUPS)('%s', (_word, conditions, languages) => {
  describe.each(conditions)('if %s', (condition, expected) => {
    it.each(languages)('%s', async language => {
      expect(await click(handler(condition), language)).toBe(expected);
    });
  });
});
