# stubs/

npm-name management packages. **Not workspaces** (root globs are `packages/*`, `apps/*`) — deliberately outside lockstep versioning, `ensure-fresh`, and all guarded CI package lists. Nothing here is built or tested by CI; each directory is published by hand, if at all.

## Name placeholders (`hyperfixi/`, `lokascript/`)

Claim the bare unscoped names, which stale published READMEs reference and which were unclaimed until 2026-08 (published + deprecated 2026-08-03). **Non-functional on purpose**: `index.js` throws with a pointer to the real packages. They are not aliases — a functional re-export would make `import { hyperscript } from 'hyperfixi'` work outside Vite but fail inside it, because `@hyperfixi/vite-plugin` intercepts both names ahead of node_modules resolution and serves a virtual module with different exports. One name, two meanings — the placeholder avoids that by working nowhere.

Published once, deprecated immediately; no per-release maintenance. If either ever needs a republish, `npm pack --dry-run` should show exactly 3 files.

## Rename stubs — RETIRED, do not resurrect (decision 2026-08-03)

This directory used to hold 8 functional re-export wrappers (`lokascript-core/`, `-vite-plugin/`, `-behaviors/`, `-aot-compiler/`, `-developer-tools/`, `-smart-bundling/`, `-testing-framework/`, `-types-browser/`) written for the v2.0.0 `@lokascript/*` → `@hyperfixi/*` engine rename and never published. They were deleted rather than published, and MIGRATION.md's promise of them was retracted. The evidence, so this doesn't get re-litigated:

1. **No audience.** Last-month downloads on the stranded names were 30–42 each — near-uniform regardless of package, i.e. registry-mirror/scanner background noise — versus 3,006 (`@hyperfixi/core`) and 1,829 (`@hyperfixi/vite-plugin`) on the live homes. The migration window (v2.0.0, ~2026-02) closed with nobody in it.
2. **Partial-compat traps as written.** The stubs forwarded only the main entry (no `exports` map) while `@hyperfixi/core` exposes dozens of subpaths — `@lokascript/core` would import while `@lokascript/core/registry/browser` failed confusingly. A faithful stub means hand-mirroring core's exports map in 8 places, the exact hand-maintained-list drift class #862/#865 built guards against.
3. **A working wrapper defeats the migration.** The npm deprecation pointers (all 4 ever-published names carry them as of 2026-08-03) converge users on `@hyperfixi/*`; a silent wrapper would let new code accrete on dead names forever, plus a republish-and-redeprecate obligation at every future major (`^2.0.0` ranges sit outside `set-version.cjs`).
4. **Six of the eight names were never published** — their stubs guarded nothing; publishing would have minted new dead registry entries.
5. **No defensive value**: scoped names in an org we own cannot be squatted (unlike the bare names above).

**Flip condition**: real-human download volume on `@lokascript/core` (hundreds/month with variance, not uniform scanner noise) would justify reconsidering a core-only stub with a faithful exports map. Check `https://api.npmjs.org/downloads/point/last-month/@lokascript%2Fcore` before reopening.

The deleted stub sources remain in git history (last present at tag `v2.10.0` / the commit preceding this file's rewrite) if ever needed.

Brand context: the code-level rename **to** `@lokascript/*` was cancelled 2026-07-13 (see the SUPERSEDED banner in `docs-internal/analysis/LOKASCRIPT_REBRAND_ASSESSMENT.md`) — engine = `@hyperfixi/*`, multilingual = `@lokascript/*`, revisit only at a v3-scale break.
