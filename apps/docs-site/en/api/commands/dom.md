# DOM Commands

Commands for manipulating the DOM: classes, visibility, content.

## Class Manipulation

### `toggle`

Toggle classes, attributes, or visibility.

```html
<!-- Toggle class on self -->
<button _="on click toggle .active on me">Toggle Active</button>

<!-- Toggle class on another element -->
<button _="on click toggle .hidden on #content">Toggle Content</button>

<!-- Toggle attribute -->
<button _="on click toggle @disabled on #submit">Toggle Disabled</button>

<!-- Toggle visibility (shorthand) -->
<button _="on click toggle #modal">Toggle Modal</button>

<!-- Toggle between two classes -->
<button _="on click toggle between .on and .off on me">Toggle State</button>
```

### `add`

Add one or more classes to elements.

```html
<!-- Add to self -->
<button _="on click add .active to me">Activate</button>

<!-- Add to another element -->
<button _="on click add .highlight to #target">Highlight</button>

<!-- Add multiple classes -->
<button _="on click add .active .visible to me">Add Multiple</button>

<!-- Add to multiple elements -->
<button _="on click add .selected to .item">Select All</button>
```

### `remove`

Remove classes from elements.

```html
<!-- Remove from self -->
<button _="on click remove .active from me">Deactivate</button>

<!-- Remove from another element -->
<button _="on click remove .highlight from #target">Remove Highlight</button>

<!-- Remove from multiple elements -->
<button _="on click remove .selected from .item">Deselect All</button>
```

### `take`

Move a class from siblings to the current element. Useful for exclusive selection.

```html
<!-- Take .active from siblings (tabs, menus) -->
<nav>
  <button _="on click take .active from .tab for me">Tab 1</button>
  <button _="on click take .active from .tab for me">Tab 2</button>
  <button _="on click take .active from .tab for me">Tab 3</button>
</nav>
```

## Visibility

### `show`

Show an element by restoring its display property.

```html
<button _="on click show #modal">Open Modal</button>
<button _="on click show .notification">Show Notifications</button>
```

### `hide`

Hide an element by setting `display: none`.

```html
<button _="on click hide me">Hide This Button</button>
<button _="on click hide #modal">Close Modal</button>
<button _="on click hide .notification">Dismiss All</button>
```

## Content

### `put`

Insert content into elements. The most versatile content command.

```html
<!-- Replace innerHTML -->
<button _="on click put 'Hello!' into #output">Say Hello</button>

<!-- Insert HTML -->
<button _="on click put '<b>Bold</b>' into #output">Insert HTML</button>

<!-- Before/After -->
<button _="on click put '<li>New</li>' before #last-item">Insert Before</button>
<button _="on click put '<li>New</li>' after #first-item">Insert After</button>

<!-- At beginning/end -->
<button _="on click put '<li>First</li>' at start of #list">Prepend</button>
<button _="on click put '<li>Last</li>' at end of #list">Append</button>
```

### `append`

Add content to the end of an element, string, array, or Set.

```html
<button _="on click append ' more' to #text">Add More</button>
<button _="on click append '<li>Item</li>' to #list">Add Item</button>
```

Existing children are left untouched — appending to a list does not disturb
input values, focus, or event listeners on the items already there.

The target can also be a variable, an attribute, or a property, and with no
target at all the content accumulates onto the implicit result (`it`):

```html
<button _="on click append ' (edited)' to #title's textContent">Mark Edited</button>
<button _="on click append 'x' to @data-log">Log</button>
<button _="on click set items to [] then append 'first' to items">Collect</button>
```

Appending to an array pushes; to a Set, adds; to an element, inserts at the end.
An element value is **moved**, not copied.

### `prepend`

Add content to the _start_ of an element, string, array, or Set — `append`'s
mirror, with the same target forms and the same preservation guarantees.

```html
<button _="on click prepend '<li>Newest</li>' to #list">Add to Top</button>
```

> **LokaScript extension.** Original \_hyperscript has no `prepend` command; its
> equivalent is `put <content> at the start of <target>`, which also works here.

### `set`

Set properties, attributes, or variables.

```html
<!-- Set innerHTML -->
<button _="on click set #output.innerHTML to 'Updated'">Update</button>

<!-- Set attribute -->
<button _="on click set @disabled of #submit to true">Disable</button>

<!-- Set style -->
<button _="on click set me.style.color to 'red'">Turn Red</button>

<!-- Set variable -->
<button _="on click set :count to :count + 1">Increment</button>
```

### `get`

Get a value and store it in `it`.

```html
<button _="on click get #input.value then put it into #output">Copy Value</button>
```

## Element Creation

### `make`

Create new DOM elements or class instances.

```html
<button _="on click make a <div.card/> then put it at end of #container">Add Card</button>

<button
  _="on click make a <li/> called newItem then put 'New' into newItem then put newItem at end of #list"
>
  Add List Item
</button>
```

## Command Chaining

Commands can be chained with `then`:

```html
<button
  _="on click
  add .loading to me then
  put 'Loading...' into me then
  wait 1s then
  remove .loading from me then
  put 'Done!' into me"
>
  Load
</button>
```

## Summary Table

| Command   | Description                       | Example                   |
| --------- | --------------------------------- | ------------------------- |
| `toggle`  | Toggle class/attribute/visibility | `toggle .active on me`    |
| `add`     | Add class                         | `add .active to me`       |
| `remove`  | Remove class                      | `remove .active from me`  |
| `take`    | Take class from siblings          | `take .active from .tab`  |
| `show`    | Show element                      | `show #modal`             |
| `hide`    | Hide element                      | `hide me`                 |
| `put`     | Insert content                    | `put 'Hi' into #out`      |
| `append`  | Add to end                        | `append 'x' to #out`      |
| `prepend` | Add to start (extension)          | `prepend 'x' to #out`     |
| `set`     | Set property                      | `set me.innerHTML to 'x'` |
| `get`     | Get value                         | `get #input.value`        |
| `make`    | Create element                    | `make a <div/>`           |

## Next Steps

- [Control Flow](/en/api/commands/control-flow) - if, repeat, for
- [Animation](/en/api/commands/animation) - transition, settle, wait
- [Async](/en/api/commands/async) - fetch, wait
