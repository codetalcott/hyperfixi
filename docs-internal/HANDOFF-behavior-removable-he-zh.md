# Handoff — fix `behavior-removable` hard parse failure in he + zh

> Paste this into a fresh session to pick up the work. Self-contained.

## Goal

`behavior-removable` is the **only _curated_ behavior with hard parse failures** in the
multilingual gate — it returns a **null parse** (not just lossy) in **he (Hebrew)** and
**zh (Chinese)**. Because curated = the supported story, this is a real bug, not
out-of-lane debt. Make the translated Removable source parse **non-null** in he and zh
(degenerate→lossy→ideally faithful), then re-baseline and keep the gate green.

**Acceptance:** he + zh `behavior-removable` go from hard-fail → at least a (lossy) pass;
`avgFidelity`/precision do not regress elsewhere; baseline regenerated with
`--save-baseline`; only dicts/profiles + baseline committed (NOT `patterns.db`).

## What must parse

The gate pattern's source IS the real behavior source
([`packages/behaviors/src/schemas/removable.schema.ts`](../packages/behaviors/src/schemas/removable.schema.ts),
registered at `packages/patterns-reference/scripts/init-db.ts:237`):

```hyperscript
behavior Removable(triggerEl, confirmRemoval, effect)
  init
    if triggerEl is undefined
      set triggerEl to me
    end
  end
  on click from triggerEl
    if confirmRemoval
      js(me)
        if (!window.confirm("Are you sure?")) return "cancel";
      end
      if it is "cancel"
        halt
      end
    end
    trigger removable:before
    if effect is "fade"
      transition opacity to 0 over 300ms
    end
    trigger removable:removed
    remove me
  end
end
```

This is the **hard end of the multilingual surface**: a behavior block → an
`on click from triggerEl` handler → **nested conditionals** (`if confirmRemoval` wrapping
a `js()` block + `halt`; `if effect is "fade"` wrapping `transition`) → trailing
`trigger`/`remove`. It combines the known-hard "control-flow body parsing" cluster
(`if` + bodies) with non-Latin scripts (he is RTL; zh is space-less). A null parse means
the structural parse bails somewhere in that nesting after translation.

## Reproduce (cold tree → single-language probe)

```bash
npm install                                            # bootstrap workspaces
npm run test:multilingual:build-deps                   # ordered build (intent→framework→semantic→i18n→patterns-reference→core multilingual dist)
npm run populate --prefix packages/patterns-reference  # rebuild patterns.db + provenance stamp (gate refuses on stale db)

cd packages/testing-framework
npx tsx src/multilingual/cli.ts --languages he,zh --full --verbose
# look for `behavior-removable` in the he/zh output — should show a parse failure
```

To see _what_ is being parsed (the translated text) and _where_ it bails, probe the
pieces directly (e.g. a scratch `tsx` script or the `parse_multilingual` /
`translate_hyperscript` MCP tools):

```ts
import { MultilingualHyperscript } from '@hyperfixi/core/multilingual';
const ml = new MultilingualHyperscript();
await ml.initialize();
const he = await ml.translate(REMOVABLE_SOURCE, 'en', 'he'); // inspect the translated text
const node = await ml.parse(he, 'he'); // null? where does it stop?
```

First, **re-confirm the failure is still live** — the baseline snapshot is commit
`0af855c0`; nothing since has targeted multilingual, but verify before digging.

## Where to look

- [`packages/semantic/src/parser/block-parser.ts`](../packages/semantic/src/parser/block-parser.ts)
  — the behavior/`def` block structural parser (the Phase-3 "multilingual behavior-block
  parsing" layer, commits `484d37d7` / `e94e01d1`). The null almost certainly originates
  here when a nested `if`-body keyword isn't recognized in he/zh.
- [`packages/semantic/src/explicit/renderer.ts`](../packages/semantic/src/explicit/renderer.ts)
  — block round-trip renderer (Phase 4, `342a7f81`).
- **Per-language keyword profiles:**
  `packages/semantic/src/generators/profiles/he.ts` and `.../zh.ts` — the keywords the
  block body needs (`if`, `is`, `undefined`, `from`, `trigger`, `transition`, `remove`,
  `halt`, the `js` block delimiters). A missing/misaligned keyword for one of these in
  he/zh is the most likely culprit.
- **i18n transformer:** `packages/i18n/src/grammar/{transformer.ts,profiles/index.ts}`.
  First check whether he and zh have i18n **grammar profiles** (vs. keyword substitution
  derived from the semantic profile — `ms` famously has none). The translation path
  differs; that changes where the break is.
- Prior diagnosis of the cluster:
  [`CORRECTNESS_RELIABILITY_PLAN.md`](CORRECTNESS_RELIABILITY_PLAN.md) §2 (control-flow body
  parsing is the dominant correctness gap) and the "Key triage insight" in
  [`MULTILINGUAL_ROADMAP.md`](MULTILINGUAL_ROADMAP.md) "Remaining work" (conditional parsing
  breaks differently per language across three layers).

## Method (proven playbook — see CLAUDE.md "Running the multilingual gate locally")

1. **Edit** the semantic profile(s) `profiles/{he,zh}.ts`, `block-parser.ts`, and/or the
   i18n transformer.
2. **Rebuild** what you touched: `cd packages/semantic && npx tsup`; if you touched core's
   multilingual path, `cd packages/core && npx rollup -c` (the harness parses via
   `@hyperfixi/core/multilingual`).
3. **Probe** the single pattern (translate + parse, above) before any full run.
4. **Repopulate:** from `packages/patterns-reference`, `npm run db:init:force && npm run sync:translations`.
5. **Re-baseline:** `npx tsx src/multilingual/cli.ts --full --bundle browser-priority --save-baseline`.
6. **Verify the diff** vs HEAD baseline: only he/zh `behavior-removable` should flip; **zero
   `↓`** elsewhere.
7. **Restore the binary DB:** `git checkout packages/patterns-reference/data/patterns.db` —
   do NOT commit it (CI repopulates from source; committing dicts/profiles + baseline suffices).

## Gotchas

- The `--regression` gate **refuses to run against a stale/unstamped `patterns.db`** —
  always `populate` first (provenance-stamp guard).
- `npx tsx`/`npx vitest` do **not** auto-rebuild stale dist (the "unreproducible baseline"
  trap, roadmap §7g) — rebuild upstream deps yourself or use `npm run check:fresh`.
- This is **not guaranteed to be a quick fix.** Behavior-block parsing in non-Latin/SOV is
  the documented hard frontier; the fix may be one keyword alignment (cheap) or a
  nested-conditional-body structural fix (a multi-step arc). Time-box the probe: if the
  translated text itself is already broken, it's an **i18n transformer** problem; if the
  text looks right but `parse` returns null, it's a **semantic block-parser/keyword** problem.
- Keep the change minimal and language-scoped. Don't chase other languages' lossy passes in
  the same PR — re-baseline isolates he/zh only.

## Definition of done

he + zh `behavior-removable` parse non-null; gate `--regression` green (no parse-rate drop

> 2pts, no new degenerate/lossy/precision/role/exec regressions); baseline regenerated and
> committed with the he/zh dict/profile changes; `patterns.db` left uncommitted.
