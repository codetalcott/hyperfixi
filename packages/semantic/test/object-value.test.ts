/**
 * An object literal as a `put` or `set` value.
 *
 * The matcher folds a `{…}` run for two kinds of slot: an expression-only slot
 * (fetch's `with {…}`) keeps the source text for the expression parser, and a
 * slot that also accepts a literal makes it the TEXT `{ a : 1 }`, which a CSS
 * style block needs (`add { left: 10px } to me`). A `put` or `set` value
 * accepts a literal, so `set x to {a: 1}` stored a string and the direct path
 * wrote it. The command's role decides now, not the content: a one-property
 * style block and a one-key object look alike.
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

/** The first node of `type` in a built AST. */
function find(node: unknown, type: string): Record<string, unknown> | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const record = node as Record<string, unknown>;
  if (record.type === type) return record;
  for (const value of Object.values(record)) {
    const hit = find(value, type);
    if (hit) return hit;
  }
  return undefined;
}

const built = (source: string, language: string): unknown => {
  const code = language === 'en' ? source : render(parse(source, 'en')!, language);
  return buildAST(parse(code, language)!).ast;
};

describe.each([
  ['on click put {} into #out', 0],
  ['on click set x to {a: 1} then put x into #out', 1],
  ['on click set x to {a: 1, b: "q"} then put x into #out', 2],
])('%s', (source, properties) => {
  it.each(LANGUAGES)('%s builds an object', language => {
    const object = find(built(source, language), 'objectLiteral');
    expect(object, JSON.stringify(built(source, language))).toBeDefined();
    expect((object!.properties as unknown[]).length).toBe(properties);
  });
});

describe('a style block is still text', () => {
  it.each(['en', 'es', 'ja', 'ar'])('%s', language => {
    const ast = built('on click add { left: 10px } to me', language);
    expect(find(ast, 'objectLiteral')).toBeUndefined();
  });
});
