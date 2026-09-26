/**
 * A condition's comparison phrases run as both engines run them, on the
 * multilingual direct path.
 *
 * buildAST parses every translated condition with semantic's expression parser,
 * which read `is`, `is empty` and `is not empty` and none of core's other
 * comparison phrases: `p is not q` became `p is (not q)`, `p is less than q`
 * compared p with a variable named `less`, `#zz does not exist` and `the X of
 * Y` lost everything after their first word, and `#d1's X` built a possessive
 * core reads as no property. English compiles through core's own parser, so
 * each condition runs in English through buildAST, the path every translation
 * takes, and in the languages that read every operator word and possessive
 * back (the rest render one they do not, a separate gap). Each phrase is
 * tested both ways, so a condition that reads as always true cannot pass.
 */
import { describe, it, expect } from 'vitest';
import { parseSemantic, render, buildAST } from '@lokascript/semantic';
import { hyperscript } from '../api/hyperscript-api';

const LANGUAGES = ['es', 'he', 'it'] as const;

/** Run the handler on #b and read #out. */
async function run(ast: unknown): Promise<string> {
  document.body.innerHTML =
    '<div id="out">o</div><p id="d1" class="x">d</p><button id="b">b</button>';
  const button = document.getElementById('b') as HTMLElement;
  await hyperscript.execute(ast as never, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.textContent!;
}

const handler = (condition: string): string =>
  'on click set p to 1 then set q to 2 then set r to 0 then set t to "" then ' +
  `if ${condition} put "yes" into #out else put "no" into #out end`;

// Each condition with the branch upstream takes (p = 1, q = 2, r = 0, t = "",
// #d1 has class x and text "d"). Core agrees on all but `textContent of #d1`,
// which it binds as `textContent of (#d1 is "d")`.
const CONDITIONS: Array<[string, string]> = [
  ['p is not q', 'yes'],
  ['p is not 1', 'no'],
  ['p is q', 'no'],
  ['p is less than q', 'yes'],
  ['p is less than 1', 'no'],
  ['p is greater than q', 'no'],
  ['p is greater than or equal to 1', 'yes'],
  ['p is greater than or equal to 2', 'no'],
  ['p is less than or equal to 0', 'no'],
  ['p is equal to 1', 'yes'],
  ['p is equal to 2', 'no'],
  ['p is not equal to q', 'yes'],
  ['p is not equal to 1', 'no'],
  ['p is really 1', 'yes'],
  ['p is really "1"', 'no'],
  ['p is in [1, 2]', 'yes'],
  ['p is in [3, 4]', 'no'],
  ['p is not in [3, 4]', 'yes'],
  ['p is not in [1, 2]', 'no'],
  ['#d1 matches .x', 'yes'],
  ['#d1 does not match .x', 'no'],
  ['[1, 2] does not contain 3', 'yes'],
  ['#zz does not exist', 'yes'],
  ['#d1 does not exist', 'no'],
  ['p is a Number', 'yes'],
  ['p is a String', 'no'],
  ['p is not a String', 'yes'],
  ['p is not a Number', 'no'],
  ['p is not null', 'yes'],
  ['p is not empty', 'yes'],
  ['t is empty', 'yes'],
  ['p is not q and q is 2', 'yes'],
  ['p is not q and q is 3', 'no'],
  ['not (p is q)', 'yes'],
  ['#d1\'s textContent is "d"', 'yes'],
  ['#d1\'s textContent is "z"', 'no'],
  ['#d1\'s textContent is not "d"', 'no'],
  ['the textContent of #d1 is "d"', 'yes'],
  ['the textContent of #d1 is "z"', 'no'],
  ['textContent of #d1 is "d"', 'yes'],
  ['textContent of #d1 is "z"', 'no'],
];

describe.each(CONDITIONS)('if %s', (condition, expected) => {
  it('English, through buildAST', async () => {
    const node = parseSemantic(handler(condition), 'en').node;
    expect(node, condition).toBeTruthy();
    expect(await run(buildAST(node!).ast)).toBe(expected);
  });

  it.each(LANGUAGES)('%s', async language => {
    const code = render(parseSemantic(handler(condition), 'en').node!, language);
    const compiled = await hyperscript.compile(code, { language });
    expect(compiled.ok, `${language}: ${code}`).toBe(true);
    expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
    expect(await run(compiled.ast)).toBe(expected);
  });
});
