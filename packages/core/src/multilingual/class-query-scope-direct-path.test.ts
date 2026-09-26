/**
 * A class query scoped by `in` (`.item in #list`) reads the matches inside the
 * scope, in core's English and on the multilingual direct path.
 *
 * Core read a scoped query only from a `<…/>` query: `.item in #list` was a
 * containment test, so `set x to .item in #list` set a boolean, `add .z to
 * .item in #list` threw `Invalid add target`, and a loop over it never ran.
 * Semantic dropped the scope (`set x to .item`), in English and so in every
 * translation. Upstream reads the matches inside #list. `is in` stays a
 * membership test.
 */
import { describe, it, expect } from 'vitest';
import { parseSemantic, render } from '@lokascript/semantic';
import { hyperscript } from '../api/hyperscript-api';

const FOREIGN = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
] as const;

function translate(source: string, language: string): string {
  const node = parseSemantic(source, 'en').node;
  if (!node) throw new Error(`no English parse: ${source}`);
  return render(node, language);
}

/** Compile (English through core's parser), install on the button, click; return the page. */
async function click(source: string, language: string): Promise<string> {
  const code = language === 'en' ? source : translate(source, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  if (language !== 'en') expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML =
    '<ul id="list"><li class="item">a</li><li class="item">b</li></ul>' +
    '<p class="item">c</p><div id="out">o</div><button>b</button>';
  const button = document.body.querySelector('button') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  const items = [...document.querySelectorAll('.item')].map(e => `${e.textContent}:${e.className}`);
  return `${document.getElementById('out')!.textContent} | ${items.join(' ')}`;
}

// Each handler with the page upstream leaves (#out, then each `.item`), and
// the languages it is not yet right in: it reads `aggiungere .z a .item in
// #list` as `add .z in .item to #list`, as it reads an element query.
const CASES: Array<[string, string, readonly string[]]> = [
  ['on click set x to .item in #list then put x.length into #out', '2 | a:item b:item c:item', []],
  ['on click add .z to .item in #list', 'o | a:item z b:item z c:item', ['it']],
  ['on click for el in .item in #list put "y" into el end', 'o | y:item y:item c:item', []],
];

describe.each(CASES)('%s', (source, expected, notYet) => {
  it('English, through core’s parser', async () => {
    expect(await click(source, 'en')).toBe(expected);
  });

  it.each(FOREIGN.filter(language => !notYet.includes(language)))('%s', async language => {
    expect(await click(source, language)).toBe(expected);
  });
});

// `is in` is membership, not a scoped query.
it('English `if .item is in #list` stays a membership test', async () => {
  const page = await click(
    'on click if .item is in #list put "yes" into #out else put "no" into #out end',
    'en'
  );
  expect(page.startsWith('no |')).toBe(true);
});
