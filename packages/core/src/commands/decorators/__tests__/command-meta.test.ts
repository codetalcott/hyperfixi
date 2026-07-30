/**
 * `commandMeta()` and the static/instance metadata bridge — Arc B step 1.
 *
 * ## What this file is FOR, and what it deliberately cannot do
 *
 * `commandMeta()`'s whole job is compile-time. Its runtime behaviour is
 * `return metadata` — there is nothing to unit-test about that, and a test
 * asserting "it returns its argument" would be theatre. **The gate for
 * `commandMeta` is `npm run typecheck`**, mutation-verified at the real call
 * sites when it landed (an invalid `category` → TS2820, a nonsense
 * `sideEffects` entry → TS2820, a misspelled field → TS2561). Read those as the
 * gate; do not add a runtime test that pretends to cover them.
 *
 * What IS testable, and is the reason this file exists, is the **bridge
 * invariant** the migration depends on: every registered command serves the
 * same metadata through its static and through its instance. Arc B step 3
 * migrates 52 more classes onto exactly this shape, and
 * `runtime/command-adapter.ts` reads the INSTANCE side — `:440`'s alias read is
 * load-bearing, and dropping it silently un-registers `unless`, `trigger`,
 * `replace` and `decrement`. So a class whose static moves while its instance
 * read goes `undefined` is the migration's central risk, and it is invisible to
 * every other suite: nothing else compares the two.
 *
 * These assertions are written over the whole registry rather than over the
 * three converted classes, so they keep holding as step 3 lands and fail the
 * moment a migrated class loses its instance bridge.
 */

import { describe, it, expect } from 'vitest';
import { Runtime } from '../../../runtime/runtime';
import { InstallCommand } from '../../behaviors/install';
import { PseudoCommand } from '../../execution/pseudo-command';
import { RenderCommand } from '../../templates/render';

/** The three classes converted in step 1 — undecorated, `commandMeta`-checked. */
const CONVERTED = [
  { name: 'install', cls: InstallCommand, category: 'behaviors' },
  { name: 'pseudo-command', cls: PseudoCommand, category: 'execution' },
  { name: 'render', cls: RenderCommand, category: 'templates' },
] as const;

function registryImplementations(): Map<string, { metadata?: unknown; name?: string }> {
  const registry = new Runtime().getRegistry() as unknown as {
    implementations: Map<string, { metadata?: unknown; name?: string }>;
  };
  return registry.implementations;
}

describe('the static/instance metadata bridge', () => {
  it('serves the SAME OBJECT through the static and the instance, for every registered command', () => {
    // Identity, not deep equality: two structurally-equal copies would mean a
    // consumer mutating one sees a stale other, and it would also hide a
    // migration that rebuilt the object per-instance (a real perf regression at
    // 59 commands). `@meta` and `commandMeta` both satisfy identity today.
    const mismatched: string[] = [];
    for (const [name, impl] of registryImplementations()) {
      const fromStatic = (impl.constructor as unknown as { metadata?: unknown }).metadata;
      if (impl.metadata !== fromStatic) mismatched.push(name);
    }
    expect(mismatched).toEqual([]);
  });

  it('exposes a defined instance `metadata` for every registered command', () => {
    // The specific failure the migration risks: the static moves, the instance
    // read silently returns undefined, and `command-adapter.ts:440` stops
    // finding aliases. Asserted separately from identity above because
    // `undefined === undefined` would satisfy that check.
    const missing = [...registryImplementations()]
      .filter(([, impl]) => impl.metadata == null)
      .map(([name]) => name);
    expect(missing).toEqual([]);
  });

  it('exposes a defined static `metadata` for every registered command', () => {
    const missing = [...registryImplementations()]
      .filter(
        ([, impl]) => (impl.constructor as unknown as { metadata?: unknown }).metadata == null
      )
      .map(([name]) => name);
    expect(missing).toEqual([]);
  });
});

describe('the classes converted to commandMeta() in step 1', () => {
  it.each(CONVERTED)(
    '$name keeps its static, its bridge, and its category',
    ({ cls, category }) => {
      expect(cls.metadata).toBeDefined();
      expect(cls.metadata.category).toBe(category);
      // The instance getter returns the static itself, which is what lets the
      // adapter keep reading `impl.metadata` unchanged.
      expect(new cls().metadata).toBe(cls.metadata);
    }
  );

  it.each(CONVERTED)('$name now carries the three defaults (step 3 MOVED this row)', ({ cls }) => {
    // INVERTED in step 3, deliberately, and left as an explicit assertion
    // rather than deleted so the change reads as a moved row.
    //
    // Step 1 shipped `commandMeta` as pure identity and asserted these three
    // fields were ABSENT here, because that was shape-preserving for the three
    // classes it converted. Step 3 chose the other way — `commandMeta` fills
    // `isBlocking`/`hasBody`/`version` exactly as `@meta` did — because that is
    // what keeps the FIFTY-TWO classes it migrated byte-identical, which is the
    // larger preservation. The cost is these three gaining the fields, and this
    // assertion is that cost, written down.
    //
    // The values are boilerplate and two of them are false for other commands
    // (`wait`/`fetch` do block, `if`/`repeat` do take bodies). Authoring them
    // truthfully is a separate, filed item — do NOT quietly fix it here.
    const md = cls.metadata as Record<string, unknown>;
    expect(md.isBlocking).toBe(false);
    expect(md.hasBody).toBe(false);
    expect(md.version).toBe('1.0.0');
  });

  it.each(CONVERTED)('$name carries a compatibility value (step 3)', ({ cls }) => {
    // None of the three is a LokaScript extension, so all three project to
    // 'standard'. The projection itself is gated in the manifest audit's §9;
    // this only pins that step 3 did not skip the classes it had already
    // touched in step 1.
    expect((cls.metadata as Record<string, unknown>).compatibility).toBe('standard');
  });

  it('is exactly the set of registered commands whose name is an OWN property', () => {
    // Ties the list above to a structural fact instead of a hand-maintained
    // count: `@command` installs `name` on the PROTOTYPE, while these three
    // declare a class field. So "undecorated" is observable, and this fails if
    // a fourth class is converted (or one of these is decorated) without the
    // list being updated. As step 3 migrates the other 52 it must NOT change
    // this — those keep `@command` and its prototype `name`.
    const ownName = [...registryImplementations()]
      .filter(([, impl]) => Object.prototype.hasOwnProperty.call(impl, 'name'))
      .map(([name]) => name)
      .sort();
    expect(ownName).toEqual(CONVERTED.map(c => c.name).sort());
  });
});
