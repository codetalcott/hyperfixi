/**
 * A translated `tell` runs its body on the told element, and a bare `show` /
 * `hide` runs, on the multilingual direct path.
 *
 * Two losses. Semantic required show's and hide's target, so a bare one
 * matched no pattern and was dropped in every language: `on click tell #modal
 * to show` translated to a tell with no body, and `on click hide then …` lost
 * its `hide`. And buildAST built every tell without its body, which core's
 * tell throws on. Each case renders the English into the language, compiles
 * it on the direct path, and clicks.
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
async function click(source: string, language: string, fixture: string): Promise<HTMLElement> {
  const code = translate(source, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = `${fixture}<button></button>`;
  const button = document.body.querySelector('button') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await settle();
  return button;
}

describe('`on click tell #modal to show` shows #modal', () => {
  it.each(FOREIGN)('%s', async language => {
    await click(
      'on click tell #modal to show',
      language,
      '<div id="modal" style="display: none"></div>'
    );
    expect(document.getElementById('modal')!.style.display).not.toBe('none');
  });
});

describe('`on click tell #panel to hide` hides #panel, not the button', () => {
  it.each(FOREIGN)('%s', async language => {
    const button = await click('on click tell #panel to hide', language, '<div id="panel"></div>');
    expect(document.getElementById('panel')!.style.display).toBe('none');
    expect(button.style.display).not.toBe('none');
  });
});

// Every translated tell threw here, whatever its body: semantic keeps the body
// as the statements after a flat tell, and buildAST never handed them to it.
describe('`on click tell #panel add .open then add .visible` runs on #panel', () => {
  it.each(FOREIGN)('%s', async language => {
    const button = await click(
      'on click tell #panel add .open then add .visible',
      language,
      '<div id="panel"></div>'
    );
    expect([...document.getElementById('panel')!.classList]).toEqual(['open', 'visible']);
    expect(button.classList.length).toBe(0);
  });
});

describe('`on click tell <p/> in #box to add .x` runs once per told element', () => {
  it.each(FOREIGN)('%s', async language => {
    await click(
      'on click tell <p/> in #box to add .x',
      language,
      '<div id="box"><p></p><p></p></div><p id="outside"></p>'
    );
    expect(document.querySelectorAll('#box p.x')).toHaveLength(2);
    expect(document.getElementById('outside')!.classList.contains('x')).toBe(false);
  });
});

describe('`on click hide then add .done` hides the button', () => {
  it.each(FOREIGN)('%s', async language => {
    const button = await click('on click hide then add .done', language, '');
    expect(button.style.display).toBe('none');
    expect(button.classList.contains('done')).toBe(true);
  });
});
