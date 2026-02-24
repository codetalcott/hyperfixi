<!-- AUTO-GENERATED from packages/mcp-server/src/resources/content.ts -->
<!-- Do not edit directly. Run: npm run generate:skills -->

# Hyperscript Events Reference

## Event Syntax

```text
on <event>[.<modifier>...] [from <source>] <commands>
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

## Event Modifiers

| Modifier         | Description       |
| ---------------- | ----------------- |
| `.once`          | Handle only once  |
| `.prevent`       | Prevent default   |
| `.stop`          | Stop propagation  |
| `.debounce(Nms)` | Debounce handler  |
| `.throttle(Nms)` | Throttle handler  |
| `.ctrl`          | Require Ctrl key  |
| `.shift`         | Require Shift key |
| `.alt`           | Require Alt key   |
| `.meta`          | Require Meta key  |

## Key Modifiers

```html
<input _="on keydown.enter submit closest form" />
<div _="on keydown.escape hide me">
  <input _="on keydown.ctrl.s.prevent call save()" />
</div>
```

## Delegated Events

```html
<ul _="on click from li toggle .selected on you">
  <form _="on input from input validate(you)"></form>
</ul>
```

## Custom Events

```html
<button _="on click send refresh to #list">
  <div _="on refresh fetch /api/items put it into me"></div>
</button>
```
