# Handoff: unblock vitest 4.1.10 (Oxc vs TC39 decorators)

Paste the block below into a fresh session. Everything above the `---` is orientation for a
human; the prompt itself starts after it.

**Arc state:** root-caused and verified; **not fixed**. Three candidate fixes were tried and
**disproved empirically** — read "What does NOT work" before writing any code, it is the most
valuable part of this doc. Companion: `docs-internal/SPIKE_vite-plus-toolchain.md` (Addendum,
2026-07-16). Blocks Dependabot #694/695/696.

---

MISSION: Land vitest 4.1.6 → 4.1.10 (Dependabot #694 `@vitest/ui`, #695 `@vitest/coverage-v8`,
#696 `vitest`). All three are red with the identical failure. The cause is fully understood;
the fix is not. Do not budget this as a version bump.

## The failure

All three PRs: `Test Files 102 failed | 170 passed | 2 skipped (274)`, with **51×
`SyntaxError: Invalid or unexpected token`** carrying **no file, no line, no stack**. Every
failing file is in `packages/core` and fails at import/collection, not in an assertion.

`.github/workflows/dependabot.yml` currently blames _"vitest 4.1.x mass-breaks the core test
transform"_ and excludes `vitest`/`@vitest/*` from the group. **That diagnosis is wrong** and
the exclusion is hiding a real, unrelated landmine — fix the note when you fix the bug.

## Root cause (verified, do not re-derive)

1. `packages/core` declares **`vite: ^8.1.4`** — dead weight: core has no `vite.config.*` and
   imports vite nowhere (it builds with rollup + tsc).
2. On `main`, `vitest@4.1.6` is **hoisted to the root**, so it resolves the root's
   **`vite@7.3.6`**, which transforms with **esbuild** → decorators lowered → green.
3. **`@vitest/ui@4.1.10` exact-pins its peer `vitest: 4.1.10`.** Root vitest is 4.1.6, so npm
   **cannot** reuse the hoisted copy and must **nest** `packages/core/node_modules/vitest`.
4. A nested vitest resolves its own `vite` dependency (`^6.0.0 || ^7.0.0 || ^8.0.0`) fresh and
   npm picks the **highest** → **vite@8.1.4**.
5. **Vite 8 has no esbuild dependency at all** — it transforms with **Oxc**. Per Vite's own
   migration guide (§"JavaScript transforms by Oxc"): _"Currently, the Oxc transformer does
   not support lowering native decorators as we are waiting for the specification to
   progress."_
6. `packages/core` uses **TC39 stage-3 decorators** — `command()` takes
   `(target, context: ClassDecoratorContext)` (`src/commands/decorators/index.ts:103-107`),
   and **no tsconfig repo-wide sets `experimentalDecorators`**. So Oxc emits them **raw**.
7. vite-node wraps module output in `new AsyncFunction(...)` — **no filename, no source
   origin** — so V8 throws at the bare `@` with no location. That is the exact signature.

**The count is the proof:** **51 files** in core carry `@command`/`@meta` → **51
SyntaxErrors**. Decorators exist in **core only**, which is why only core breaks.

This also explains the thing that makes no sense at first: bumping **`@vitest/ui`** — a
package never loaded during `vitest run` — breaks 102 test files. It never had to run. It only
had to change resolution.

### 30-second verification (no install, no lockfile change)

```bash
cd packages/core
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const v8 = await import('./node_modules/vite/dist/node/index.js');
const code = readFileSync('src/commands/dom/toggle.ts','utf8');
console.log((await v8.transformWithOxc(code,'t.ts')).code.match(/export @meta[\s\S]{0,60}/)[0]);
"
# prints `export @meta({…` => decorators unlowered => confirmed
```

## What does NOT work — all three tried and disproved (2026-07-16)

Each was tested with a **deleted lockfile and a full re-resolve**, then checked on disk. Do
not retry these without new information:

| Attempt | Result |
| --- | --- |
| Delete core's dead `vite: ^8.1.4` devDep | npm **still** nests `vite@8.1.4` into core |
| Pin core to `vite: ^7.3.6` | npm **still** nests `vite@8.1.4` |
| Root `overrides: { vite: "^7.3.6" }` | npm **still** nests `vite@8.1.4` |

**Why the mental model was wrong:** core's own `vite` declaration does not govern this at all.
The nested **vitest** resolves **its own** `vite` dep, and npm satisfies that independently —
picking the highest of `^6 || ^7 || ^8`. Both 4.1.6 and 4.1.10 declare the **identical** range;
only the _nesting_ changed. So the devDep was never the lever.

**Caveat — the override result is suspicious and deserves a clean-room retest.** npm
`overrides` normally do force a version. The test may have been contaminated by a stale
`node_modules/.package-lock.json` or a workspace quirk (a `--no-save` install earlier in that
session had polluted the tree). "Remove/pin does not work" is firmly established;
**"overrides do not work" is not.**

## The recommended path: stop fighting npm — make core work on Vite 8

Forcing vite 7 is swimming upstream against npm's hoisting AND against the direction the
ecosystem is moving (Vite+ requires Vite 8+). Vite documents two supported workarounds for
exactly this, both targeting `'2023-11'` — which matches core's `ClassDecoratorContext` shape:

```ts
// packages/core/vitest.config.ts
// deps: @rolldown/plugin-babel@0.2.3 + @babel/plugin-proposal-decorators@8.0.2
import babel from '@rolldown/plugin-babel';

function decoratorPreset(options: Record<string, unknown>) {
  return {
    preset: () => ({ plugins: [['@babel/plugin-proposal-decorators', options]] }),
    rolldown: { filter: { code: '@' } }, // only files containing '@', for perf
  };
}

export default defineConfig({
  plugins: [babel({ presets: [decoratorPreset({ version: '2023-11' })] })],
  // …existing config
});
```

Alternative: `@rollup/plugin-swc@0.4.1` + `@swc/core@1.15.43` with the same `'2023-11'`.

This sidesteps npm resolution entirely (works whether vitest nests or hoists), unblocks the
three PRs, and makes core Vite-8-ready — which is Vite+'s prerequisite.

**Open question to settle first:** the plugin is rolldown/vite-8-shaped. Core's vitest may
resolve **either** vite 7 (esbuild) or vite 8 (oxc) depending on npm's whim, so a config that
only works under one is fragile. Decide deliberately: either make core's vite resolution
deterministic and then target it, or use a plugin that works under both. **Do not leave it to
npm.**

**Also fix the wrong shape while you're there:** `packages/i18n` declares `vite: ^8.1.4` in
**`dependencies`** (not devDependencies) for a **type-only** import
(`src/plugins/vite.ts:3: import type { Plugin } from 'vite'`) — that ships vite to every
consumer of `@lokascript/i18n`. Should be devDep + peerDep. `vite-plugin` is correct already
(devDep + `peerDependencies: { vite: ">=4.0.0" }`).

## The wider fragmentation (the actual failure class)

- **37 packages each declare `vitest ^4.1.5` independently**; the root declares none.
- **6 packages declare `vite ^8.1.4`** (`core`, `developer-tools`, `i18n`, `playground`,
  `smart-bundling`, `testing-framework`); `vite-plugin` declares `^8.0.0`.
- **Two vite majors install simultaneously**: `7.3.6` at root + `8.1.4` nested ×7.
- Only `playground` (real `vite.config.ts`) and `vite-plugin` (type import + peer) genuinely
  need vite. `core`/`developer-tools`/`smart-bundling`/`testing-framework` import it **never**.

Hoisting `vitest` to the root and collapsing to one vite major would remove the whole
re-resolution failure class — and is a prerequisite for any unified-toolchain move. Consider
doing it **with** this fix rather than after.

## VERIFICATION PROTOCOL

- Reproduce first, on the real PR branch:
  `git checkout origin/dependabot/npm_and_yarn/vitest-4.1.10 && npm install && npm test --prefix packages/core`
  → expect 102 failures before the fix.
- `npm run test:check --prefix packages/core` — **272 files / 7251 tests** is the green
  baseline on main.
- `npm run test:affected` — **`domain-toolkit` "fails" because it has 0 test files.
  Pre-existing, ignore it.**
- Confirm the resolution you actually get, on disk — the lockfile lies if it was not
  re-resolved:
  ```bash
  node -e "console.log(require('./packages/core/node_modules/vite/package.json').version)"
  npm ls vite   # core should not silently sit on a different major than its peers
  ```
- Then: un-exclude `vitest`/`@vitest/*` in `.github/dependabot.yml`'s `minor-and-patch`
  group and delete the false "mass-breaks the core test transform" comment.

## Footguns (learned the hard way)

- **`npm install --package-lock-only` does not truly re-resolve** here — it reused stale
  nested entries and reported a lock that contradicted `package.json` (recorded
  `vite: ^7.3.6` as the requirement while pinning `8.1.4` on disk). Delete the lockfile and do
  a real `npm install`, then **verify on disk**, never from the lock.
- **`npm install --no-save` from inside `packages/core` mutates the ROOT tree** (workspaces
  hoist) — it silently pulled root vite to 8.1.5 and vitest to 4.1.10. Restore with `npm ci`.
- A stale `packages/core/node_modules/vite` survives `npm install`; `rm -rf` it before
  trusting a negative result.
- Do NOT open a docs-only PR — fold this doc (and the spike Addendum) into the fix PR, then
  delete this file.
