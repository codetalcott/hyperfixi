/**
 * Compat Evaluator Parity Test (design-doc Q6)
 *
 * Exercises the same expressions through the legacy `_hyperscript.evaluate()`
 * shim (`evalHyperScript`) and the canonical helper
 * (`evaluateExpressionFromSource`), asserting identical results — modulo
 * the documented divergences:
 *   - Q2: silent-null member access (canonical returns undefined; legacy throws).
 *   - Q3: lose-`this`-on-extraction (extracted methods stored in vars).
 *
 * Purpose: safety net for Phase δ. Each prod-caller migration should keep
 * this test green; a regression here means the swap changed observable
 * behavior for at least one expression shape.
 *
 * Intentionally narrow: a representative sample per AST type, not exhaustive.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evalHyperScript } from './eval-hyperscript';
import { evaluateExpressionFromSource } from '../parser/runtime';
import { createContext } from '../core/context';

type Locals = Record<string, unknown>;

function makeCanonicalCtx(locals: Locals = {}, me: unknown = null) {
  const c = createContext();
  for (const [k, v] of Object.entries(locals)) c.locals.set(k, v);
  if (me !== null) (c as any).me = me;
  return c;
}

function makeLegacyCtx(locals: Locals = {}, me: unknown = null) {
  // `evalHyperScript` accepts `HyperScriptContext` which uses a plain object
  // for locals (it's converted to Map internally by convertContext).
  return { me, locals } as any;
}

describe('Compat evaluator parity (legacy ↔ canonical)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('Literals + arithmetic', () => {
    const cases: Array<[string, unknown]> = [
      ['1 + 2', 3],
      ['10 - 3', 7],
      ['2 * 3', 6],
      ['10 / 4', 2.5],
      ['"hello"', 'hello'],
      ['42', 42],
      ['null', null],
      ['true', true],
      ['false', false],
    ];
    for (const [src, expected] of cases) {
      it(`\`${src}\` → ${JSON.stringify(expected)}`, async () => {
        const legacy = await evalHyperScript(src, makeLegacyCtx());
        const canonical = await evaluateExpressionFromSource(src, makeCanonicalCtx());
        expect(canonical).toBe(expected);
        expect(legacy).toBe(expected);
      });
    }
  });

  describe('Boolean / comparison', () => {
    const cases: Array<[string, unknown]> = [
      ['true and false', false],
      ['true or false', true],
      ['5 > 3', true],
      ['5 < 3', false],
      ['5 == 5', true],
      ['5 != 3', true],
    ];
    for (const [src, expected] of cases) {
      it(`\`${src}\` → ${expected}`, async () => {
        const legacy = await evalHyperScript(src, makeLegacyCtx());
        const canonical = await evaluateExpressionFromSource(src, makeCanonicalCtx());
        expect(canonical).toBe(expected);
        expect(legacy).toBe(expected);
      });
    }
  });

  describe('String concatenation (β.6a fix)', () => {
    it('`"Hello" + " World"` → "Hello World"', async () => {
      const legacy = await evalHyperScript('"Hello" + " World"', makeLegacyCtx());
      const canonical = await evaluateExpressionFromSource(
        '"Hello" + " World"',
        makeCanonicalCtx()
      );
      expect(canonical).toBe('Hello World');
      expect(legacy).toBe('Hello World');
    });
  });

  describe('Locals + member access', () => {
    it('locals identifier', async () => {
      const ctx = makeCanonicalCtx({ x: 5 });
      const legacy = await evalHyperScript('x', makeLegacyCtx({ x: 5 }));
      const canonical = await evaluateExpressionFromSource('x', ctx);
      expect(canonical).toBe(5);
      expect(legacy).toBe(5);
    });

    it('obj.prop', async () => {
      const obj = { prop: 'value' };
      const legacy = await evalHyperScript('obj.prop', makeLegacyCtx({ obj }));
      const canonical = await evaluateExpressionFromSource('obj.prop', makeCanonicalCtx({ obj }));
      expect(canonical).toBe('value');
      expect(legacy).toBe('value');
    });

    it('chained obj.nested.prop', async () => {
      const obj = { nested: { prop: 'deep' } };
      const legacy = await evalHyperScript('obj.nested.prop', makeLegacyCtx({ obj }));
      const canonical = await evaluateExpressionFromSource(
        'obj.nested.prop',
        makeCanonicalCtx({ obj })
      );
      expect(canonical).toBe('deep');
      expect(legacy).toBe('deep');
    });

    it('me.className (plain object as me — Q1.6 contract)', async () => {
      const me = { className: 'hello' };
      const legacy = await evalHyperScript('me.className', makeLegacyCtx({}, me));
      const canonical = await evaluateExpressionFromSource(
        'me.className',
        makeCanonicalCtx({}, me)
      );
      expect(canonical).toBe('hello');
      expect(legacy).toBe('hello');
    });
  });

  describe('Selectors (Q1.5 contract)', () => {
    it('#id returns single element', async () => {
      const el = document.createElement('div');
      el.id = 'parity-id';
      document.body.appendChild(el);

      const legacy = await evalHyperScript('#parity-id', makeLegacyCtx());
      const canonical = await evaluateExpressionFromSource('#parity-id', makeCanonicalCtx());
      expect(canonical).toBe(el);
      expect(legacy).toBe(el);
    });

    it('.class returns iterable (both yield equal length + first)', async () => {
      const a = document.createElement('div');
      a.className = 'parity-cls';
      const b = document.createElement('div');
      b.className = 'parity-cls';
      document.body.append(a, b);

      const legacy = await evalHyperScript('.parity-cls', makeLegacyCtx());
      const canonical = await evaluateExpressionFromSource('.parity-cls', makeCanonicalCtx());
      // Both must be iterable with 2 elements where index 0 === a.
      // Class types may differ (NodeList vs Array) — assert behavior, not class.
      const legacyArr = Array.from(legacy as ArrayLike<unknown>);
      const canonArr = Array.from(canonical as ArrayLike<unknown>);
      expect(canonArr).toHaveLength(2);
      expect(legacyArr).toHaveLength(2);
      expect(canonArr[0]).toBe(a);
      expect(legacyArr[0]).toBe(a);
    });
  });

  describe('Template literals (γ.1)', () => {
    it('static template returns its literal text', async () => {
      const legacy = await evalHyperScript('`hello world`', makeLegacyCtx());
      const canonical = await evaluateExpressionFromSource('`hello world`', makeCanonicalCtx());
      expect(canonical).toBe('hello world');
      expect(legacy).toBe('hello world');
    });

    it('interpolates ${expr}', async () => {
      const legacy = await evalHyperScript('`${1 + 1}`', makeLegacyCtx());
      const canonical = await evaluateExpressionFromSource('`${1 + 1}`', makeCanonicalCtx());
      expect(canonical).toBe('2');
      expect(legacy).toBe('2');
    });

    it('interpolates $var from locals', async () => {
      const legacy = await evalHyperScript('`hello $name`', makeLegacyCtx({ name: 'world' }));
      const canonical = await evaluateExpressionFromSource(
        '`hello $name`',
        makeCanonicalCtx({ name: 'world' })
      );
      expect(canonical).toBe('hello world');
      expect(legacy).toBe('hello world');
    });
  });

  describe('Documented divergences (Q2: silent-null vs throw)', () => {
    it('null.x → canonical undefined, legacy throws', async () => {
      const canonical = await evaluateExpressionFromSource(
        'nullVar.x',
        makeCanonicalCtx({ nullVar: null })
      );
      expect(canonical).toBeUndefined();

      await expect(
        evalHyperScript('nullVar.x', makeLegacyCtx({ nullVar: null }))
      ).rejects.toThrow();
    });

    it('undefVar.x → canonical undefined, legacy throws', async () => {
      const canonical = await evaluateExpressionFromSource(
        'undefVar.x',
        makeCanonicalCtx({ undefVar: undefined })
      );
      expect(canonical).toBeUndefined();

      await expect(
        evalHyperScript('undefVar.x', makeLegacyCtx({ undefVar: undefined }))
      ).rejects.toThrow();
    });
  });

  describe('Possessive (Q1.6 aliases)', () => {
    it('my.textContent reads from context.me', async () => {
      const me = { textContent: 'world' };
      const legacy = await evalHyperScript('my.textContent', makeLegacyCtx({}, me));
      const canonical = await evaluateExpressionFromSource(
        'my.textContent',
        makeCanonicalCtx({}, me)
      );
      expect(canonical).toBe('world');
      expect(legacy).toBe('world');
    });
  });

  describe('Conversion (`as`)', () => {
    it('`"5" as Int` → 5', async () => {
      const legacy = await evalHyperScript('"5" as Int', makeLegacyCtx());
      const canonical = await evaluateExpressionFromSource('"5" as Int', makeCanonicalCtx());
      expect(canonical).toBe(5);
      expect(legacy).toBe(5);
    });
  });
});
