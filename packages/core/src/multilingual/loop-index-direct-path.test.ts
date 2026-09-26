/**
 * A translated loop binds its index variable on the multilingual direct path.
 *
 * Semantic read neither upstream's `index i` nor core's `with index`, so both
 * dropped in English and so in every translation, and the body's index was
 * unbound. Each case renders the English into the language, compiles it on
 * the direct path, and clicks.
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

const settle = () => new Promise(resolve => setTimeout(resolve, 30));

/** Compile the translation on the direct path, install it on the button, click it. */
async function click(source: string, language: string, fixture: string): Promise<void> {
  const code = translate(source, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = `${fixture}<button></button>`;
  const button = document.body.querySelector('button') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await settle();
}

const LIST = '<ul id="list"><li>a</li><li>b</li><li>c</li></ul>';
const items = () => [...document.querySelectorAll('#list li')].map(li => li.textContent);

describe('`repeat for item in … index idx` binds idx', () => {
  it.each(FOREIGN)('%s', async language => {
    await click(
      'on click repeat for item in <li/> in #list index idx append idx to item end',
      language,
      LIST
    );
    expect(items()).toEqual(['a0', 'b1', 'c2']);
  });
});

describe('`repeat 3 times index idx` binds idx', () => {
  it.each(FOREIGN)('%s', async language => {
    await click(
      'on click repeat 3 times index idx append idx to #out end',
      language,
      '<p id="out"></p>'
    );
    expect(document.getElementById('out')!.textContent).toBe('012');
  });
});

// bn/ms/th/tl localize a bare `index` in the body as a lexicon word and do not
// read it back (`log index` → ms `catat indeks` → `log indeks`), so their
// body appends an unbound name. That is not the loop head's doing; filed.
const LEXICON_INDEX = new Set(['bn', 'ms', 'th', 'tl']);

describe('core’s `with index` binds index', () => {
  it.each(FOREIGN.filter(language => !LEXICON_INDEX.has(language)))('%s', async language => {
    await click(
      'on click repeat for item in <li/> in #list with index append index to item end',
      language,
      LIST
    );
    expect(items()).toEqual(['a0', 'b1', 'c2']);
  });
});
