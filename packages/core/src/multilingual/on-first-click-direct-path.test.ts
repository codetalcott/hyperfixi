/**
 * A translated `on first click` handler runs on the first click only, on the
 * multilingual direct path.
 *
 * Semantic had no reading for `on first click`: the English parse dropped the
 * whole head, so no translation carried a handler at all. Each case renders
 * the English into the language, compiles it on the direct path, and clicks
 * twice.
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

describe('`on first click append "x" to me` appends once', () => {
  const SOURCE = 'on first click append "x" to me';

  it.each(FOREIGN)('%s', async language => {
    const code = translate(SOURCE, language);
    const compiled = await hyperscript.compile(code, { language });
    expect(compiled.ok, `${language}: ${code}`).toBe(true);
    expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
    document.body.innerHTML = '<button></button>';
    const button = document.body.firstElementChild as HTMLElement;
    await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(button.textContent).toBe('x');
  });
});
