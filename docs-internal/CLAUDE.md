# docs-internal authoring rules

Auto-loaded when working on files in this directory. These rules exist because
prose claims about code state rot silently — the only durable authority is an
executable artifact (a committed baseline, a ratchet gate, a `check:*` script).

## The verifiability rule

A doc may make an **actionable state claim** only if it:

1. **names the command that re-verifies it**, and
2. **carries a date or commit stamp**.

A state claim is anything a reader might act on without re-checking: "defect X
exists", "metric Y sits at Z", "arc N is done/blocked", "fix M shipped".

```markdown
<!-- compliant -->
th R1 sits at 0.9845 (2026-07-27, baseline 77f9c2bc — verify:
`cd packages/testing-framework && npx tsx tools/triage-r1.ts`).

<!-- not compliant: unverifiable, unstamped -->
th is the lowest R1 language.
```

**Exemption — decisions and rationale.** "Owner decided to skip X because Y"
has no re-verifying command and never will; that content is exactly what these
docs exist to preserve (it cannot be rediscovered by testing code). Decisions
need only a date stamp.

Claims that fail the rule get rewritten or deleted when found, not
grandfathered.

## Reading these docs

Every claim reflects the moment of its stamp, nothing later. Before acting on
one: run its verification command, and compare the stamp against the file's
`git log`. A filing's diagnosis, cost estimate, and status all age
independently — check the struck-through headings and recent commits before
costing work from a queue doc.

## Lifecycle

- The live queues are `MULTILINGUAL_NEXT_STEPS.md`, `PARSER_NEXT_STEPS.md`,
  and `COMMAND_ARCHITECTURE_NEXT_STEPS.md` — intent and diagnosed-but-ungated
  defects live there, not in new top-level files.
- `HANDOFF-*` docs describe one arc. When the arc ships, the doc is done —
  fold any durable lesson into the relevant queue doc, then delete it (git
  history keeps it).
