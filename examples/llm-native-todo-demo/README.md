# LLM-Native UI Generation — Validation Test

**Status:** Partial. Bug #10 (compilation service output does not execute) is **FIXED**. The nine other bugs uncovered in the original todo UI attempt remain open and still block the full Direction 2 hypothesis.

**Most recent update:** 2026-04-10 (Option A + event-handler unwrap fix)

## What this is

This directory is the working record of testing whether Direction 2 — "LLMs can generate safe, declarative UI via LSE, compiled into self-contained HTML that just works" — actually holds up end-to-end.

The test was run by a contaminated LLM (me, Claude Sonnet 4.6, with full codebase context) constrained to the vocabulary documented in `protocol/docs/llm-guide.md`. Treat any positive result here as an **upper bound** — a cold-start LLM would do worse.

## Round 1 — failure (2026-04-10, morning)

**Task:** generate LSE for a simple todo UI: input + add button + list, where clicking add appends the input's value as a new `<li>`, and clicking any list item toggles a `.done` class.

**Result:** blocked after 5 rounds. Ten distinct bugs discovered:

| #   | Bug                                                                               | Severity     | Location                                        |
| --- | --------------------------------------------------------------------------------- | ------------ | ----------------------------------------------- |
| 1   | Validator false positive on multi-statement body (gibberish parse, no diagnostic) | Critical     | `lse_validate_and_feedback`, `fromProtocolJSON` |
| 2   | No documented way to express multiple statements in a body                        | Critical     | llm-guide.md                                    |
| 3   | Roles listed globally without per-command accept lists                            | High         | llm-guide.md                                    |
| 4   | `#todo-input.value` silently parsed as CSS selector, not property access          | Critical     | `parseExplicitValue` tokenizer                  |
| 5   | Quoted strings become literals, not expressions                                   | Critical     | No documented escape for inline expressions     |
| 6   | `append`'s `destination` role silently dropped at runtime                         | Critical     | `convertCommand` / runtime append impl          |
| 7   | No escape mechanism for space-containing role values                              | High         | Bracket grammar                                 |
| 8   | `property-path` value type lossy at serialization (converted to expression)       | Critical     | `toProtocolJSON` line 170                       |
| 9   | `toggle`'s `destination` role silently dropped via `lse_to_hyperscript` path      | Critical     | Legacy command compile path                     |
| 10  | **Compilation service output format was not runtime-executable**                  | **Critical** | **FIXED — see below**                           |

**9 of 10 are silent failures.** The validator says OK, the protocol JSON looks right, but the generated code does the wrong thing. For an LLM-native UI generation use case this is catastrophic: the LLM has nothing to correct against.

The original writeup of rounds 1–5 is preserved in this file's git history.

## Bug #10 — fixed 2026-04-10

### What I thought the bug was

I initially characterized #10 as "the compilation service emits verbose event-handler JSON, but the runtime only accepts compact form with trigger sugar." The fix I proposed was **Option A**: change `toProtocolJSON` in `@lokascript/intent` to emit the compact `{action, roles, trigger: {event}}` form instead of the verbose `{kind: "event-handler", body: [...]}` form.

### What the bug actually was

Option A turned out to be necessary but **not sufficient**. The deeper root cause: **`fromProtocolJSON` produces an `event-handler` SemanticNode for BOTH verbose form AND compact form with trigger sugar.** The compact form's trigger sugar path in `fromProtocolJSON` wraps the command in an event-handler node:

```ts
// packages/intent/src/ir/protocol.ts, line 196
if (json.trigger) {
  const eventName = json.trigger.event;
  roles.set('event', createLiteral(eventName, 'string'));
  const bodyRoles = new Map(roles);
  bodyRoles.delete('event');
  const bodyNode = createCommandNode(json.action, bodyRoles);
  return createEventHandlerNode('on', roles, [bodyNode], ...);  // ← event-handler wrapper
}
```

So `fromProtocolJSON` on either shape produces an event-handler semantic node. The actual runtime failure was downstream: **`evalLSENode` on an event-handler SemanticNode doesn't execute its body** — it goes through `semanticNodeToRuntimeAST` → `convertEventHandler` → runtime AST node of `type: 'event'`, which the runtime tries to interpret as "wire up an event listener," not "run these commands now." The handler was already firing (from `<lse-intent>`'s own trigger attribute), so re-wiring achieved nothing and the body never executed.

The one working case (`toggle-sidebar-bare-command.html`) worked because its JSON was a **bare command** — no `kind`, no `trigger` field, no body wrapper — and so `fromProtocolJSON` returned a command node, which the runtime executed correctly.

### The actual fix (two parts)

**Part 1 — Option A in `@lokascript/intent`:** `toProtocolJSON` now emits the compact form for single-body event-handler nodes. This is independently justified by the protocol wire format spec (which lists `trigger` sugar as the canonical compact form) and makes the LLM-facing JSON about half the size of the verbose form. Safety: `canEmitCompactTrigger()` in `protocol.ts` verifies all lossless conditions (single body command, no nested control flow, no annotations, etc.) before emitting compact. Multi-command bodies and any case that would lose information fall back to verbose form. Round-trip is preserved because `fromProtocolJSON` accepts both shapes.

**Part 2 — Event-handler unwrap in `<lse-intent>._execute`:** the custom element now inspects the deserialized semantic node. If it's an event-handler (from either verbose form or compact trigger sugar), `_execute` unwraps it and passes each body command individually to `evalLSENode`. This avoids the "wire up an event listener for an event that's already firing" failure mode. Multi-command bodies are executed sequentially; on failure, execution stops and `lse:error` is emitted.

```ts
// packages/intent-element/src/lse-intent.ts
const executables: SemanticNode[] =
  node.kind === 'event-handler' ? [...((node as { body?: SemanticNode[] }).body ?? [])] : [node];

for (const cmd of executables) {
  const result = await sandboxed(() => runtime.evalLSENode(cmd, this), timeoutMs);
  if (result.ok) results.push(result.result);
  else {
    /* emit lse:error and return */
  }
}
```

### Verification: the 3-case browser test

After both fixes, all three JSON forms work end-to-end in a real browser. The `verify.spec.ts` in this directory tests them as a single 3-case table:

| Test page                             | JSON form                                               | Pre-fix        | Post-fix |
| ------------------------------------- | ------------------------------------------------------- | -------------- | -------- |
| `toggle-sidebar-bare-command.html`    | Bare command: `{action, roles}`                         | ✓ Works        | ✓ Works  |
| `toggle-sidebar-verbose-form.html`    | Verbose: `{kind: "event-handler", body: [...]}`         | ✗ Silent no-op | ✓ Works  |
| `toggle-sidebar-compact-trigger.html` | Compact with sugar: `{action, roles, trigger: {event}}` | ✗ Silent no-op | ✓ Works  |

Run the tests by copying `verify.spec.ts` into `packages/core/src/compatibility/browser-tests/` (which uses the configured Playwright baseURL of `http://localhost:3000`) or run a local `http-server` on port 3000 from the repo root and point Playwright at this directory.

### Test suites updated

| Package                           | Tests | Delta                                                                                                     |
| --------------------------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| `@lokascript/intent`              | 44    | +1 test (compact form + fallback)                                                                         |
| `@lokascript/framework`           | 754   | Updated 2 tests that asserted verbose-output shape                                                        |
| `@hyperfixi/mcp-server`           | 415   | Updated 1 test (`convert_format`)                                                                         |
| `@hyperfixi/intent-element`       | 48    | +5 unwrap tests                                                                                           |
| `@lokascript/compilation-service` | 328   | No test changes (existing tests check attributes and top-level action, both unchanged by the shape shift) |
| `@hyperfixi/core` (lse bridge)    | 25    | No changes                                                                                                |
| Playwright intent-element smoke   | 8     | All pass                                                                                                  |

## What #10 being fixed does NOT imply

Direction 2 is still **not validated**. Bugs 1–9 remain open, and several of them block any non-trivial LLM-native UI generation:

- **#4 (selector vs property access)** and **#5 (quoted strings become literals)** mean an LLM cannot read an input element's value in bracket syntax. This is the first thing almost any form-handling UI needs.
- **#8 (`property-path` lossy at serialization)** means the LLM can't even reliably use protocol JSON to express property access — the value type exists in the TypeScript types but gets converted to an expression on the way out.
- **#6 (`append` destination silently dropped)** means LLM-generated code that tries to append content to a list will target the wrong element and fail silently.
- **#2 (multi-statement body)** means LLMs cannot express sequential actions in bracket syntax. Compound bodies via the framework's bracket parser still produce parse gibberish that the validator accepts. The intent-element unwrap handles multi-body event-handlers from **protocol JSON**, but not from bracket syntax.
- **#1, #3, #9** are quality-of-diagnostics issues that make correction loops unproductive: when a mistake is silent, an LLM has nothing to correct against.

The next meaningful test of Direction 2 would require at least #4, #5, #6, and #8 fixed, plus a clear documented solution for #2 (probably: use protocol JSON for anything beyond a single command, and make sure multi-body protocol JSON works end-to-end — which, after this session's unwrap fix, it should).

## What was just validated

- **The infrastructure for single-intent commands works end-to-end.** A bracket-syntax event handler wrapping a single command compiles to HTML that executes correctly in a real browser, honoring `patient`/`destination` roles. This is the irreducible minimum the compilation service needed to hit, and it now does.
- **Both JSON wire-format shapes execute correctly** through `<lse-intent>`. Consumers can emit verbose form, compact-with-trigger-sugar, or bare command — all three work.
- **Multi-command event-handler bodies execute sequentially** via the unwrap step. The compilation service still emits verbose form for these (compact form can't represent them), and the unwrap handles them correctly.

## Files in this demo

| File                                  | Purpose                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `README.md`                           | This writeup                                                               |
| `toggle-sidebar-bare-command.html`    | Bare command JSON — the pre-fix "working" case, kept as a regression guard |
| `toggle-sidebar-verbose-form.html`    | Verbose event-handler JSON — was broken pre-fix, now works                 |
| `toggle-sidebar-compact-trigger.html` | Compact form with trigger sugar — was broken pre-fix, now works            |
| `verify.spec.ts`                      | Playwright spec exercising all three pages as a table-driven test          |

## What to do next

If you want to unblock Direction 2 entirely, the highest-leverage next steps are:

1. **Fix Bug #4 (selector vs property access)** — document and implement a bracket-syntax form for property access. The protocol already has a `property-path` value type; it just needs to be reachable from bracket input without string-quoting it and without colliding with CSS class selectors. This probably means a new leading sigil (e.g. `@#todo-input.value`) or a new role value prefix.
2. **Fix Bug #8 (`property-path` lossy at serialization)** — `toProtocolJSON` explicitly converts property-path to expression at line 170 of `protocol.ts`. Either round-trip it as a native value type (requires wire format spec update) or document the one-way lossiness.
3. **Fix Bug #6 (`append` destination drop)** — audit the runtime command implementations for `append`, `toggle`, and any other command that takes a destination. The role is reaching the runtime AST; something between there and DOM mutation is dropping it.
4. **Rerun the todo UI task** — with #4, #6, #8 fixed and #10 already fixed, try to generate the original todo UI via bracket syntax. If it converges in ≤3 rounds, Direction 2 is validated.

Alternatively: constrain LLMs to emit protocol JSON directly (with JSON Schema constrained decoding via function-calling APIs). That eliminates bugs 1–5 and 7 as a class — the LLM physically cannot emit malformed JSON under constrained decoding — and leaves only the runtime bugs to fix. Narrower surface, more testable.
