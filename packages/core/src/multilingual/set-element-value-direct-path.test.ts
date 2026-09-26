/**
 * A translated `set x to <an element or an array>` runs on the multilingual
 * direct path, and so does an array anywhere.
 *
 * set's value took no selector, and the tokenizers read an element or an array
 * as one selector token, so `set el to #d1` was lost in every language. An
 * array reached core as an attribute selector, and querySelectorAll('[1, 2]')
 * threw: every translated `repeat for x in [1, 2]` threw. Each case renders the
 * English into the language, compiles it on the direct path, and clicks.
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

const FIXTURE = '<div id="wrap"><div id="d1"></div><div id="d2"></div></div><div id="out"></div>';

/** Compile the translation on the direct path, install it on the button, click it. */
async function click(source: string, language: string): Promise<void> {
  const code = translate(source, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = `${FIXTURE}<button>b</button>`;
  const button = document.body.querySelector('button') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
}

const text = (id: string): string | null => document.getElementById(id)!.textContent;

describe('`set el to #d1 then put "y" into el` fills #d1', () => {
  it.each(FOREIGN)('%s', async language => {
    await click('on click set el to #d1 then put "y" into el', language);
    expect(text('d1')).toBe('y');
  });
});

describe('`set x to <div/> in #wrap` holds the query', () => {
  it.each(FOREIGN)('%s', async language => {
    await click('on click set x to <div/> in #wrap then put x.length into #out', language);
    expect(text('out')).toBe('2');
  });
});

describe('`set x to [1, 2]` holds the array', () => {
  it.each(FOREIGN)('%s', async language => {
    await click('on click set x to [1, 2] then put x.length into #out', language);
    expect(text('out')).toBe('2');
  });
});

describe('`set x to *opacity` reads the style', () => {
  it.each(FOREIGN)('%s', async language => {
    await click(
      'on click set my *opacity to 0.5 then set x to *opacity then put x into #out',
      language
    );
    expect(text('out')).toBe('0.5');
  });
});

describe('`repeat for x in [1, 2]` loops over the array', () => {
  it.each(FOREIGN)('%s', async language => {
    await click('on click repeat for x in [1, 2] put x into #out end', language);
    expect(text('out')).toBe('2');
  });
});

describe('`put [1, 2] into x` puts the array', () => {
  it.each(FOREIGN)('%s', async language => {
    await click('on click put [1, 2] into x then put x.length into #out', language);
    expect(text('out')).toBe('2');
  });
});
