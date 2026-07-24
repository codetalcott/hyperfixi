# Handoff: domain-learn parity, the Tier B / zh-`go` marker review, and the `sovSlot` pattern-gen gap

**Paste "The prompt" below into a fresh Claude Code session opened in `~/projects/hyperfixi`.**

This is what remained after the schema↔renderer parity arc merged (#760, 2026-07-24 —
the arc that took todo/jsx/flow/voice to 100% and locked bdd/behaviorspec). Its
predecessor brief, `docs-internal/HANDOFF-parity-and-marker-tail.md`, is still the
authority on the shared machinery (`createDomainRenderer`, `renderOverride`, the
freshness guards, the multilingual gate) and on the **Traps** — read that file's Traps
section first; every entry was hit for real and the reasons have not changed.

Three items, deliberately separate because they have different risk and different
owners of the decision. They do NOT need to be one session. Suggested order below is
safest-first.

---

## The prompt

> I want to close out the tail of the `@lokascript` renderer work, now that the parity
> arc (#760) has merged to `main`. `docs-internal/HANDOFF-learn-parity-and-markers.md`
> is the brief — read it fully, and read the **Traps** section of the older
> `HANDOFF-parity-and-marker-tail.md` it points to before touching any marker data.
>
> There are three items. Do them in order, each as its own commit(s); they are
> independent. **Item 2 (Tier B markers + zh `go`) and item 3 (domain-learn) each
> contain a decision that is mine to make** — the zh `go` corpus question, and whether
> domain-learn's no-space particle rendering is worth changing at all given the
> downstream risk. For each, present the options from the brief and STOP for my answer
> before implementing the part that hangs on it.
>
> Constraint unchanged from the parent arc: renderX output is frozen unless I've agreed
> to a specific change. Parity mismatches are fixed by teaching the SCHEMA what the
> renderer does. Any change to a `@lokascript/semantic` marker or to pattern generation
> must pass the multilingual `--regression` gate AND the downstream lokascript-learn
> verification (both procedures are in the brief), and must land the regenerated
> baseline in the same commit.

---

## Where things stand (verified against `main` at merge of #760)

- **Parity is done and locked** for llm, sql, todo, jsx, flow, voice (100%) and
  bdd/behaviorspec (declared-exception locks). Each has a
  `schema-renderer-parity.test.ts`. Nothing below reopens those.
- The parent arc's directional-marker fix already corrected `add`/`put`/`go`
  `destination` markers in **es, ar, zh, fr, de, pt** (ja/ko/tr were already
  directional). So 9 of 24 languages are done for those three verbs; **en** is the
  reference. The languages named in item 2 are the untouched remainder.

---

## Item 1 — `sovSlot` is not read by pattern generation (in-repo only, lowest risk)

**Discovered during #760, pinned not fixed.** `RoleSpec.sovSlot: 'postVerb'` moves a role
after the verb when RENDERING, but **pattern generation never reads it**
(`grep sovSlot packages/*/src/generators/pattern-generator.ts` → nothing). So a role the
renderer places post-verb is still expected PRE-verb by the generated SOV pattern, and a
faithfully-rendered surface does not parse back.

Live symptom, pinned in `packages/domain-voice/src/__test__/schema-renderer-parity.test.ts`
(`describe('known gap: back/forward/help do not round-trip in SOV')`): voice `back`/
`forward`/`help` render `戻る 2` / `ヘルプ 移動` (correct, and what `sovSlot` now
declares), but re-parsing drops the argument. flow (`fetch`/`poll`/`stream` destination)
and behaviorspec (`test`) also set `sovSlot: 'postVerb'` and would benefit — they happen
to round-trip today only because their post-verb role is optional and the tests don't
assert the round trip for it.

**The fix:** teach `generatePattern`/`sortRolesByWordOrder` (in
`packages/framework/src/generation/pattern-generator.ts`, and the semantic package's twin
if it has one) to emit a `sovSlot: 'postVerb'` role after the verb token in SOV languages,
mirroring what the renderer does. Then flip the voice `known gap` describe-block to a real
round-trip assertion (delete the block, add `back`/`forward`/`help` to the
`round-trips through the parser` list already in that file).

**Gate:** the framework `pattern-generator.test.ts`, every domain's golden pattern
snapshot (these WILL move — regenerate each with its `scripts/generate-golden-patterns.ts`,
verify the semantic diff is only SOV post-verb roles moving, `prettier --write` the JSON),
the full `npm run test:check`, and the multilingual `--regression` gate (pattern
generation feeds it). This is the one item with no downstream exposure, which is why it's
first — but it touches the widest in-repo surface, so lean on the golden snapshots.

---

## Item 2 — Tier B `destination` markers + zh `go` (needs native judgment + a corpus decision)

Two related marker questions in `@lokascript/semantic`
(`packages/semantic/src/generators/command-schemas.ts`), both needing native-validity
judgment against the patterns-reference corpus rather than batch editing.

**2a. Tier B destination markers.** The directional-marker fix covered es/ar/zh/fr/de/pt.
Audit the `destination` marker for `add`/`put`/`go` in the remainder that plausibly need a
directional (not locative) marker: **he, hi, id, it, ru, sw, th, uk, vi**. For each,
check what the corpus actually renders (via patterns-reference) before changing anything —
the profile default is locative because it also serves `toggle`/`show`, and only some of
these languages distinguish. Follow the parent arc's sequence exactly: add `markerLegacy`
for every language whose rendered marker changes (so pre-2.9 source keeps parsing), gate
the code change alone byte-green, then the data, then the multilingual sequence.

**2b. zh `go` — the corpus decision (STOP for the owner).** The `go` schema
(`command-schemas.ts:1745`, see the comment block) deliberately keeps zh's `destination`
at the locative default: the corpus renders `前往 到 url`, and the schema treats the
corpus as ground truth. Downstream `lokascript-learn` disagrees — its
`shared/morphology/role-markers.ts` `LEARNING_OVERRIDES.go.destination.zh = ''`, on the
reasoning that `前往` already encodes direction so `到` is redundant.

This is a **corpus question first, not a marker question**: to make zh `go` render `''`
you must first decide the corpus row `前往 到 url` is wrong and change it, then the schema
follows. That is the owner's call. If the decision is "yes, drop it," closing it retires
the last of the meaningful `LEARNING_OVERRIDES` entries downstream (the add/put/go
non-zh entries there become redundant the moment lokascript-learn upgrades to the release
containing #760 — they are only still present because it is pinned to published 2.8.0).

**Gate for both:** the multilingual `--regression` gate with a regenerated baseline in the
same commit, plus the downstream lokascript-learn verification below.

---

## Item 3 — domain-learn parity (highest risk; a real design decision, needs downstream coordination)

`domain-learn` was left out of the parity arc for a concrete reason, still true:

- `renderLearn` (`packages/domain-learn/src/generators/learn-renderer.ts:262-288`) glues
  the SOV particle to its value with **no space** — line 266 is `` `${destination}${marker}` ``,
  producing `#buttonに`. The schema-driven renderer's `buildPhrase` joins with a space and
  **cannot express** a glued particle.
- The schemas (`packages/domain-learn/src/schemas/index.ts`, constants `DEST_TO` /
  `DEST_INTO` / `DEST_ON` / `SOURCE_FROM`) declare ja markers as `''`, while `renderLearn`
  emits `に` / `から` / `で` from its OWN `MARKERS` table (lines 197-246). So ja diverges on
  BOTH presence (schema says none, renderer writes one) and spacing. ko diverges on spacing
  alone (both sides say `에`, but the renderer glues).

**The decision (STOP for the owner):** reaching parity here means changing the schema data
so the schema renderer matches — which moves domain-learn's parse patterns — and that
**directly risks lokascript-learn's 919 morphology tests and its dsl-bridge parity test**,
because that repo ships the DSL bridge as its renderer. Options to present:

- **(a) Leave it.** Add a domain-learn `schema-renderer-parity.test.ts` that asserts parity
  *modulo* the glued-particle divergence (the bdd/behaviorspec pattern — declare it, verify
  the divergence is EXACTLY no-space-particle, so anything else still fails). Gets the drift
  lock without moving any parse pattern. No downstream risk.
- **(b) Teach `buildPhrase` a no-space join** for a role that declares it (a new
  `RoleSpec` field, e.g. `glueMarker: true`), then set the ja markers in the schema and
  render through it. Full parity, but it moves parse patterns and MUST be verified against
  lokascript-learn before it can land — a downstream-coordinated change, not a solo one.

Recommend (a) unless the owner wants full delegation; (b) is only worth it if domain-learn
is meant to reach the same "renderX becomes a schema-renderer wrapper" end state the parent
arc set as a gated stretch goal.

---

## Gates you will need (carried from the parent arc)

**Multilingual `--regression`** (any semantic marker or pattern-gen change):
```bash
npm run test:multilingual:build-deps
npm run populate --prefix packages/patterns-reference
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression
```
After an intentional change: `--save-baseline`, commit the baseline in the SAME commit.
Do NOT commit the locally-regenerated `patterns.db`. The gate REFUSES to run against a
stale/unstamped db — that is the freshness guard working, not a bug.

**Downstream lokascript-learn** (any change to a package it consumes — semantic, framework,
or a domain it imports). Do NOT repoint its `file:` deps; overlay node_modules instead:
```bash
cd ~/projects/lokascript-learn
# back up, then overlay dist+src for EACH changed @lokascript/* package.
# CRITICAL: include `framework` in the overlay even if you didn't change it — published
# 2.8.0 predates createDomainRenderer, and overlaying only domain packages fails with
# ~19 import errors that are environmental, not real (learned the hard way in #760).
bun test shared/ db/ server/     # expect 1781 pass / 0 fail
bunx tsc --noEmit                # expect clean
# restore the backups afterward
```
Their E2E global-setup fails identically on published 2.8.0 (environmental) — don't chase
it.

## Trap worth repeating from #760 (not in the older brief)

**Bundle-size gzip is platform-dependent.** `packages/core/src/metadata.ts` carries the
gzip sizes **CI measures** (Linux zlib). A local macOS `npm run update:sizes` reads ~2 KB
lower on the full bundles and reports a spurious `CHANGED`. If the CI bundle-size job
fails on a metadata mismatch, read the sizes from the **failed CI log** and commit those,
not your local measurement. Raw sizes are platform-stable and can be trusted locally.
