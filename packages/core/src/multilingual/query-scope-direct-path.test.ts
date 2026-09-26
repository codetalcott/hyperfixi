/**
 * A translated query keeps its `in <scope>` on the multilingual direct path.
 *
 * The semantic parse dropped a query's `in …` tail, so a translated `add .x to
 * <button/> in #box` marked every button on the page. Each case renders the
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

describe('`add .x to <button/> in #box` marks only the button in #box', () => {
  const SOURCE = 'on click add .x to <button/> in #box';

  it.each(FOREIGN)('%s', async language => {
    const code = translate(SOURCE, language);
    const compiled = await hyperscript.compile(code, { language });
    expect(compiled.ok, `${language}: ${code}`).toBe(true);
    expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
    document.body.innerHTML =
      '<div id="clicker"></div><div id="box"><button id="inside"></button></div><button id="outside"></button>';
    const clicker = document.getElementById('clicker')!;
    await hyperscript.execute(compiled.ast!, hyperscript.createContext(clicker));
    clicker.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(document.getElementById('inside')!.classList.contains('x'), 'inside').toBe(true);
    expect(document.getElementById('outside')!.classList.contains('x'), 'outside').toBe(false);
  });
});
