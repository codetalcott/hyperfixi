---
name: hyperscript-developer
version: 1.0.0
description: Write hyperscript code for interactive web UIs. Supports 13 languages with native word order (SVO, SOV, VSO).
---

# HyperFixi Hyperscript Developer

You are an expert at writing hyperscript code for interactive web interfaces. Hyperscript is a declarative, English-like language for adding interactivity to HTML elements.

## Quick Start

Hyperscript code goes in `_="..."` attributes:

```html
<button _="on click toggle .active">Toggle</button>
<input _="on input put my value into #preview">
<div _="on click add .highlight to me wait 1s remove .highlight from me">Flash</div>
```

## Core Syntax Pattern

```
on <event> [from <source>] <command> [<args>] [then <command>...]
```

Examples:
- `on click toggle .active` - Toggle class on click
- `on click from body add .open to #menu` - Delegated event
- `on submit prevent default then fetch /api then put result into #output` - Chain commands

## Available Commands

See [references/commands.md](references/commands.md) for the complete command reference.

### Most Common Commands

| Command | Usage | Example |
|---------|-------|---------|
| `toggle` | Toggle class/attribute | `toggle .active on #menu` |
| `add` | Add class/attribute | `add .highlight to me` |
| `remove` | Remove class/attribute | `remove .error from #form` |
| `show` | Show element | `show #modal with *opacity` |
| `hide` | Hide element | `hide me with *opacity` |
| `set` | Set variable/property | `set :count to :count + 1` |
| `put` | Set element content | `put "Hello" into #greeting` |
| `fetch` | HTTP request | `fetch /api/data as json` |
| `wait` | Pause execution | `wait 500ms` |
| `send` | Dispatch event | `send refresh to #list` |

## Event Modifiers

```html
<button _="on click.once show #popup">Show Once</button>
<input _="on input.debounce(300ms) call validate()">
<a _="on click.prevent go to /page">Navigate</a>
<div _="on keydown.ctrl.s.prevent call save()">Editor</div>
```

Available: `.once`, `.prevent`, `.stop`, `.debounce(Nms)`, `.throttle(Nms)`, `.ctrl`, `.shift`, `.alt`, `.meta`

## Control Flow

```html
<!-- Conditional -->
<button _="on click if me matches .active remove .active else add .active">

<!-- Repeat -->
<button _="on click repeat 3 times add <div/> to #container">

<!-- For each -->
<ul _="on load for item in items append <li>{item}</li> to me">

<!-- While -->
<div _="on click while :loading wait 100ms">
```

## References

- `me` - Current element
- `you` - Event target (in event handlers)
- `it` - Last expression result
- `:variable` - Local variable
- `$global` - Global variable
- `#id` / `.class` / `<tag/>` - CSS selectors

## Multilingual Support

Hyperscript supports 13 languages with native word order. See [references/multilingual.md](references/multilingual.md).

**Examples by language:**

| Language | "Toggle .active on click" |
|----------|---------------------------|
| English (SVO) | `on click toggle .active` |
| Japanese (SOV) | `クリック で .active を トグル` |
| Korean (SOV) | `클릭 시 .active 를 토글` |
| Arabic (VSO) | `بدّل .active عند نقر` |
| Spanish (SVO) | `en clic alternar .active` |

## Best Practices

1. **Keep it simple** - One behavior per attribute when possible
2. **Use semantic events** - `submit` not `click` on forms
3. **Avoid complex logic** - Move to JavaScript if > 5 lines
4. **Use CSS transitions** - `with *opacity` for smooth animations
5. **Prefer `me`** - Over explicit selectors when targeting self

## Common Patterns

### Toggle Menu
```html
<button _="on click toggle .open on #nav">Menu</button>
```

### Form Validation
```html
<input _="on blur if my value is empty add .error else remove .error">
```

### Loading State
```html
<button _="on click add .loading to me fetch /api remove .loading from me">
```

### Modal Dialog
```html
<button _="on click show #modal with *opacity">Open</button>
<div id="modal" _="on click if target is me hide me with *opacity">
  <div class="content">...</div>
</div>
```

### Infinite Scroll
```html
<div _="on intersection(intersecting) from .sentinel if intersecting fetch /more append it to me">
```

## Debugging

If code doesn't work:
1. Check browser console for errors
2. Verify selectors exist in DOM
3. Use `log` command: `on click log me then toggle .active`
4. Check event name matches (click vs. submit)

## When NOT to Use Hyperscript

- Complex state management (use React/Vue)
- Heavy computation (use JavaScript)
- Server-side logic (use backend)
- More than ~10 commands in one handler
