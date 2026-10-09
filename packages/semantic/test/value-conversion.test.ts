/**
 * A conversion, an attribute's `of`, and a written target.
 *
 * Semantic's expression parser had no `as` and no `@attr of`: it stopped at
 * either, so the matcher could not read `#a's textContent as Int + 1` or
 * `@title of #a` whole (`put @title of #a` kept `@title`, which reads `me`'s),
 * and buildAST dropped every conversion on the direct path.
 *
 * Reading them exposed a renderer fault: a possessive and its `of` form bind a
 * conversion differently (`#a's textContent as Int` converts the text,
 * `textContent of #a as Int` converts `#a`, on both engines), and 16
 * languages render a possessive in the `of` form. Before a conversion the
 * renderer now keeps the binding.
 *
 * And a written target is never an operator run or a call, `set`'s destination
 * as a counter's: it, pl, ru and uk render `set x to V` with V bare after `x`,
 * so `(n + 1)` read as a call `x(n + 1)` and `-n` as `x - n`.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, buildAST } from '../src/index';
import { readsAsOneExpression } from '../src/parser/utils/value-extent';
import { ofPhrasesAsPossessives } from '../src/explicit/of-phrases';

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
];

/**
 * Spellings that are the same program on both engines: the English join spaces
 * a call's parentheses and a unary minus, a parenthesized `of` phrase is the
 * possessive it renders (`(textContent of #a)` is `#a's textContent`), and so
 * is any other outside a conversion (`@title of #a`, which ja writes `#aの@title`
 * and reads back as `#a's @title`; M2 sheet A3).
 */
const normalize = (code: string): string =>
  ofPhrasesAsPossessives(code.replace(/\(\s*([A-Za-z][\w-]*) of ([#.][\w-]+)\s*\)/g, "$2's $1"))
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(^|[\s(])- (?=\w)/g, '$1-');

const SOURCES = [
  'on click put @title of #a into #out',
  'on click set x to @title of #a + "q" then put x into #out',
  'on click put "q" + @title of #a into #out',
  "on click put #a's textContent as Int + 1 into #out",
  "on click put #a's textContent as Int into #out",
  'on click put v of obj as Int into #out',
  'on click put textContent of #a as Int into #out',
  'on click put the textContent of #a as Int into #out',
  'on click set x to -n then put x into #out',
  'on click set x to (n + 1) then put x into #out',
  'on click set x to (s + "c") is "ab" then put x into #out',
  // A pipe chains conversions (`as JSONString | JSON`), and `Fixed:2`, which a
  // non-English tokenizer splits at its colon, is one type. Each dropped the
  // whole `put` in English, or the pipe's tail after `set`.
  'on click put x as JSONString | JSON into #out',
  'on click set x to n as Int | String then put x into #out',
  'on click put n as Fixed:2 into #out',
  'on click put #f as Values:Form into #out',
  'on click put n as Fixed:2 + "%" into #out',
  'on click put x as Boolean into #out',
  // An article before the type: es, it and pt read `a` as their `to` marker,
  // and tr lost `x`, so the conversion fold takes it.
  'on click put x as a Date into #out',
  'on click put x as an Int | String into #out',
  // A type registered at runtime (`hyperfixi.config.conversions.MyType`),
  // which semantic cannot see: capitalized, as every built-in one is.
  'on click put x as MyType into #out',
  'on click set x to n as Short then put x into #out',
  'on click put x as MyType | String into #out',
];

describe.each(SOURCES)('%s', source => {
  it('keeps the whole value in English', () => {
    expect(normalize(render(parse(source, 'en')!, 'en'))).toBe(normalize(source));
  });

  it.each(LANGUAGES)('%s', language => {
    const foreign = render(parse(source, 'en')!, language);
    expect(normalize(render(parse(foreign, language)!, 'en')), foreign).toBe(normalize(source));
  });
});

/** The first conversion in a tree. */
function firstConversion(node: unknown): { expression: { type: string } } | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const record = node as { type?: unknown; expression?: { type: string } };
  if (record.type === 'asExpression' && record.expression) {
    return record as { expression: { type: string } };
  }
  for (const value of Object.values(node)) {
    const found = firstConversion(value);
    if (found) return found;
  }
  return undefined;
}

describe('the direct path converts what the English converts', () => {
  const astOf = (source: string, language: string): unknown => {
    const code = language === 'en' ? source : render(parse(source, 'en')!, language);
    return buildAST(parse(code, language)!).ast;
  };

  it.each(['en', ...LANGUAGES])('%s: `v of obj as Int` converts `obj`', language => {
    const conversion = firstConversion(astOf('on click put v of obj as Int into #out', language));
    expect(conversion?.expression).toMatchObject({ type: 'identifier', name: 'obj' });
  });

  it.each(['en', ...LANGUAGES])('%s: a pipe converts the conversion before it', language => {
    expect(
      firstConversion(astOf('on click put x as JSONString | JSON into #out', language))
    ).toMatchObject({
      targetType: { name: 'JSON' },
      expression: { type: 'asExpression', targetType: { name: 'JSONString' } },
    });
  });

  it.each(['en', ...LANGUAGES])("%s: `#a's textContent as Int + 1` converts the text", language => {
    const conversion = firstConversion(
      astOf("on click put #a's textContent as Int + 1 into #out", language)
    );
    expect(['possessiveExpression', 'propertyOfExpression']).toContain(conversion?.expression.type);
  });
});

describe('a bracket run is an array on the direct path', () => {
  // Each tokenizer reads `[n, 2]` as one attribute-selector token, and the
  // expression parser read a `[` before a letter as an attribute selector too,
  // so every translation queried `[n, 2]` and threw. Only `[@name…]` is one.
  const astOf = (source: string, language: string): unknown => {
    const code = language === 'en' ? source : render(parse(source, 'en')!, language);
    return buildAST(parse(code, language)!).ast;
  };
  it.each(['en', ...LANGUAGES])('%s', language => {
    expect(JSON.stringify(astOf('on click put [n, 2] into #out', language))).toContain(
      '"type":"arrayLiteral"'
    );
  });
});

describe('an `of` phrase before a conversion keeps its binding', () => {
  it('English leaves `textContent of #a as Int` as it is', () => {
    expect(render(parse('on click put textContent of #a as Int into #out', 'en')!, 'en')).toBe(
      'on click put textContent of #a as Int into #out'
    );
  });

  it("es parenthesizes the `of` form of `#a's textContent as Int`", () => {
    expect(render(parse("on click put #a's textContent as Int into #out", 'en')!, 'es')).toContain(
      '(textContent de #a) as Int'
    );
  });
});

describe('a conversion inside a value names a type', () => {
  // The matcher reads a value whole only when every conversion in it names a
  // type downstream reads, trailing or not: a built-in one, or a capitalized
  // name, as one registered at runtime is.
  it.each([
    ['n as Int', true],
    ['n as Int + 1', true],
    ["#a's textContent as Int + 1", true],
    ['n as Wat', true],
    ['n as Wat + 1', true],
    ['n as wat', false],
    ['n as wat + 1', false],
    ['n as Int | String', true],
    ['n as Int | wat', false],
    ['n as wat | Int', false],
    ['n as Fixed:2', true],
    ['n as Values:Form', true],
    ['n as Values:Wat', true],
    ['n as Fixed', true],
    ['n as JSONString', true],
    ['n as json', true],
  ])('%s', (raw, whole) => {
    expect(readsAsOneExpression(raw)).toBe(whole);
  });
});
