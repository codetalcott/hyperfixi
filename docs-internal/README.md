# docs-internal

Internal plans and design records for the monorepo. User-facing docs live in `docs/` and in each
package's README. Finished work is not kept here: its docs are deleted under a tag and listed in
[`ARCHIVE.md`](ARCHIVE.md). How to write here: [`CLAUDE.md`](CLAUDE.md).

## Live queues

| Doc                                                                    | What it holds                                                                                                               |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`MULTILINGUAL_NEXT_STEPS.md`](MULTILINGUAL_NEXT_STEPS.md)             | The multilingual roadmap: where the gates stand, what no gate measures, the arcs, and the policies in force                  |
| [`multilingual/OPEN_ITEMS.md`](multilingual/OPEN_ITEMS.md)             | Every open multilingual item, one line each, with the IDs the roadmap uses                                                  |
| [`multilingual/VALUE_READING.md`](multilingual/VALUE_READING.md)       | The rules that tell a variable from a structure word, and the name-collision policy (a PR that moves a rule updates its row) |
| [`PARSER_NEXT_STEPS.md`](PARSER_NEXT_STEPS.md)                         | Core parser defects (`packages/core/src/parser/`), diagnosed and queued                                                     |
| [`AGENT_ERA_ROADMAP.md`](AGENT_ERA_ROADMAP.md)                         | Arcs 1–5 landed; Arc 6 and the deferrals are open                                                                          |
| [`HYPERSCRIPT_TOOLS_NEXT_STEPS.md`](HYPERSCRIPT_TOOLS_NEXT_STEPS.md)   | The `@hyperscript-tools/*` queue (parts are stale; re-check before acting)                                                  |

## Design records (current, not queues)

| Doc                                                                                    | Why it stays                                                                             |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [`ENGINE_MIGRATION_PLAN.md`](ENGINE_MIGRATION_PLAN.md)                                 | Every arc closed (2026-09-03); the target design the type-escape and layering ratchets cite |
| [`COMMAND_ARCHITECTURE_NEXT_STEPS.md`](COMMAND_ARCHITECTURE_NEXT_STEPS.md)             | All six arcs done; the command layer's design principles                                 |
| [`analysis/TYPE_SAFETY_DESIGN.md`](analysis/TYPE_SAFETY_DESIGN.md)                     | Environment-specific conditional types (root CLAUDE.md links it)                         |
| [`proposals/aot-compiler-design.md`](proposals/aot-compiler-design.md)                 | The AOT compiler's design (AOT is parked, owner 2026-09-27)                              |
| [`build/CHANGELOG_GUIDELINES.md`](build/CHANGELOG_GUIDELINES.md), [`build/CHANGELOG_PROTECTION.md`](build/CHANGELOG_PROTECTION.md) | `scripts/validate-changelog.cjs` and `bump-version.cjs` print their paths               |

## Open briefs (work not started)

- [`HANDOFF-imperative-forms.md`](HANDOFF-imperative-forms.md): the de residual; re-check it is still open.
- [`HANDOFF_ts6-migration.md`](HANDOFF_ts6-migration.md): TypeScript 6.
- [`hyperscript-org-offer/`](hyperscript-org-offer/): the offer to hyperscript.org, never sent.
- [`multilingual/plan.md`](multilingual/plan.md): de-duplicating semantic against the framework (Phase 3,
  the PatternMatcher fork, is the roadmap's M3 (e)).
- [`proposals/community-review-system.md`](proposals/community-review-system.md),
  [`proposals/lse-syntax-new-directions.md`](proposals/lse-syntax-new-directions.md),
  [`proposals/PLAN-siren.md`](proposals/PLAN-siren.md),
  [`sessions/DOMAIN_VOICE_STRUCTURAL_REVIEW.md`](sessions/DOMAIN_VOICE_STRUCTURAL_REVIEW.md).

## Reference

- [`multilingual/Computational Linguistics & Localization Analysis.md`](<multilingual/Computational Linguistics & Localization Analysis.md>):
  the research report behind `packages/semantic/NATIVE_REVIEW_NEEDED.md`.
