# Commands

Commands are the verbs of hyperscript. They tell elements what to do.

## Command Syntax

```html
<button _="on click [command] [arguments]">Click</button>
```

Commands can be chained with `then`:

```html
<button _="on click add .loading then wait 1s then remove .loading">Submit</button>
```

## Most Used Commands

### DOM Manipulation

#### `toggle`

Toggle a class, attribute, or visibility.

```html
<button _="on click toggle .active on me">Toggle Active</button>
<button _="on click toggle @disabled on #submit-btn">Toggle Disabled</button>
<button _="on click toggle #menu">Toggle Visibility</button>
```

#### `add` / `remove`

Add or remove classes.

```html
<button _="on click add .highlight to #target">Add Class</button>
<button _="on click remove .highlight from #target">Remove Class</button>
```

#### `show` / `hide`

Control element visibility.

```html
<button _="on click show #modal">Show Modal</button>
<button _="on click hide me">Hide This Button</button>
```

### Content Updates

#### `put`

Insert content into an element.

```html
<button _="on click put 'Hello!' into #output">Say Hello</button>
<button _="on click put '<b>Bold</b>' into #output">Insert HTML</button>
```

#### `set`

Set a property or variable.

```html
<button _="on click set #output.innerHTML to 'Updated'">Update</button>
<button _="on click set :count to :count + 1">Increment</button>
```

### Timing

#### `wait`

Pause execution.

```html
<button _="on click add .flash then wait 500ms then remove .flash">Flash</button>
```

### Data

#### `fetch`

Make HTTP requests.

```html
<button _="on click fetch /api/data then put result into #output">Load Data</button>

<button _="on click fetch /api/data as json then put result.name into #name">Load JSON</button>
```

### Counters

#### `increment` / `decrement`

Modify numeric values.

```html
<button _="on click increment #counter.innerHTML">+1</button>
<button _="on click decrement #counter.innerHTML">-1</button>
```

## Control Flow Commands

#### `if` / `else`

Conditional execution.

```html
<button
  _="on click
  if me has .active
    remove .active from me
  else
    add .active to me
  end"
>
  Toggle with Logic
</button>
```

#### `repeat`

Loop a fixed number of times.

```html
<button _="on click repeat 3 times add 'x' to #output end">Add 3 X's</button>
```

#### `for each`

Iterate over collections.

```html
<button
  _="on click
  for each item in [1, 2, 3]
    append item to #list
  end"
>
  Add Items
</button>
```

## Command Reference by Category

### DOM Commands

| Command  | Description                            |
| -------- | -------------------------------------- |
| `toggle` | Toggle class, attribute, or visibility |
| `add`    | Add class to element                   |
| `remove` | Remove class from element              |
| `show`   | Show element                           |
| `hide`   | Hide element                           |
| `put`    | Insert content into element            |
| `set`    | Set property or variable               |
| `get`    | Get property value                     |
| `take`   | Move class from siblings               |

### Control Flow

| Command    | Description               |
| ---------- | ------------------------- |
| `if`       | Conditional execution     |
| `repeat`   | Loop N times              |
| `for`      | Iterate over collection   |
| `while`    | Loop while condition true |
| `break`    | Exit loop                 |
| `continue` | Skip to next iteration    |

### Async

| Command | Description             |
| ------- | ----------------------- |
| `wait`  | Pause execution         |
| `fetch` | HTTP request            |
| `async` | Run code asynchronously |

### Events

| Command   | Description              |
| --------- | ------------------------ |
| `send`    | Dispatch custom event    |
| `trigger` | Trigger event on element |

### Navigation

| Command       | Description               |
| ------------- | ------------------------- |
| `go`          | Navigate, scroll, history |
| `push url`    | Add URL to history        |
| `replace url` | Replace URL in history    |

### Data

| Command   | Description            |
| --------- | ---------------------- |
| `default` | Set value if undefined |

### Utility

| Command  | Description               |
| -------- | ------------------------- |
| `log`    | Log to console            |
| `beep!`  | Debug with type info      |
| `copy`   | Copy to clipboard         |
| `tell`   | Execute in target context |
| `pick`   | Random selection          |
| `call`   | Call a function           |
| `return` | Return from handler       |
| `throw`  | Throw an error            |

## Next Steps

- [Expressions](/en/guide/expressions) - Selectors, properties, and values
- [Events](/en/guide/events) - Event handling and modifiers
- [DOM Commands Reference](/en/api/commands/dom) - Complete DOM command details
