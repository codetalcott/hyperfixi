# Handoff: domain-learn parity, the Tier B / zh-`go` marker review, and the `sovSlot` pattern-gen gap

> **STATUS 2026-07-24 — all three items are DONE**, on branch
> `fix/sovslot-pattern-generation` (3 commits). Kept because the gate procedure
> and the Traps still apply, and because two of the three items found something
> the brief below got wrong — recorded in "§ What the three items actually
> found" at the end. Read that before trusting the item descriptions.
>
> - **Item 1** — pattern generation now reads `sovSlot`; the voice `known gap`
>   block is a real round-trip assertion.
> - **Item 2** — Tier B markers landed for all nine languages (owner chose the
>   full-judgment scope); zh AND vi `go` now render bare (owner chose both).
> - **Item 3** — the lock landed (option (a)). The brief's premise about the
>   glued particle was wrong; see
>   `docs-internal/DOMAIN-LEARN-PARITY-FINDINGS.md`.

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

---

## What the three items actually found (2026-07-24)

Three things the brief above got wrong, each caught by measuring rather than by
following it. Same pattern as the parent arc's own postscript — which is now
twice in a row, and probably the most transferable lesson in this file.

### 1. Item 3's stated blocker was 2% of the problem

The brief says domain-learn is blocked by the glued SOV particle (`#buttonに`)
and needs a new `RoleSpec` field (`glueMarker: true`). Measured over all 300
cells, the glue is **14 of 231 divergences**. The dominant one — 126 cells — is
the **verb form**: `renderLearn` writes the commanding form from its own
conjugation tables while the schema renderer writes the profile's dictionary
form. `glueMarker` would have moved parity 23% → 25% and closed nothing.

Underneath that sat a finding that outranks parity entirely: **`renderLearn`'s
output re-parses in only 75 of 150 cases, with de/ja/ko/tr at 0/15.** de is
verb-form ALONE (German separable-verb imperatives are absent from the profile's
keyword alternatives — `hinzufügen .x zu #a` parses, `füge hinzu .x zu #a` does
not), so de is fixable with profile data and nothing else. Full write-up,
including the suggested cheapest-first order, in
`docs-internal/DOMAIN-LEARN-PARITY-FINDINGS.md`.

### 2. The corpus is coarser than "corpus is ground truth" implies

Item 2 says to check what the corpus renders. It is worth knowing exactly what
that phrase buys: the non-en corpus rows are `grammar-transform` output from
**@lokascript/i18n**'s own dictionaries and grammar profiles, NOT from
`command-schemas.ts` — so it is genuinely independent evidence, not circular.

But i18n applies **one destination marker per language to every command** (es
renders `toggle .open a #menu` with the same `a` as `add`). It has no per-command
knowledge at all. So the corpus can validate a language's directional choice and
can never settle a per-command one — those remain judgment calls, and the
schema already diverges from the corpus per-command in the shipped state (pt
`add` is `a` while the corpus destination is `para`).

The corollary for zh/vi `go`: correcting the corpus row is not a marker-table
edit. It goes through `patterns-reference/scripts/fix-translations.sql`, the
existing hand-authored corrections path.

Corpus corrections were applied ONLY where the rendering was ungrammatical
(zh `前往 到`, vi `đi đến vào` — a doubled preposition). Where the corpus is
merely less idiomatic than the new schema marker (he/it/th/hi/ru/uk `go`), it was
left alone, matching what #760 did for es/pt.

### 3. `markerLegacy` and `markerVariants` live on different code paths

Not documented anywhere before this arc, and it bites the moment you follow the
brief's "add `markerLegacy` for every language whose marker changes" instruction:

- `markerLegacy` is read ONLY by the marker resolver's **override** branch.
- `markerVariants` is read ONLY by its **profile-default** branch.

So giving a language a `markerOverride` silently moves it off the branch that
supplied its `markerVariants`. Adding `markerOverride.he` to `go` stopped
`לך את back` parsing — caught by two roadmap tests, not by the ratchet. The fix
was to move he's `את` into `markerLegacy` (it is a parse-only synonym, which is
what `markerLegacy` is for) while zh keeps `markerVariants` because it has no
override. Both sites now carry a comment saying so.

Related: rendering a role bare via `renderOverride` without also setting
`markerOptional` produces a surface the generated pattern cannot read back —
`前往 url` failed to re-parse until zh/vi joined en in `markerOptional`.

### Gates run

- Framework 841, semantic 7544, voice 924, flow 534, behaviorspec 321,
  learn 896 — full `npm run test:check` green, typecheck clean.
- Multilingual `--regression` green after item 2, and the regenerated baseline
  moves ONLY `bundleSize`: no parse-rate, fidelity, precision, multiset-recall,
  role-fidelity, value-recall, execution or R4 metric shifted, because every
  changed language keeps its old marker parseable via `markerLegacy`.
- Downstream lokascript-learn (node_modules overlay incl. `framework`, per the
  parent brief's trap #6): **1781 pass / 0 fail**, `bunx tsc --noEmit` clean.
- Item 1 needed no baseline regeneration: `@lokascript/semantic` has its own
  pattern generator and no `sovSlot`, so nothing the gate scores moved.

### Left open, deliberately

- The `format` string in generated patterns resolves marker position from the
  profile alone, missing `markerPosition` and the SOV default that the token
  builder applies — so `format` and `tokens` disagree on which side of its value
  an SOV marker sits. Pre-existing and documentation-only (nothing reads
  `format`). Pinned with a comment and a test expectation in
  `pattern-generator.test.ts`; fixing it would move every SOV golden entry with a
  marker and bury the `sovSlot` diff.
- The seven Tier B languages whose corpus and schema agreed on a locative were
  changed on judgment (owner's call), but their CORPUS rows still render the old
  marker — see § 2 above for why that is the shipped norm rather than a gap.
- domain-learn's five queued fixes, in `DOMAIN-LEARN-PARITY-FINDINGS.md`.
