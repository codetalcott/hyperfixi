/**
 * A translated `if … else if … end then …` runs the command after the chain.
 *
 * The semantic parser read an `else if` chain as a nested `if`, which wanted
 * its own `end`; the chain's one `end` closed the inner `if` and the command
 * after it landed in the outer else branch. On the direct path it then ran
 * only when the first condition was false.
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

async function click(code: string, language: string): Promise<HTMLElement> {
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = '<button></button>';
  const button = document.body.firstElementChild as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 20));
  return button;
}

describe('the command after an `else if` chain runs when the first branch does', () => {
  const SOURCE =
    'on click if true add .a to me else if false add .b to me end then add .after to me';

  it.each(FOREIGN)('%s', async language => {
    const button = await click(translate(SOURCE, language), language);
    expect(button.classList.contains('a'), 'first branch').toBe(true);
    expect(button.classList.contains('after'), 'after the chain').toBe(true);
  });
});
