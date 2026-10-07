# docs-internal archive

Deleted from `main` in two batches, each kept at a tag: 165 files on 2026-09-30
(`archived/docs-internal-2026-09-30`) and ten on 2026-10-06 (`archived/docs-internal-2026-10-06`). A code
comment or an old doc that names one of these files is resolved here. To read one, use its batch's tag:

```bash
git show archived/docs-internal-2026-09-30:docs-internal/<path>
# or restore it for editing:
git checkout archived/docs-internal-2026-09-30 -- docs-internal/<path>
```

Why delete rather than move: two earlier cleanups (#876, 2026-08-01; #903, 2026-08-07) moved files into
`archive/` and rewrote every reference to them; each sat unmerged until it conflicted across hundreds of
files and was closed. Deleting under a tag needs no reference edits, so it lands the same day.

**Other tags that hold removed material:** `archived/multilingual-next-steps-2026-09-30` (the old
8,740-line multilingual queue), `archived/peripheral-2026h1` (speech, playground, components, intercept,
experiments, protocol python/rust), `archived/python-surfaces`, `moved/domain-family` (the domain
packages, now `codetalcott/lokascript-domains`), `parked/sortable-fixes`. The unmerged cleanup branches
`chore/docs-internal-triage` and `chore/sharpen-focus` hold their per-file verdicts of August.

## The ten files of 2026-10-06

At the tag `archived/docs-internal-2026-10-06`, after 4.1.0. The open items they still held moved to
[`multilingual/OPEN_ITEMS.md`](multilingual/OPEN_ITEMS.md) first (V8, PR8–PR11).

| File (under `docs-internal/`) | Class | Last | Note |
| --- | --- | --- | --- |
| `AGENT_ERA_ROADMAP.md` | CLOSED-RECORD | 2026-08-25 | Arcs 1–5 landed; Arc 6 and the two standing deferrals are OPEN_ITEMS PR9–PR11. Cited by comments in compilation-service `normalize.ts`, testing-framework `fidelity.ts` and the agent-bench README |
| `HANDOFF-imperative-forms.md` | CLOSED-RECORD | 2026-07-25 | Done for es/pt/fr/ko and ar (2026-07-25); the de separable-verb residual is OPEN_ITEMS V8; tr's ASCII-folded forms are domain-learn's (lokascript-learn) |
| `HANDOFF_ts6-migration.md` | STALE | 2026-07-20 | Its target, Dependabot #698, closed unmerged 2026-09-03; the repo is on TypeScript ^5.9.3, and core's engine, where most of its errors were, is gone. A TS 6 migration starts from a fresh measurement |
| `HYPERSCRIPT_TOOLS_NEXT_STEPS.md` | STALE | 2026-08-27 | Its roadmap shipped (`@hyperscript-tools/i18n` on semantic, #999; the adapter's `_hyperscript.use()` plugin); the open decision on approaching upstream is OPEN_ITEMS PR8 |
| `multilingual/plan.md` | STALE | 2026-02-14 | De-duplicating semantic against the framework: Phase 2 done (semantic's tokenizer base re-exports framework's); Phase 3, the PatternMatcher fork, is the roadmap's M3 (e); Phase 5 depended on the retired transformer |
| `proposals/aot-compiler-design.md` | CLOSED-RECORD | 2026-02-06 | The AOT compiler retired in 4.0 (#1364, owner 2026-10-04) |
| `proposals/PLAN-siren.md` | STALE | 2026-02-09 | `@lokascript/siren` moved to `experiments/` the next day (5744354cf) and later left the repo; Siren/GRAIL lives in `siren-grail` and its siblings |
| `sessions/DOMAIN_VOICE_STRUCTURAL_REVIEW.md` | STALE | 2026-07-09 | domain-voice left the repo in #909 |
| `analysis/TYPE_SAFETY_DESIGN.md` | STALE | 2026-01-30 | Described `packages/core/src/registry`, deleted with core's engine (#1368) |
| `build/CHANGELOG_PROTECTION.md` | STALE | 2026-02-10 | No script prints or reads it; `build/CHANGELOG_GUIDELINES.md` is the live one |

## The 165 files

Class: **CLOSED-RECORD** = a handoff, scope or plan for work that shipped; **STALE** = describes things that no
longer exist or are wrong. "Last" is the date of its last commit.

| File (under `docs-internal/`) | Class | Last | Note |
| --- | --- | --- | --- |
| `BEHAVIORS_CONSOLIDATION_PLAN.md` | CLOSED-RECORD | 2026-06-15 | Arc complete 2026-06-15 (#430). Cited by 6 behaviors source/test files |
| `BLOCK_BODY_CONDITION_SCOPE.md` | CLOSED-RECORD | 2026-06-10 | Phases shipped (degenerate 92 to 69) |
| `CORRECTNESS_RELIABILITY_PLAN.md` | CLOSED-RECORD | 2026-06-16 | Fidelity-campaign session logs (sections 7a-7cc); 1,945 lines of history |
| `DOMAIN-LEARN-PARITY-FINDINGS.md` | STALE | 2026-07-24 | packages/domain-learn left this repo (#909, 2026-08-09); its lock test is no longer here. Move to lokascript-domains if still wanted |
| `EXPRESSION_INTERNAL_TRANSLATION_SCOPE.md` | CLOSED-RECORD | 2026-07-17 | DONE (90.7 to 97.4%); cited by expression-lexicon.ts |
| `FOR_LOOP_BLOCK_BODY_DESIGN.md` | CLOSED-RECORD | 2026-06-10 | Deferred-by-measurement decision record |
| `FRAMEWORK_SEMANTIC_BRIDGE_PLAN.md` | CLOSED-RECORD | 2026-07-07 | Phases 0-3 done 2026-07-07; Phase 4 never scheduled |
| `HANDOFF-agent-era-arc1-2.md` | CLOSED-RECORD | 2026-08-23 | Landed 2026-08-24 (#914) |
| `HANDOFF-agent-era-arc3.md` | CLOSED-RECORD | 2026-08-23 | Landed 2026-08-24 |
| `HANDOFF-agent-era-arc3b.md` | CLOSED-RECORD | 2026-08-23 | Landed 2026-08-24 |
| `HANDOFF-agent-era-arc4.md` | CLOSED-RECORD | 2026-08-24 | Landed 2026-08-24 |
| `HANDOFF-agent-era-arc5.md` | CLOSED-RECORD | 2026-08-24 | Slice 1 landed; the roadmap says slice 2 landed too (header lags) |
| `HANDOFF-behavior-removable-he-zh.md` | CLOSED-RECORD | 2026-06-16 | Fixed by #445; no status marker |
| `HANDOFF-command-arch-bundles.md` | CLOSED-RECORD | 2026-07-30 | Arc E CLOSED 2026-07-31 |
| `HANDOFF-command-arch-manifest.md` | CLOSED-RECORD | 2026-07-29 | Arc A COMPLETE (#811-819) |
| `HANDOFF-command-arch-mappers.md` | CLOSED-RECORD | 2026-07-31 | Arc F CLOSED |
| `HANDOFF-command-arch-metadata.md` | CLOSED-RECORD | 2026-08-01 | Arc B DONE (#823-828); header still says "NOT started" |
| `HANDOFF-command-arch-output-contract.md` | CLOSED-RECORD | 2026-07-28 | Arc C COMPLETE |
| `HANDOFF-command-arch-target-resolution.md` | CLOSED-RECORD | 2026-07-28 | Arc D COMPLETE |
| `HANDOFF-command-word-in-if-condition.md` | CLOSED-RECORD | 2026-07-27 | RESOLVED 2026-07-27 (#786) |
| `HANDOFF-convergence-next.md` | CLOSED-RECORD | 2026-09-02 | Thread A/B structural work closed; Arc 1 step 6 (#1058) removed the comparison it describes |
| `HANDOFF-def-execution.md` | CLOSED-RECORD | 2026-07-26 | Implemented |
| `HANDOFF-dom-processor-collapse.md` | CLOSED-RECORD | 2026-09-03 | LANDED 2026-09-03 (#1122-1124) |
| `HANDOFF-engine-arc1.md` | CLOSED-RECORD | 2026-09-03 | ARC 1 COMPLETE 2026-09-03 |
| `HANDOFF-engine-arc2.md` | CLOSED-RECORD | 2026-09-01 | Arc 2 closed 2026-09-02 |
| `HANDOFF-engine-arc3.md` | CLOSED-RECORD | 2026-09-02 | Arc 3 closed; header still says "nothing started" |
| `HANDOFF-engine-arc4b.md` | CLOSED-RECORD | 2026-09-02 | Arc 4b landed (#1091/#1092); header lags |
| `HANDOFF-engine-arc4c.md` | CLOSED-RECORD | 2026-09-02 | Arc 4c landed (#1093-1095); header lags |
| `HANDOFF-engine-arc7.md` | CLOSED-RECORD | 2026-09-02 | Arc 7 closed (#1097); header lags |
| `HANDOFF-fetch-do-not-throw.md` | CLOSED-RECORD | 2026-06-22 | Lossy band cleared 2026-06-27 |
| `HANDOFF-if-block-then-separator.md` | CLOSED-RECORD | 2026-07-27 | RESOLVED |
| `HANDOFF-implicit-multiline-if.md` | CLOSED-RECORD | 2026-07-27 | RESOLVED 2026-07-27 |
| `HANDOFF-learn-parity-and-markers.md` | CLOSED-RECORD | 2026-07-24 | All three items DONE; domain-learn is now out of the repo |
| `HANDOFF-lossy-tail.md` | CLOSED-RECORD | 2026-06-27 | Lossy 10 to 0 |
| `HANDOFF-marker-paths-and-learn-aims.md` | CLOSED-RECORD | 2026-07-24 | Items 1-2 CLOSED; item 3 (learn priority languages) is out-of-repo work |
| `HANDOFF-multilingual-priorities.md` | CLOSED-RECORD | 2026-06-26 | All priorities cleared |
| `HANDOFF-parity-and-marker-tail.md` | CLOSED-RECORD | 2026-07-24 | Tranches 1-2 DONE (#760) |
| `HANDOFF-parse-path-convergence.md` | CLOSED-RECORD | 2026-09-01 | Queue items 1-5 done (#1016-1021); replaced by Arc 1 step 6 |
| `HANDOFF-parse-success-and-doc-examples.md` | CLOSED-RECORD | 2026-07-27 | Both items DONE |
| `HANDOFF-r1-post-cluster-residue.md` | CLOSED-RECORD | 2026-07-06 | Launch bar COMPLETE 2026-07-06 |
| `HANDOFF-r1-residual.md` | CLOSED-RECORD | 2026-07-05 | Slices landed (#564-566) |
| `HANDOFF-r1-value-type-residue.md` | CLOSED-RECORD | 2026-06-29 | Repeat cluster closed; later R1 arcs replaced it |
| `HANDOFF-remaining-degenerate-singletons.md` | CLOSED-RECORD | 2026-06-26 | Both cleared 2026-06-26 |
| `HANDOFF-shipped-examples-execution.md` | CLOSED-RECORD | 2026-07-27 | Landed #787; cited by a baseline $comment |
| `HANDOFF-sov-event-anchor.md` | CLOSED-RECORD | 2026-06-17 | Its goals are met (parse 100%, R1 1.0; event-anchor guard #566). Premise was the retired i18n reorder. Cited by pattern-matcher.ts x2. The triage said KEEP |
| `HANDOFF-sov-literal-role-extraction.md` | CLOSED-RECORD | 2026-07-04 | ARC COMPLETE 2026-07-04 |
| `HANDOFF-sov-sortable-residuals.md` | CLOSED-RECORD | 2026-06-20 | Complete |
| `HANDOFF-transformer-behavior-fidelity.md` | CLOSED-RECORD | 2026-06-19 | SUPERSEDED: wrong diagnosis (falsification record) |
| `HANDOFF-unless-condition-tokenizer.md` | CLOSED-RECORD | 2026-06-26 | Band cleared (#490/#491) |
| `HANDOFF_arc-c-input-coverage.md` | CLOSED-RECORD | 2026-07-13 | Shipped #648 |
| `HANDOFF_arc-e-fetch-with.md` | CLOSED-RECORD | 2026-07-13 | EXECUTED 2026-07-13 |
| `HANDOFF_arc-f-event-modifier-phrases.md` | CLOSED-RECORD | 2026-07-13 | EXECUTED 2026-07-13 |
| `HANDOFF_body-block-drops.md` | CLOSED-RECORD | 2026-07-09 | RESOLVED (#628/#629) |
| `HANDOFF_colon-event-names.md` | CLOSED-RECORD | 2026-07-10 | RESOLVED (#633); root CLAUDE.md cites it as history |
| `HANDOFF_foreign-validity-burndown.md` | CLOSED-RECORD | 2026-07-19 | Burndown complete 3059/3059 |
| `HANDOFF_go-interchange-inference.md` | CLOSED-RECORD | 2026-07-14 | RESOLVED 2026-07-14 |
| `HANDOFF_pick-text-range-arc2.md` | CLOSED-RECORD | 2026-07-20 | ARC 2 COMPLETE |
| `HANDOFF_pick-text-range-arc3.md` | CLOSED-RECORD | 2026-07-20 | ARC COMPLETE |
| `HANDOFF_r1-deferred-tail.md` | CLOSED-RECORD | 2026-07-11 | RESOLVED 2026-07-11 |
| `HANDOFF_r1-role-fidelity.md` | CLOSED-RECORD | 2026-07-11 | RESOLVED 2026-07-11 |
| `HANDOFF_role-value-audit.md` | CLOSED-RECORD | 2026-07-10 | RESOLVED (R3 signal) |
| `HANDOFF_semantic-roundtrip-validity.md` | CLOSED-RECORD | 2026-07-15 | INVESTIGATED + FIXED; cited by a baseline $comment |
| `HANDOFF_top-level-command-sequences.md` | CLOSED-RECORD | 2026-07-12 | RESOLVED 2026-07-10 |
| `HANDOFF_transformer-rendering.md` | CLOSED-RECORD | 2026-07-10 | RESOLVED. It was about the i18n transformer, which was deleted in #1001 |
| `HANDOFF_value-bug-families.md` | CLOSED-RECORD | 2026-07-10 | RESOLVED 2026-07-10 |
| `HANDOFF_vitest-oxc-decorators.md` | CLOSED-RECORD | 2026-07-20 | FIXED by #1146 (2026-09-17): core vitest.config.ts now routes TS through esbuild; vitest ^5.0.2. Header still says "not fixed"; the dependabot.yml comment cites it. The triage said KEEP |
| `HANDOFF_vocab-batch1-v4-probe.md` | CLOSED-RECORD | 2026-07-12 | RESOLVED (#643) |
| `HANDOFF_vocab-batch2-v3-events.md` | CLOSED-RECORD | 2026-07-12 | Cleared in #644 |
| `HANDOFF_vocab-batch3-v1-reconciliation.md` | CLOSED-RECORD | 2026-07-12 | Closed (#645) |
| `HANDOFF_vocab-consistency.md` | CLOSED-RECORD | 2026-07-12 | Arc landed (#642/#645); ci.yml comment cites it |
| `LINT_TYPECHECK_IMPROVEMENTS.md` | STALE | 2026-01-30 | Jan ESLint snapshot; the repo uses oxlint now |
| `LOCAL_VARIABLES_GUIDE.md` | STALE | 2026-01-21 | Narrower copy of packages/core/docs/LOCAL_VARIABLES_GUIDE.md, and its globals claim is wrong |
| `MAINTENANCE.md` | STALE | 2026-06-16 | "v1.0.0" guide: @lokascript/* names, codetalcott/lokascript URLs, calls release:publish/build:browser:lite/minimal (none exist), retired lite/minimal bundles. The triage said KEEP; the 4.0 bundle retirement changed that |
| `MORPHLEX_NODE_SAFETY.md` | CLOSED-RECORD | 2026-07-08 | RESOLVED in 2.7.2 (morph-library decision record) |
| `MULTILINGUAL_BEHAVIORS_PLAN.md` | CLOSED-RECORD | 2026-06-15 | Phases 0-4 complete; cited by 7 semantic source/test files |
| `MULTILINGUAL_ROADMAP.md` | CLOSED-RECORD | 2026-07-05 | Arc history (header still says "Living plan"). Cited by CLAUDE.md + 3 test files |
| `NON_SOV_REPEAT_SCOPE.md` | CLOSED-RECORD | 2026-06-09 | SHIPPED |
| `PARSER_FIX_STATUS.md` | CLOSED-RECORD | 2026-07-27 | Says of itself: "archived 2026-07-27". CLAUDE.md warns about it by name |
| `PLAN_pick-text-range.md` | CLOSED-RECORD | 2026-07-20 | All arcs shipped; header still says "not started" |
| `PUBLISHING-READINESS-PLAN.md` | STALE | 2026-01-21 | Jan pre-first-publish blocker list; packages ship at 4.x |
| `README.md` | STALE | 2026-01-30 | Old index: 13-language i18n, dead ../roadmap links, @lokascript names |
| `RELEASE_NOTES_v2.8.0-draft.md` | CLOSED-RECORD | 2026-07-21 | v2.8.0 released; CHANGELOG.md links it |
| `SOV_REORDER_SCOPE.md` | CLOSED-RECORD | 2026-06-08 | Shipped in #298 (header says not started). Subject was the i18n transformer, deleted in #1001 |
| `SOV_REPEAT_SCOPE.md` | CLOSED-RECORD | 2026-06-09 | SHIPPED |
| `SPIKE_vite-plus-toolchain.md` | CLOSED-RECORD | 2026-07-20 | Spike adopted (oxlint); dependabot.yml cites it twice for the TS 6/7 cost data |
| `STRUCTURAL_ARCS_ROADMAP.md` | CLOSED-RECORD | 2026-06-14 | R2 tail cleared; cited by 5 semantic files |
| `TASK10_MULTIWORD_MARKER_HANDOFF.md` | CLOSED-RECORD | 2026-06-13 | Phases B/C done, A rescoped |
| `TECHNICAL_DEBT.md` | STALE | 2026-01-30 | Jan ESLint-warning strategy |
| `TEST_FAILURES_PLAN.md` | STALE | 2026-01-30 | Jan mock-test failures, fixed long ago |
| `TEST_INVESTIGATION.md` | STALE | 2026-01-30 | Jan bundle-compat snapshot |
| `TRANSITION_MODIFIER_REFACTOR_PLAN.md` | STALE | 2026-06-07 | Replaced by the schema valueShape work; says its own root cause is partly wrong |
| `WORKFLOW_ANALYSIS.md` | STALE | 2026-01-30 | Jan Actions failure analysis; workflows consolidated since (still linked from 2 .github/workflows/*.md) |
| `ZH_BLOCK_BODY_SCOPE.md` | CLOSED-RECORD | 2026-06-09 | Shipped. Cited by 10 i18n/semantic files (most-cited closed record) |
| `analysis/BUNDLE_AUDIT.md` | STALE | 2026-01-30 | Jan bundle-size snapshot |
| `analysis/CONDITIONAL_TYPES_SUMMARY.md` | STALE | 2026-01-30 | Implementation summary duplicated by TYPE_SAFETY_DESIGN + code |
| `analysis/EVENT_SOURCE_INTEGRATION_ANALYSIS.md` | STALE | 2026-01-30 | The 8-package integration map names packages that are gone (server-integration etc.) |
| `analysis/LOKASCRIPT_REBRAND_ASSESSMENT.md` | CLOSED-RECORD | 2026-07-20 | SUPERSEDED 2026-07-13 (brand decision record); stubs/README.md links it |
| `analysis/PLAYWRIGHT_TEST_ANALYSIS.md` | STALE | 2026-01-30 | Describes a root playwright config that no longer exists |
| `assessment/ASSESSMENT_INDEX.md` | STALE | 2026-01-21 | Dec 2025 comparison-tool assessment set built on commands-v2 (gone). Only links to itself |
| `assessment/IMPLEMENTATION_COMPLETE.md` | STALE | 2026-01-21 | Dec 2025 comparison-tool assessment set built on commands-v2 (gone). Only links to itself |
| `assessment/PHASE1_SUMMARY.md` | STALE | 2026-01-21 | Dec 2025 comparison-tool assessment set built on commands-v2 (gone). Only links to itself |
| `assessment/README.md` | STALE | 2026-01-21 | Dec 2025 comparison-tool assessment set built on commands-v2 (gone). Only links to itself |
| `assessment/implementation/ANALYSIS_ENHANCEMENT_PLAN.md` | STALE | 2026-01-21 | Dec 2025 comparison-tool assessment set built on commands-v2 (gone). Only links to itself |
| `assessment/quick-start/ANALYSIS_QUICK_FIX.md` | STALE | 2026-01-21 | Dec 2025 comparison-tool assessment set built on commands-v2 (gone). Only links to itself |
| `assessment/quick-start/ANALYSIS_SUMMARY.md` | STALE | 2026-01-21 | Dec 2025 comparison-tool assessment set built on commands-v2 (gone). Only links to itself |
| `assessment/quick-start/ASSESSMENT_EXECUTIVE_SUMMARY.md` | STALE | 2026-01-21 | Dec 2025 comparison-tool assessment set built on commands-v2 (gone). Only links to itself |
| `assessment/reference/ANALYSIS_VISUAL_SUMMARY.txt` | STALE | 2026-01-21 | Dec 2025 comparison-tool assessment set built on commands-v2 (gone). Only links to itself |
| `assessment/technical/ANALYSIS_TOOLS_README.md` | STALE | 2026-01-21 | Dec 2025 comparison-tool assessment set built on commands-v2 (gone). Only links to itself |
| `assessment/technical/COMPARISON_ANALYSIS_ASSESSMENT.md` | STALE | 2026-01-21 | Dec 2025 comparison-tool assessment set built on commands-v2 (gone). Only links to itself |
| `build/GIT_HOOKS.md` | STALE | 2026-01-30 | Says pre-commit is only prettier; .husky/pre-commit runs ~10 guard scripts |
| `build/REBUILD_QUICKSTART.md` | STALE | 2026-01-30 | Replaced by CLAUDE.md "Cold start". Presents `npm run build` as safe, but it is NOT dependency-ordered. @lokascript names |
| `build/REBUILD_WORKFLOW.md` | STALE | 2026-01-30 | Retired lite/lite-plus/minimal/standard bundles, @lokascript/core, Jan sizes |
| `build/llm-lse-build-plan.md` | CLOSED-RECORD | 2026-02-25 | COMPLETE 2026-02-24 |
| `exploration/multilingual-expansion-opportunities.md` | STALE | 2026-02-05 | Its priorities all shipped or were dropped |
| `exploration/new-directions.md` | CLOSED-RECORD | 2026-02-17 | Strategy framing; phases 1-3 done |
| `exploration/python-codegen-prototype.md` | STALE | 2026-02-05 | PythonRenderer never built; lokascript-python went the runtime route |
| `exports-guide.md` | STALE | 2026-01-21 | @lokascript/core-era import guide; replaced by core TREE_SHAKING_GUIDE |
| `hyperscript-org-offer/hyperfixi-docs-patch.md` | CLOSED-RECORD | 2026-05-07 | One-shot verification checklist, completed |
| `hyperscript-org-offer/improvements-plan.md` | CLOSED-RECORD | 2026-06-15 | Blocking items landed (d9a06b11) |
| `investigations/ARCHITECTURE_READY_INVESTIGATION.md` | STALE | 2026-01-21 | 2025-11 per-command status table |
| `investigations/DOCUMENTATION_HONEST_METRICS_UPDATE.md` | STALE | 2026-01-21 | 2025-11 doc-sync log |
| `investigations/IMPLEMENTATION_PLAN_PARSER_AND_PATTERNS.md` | STALE | 2026-01-21 | 2025-11 multi-word parser plan (shipped) |
| `investigations/PATTERN_REGISTRY_CORRECTION_SUMMARY.md` | CLOSED-RECORD | 2026-01-21 | Honest-metrics decision record |
| `investigations/TEST_SUITE_DEBUG_FINDINGS.md` | STALE | 2026-01-21 | About a harness that was removed |
| `investigations/internationalization.md` | STALE | 2026-01-21 | Copy of the MDN Intl guide, nothing repo-specific |
| `investigations/lang-audit.md` | STALE | 2026-01-21 | Raw LLM dump of draft profiles |
| `investigations/parser-helper-analysis.md` | CLOSED-RECORD | 2026-01-21 | "Do not unify" decision (26 lines) |
| `investigations/refactor-patterns.md` | STALE | 2026-01-21 | Generic TS refactoring essay |
| `investigations/semantic-parsing-validation.md` | STALE | 2026-01-21 | Dec 2025 morphology study, since replaced by the fidelity gates |
| `proposals/DEFERRED_ROADMAP.md` | CLOSED-RECORD | 2026-02-19 | Record of deferrals and their prerequisites (54 lines) |
| `proposals/complex-patterns-strategy.md` | STALE | 2026-01-21 | 51%-to-80% coverage strategy, obsolete |
| `proposals/multilingual-behaviors.md` | STALE | 2026-02-26 | Draft replaced by MULTILINGUAL_BEHAVIORS_PLAN |
| `proposals/patterns-reference-system.md` | CLOSED-RECORD | 2026-01-21 | Shipped as packages/patterns-reference |
| `proposals/semantic-schema-evolution.md` | CLOSED-RECORD | 2026-01-21 | Role schema shipped |
| `proposals/separate-hyperscript-tools.md` | CLOSED-RECORD | 2026-02-17 | Executed (#686); HYPERSCRIPT_TOOLS_NEXT_STEPS took over |
| `release/NPM_ORG_SETUP.md` | STALE | 2026-01-30 | Org checklist already used ("Pending Creation") |
| `release/NPM_PUBLISH_FIX.md` | CLOSED-RECORD | 2026-01-30 | OIDC incident record; the steps can be reused |
| `release/PRE_PUBLICATION_REPORT.md` | STALE | 2026-02-10 | v1.0.0 readiness snapshot |
| `release/RELEASE_CHECKLIST.md` | STALE | 2026-07-20 | Its own banner: HISTORICAL, DO NOT FOLLOW |
| `release/RELEASE_COMMANDS.md` | STALE | 2026-02-10 | Manual publish flow; replaced by publish.yml |
| `release/RELEASE_GUIDE.md` | STALE | 2026-02-10 | Manual v1.0.0 release walkthrough; replaced by publish.yml + CLAUDE.md |
| `sessions/20-29/SESSIONS_20-29_COMPLETE_SUMMARY.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/23-28/SESSION_23_SUMMARY.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/23-28/SESSION_24_SUMMARY.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/23-28/SESSION_25_SUMMARY.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/23-28/SESSION_26_SUMMARY.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/23-28/SESSION_27_SUMMARY.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/23-28/SESSION_27_VERIFICATION.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/23-28/SESSION_28_SUMMARY.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/30/SESSION_30_PART_3_DOCUMENTATION_UPDATE.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/30/SESSION_30_PATTERN_REGISTRY_VALIDATION.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/30/SESSION_30_RANGE_SYNTAX_COMPLETE.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/30/SESSION_30_RECOMMENDATIONS_COMPLETE.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/31/SESSION_31_ARCHITECTURE_READY_VERIFICATION.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/31/SESSION_31_FINAL_ASSESSMENT.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/32/SESSION_32_COMPLETE_SUMMARY.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/32/SESSION_32_FINAL_100_PERCENT.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/32/SESSION_32_PARSER_MULTIWORD_SUPPORT.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/34/INVESTIGATION_PLAN.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/34/SESSION_34_COMPLETE_SUMMARY.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/34/SESSION_34_CONTENT_CHANGE_OBSERVER.md` | STALE | 2026-01-21 | 2025-11 session log; its numbers were replaced by CI gates |
| `sessions/BACKTRACKING_PLAN.md` | CLOSED-RECORD | 2026-02-15 | Implemented (c07a90d7) |
| `sessions/DOMAIN_REVIEW.md` | STALE | 2026-02-15 | Review of domain-sql/bdd/jsx, which left the repo in #909 |
| `sessions/IMPROVEMENT-PLAN-behavior.md` | STALE | 2026-02-16 | domain-behaviorspec plan (done); the package left the repo in #909 |
| `sessions/IMPROVEMENT_PLAN-jsx.md` | STALE | 2026-02-16 | domain-jsx plan; the package left the repo in #909 |
