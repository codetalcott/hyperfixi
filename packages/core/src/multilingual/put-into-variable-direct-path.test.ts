/**
 * A translated `put … into <variable>` runs on the multilingual direct path.
 *
 * put's destination took a selector or reference only, so a loop's element
 * (`into item`) or a property path (`into my.textContent`) matched no pattern
 * in ar/de/fr/id/zh and the put was dropped. Each case renders the English
 * into the language, compiles it on the direct path, and clicks.
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

/** Compile the translation on the direct path, install it on the button, click it. */
async function click(source: string, language: string, fixture: string): Promise<HTMLElement> {
  const code = translate(source, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = `${fixture}<button>b</button>`;
  const button = document.body.querySelector('button') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return button;
}

describe('`put "x" into item` fills each element of a loop', () => {
  it.each(FOREIGN)('%s', async language => {
    await click(
      'on click repeat for item in <li/> in #list put "x" into item end',
      language,
      '<ul id="list"><li>a</li><li>b</li></ul>'
    );
    expect([...document.querySelectorAll('#list li')].map(li => li.textContent)).toEqual([
      'x',
      'x',
    ]);
  });
});

describe('`put "hi" into my.textContent` sets it', () => {
  it.each(FOREIGN)('%s', async language => {
    const button = await click('on click put "hi" into my.textContent', language, '');
    expect(button.textContent).toBe('hi');
  });
});
