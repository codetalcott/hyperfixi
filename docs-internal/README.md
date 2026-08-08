# docs-internal

Working documentation for maintainers. Public-facing docs live in
[docs/](../docs/) and per-package `docs/` directories; this tree is the internal
record — active work queues at the top level, everything shipped or superseded
under [archive/](./archive/).

## Active queues (the files that matter)

| File | Track |
| --- | --- |
| [MULTILINGUAL_NEXT_STEPS.md](./MULTILINGUAL_NEXT_STEPS.md) | **The** multilingual fidelity queue — R1 tail, R3 residuals, per-arc history pointers |
| [PARSER_NEXT_STEPS.md](./PARSER_NEXT_STEPS.md) | Core-parser defects (`packages/core/src/parser/`) — check before triaging a parse bug |
| [COMMAND_ARCHITECTURE_NEXT_STEPS.md](./COMMAND_ARCHITECTURE_NEXT_STEPS.md) | Command-layer structural work — read before touching a command surface |
| [HYPERSCRIPT_TOOLS_NEXT_STEPS.md](./HYPERSCRIPT_TOOLS_NEXT_STEPS.md) | The upstream-\_hyperscript tooling family (adapter, tools-i18n, …) |
| [MAINTENANCE.md](./MAINTENANCE.md) | Rebuild workflows, changelog discipline, operational how-tos |

A queue entry's linked brief is authoritative; the queue line is just the index.

## Live subdirectories

- **[analysis/](./analysis/)** — design docs still referenced by code and CLAUDE.md (e.g. `TYPE_SAFETY_DESIGN.md`)
- **[build/](./build/)** — changelog guidelines (wired into `scripts/bump-version.cjs`), git hooks, rebuild guides
- **[release/](./release/)** — release + npm publishing guides
- **[proposals/](./proposals/)** — open feature proposals
- **[multilingual/](./multilingual/)** — multilingual reference material
- **[hyperscript-org-offer/](./hyperscript-org-offer/)** — upstream-relationship material

## archive/

Shipped arcs and cold material, kept as the written record (the HANDOFFs are how
the fidelity ratchet's design decisions are documented):

- **[archive/handoffs/](./archive/handoffs/)** — per-arc HANDOFF briefs (~50). Each is the
  full record of one shipped arc: diagnosis, measurements, what was deliberately deferred.
- **[archive/scopes/](./archive/scopes/)** — scoping documents for the SOV/block-body arcs
- **[archive/plans/](./archive/plans/)** — completed plans, roadmaps, and one-off findings
  (including `MULTILINGUAL_ROADMAP.md`, the #492–#506 burn-down history)
- **[archive/2026-h1/](./archive/2026-h1/)** — early-2026 assessment/exploration/investigation/session notes

Deleted (not archived) docs are recoverable via git history; repo-level deletions
are indexed in [ARCHIVE.md](../ARCHIVE.md) at the root.
