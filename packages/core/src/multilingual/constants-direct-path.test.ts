/**
 * true, false and null run as themselves on the multilingual direct path.
 *
 * Semantic read the keyword as an untyped STRING literal, and buildAST handed
 * core the string: a translated `set #d1.disabled to false` set the truthy
 * "false" and left the button disabled, `set x to true then if x is true`
 * took the else branch, and null was truthy too. English runs through core's
 * parser, which always read them right.
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

// hi/qu/tr render null with their word for "empty", which reads back as the
// `empty` command, and sw/vi read theirs back as the word `empty`. Filed.
const NULL_IS_EMPTY = new Set(['hi', 'qu', 'sw', 'tr', 'vi']);

function translate(source: string, language: string): string {
  const node = parseSemantic(source, 'en').node;
  if (!node) throw new Error(`no English parse: ${source}`);
  return render(node, language);
}

/** Compile (English through core's parser), install on #host, click; return #out. */
async function click(source: string, language: string): Promise<string> {
  const code = language === 'en' ? source : translate(source, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  if (language !== 'en') expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML =
    '<div id="out">o</div><button id="d1" disabled>d</button><button id="host">h</button>';
  const host = document.getElementById('host') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(host));
  host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.textContent!;
}

// Each handler with the #out both engines leave.
const CASES: Array<[string, string]> = [
  ['on click set #d1.disabled to false then put #d1.disabled into #out', 'false'],
  [
    'on click set x to true then if x is true put "yes" into #out else put "no" into #out end',
    'yes',
  ],
  ['on click set x to false then if x put "yes" into #out else put "no" into #out end', 'no'],
];

describe.each(CASES)('%s', (source, expected) => {
  it('English, through core’s parser', async () => {
    expect(await click(source, 'en')).toBe(expected);
  });

  it.each(FOREIGN)('%s', async language => {
    expect(await click(source, language)).toBe(expected);
  });
});

const NULL_CASE =
  'on click set x to 5 then set x to null then if x is null put "yes" into #out else put "no" into #out end';

describe(NULL_CASE, () => {
  it('English, through core’s parser', async () => {
    expect(await click(NULL_CASE, 'en')).toBe('yes');
  });

  it.each(FOREIGN.filter(l => !NULL_IS_EMPTY.has(l)))('%s', async language => {
    expect(await click(NULL_CASE, language)).toBe('yes');
  });
});
