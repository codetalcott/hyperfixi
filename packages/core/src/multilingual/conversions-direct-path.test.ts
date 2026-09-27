/**
 * Every conversion core reads, semantic reads, and a pipe of them runs on the
 * multilingual direct path as core runs it in English.
 *
 * Semantic reads a value with a conversion whole only when it knows the type,
 * and a type it did not know cost more than the conversion: `put x as Boolean
 * into #out` lost the whole `put` in English, so in every translation. Its list
 * lacked `Boolean`, `JSONString`, `FormEncoded`, `Fixed:2`, `Values:Form` and
 * the collection conversions; the first half of this file holds it to core's
 * converters.
 *
 * And its expression tokenizer skipped `|`, so `x as JSONString | JSON` kept
 * only the first conversion. Each row's result differs without its pipe (or
 * without `Fixed`'s digits), and is upstream 0.9.93's for the English source.
 */
import { describe, it, expect } from 'vitest';
import { parseSemantic, render } from '@lokascript/semantic';
import { hyperscript } from '../api/hyperscript-api';
import { defaultConversions } from '../expressions/conversion';

const LANGUAGES = [
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

// But `Math`, which upstream does not have: th reads `เป็น` before a type name
// as `as`, and `6 is Math.max(n, 1)` renders `6 เป็น Math.max(n, 1)`.
const TYPES = [
  ...Object.keys(defaultConversions).filter(type => type !== 'Math'),
  'Fixed',
  'Fixed:2',
];

describe("semantic reads each of core's conversions", () => {
  it.each(TYPES)('as %s', type => {
    const source = `on click put x as ${type} into #out`;
    const node = parseSemantic(source, 'en').node;
    expect(node && render(node, 'en')).toBe(source);
  });
});

/** Run the handler on #b and read #out. */
async function run(ast: unknown): Promise<string> {
  document.body.innerHTML = '<div id="out">o</div><button id="b">b</button>';
  const button = document.getElementById('b') as HTMLElement;
  await hyperscript.execute(ast as never, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.textContent!;
}

const ROWS: Array<[string, string]> = [
  ['put "2.5" as Float | Int into #out', '2'],
  ['put "[1,2]" as JSON | JSONString into #out', '[1,2]'],
  ['put [3, 1, 3] as Unique | JSONString into #out', '[3,1]'],
  ['set x to "7" as Int | String then put x + 1 into #out', '71'],
  ['put 3.14159 as Fixed:2 into #out', '3.14'],
];

describe.each(ROWS)('on click %s', (body, expected) => {
  const source = `on click ${body}`;

  it('English', async () => {
    const compiled = hyperscript.compileSync(source);
    expect(compiled.ok, source).toBe(true);
    expect(await run(compiled.ast)).toBe(expected);
  });

  it.each(LANGUAGES)('%s', async language => {
    const code = render(parseSemantic(source, 'en').node!, language);
    const compiled = await hyperscript.compile(code, { language });
    expect(compiled.ok, `${language}: ${code}`).toBe(true);
    expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
    expect(await run(compiled.ast), `${language}: ${code}`).toBe(expected);
  });
});
