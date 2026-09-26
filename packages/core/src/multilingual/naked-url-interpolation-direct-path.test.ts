/**
 * A translated naked `${…}` URL interpolates on the multilingual direct path.
 *
 * Core builds `fetch /search?q=${my value}` as a template. The semantic parse
 * kept the URL as a plain string and every render quoted it, and a quoted
 * string interpolates on neither engine: a translated search box requested
 * `/search?q=${my value}` literally. Each case renders the English into the
 * language, compiles it on the direct path, and fires `input` with `fetch`
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

describe('`fetch /search?q=${my value}` requests what was typed', () => {
  const SOURCE = 'on input fetch /search?q=${my value} then put it into #results';

  it.each(FOREIGN)('%s', async language => {
    const requested: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL) => {
        requested.push(String(url));
        return new Response('found');
      })
    );
    const code = translate(SOURCE, language);
    const compiled = await hyperscript.compile(code, { language });
    expect(compiled.ok, `${language}: ${code}`).toBe(true);
    expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
    document.body.innerHTML = '<input value="abc"><div id="results"></div>';
    const input = document.body.firstElementChild as HTMLInputElement;
    await hyperscript.execute(compiled.ast!, hyperscript.createContext(input));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(requested, code).toEqual(['/search?q=abc']);
    expect(document.getElementById('results')!.textContent).toBe('found');
  });
});
