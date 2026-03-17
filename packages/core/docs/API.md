# API Reference

Complete API documentation for LokaScript.

## Table of Contents

- [Main API](#main-api)
  - [API v2 Methods (Recommended)](#api-v2-methods-recommended)
  - [Legacy Methods (Deprecated)](#legacy-methods-deprecated)
- [HTML Integration](#html-integration)
- [Behaviors](#behaviors)
- [Types](#types)
- [Context Management](#context-management)
- [Runtime Configuration](#runtime-configuration)
- [Error Handling](#error-handling)

---

> **API v2 Notice:** LokaScript now provides a cleaner API with structured results. The new methods (`compileSync`, `compileAsync`, `eval`, `validate`) are recommended for all new code. Legacy methods (`compile`, `run`, `evaluate`) remain functional but will show deprecation warnings.

---

## Main API

### `hyperscript`

The main LokaScript API object providing all core functionality.

```typescript
import { hyperscript } from 'lokascript';
```

### API v2 Methods (Recommended)

#### `compileSync(code: string, options?: NewCompileOptions): CompileResult`

Synchronously compiles hyperscript code with structured results.

```typescript
const result = hyperscript.compileSync('toggle .active on me');

if (result.ok) {
  console.log('AST:', result.ast);
  console.log('Parser used:', result.meta.parser);
  console.log('Time:', result.meta.timeMs, 'ms');
} else {
  console.error('Errors:', result.errors);
}
```

**Parameters:**

- `code: string` - The hyperscript code to compile
- `options?: NewCompileOptions` - Optional compilation settings

**Returns:** [`CompileResult`](#compileresult-v2)

---

#### `compileAsync(code: string, options?: NewCompileOptions): Promise<CompileResult>`

Asynchronously compiles hyperscript code. Use when compilation may involve async operations (e.g., loading language modules).

```typescript
const result = await hyperscript.compileAsync('toggle .active', { language: 'ja' });

if (result.ok) {
  console.log('Confidence:', result.meta.confidence);
}
```

**Parameters:**

- `code: string` - The hyperscript code to compile
- `options?: NewCompileOptions` - Optional compilation settings

**Returns:** `Promise<CompileResult>`

---

#### `eval(code: string, context?: ExecutionContext | Element, options?: NewCompileOptions): Promise<unknown>`

Compiles and executes hyperscript code in one call. Recommended for most use cases.

```typescript
// Simple expression
const sum = await hyperscript.eval('5 + 3');

// With element context
const button = document.getElementById('btn');
await hyperscript.eval('add .active to me', button);

// With full context
const ctx = hyperscript.createContext(element);
await hyperscript.eval('toggle .visible', ctx);
```

**Parameters:**

- `code: string` - The hyperscript code to compile and execute
- `context?: ExecutionContext | Element` - Execution context or element (optional)
- `options?: NewCompileOptions` - Optional compilation settings

**Returns:** `Promise<unknown>` - The result of execution

**Throws:** `Error` if compilation or execution fails

---

#### `validate(code: string, options?: NewCompileOptions): Promise<ValidateResult>`

Validates hyperscript syntax without executing.

```typescript
const result = await hyperscript.validate('toggle .active on me');

if (result.valid) {
  console.log('Syntax is valid');
} else {
  result.errors?.forEach(err => {
    console.error(`Line ${err.line}: ${err.message}`);
  });
}
```

**Parameters:**

- `code: string` - The hyperscript code to validate
- `options?: NewCompileOptions` - Optional validation settings

**Returns:** `Promise<ValidateResult>`

---

#### `createContext(element?: HTMLElement | null, parent?: ExecutionContext): ExecutionContext`

Creates a new execution context, optionally inheriting from a parent.

```typescript
// Basic context
const ctx = hyperscript.createContext(element);

// Child context inheriting from parent
const parentCtx = hyperscript.createContext();
parentCtx.globals?.set('theme', 'dark');

const childCtx = hyperscript.createContext(element, parentCtx);
// childCtx inherits parent's globals
```

**Parameters:**

- `element?: HTMLElement | null` - Element to bind as 'me' (optional)
- `parent?: ExecutionContext` - Parent context to inherit from (optional)

**Returns:** [`ExecutionContext`](#executioncontext)

---

### Legacy Methods (Deprecated)

> **Note:** These methods still work but will show deprecation warnings. Migrate to API v2 methods for new code.

#### `compile(code: string): CompilationResult` _(Deprecated)_

Compiles hyperscript code into an Abstract Syntax Tree (AST).

```typescript
const result = hyperscript.compile('5 + 3 * 2');

if (result.success) {
  console.log('Compilation successful');
  console.log('AST:', result.ast);
  console.log('Tokens:', result.tokens);
  console.log('Time:', result.compilationTime, 'ms');
} else {
  console.error('Compilation failed:', result.errors);
}
```

**Parameters:**

- `code: string` - The hyperscript code to compile

**Returns:** [`CompilationResult`](#compilationresult-legacy)

---

#### `execute(ast: ASTNode, context?: ExecutionContext): Promise<any>`

Executes a compiled AST with the given context.

```typescript
const compiled = hyperscript.compile('me.textContent');
if (compiled.success) {
  const context = hyperscript.createContext(element);
  const result = await hyperscript.execute(compiled.ast, context);
  console.log('Result:', result);
}
```

**Parameters:**

- `ast: ASTNode` - The compiled AST to execute
- `context?: ExecutionContext` - Execution context (optional)

**Returns:** `Promise<any>` - The result of execution

---

#### `run(code: string, context?: ExecutionContext): Promise<any>` _(Deprecated)_

> **Use `eval()` instead.** This method will show a deprecation warning.

Compiles and executes hyperscript code in one operation.

```typescript
// Simple expression
const result = await hyperscript.run('5 + 3');

// With context
const context = hyperscript.createContext(element);
await hyperscript.run('hide me', context);
```

**Parameters:**

- `code: string` - The hyperscript code to compile and execute
- `context?: ExecutionContext` - Execution context (optional)

**Returns:** `Promise<any>` - The result of execution

**Throws:** `Error` if compilation fails

---

#### `isValidHyperscript(code: string): boolean` _(Deprecated)_

> **Use `validate()` instead.** This method will show a deprecation warning.

Validates hyperscript syntax without executing.

```typescript
if (hyperscript.isValidHyperscript('hide me')) {
  console.log('Valid syntax');
} else {
  console.log('Invalid syntax');
}
```

**Parameters:**

- `code: string` - The hyperscript code to validate

**Returns:** `boolean` - True if syntax is valid

---

##### `createRuntime(options?: RuntimeOptions): Runtime`

Creates a custom runtime instance with specific options.

```typescript
const customRuntime = hyperscript.createRuntime({
  enableAsyncCommands: true,
  commandTimeout: 5000,
  enableErrorReporting: false,
});
```

**Parameters:**

- `options?: RuntimeOptions` - Runtime configuration (optional)

**Returns:** [`Runtime`](#runtime)

---

##### `parse: typeof parse`

Direct access to the low-level parser function.

```typescript
const result = hyperscript.parse('5 + 3');
console.log('Parse result:', result);
```

**Returns:** [`ParseResult`](#parseresult)

---

#### Properties

##### `version: string`

The current version of LokaScript.

```typescript
console.log('LokaScript version:', hyperscript.version);
```

## Types

### API v2 Types

#### `CompileResult` (v2)

Result of compiling hyperscript code with the new API.

```typescript
interface CompileResult {
  ok: boolean; // Whether compilation succeeded
  ast?: ASTNode; // Compiled AST (if ok is true)
  errors?: CompileError[]; // Compilation errors (if ok is false)
  meta: {
    parser: 'semantic' | 'traditional'; // Which parser was used
    confidence?: number; // Confidence score (0-1, semantic only)
    language: string; // Language code used
    timeMs: number; // Compilation time in milliseconds
    directPath?: boolean; // Whether direct path was taken
  };
}
```

---

#### `CompileError`

Information about a compilation error.

```typescript
interface CompileError {
  message: string; // Human-readable error message
  line: number; // Line number (1-indexed)
  column: number; // Column number (1-indexed)
  suggestion?: string; // Optional fix suggestion
}
```

---

#### `NewCompileOptions`

Options for the v2 compilation methods.

```typescript
interface NewCompileOptions {
  language?: string; // Language code (e.g., 'en', 'ja', 'es')
  confidenceThreshold?: number; // Min confidence for semantic parsing (0-1)
  traditional?: boolean; // Force traditional parser
}
```

---

#### `ValidateResult`

Result of syntax validation.

```typescript
interface ValidateResult {
  valid: boolean; // Whether syntax is valid
  errors?: CompileError[]; // Validation errors (if invalid)
}
```

---

### Legacy Types

#### `CompilationResult` _(Legacy)_

Result of compiling hyperscript code.

```typescript
interface CompilationResult {
  success: boolean; // Whether compilation succeeded
  ast?: ASTNode; // Compiled AST (if successful)
  errors: ParseError[]; // Compilation errors
  tokens: Token[]; // Tokenized input
  compilationTime: number; // Time taken in milliseconds
}
```

### `ExecutionContext`

Context for executing hyperscript expressions.

```typescript
interface ExecutionContext {
  me: HTMLElement | null; // Current element
  it: any; // Result of previous operation
  you: HTMLElement | null; // Target element
  result: any; // Explicit result storage
  locals?: Map<string, any>; // Local variable scope
  globals?: Map<string, any>; // Global variable scope
  variables?: Map<string, any>; // General variables storage
  events?: Map<string, EventHandler>; // Event handlers
  event?: Event; // Current DOM event
  parent?: ExecutionContext; // Parent context
  flags?: ExecutionFlags; // Execution state flags
}
```

### `RuntimeOptions`

Configuration options for the runtime.

```typescript
interface RuntimeOptions {
  enableAsyncCommands?: boolean; // Enable async command execution
  commandTimeout?: number; // Command timeout in milliseconds
  enableErrorReporting?: boolean; // Enable error logging
}
```

### `ParseResult`

Result of parsing hyperscript code.

```typescript
interface ParseResult<T = ASTNode> {
  success: boolean; // Whether parsing succeeded
  node?: T; // Parsed AST node
  error?: ParseError; // Parse error (if failed)
  tokens: Token[]; // Tokenized input
}
```

### `ParseError`

Information about a parsing error.

```typescript
interface ParseError {
  message: string; // Error message
  position: number; // Character position in input
  line: number; // Line number
  column: number; // Column number
  expected?: string[]; // Expected tokens (if applicable)
  actual?: string; // Actual token found
}
```

## Context Management

### Variables

Context variables provide the execution environment:

```typescript
const context = hyperscript.createContext(element);

// Special context variables
context.me; // Current element
context.it; // Previous result
context.you; // Target element
context.result; // Explicit result

// Custom variables
context.variables?.set('userName', 'Alice');
context.variables?.set('counter', 42);

// Access in hyperscript
await hyperscript.run('userName + " clicked " + counter + " times"', context);
```

### Scope Chain

Child contexts inherit from parents:

```typescript
const parent = hyperscript.createContext();
parent.globals?.set('appName', 'MyApp');

const child = hyperscript.createChildContext(parent);
child.locals?.set('pageName', 'Home');

// Child can access both appName (from parent) and pageName (local)
await hyperscript.run('appName + " - " + pageName', child);
```

## Runtime Configuration

### Custom Runtime

Create specialized runtime instances:

```typescript
// Development runtime with enhanced error reporting
const devRuntime = hyperscript.createRuntime({
  enableAsyncCommands: true,
  commandTimeout: 30000, // Longer timeout for debugging
  enableErrorReporting: true,
});

// Production runtime with optimizations
const prodRuntime = hyperscript.createRuntime({
  enableAsyncCommands: true,
  commandTimeout: 5000, // Shorter timeout
  enableErrorReporting: false, // Disable console logging
});
```

### Runtime Methods

```typescript
// Execute with custom runtime
const context = hyperscript.createContext(element);
await customRuntime.execute(ast, context);
```

## Error Handling

### Compilation Errors

Handle compilation failures gracefully:

```typescript
const result = hyperscript.compile('invalid syntax @@');

if (!result.success) {
  result.errors.forEach(error => {
    console.error(`Error at line ${error.line}, column ${error.column}:`);
    console.error(error.message);
  });
}
```

### Execution Errors

Handle runtime errors:

```typescript
try {
  await hyperscript.run('me.nonExistentMethod()', context);
} catch (error) {
  console.error('Execution failed:', error.message);

  // Handle gracefully
  await hyperscript.run('add ".error"', context);
}
```

### Enhanced Error Messages

LokaScript provides detailed error information:

```typescript
const result = hyperscript.compile('5 +');

if (!result.success) {
  const error = result.errors[0];
  console.log(error.message);
  // "Expected expression after '+' operator. Binary operators require both left and right operands."
}
```

### Error Recovery

LokaScript attempts to provide partial results when possible:

```typescript
const result = hyperscript.compile('valid + invalid syntax');

// Even with errors, tokens and partial AST may be available
console.log('Tokens parsed:', result.tokens.length);
if (result.node) {
  console.log('Partial AST available');
}
```

## Advanced Usage

### Performance Optimization

```typescript
// Compile once, execute many times
const compiled = hyperscript.compile('hide me then wait 500ms then show me');

if (compiled.success) {
  // Reuse compiled AST for better performance
  await hyperscript.execute(compiled.ast, contextA);
  await hyperscript.execute(compiled.ast, contextB);
  await hyperscript.execute(compiled.ast, contextC);
}
```

### Syntax Validation

```typescript
// Validate user input before execution
function safeExecute(code: string, context: ExecutionContext) {
  if (!hyperscript.isValidHyperscript(code)) {
    throw new Error('Invalid hyperscript syntax');
  }

  return hyperscript.run(code, context);
}
```

### Event Integration

```typescript
// Integrate with DOM events
element.addEventListener('click', async event => {
  const context = hyperscript.createContext(element);
  context.event = event;

  await hyperscript.run('add ".clicked"', context);
});
```

## Migration Guide

### From Raw Hyperscript

```typescript
// Before: Using _hyperscript directly
// <div _="on click add .active">

// After: Using LokaScript
element.addEventListener('click', async () => {
  const context = hyperscript.createContext(element);
  await hyperscript.run('add ".active"', context);
});
```

### From jQuery

```typescript
// Before: jQuery
// $element.addClass('active').hide().delay(1000).show();

// After: LokaScript
const context = hyperscript.createContext(element);
await hyperscript.run('add ".active" then hide me then wait 1s then show me', context);
```

---

## HTML Integration

### Inline Attributes

The standard way to add hyperscript to elements:

```html
<button _="on click add .active to me">Click me</button>
```

### Script Blocks

For behavior definitions that should be available globally:

```html
<script type="text/hyperscript">
  behavior Draggable
    on pointerdown
      -- drag logic
    end
  end
</script>
```

### Script Blocks with `for` Attribute

Bind hyperscript to specific elements using the `for` attribute. This is useful for:

- Multi-line handlers that are hard to read in `_=` attributes
- Avoiding quote escaping when HTML strings contain `_=` attributes
- Separating behavior from markup

```html
<button id="my-btn">Click me</button>
<script type="text/hyperscript" for="#my-btn">
  on click
    set html to `<div class="box" _="install Draggable">Drag me</div>`
    swap innerHTML of #container with html
    call lokascript.processNode(#container)
</script>
```

**Selector behavior:**

- Accepts any valid CSS selector
- Executes once for each matched element
- Sets `me` to the target element
- Warns if no elements match (doesn't error)

```html
<!-- Bind to multiple elements -->
<script type="text/hyperscript" for=".toggle-btn">
  on click toggle .active on me
</script>
```

### `processNode(element)`

Re-process an element (and descendants) after dynamic HTML insertion:

```javascript
container.innerHTML = '<div _="on click log \'hello\'">New</div>';
lokascript.processNode(container);
```

---

## Behaviors

Behaviors are reusable hyperscript components that encapsulate event handlers and state. Define once, install on any element.

### Quick Start (Browser)

Include the resolver bundle after the core — all standard behaviors resolve on demand:

```html
<script src="hyperfixi.js"></script>
<script src="resolver.browser.global.js"></script>

<button _="install Toggleable">Toggle me</button>
<button _="install Toggleable(cls: 'highlighted')">Custom class</button>
<div _="install Draggable" style="position: absolute">Drag me</div>
```

The resolver compiles behavior source strings on first use. Bundle size: ~3.8 KB gzipped.

### Available Behaviors

| Behavior       | Parameters                                        | Description                 |
| -------------- | ------------------------------------------------- | --------------------------- |
| `Toggleable`   | `cls` (default: "active"), `target`               | Toggle CSS class on click   |
| `Removable`    | `triggerEl`, `confirm`, `effect`                  | Remove element on click     |
| `AutoDismiss`  | `delay` (default: 5000), `effect`                 | Auto-remove after delay     |
| `Clipboard`    | `text`, `source`, `feedback`, `feedbackDuration`  | Copy to clipboard on click  |
| `Draggable`    | `dragHandle`                                      | Pointer-based drag and drop |
| `ClickOutside` | `active`                                          | Fire event on outside click |
| `ScrollReveal` | `cls`, `threshold`, `once`                        | Reveal on viewport entry    |
| `Tabs`         | `orientation`, `activeTab`, `wrap`, `activeClass` | ARIA tabs with keyboard nav |

### Defining Custom Behaviors

```html
<script type="text/hyperscript">
  behavior MyBehavior(param1, param2)
    init
      if param1 is undefined
        set param1 to "default"
      end
    end
    on click
      toggle .{param1} on me
    end
  end
</script>

<div _="install MyBehavior(param1: 'highlighted')">Click me</div>
```

### Dynamic Class Selectors

Use `.{varName}` to reference variables as class names in `toggle`, `add`, and `remove`:

```hyperscript
behavior Highlighter(cls)
  on click
    toggle .{cls} on me
  end
end
```

The `{cls}` is resolved from the behavior's parameter context at runtime.

### Behavior Resolver Hook

The runtime supports a `resolve` callback on `behaviorAPI` for lazy behavior loading:

```javascript
// Register a custom resolver
window._hyperscript.behaviors.resolve = name => {
  const source = myBehaviorSources[name];
  if (!source) return false;

  const result = window.hyperfixi.compileSync(source, { traditional: true });
  if (!result.ok) return false;

  window._hyperscript.behaviors.set(name, {
    name: result.ast.name,
    parameters: result.ast.parameters,
    eventHandlers: result.ast.eventHandlers,
    initBlock: result.ast.initBlock,
  });
  return true;
};
```

The resolver is called when `install X` encounters an undefined behavior. If it returns `true`, installation proceeds normally.

### Programmatic Registration

```javascript
// Compile and execute a behavior definition
const result = hyperscript.compileSync(
  `
  behavior MyBehavior()
    on click add .clicked to me
  end
`,
  { traditional: true }
);
await hyperscript.execute(result.ast);

// Now install it on elements
await hyperscript.eval('install MyBehavior', element);
```

### Loading from Patterns Reference

The `@hyperfixi/patterns-reference` package stores behavior definitions in a queryable database with multilingual translations:

```javascript
import { loadBehaviors } from '@hyperfixi/patterns-reference';

const result = await loadBehaviors(runtime);
// result.loaded: ['behavior-toggleable', 'behavior-draggable', ...]
```

---

For more examples and advanced usage patterns, see [EXAMPLES.md](./EXAMPLES.md).
