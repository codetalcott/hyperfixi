# Handoff: Arc E — `fetch … with { … }` captured in all 24 languages (release-bar stretch item 5)

## Context — release bar state (2026-07-13, post-Arc-C)

Items 1–4 of the v2.8 bar are locked or in-flight: **1 ✓** vocab gate (#645);
**2 ✓** input coverage total (Arc C, #648 — every `parseInternal` stage measured,
670/3696 firings all attributed, baseline untouched); **3** holds for free (ratchet
green through Arc C); **4 ≈ ✓** dependency hygiene (#646 lockfile audit, #647
Dependabot coverage, #655 cleared **all 7 criticals**; a serial merge-sweep of the
safe minors was running at handoff time — verify with
`gh pr list --author app/dependabot --state open`; deferred majors #220/#216/#206/#201
and the lerna-blocked js-yaml moderate are named decisions, not blockers). CI now
path-gates the npm fan-out and builds/tests the Go client (#660).

**This arc is item 5, the stretch headline**: the four fetch-options corpus patterns
captured in all 24 languages. Target release ≈ 2026-07-22; this arc moves the
baseline, so per the bar it **must not land in the final two days**.

Source material: NEXT_STEPS § "Deferred: multilingual `fetch … with { … }` (Part 2b)"
+ § "Input coverage" (Arc C's family table — fetch options tail = **78 rows**:
fetch-with-headers ×24, fetch-with-method ×18, fetch-with-method-body ×18,
fetch-formdata ×18, all en-symmetric).

## Current state (verified during Arc C)

- **en braced form works**: `fetchSchema` models the options object (`style` role,
  marker `with`), the matcher folds a braced run into an exact-source `expression`,
  the AST builder emits `objectLiteral` into `modifiers.with`.
- **Naked named-arg form drops in ALL 24 including en**: `fetch /api/form with
  method:"POST" body:form` — no braces, the brace fold never fires (core handles it
  via `parseFetchNakedNamedArgs`; the semantic layer does not). Arc C's diagnostic
  now names the dropped span on every such row — e.g. en `: "POST" body:form`,
  ar fused-walk `بـ method : "POST" …`.
- **The 23 non-en handcrafted fetch patterns have no `with` variant at all**
  (`packages/semantic/src/patterns/fetch.ts`, priority 105).
- **All-or-nothing constraint**: R1 scores every language against the en reference.
  Teaching en a role the other 23 lack LOWERS their R1 — so naked-named-arg capture
  must land in all 24 languages in ONE change, then regenerate the baseline.

## The shape of the work

1. **en naked named-arg capture** at the semantic layer (mirror
   `parseFetchNakedNamedArgs` semantics: fold a `key:"value" key:expr` run after the
   `with` marker into the options object).
2. **23-language `with` variants** — schema `markerVariants` / paired pattern
   variants. The per-language `with` marker surface already appears in the corpus
   renders (ar `بـ…`, from Arc C samples) — patterns.db translations are ground
   truth, not guessed profile keywords. Memory lesson
   (i18n-renders-semantic-patterns-coevolve): per-command profile rules + paired
   semantic pattern variants; **never extend canonicalOrder wholesale** (the R3
   12→39 incident); probe full corpus bodies, not isolated lines.
3. **Progress meter is Arc C's diagnostic**: the fetch family's 78 `unconsumed-input`
   firings → 0. Any NEW firing on a non-fetch row after a pattern/profile change is
   phantom risk — investigate before regenerating anything (the ja 空 lesson class).
4. **Baseline regen** — this arc moves fidelity INTENTIONALLY (fetch role sets grow
   in all 24). `--save-baseline` against a fresh populate; attribute the whole diff
   in the PR.

## Measure

```bash
npm install                                   # cold tree only
npm run test:multilingual:build-deps          # ordered build (CLI refuses stale dist)
npm run populate --prefix packages/patterns-reference
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --diagnose-coverage; echo "exit=$?"
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression; echo "exit=$?"
```

Real exit codes — never `| tail` the command that carries the verdict.

## The probe (do FIRST, red side)

1. `parseSemantic` the four en corpus rows + a spread of renders (ja/ar/ko/qu at
   minimum) — archive trees + `unconsumed-input` messages. Today every one fires
   (Arc C green side); `modifiers.with` / the method/body roles are absent.
2. Probe en braced vs naked separately: braced captures today, naked drops — that
   split is the red-side contract.
3. Post-change: same probes must show the options captured AND zero
   `unconsumed-input` on those rows; lock as tests (conventions:
   `packages/semantic/test/input-coverage-stages.test.ts` from Arc C, plus the
   existing fetch pattern tests).

## Traps (standing + fresh from Arc C)

- Ordered build → fresh populate → sweep; rebuild `packages/semantic` between edit
  and probe (tsx probes + the sweep read dist).
- The vocab CI step is a GATE: any profile/dict touch keeps
  `npx tsx src/vocab/cli.ts validate` exit 0 (waivers in
  `packages/testing-framework/vocab-waivers.json`).
- After ANY profile keyword addition, after-probe ALL corpus-hot rows containing the
  word, not just the target slot.
- Never commit `patterns.db`; lint-staged reflows on commit; commit dicts/profiles +
  baseline only.
- **Baseline diff attribution (fresh intel)**: the committed baseline
  (2026-07-11/c5c884cc) carries known pre-existing drift your regen WILL absorb —
  it `blur-element` confidence 1 → 0.714 (vocab Batches 1–4, confidence isn't
  ratcheted) and bundleSize deltas. Documented in NEXT_STEPS § "Input coverage"
  ("Diagnostic-only proof"). Call them out as inherited, don't re-attribute.
- The eight-signal ratchet is EXPECTED to move here (recall/R1/R3 up on fetch rows).
  `--regression` red mid-arc is fine; the DoD gate is the regenerated baseline being
  clean + attributed, not bit-stability.
- Strict branch protection serializes merges: `gh pr update-branch` → wait → merge;
  auto-merge does not self-update the branch.

## Definition of done

- The four fetch-options corpus patterns capture their options (braced AND naked
  named-arg) in all 24 languages, consistent with the en reference (R0/R1/R3).
- `--diagnose-coverage`: fetch family 78 → 0; total 670 → ~592 with **no new
  families** (any new firing attributed before landing).
- Red→green probes locked as tests; semantic + testing-framework suites, typecheck,
  vocab gate green.
- Baseline regenerated against fresh populate and committed with the diff attributed
  in the PR; eight-signal ratchet green on the new baseline; CI green.
- NEXT_STEPS updated: § Part 2b marked RESOLVED, release-bar item 5 ✓, the Arc C
  family table's fetch row updated, and this handoff marked executed.

## Adjacent queue (NOT this arc — don't drift)

- **Arc D** (coverage → confidence penalty): preconditions MET by Arc C. Sizing
  caution: the corpus fires at 18% — a naive penalty moves MANY scores; the Arc C
  family table is the phasing input. Own PR, ConfidenceContext contract change,
  baseline regen ×24. Post-release unless the window allows.
- **Event-modifier phrase family** (69 rows, en-symmetric, `eventModifiers` null —
  `once`/`debounced at Nms` semantics genuinely lost): highest-leverage single
  non-fetch fix discovered by Arc C.
- Release-bar item 4 leftovers: deferred majors (#220 inquirer, #206 chokidar,
  #216 puppeteer, #201 diff), #133 recreate outcome, lerna js-yaml waiver note,
  optional python-client CI job (same pattern as #660's go-client job).
- Batch-3 leftovers as listed in HANDOFF_arc-c-input-coverage.md § Adjacent queue.
