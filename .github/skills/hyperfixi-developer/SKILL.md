---
name: hyperfixi-developer
description: "Writes HyperFixi code (upstream _hyperscript's grammar, run by @hyperfixi/engine) for interactive web UIs. Use when user asks for toggles, modals, form validation, loading states, or other DOM interactions via HyperFixi."
---

# HyperFixi Developer

Write HyperFixi code for interactive web interfaces -- a declarative, English-like language for adding interactivity to HTML elements. Since 4.0 the engine (`@hyperfixi/engine`) runs upstream \_hyperscript's grammar and is gated by upstream's own test suite: write upstream's spelling, and the code runs on hyperscript.org too (hyperfixi adds only `new X()` and `toggle <element>`).

## When to Use

**Use HyperFixi for:**

- Toggles, show/hide, accordions, modals, tabs
- Form validation, submission, loading states
- Debounced search, infinite scroll, animations
- Any DOM manipulation triggered by user events

**Do NOT use HyperFixi for:**

- Complex state management (use React/Vue/Svelte)
- Heavy computation or data processing
- Server-side logic
- More than ~10 commands in one handler

**Note:** For users of the original `_hyperscript` runtime (hyperscript.org) who want multilingual support, see the `hyperscript` skill instead.

## Workflow

### 1. Understand the Task

Identify: what DOM elements are involved, what events trigger the behavior, what should happen.

### 2. Find the Right Command

Use `search_patterns` for working code, and `get_command_docs` for a command's roles:

```
search_patterns({ query: "dropdown" })
get_command_docs({ command: "toggle" })
```

Otherwise, consult the [Commands Reference](./references/commands.md).

### 3. Write the Code

HyperFixi code goes in `_="..."` attributes:

```html
<button _="on click toggle .active on #menu">Menu</button>
<input _="on input put my value into #preview" />
<form _="on submit halt the event then fetch /api/save then put 'Saved!' into #status"></form>
```

**Key syntax:**

- `on <event>` -- Event handler
- `me` -- Current element
- `it` / `result` -- Last result
- `target` -- The element the event happened on
- `x` -- Local variable; `:x` -- element-scoped; `$x` -- global
- `#id` / `.class` -- Selectors

### 4. Validate Before Returning

**ALWAYS validate your code** before returning it to the user:

```
validate_and_compile({ code: "on click toggle .active", language: "en" })
```

If it fails, apply the diagnostics and validate again (`get_code_fixes` maps an error code to a fix);
`get_diagnostics` gives line and column positions.

## Quick Reference

| Need             | Command                                |
| ---------------- | -------------------------------------- |
| Show/hide        | `show #el`, `hide me`, `toggle .class` |
| Add/remove class | `add .highlight`, `remove .error`      |
| Set content      | `put "text" into #el`                  |
| Set variable     | `set :count to 0`                      |
| HTTP request     | `fetch /api as json`                   |
| Delay            | `wait 500ms`                           |
| Loop             | `repeat 5 times ... end`               |
| Conditional      | `if :x > 0 ... else ... end`           |

## Event Options

Upstream's forms. (3.x's dotted modifiers — `.prevent`, `.once`, `.debounce(300ms)` — were
core-only; `on click.prevent` now listens for an event named `click.prevent`.)

```html
<form _="on submit halt the event then fetch /api/save"></form>
<!-- preventDefault + stopPropagation -->
<button _="on click 1 add .seen to me">Run on the first click only</button>
<input _="on input debounced at 300ms put my value into #preview" />
<input _="on keydown[key is 'Enter'] send submit to the closest <form/>" />
<input _="on keydown[ctrlKey and key is 's'] halt the event then call save()" />
```

## Common Mistakes

1. **Using `click` on forms** -- use `submit` event instead
2. **Forgetting `halt the event`** -- form submissions navigate away by default
3. **Complex logic in attributes** -- if code exceeds 5 lines, consider JavaScript
4. **Not validating code** -- always use `validate_and_compile` before returning
5. **Missing selectors** -- verify `#id` and `.class` exist in DOM

## Debugging

If code doesn't work:

1. Use `validate_and_compile` to check it (for English, the engine that runs it decides)
2. Add `log` (`on click log me then toggle .active`) or `beep! x` (logs a value with its type), or `breakpoint`
3. Check browser console for errors
4. Verify selectors exist in DOM

With the `analysis` toolset, `explain_code` lists each step in the order it runs; with `debug`,
`debug_explain_handler` adds where to put a `breakpoint`.

## MCP Tools

### Core (listed by default)

| Tool                   | When to Use                                          |
| ---------------------- | ---------------------------------------------------- |
| `validate_and_compile` | **Always use before returning code**                 |
| `get_diagnostics`      | Errors with line/column positions, typo fixes        |
| `get_code_fixes`       | Fixes for the code of each diagnostic                |
| `get_command_docs`     | Documentation for a specific command and its roles   |
| `get_expression_docs`  | Documentation for expression types                   |
| `search_patterns`      | Search the pattern database by keyword/category      |
| `diff_behaviors`       | Check an edit left the behavior as it was            |
| `score_fidelity`       | Score a candidate against a reference, name the gaps |

### In toolsets

Listed when the server's `LOKASCRIPT_MCP_TOOLSETS` names the toolset (comma-separated, or
`all`); a tool also answers a call by name without it.

| Toolset    | Tools                                                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `analysis` | `explain_code`, `suggest_command`, `get_examples`, `search_language_elements`, `suggest_best_practices`, `recognize_intent`, `analyze_complexity`, `analyze_metrics` |
| `editor`   | `get_completions`, `get_hover_info`, `get_document_symbols`                                                                                                          |
| `debug`    | `debug_explain_handler`; and over a snapshot you assemble at a `breakpoint`: `debug_analyze_snapshot`, `debug_suggest_fix`, `debug_trace_variable`                   |
| `project`  | `scan_inventory`, `query_inventory` (hyperscript/htmx/fixi usage across a project's templates)                                                                       |

## References

- [Commands Reference](./references/commands.md) -- All HyperFixi commands
- [Events Reference](./references/events.md) -- Event handling and modifiers
- [Expressions Guide](./references/expressions.md) -- Variables, selectors, comparisons
- [Common Patterns](./references/patterns.md) -- Copy-paste examples
