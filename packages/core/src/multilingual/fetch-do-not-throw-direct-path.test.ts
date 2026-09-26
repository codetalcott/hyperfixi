/**
 * A translated `fetch … do not throw` tolerates an error response on the
 * multilingual direct path.
 *
 * The semantic parse dropped the phrase, so a translated fetch threw on the
 * 404 its author told it to tolerate, and the handler stopped there. Each case
 * renders the English into the language, compiles it on the direct path, and
 * clicks with `fetch` answering 404.
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

describe('`fetch … do not throw` runs on past a 404', () => {
  const SOURCE = 'on click fetch "/missing" do not throw then put "ok" into me';

  it.each(FOREIGN)('%s', async language => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('gone', { status: 404, statusText: 'Not Found' }))
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
    expect(button.textContent).toBe('ok');
  });
});
