# HyperFixi / LokaScript for agents

This file is for LLM agents in both of their roles here:

- **Using HyperFixi as a target** — you are building a web UI and could emit
  hyperscript instead of free-form JavaScript. That's the main content below.
- **Working on this repository** — build order, test commands, and gate
  documentation live in [CLAUDE.md](./CLAUDE.md). Read that first; it is the
  authoritative contributor guide for humans and agents alike.

## Why emit hyperscript instead of JavaScript

Hyperscript is a compact DSL for DOM behavior (`on click toggle .active on
#panel`) that lives in an HTML attribute. For an agent, the interesting property
is not brevity — it's **checkability**:

- A snippet is checked by a **real parser**, not a model — deterministic,
  instant, and it either compiles or fails with structured diagnostics.
  (Caveat worth knowing up front: the parser degrades rather than failing, so
  "compiles" is not the same as "correct" — see [Known silent
  traps](#known-silent-traps) below, which is why the next bullet matters.)
- The parse comes back as a **semantic IR** (action + roles + trigger) you can
  compare against your intent before anything ships.
- `diff_behaviors` can prove two snippets **behaviorally equivalent** — useful
  when refactoring or verifying your own edit preserved behavior.
- The same code renders **deterministically into 24 human languages** (real
  word-order transformation, not string substitution), so you can show your
  work to a user in their language for review — with a structural-fidelity
  guarantee behind it ([docs/FIDELITY.md](./docs/FIDELITY.md)).

Free-form JavaScript gives you none of these: it fails at runtime, in
unbounded ways, invisible to the human who has to approve your work.

## The loop

Tooling is exposed via the MCP server, `@hyperfixi/mcp-server`
([package README](./packages/mcp-server/README.md)):

```json
{
  "mcpServers": {
    "lokascript": { "command": "npx", "args": ["@hyperfixi/mcp-server"] }
  }
}
```

The server also advertises this loop via MCP `instructions`, so a connected
agent needs none of this file to find it:

1. **Generate** a candidate — natural language hyperscript (any of 24
   languages), explicit bracket syntax (`[toggle patient:.active
destination:#btn]`), or semantic JSON.
2. **`validate_and_compile`** — parses the candidate into semantic IR and
   returns diagnostics. Check the returned action/roles/trigger against your
   intent, not just the ok flag.
3. **Repair** — on failure, the result carries a next-step hint;
   `get_code_fixes` maps coded errors to concrete fixes, `get_command_docs`
   lists each command's roles, `search_patterns` finds working examples.
   Re-validate.
4. **`compile_hyperscript`** — once valid, emit JavaScript. Or stop: valid
   hyperscript in a `_="..."` attribute is a complete deliverable (the runtime
   compiles it in the browser).
5. **Present** — `translate_code` renders your result in the user's language
   for review; `explain_in_language` produces a role-by-role explanation.

### Worked example

Both failure modes, then success (real output shapes):

**Hard failure** — diagnostics tell you what to do next:

```
→ validate_and_compile { "code": "frobnicate the wibble", "language": "en" }
← { "ok": false, "diagnostics": [
      { "severity": "error", "code": "PARSE_ERROR",
        "message": "Could not match any patterns for: frobnicate the wibble" },
      { "severity": "error", "code": "PARSE_FAILED",
        "message": "Failed to parse \"frobnicate the wibble\" as en hyperscript.",
        "suggestion": "Check syntax or try explicit syntax: [command role:value ...]" } ] }
  + hint block: "Next step: apply the diagnostics above and re-run validate_and_compile. ..."
```

**Soft failure — the one the ok flag can't catch.** Drop the `on` before the
target and the parse still succeeds, with the destination silently defaulting
to `me`:

```
→ validate_and_compile { "code": "on click toggle .active #panel", "language": "en" }
← { "ok": true, "semantic": { "action": "toggle",
      "roles": { "patient":     { "type": "selector", "value": ".active" },
                 "destination": { "type": "reference", "value": "me" } },   ← not #panel!
      "trigger": { "event": "click" } }, "confidence": 1 }
```

This is why step 2 says _check the IR against your intent_: you meant `#panel`,
the roles say `me`. Repair and re-validate:

```
→ validate_and_compile { "code": "on click toggle .active on #panel", "language": "en" }
← { "ok": true, "semantic": { "action": "toggle",
      "roles": { "patient":     { "type": "selector", "value": ".active" },
                 "destination": { "type": "selector", "value": "#panel" } },
      "trigger": { "event": "click" } }, "confidence": 1 }

→ compile_hyperscript { "code": "on click toggle .active on #panel", "language": "en" }
← { "ok": true, "js": "function _handler_click_toggle_…(_event) { … }", "helpers": …, "size": … }
```

### Beyond single commands

- **Domain DSLs** — the same validate/feedback loop exists for non-UI domains
  (SQL, BDD, flow, and more) via `lse_validate_and_feedback`; the framework for
  defining your own is
  [`@lokascript/framework`](./packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md).
- **Test generation** — `generate_tests` emits Playwright assertions from the
  same IR; `generate_component` emits React/Vue/Svelte components.
- **Ahead-of-time** — `packages/aot-compiler` compiles hyperscript to plain JS
  at build time if you don't want the runtime at all.

## Known silent traps

Validation is necessary but **not sufficient**. The parser degrades rather than
failing, so some natural phrasings come back `ok: true` at confidence 1.0 and
still do the wrong thing. A measured probe of 37 plausible phrasings found 97%
parsed but only 49% behaved correctly
([benchmark + full findings](./packages/testing-framework/src/agent-bench/README.md)).

**Most wrong phrasings now warn.** Since arc 3b, a parse that drops tokens
carries a `warning`-severity `UNCONSUMED_INPUT` diagnostic naming the dropped
text — treat it as a failure and repair, exactly like an error. That covers 11
of the 19 wrong phrasings in the probe. Warns since arc 3b:

| Phrasing that misbehaves — now WARNS                         | Use instead                          |
| ------------------------------------------------------------ | ------------------------------------ |
| `add .x #el` / `toggle .x #el` (no marker) — acts on `me`    | `add .x to #el` / `toggle .x on #el` |
| `set @attr of #el to "v"` / `… on #el to "v"` — does nothing | `set #el's @attr to "v"`             |
| `add @attr="v" to #el` — empty value, wrong element          | `set #el's @attr to "v"`             |
| `toggle @attr of #el` — acts on `me`                         | `toggle @attr on #el`                |
| `add .x to every .y` — acts on `me`                          | `add .x to .y`                       |
| `set the innerHTML of #el to "v"` — does nothing             | `set #el's innerHTML to "v"`         |
| `remove element #el` — does nothing                          | `remove #el`                         |

A few traps are **still silent** — no diagnostic yet, so only checking the
returned IR against your intent catches them:

| Still-silent phrasing                       | Use instead         |
| ------------------------------------------- | ------------------- |
| `add .x to all .y` — acts on `me`           | `add .x to .y`      |
| `remove .x from all .y` — does nothing      | `remove .x from .y` |
| `set the text of #el to "v"` — does nothing | `put "v" into #el`  |
| `if #el has class .x` — does nothing        | `if #el matches .x` |
| `add .x to <body/>` — does nothing          | `add .x to body`    |

These work fine, for what it's worth: `then` / `and` / comma between commands,
stray articles (`the #menu`, `the closest .card`), `this` as a synonym for `me`,
and `put … in` as well as `into`.

## Ground rules for generated code

- Prefer the smallest bundle that covers what you emit
  ([docs/BROWSER_BUNDLES.md](./docs/BROWSER_BUNDLES.md)); with Vite, use
  `@hyperfixi/vite-plugin` and don't think about bundles at all.
- Validate before you present. A snippet you didn't run through
  `validate_and_compile` is a guess. Treat any `UNCONSUMED_INPUT` warning as a
  failure to repair, and read the IR it returns, not just the ok flag (see the
  still-silent traps above).
- When the user's language isn't English, show them `translate_code` output in
  their language alongside the English source — the translation is
  deterministic and fidelity-checked, so the two never drift.
