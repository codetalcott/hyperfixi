# @lokascript/core

An experimental hyperscript engine that provides fast parsing, command execution, and comprehensive error handling for web applications. Built with TypeScript-first design.

## Features

- 🎯 **\_hyperscript Compatible** - Tested via gallery examples, bundle compatibility matrix, and command/expression browser tests
- 🚀 **High Performance** - Optimized tokenizer and parser for large expressions
- 🔧 **TypeScript First** - Complete type safety with comprehensive type definitions
- 🧪 **Thoroughly Tested** - 2800+ tests with 98.5%+ reliability
- 🌊 **Complete Command System** - All major commands implemented (PUT, SET, ADD, SHOW/HIDE, etc.)
- ⚡ **HTML Integration** - Automatic `_=""` attribute processing and event binding
- 🛡️ **Error Recovery** - Graceful handling of syntax errors with helpful guidance

## Installation

```bash
npm install @lokascript/core
# or
yarn add @lokascript/core
```

## Quick Start

```typescript
import { hyperscript } from '@lokascript/core';

// Simple expression evaluation
const result = await hyperscript.run('5 + 3 * 2'); // Returns 11

// DOM manipulation with commands
const button = document.getElementById('myButton');
const context = hyperscript.createContext(button);

await hyperscript.run('hide me', context); // Hides the button
await hyperscript.run('put "Hello World" into my innerHTML', context);
await hyperscript.run('set my className to "active"', context);
```

### HTML Integration (Automatic)

```html
<!-- Automatic attribute processing - works out of the box -->
<button _="on click put 'Hello!' into #output">Click me</button>
<div id="output"></div>

<!-- Complex interactions -->
<button _="on click set my innerHTML to 'Clicked!' then wait 1s then hide me">
  Temporary Button
</button>
```

## Debugging

LokaScript includes a built-in debug control API for troubleshooting compilation and execution issues.

### Enable Debug Logging

```javascript
// In browser console
lokascript.debugControl.enable(); // Enable detailed logging
// Reload page to see logs

lokascript.debugControl.disable(); // Disable logging
lokascript.debugControl.isEnabled(); // Check if enabled
lokascript.debugControl.status(); // Get detailed status
```

Debug settings persist across page reloads via localStorage. Logs include:

- Parser selection (semantic vs traditional)
- Expression evaluation steps
- Command execution flow
- Event handling

### Compilation Metadata

Every compilation returns metadata about parser usage and warnings:

```javascript
const result = lokascript.compile('toggle .active');
console.log(result.metadata);
// {
//   parserUsed: 'semantic',
//   semanticConfidence: 0.98,
//   semanticLanguage: 'en',
//   warnings: []
// }
```

## Runtime Hooks

LokaScript provides a hooks system for observing and intercepting command execution:

```javascript
import { HookRegistry, createHooks } from '@lokascript/core';

// Create hooks for logging, analytics, or debugging
const hooks = createHooks({
  beforeExecute: ctx => {
    console.log(`Executing: ${ctx.commandName}`);
  },
  afterExecute: (ctx, result) => {
    console.log(`Completed: ${ctx.commandName}`, result);
  },
  onError: (ctx, error) => {
    console.error(`Error in ${ctx.commandName}:`, error);
    return error; // Can transform or wrap the error
  },
  interceptCommand: (name, ctx) => {
    // Return true to skip command execution
    return name === 'disabled-command';
  },
});

// Register hooks with the runtime
lokascript.registerHooks('my-hooks', hooks);
```

Built-in hook utilities:

- `loggingHooks()` - Pre-configured debug logging hooks
- `createTimingHooks()` - Performance timing hooks

## Cleanup & Memory Management

The runtime automatically tracks event listeners and observers for cleanup when elements are removed from the DOM. You can also manually trigger cleanup:

```javascript
// Clean up a specific element
lokascript.cleanup(element);

// Clean up element and all descendants
lokascript.cleanupTree(containerElement);

// Get cleanup statistics
const stats = lokascript.getCleanupStats();
// { elementsTracked: 5, listeners: 12, observers: 2, ... }

// Full runtime shutdown
lokascript.destroy();
```

## API Reference

For complete API documentation, see [API.md](./docs/API.md).

### Main Methods

- `hyperscript.compile(code)` - Compile hyperscript to AST
- `hyperscript.execute(ast, context)` - Execute compiled AST
- `hyperscript.run(code, context)` - Compile and execute in one step
- `hyperscript.createContext(element)` - Create execution context
- `evalHyperScript(code, context)` - \_hyperscript compatibility API
- `hyperscript.registerHooks(name, hooks)` - Register runtime hooks
- `hyperscript.cleanup(element)` - Clean up element resources
- `hyperscript.destroy()` - Full runtime shutdown

## Supported Features

### Commands (All Implemented)

- **DOM Manipulation**: `hide me`, `show me`, `toggle me`
- **Content Management**: `put "text" into me`, `set my innerHTML to "content"`
- **CSS Classes**: `add .class to me`, `remove .class from me`
- **Data Operations**: `increment x`, `decrement y`
- **Control Flow**: `if condition`, `repeat N times`, `break`, `continue`
- **Async Operations**: `wait 500ms`, `fetch "/api/data"`
- **Events**: `send customEvent to me`

### Expressions

- **Arithmetic**: `5 + 3 * 2`, `value / 2`, `x mod 3`
- **Logical**: `true and false`, `value > 10`, `x contains y`
- **Property Access**: `my property`, `element.property`, `object's method()`
- **Context Variables**: `me`, `it`, `you`, `result`
- **Type Conversion**: `"123" as Int`, `form as Values`
- **CSS Selectors**: `<button/>`, `closest <form/>`

### HTML Integration

- **Automatic Processing**: All `_=""` attributes processed automatically
- **Event Binding**: `on click`, `on submit`, `on change` etc.
- **DOM Context**: Automatic `me`, `you`, `it` context setup

## Examples

See [EXAMPLES.md](./docs/EXAMPLES.md) for comprehensive usage examples.

## Compatibility Testing

This package includes compatibility tests that validate LokaScript against the official \_hyperscript library:

```bash
# Run compatibility tests with official hyperscript test suite
npm run test:browser

# Run only command compatibility tests
npx playwright test --grep "Command Tests"

# Run only expression compatibility tests
npx playwright test --grep "Expression Tests"
```

Compatibility is validated via Playwright browser tests:

- **Gallery examples** — real hyperscript patterns load and execute without errors
- **Bundle compatibility matrix** — each bundle size correctly supports its documented features
- **Command/expression tests** — individual commands and expressions verified in browser context

Run `cd packages/core && npx playwright test` for the full browser test suite.

## License

MIT - see [LICENSE](../../LICENSE) file for details.
