# docs-internal

Internal plans and design records for the monorepo. User-facing docs live in `docs/` and in each
package's README. Finished work is not kept here: its docs are deleted under a tag and listed in
[`ARCHIVE.md`](ARCHIVE.md). How to write here: [`CLAUDE.md`](CLAUDE.md).

## Live queues

| Doc                                                              | What it holds                                                                                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [`MULTILINGUAL_NEXT_STEPS.md`](MULTILINGUAL_NEXT_STEPS.md)       | The multilingual roadmap: where the gates stand, what no gate measures, the arcs, and the policies in force                  |
| [`multilingual/OPEN_ITEMS.md`](multilingual/OPEN_ITEMS.md)       | Every open multilingual item, one line each, with the IDs the roadmap uses (also the product and agent-surface deferrals)    |
| [`multilingual/VALUE_READING.md`](multilingual/VALUE_READING.md) | The rules that tell a variable from a structure word, and the name-collision policy (a PR that moves a rule updates its row) |

The engine's own queue is executable: `packages/engine/upstream-suite/known-failures.json` (see
`packages/engine/README.md`).

## Design records of core's engine (historical since 4.0)

Core's own engine was deleted in 4.0 (#1368, 2026-10-04). These stay as records of its design; none is a
queue.

| Doc                                                                        | Why it stays                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [`ENGINE_MIGRATION_PLAN.md`](ENGINE_MIGRATION_PLAN.md)                     | The engine/front-end boundary that `scripts/check-semantic-boundary.cjs` and `ci.yml` cite |
| [`PARSER_NEXT_STEPS.md`](PARSER_NEXT_STEPS.md)                             | Core's parser track; OPEN_ITEMS and a semantic test cite its line numbers                  |
| [`COMMAND_ARCHITECTURE_NEXT_STEPS.md`](COMMAND_ARCHITECTURE_NEXT_STEPS.md) | Core's command layer; OPEN_ITEMS cites its line numbers                                    |

## Process

- [`build/CHANGELOG_GUIDELINES.md`](build/CHANGELOG_GUIDELINES.md): `scripts/bump-version.cjs` and
  `scripts/validate-changelog.cjs` print its path. Its package list predates 4.0; re-check before
  relying on it.

## Open briefs (work not started)

- [`hyperscript-org-offer/`](hyperscript-org-offer/): the offer to hyperscript.org, never sent (written
  before 4.0; OPEN_ITEMS PR8).
- [`proposals/community-review-system.md`](proposals/community-review-system.md): the community review
  design (OPEN_ITEMS PR1).
- [`proposals/lse-syntax-new-directions.md`](proposals/lse-syntax-new-directions.md): partly shipped,
  dormant.

## Reference

- [`multilingual/Computational Linguistics & Localization Analysis.md`](<multilingual/Computational Linguistics & Localization Analysis.md>):
  the research report behind `packages/semantic/NATIVE_REVIEW_NEEDED.md`.
