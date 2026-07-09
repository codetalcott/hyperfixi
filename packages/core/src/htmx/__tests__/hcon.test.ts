/**
 * hcon.test.ts
 *
 * Conformance suite for the HCON port. The `parse` / `split` / `merge` blocks are
 * ported from bigskysoftware/htmx@four:test/tests/unit/HCON.js (Zero-Clause BSD)
 * so that any divergence from upstream grammar shows up as a red test here.
 *
 * The trailing "port-specific" block covers the two limits documented in hcon.ts
 * and the behaviours our translator depends on.
 */
import { describe, it, expect } from 'vitest';

import { parse, split, merge, type HconObject } from '../hcon.js';

describe('HCON.parse', () => {
  it('parses simple key-value pair', () => {
    expect(parse('delay:100ms').delay).toBe('100ms');
  });

  it('parses boolean true from a bare key', () => {
    expect(parse('once').once).toBe(true);
  });

  it('parses boolean false', () => {
    expect(parse('once:false').once).toBe(false);
  });

  it('parses integer value', () => {
    expect(parse('count:42').count).toBe(42);
  });

  it('parses multiple key-value pairs', () => {
    const p = parse('delay:100ms throttle:200ms');
    expect(p.delay).toBe('100ms');
    expect(p.throttle).toBe('200ms');
  });

  it('parses comma-separated pairs', () => {
    const p = parse('delay:100ms, throttle:200ms');
    expect(p.delay).toBe('100ms');
    expect(p.throttle).toBe('200ms');
  });

  it('parses comma-separated pairs with no spaces', () => {
    expect(parse('a:1,b:2')).toEqual({ a: 1, b: 2 });
  });

  it('parses double-quoted string', () => {
    expect(parse('target:"#foo .bar"').target).toBe('#foo .bar');
  });

  it('parses single-quoted string', () => {
    expect(parse("target:'#foo .bar'").target).toBe('#foo .bar');
  });

  it('parses nested object with dot notation', () => {
    expect((parse('sse.mode:once').sse as HconObject).mode).toBe('once');
  });

  it('parses multiple nested properties', () => {
    const sse = parse('sse.mode:once sse.maxRetries:5').sse as HconObject;
    expect(sse.mode).toBe('once');
    expect(sse.maxRetries).toBe(5);
  });

  it('parses JSON object', () => {
    const p = parse('{"delay":"100ms","throttle":"200ms"}');
    expect(p.delay).toBe('100ms');
    expect(p.throttle).toBe('200ms');
  });

  it('parses JSON with nested object', () => {
    const sse = parse('{"sse":{"mode":"once","maxRetries":5}}').sse as HconObject;
    expect(sse.mode).toBe('once');
    expect(sse.maxRetries).toBe(5);
  });

  it('parses JSON with boolean', () => {
    const p = parse('{"once":true,"changed":false}');
    expect(p.once).toBe(true);
    expect(p.changed).toBe(false);
  });

  it('handles empty string', () => {
    expect(parse('')).toEqual({});
  });

  it('handles surrounding whitespace', () => {
    expect(parse('  delay:100ms  ').delay).toBe('100ms');
  });

  it('blocks __proto__ pollution via dotted keys', () => {
    const before = ({} as Record<string, unknown>).polluted;
    parse('__proto__.polluted: true');
    expect(({} as Record<string, unknown>).polluted).toBe(before);
  });

  it('blocks constructor pollution via dotted keys', () => {
    const before = ({} as Record<string, unknown>).hacked;
    parse('constructor.prototype.hacked: true');
    expect(({} as Record<string, unknown>).hacked).toBe(before);
  });

  it('parses unparseable value as string', () => {
    expect(parse('foo:bar').foo).toBe('bar');
  });

  it('parses quoted dotted key literally', () => {
    const p = parse('"a.b":1');
    expect(p['a.b']).toBe(1);
    expect(p.a).toBeUndefined();
  });

  it('parses single-quoted dotted key literally', () => {
    const p = parse("'a.b':1");
    expect(p['a.b']).toBe(1);
    expect(p.a).toBeUndefined();
  });

  it('parses quoted value with comma', () => {
    expect(parse('x:"hello, world"').x).toBe('hello, world');
  });

  it('parses JSON array inside quoted value', () => {
    expect(parse('x:"[1, 2, 3]"').x).toEqual([1, 2, 3]);
  });

  // ── selector (`<.../>`) value form: CSS selectors of every shape ──────────

  it.each([
    ['simple selector', 'from:<.foo/>', '.foo'],
    ['descendant selector', 'from:<div p/>', 'div p'],
    ['child combinator (>)', 'from:<ul > li/>', 'ul > li'],
    ['adjacent sibling (+)', 'from:<h1 + p/>', 'h1 + p'],
    ['general sibling (~)', 'from:<h1 ~ p/>', 'h1 ~ p'],
    ['class chain', 'from:<.a.b.c/>', '.a.b.c'],
    ['id + class', 'from:<#id.class/>', '#id.class'],
    ['attribute selector', 'from:<[data-x="y"]/>', '[data-x="y"]'],
    ['attribute selector with comma', 'from:<[data-list="a, b"]/>', '[data-list="a, b"]'],
    [':not() with comma', 'from:<:not(.a, .b)/>', ':not(.a, .b)'],
    [':has() with child combinator', 'from:<div:has(> .child)/>', 'div:has(> .child)'],
    [':nth-child', 'from:<li:nth-child(2n+1)/>', 'li:nth-child(2n+1)'],
    ['selector group (comma-separated)', 'from:<.a, .b, .c/>', '.a, .b, .c'],
    [
      'complex multi-combinator selector',
      'from:<.list > li:not(.disabled, .hidden) + .item/>',
      '.list > li:not(.disabled, .hidden) + .item',
    ],
  ])('parses selector value: %s', (_name, input, expected) => {
    expect(parse(input).from).toBe(expected);
  });

  it('parses selector value followed by another modifier', () => {
    const p = parse('from:<ul > li/> throttle:50ms');
    expect(p.from).toBe('ul > li');
    expect(p.throttle).toBe('50ms');
  });
});

describe('HCON.split', () => {
  it.each([
    ['empty string into one empty part', '', ['']],
    ['single value untouched', 'foo', ['foo']],
    ['two values', 'foo,bar', ['foo', 'bar']],
    ['three values', 'a,b,c', ['a', 'b', 'c']],
    ['whitespace around commas', 'foo , bar', ['foo ', ' bar']],
    ['trailing comma', 'foo,', ['foo', '']],
    ['leading comma', ',foo', ['', 'foo']],
    ['consecutive commas', 'a,,b', ['a', '', 'b']],
    ['only-commas input', ',,', ['', '', '']],
  ])('splits %s', (_name, input, expected) => {
    expect(split(input)).toEqual(expected);
  });

  it.each([
    ['inside []', 'click[fn(a,b)],keyup', ['click[fn(a,b)]', 'keyup']],
    ['inside attribute selector value', '[data-x="a,b"],.c', ['[data-x="a,b"]', '.c']],
    ['inside ()', '.x:not(.a, .b),.c', ['.x:not(.a, .b)', '.c']],
    ['inside nested pseudo-classes', ':has(.a, .b),.c', [':has(.a, .b)', '.c']],
    ['inside <.../>', '<doX(a, b)/>,change', ['<doX(a, b)/>', 'change']],
    [
      'inside <.../> with > combinator',
      '<ul > li:not(.a, .b)/>,next',
      ['<ul > li:not(.a, .b)/>', 'next'],
    ],
    ['inside double-quoted values', 'from:".a, .b",intersect', ['from:".a, .b"', 'intersect']],
    ['inside single-quoted values', "from:'.a, .b',intersect", ["from:'.a, .b'", 'intersect']],
    ['bracket containing paren', '[fn(a, b)],x', ['[fn(a, b)]', 'x']],
    [
      'all four protections',
      '[a,b],(c,d),<e,f/>,"g,h",i',
      ['[a,b]', '(c,d)', '<e,f/>', '"g,h"', 'i'],
    ],
  ])('does not split commas %s', (_name, input, expected) => {
    expect(split(input)).toEqual(expected);
  });

  it('splits realistic trigger spec', () => {
    expect(split('click from:".a, .b", change from:<ul > li/>')).toEqual([
      'click from:".a, .b"',
      ' change from:<ul > li/>',
    ]);
  });

  it('splits realistic selector list', () => {
    expect(split('closest .parent, find :not(.a, .b), .other')).toEqual([
      'closest .parent',
      ' find :not(.a, .b)',
      ' .other',
    ]);
  });

  it('still splits after an unbalanced bracket (best-effort)', () => {
    expect(split('foo[bar,baz')).toHaveLength(2);
  });
});

describe('HCON.merge', () => {
  it('returns target unchanged when source is empty', () => {
    const target: HconObject = { a: 1 };
    const result = merge({}, target);
    expect(result).toEqual({ a: 1 });
    expect(result).toBe(target);
  });

  it('mutates target in place and returns it', () => {
    const target: HconObject = {};
    const result = merge({ a: 1 }, target);
    expect(result).toBe(target);
    expect(target.a).toBe(1);
  });

  it('merges non-overlapping keys', () => {
    expect(merge({ b: 2 }, { a: 1 })).toEqual({ a: 1, b: 2 });
  });

  it('overwrites scalar values', () => {
    expect(merge({ a: 2 }, { a: 1 }).a).toBe(2);
  });

  it('deep-merges 2-level nested objects preserving siblings', () => {
    expect(merge({ sse: { mode: 'once' } }, { sse: { maxRetries: 5 } })).toEqual({
      sse: { mode: 'once', maxRetries: 5 },
    });
  });

  it('deep-merges 3-level nested objects preserving siblings', () => {
    expect(
      merge({ sse: { connection: { retries: 3 } } }, { sse: { connection: { timeout: 5000 } } })
    ).toEqual({ sse: { connection: { timeout: 5000, retries: 3 } } });
  });

  it('deep-merges 4-level nested objects', () => {
    expect(merge({ a: { b: { c: { d: 1 } } } }, { a: { b: { c: { e: 2 } } } })).toEqual({
      a: { b: { c: { d: 1, e: 2 } } },
    });
  });

  it('overwrites object target with scalar source', () => {
    expect(merge({ a: 'x' }, { a: { b: 1 } }).a).toBe('x');
  });

  it('overwrites scalar target with object source', () => {
    expect(merge({ a: { b: 1 } }, { a: 'x' }).a).toEqual({ b: 1 });
  });

  it('does not deep-merge arrays (replaces them)', () => {
    expect(merge({ list: [3, 4] }, { list: [1, 2] }).list).toEqual([3, 4]);
  });

  it('parses an HCON string source', () => {
    expect(merge('a:1 b:2', {})).toEqual({ a: 1, b: 2 });
  });

  it('parses a JSON-format string source', () => {
    expect(merge('{"a":1,"b":2}', {})).toEqual({ a: 1, b: 2 });
  });

  it('parses dotted HCON keys into a nested merge', () => {
    expect(merge('sse.mode:once', { sse: { existing: true } }).sse).toEqual({
      existing: true,
      mode: 'once',
    });
  });

  it('skips an own __proto__ key on the source', () => {
    // NOTE: `{__proto__: x}` as an object *literal* sets the prototype rather than
    // an own key, so it never reaches the guard. JSON.parse is how a real own
    // `__proto__` key arrives — that is the case worth pinning.
    const source = JSON.parse('{"__proto__":{"polluted":true}}') as HconObject;
    const target: HconObject = {};
    merge(source, target);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(target)).toBe(Object.prototype);
    expect(Object.keys(target)).toEqual([]);
  });

  it('skips constructor and prototype keys on the source', () => {
    const target: HconObject = {};
    merge({ constructor: { hacked: true }, prototype: { hacked: true } }, target);
    expect(({} as Record<string, unknown>).hacked).toBeUndefined();
    expect(target.prototype).toBeUndefined();
    expect(Object.keys(target)).toEqual([]);
  });
});

describe('HCON port-specific behaviour', () => {
  it('durations stay strings (htmx coerces them contextually)', () => {
    expect(parse('delay:200ms settle:2s wait:1m')).toEqual({
      delay: '200ms',
      settle: '2s',
      wait: '1m',
    });
  });

  it('a bare key after a valued key still becomes true', () => {
    expect(parse('delay:100ms once')).toEqual({ delay: '100ms', once: true });
  });

  it('parse() never returns a prototype-polluted object', () => {
    const result = parse('__proto__:x constructor:y prototype:z');
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.keys(result)).toEqual([]);
  });

  it('DOCUMENTED LIMIT: the {-prefixed JSON fast path can mint an own __proto__ key', () => {
    // Upstream behaviour. Callers that re-emit or merge HCON output must skip
    // prototype keys themselves — see emitHyperscriptObjectLiteral().
    const result = parse('{"__proto__":{"polluted":true}}');
    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
    // Contained: the global prototype is untouched.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('DOCUMENTED LIMIT: split() understands one bracket level, not nested ones', () => {
    // `x[a,[b,c]],y` mis-splits at the inner comma. htmx attribute values do not
    // nest brackets in practice. Pinned so a future "fix" is a deliberate choice.
    expect(split('x[a,[b,c]],y').length).toBeGreaterThan(2);
  });
});
