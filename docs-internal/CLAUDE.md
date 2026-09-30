# docs-internal: how to write here

Loaded when you work on files in this directory. These rules exist because this directory grew to 186
files and 76,000 lines, most of it history, and the one live multilingual queue grew to 8,740 lines of
dated update blocks. Prose claims about code state rot silently; the durable authority is an executable
artifact (a committed baseline, a ratchet gate, a `check:*` script).

## Claims

A doc may make a **status claim** (anything a reader might act on without re-checking: "defect X
exists", "metric Y is Z", "arc N is done") only with **a date or commit stamp** and **the command that
re-checks it**:

```markdown
<!-- yes -->
The value matrix has 198 failing pairs, all ACCEPTED (2026-09-30 — re-check:
`cd packages/testing-framework && npx tsx tools/regen-value-matrix-baseline.ts --dry-run`).

<!-- no: unverifiable and unstamped -->
The value matrix is clean.
```

**Decisions and their reasons** need only a date. "The owner decided X because Y" cannot be
re-derived from code, and preserving it is what these docs are for.

## Queues

- **One line per item, with an ID.** A PR that fixes an item deletes its line; the PR body and git log
  keep the story. Do not strike items through and leave them; do not add dated "Update" blocks.
- **No per-PR narrative in a queue doc.** Put the measurements, the root cause and the "left" list in
  the PR body. If a lesson should outlive the PR, it goes to the relevant playbook or to agent memory.
- **Size budgets.** `MULTILINGUAL_NEXT_STEPS.md` stays under ~300 lines and each queue under ~400.
  Past the budget, something in it is history: delete it.
- **Before costing an item, re-measure it.** A filing's diagnosis, cost and status all age.

## New files

- A new top-level file needs a reason the existing queues cannot hold. Intent and diagnosed-but-ungated
  defects go in a queue, not in a new file.
- A handoff (`HANDOFF-*`) describes one arc. Keep handoffs outside the repo (`~/.claude/plans/`) when
  you can. One that lands here is deleted when its arc ships, after its durable lessons move to a queue
  or playbook.

## Archiving

Delete, don't move. Two cleanups that moved files into `archive/` and rewrote every reference (#876,
#903) sat unmerged until they conflicted across hundreds of files.

1. Tag `main` first: `git tag -a archived/<name>-<date> origin/main -m "<what and why>"`, then push the
   tag.
2. `git rm` the files, and add one row per file to [`ARCHIVE.md`](ARCHIVE.md) (path, class, last date,
   note).
3. Repoint only what people read on the way in: the root and package `CLAUDE.md` files and
   [`README.md`](README.md). Code comments and old docs that name an archived file stay as they are;
   `ARCHIVE.md` resolves them.
4. Keep the PR docs-only (`docs-internal/**`, `*.md`). CI's `code` filter skips the npm jobs, so it
   merges the same day.
