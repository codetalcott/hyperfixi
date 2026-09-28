/**
 * An attribute in brackets, as the direct path builds it.
 *
 * Every tokenizer reads `[@title]` and `[@title="x"]` as one attribute-selector
 * token, and the value converter kept it a selector, so the direct path
 * queried it: `put [@title] into #out` moved an element that has a title,
 * where both engines write `me`'s title, and `add [@title="x"] to me` changed
 * nothing. Core's parser builds `[@title]` as the attribute reference `@title`
 * is, and `[@title="x"]` as its text, which `add`, `remove` and `toggle` read.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, buildAST } from '../src/index';

const LANGUAGES = [
  'en',
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
];

/** The first argument of the first command the handler runs. */
function firstArg(source: string, language: string): unknown {
  const code = language === 'en' ? source : render(parse(source, 'en')!, language);
  const ast = buildAST(parse(code, language)!).ast as { commands: Array<{ args: unknown[] }> };
  return ast.commands[0]!.args[0];
}

describe.each(LANGUAGES)('%s', language => {
  it('`put [@title]` reads the attribute', () => {
    expect(firstArg('on click put [@title] into #out', language)).toMatchObject({
      type: 'attributeAccess',
      attributeName: 'title',
    });
  });

  it('`toggle [@disabled]` reads the attribute', () => {
    expect(firstArg('on click toggle [@disabled] on #b', language)).toMatchObject({
      type: 'attributeAccess',
      attributeName: 'disabled',
    });
  });

  it('`add [@title="x"]` is its text', () => {
    expect(firstArg('on click add [@title="x"] to me', language)).toMatchObject({
      type: 'literal',
      value: '[@title="x"]',
    });
  });
});
