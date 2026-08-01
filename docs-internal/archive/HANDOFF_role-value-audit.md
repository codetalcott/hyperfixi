# Handoff: R3 role-VALUE audit — the signal class the harness structurally cannot see

> **RESOLVED (2026-07-10).** Landed as designed: `collectRoleValueSignature` +
> `avgValueRecall` ratchet (signal 8 in CLAUDE.md's list), baseline regenerated,
> revert-validation proved the signal (reverted-#633 sweep flags the ms rows R0/R1
> score perfect). The bn standalone-trigger side-quest also landed (trigger
> `markerVariants` + flipped `it.fails`); it additionally healed bn's behavior
> trigger-event values on the corpus. Sweep triage produced six live value-bug
> families — see `MULTILINGUAL_NEXT_STEPS.md` § "R3-discovered value-bug families".
> Kept for design rationale; the walker doc comment carries the same exclusions.
>
> **For a fresh session.** Read this, then CLAUDE.md ("Multilingual parse rate ≠
> fidelity" + "Running the multilingual `--regression` gate locally"), then
> `docs-internal/MULTILINGUAL_NEXT_STEPS.md` § "Colon-event-names follow-ups".
> Branch from `main` **after PR #633 merges** — this signal only reads clean on top
> of those fixes.

## Why this is the next arc

The colon-event-names arc (#633, `HANDOFF_colon-event-names.md`, resolved) proved a
whole class of live defect no ratchet signal can see: **right action counts, right
role types, wrong role VALUE**. ms captured `trigger` events named `draggable`
instead of `draggable:start` — correct action multiset, correct
`trigger.event:literal` signature, silently wrong runtime behavior. It surfaced only
via a side-effect (a swallowed `measure`), and 18 other languages had the same value
corruption with *no* side-effect, i.e. **zero signal**. Every existing ratchet
compares actions and role *types* — values are legitimately translated, so they were
never compared cross-language.

The insight that makes R3 feasible: a large subset of role values is
**language-invariant by construction** — code, not prose. Selectors (`.active`,
`#count`), sigil refs (`:x`, `$y`, `^z`), numbers and time literals (`200ms`),
colon-qualified event names (`draggable:start`), URLs (`/api/data`). Those can be
compared against the en reference verbatim.

Post-#633 the known value bugs are fixed, so the corpus should read ~1.0 — the point
of landing R3 now is to **hold** that (and the 18 silently-fixed languages) against
regression. Only unit tests guard event-name values today, and only for the
draggable/resizable rows.

## Design (mirror the R1 wiring exactly)

All four touch points follow the existing `roleSignature` (R1) plumbing:

1. **`packages/testing-framework/src/multilingual/fidelity.ts`** — add
   `collectRoleValueSignature(node): string[]` next to `collectRoleSignature`
   (:220). Walk with the same `CHILD_FIELDS` (:24 — includes
   `eventHandlers`/`initBlock`; ad-hoc walkers that omit them see behavior bodies as
   empty). Emit a **multiset** of `` `${action}.${role}=${value}` `` entries,
   **filtered to invariant-shaped values only** (see filter below). Score with the
   existing `computeMultisetRecall` (:140) — the colon arc showed dedup hides
   dropped duplicates.
2. **`validators/parse-validator.ts`** — collect it live at :105–108 alongside
   `actionMultisetSignature`/`roleSignature` (roles are `Map`s and serialize to `{}`
   in results.json — they MUST be collected at parse time, per the warning at
   fidelity.ts:214–218).
3. **`orchestrator.ts`** — build the en reference map and per-pattern recall exactly
   like `roleReference`/`roleFidelity` (:273–274, :322–323); aggregate
   `lang.avgValueRecall` next to `avgMultisetRecall`/`avgRoleFidelity` (:337–341).
4. **`cli.ts`** — ratchet: per-language `avgValueRecall` drop > 0.02, guarded so a
   baseline lacking the field yields a 0 delta (copy the
   `AVG_MULTISET_RECALL_DROP_TOLERANCE` block, :427–430, and its reporting,
   :533–539). Baseline field lands via `--save-baseline`.

### The invariant filter (the actual design work)

Start conservative — include a value only when its **whole surface form** is
code-shaped:

- selectors: starts with `#` `.` `[` `<` `@` `*` (any role type whose value matches)
- sigil refs: `/^[:$^][A-Za-z_]\w*$/`
- numbers / time literals: `/^\d+(\.\d+)?(ms|s|m|h)?$/`
- colon-qualified event names: `/^[A-Za-z_][\w-]*:[\w-]+$/` (the #633 class)
- URLs / paths: `/^(\.{0,2}\/|https?:)/`

Deliberately EXCLUDE in v1: bare words (identifiers like `startX` are usually
invariant but property/variable names occasionally get localized in seeds), string
literals (message strings are legitimately translated), whole `expression` raws
(mixed native words + code — `次 .item`). A v2 could extract invariant *tokens* out
of expression raws; don't start there. Normalized reference values (`me`, `it`) are
mostly `fillSchemaDefaults` injections on both sides — noise; exclude.

**Expect the filter to need one iteration.** Run report-mode first (below); every
sub-1.0 row is either a real bug (good — file it) or a legit translation difference
your filter wrongly includes (tighten it, document the exclusion in the walker's
doc comment).

### Blind-spot note (put it in the CLAUDE.md signal description)

R3-recall fires when a *translation* loses/corrupts an invariant value. If the **en
reference itself** corrupts a value, every language flags at once — a 24-language R3
firestorm on one pattern means "suspect the en parse first", which is itself useful
signal (unlike R0, where en corruption moves nothing).

## Implementation order

1. Walker + unit tests in `packages/testing-framework` (synthetic nodes: duplicate
   values, each filter branch in/out, behavior-shaped nodes exercising
   `eventHandlers`/`initBlock`).
2. **Report mode before gate**: wire collection + aggregation, print per-language
   `avgValueRecall` + the failing `pattern:lang=value` rows (mirror how
   `--diagnose-coverage` reports without gating). Sweep, iterate the filter until
   every remaining firing is explained.
3. **Fail-without-fix validation**: on a throwaway branch, `git revert -n a7298b2e`
   (the #633 fix commit), rebuild framework + semantic (`npm run
   test:multilingual:build-deps`), re-`populate`, sweep — R3 must flag the ms
   draggable/resizable rows (`draggable` ≠ `draggable:start`) that R0/R1 score
   perfect. This is the proof the signal sees what the others cannot. Then discard
   the branch, rebuild, re-populate.
4. Wire the ratchet + `--save-baseline` on a **freshly populated** patterns.db,
   `npx prettier --write baselines/multilingual-priority.json`, commit baseline —
   **not** patterns.db.
5. Docs: add R3 as signal 8 in CLAUDE.md's ratchet list (with the en-firestorm
   note); mark the R3 item done in `MULTILINGUAL_NEXT_STEPS.md` § follow-ups.

## Definition of done

- `collectRoleValueSignature` unit-tested; multiset semantics verified (a dropped
  duplicate value is visible).
- Post-#633 sweep reads ~1.0 with every sub-1.0 row explained (bug filed or filter
  exclusion documented).
- Reverted-#633 sweep flags the ms rows (signal proves out).
- Ratchet wired, guarded for old baselines, baseline regenerated + prettier'd.
- CLAUDE.md + NEXT_STEPS updated.

## Traps (hard-won this arc — details in the memory file and repo CLAUDE.md)

- **`--save-baseline`/`--regression` REFUSE if any guarded package's src changed
  after `populate`** — even a dead-file deletion. Sequence strictly: src changes →
  ordered build → populate → sweep.
- `semantic/dist` resolves `@lokascript/framework` at **runtime** — rebuilding
  framework alone changes what semantic-dist probes do. For old-vs-new A/B, revert
  sources and rebuild; don't assume dist is a time capsule.
- Never pipe the gate to `tail` (masks the refusal exit code); redirect to a file
  and check `$?`. `git stash` bumps mtimes and trips the staleness guard.
- Roles serialize to `{}` in results.json — collect signatures live, never from the
  JSON.
- `pattern_roles.role_value`/`role_type` columns exist in patterns.db as an
  alternative reference source — probably ignore for v1 (the live en parse is the
  reference everywhere else), but know it's there.

## Smaller side-quests (independent; pick up if R3 stalls)

1. **qu `behavior-resizable` style-sets** — the one remaining sub-1.0 multiset row
   (0.99950). The qu reorder renders inline `if … then set … end` as `sichus …
   chayqa … tukuy man churanay` — block terminator BEFORE the inner set's
   verb-final tail — so the conditional fold strands `man churanay` and the two
   following style sets are swallowed (10/12 sets). Likely an **i18n transformer /
   corpus rendering** bug (`end` belongs after the verb), not parser tolerance;
   check `grammar/transformer.ts` (`BLOCK_HEAD_KEYWORDS` covers only
   `live`/`when`/`unless`) and remember corpus rewrites couple to the fidelity
   baseline. Locked by an `it.fails` in
   `packages/semantic/test/multilingual-roadmap-fixes.test.ts` that flips when
   repaired.
2. **bn standalone trigger** — `draggable:start কে ট্রিগার` throws; same accusative
   gap hi/qu had. Probably one line: add `bn: ['কে']` to the trigger schema's
   `markerVariants` (`packages/semantic/src/generators/command-schemas.ts`, trigger
   event role). Flip the `it.fails` in `test/draggable-patterns.test.ts`. Verify
   bn's corpus rows stay 1.0 (they are today).
3. **Input-coverage scoring penalty** — has its own section + 5 preconditions in
   `MULTILINGUAL_NEXT_STEPS.md` ("Input coverage — the confidence model's blind
   spot"). Bigger than it looks (all-stage coverage or asymmetric bias).
