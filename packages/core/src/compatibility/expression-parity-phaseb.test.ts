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
import { evalHyperScript } from './eval-hyperscript';

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
});
