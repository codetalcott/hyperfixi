/**
 * Arc 7 step 1 — one arithmetic across every registry-using bundle.
 *
 * Two categories used to define `addition` and `multiplication`: `special`'s
 * returned the raw result, `mathematical`'s rejects a non-finite one, and
 * `createExpressionRegistry` is last-write-wins — so `Infinity + 1` succeeded
 * in the bundles that registered only `special` (minimal, standard, the two
 * classic ones) and failed in the full bundles. `special`'s pair is deleted;
 * every registry now takes `mathematical`, and this pins that the six
 * arithmetic names resolve to the same implementations everywhere.
 */
import { describe, it, expect } from 'vitest';
import { createCoreRegistry } from './core-expressions';
import { createCommonRegistry } from './common-expressions';
import { createFullRegistry } from './full-expressions';
import { createFullExpressionRegistry } from '../index';
import { mathematicalExpressions } from '../mathematical/index';
import { createContext } from '../../core/context';

const registries = {
  core: createCoreRegistry(),
  common: createCommonRegistry(),
  full: createFullRegistry(),
  'full (kitchen sink)': createFullExpressionRegistry(),
};

describe('arithmetic parity across registries', () => {
  for (const [name, registry] of Object.entries(registries)) {
    it(`${name}: the six arithmetic names are mathematical's`, () => {
      for (const key of Object.keys(mathematicalExpressions)) {
        const impl = registry.get(key);
        expect(impl, key).toBeDefined();
        expect(impl, key).toBe((mathematicalExpressions as Record<string, unknown>)[key]);
      }
    });

    it(`${name}: a non-finite sum is a failure, not Infinity`, async () => {
      const addition = registry.get('addition') as {
        evaluate(ctx: unknown, input: unknown): Promise<{ success: boolean; value?: unknown }>;
      };
      const ok = await addition.evaluate(createContext(null), { left: 1, right: 2 });
      expect(ok.success).toBe(true);
      expect(ok.value).toBe(3);
      const overflow = await addition.evaluate(createContext(null), {
        left: Number.MAX_VALUE,
        right: Number.MAX_VALUE,
      });
      expect(overflow.success).toBe(false);
    });
  }
});
