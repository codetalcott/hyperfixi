---
name: hyperscript-developer
description: 'Writes hyperscript code for interactive web UIs. Use when user asks for toggles, modals, form validation, loading states, or other DOM interactions.'
---

# HyperFixi Hyperscript Developer

Write hyperscript code for interactive web interfaces -- a declarative, English-like language for adding interactivity to HTML elements.

## When to Use

**Use hyperscript for:**

- Toggles, show/hide, accordions, modals, tabs
- Form validation, submission, loading states
- Debounced search, infinite scroll, animations
- Any DOM manipulation triggered by user events

**Do NOT use hyperscript for:**

- Complex state management (use React/Vue/Svelte)
- Heavy computation or data processing
- Server-side logic
- More than ~10 commands in one handler

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

Hyperscript goes in `_="..."` attributes:

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
2. Add `log` command: `on click log me then toggle .active`
3. Check browser console for errors
4. Verify selectors exist in DOM

## MCP Tools

| Tool                   | When to Use                                   |
| ---------------------- | --------------------------------------------- |
| `suggest_command`      | Find the right command for a task             |
| `get_examples`         | Get working code examples by task description |
| `search_patterns`      | Search pattern database by keyword/category   |
| `validate_hyperscript` | **Always use before returning code**          |
| `get_diagnostics`      | Detailed errors with line/column positions    |
| `explain_code`         | Explain existing hyperscript to user          |

## References

- [Commands Reference](./references/commands.md) -- All hyperscript commands
- [Events Reference](./references/events.md) -- Event handling and modifiers
- [Expressions Guide](./references/expressions.md) -- Variables, selectors, comparisons
- [Common Patterns](./references/patterns.md) -- Copy-paste examples
