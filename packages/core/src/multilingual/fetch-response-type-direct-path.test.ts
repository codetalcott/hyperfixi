/**
 * A translated `fetch … as text` runs on the multilingual direct path.
 *
 * Renders localized the response type through the value lexicon (ms `teks`,
 * ru `текст`, th `ข้อความ`), no parser read it back, and core's fetch threw on
 * the unknown type before making its request. Each case renders the English
 * into the language, compiles it on the direct path, and clicks with `fetch`
 * stubbed.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('`fetch "/x" as text then put it into me` puts the response', () => {
  const SOURCE = 'on click fetch "/x" as text then put it into me';

  it.each(FOREIGN)('%s', async language => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('found'))
    );
    const code = translate(SOURCE, language);
    const compiled = await hyperscript.compile(code, { language });
    expect(compiled.ok, `${language}: ${code}`).toBe(true);
    expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
    document.body.innerHTML = '<button></button>';
    const button = document.body.firstElementChild as HTMLElement;
    await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(button.textContent, code).toBe('found');
  });
});
