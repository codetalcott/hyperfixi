/**
 * A non-English loop RUNS on the multilingual direct path.
 *
 * `hyperscript.compile(src, { language })` builds a non-English program from the
 * semantic node (`buildAST`), not from core's parser. That node used to hold a
 * loop FLAT — `[repeat-head, stmt, stmt, …]` — so the `repeat` command reached
 * the runtime with no body and none of the slots RepeatCommand reads, and threw
 * "repeat command requires a loop type" on every click. Nothing in the loop,
 * and nothing after it, ever ran, in any of the 23 languages. English was
 * untouched: it always goes through core's own parser.
 *
 * The parser now nests a loop's body into a loop node, and buildLoop emits the
 * `repeat` core's parser builds: the form and operands in slots, the body a
 * block. Each case renders the English source into the language (the same
 * call as `hyperfixi.translate`), compiles it on the direct path, clicks it,
 * and checks the DOM: the loop's effect repeats, and the command after the
 * loop's `end` runs once, after it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
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

/** Compile on the direct path, install on a fresh button, click it once. */
async function click(code: string, language: string): Promise<void> {
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  const button = document.createElement('button');
  document.body.appendChild(button);
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.click();
  await new Promise(resolve => setTimeout(resolve, 50));
}

beforeEach(() => {
  document.body.innerHTML = '<div id="o"></div><i class="i"></i><i class="i"></i>';
});

describe('a counted loop runs, and what follows its `end` runs once after it', () => {
  const SOURCE = 'on click repeat 3 times append "x" to #o end then append "!" to #o';

  it.each(FOREIGN)('%s', async language => {
    await click(translate(SOURCE, language), language);
    expect(document.getElementById('o')!.textContent).toBe('xxx!');
  });
});

describe('a for-in loop binds its variable for each element', () => {
  const SOURCE = 'on click for item in .i add .done to item end then append "!" to #o';

  it.each(['es', 'ja', 'ar', 'de', 'ko', 'zh'])('%s', async language => {
    await click(translate(SOURCE, language), language);
    expect(document.querySelectorAll('.i.done')).toHaveLength(2);
    expect(document.getElementById('o')!.textContent).toBe('!');
  });
});
