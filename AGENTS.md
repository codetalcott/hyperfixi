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
- `diff_behaviors` compares two snippets parse against parse: the trigger,
  every command of a `then` chain, both branches of an `if`, a loop's body,
  each with all its roles, and names what differs. `score_fidelity` scores a
  candidate against a reference — recall, precision, role and invariant-value
  signals, each naming exactly what was dropped or hallucinated
  (`missingValues: ["toggle.destination=#panel"]`). Both work across
  languages, so they also check that a translation kept its meaning. Use
  either when refactoring or verifying your own edit. They compare parses, not
  runs: "identical" means the two read the same, which is the claim to rely on.
- The same code renders **deterministically into 24 human languages** (real
  word-order transformation, not string substitution), so you can show your
  work to a user in their language for review. Fidelity in that direction is
  **measured, not guaranteed**: every corpus pattern round-trips in every
  language with no action or role lost (3,588 pairs), and on 1,135 scripts
  harvested from upstream's own tests a translation either reads back the same
  (26,537 of 27,240 language pairs) or is refused (703) — none silently differ
  ([docs/FIDELITY.md](./docs/FIDELITY.md)). `translate_code` refuses a
  translation that would lose part of the script (`LOSSY_TRANSLATION`, with the
  partial text under `partial`) rather than return it; prefer it, and its
  `verification.faithful`, over presenting a translation unchecked. Text a
  person writes in another language is a different matter: the reader still
  misreads some hand-written phrasings, so translate your own English rather
  than trusting `translate_to_english` on free-form foreign input.

Free-form JavaScript gives you none of these: it fails at runtime, in
unbounded ways, invisible to the human who has to approve your work.

## The loop

Tooling is exposed via the MCP server, `@hyperfixi/mcp-server`
([package README](./packages/mcp-server/README.md)):

```json
{
  "mcpServers": {
    "lokascript": { "command": "npx", "args": ["-y", "@hyperfixi/mcp-server"] }
  }
}
```

It installs the engine with it (`@hyperfixi/engine`; before 7.5.0 an optional
peer `npx` left out, and every error only the engine catches came back `ok`). A
result whose engine check could not run says so: `ENGINE_CHECK_SKIPPED`
(`info`). It lists 14 core tools, every one this loop names; the rest are in toolsets
(`domains`, `lse`, `grail`, `debug`, `editor`, `analysis`, `profiles`,
`project`) that `LOKASCRIPT_MCP_TOOLSETS` lists, comma-separated or `all`. The
server also advertises this loop via MCP `instructions`, so a connected agent
needs none of this file to find it:

1. **Generate** a candidate — natural language hyperscript (any of 24
   languages), explicit bracket syntax (`[toggle patient:.active
destination:#btn]`), or semantic JSON.
2. **`validate_and_compile`** — parses the candidate into semantic IR and
   returns diagnostics. Check the returned action/roles/trigger against your
   intent, not just the ok flag. A `then` chain is `compound` with each command
   in `body`; an `if` has its branches in `body` and `else`.
3. **Repair** — on failure, the result carries a next-step hint;
   `get_code_fixes` maps coded errors to concrete fixes, `get_command_docs`
   lists each command's roles, `search_patterns` finds working examples.
   Re-validate.
4. **Use it** — once valid, hyperscript in a `_="..."` attribute is a complete
   deliverable: the engine (`@hyperfixi/engine`) runs it in the browser.
   Natural-language input has already been parsed by that engine during
   validation (`ENGINE_PARSE_ERROR` when it cannot read it).
5. **Present** — `translate_code` renders your result in the user's language
   for review, and every result carries a `verification` report scored against
   the source: show the user `verification.faithful` alongside the translation
   ("this rendering is structurally exact"). `explain_in_language` (in the
   `analysis` toolset) produces a role-by-role explanation.

### Worked example

Real output from `validate_and_compile`, trimmed to the fields that matter.

**Hard failure** — diagnostics tell you what to do next:

```
→ validate_and_compile { "code": "frobnicate the wibble", "language": "en" }
← { "ok": false, "diagnostics": [
      { "severity": "error", "code": "PARSE_ERROR",
        "message": "Could not match any patterns for: frobnicate the wibble" },
      { "severity": "error", "code": "PARSE_FAILED",
        "message": "Failed to parse \"frobnicate the wibble\" as en hyperscript.",
        "suggestion": "Check syntax or try explicit syntax: [command role:value ...]" },
      { "severity": "error", "code": "ENGINE_PARSE_ERROR",
        "message": "@hyperfixi/engine cannot read this: Unexpected Token : the" } ] }
  + hint block: "Next step: apply the diagnostics above and re-run validate_and_compile. ..."
```

**The engine names the token.** Drop the `on` before the target and the engine
stops there:

```
→ validate_and_compile { "code": "on click toggle .active #panel", "language": "en" }
← { "ok": false, "diagnostics": [
      { "severity": "warning", "code": "UNCONSUMED_INPUT",
        "message": "clause kept as written, read by no role: \"#panel\"" },
      { "severity": "error", "code": "ENGINE_PARSE_ERROR",
        "message": "@hyperfixi/engine cannot read this: Unexpected Token : #panel" } ] }
```

**Soft failure — the one the ok flag can't catch.** The engine reads this, and it
does nothing: hyperscript has no `this`, so it is a variable nobody set.

```
→ validate_and_compile { "code": "on click toggle .active on this", "language": "en" }
← { "ok": true, "semantic": { "action": "toggle",
      "roles": { "patient":     { "type": "selector",   "value": ".active" },
                 "destination": { "type": "expression", "value": "this" } },   ← not an element
      "trigger": { "event": "click" } },
    "diagnostics": [ { "severity": "warning", "code": "THIS_IS_NOT_ME",
      "suggestion": "Write `me` for the element the handler is on (`toggle .a on me`), ..." } ] }
```

This is why the loop says _treat any warning as a failure_ and _check the IR
against your intent_: you meant `#panel`, the roles say `this`. Repair and
re-validate:

```
→ validate_and_compile { "code": "on click toggle .active on #panel", "language": "en" }
← { "ok": true, "semantic": { "action": "toggle",
      "roles": { "patient":     { "type": "selector", "value": ".active" },
                 "destination": { "type": "selector", "value": "#panel" } },
      "trigger": { "event": "click" } }, "confidence": 1, "diagnostics": [] }
```

That attribute, `_="on click toggle .active on #panel"`, is the deliverable. A
chain comes back command by command, so each one can be checked the same way:

```
→ validate_and_compile { "code": "on click add .a to me then toggle .b on #panel", "language": "en" }
← { "ok": true, "semantic": { "action": "compound", "roles": {},
      "body": [ { "action": "add",    "roles": { "patient": { "value": ".a" }, "destination": { "value": "me" } } },
                { "action": "toggle", "roles": { "patient": { "value": ".b" }, "destination": { "value": "#panel" } } } ],
      "trigger": { "event": "click" } } }
```

### Beyond single commands

- **Domain DSLs** — non-UI domains (SQL, behavior specs, flow, and more) compile
  through `compile_auto`, which detects the domain; the `domains` toolset adds
  each domain's own tools and the `lse` toolset `lse_validate_and_feedback`, the
  same validate/feedback loop for them. The framework for defining your own is
  [`@lokascript/framework`](./packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md).
- **Test and component generation** (`generate_tests`, `generate_component`) were
  removed in 6.0: most tests they wrote did not check the behavior, and a
  component for a command aimed at another element did not compile.

## Known silent traps

Validation is necessary but **not sufficient** — but the gap has been mostly
closed. The parser degrades rather than failing, so some natural phrasings come
back `ok: true` at confidence 1.0 and still do the wrong thing. A measured
probe of 37 plausible phrasings found 97% parsed but only 49% behaved correctly
([benchmark + full findings](./packages/testing-framework/src/agent-bench/README.md)).

**Wrong phrasings now warn.** A parse that drops tokens carries
`UNCONSUMED_INPUT`; a parse that consumes everything into a provably inert
shape carries one of `INERT_QUANTIFIER_TARGET` (`add .x to all .y`),
`HALF_PARSED_CONDITION` (`if #el has class .x`), `INERT_PROPERTY_WRITE`
(`set the text of #el`), or `THIS_IS_NOT_ME` (`toggle .a on this`,
`this.value`). All
are `warning` severity with a concrete suggestion — **treat any warning as a
failure and repair**, exactly like an error. In the probe, 16 of the 19 wrong
phrasings now warn and 1 is rejected outright.

The residue no diagnostic can catch is code that is _valid but does something
other than what you meant_ — e.g. `add .hidden to #menu` (adds a class named
"hidden"; only hides if CSS defines it) or `on mouseover` when the design
called for `mouseenter`. That is why the loop's step 2 says **check the
returned IR against your intent**, and why `diff_behaviors` exists.

Habits from JavaScript and English that hyperscript does not share (each checked
on the engine and on upstream `_hyperscript`):

- Commands are separated by `then`, or by just starting the next one (on the
  same line or the next). `and` and commas do not separate commands: both
  engines reject them.
- `put` takes `into`, `before`, `after`, `at start of` or `at end of`, never
  `in`.
- There is no `this`. The element the handler is on is `me`; its properties are
  `my value` or `me.value`.
- Stray articles are fine: `the #menu`, `the closest .card`.

## Ground rules for generated code

- Prefer the smallest bundle that covers what you emit
  ([docs/BROWSER_BUNDLES.md](./docs/BROWSER_BUNDLES.md)); with Vite, use
  `@hyperfixi/vite-plugin` and don't think about bundles at all.
- Validate before you present. A snippet you didn't run through
  `validate_and_compile` is a guess. Treat any warning as a failure to repair,
  and read the IR it returns, not just the ok flag (see the traps above).
- When the user's language isn't English, show them `translate_code` output in
  their language alongside the English source — the translation is
  deterministic and fidelity-checked, so the two never drift.
