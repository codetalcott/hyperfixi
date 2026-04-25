---
name: hyperfixi-developer
description: 'Writes HyperFixi code for interactive web UIs using the LokaScript semantic engine. Use when user asks for toggles, modals, form validation, loading states, or other DOM interactions via HyperFixi.'
---

# HyperFixi Developer

Write HyperFixi code for interactive web interfaces -- a declarative, English-like language for adding interactivity to HTML elements, powered by the LokaScript semantic engine.

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

Use `suggest_command` with a task description:

```
suggest_command({ task: "show a modal when button is clicked" })
```

Or use `get_examples` for working code:

```
get_examples({ prompt: "toggle a class on click" })
```

Otherwise, consult the [Commands Reference](./references/commands.md).

### 3. Write the Code

HyperFixi code goes in `_="..."` attributes:

```html
<button _="on click toggle .active on #menu">Menu</button>
<input _="on input put my value into #preview" />
<form _="on submit.prevent fetch /api/save put 'Saved!' into #status"></form>
```

**Key syntax:**

- `on <event>` -- Event handler
- `me` -- Current element
- `it` / `result` -- Last result
- `:var` -- Local variable
- `#id` / `.class` -- Selectors

### 4. Validate Before Returning

**ALWAYS validate your code** before returning it to the user:

```
validate_hyperscript({ code: "on click toggle .active" })
```

If validation fails, use `get_diagnostics` for detailed error locations.

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

## Event Modifiers

```html
<form _="on submit.prevent ...">
  <!-- Prevent default -->
  <button _="on click.once ...">
    <!-- Run once -->
    <input _="on input.debounce(300ms) ..." />
    <!-- Debounce -->
    <input _="on keydown.enter submit closest form" />
    <input _="on keydown.ctrl.s.prevent call save()" />
  </button>
</form>
```

## Common Mistakes

1. **Using `click` on forms** -- use `submit` event instead
2. **Forgetting `.prevent`** -- form submissions navigate away by default
3. **Complex logic in attributes** -- if code exceeds 5 lines, consider JavaScript
4. **Not validating code** -- always use `validate_hyperscript` before returning
5. **Missing selectors** -- verify `#id` and `.class` exist in DOM

## Debugging

If code doesn't work:

1. Use `validate_hyperscript` to check syntax
2. Use `debug_explain_handler` to get a step-by-step breakdown
3. Add `log` command: `on click log me then toggle .active`
4. Check browser console for errors
5. Verify selectors exist in DOM

For deeper debugging with the debug overlay:

- `debug_analyze_snapshot` -- understand current execution state at a breakpoint
- `debug_suggest_fix` -- get fix suggestions from a failure snapshot
- `debug_trace_variable` -- trace how a variable changed over an execution history

## MCP Tools

### Writing & Validating Code

| Tool                   | When to Use                                   |
| ---------------------- | --------------------------------------------- |
| `suggest_command`      | Find the right command for a task             |
| `get_examples`         | Get working code examples by task description |
| `search_patterns`      | Search pattern database by keyword/category   |
| `validate_hyperscript` | **Always use before returning code**          |
| `get_diagnostics`      | Detailed errors with line/column positions    |
| `get_code_fixes`       | Auto-fix suggestions for specific error codes |

### Understanding Code

| Tool                 | When to Use                                      |
| -------------------- | ------------------------------------------------ |
| `explain_code`       | Explain existing code to user                    |
| `recognize_intent`   | Identify what a snippet is trying to do          |
| `analyze_complexity` | Assess complexity of a handler                   |
| `analyze_metrics`    | Get quantitative metrics (commands, depth, etc.) |

### Language Documentation

| Tool                       | When to Use                                  |
| -------------------------- | -------------------------------------------- |
| `get_command_docs`         | Get documentation for a specific command     |
| `get_expression_docs`      | Get documentation for expression types       |
| `search_language_elements` | Search commands/expressions by keyword       |
| `suggest_best_practices`   | Get best practices for a pattern or use case |

### LSP Tools

| Tool                   | When to Use                                       |
| ---------------------- | ------------------------------------------------- |
| `get_diagnostics`      | Detailed errors with line/column positions        |
| `get_completions`      | Get autocomplete suggestions at a cursor position |
| `get_hover_info`       | Get hover documentation for a token               |
| `get_document_symbols` | List all symbols/handlers in a document           |

### Debug Tools

| Tool                     | When to Use                                      |
| ------------------------ | ------------------------------------------------ |
| `debug_analyze_snapshot` | Understand execution state at a debug breakpoint |
| `debug_explain_handler`  | Step-by-step breakdown of an event handler       |
| `debug_suggest_fix`      | Get fix suggestions from a failure snapshot      |
| `debug_trace_variable`   | Trace variable changes over an execution history |

### Project Inventory

| Tool              | When to Use                                                |
| ----------------- | ---------------------------------------------------------- |
| `scan_inventory`  | Scan project templates for all hyperscript/htmx/fixi usage |
| `query_inventory` | Filter/search within scanned inventory results             |

## References

- [Commands Reference](./references/commands.md) -- All HyperFixi commands
- [Events Reference](./references/events.md) -- Event handling and modifiers
- [Expressions Guide](./references/expressions.md) -- Variables, selectors, comparisons
- [Common Patterns](./references/patterns.md) -- Copy-paste examples
