# Positional Expressions

Navigate the DOM relative to elements.

::: info Bundle Requirement
Positional expressions are in `hyperfixi-hs.js`. With the Vite plugin, set `positional: true` if the scanner cannot see them in your markup.
:::

## Sibling Navigation

### `next`

Get the next sibling matching a selector.

```html
<!-- Next sibling of any type -->
<button _="on click put 'Updated' into the next <div/>">Update Next Div</button>

<!-- Next sibling matching class -->
<button _="on click toggle .active on the next .item">Toggle Next Item</button>

<!-- Relative to me -->
<button _="on click show my next <p/>">Show My Next Paragraph</button>
```

### `previous`

Get the previous sibling matching a selector.

```html
<button _="on click hide the previous <div/>">Hide Previous Div</button>

<button _="on click add .highlight to the previous .item">Highlight Previous Item</button>
```

## Ancestor Navigation

### `closest`

Find the nearest ancestor matching a selector.

```html
<!-- Find closest parent matching selector -->
<button _="on click add .selected to the closest <tr/>">Select Row</button>

<button _="on click toggle .expanded on the closest .accordion-item">Toggle Accordion</button>

<span _="on click remove the closest .notification"> ✕ </span>
```

### `parent`

Get the immediate parent element.

```html
<button _="on click toggle .active on my parent">Toggle Parent</button>

<button _="on click hide my parent">Hide Parent</button>
```

## Collection Access

### `first`

Get the first element matching a selector.

```html
<button _="on click add .active to the first <li/> in #list">Activate First</button>

<button _="on click focus the first <input/> in #form">Focus First Input</button>

<button _="on click show the first .error">Show First Error</button>
```

### `last`

Get the last element matching a selector.

```html
<button _="on click remove the last <li/> from #list">Remove Last Item</button>

<button _="on click add .new to the last .item">Mark Last as New</button>
```

## Array/Index Access

### Index syntax

Access array elements by index.

```html
<!-- First element (0-indexed) -->
<button _="on click put :items[0] into #first">Get First</button>

<!-- Last element -->
<button _="on click put :items[:items.length - 1] into #last">Get Last</button>

<!-- Specific index -->
<button _="on click put :colors[2] into #third">Get Third Color</button>
```

### Range syntax

Get a slice of an array.

```html
<!-- First 3 items -->
<button _="on click set :subset to :items[0..3]">Get First 3</button>

<!-- Items 2-5 -->
<button _="on click set :middle to :items[2..5]">Get Middle</button>
```

## Common Patterns

### Tab Selection

```html
<div class="tabs">
  <button
    _="on click
    take .active from .tab for me then
    show the next <div.panel/>"
  >
    Tab 1
  </button>
  <div class="panel">Content 1</div>

  <button
    _="on click
    take .active from .tab for me then
    show the next <div.panel/>"
  >
    Tab 2
  </button>
  <div class="panel">Content 2</div>
</div>
```

### Form Field Navigation

```html
<input
  _="on keydown[key=='Enter']
  focus the next <input/> or the closest <button[type='submit']/>"
/>
```

### Accordion

```html
<div class="accordion">
  <button
    _="on click
    toggle .open on the closest .accordion-item then
    toggle the next <div.content/>"
  >
    Section Title
  </button>
  <div class="content">Section content...</div>
</div>
```

### Carousel

```html
<div class="carousel">
  <button
    _="on click
    set :current to <.slide.active/> then
    remove .active from :current then
    add .active to the next .slide or the first .slide"
  >
    Next
  </button>

  <button
    _="on click
    set :current to <.slide.active/> then
    remove .active from :current then
    add .active to the previous .slide or the last .slide"
  >
    Previous
  </button>
</div>
```

## Summary Table

| Expression | Description         | Example              |
| ---------- | ------------------- | -------------------- |
| `next`     | Next sibling        | `the next <div/>`    |
| `previous` | Previous sibling    | `the previous .item` |
| `closest`  | Nearest ancestor    | `the closest <tr/>`  |
| `parent`   | Immediate parent    | `my parent`          |
| `first`    | First in collection | `the first <li/>`    |
| `last`     | Last in collection  | `the last .item`     |
| `[n]`      | Index access        | `:items[0]`          |
| `[a..b]`   | Range access        | `:items[0..3]`       |

## Combining Positional

```html
<button
  _="on click
  set :row to the closest <tr/> then
  add .highlight to the first <td/> in :row then
  put 'Selected' into the last <td/> in :row"
>
  Select Row
</button>
```

## Next Steps

- [Selectors](/en/api/expressions/selectors) - CSS and element selection
- [Properties](/en/api/expressions/properties) - Property access
- [DOM Commands](/en/api/commands/dom) - Element manipulation
