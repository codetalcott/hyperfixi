# Expressions

Expressions are values, references, and operations in hyperscript.

## Selectors

### CSS Selectors

Standard CSS selectors work as expected:

```html
<!-- By ID -->
<button _="on click toggle .active on #sidebar">Toggle Sidebar</button>

<!-- By class -->
<button _="on click hide .notification">Hide All Notifications</button>

<!-- Complex selectors -->
<button _="on click add .highlight to .card:first-child">Highlight First Card</button>
```

### HTML Literals

Use angle brackets for inline element selection:

```html
<button _="on click toggle .active on the closest <div/>">Toggle Parent Div</button>

<button _="on click put 'Hi' into the next <span/>">Update Next Span</button>
```

## Context References

### `me`

The current element (where the `_` attribute is).

```html
<button _="on click toggle .active on me">Toggle Self</button>
<button _="on click hide me">Hide Myself</button>
```

### `it` / `result`

The result of the previous operation.

```html
<button _="on click fetch /api/data then put it into #output">Fetch Data</button>
```

### `you`

The target of an event (for delegated handlers).

```html
<div _="on click from .item toggle .selected on you">
  <div class="item">Click me</div>
  <div class="item">Click me too</div>
</div>
```

### `event`

The current DOM event.

```html
<form _="on submit halt then put event.target into #debug">Submit Form</form>
```

## Local Variables

Use `:` prefix for local variables:

```html
<button
  _="on click
  set :count to 0 then
  repeat 5 times
    increment :count
  end then
  put :count into #result"
>
  Count to 5
</button>
```

## Positional Expressions

### `first` / `last`

```html
<button _="on click add .active to the first <li/> in #list">Activate First</button>

<button _="on click remove .active from the last .item">Deactivate Last</button>
```

### `next` / `previous`

```html
<button _="on click show the next <div/>">Show Next</button>
<button _="on click hide the previous <p/>">Hide Previous</button>
```

### `closest`

Find nearest ancestor matching selector:

```html
<button _="on click add .selected to the closest <tr/>">Select Row</button>
```

### `parent`

```html
<button _="on click toggle .expanded on my parent">Toggle Parent</button>
```

## Property Access

### Dot Notation

```html
<button _="on click put #name.value into #preview">Preview Name</button>

<button _="on click set #counter.innerHTML to '0'">Reset Counter</button>
```

### Possessive (`'s`)

```html
<button _="on click put #input's value into #output">Copy Value</button>

<button _="on click set me's style.color to 'red'">Turn Red</button>
```

### `my` (Shorthand for `me's`)

```html
<button _="on click set my innerHTML to 'Clicked!'">Update Self</button>
```

## Type Conversion

### `as` Keyword

```html
<button _="on click put #input.value as Int into :num">Parse as Integer</button>

<button _="on click fetch /api/data as json">Fetch as JSON</button>
```

Common conversions:

- `as Int` - Parse as integer
- `as Float` - Parse as float
- `as String` - Convert to string
- `as json` - Parse JSON response
- `as text` - Get text response
- `as Values` - Form data as object

## Operators

### Arithmetic

```
+ - * / mod
```

### Comparison

```
= != < > <= >= is is not
```

### Logical

```
and or not
```

### String

```
+ (concatenation)
contains
starts with
ends with
matches
```

### Examples

```html
<button
  _="on click
  if #count.innerHTML as Int > 10
    add .warning to #count
  end"
>
  Check Count
</button>

<button
  _="on click
  if #email.value contains '@'
    remove .invalid from #email
  else
    add .invalid to #email
  end"
>
  Validate Email
</button>
```

## Arrays and Objects

### Array Literals

```html
<button _="on click
  for each color in ['red', 'green', 'blue']
    append `<span class="${color}">●</span>` to #colors
  end">
  Add Colors
</button>
```

### Array Indexing

```html
<button _="on click put ['a', 'b', 'c'][1] into #output">Get Second Item (b)</button>
```

## Next Steps

- [Commands](/en/guide/commands) - Actions you can perform
- [Events](/en/guide/events) - Event handling and modifiers
- [Selectors Reference](/en/api/expressions/selectors) - Complete selector syntax
