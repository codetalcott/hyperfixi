/**
 * Expression upstream-parity regression guards (Phase B — feature gaps).
 *
 * Mirrors failing cases from the upstream `_hyperscript` expression test suite
 * that the browser parity harness exercises against the built bundle
 * (src/compatibility/browser-tests/expressions.spec.ts). Running them through
 * `evalHyperScript` guards the fixes at the source level so a regression surfaces
 * in unit tests, not just the slower Playwright harness.
 *
 * Companion to expression-parity-phasea.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { evalHyperScript, evalHyperScriptSync } from './eval-hyperscript';
import { conversionConfig } from '../expressions/conversion';

describe('expression parity (Phase B)', () => {
  describe('Track A — set attribute write-path (attributeRef / possessiveExpression)', () => {
    // `set @attr to V` / `[@attr]` / `my @attr` / `my [@attr]` / `@attr of X` /
    // `X[@attr]` must route to setAttribute on the resolved element. Previously
    // the attributeAccess target fell through to the property/member path and the
    // write was silently dropped (or keyed on the attribute's current value).
    async function setAttr(code: string): Promise<string | null> {
      const div = document.createElement('div');
      div.setAttribute('data-foo', 'red');
      document.body.appendChild(div);
      await evalHyperScript(code, { me: div, locals: { x: div } });
      return div.getAttribute('data-foo');
    }

    it('writes a standalone @attr to the context element', async () => {
      expect(await setAttr('set @data-foo to "blue"')).toBe('blue');
    });
    it('writes a bracketed [@attr]', async () => {
      expect(await setAttr('set [@data-foo] to "blue"')).toBe('blue');
    });
    it('writes a possessive my @attr', async () => {
      expect(await setAttr('set my @data-foo to "blue"')).toBe('blue');
    });
    it('writes a bracketed possessive my [@attr]', async () => {
      expect(await setAttr('set my [@data-foo] to "blue"')).toBe('blue');
    });
    it('writes @attr of X (indirect)', async () => {
      expect(await setAttr('set @data-foo of x to "blue"')).toBe('blue');
    });
    it('writes [@attr] of X (indirect, bracketed)', async () => {
      expect(await setAttr('set [@data-foo] of x to "blue"')).toBe('blue');
    });
    it('writes X[@attr] (computed member)', async () => {
      expect(await setAttr('set x[@data-foo] to "blue"')).toBe('blue');
    });

    // Guard the read path stays intact.
    it('still reads a bare [@attr] off the context element', async () => {
      const div = document.createElement('div');
      div.setAttribute('data-bar', 'green');
      expect(await evalHyperScript('[@data-bar]', { me: div })).toBe('green');
    });
    // Known gap (deferred): bare `x@attr` member-short adjacency is a parse-level
    // read-syntax gap (affects reads too, not just set) — use `x[@attr]` instead.
  });

  describe('Track B — relativePositional from/within/in/with-wrapping', () => {
    // `next <sel> from <el> [within <el> | in <coll>] [with wrapping]` previously
    // errored with "Unexpected token: from"; parseNavigationFunction now consumes
    // the modifiers and the runtime applies upstream document-order scan semantics
    // (returning `undefined` on no-match, matching upstream).
    function setup() {
      document.body.innerHTML =
        "<div id='d1' class='c1'></div><p class='c1'></p>" +
        "<div id='d2' class='c1'></div><p class='c1'></p>" +
        "<div id='d3' class='c1'></div>";
    }
    const id = (s: string) => document.getElementById(s);

    it('next <div/> from #d1 → next matching sibling', async () => {
      setup();
      expect(await evalHyperScript('the next <div/> from #d1')).toBe(id('d2'));
    });
    it('next <div/> from the last → undefined (no match, no wrap)', async () => {
      setup();
      expect(await evalHyperScript('the next <div/> from #d3')).toBeUndefined();
    });
    it('previous <div/> from #d2 → previous matching sibling', async () => {
      setup();
      expect(await evalHyperScript('the previous <div/> from #d2')).toBe(id('d1'));
    });
    it('next … with wrapping wraps to the first match', async () => {
      setup();
      expect(await evalHyperScript('the next <div/> from #d3 with wrapping')).toBe(id('d1'));
    });
    it('next … in <collection> scans the array', async () => {
      setup();
      expect(await evalHyperScript('the next <div/> from #d1 in .c1')).toBe(id('d2'));
    });
    it('next <h1/> … in <collection> → undefined (no match)', async () => {
      setup();
      expect(await evalHyperScript('the next <h1/> from #d1 in .c1')).toBeUndefined();
    });
    it('previous <h1/> … in <collection> → undefined (no match)', async () => {
      setup();
      expect(await evalHyperScript('the previous <h1/> from #d1 in .c1')).toBeUndefined();
    });
    it('within <container> constrains the search root', async () => {
      document.body.innerHTML =
        "<div id='d1' class='c1'><div id='d2' class='c1'></div><div id='d3' class='c1'></div></div>" +
        "<div id='d4' class='c1'></div>";
      expect(await evalHyperScript('the next .c1 from #d2 within #d1')).toBe(id('d3'));
      expect(await evalHyperScript('the next .c1 from #d3 within #d1')).toBeUndefined();
    });
    it('bare `next <sel>` (no modifiers) keeps the legacy tree-walk', async () => {
      document.body.innerHTML = "<div id='b1'></div><div id='b2' class='target'></div>";
      const b1 = id('b1')!;
      expect(await evalHyperScript('next .target', { me: b1 })).toBe(id('b2'));
    });
  });

  describe('Track C — stringPostfix measurement units', () => {
    // `1em` / `100%` / `(0 + 1) px` etc. errored with "Unexpected token: em".
    // A trailing CSS unit (or a `%` with no operand) now stringifies the value.
    it('appends CSS units to a number', async () => {
      expect(await evalHyperScript('1em')).toBe('1em');
      expect(await evalHyperScript('1px')).toBe('1px');
      expect(await evalHyperScript('-1px')).toBe('-1px');
    });
    it('handles the % unit', async () => {
      expect(await evalHyperScript('100%')).toBe('100%');
    });
    it('allows a space before the unit', async () => {
      expect(await evalHyperScript('1 em')).toBe('1em');
      expect(await evalHyperScript('100 %')).toBe('100%');
    });
    it('applies to parenthesized expression roots', async () => {
      expect(await evalHyperScript('(0 + 1) em')).toBe('1em');
      expect(await evalHyperScript('(100 + 0) %')).toBe('100%');
    });
    it('keeps `%` as modulo when a right operand follows', async () => {
      expect(await evalHyperScript('100 % 5')).toBe(0);
      expect(await evalHyperScript('10 % 3')).toBe(1);
    });
    it('does not disturb arithmetic', async () => {
      expect(await evalHyperScript('1 + 1')).toBe(2);
      expect(await evalHyperScript('2 * 3')).toBe(6);
    });
  });

  describe('Track E — custom `as` conversions (config.conversions)', () => {
    // Upstream `_hyperscript.config.conversions` — a named converter or a
    // dynamic resolver extends the `as` target types.
    it('resolves a named custom converter', async () => {
      (conversionConfig.conversions as Record<string, unknown>).Foo = (val: unknown) => 'foo' + val;
      try {
        expect(await evalHyperScript('1 as Foo')).toBe('foo1');
      } finally {
        delete (conversionConfig.conversions as Record<string, unknown>).Foo;
      }
    });
    it('resolves a dynamic converter (first non-undefined wins)', async () => {
      const resolver = (conversion: string, val: unknown) =>
        conversion.indexOf('Foo:') === 0 ? conversion.split(':')[1] + val : undefined;
      conversionConfig.conversions.dynamicResolvers.push(resolver);
      try {
        expect(await evalHyperScript('1 as Foo:Bar')).toBe('Bar1');
      } finally {
        conversionConfig.conversions.dynamicResolvers.pop();
      }
    });
    it('still warns + passes through for a truly unknown type', async () => {
      expect(await evalHyperScript('1 as DefinitelyNotAType')).toBe(1);
    });
  });

  describe('Track D — blockLiteral lambdas', () => {
    // `\-> expr`, `\ x -> expr`, `\ x, y -> expr` errored at parse. They now
    // produce a function; the body is evaluated synchronously when possible so
    // the closure works as a plain JS callback (e.g. Array.map).
    it('no-arg lambda', async () => {
      const fn = (await evalHyperScript('\\-> true')) as () => unknown;
      expect(fn()).toBe(true);
    });
    it('identity lambda', async () => {
      const fn = (await evalHyperScript('\\ x -> x')) as (a: unknown) => unknown;
      expect(fn(true)).toBe(true);
      expect(fn(42)).toBe(42);
    });
    it('two-arg lambda', async () => {
      const fn = (await evalHyperScript('\\ x, y -> y')) as (a: unknown, b: unknown) => unknown;
      expect(fn(false, true)).toBe(true);
    });
    it('used as a synchronous Array.map callback (member-access body)', async () => {
      expect(await evalHyperScript("['a', 'ab', 'abc'].map(\\ s -> s.length)")).toEqual([1, 2, 3]);
    });
    it('the synchronous fast-path returns the function directly', () => {
      const fn = evalHyperScriptSync('\\ x -> x') as (a: unknown) => unknown;
      expect(fn('hi')).toBe('hi');
    });
  });
});
