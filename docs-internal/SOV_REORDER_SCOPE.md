# SOV Verb-First Event-Body Reorder — Project Scope

> **Status:** Scoped, not started. Handoff-ready for a fresh session.
> **Track:** Multilingual parse-fidelity (Track 5 in `MULTILINGUAL_ROADMAP.md`).
> **Prereq reading:** `MULTILINGUAL_ROADMAP.md` (Shipped → the four "fused event
> captures only the first command" fixes: then-chain, if/else block, juxtaposed
> body, async-strip). This project is the **deep remainder** those incremental
> fixes deliberately left.

## TL;DR

For SOV languages (ja, ko, bn, qu, tr), an event handler whose body is **not** a
single simple `<patient> <verb>` command — i.e. it has a **leading modifier**
(`async`, `once`, `debounced at N`) or otherwise reorders so the **verb lands
first** — is emitted by the i18n transformer in a `<verb> <patient> … <event> …`
order. The semantic parser then matches the leading `<verb> <patient>` with a
low-priority **`*-generated-verb-first` command pattern** at Stage 2, returns a
**bare command**, and the event handler + the rest of the body are discarded
(degenerate parse). This is the last structural fidelity cluster.

Estimated reachable yield: **~15–25 degenerate instances** across `event-once`
(5, all SOV), `async-block` SOV residue (~4: bn/ko/qu/tr), `event-debounce` SOV
slice, `repeat-while`/`repeat-for-each`/`repeat-forever` SOV, and assorted SOV
multi-command handlers. It also **unblocks the deferred ja/zh `fetch` keyword
alignment** (see roadmap) once the SOV body parses faithfully. Lower yield per
unit effort than the shipped fixes — this is a multi-PR, per-language effort.

## Two failure modes (probe evidence)

Probe = `maskSpans → GrammarTransformer('en',lang) → unmaskSpans → parseSemantic`
(the harness pipeline). Reproduce with the probe script at the bottom.

### Mode A — verb-first body (the core problem, NOT yet addressed)

```
on click async fetch /api/data then put it into me
  ko →  가져오기 /api/data 를 클릭 비동기 그러면 그것 를 넣다 나 에
        actions {fetch}   matched: fetch-ko-generated-verb-first   fid 0.33 DEGEN

on click once add .initialized to me call setup()
  ja →  追加 .initialized を クリック で once 私 に それから setup() を 呼び出し
        actions {add}     matched: add-ja-generated-verb-first     fid 0.33 DEGEN
  ko →  추가 .initialized 를 클릭 once 나 에 그러면 setup() 를 호출
        actions {add}     matched: add-ko-generated-verb-first     fid 0.33 DEGEN
```

The transform put the body **verb first** (`가져오기`/`追加`/`추가` = fetch/add)
because a leading modifier (`async`/`once`) displaced the canonical patient-first
SOV order. The semantic parser matched `<verb> <patient-unmarked>` with the
`*-generated-verb-first` **command** pattern (Stage 2), consumed only those two
tokens, and returned a bare command — the event (`클릭`/`クリック`), the modifier,
and the then-chain are all dropped.

### Mode B — event-mid, patient-first body (MOSTLY FIXED already)

```
on click add .loading to me fetch /api/data then remove .loading from me put it into #result
  ja →  .loading を クリック で 追加 私 に それから /api/data を 取得 それから …
        actions {add,on,put,remove}   matched: add-event-ja-sov-patient-first   fid 0.80
  ko →  .loading 를 클릭 추가 나 에 그러면 …
        actions {add,fetch,on,put,remove}   fid 1.00
```

Here the body keeps the canonical `<patient> <event> <verb>` shape, so a real
**event** pattern (`*-event-*-sov-patient-first`) matches at Stage 1 and the
then-chain/juxtaposed-body fixes (already shipped) recover the rest. The residue
(ja `取得`=get keyword collision dropping `fetch`) is a **separate** keyword issue,
not this project. **Do not re-engineer Mode B.**

### Contrast — simple handler (always worked)

```
on click toggle .active
  ja → .active を クリック で 切り替え   {on,toggle}   *-event-ja-sov-patient-first   fid 1.00
```

## Root cause (two layers)

1. **i18n transformer** (`packages/i18n/src/grammar/transformer.ts`,
   `parseEventHandler` + `reorderRoles`/`insertMarkers`). When the body has a
   leading modifier, `parseEventHandler` mis-assigns it: e.g. for
   `on click async fetch /api/data`, `async` is read as the action and
   `fetch /api/data` becomes the patient. The SOV reorder then emits
   `<patient=取得/api/data> を <event=クリック> <action=async=非同期>`, i.e. the real
   verb (fetch) surfaces **first** as part of the patient. For `once`, the modifier
   similarly perturbs role assignment so the real verb (`add`) reorders to the
   front. Net: a `<verb> <patient> … <event> …` token stream instead of the
   canonical `<patient> <event> <verb>`.

2. **semantic parser** (`packages/semantic/src/parser/semantic-parser.ts`). The
   verb-first stream is matched at **Stage 2** by the
   `*-generated-verb-first` command pattern
   (`packages/semantic/src/generators/pattern-generator.ts:170` `generateVerbFirstPattern`,
   priority `basePriority − 20`). That pattern exists for legitimate
   code-switching input (`トグル .active`) and matches `[verb] [1 required role,
unmarked]`. It greedily consumes `가져오기 /api/data 를` and the parser returns
   the bare command. Crucially, **Stage 3 `trySOVEventExtraction`
   (semantic-parser.ts:1148)** — which scans for a mid-stream event keyword +
   marker and parses the preceding tokens as the body — would handle this, **but it
   never runs because Stage 2 already succeeded.** The event sits mid-stream after
   the verb, so the Stage-1 event patterns don't match either.

## Fix approaches (pick during execution; A is recommended)

### Approach A — Transformer: don't emit verb-first for event bodies (preferred)

Make the i18n transformer keep an event handler's body in **canonical patient-first
SOV order** even when the body leads with a modifier or is multi-command. Concretely:
treat `async`/`once`/`debounced at N`/`throttled at N` as **event/command modifiers**
that stay adjacent to their host (the event clause or the following verb) rather than
being parsed as the `action`. Then the existing `*-event-*-sov-patient-first` event
patterns + the shipped then-chain/juxtaposed fixes parse the body (Mode B path, which
works). This is the cleanest because it routes Mode A into the already-working Mode B.

- **Pro:** reuses the working Stage-1 event path; no parser-priority risk.
- **Con:** transformer role-assignment is per-word-order and fiddly; needs the
  modifier kept in a position the semantic parser tolerates (verify per modifier).
- **Where:** `transformer.ts` `parseEventHandler` (modifier role handling) and the
  SOV reorder. Mirror the shipped `tryTransformEventWithBlockBody` event-first
  emission idea, but for modifier-prefixed / verb-first simple bodies.

### Approach B — Parser: stop the verb-first command pattern from shadowing SOV events

Gate `generateVerbFirstPattern` matches (or re-order the parse stages) so a
verb-first **command** match does not win when the token stream **also contains a
mid-stream event keyword + event-marker** — let Stage 3 `trySOVEventExtraction`
handle it instead. Options: (a) lower verb-first priority below the SOV event
extraction and run `trySOVEventExtraction` before accepting a verb-first command
match; (b) in `trySOVEventExtraction`, also accept a **verb-first** body (it
currently assumes patient-first); (c) in the Stage-2 acceptance, if the matched
command is a `*-generated-verb-first` pattern AND unconsumed tokens contain an
event marker, fall through to Stage 3.

- **Pro:** parser-only, generalizes across languages at once (like the shipped
  buildEventHandler/then-end fixes).
- **Con:** must **not** regress legitimate code-switching `トグル .active` (no event)
  — gate strictly on "a real mid-stream event keyword + marker is present."

> A hybrid is likely: Approach B (parser) gets the event recognized and the body
> re-parsed; Approach A (transformer) cleans up the modifier so the body verb isn't
> mis-rooted. Validate which single side suffices per pattern before doing both.

## Affected patterns / expected yield (verify against a fresh regen)

All SOV instances of: `event-once` (bn,ja,ko,qu,tr — 5), `async-block` SOV residue
(bn,ko,qu,tr — ~4), `event-debounce` SOV (parts of ms*/…), `repeat-while`
(bn,ko,qu — SOV ones), `repeat-for-each` (ko,qu), `repeat-forever` (ko,qu).
*ms has no grammar profile (English passthrough) — separate.\* Cross-check the live
degenerate list at execution time (`MULTILINGUAL_ROADMAP.md` Track 5 + a fresh
`--save-baseline` regen) — counts drift as other fixes land.

**Unblocks:** the deferred ja/zh `fetch` keyword alignment (changing ja `取得`→`フェッチ`
regresses async-block today **only** because the SOV body doesn't parse; fix that
first, then the dict edit is a clean +4 — see roadmap "fetch keyword alignment —
ja/zh deferred").

## Risks / gotchas (hard-won this session)

- **Don't regress Mode B or simple handlers.** They already work via
  `*-event-*-sov-patient-first`. Guard any change to fire only on the verb-first /
  modifier-prefixed shape.
- **Verb-first pattern is load-bearing** for code-switching authors (`トグル .active`,
  no event). Approach B must keep that working — gate on a present mid-stream event.
- **Fidelity is recall-based** — it won't catch _over_-generation. After any parser
  change, run the **semantic role-extraction suite** (`npm run test:check --prefix
packages/semantic`) to confirm no spurious commands, in addition to the regen.
- **Validate with the `--regression` gate**, not raw counts. Watch for the flaky
  harness undercount (roadmap "Methodology note") — trust a controlled A/B
  (same DB, build toggled) over a single full run.
- **Environment FS/git rewind (observed this session):** the local clone's working
  files and `origin/main` ref intermittently rewound to an earlier snapshot
  mid-task. **Always** re-`git fetch origin main && git reset --hard origin/main`
  and re-verify the baseline parseSuccess/degenerate counts (read from CI on GitHub
  if in doubt) before trusting a local read. Restore the binary `patterns.db` before
  committing (CI repopulates from source).

## Validation playbook (same as the shipped fixes)

1. Edit `packages/semantic/src/...` (and/or `packages/i18n/src/grammar/transformer.ts`).
2. Rebuild: `cd packages/semantic && npx tsup` (and `packages/i18n` if touched).
   `@hyperfixi/core/multilingual` loads semantic dynamically — no core rebuild needed
   for parser-only changes; the harness reads DB translations + `parseSemantic`.
3. Repopulate DB: `cd packages/patterns-reference && npm run db:init:force &&
npm run sync:translations` (confirm `pattern_translations` = 3936).
4. Regen to a temp baseline + diff vs committed:
   `cd packages/testing-framework && npx tsx src/multilingual/cli.ts --full
--bundle browser-priority --save-baseline --baseline /tmp/b.json`, then a node
   diff of `degeneratePasses` (deg→faithful good, faithful→degen = ratchet fail) and
   `parseSuccess` (no down).
5. `--regression` gate must say "No regression". Then `--save-baseline` to the
   committed path.
6. Add locks in `packages/semantic/test/multilingual-roadmap-fixes.test.ts`.
7. Restore `git checkout packages/patterns-reference/data/patterns.db`. Don't commit it.

## Probe script (drop at repo root, `npx tsx probe.ts "<en code>" ja ko bn qu tr`)

Replicates the harness pipeline and prints the transform, the parsed action set,
the matched pattern id, and fidelity vs the English reference. (See the session
transcript / the shipped-fix PRs for the exact ~30-line script — it inlines
`maskSpans`, calls `GrammarTransformer` + `parseSemantic`, and walks
`body/statements/thenBranch/elseBranch/branches` for the action set.)

## Definition of done

SOV `event-once` / `async-block` SOV / SOV `repeat-*` parse faithfully
(deg→faithful), `--regression` gate green, role-extraction suite clean (no
over-generation), baseline regenerated, locking tests added. Then revisit the
deferred ja/zh fetch keyword alignment as a quick follow-up.
