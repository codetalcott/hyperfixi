# API Reference

This section provides detailed documentation for the HyperFixi API.

## Core API

The main entry point for HyperFixi is the `hyperscript` object:

```js
import { hyperscript } from '@hyperfixi/core'

// Process all hyperscript attributes in the DOM
hyperscript.processNode(document.body)

// Compile a hyperscript string to an executable
const executable = hyperscript.compile('on click toggle .active')

// Execute hyperscript code directly
await hyperscript.execute('toggle .active on #myElement')
```

## API Sections

### Core Functions

- [hyperscript Object](/en/api/hyperscript) - Main runtime object
- [compile()](/en/api/compile) - Compile hyperscript to executable
- [execute()](/en/api/execute) - Execute hyperscript code

### Commands

HyperFixi includes 43 commands organized by category:

- [DOM Commands](/en/api/commands/dom) - `toggle`, `add`, `remove`, `put`, `set`
- [Control Flow](/en/api/commands/control-flow) - `if`, `repeat`, `for`, `while`
- [Animation](/en/api/commands/animation) - `transition`, `settle`, `wait`
- [Async Commands](/en/api/commands/async) - `fetch`, `async`, `send`

### Expressions

- [Selectors](/en/api/expressions/selectors) - CSS selectors, `me`, `you`, `it`
- [Positional](/en/api/expressions/positional) - `first`, `last`, `next`, `previous`
- [Properties](/en/api/expressions/properties) - Possessive syntax, property access
- [Type Conversion](/en/api/expressions/conversion) - `as String`, `as Number`, `as Array`

## Quick Example

```html
<button _="on click
  add .loading to me
  fetch /api/data as json
  put result.message into #output
  remove .loading from me">
  Load Data
</button>
```
