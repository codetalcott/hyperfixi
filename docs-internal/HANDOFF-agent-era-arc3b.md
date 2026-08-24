# HANDOFF — agent-era Arc 3b: unconsumed-input, the propagation bug

> Brief for the first slice of Arc 3b in
> [AGENT_ERA_ROADMAP.md](./AGENT_ERA_ROADMAP.md). Landed 2026-08-24.

## The finding that changed the plan

The filed prescription was a **parser change** ("an unconsumed-token diagnostic"),
budgeted with warning-first caution because the lenient parse is load-bearing for
the multilingual ratchets. Triage falsified it — the same pattern as #867/#868/#874
on the R1 tail: **the repair already existed.** `parseSemantic` has flagged dropped
tokens all along:

- `semantic-parser.ts` attaches `{ severity: 'warning', code: 'unconsumed-input', message: 'pattern <id> left N token(s) unconsumed: "…" }`
  to the node, hoists it from any descendant depth (`unconsumed-input` is
  hoisted specifically), and docks match confidence (1.0 → 0.82 for
  `add .highlight #item`).
- `CompilationService.normalize()` **never read node diagnostics** — so
  `validate()` returned `ok: true, diagnostics: []` for parses the parser
  itself had flagged. The whole gap was plumbing.

## What shipped

- `packages/compilation-service/src/input/normalize.ts`:
  `liftNodeDiagnostics()` — warning/error-severity node diagnostics are lifted
  into the response (`info` stays behind: match commentary, not signal). Codes
  map kebab → UPPER_SNAKE (`unconsumed-input` → `UNCONSUMED_INPUT`), and the
  unconsumed case carries an agent-actionable `suggestion` (missing role
  marker → role fell back to a default like `me`; compare roles against
  intent). One fix covers `validate()` and `compile()` — both normalize.
- Regression test in `service.test.ts` (warns on `add .highlight #item`,
  clean on `add .highlight to #item`).
- **agent-bench**: bands split into
  `correct | rejected | warned-wrong | silent-wrong | silent-noop`, computed by
  a single shared `bandOf()` (harness) used by the probe, the JSON baseline,
  and the ratchet test — the previous fork of that logic between cli and test
  is gone. Baseline regenerated; the both-directions tolerance-0 ratchet is
  what forced the regeneration in the same change, exactly as designed.
- Hygiene: `@lokascript/compilation-service` added to testing-framework's
  deps and `pretest` ensure-fresh list (missed in Arc 3;
  `../aot-compiler ../compilation-service` appended after their own deps).
- Docs: AGENTS.md trap table split into "now WARNS" vs "still silent";
  agent-bench README findings updated with the pre/post table; roadmap Arc 3b
  status.

## Measured effect

| | pre-3b | post-3b |
| --- | --- | --- |
| wrong but visible to the loop | 1/37 | 12/37 |
| wrong and silent | 18/37 (49%) | 7/37 (19%) |

Eleven rows moved: the omitted-marker family, the entire attribute-write
family, `to every .y`, `the X of Y` properties, `remove element`. Parse
success, confidence, roles: all byte-identical — only the diagnostics array
grew, which is why the blast radius is small (multilingual gates call
`parseSemantic` directly and never touched compilation-service).

## Remaining ☠ 7, for the next slice

- **Five real gaps** — full-consume parses that provably do nothing or bind
  the wrong target with no trace: `add .x to all .y` (asymmetry: `every`
  warns, `all` doesn't — the `all` token is *consumed* into a bad bind, worth
  a look on its own), `remove .x from all .y`, `set the text of #el`,
  `if #el has class .x`, `add .x to <body/>`. A no-op/zero-effect-command
  diagnostic likely covers most; that one WILL touch parser or builder
  territory, so it inherits the original warning-first + multilingual-gate
  caution this slice got to skip.
- **Two intent mismatches** (`add .hidden to #menu`, `on mouseover`) — valid
  code for a different intent; not diagnosable, by design. Arc 4 territory.

## Verification

- compilation-service: 329/329 (includes the new regression test).
- mcp-server: 428/428 against the rebuilt dist (first `test:check` run failed
  in the pretest ensure-fresh rebuild race, second run clean).
- testing-framework: 304 passed / 4 skipped; agent-bench ratchet 24/24 against
  the regenerated baseline.
- No semantic-package change ⇒ multilingual `--regression` gate not exercised
  (its inputs are untouched); CI's full matrix re-verifies.
