/**
 * hcon.ts
 *
 * HCON — htmx Configuration Object Notation. htmx v4's mini config language for
 * structured HTML attributes, used by `hx-trigger`, `hx-swap`, `hx-vals`,
 * `hx-headers` and friends.
 *
 * Ported from bigskysoftware/htmx@four:src/htmx.js (Zero-Clause BSD, no
 * attribution required). The port is deliberately faithful — the point is
 * byte-for-byte grammar parity with htmx, so an author who knows one knows the
 * other. Resist "improving" the regexes; divergence here is a compatibility bug.
 *
 * Grammar:
 *   - Pairs are separated by spaces OR commas (equivalent).
 *   - A bare key with no value is `true`:            `once`      -> {once: true}
 *   - Values may be bare, "quoted", 'quoted', or a
 *     `<.../>` selector literal (hyperscript's own
 *     query-literal syntax, which lets a selector
 *     carry spaces/commas):                          `from:<ul > li/>`
 *   - Each value is JSON.parse'd if it can be, else
 *     kept as a string:                              `n:42` -> number, `n:x` -> "x"
 *   - A bare dotted key nests; a quoted one does not:
 *     `a.b:1` -> {a:{b:1}}   vs   `"a.b":1` -> {"a.b":1}
 *   - A whole string starting with `{` is JSON.
 *   - `__proto__`/`constructor`/`prototype` keys are dropped.
 *
 * Two limits inherited from upstream, both intentional:
 *   1. `split` understands one bracket level, not nested ones (`x[a,[b,c]],y`
 *      mis-splits). htmx attribute values do not nest brackets in practice.
 *   2. The `{`-prefixed JSON fast path calls JSON.parse directly, which can mint
 *      an own `__proto__` key. Callers that turn HCON output back into code or
 *      merge it into a live object must skip prototype keys themselves — see
 *      `emitHyperscriptObjectLiteral` in htmx-translator.ts.
 *
 * @see https://four.htmx.org/docs#hcon
 */

/** Keys that must never be written onto an object built from untrusted input. */
const PROTO_KEYS = ['__proto__', 'constructor', 'prototype'];

export type HconPrimitive = string | number | boolean | null;
export type HconValue = HconPrimitive | HconValue[] | { [key: string]: HconValue };
export type HconObject = Record<string, HconValue>;

/**
 * Matches one `key` or `key:value` pair.
 *
 * Capture groups, in order: "key" | 'key' | key | "value" | 'value' | <value/> | value
 */
const PAIR_PATTERN =
  /(?:"([^"]+)"|'([^']+)'|([^\s,:]+))(?:\s*:\s*(?:"([^"]*)"|'([^']*)'|<((?:[^/]|\/(?!>))+)\/>|([^\s,]+)))?(?=\s|,|$)/g;

/**
 * Splits at top-level commas only. Commas inside `[]`, `()`, `<.../>`, `"..."`
 * and `'...'` are preserved.
 */
const TOP_LEVEL_COMMA = /,(?![^[]*\])(?![^(]*\))(?![^<]*\/>)(?=(?:[^"']|"[^"]*"|'[^']*')*$)/;

/**
 * Parses an HCON string into an object.
 *
 * @example
 * parse('foo:1 bar:true');   // {foo: 1, bar: true}
 * parse('sse.mode:once');    // {sse: {mode: 'once'}}
 * parse('from:<ul > li/>');  // {from: 'ul > li'}
 * parse('{"foo": 1}');       // {foo: 1}
 */
export function parse(input: string): HconObject {
  if (!input) return {};
  if (input.startsWith('{')) return JSON.parse(input) as HconObject;

  const result: HconObject = {};

  for (const match of input.matchAll(PAIR_PATTERN)) {
    const [
      ,
      doubleQuotedKey,
      singleQuotedKey,
      bareKey,
      doubleQuotedValue,
      singleQuotedValue,
      selectorValue, // <value/> — htmx calls this the "hyperscript value"
      bareValue,
    ] = match;

    const key = doubleQuotedKey ?? singleQuotedKey ?? bareKey;
    let value: HconValue = (
      doubleQuotedValue ??
      singleQuotedValue ??
      selectorValue ??
      bareValue ??
      'true'
    ).trim();

    // JSON-parse when possible: "5" -> 5, "true" -> true, "abc" stays "abc".
    try {
      value = JSON.parse(value as string) as HconValue;
    } catch {
      /* not JSON — keep the string */
    }

    // Bare `a.b` nests; quoted `"a.b"` stays literal.
    const isDottedPath = bareKey?.includes('.');
    const pair: HconObject = isDottedPath
      ? (key
          .split('.')
          .reduceRight<HconValue>((acc, segment) => ({ [segment]: acc }), value) as HconObject)
      : { [key]: value };

    merge(pair, result);
  }

  return result;
}

/**
 * Splits an HCON-aware string at top-level commas.
 *
 * @example
 * split('a:1, b:2');             // ['a:1', ' b:2']
 * split('from:".a, .b", click'); // ['from:".a, .b"', ' click']
 */
export function split(input: string): string[] {
  return input.split(TOP_LEVEL_COMMA);
}

/**
 * Deep-merges a source (HCON string or object) into a target. Prototype keys are
 * dropped at every level.
 *
 * @example
 * merge({a: {b: 1}}, {a: {c: 2}}); // {a: {b: 1, c: 2}}
 * merge('a.b:1', {a: {c: 2}});     // {a: {b: 1, c: 2}}
 */
export function merge(source: HconObject | string, target: HconObject): HconObject {
  const src: HconObject = typeof source === 'string' ? parse(source) : source;

  for (const [key, val] of Object.entries(src)) {
    if (PROTO_KEYS.includes(key)) continue;

    const sourceIsObject = !!val && typeof val === 'object' && !Array.isArray(val);
    const targetIsObject =
      !!target[key] && typeof target[key] === 'object' && !Array.isArray(target[key]);

    if (sourceIsObject && targetIsObject) {
      merge(val as HconObject, target[key] as HconObject);
    } else {
      target[key] = val;
    }
  }

  return target;
}
