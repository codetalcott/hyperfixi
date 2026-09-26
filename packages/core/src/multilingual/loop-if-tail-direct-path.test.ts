/**
 * A translated loop that holds an `if` runs the `if`, and the commands after
 * the loop, on the multilingual direct path.
 *
 * The command after such a loop was dropped in 13 languages (the loop took
 * the if's `end` for its own), and an `if` whose condition opens with a
 * literal was dropped inside a loop in every language (its branch ran
 * unconditionally). Both conditions here are false, so a dropped `if` shows
 * as extra `a`s and a dropped tail as a missing `b`.
 */
import { describe, it, expect } from 'vitest';
import { parseSemantic, render } from '@lokascript/semantic';
import { hyperscript } from '../api/hyperscript-api';

// bn's শেষ moves the loop's `end` past the command after it — filed.
const FOREIGN = [
  'ar',
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

async function click(source: string, language: string): Promise<string> {
  const code = translate(source, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = '<button></button>';
  const button = document.body.firstElementChild as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return button.textContent ?? '';
}

describe('a false `if x` in a loop, then a command after it', () => {
  it.each(FOREIGN)('%s', async language => {
    const text = await click(
      'on click repeat 2 times if x append "a" to me end end then append "b" to me',
      language
    );
    expect(text).toBe('b');
  });
});

describe('a false literal-first `if 2 < 1` in a loop', () => {
  it.each(FOREIGN)('%s', async language => {
    const text = await click(
      'on click repeat 2 times if 2 < 1 append "a" to me end end then append "b" to me',
      language
    );
    expect(text).toBe('b');
  });
});
