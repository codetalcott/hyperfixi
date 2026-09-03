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

  it('publishes no UNAUTHORED isBlocking/hasBody/version on any command', () => {
    // The gate against the defaults coming back. `commandMeta()` used to fill
    // all three, so the generated `docs/commands/commands.json` carried
    // `isBlocking: false`, `hasBody: false`, `version: '1.0.0'` on all 59
    // commands with ZERO variance — asserting that `wait`, `fetch`, `settle`
    // and `transition` do not block and that `if`, `repeat` and `tell` take no
    // body. Nothing authored those values and nothing read them; the defaulting
    // was the entire source of the falsehood.
    //
    // Absence is now meaningful (UNDECLARED, not `false`), so this checks for
    // *unauthored* presence: a command may still declare one truthfully, but a
    // uniform value across the whole registry is the defaulting bug returning.
    // Written registry-wide rather than over CONVERTED because the defect was
    // never about those three classes — it was about all of them.
    const present: Record<string, string[]> = { isBlocking: [], hasBody: [], version: [] };
    const total = registryImplementations().size;
    for (const [name, impl] of registryImplementations()) {
      const md = (impl.metadata ?? {}) as Record<string, unknown>;
      for (const field of Object.keys(present)) {
        if (field in md) present[field]!.push(name);
      }
    }
    for (const [field, names] of Object.entries(present)) {
      expect(
        names.length,
        `${field} is declared on ${names.length}/${total} commands. If that equals the ` +
          `registry size, commandMeta() is defaulting it again — which publishes a claim ` +
          `no author made. A few truthful declarations are fine; all of them is the bug.`
      ).toBeLessThan(total);
    }
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

  it.each(CONVERTED)('$name carries no unauthored boilerplate', ({ cls }) => {
    // This row has now been inverted TWICE, so the history is worth keeping.
    //
    // Step 1 shipped `commandMeta` as pure identity and asserted these three
    // fields were ABSENT. Step 3 inverted it — `commandMeta` filled
    // `isBlocking`/`hasBody`/`version` exactly as `@meta` did — because that
    // kept the 52 classes it migrated byte-identical, which was the larger
    // preservation at the time. The comment then said, correctly, that the
    // values were boilerplate and false for other commands, and that fixing it
    // was a separate filed item.
    //
    // This is that item, resolved the other way: not by authoring 59 truthful
    // booleans, but by not publishing a claim nobody made. See the registry-wide
    // assertion below for why that is the safer direction.
    const md = cls.metadata as Record<string, unknown>;
    expect(md).not.toHaveProperty('isBlocking');
    expect(md).not.toHaveProperty('hasBody');
    expect(md).not.toHaveProperty('version');
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
