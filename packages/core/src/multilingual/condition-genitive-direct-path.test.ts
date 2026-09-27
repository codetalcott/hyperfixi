/**
 * A translated condition reads a possessive whose owner comes first back as
 * `#d1's textContent`, on the multilingual direct path.
 *
 * Where the possessive marker sits between owner and property (bn `#d1র
 * textContent`, hi `#d1का`, ja `#d1の`, ko `#d1의`, tl `ng`, vi `của`, zh `的`),
 * the marker stayed in the condition, so `if #d1's textContent is "z"` read back
 * as `#d1 の textContent is "z"`, which the expression parser took for the
 * truthy `#d1`: every such condition was true. A translated property reads
 * back in English (ja `#i1の値` is `#i1's value`), and hi `मान` counts as an
 * operand before the copula, though its vowel sign is a combining mark. The
 * languages that write the property first (es `valor de #i1`) keep reading it
 * that way. Each condition is tested both ways.
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
    '<div id="out">o</div><p id="d1">d</p><p id="d2">e</p><input id="i1" value="v">' +
    '<button id="b">b</button>';
  const button = document.getElementById('b') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.textContent!;
}

const handler = (condition: string): string =>
  `on click if ${condition} put "yes" into #out else put "no" into #out end`;

// Each group: the conditions with the branch both engines take (#d1 reads "d",
// #d2 "e", #i1's value is "v"), and the languages.
const GROUPS: Array<[string, Array<[string, string]>, string[]]> = [
  [
    'owner first',
    [
      [`#d1's textContent is "d"`, 'yes'],
      [`#d1's textContent is "z"`, 'no'],
      [`#d1's textContent is not "z"`, 'yes'],
      [`#d1's textContent is not "d"`, 'no'],
      [`#d1's textContent is #d2's textContent`, 'no'],
      [`#d1's textContent is not #d2's textContent`, 'yes'],
      [`#i1's value is "v"`, 'yes'],
      [`#i1's value is "z"`, 'no'],
      [`#i1's value is not "z"`, 'yes'],
      [`#i1's value is not "v"`, 'no'],
    ],
    ['bn', 'hi', 'ja', 'ko', 'tl', 'vi', 'zh'],
  ],
  // The owner-first reading stays off the languages that write the property
  // first (es `valor de #i1`, th `ค่า ของ #i1`), which would read `valor's #i1`.
  [
    'property first',
    [
      [`#i1's value is "v"`, 'yes'],
      [`#i1's value is "z"`, 'no'],
    ],
    ['es', 'fr', 'it', 'pt', 'th'],
  ],
];

describe.each(GROUPS)('%s', (_order, conditions, languages) => {
  describe.each(conditions)('if %s', (condition, expected) => {
    it.each(languages)('%s', async language => {
      expect(await click(handler(condition), language)).toBe(expected);
    });
  });
});
