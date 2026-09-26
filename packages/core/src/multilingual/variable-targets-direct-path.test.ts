/**
 * A translated command that acts on a variable's element runs on the
 * multilingual direct path.
 *
 * The roles that name an element took a selector or a reference only, so a
 * variable (`hide el`, a loop's element) was dropped and the command acted on
 * `me`, in English and so in every translation. At the top level, `toggle .a
 * on el then …` split off a handler `on el`, and the commands after it never
 * ran. Each case renders the English into the language, compiles it on the
 * direct path, and clicks.
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
async function click(
  source: string,
  language: string,
  fixture: string,
  setup: () => void = () => {}
): Promise<HTMLElement> {
  const code = translate(source, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = `${fixture}<button>b</button>`;
  setup();
  const button = document.body.querySelector('button') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return button;
}

const TWO = '<div class="x"></div><div class="x"></div>';
const each = (selector: string): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>(selector),
];

describe('`repeat for el in .x hide el end` hides each element', () => {
  it.each(FOREIGN)('%s', async language => {
    await click('on click repeat for el in .x hide el end', language, TWO);
    expect(each('.x').map(el => el.style.display)).toEqual(['none', 'none']);
  });
});

describe('`repeat for el in .x show el end` shows each element', () => {
  it.each(FOREIGN)('%s', async language => {
    await click(
      'on click repeat for el in .x show el end',
      language,
      '<div class="x" style="display: none"></div><div class="x" style="display: none"></div>'
    );
    expect(each('.x').map(el => el.style.display === 'none')).toEqual([false, false]);
  });
});

describe('`repeat for el in .x remove el end` removes each element', () => {
  it.each(FOREIGN)('%s', async language => {
    await click('on click repeat for el in .x remove el end', language, TWO);
    expect(each('.x')).toHaveLength(0);
  });
});

describe('`repeat for el in .x toggle .a on el end` toggles each element', () => {
  it.each(FOREIGN)('%s', async language => {
    const button = await click('on click repeat for el in .x toggle .a on el end', language, TWO);
    expect(each('.x.a')).toHaveLength(2);
    expect(button.classList.contains('a')).toBe(false);
  });
});

describe('`repeat for el in .x trigger foo on el end` sends to each element', () => {
  it.each(FOREIGN)('%s', async language => {
    await click('on click repeat for el in .x trigger foo on el end', language, TWO, () => {
      for (const el of each('.x')) el.addEventListener('foo', () => el.classList.add('got'));
    });
    expect(each('.x.got')).toHaveLength(2);
  });
});

describe('`repeat for el in .x take .a from el end` takes from those elements only', () => {
  it.each(FOREIGN)('%s', async language => {
    const button = await click(
      'on click repeat for el in .x take .a from el end',
      language,
      '<div class="x a"></div><div class="x a"></div><div id="other" class="a"></div>'
    );
    expect(button.classList.contains('a')).toBe(true);
    expect(each('.x.a')).toHaveLength(0);
    expect(document.getElementById('other')!.classList.contains('a')).toBe(true);
  });
});

describe('`repeat for el in .x tell el add .t end end` adds to each element', () => {
  it.each(FOREIGN)('%s', async language => {
    const button = await click(
      'on click repeat for el in .x tell el add .t end end',
      language,
      TWO
    );
    expect(each('.x.t')).toHaveLength(2);
    expect(button.classList.contains('t')).toBe(false);
  });
});

describe('`toggle .a on el then add .b to #d2` runs both, in one handler', () => {
  it.each(FOREIGN)('%s', async language => {
    await click(
      'on click get #d1 then set el to it then toggle .a on el then add .b to #d2',
      language,
      '<div id="d1"></div><div id="d2"></div>'
    );
    expect(document.getElementById('d1')!.classList.contains('a')).toBe(true);
    expect(document.getElementById('d2')!.classList.contains('b')).toBe(true);
  });
});

describe('`put "x" into el then add .b to #d2` runs both, in one handler', () => {
  it.each(FOREIGN)('%s', async language => {
    await click(
      'on click get #d1 then set el to it then put "x" into el then add .b to #d2',
      language,
      '<div id="d1"></div><div id="d2"></div>'
    );
    expect(document.getElementById('d1')!.textContent).toBe('x');
    expect(document.getElementById('d2')!.classList.contains('b')).toBe(true);
  });
});
