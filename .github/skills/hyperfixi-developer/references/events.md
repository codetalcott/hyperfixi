<!-- AUTO-GENERATED from packages/mcp-server/src/resources/content.ts -->
<!-- Do not edit directly. Run: npm run generate:skills -->

# Hyperscript Events Reference

## Event Syntax

```text
on <event>[<filter>] [<count>] [from <source>] [debounced at <time> | throttled at <time>] <commands>
```

## Common Events

| Event        | Description            |
| ------------ | ---------------------- |
| `click`      | Mouse click            |
| `dblclick`   | Double click           |
| `submit`     | Form submission        |
| `input`      | Input value change     |
| `change`     | Input change (on blur) |
| `focus`      | Element focused        |
| `blur`       | Element blurred        |
| `keydown`    | Key pressed            |
| `keyup`      | Key released           |
| `mouseenter` | Mouse enters           |
| `mouseleave` | Mouse leaves           |
| `scroll`     | Element scrolled       |
| `load`       | Element loaded         |

## Event Options

Upstream _hyperscript's forms (3.x's dotted `.once` / `.prevent` / `.debounce(N)` modifiers were
core-only: `on click.prevent` is an event literally named `click.prevent`).

| Option                         | Meaning                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `on click[shiftKey]`           | Filter: run only when the expression holds (event properties are in scope)       |
| `on click 1`                   | Count: only the first click (`on click 2 to 4`, `on click 3 and on`)             |
| `on input debounced at 300ms`  | Debounce                                                                         |
| `on scroll throttled at 100ms` | Throttle                                                                         |
| `on click from #other`         | Listen on another element                                                        |
| `halt the event`               | (a command) preventDefault + stopPropagation; `halt the event's default` for one |

## Key Filters

```html
<input _="on keydown[key is 'Enter'] send submit to the closest <form/>" />
<div _="on keydown[key is 'Escape'] from window hide me">
  <input _="on keydown[ctrlKey and key is 's'] halt the event then call save()" />
</div>
```

## Delegated Events

`target` is the element the event happened on.

```html
<ul _="on click toggle .selected on the closest <li/> to target">
  <form _="on input call validate(target)"></form>
</ul>
```

## Custom Events

```html
<button _="on click send refresh to #list">
  <div _="on refresh fetch /api/items as html then put it into me"></div>
</button>
```
