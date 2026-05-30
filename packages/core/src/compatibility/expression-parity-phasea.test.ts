/**
 * Expression upstream-parity regression guards (Phase A).
 *
 * These mirror failing cases from the upstream `_hyperscript` expression test
 * suite that the browser parity harness exercises against the built bundle
 * (src/compatibility/browser-tests/expressions.spec.ts). Running them through
 * `evalHyperScript` here guards the fixes at the source level so a regression
 * surfaces in unit tests, not just the slower Playwright harness.
 */
import { describe, it, expect } from 'vitest';
import { evalHyperScript } from './eval-hyperscript';

describe('expression parity (Phase A)', () => {
  describe('standalone `return <expr>` (splitJoin)', () => {
    // A single-command `return` program previously leaked the RETURN_EXECUTION
    // control-flow signal; only `... then return` (a sequence) caught it.
    it('returns a split array', async () => {
      expect(await evalHyperScript('return "a,b,c" split by ","')).toEqual(['a', 'b', 'c']);
    });
    it('returns a joined string', async () => {
      expect(await evalHyperScript('return ["a", "b", "c"] joined by ", "')).toBe('a, b, c');
    });
    it('returns a plain scalar from a standalone return', async () => {
      expect(await evalHyperScript('return 42')).toBe(42);
    });
  });

  describe('array `+` concatenation (mathOperator)', () => {
    it('concatenates two arrays', async () => {
      expect(await evalHyperScript('[1, 2] + [3, 4]')).toEqual([1, 2, 3, 4]);
    });
    it('appends a single value', async () => {
      expect(await evalHyperScript('[1, 2] + 3')).toEqual([1, 2, 3]);
    });
    it('chains left-to-right', async () => {
      expect(await evalHyperScript('[1] + [2] + [3]')).toEqual([1, 2, 3]);
    });
    it('does not mutate the original array', async () => {
      expect(await evalHyperScript('set a to [1, 2] then set b to a + [3] then return a')).toEqual([
        1, 2,
      ]);
    });
    it('still adds numbers and concatenates strings', async () => {
      expect(await evalHyperScript('1 + 1')).toBe(2);
      expect(await evalHyperScript("'a' + 'b'")).toBe('ab');
    });
  });

  describe('object-literal keys (objectLiteral)', () => {
    it('accepts hyphenated field names as string keys', async () => {
      expect(await evalHyperScript('{-foo:true, bar-baz:false}')).toEqual({
        '-foo': true,
        'bar-baz': false,
      });
    });
    it('accepts mixed plain / quoted / dashed keys', async () => {
      expect(await evalHyperScript('{plain: 1, "quoted": 2, -dashed: 3}')).toEqual({
        plain: 1,
        quoted: 2,
        '-dashed': 3,
      });
    });
    it('still parses plain object literals', async () => {
      expect(await evalHyperScript('{foo:true, bar:false}')).toEqual({ foo: true, bar: false });
    });
  });

  describe('`X of Y` property-path access (propertyAccess)', () => {
    it('reads a property via of-form', async () => {
      expect(await evalHyperScript('foo of foo', { locals: { foo: { foo: 'foo' } } })).toBe('foo');
    });
    it('handles a dotted path on the left', async () => {
      expect(
        await evalHyperScript('bar.doh of foo', { locals: { foo: { bar: { doh: 'foo' } } } })
      ).toBe('foo');
    });
    it('handles a dotted path on the right', async () => {
      expect(
        await evalHyperScript('doh of foo.bar', { locals: { foo: { bar: { doh: 'foo' } } } })
      ).toBe('foo');
    });
    it('chains of-forms (right-associative)', async () => {
      expect(await evalHyperScript('c of b of a', { locals: { a: { b: { c: 'deep' } } } })).toBe(
        'deep'
      );
    });
    it('still supports dot access', async () => {
      expect(await evalHyperScript('foo.foo', { locals: { foo: { foo: 'foo' } } })).toBe('foo');
    });
  });

  describe('collection-expression null safety (collectionExpressions)', () => {
    it('where on null returns null', async () => {
      expect(await evalHyperScript('set x to null then return x where it > 1')).toBeNull();
    });
    it('sorted by on null returns null', async () => {
      expect(await evalHyperScript('set x to null then return x sorted by it')).toBeNull();
    });
    it('mapped to on null returns null', async () => {
      expect(await evalHyperScript('set x to null then return x mapped to (it * 2)')).toBeNull();
    });
    it('split by on null returns null', async () => {
      expect(await evalHyperScript("set x to null then return x split by ','")).toBeNull();
    });
    it('joined by on null returns null', async () => {
      expect(await evalHyperScript("set x to null then return x joined by ','")).toBeNull();
    });
    it('where on undefined returns undefined', async () => {
      expect(await evalHyperScript('return doesNotExist where it > 1')).toBeUndefined();
    });
    it('still filters a non-null array', async () => {
      expect(
        await evalHyperScript('set arr to [1, 2, 3, 4, 5] then return arr where it > 3')
      ).toEqual([4, 5]);
    });
  });

  describe('bare `[@attr]` attribute reference (attributeRef)', () => {
    it('reads an attribute off the context element', async () => {
      const div = document.createElement('div');
      div.setAttribute('foo', 'c1');
      expect(await evalHyperScript('[@foo]', { me: div })).toBe('c1');
    });
    it('reads a dashed attribute name', async () => {
      const div = document.createElement('div');
      div.setAttribute('data-foo', 'c1');
      expect(await evalHyperScript('[@data-foo]', { me: div })).toBe('c1');
    });
  });
});
